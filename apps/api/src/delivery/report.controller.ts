import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Locale } from '@prisma/client';
import { DEFAULT_LOCALE, isSupportedLocale } from '@redflag/shared';
import { IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { JwtAuthGuard, type AuthedUser } from '../identity/auth/jwt-auth.guard';
import { ReportService } from './report.service';
import { OkResponse } from '../common/responses.dto';
import { ReportCampaign, ReportResult } from './dto/delivery-response.dto';

class ReportSignalDto {
  @IsString()
  @MaxLength(64)
  signalCode!: string;
}

const parseLocale = (input?: string): Locale =>
  input && isSupportedLocale(input) ? (input as Locale) : DEFAULT_LOCALE;

/**
 * Reporting a test email from the site (R1's "good reflex" counterpart to clicking it).
 * Signed-in only, and every route is scoped to the caller's own campaigns (R5).
 */
@ApiTags('report')
@ApiCookieAuth()
@Controller('report')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reports: ReportService) {}

  /** The user's recent test emails, as they saw them. Carries no tracking tokens. */
  @Get('campaigns')
  listMine(@CurrentUser() user: AuthedUser, @Query('locale') locale?: string): Promise<ReportCampaign[]> {
    return this.reports.listMine(user.id, parseLocale(locale));
  }

  @Post('campaigns/:id')
  @HttpCode(200)
  report(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Query('locale') locale?: string,
  ): Promise<ReportResult> {
    return this.reports.report(user.id, id, parseLocale(locale));
  }

  /** Which red flag gave it away — a choice from the ones the email carried, never free text (R2). */
  @Post('campaigns/:id/signal')
  @HttpCode(200)
  reportSignal(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() dto: ReportSignalDto,
  ): Promise<OkResponse> {
    return this.reports.setReportedSignal(user.id, id, dto.signalCode);
  }
}
