import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Locale } from '@prisma/client';
import { DEFAULT_LOCALE, isSupportedLocale } from '@redflag/shared';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { JwtAuthGuard, type AuthedUser } from '../identity/auth/jwt-auth.guard';
import { AnswerContestDto } from './dto/answer-contest.dto';
import { ContestService } from './contest.service';
import { IdResponse } from '../common/responses.dto';
import {
  ContestAnswerResult,
  ContestCurrentResponse,
  ContestHistoryResponse,
  ContestResultResponse,
} from './dto/contest-response.dto';

function parseLocale(input?: string): Locale {
  return input && isSupportedLocale(input) ? (input as Locale) : DEFAULT_LOCALE;
}

/** Contest (Phase 3A) — signed-in only, since rounds are saved to the user's history. */
@ApiTags('contest')
@ApiCookieAuth()
@Controller('contest')
@UseGuards(JwtAuthGuard)
export class ContestController {
  constructor(private readonly contest: ContestService) {}

  @Post()
  start(@CurrentUser() user: AuthedUser, @Query('locale') locale?: string): Promise<IdResponse> {
    return this.contest.start(user.id, parseLocale(locale));
  }

  @Get('history')
  history(@CurrentUser() user: AuthedUser): Promise<ContestHistoryResponse> {
    return this.contest.history(user.id);
  }

  /** Serves the open question. Calling it again for a question already shown forfeits that question. */
  @Post(':id/current')
  @HttpCode(200)
  current(@CurrentUser() user: AuthedUser, @Param('id') id: string): Promise<ContestCurrentResponse> {
    return this.contest.current(user.id, id);
  }

  @Post(':id/answer')
  @HttpCode(200)
  answer(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() dto: AnswerContestDto,
  ): Promise<ContestAnswerResult> {
    return this.contest.answer(
      user.id,
      id,
      dto.position,
      dto.answeredScam,
      dto.selectedSignals ?? [],
      dto.selectedSpots ?? [],
    );
  }

  @Get(':id/result')
  result(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Query('locale') locale?: string,
  ): Promise<ContestResultResponse> {
    return this.contest.result(user.id, id, parseLocale(locale));
  }
}
