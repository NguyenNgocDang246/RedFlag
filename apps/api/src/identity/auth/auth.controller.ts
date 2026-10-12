import {
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
import type { CookieOptions, Request, Response } from 'express';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto, VerifyEmailDto } from '../dto/auth.dto';
import { AuthService } from './auth.service';
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

const REFRESH_PATH = '/api/auth'; // refresh cookie is only sent to auth routes

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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
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
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.locale);
  }

  @Post('verify')
  @HttpCode(200)
  verify(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = await this.auth.validateAndLogin(dto.email, dto.password);
    const refresh = await this.sessions.create(userId, userAgent);
    this.setAuthCookies(res, userId, refresh);
    return this.auth.me(userId);
  }

  /** Rotates the refresh token -> issues new access + refresh tokens. */
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
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
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (raw) await this.sessions.revoke(raw);
    this.clearAuthCookies(res);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthedUser) {
    return this.auth.me(user.id);
  }

  /** Personal info (name, occupation, services, language) — all optional. */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() user: AuthedUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, dto);
  }

  /** New password → every other device is signed out; this one stays signed in. */
  @Post('password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async changePassword(@CurrentUser() user: AuthedUser, @Req() req: Request, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
    await this.sessions.revokeOthers(user.id, req.cookies?.[REFRESH_COOKIE] as string | undefined);
    return { ok: true };
  }

  /** Signed-in devices. Lives under /auth so the refresh cookie arrives and marks the current one. */
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  listSessions(@CurrentUser() user: AuthedUser, @Req() req: Request) {
    return this.sessions.list(user.id, req.cookies?.[REFRESH_COOKIE] as string | undefined);
  }

  @Post('sessions/revoke-others')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async revokeOtherSessions(@CurrentUser() user: AuthedUser, @Req() req: Request) {
    await this.sessions.revokeOthers(user.id, req.cookies?.[REFRESH_COOKIE] as string | undefined);
    return { ok: true };
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  async revokeSession(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    if (!(await this.sessions.revokeById(user.id, id))) throw new NotFoundException('Session not found');
    return { ok: true };
  }
}
