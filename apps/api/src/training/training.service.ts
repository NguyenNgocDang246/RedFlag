import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Locale, Prisma, QuizKind } from '@prisma/client';
import { DEFAULT_LOCALE, collectCorrectSpots, collectDecoys, stripNotes } from '@redflag/shared';
import { PrismaService } from '../prisma/prisma.service';
import { gradeQuiz, type GradeResult } from './grading';
import { SET_SIZE, pickSet, type AttemptStatus } from './pick-set';

const OPTION_COUNT = 6; // signal options shown (plan Phase 3)
const LIBRARY_PAGE_SIZE = 20;
const MAX_EXCLUDE = 200;

function pick<T extends { locale: Locale }>(rows: T[], locale: Locale): T | undefined {
  return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === DEFAULT_LOCALE);
}

// Stable hash so option order is shuffled but reproducible.
function stableKey(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (h * 33) ^ seed.charCodeAt(i);
  return h >>> 0;
}

export interface SignalInfo {
  name: string;
  explanation: string;
}

/** Shared filter for practice rounds and the library (from query). Unknown values are ignored. */
export interface QuizFilter {
  category?: string;
  kind?: string;
  signal?: string;
  level?: number;
}

/** Practice round: up to `limit` random questions (default 10), skipping ones seen this session. */
export interface SetFilter extends QuizFilter {
  /** Clamped to [1, MAX_LIMIT]. */
  limit?: number;
  exclude?: string[];
  /** Reload the current set (e.g. language switch mid-round) instead of drawing a new one. */
  ids?: string[];
}

export type LibraryStatus = 'todo' | 'solved' | 'attempted';
export type LibrarySort = 'number' | 'level' | 'newest';

export interface LibraryFilter extends QuizFilter {
  page?: number;
  /** Signed-in users only. */
  status?: LibraryStatus;
  q?: string;
  sort?: LibrarySort;
  dir?: 'asc' | 'desc';
}

const MAX_LIMIT = 50;

const QUIZ_KINDS = Object.values(QuizKind) as string[];

export const QUIZ_INCLUDE = {
  translations: true,
  signals: { include: { signal: true } },
  category: { include: { translations: true } },
} satisfies Prisma.QuizQuestionInclude;

@Injectable()
export class TrainingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Quiz ───
  async signalInfoMap(locale: Locale): Promise<Map<string, SignalInfo>> {
    const signals = await this.prisma.signal.findMany({ include: { translations: true } });
    const map = new Map<string, SignalInfo>();
    for (const s of signals) {
      const t = pick(s.translations, locale);
      map.set(s.code, { name: t?.name ?? s.code, explanation: t?.explanation ?? '' });
    }
    return map;
  }

  /** ~6 options = correct signals + distractors, stably shuffled, NOT revealing the answer. */
  private buildOptions(
    questionId: string,
    correctCodes: string[],
    info: Map<string, SignalInfo>,
  ): { code: string; name: string }[] {
    const all = [...info.keys()];
    const distractors = all.filter((c) => !correctCodes.includes(c));
    const chosen = [...correctCodes];
    for (const d of distractors) {
      if (chosen.length >= OPTION_COUNT) break;
      chosen.push(d);
    }
    return chosen
      .map((code) => ({ code, name: info.get(code)?.name ?? code, k: stableKey(questionId + code) }))
      .sort((a, b) => a.k - b.k)
      .map(({ code, name }) => ({ code, name }));
  }

  /** Shared where-clause: published only; guests see only public quizzes when `publicOnly`. */
  private quizWhere(filter: QuizFilter, opts: { publicOnly: boolean; mixSafe: boolean }) {
    const and: Prisma.QuizQuestionWhereInput[] = [{ status: 'published' }];
    if (opts.publicOnly) and.push({ isPublic: true });
    if (filter.category) and.push({ category: { code: filter.category } });
    if (filter.kind && QUIZ_KINDS.includes(filter.kind)) and.push({ kind: filter.kind as QuizKind });
    if (filter.level) and.push({ difficultyLevel: filter.level });
    if (filter.signal) {
      const hasSignal: Prisma.QuizQuestionWhereInput = { signals: { some: { signal: { code: filter.signal } } } };
      // Signal practice still mixes in SAFE quizzes (R11) — otherwise always picking "scam" would win.
      and.push(opts.mixSafe ? { OR: [hasSignal, { isScam: false }] } : hasSignal);
    }
    return and;
  }

  /** User history: correct at least once = solved, otherwise = attempted. */
  private async history(userId: string, questionIds?: string[]): Promise<Map<string, AttemptStatus>> {
    const rows = await this.prisma.quizAttempt.findMany({
      where: { userId, ...(questionIds ? { questionId: { in: questionIds } } : {}) },
      select: { questionId: true, classifyCorrect: true },
    });
    const map = new Map<string, AttemptStatus>();
    for (const r of rows) {
      if (r.classifyCorrect) map.set(r.questionId, 'solved');
      else if (!map.has(r.questionId)) map.set(r.questionId, 'attempted');
    }
    return map;
  }

  /**
   * A practice round: filter the pool (ids only), draw by priority untried → wrong → solved,
   * then load content only for the chosen questions — large pools are never loaded in full.
   */
  async listQuiz(locale: Locale, userId: string | undefined, filter: SetFilter = {}) {
    const [info, pool, history, seqs] = await Promise.all([
      this.signalInfoMap(locale),
      this.prisma.quizQuestion.findMany({
        where: { AND: this.quizWhere(filter, { publicOnly: !userId, mixSafe: true }) },
        select: { id: true, isScam: true },
      }),
      userId ? this.history(userId) : undefined,
      this.seqMap(),
    ]);
    const limit = filter.limit && filter.limit > 0 ? Math.min(filter.limit, MAX_LIMIT) : SET_SIZE;
    const exclude = new Set((filter.exclude ?? []).slice(0, MAX_EXCLUDE));
    const kept = filter.ids?.slice(0, MAX_LIMIT);
    // Given set: keep its order, only questions still visible to the user.
    const { ids, remaining } = kept?.length
      ? {
          ids: kept.filter((id) => pool.some((q) => q.id === id)),
          remaining: pool.filter((q) => !exclude.has(q.id) && !kept.includes(q.id)).length,
        }
      : pickSet({ pool, history, exclude, limit });
    const rows = await this.prisma.quizQuestion.findMany({ where: { id: { in: ids } }, include: QUIZ_INCLUDE });
    const byId = new Map(rows.map((q) => [q.id, q]));
    const items = ids
      .map((id) => byId.get(id))
      .filter((q): q is NonNullable<typeof q> => Boolean(q))
      .map((q) => this.toPublicQuestion(q, locale, info, seqs));
    return { items, remaining };
  }

  /**
   * Display number for learners: 1..N by `number` among published quizzes.
   * The DB `number` stays internal (ordering, "next", admin/CLI `#54`) and never shows in the learner UI.
   */
  async seqMap(): Promise<Map<number, number>> {
    const rows = await this.prisma.quizQuestion.findMany({
      where: { status: 'published' },
      orderBy: { number: 'asc' },
      select: { number: true },
    });
    return new Map(rows.map((r, i) => [r.number, i + 1]));
  }

  /**
   * Scenario library (LeetCode-style): all published questions, paginated + filtered + sorted.
   * NEVER returns answers (isScam / signals / explanations). Guests also see sign-in-only items, marked `locked`.
   */
  async library(locale: Locale, userId: string | undefined, f: LibraryFilter) {
    const and = this.quizWhere(f, { publicOnly: false, mixSafe: false });
    if (userId && f.status) {
      const mine = { userId };
      const solved = { userId, classifyCorrect: true };
      if (f.status === 'todo') and.push({ attempts: { none: mine } });
      if (f.status === 'solved') and.push({ attempts: { some: solved } });
      if (f.status === 'attempted') and.push({ attempts: { some: mine } }, { attempts: { none: solved } });
    }
    const seqs = await this.seqMap();
    const q = f.q?.trim();
    if (q) {
      // "#12" searches by the displayed number (seq), mapped back to the DB number.
      const asSeq = /^#?\d+$/.test(q) ? Number.parseInt(q.replace('#', ''), 10) : undefined;
      const asNumber = asSeq ? [...seqs].find(([, s]) => s === asSeq)?.[0] : undefined;
      and.push({
        OR: [
          { translations: { some: { locale, title: { contains: q, mode: 'insensitive' } } } },
          ...(asNumber ? [{ number: asNumber }] : []),
        ],
      });
    }
    const dir = f.dir ?? (f.sort === 'newest' ? 'desc' : 'asc');
    const orderBy: Prisma.QuizQuestionOrderByWithRelationInput[] =
      f.sort === 'level'
        ? [{ difficultyLevel: dir }, { number: 'asc' }]
        : f.sort === 'newest'
          ? [{ createdAt: dir }, { number: dir }]
          : [{ number: dir }];

    const where: Prisma.QuizQuestionWhereInput = { AND: and };
    const page = Math.max(1, f.page ?? 1);
    const [total, rows] = await Promise.all([
      this.prisma.quizQuestion.count({ where }),
      this.prisma.quizQuestion.findMany({
        where,
        orderBy,
        skip: (page - 1) * LIBRARY_PAGE_SIZE,
        take: LIBRARY_PAGE_SIZE,
        select: {
          id: true,
          number: true,
          kind: true,
          isPublic: true,
          difficultyLevel: true,
          translations: { select: { locale: true, title: true } },
          category: { select: { code: true, translations: true } },
        },
      }),
    ]);
    const history = userId ? await this.history(userId, rows.map((r) => r.id)) : undefined;
    return {
      total,
      page,
      pageSize: LIBRARY_PAGE_SIZE,
      items: rows.map((r) => ({
        id: r.id,
        seq: seqs.get(r.number) ?? null,
        title: pick(r.translations, locale)?.title ?? null,
        kind: r.kind,
        level: r.difficultyLevel,
        isPublic: r.isPublic,
        locked: !userId && !r.isPublic,
        category: r.category
          ? { code: r.category.code, name: pick(r.category.translations, locale)?.name ?? r.category.code }
          : null,
        // Guests have no history → null (UI hides the status column).
        status: userId ? (history?.get(r.id) ?? 'todo') : null,
      })),
    };
  }

  /** Next question by sequence number within the library filters ("Next question" button). */
  async nextAfter(number: number, isAuthed: boolean, filter: QuizFilter = {}) {
    return this.prisma.quizQuestion.findFirst({
      where: {
        AND: [...this.quizWhere(filter, { publicOnly: !isAuthed, mixSafe: false }), { number: { gt: number } }],
      },
      orderBy: { number: 'asc' },
      select: { id: true, number: true },
    });
  }

  // ─── Brand handbook ───

  /** Official brand contact channels — reference, not answers, so visible to everyone. */
  async brands(locale: Locale, filter: { q?: string; category?: string } = {}) {
    // One brand set per locale — matches the brands used in that locale's quizzes.
    const rows = await this.prisma.brand.findMany({
      where: { status: 'published', locale, ...(filter.category ? { category: { code: filter.category } } : {}) },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: { category: { include: { translations: true } } },
    });
    const q = filter.q?.trim().toLowerCase();
    const matches = (b: (typeof rows)[number]) =>
      !q ||
      [b.name, b.code, ...b.websites, ...b.emailDomains, ...b.smsSenders, ...b.hotlines, ...b.apps, ...b.socialPages].some(
        (v) => v.toLowerCase().includes(q),
      );
    return rows.filter(matches).map((b) => ({
      code: b.code,
      name: b.name,
      description: b.description,
      category: b.category
        ? { code: b.category.code, name: pick(b.category.translations, locale)?.name ?? b.category.code }
        : null,
      websites: b.websites,
      emailDomains: b.emailDomains,
      smsSenders: b.smsSenders,
      hotlines: b.hotlines,
      apps: b.apps,
      socialPages: b.socialPages,
    }));
  }

  /**
   * Quiz counts per group (channel / topic / signal) for the practice picker.
   * Only counts quizzes the user can see; guests also get `locked` = sign-in-only count.
   * With `level` → groups count only that difficulty (`levels` always counts everything).
   */
  async facets(locale: Locale, isAuthed: boolean, level?: number) {
    const [info, all] = await Promise.all([
      this.signalInfoMap(locale),
      this.prisma.quizQuestion.findMany({
        where: { status: 'published' },
        select: {
          kind: true,
          isPublic: true,
          difficultyLevel: true,
          category: { select: { code: true, translations: true } },
          signals: { select: { signal: { select: { code: true } } } },
        },
      }),
    ]);
    const allowed = isAuthed ? all : all.filter((q) => q.isPublic);
    const levels = new Map<number, number>();
    for (const q of allowed) levels.set(q.difficultyLevel, (levels.get(q.difficultyLevel) ?? 0) + 1);
    const visible = level ? allowed.filter((q) => q.difficultyLevel === level) : allowed;
    const count = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

    const kinds = new Map<string, number>();
    const signals = new Map<string, number>();
    const cats = new Map<string, { code: string; name: string; description: string; count: number }>();
    for (const q of visible) {
      count(kinds, q.kind);
      for (const s of q.signals) count(signals, s.signal.code);
      if (q.category) {
        const c = cats.get(q.category.code);
        if (c) c.count++;
        else {
          const tr = pick(q.category.translations, locale);
          cats.set(q.category.code, {
            code: q.category.code,
            name: tr?.name ?? q.category.code,
            description: tr?.description ?? '',
            count: 1,
          });
        }
      }
    }
    const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count;
    return {
      total: visible.length,
      locked: all.length - allowed.length,
      kinds: [...kinds].map(([code, count]) => ({ code, count })).sort(byCount),
      levels: [...levels].map(([level, count]) => ({ level, count })).sort((a, b) => a.level - b.level),
      categories: [...cats.values()].sort(byCount),
      signals: [...signals]
        .map(([code, count]) => ({ code, name: info.get(code)?.name ?? code, count }))
        .sort(byCount),
    };
  }

  async getQuiz(id: string, locale: Locale, isAuthed: boolean) {
    const [info, seqs] = await Promise.all([this.signalInfoMap(locale), this.seqMap()]);
    const q = await this.prisma.quizQuestion.findUnique({ where: { id }, include: QUIZ_INCLUDE });
    if (!q || q.status !== 'published') throw new NotFoundException('Quiz not found');
    if (!q.isPublic && !isAuthed) {
      throw new ForbiddenException('Đăng nhập để làm đầy đủ / Log in to access full set');
    }
    return this.toPublicQuestion(q, locale, info, seqs);
  }

  toPublicQuestion(
    q: {
      id: string;
      number: number;
      kind: string;
      isPublic: boolean;
      difficultyLevel: number;
      category: { code: string; translations: { locale: Locale; name: string }[] } | null;
      translations: { locale: Locale; title: string | null; prompt: string; scenario: string; scenarioData: unknown }[];
      signals: { signal: { code: string } }[];
    },
    locale: Locale,
    info: Map<string, SignalInfo>,
    seqs: Map<number, number>,
  ) {
    const t = pick(q.translations, locale);
    const correctCodes = q.signals.map((s) => s.signal.code);
    return {
      id: q.id,
      number: q.number, // internal: cursor for "next question", not for display
      seq: seqs.get(q.number) ?? null,
      kind: q.kind,
      title: t?.title ?? null,
      prompt: t?.prompt ?? '',
      scenario: t?.scenario ?? '',
      // Structured content + hotspots (if any). Hotspots only tag elements with a SignalCode;
      // they do NOT reveal which ones are correct — grading stays on the server. Decoy notes are
      // stripped (their presence would mark decoys) and only returned with the grading result.
      scenarioData: stripNotes((t?.scenarioData ?? null) as unknown),
      isPublic: q.isPublic,
      difficulty: q.difficultyLevel,
      category: q.category
        ? { code: q.category.code, name: pick(q.category.translations, locale)?.name ?? q.category.code }
        : null,
      signalOptions: this.buildOptions(q.id, correctCodes, info), // shuffled; does not reveal the answer
    };
  }

  /** Grades the quiz + per-signal explanations; stores the attempt when signed in. */
  async answerQuiz(
    id: string,
    answeredScam: boolean,
    selectedSignals: string[],
    locale: Locale,
    userId?: string,
  ) {
    const info = await this.signalInfoMap(locale);
    const q = await this.prisma.quizQuestion.findUnique({
      where: { id },
      include: { translations: true, signals: { include: { signal: true } } },
    });
    if (!q || q.status !== 'published') throw new NotFoundException('Quiz not found');
    if (!q.isPublic && !userId) {
      throw new ForbiddenException('Đăng nhập để làm đầy đủ / Log in to access full set');
    }

    const correctCodes = q.signals.map((s) => s.signal.code);
    const result = gradeQuiz({
      isScam: q.isScam,
      correctSignals: correctCodes,
      answeredScam,
      selectedSignals,
    });

    if (userId) {
      await this.prisma.quizAttempt.create({
        data: {
          userId,
          questionId: q.id,
          answeredScam,
          classifyCorrect: result.classifyCorrect,
          selectedSignals,
        },
      });
    }

    return { ...this.buildReview(q, result, locale, info), savedAttempt: Boolean(userId) };
  }

  /** Graded result + per-signal explanations (shared by training answers and the contest summary). */
  buildReview(
    q: {
      isScam: boolean;
      translations: { locale: Locale; scenarioData: unknown; explanation: string }[];
      signals: { signal: { code: string } }[];
    },
    result: GradeResult,
    locale: Locale,
    info: Map<string, SignalInfo>,
  ) {
    const correctCodes = q.signals.map((s) => s.signal.code);
    const t = pick(q.translations, locale);
    const scenarioData = t?.scenarioData ?? null;
    const withInfo = (codes: string[]) =>
      codes.map((code) => ({
        code,
        name: info.get(code)?.name ?? code,
        explanation: info.get(code)?.explanation ?? '',
      }));
    return {
      correctAnswerIsScam: q.isScam,
      classifyCorrect: result.classifyCorrect,
      matchedSignals: withInfo(result.matchedSignals),
      missedSignals: withInfo(result.missedSignals),
      wrongSignals: withInfo(result.wrongSignals),
      // Per-quiz "why this is normal" for every decoy — the client shows the ones the user picked.
      decoySpots: collectDecoys(scenarioData, correctCodes),
      // Per-quiz "why this is a red flag" for every correct hotspot — shown under spotted / missed.
      correctSpots: collectCorrectSpots(scenarioData, correctCodes),
      explanation: t?.explanation ?? '',
    };
  }
}
