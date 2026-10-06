import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
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
  REFRESH_COOKIE,
  JwtAuthGuard,
  type AuthedUser,
} from './jwt-auth.guard';
import { SessionService, type IssuedRefresh } from './session.service';

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000; // khớp TTL access token
const REFRESH_PATH = '/api/auth'; // refresh cookie chỉ gửi tới các route auth

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

  private setAuthCookies(res: Response, userId: string, refresh: IssuedRefresh): void {
    res.cookie(ACCESS_COOKIE, this.auth.signAccessToken(userId), {
      ...baseCookie(),
      path: '/',
      maxAge: ACCESS_MAX_AGE_MS,
    });
    res.cookie(REFRESH_COOKIE, refresh.rawToken, {
      ...baseCookie(),
      path: REFRESH_PATH,
      expires: refresh.expiresAt,
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, { ...baseCookie(), path: '/' });
    res.clearCookie(REFRESH_COOKIE, { ...baseCookie(), path: REFRESH_PATH });
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

  /** Xoay vòng refresh token -> cấp access + refresh mới. */
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!raw) throw new UnauthorizedException('No refresh token');
    const rotated = await this.sessions.rotate(raw);
    this.setAuthCookies(res, rotated.userId, rotated);
    return { ok: true };
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
