import {
  Body,
  Controller,
  Get,
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
import { LoginDto, RegisterDto, VerifyEmailDto } from '../dto/auth.dto';
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
}
