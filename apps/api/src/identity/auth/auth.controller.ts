import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiFoundResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { AuthThrottlerGuard } from '../../throttle/auth-throttler.guard';
import { MAIL_THROTTLER } from '../../throttle/throttle.module';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  UpdateProfileDto,
  VerifyEmailDto,
} from '../dto/auth.dto';
import { AuthService } from './auth.service';
import { GoogleService, OAUTH_STATE_COOKIE } from './google.service';
import { CurrentUser } from './current-user.decorator';
import {
  ACCESS_COOKIE,
  ACCESS_TTL_SEC,
  REFRESH_COOKIE,
  SESSION_MARKER_COOKIE,
  JwtAuthGuard,
  type AuthedUser,
} from './jwt-auth.guard';
import { SessionService, type IssuedRefresh } from './session.service';
import { OkResponse } from '../../common/responses.dto';
import {
  AuthProvidersResponse,
  MeResponse,
  SessionView,
} from '../dto/identity-response.dto';

const REFRESH_PATH = '/api/auth'; // refresh cookie is only sent to auth routes
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // long enough to pick an account, short enough to be useless later

/** Only accepts internal web paths (prevents open redirects). */
function safeNext(next: string | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}

function baseCookie(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly google: GoogleService,
  ) {}

  /** `refresh: null` (rotation grace) → only a new access token; the refresh cookie stays as is. */
  private setAuthCookies(res: Response, userId: string, refresh: IssuedRefresh | null): void {
    res.cookie(ACCESS_COOKIE, this.auth.signAccessToken(userId), {
      ...baseCookie(),
      path: '/',
      maxAge: ACCESS_TTL_SEC * 1000,
    });
    if (!refresh) return;
    res.cookie(REFRESH_COOKIE, refresh.rawToken, {
      ...baseCookie(),
      path: REFRESH_PATH,
      expires: refresh.expiresAt,
    });
    res.cookie(SESSION_MARKER_COOKIE, '1', { ...baseCookie(), path: '/', expires: refresh.expiresAt });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, { ...baseCookie(), path: '/' });
    res.clearCookie(REFRESH_COOKIE, { ...baseCookie(), path: REFRESH_PATH });
    res.clearCookie(SESSION_MARKER_COOKIE, { ...baseCookie(), path: '/' });
  }

  @Post('register')
  @UseGuards(AuthThrottlerGuard)
  register(@Body() dto: RegisterDto): Promise<OkResponse> {
    return this.auth.register(dto.email, dto.password, dto.locale);
  }

  @Post('verify')
  @HttpCode(200)
  @UseGuards(AuthThrottlerGuard)
  @SkipThrottle({ [MAIL_THROTTLER]: true })
  verify(@Body() dto: VerifyEmailDto): Promise<OkResponse> {
    return this.auth.verifyEmail(dto.token);
  }

  /**
   * Asks for a reset link. Always 200, whether or not the address has an account — the answer must
   * not tell a stranger who is registered here. Limited per mailbox, so nobody's inbox gets flooded.
   */
  @Post('forgot-password')
  @HttpCode(200)
  @UseGuards(AuthThrottlerGuard)
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<OkResponse> {
    return this.auth.requestPasswordReset(dto.email, dto.locale);
  }

  /** Sets a new password from a mailed link, then signs every device out. */
  @Post('reset-password')
  @HttpCode(200)
  @UseGuards(AuthThrottlerGuard)
  @SkipThrottle({ [MAIL_THROTTLER]: true })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<OkResponse> {
    const userId = await this.auth.resetPassword(dto.token, dto.password);
    // A reset may follow a break-in, so nothing stays signed in — not even this browser.
    await this.sessions.revokeAllForUser(userId);
    return { ok: true };
  }

  /** A fresh confirmation link for an address that never confirmed. Always 200, as above. */
  @Post('resend-verification')
  @HttpCode(200)
  @UseGuards(AuthThrottlerGuard)
  resendVerification(@Body() dto: ResendVerificationDto): Promise<OkResponse> {
    return this.auth.resendVerification(dto.email, dto.locale);
  }

  /** Which sign-in methods this deployment has — the web hides the Google button without it. */
  @Get('providers')
  providers(): AuthProvidersResponse {
    return { google: this.google.configured };
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthThrottlerGuard)
  @SkipThrottle({ [MAIL_THROTTLER]: true })
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponse> {
    const userId = await this.auth.validateAndLogin(dto.email, dto.password);
    const refresh = await this.sessions.create(userId, userAgent);
    this.setAuthCookies(res, userId, refresh);
    return this.auth.me(userId);
  }

  /** Rotates the refresh token -> issues new access + refresh tokens. */
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<OkResponse> {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!raw) throw new UnauthorizedException('No refresh token');
    const rotated = await this.sessions.rotate(raw);
    this.setAuthCookies(res, rotated.userId, rotated.refresh);
    return { ok: true };
  }

  /**
   * Navigation-based refresh: the web middleware (seeing an expired access token) redirects here.
   * The browser sends rf_refresh (path matches /api/auth) → rotate → back to the original page, signed in.
   * On failure → clear cookies (incl. the session flag) and still redirect: the page renders as guest, no loop.
   */
  @Get('refresh')
  @ApiFoundResponse({ description: 'Redirects back to the web page in `next`, signed in or as a guest.' })
  async refreshRedirect(
    @Req() req: Request,
    @Res() res: Response,
    @Query('next') next?: string,
  ) {
    const webUrl = process.env.WEB_PUBLIC_URL ?? 'http://localhost:4001';
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    try {
      if (!raw) throw new UnauthorizedException();
      const rotated = await this.sessions.rotate(raw);
      this.setAuthCookies(res, rotated.userId, rotated.refresh);
    } catch {
      this.clearAuthCookies(res);
    }
    res.redirect(302, `${webUrl}${safeNext(next)}`);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<OkResponse> {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (raw) await this.sessions.revoke(raw);
    this.clearAuthCookies(res);
    return { ok: true };
  }

  /**
   * Google sign-in, step 1: park the state in a short-lived cookie and send the browser to Google.
   * The cookie is path-scoped to /api/auth, like the refresh cookie, so it only comes back here.
   */
  @Get('google')
  @ApiFoundResponse({ description: 'Redirects to Google sign-in.' })
  async googleStart(
    @Res() res: Response,
    @Query('locale') locale?: string,
    @Query('next') next?: string,
  ) {
    if (!this.google.configured) throw new NotFoundException('Google sign-in is not configured');
    const { url, stateToken } = await this.google.start(locale, next);
    res.cookie(OAUTH_STATE_COOKIE, stateToken, {
      ...baseCookie(),
      path: REFRESH_PATH,
      maxAge: OAUTH_STATE_TTL_MS,
    });
    res.redirect(302, url);
  }

  /**
   * Step 2: Google sends the browser back here. On success the session cookies are set and the
   * browser carries on into the app; every failure lands on the login page with a quiet notice,
   * because there is no one here to read an error page.
   */
  @Get('google/callback')
  @ApiFoundResponse({ description: 'Redirects into the web app, or to /login with a notice.' })
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ) {
    if (!this.google.configured) throw new NotFoundException('Google sign-in is not configured');
    const webUrl = (process.env.WEB_PUBLIC_URL ?? 'http://localhost:4001').replace(/\/+$/, '');
    const stateToken = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
    res.clearCookie(OAUTH_STATE_COOKIE, { ...baseCookie(), path: REFRESH_PATH });

    try {
      if (error || !code || !state) throw new BadRequestException('Google sign-in was cancelled');
      const result = await this.google.finish(code, state, stateToken);
      if (!result.emailVerified) {
        // Google did not vouch for the address, so our own confirmation mail decides (R1).
        res.redirect(302, `${webUrl}/login?unverified=1&locale=${result.locale}`);
        return;
      }
      const refresh = await this.sessions.create(result.userId, req.headers['user-agent']);
      this.setAuthCookies(res, result.userId, refresh);
      const next = safeNext(result.next);
      res.redirect(302, `${webUrl}${next === '/' ? `/practice?locale=${result.locale}` : next}`);
    } catch {
      res.redirect(302, `${webUrl}/login?error=google`);
    }
  }

  @Get('me')
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthedUser): Promise<MeResponse> {
    return this.auth.me(user.id);
  }

  /** Personal info (name, occupation, services, language) — all optional. */
  @Patch('me')
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() user: AuthedUser, @Body() dto: UpdateProfileDto): Promise<MeResponse> {
    return this.auth.updateProfile(user.id, dto);
  }

  /**
   * New password → every other device is signed out; this one stays signed in.
   * With no password on the account yet (Google sign-in), this sets the first one.
   */
  @Post('password')
  @HttpCode(200)
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  async changePassword(@CurrentUser() user: AuthedUser, @Req() req: Request, @Body() dto: ChangePasswordDto): Promise<OkResponse> {
    await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
    await this.sessions.revokeOthers(user.id, req.cookies?.[REFRESH_COOKIE] as string | undefined);
    return { ok: true };
  }

  /** Signed-in devices. Lives under /auth so the refresh cookie arrives and marks the current one. */
  @Get('sessions')
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  listSessions(@CurrentUser() user: AuthedUser, @Req() req: Request): Promise<SessionView[]> {
    return this.sessions.list(user.id, req.cookies?.[REFRESH_COOKIE] as string | undefined);
  }

  @Post('sessions/revoke-others')
  @HttpCode(200)
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  async revokeOtherSessions(@CurrentUser() user: AuthedUser, @Req() req: Request): Promise<OkResponse> {
    await this.sessions.revokeOthers(user.id, req.cookies?.[REFRESH_COOKIE] as string | undefined);
    return { ok: true };
  }

  @Delete('sessions/:id')
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  async revokeSession(@CurrentUser() user: AuthedUser, @Param('id') id: string): Promise<OkResponse> {
    if (!(await this.sessions.revokeById(user.id, id))) throw new NotFoundException('Session not found');
    return { ok: true };
  }
}
