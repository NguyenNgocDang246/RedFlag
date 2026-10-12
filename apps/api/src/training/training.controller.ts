import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { DEFAULT_LOCALE, isSupportedLocale } from '@redflag/shared';
import { OptionalUser } from '../identity/auth/current-user.decorator';
import { OptionalJwtGuard } from '../identity/auth/optional-jwt.guard';
import type { AuthedUser } from '../identity/auth/jwt-auth.guard';
import { AnswerQuizDto } from './dto/answer-quiz.dto';
import { TrainingService } from './training.service';

function parseLocale(input?: string): Locale {
  return input && isSupportedLocale(input) ? (input as Locale) : DEFAULT_LOCALE;
}

function parseIntOr(input?: string): number | undefined {
  const n = input ? Number.parseInt(input, 10) : Number.NaN;
  return Number.isFinite(n) ? n : undefined;
}

/** Difficulty 1–5 (matches SaveQuizDto); out of range → no filter. */
function parseLevel(input?: string): number | undefined {
  const n = parseIntOr(input);
  return n && n >= 1 && n <= 5 ? n : undefined;
}

function oneOf<T extends string>(input: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(input as T) ? (input as T) : undefined;
}

/**
 * Training (public, optional-auth): guests only see public quizzes (isPublic),
 * signed-in users see all. Everything is free — gated by sign-in, not payment.
 */
@Controller('training')
@UseGuards(OptionalJwtGuard)
export class TrainingController {
  constructor(private readonly training: TrainingService) {}

  /**
   * One practice round (default 10, random, prioritizing untried / wrong questions):
   * ?category=BANK&kind=sms_inspection&signal=URGENCY&level=1&limit=10&exclude=id1,id2
   * With ?ids=a,b,c → returns that exact set (in order) instead of drawing — used when switching language mid-round.
   */
  @Get('quiz')
  listQuiz(
    @OptionalUser() user: AuthedUser | undefined,
    @Query('locale') locale?: string,
    @Query('category') category?: string,
    @Query('kind') kind?: string,
    @Query('signal') signal?: string,
    @Query('level') level?: string,
    @Query('limit') limit?: string,
    @Query('exclude') exclude?: string,
    @Query('ids') ids?: string,
  ) {
    const list = (v?: string) => (v ? v.split(',').filter(Boolean) : undefined);
    return this.training.listQuiz(parseLocale(locale), user?.id, {
      category,
      kind,
      signal,
      level: parseLevel(level),
      limit: parseIntOr(limit),
      exclude: list(exclude),
      ids: list(ids),
    });
  }

  /** Scenario library: ?page=&category=&kind=&signal=&level=&status=todo|solved|attempted&q=&sort=number|level|newest&dir=asc|desc */
  @Get('library')
  library(
    @OptionalUser() user: AuthedUser | undefined,
    @Query('locale') locale?: string,
    @Query('page') page?: string,
    @Query('category') category?: string,
    @Query('kind') kind?: string,
    @Query('signal') signal?: string,
    @Query('level') level?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('dir') dir?: string,
  ) {
    return this.training.library(parseLocale(locale), user?.id, {
      page: parseIntOr(page),
      category,
      kind,
      signal,
      level: parseLevel(level),
      status: oneOf(status, ['todo', 'solved', 'attempted'] as const),
      q,
      sort: oneOf(sort, ['number', 'level', 'newest'] as const),
      dir: oneOf(dir, ['asc', 'desc'] as const),
    });
  }

  /** Next question after sequence number `after`, within the same filters (null if none). */
  @Get('library/next')
  nextInLibrary(
    @OptionalUser() user: AuthedUser | undefined,
    @Query('after') after?: string,
    @Query('category') category?: string,
    @Query('kind') kind?: string,
    @Query('signal') signal?: string,
    @Query('level') level?: string,
  ) {
    return this.training.nextAfter(parseIntOr(after) ?? 0, Boolean(user), {
      category,
      kind,
      signal,
      level: parseLevel(level),
    });
  }

  /** Brand handbook: ?q=saomai&category=BANK */
  @Get('brands')
  brands(@Query('locale') locale?: string, @Query('q') q?: string, @Query('category') category?: string) {
    return this.training.brands(parseLocale(locale), { q, category });
  }

  /** Quiz counts by channel / topic / signal — for the practice picker page. */
  @Get('facets')
  facets(
    @OptionalUser() user: AuthedUser | undefined,
    @Query('locale') locale?: string,
    @Query('level') level?: string,
  ) {
    return this.training.facets(parseLocale(locale), Boolean(user), parseLevel(level));
  }

  @Get('quiz/:id')
  getQuiz(
    @OptionalUser() user: AuthedUser | undefined,
    @Param('id') id: string,
    @Query('locale') locale?: string,
  ) {
    return this.training.getQuiz(id, parseLocale(locale), Boolean(user));
  }

  @Post('quiz/:id/answer')
  @HttpCode(200)
  answer(
    @OptionalUser() user: AuthedUser | undefined,
    @Param('id') id: string,
    @Body() dto: AnswerQuizDto,
    @Query('locale') locale?: string,
  ) {
    return this.training.answerQuiz(
      id,
      dto.answeredScam,
      dto.selectedSignals ?? [],
      parseLocale(locale),
      user?.id,
    );
  }
}
