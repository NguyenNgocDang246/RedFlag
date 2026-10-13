import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Locale, Prisma, QuizKind } from '@prisma/client';
import { RULE_MSG, collectNotes, normalizeNote } from '@redflag/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import type { SaveQuizDto } from './dto/quiz.dto';
import {
  CLI_RULES,
  quizIssues,
  scenarioToText,
  type KnownCodes,
  type QuizDraft,
  type QuizText,
  type RuleOpts,
} from './quiz-rules';

const PAGE_SIZE = 50;

export interface QuizListFilter {
  kind?: string;
  category?: string;
  status?: string;
  q?: string;
  page?: number;
}

const QUIZ_INCLUDE = {
  translations: true,
  signals: { include: { signal: true } },
  category: true,
} satisfies Prisma.QuizQuestionInclude;

type QuizRow = Prisma.QuizQuestionGetPayload<{ include: typeof QUIZ_INCLUDE }>;

function rowToDraft(q: QuizRow): QuizDraft {
  const translations: QuizDraft['translations'] = {};
  for (const t of q.translations) {
    translations[t.locale] = {
      title: t.title ?? '',
      prompt: t.prompt,
      explanation: t.explanation,
      scenario: t.scenario,
      scenarioData: t.scenarioData,
    };
  }
  return {
    kind: q.kind,
    isScam: q.isScam,
    signalCodes: q.signals.map((s) => s.signal.code),
    categoryCode: q.category?.code ?? null,
    translations,
  };
}

function rejectInvalid(issues: string[], ui: Locale): never {
  const message =
    ui === 'en' ? 'This quiz is not ready to publish' : 'Bài chưa đủ điều kiện xuất bản';
  throw new UnprocessableEntityException({ message, issues });
}

/** Quiz admin (QuizQuestion). Hotspot rules are shared with seed (packages/shared). */
@Injectable()
export class QuizAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async knownCodes(): Promise<
    KnownCodes & { signalIds: Map<string, string>; categoryIds: Map<string, string> }
  > {
    const [signals, categories] = await Promise.all([
      this.prisma.signal.findMany({ select: { id: true, code: true } }),
      this.prisma.category.findMany({ select: { id: true, code: true } }),
    ]);
    return {
      signals: new Set(signals.map((s) => s.code)),
      categories: new Set(categories.map((c) => c.code)),
      signalIds: new Map(signals.map((s) => [s.code, s.id])),
      categoryIds: new Map(categories.map((c) => [c.code, c.id])),
    };
  }

  async list(filter: QuizListFilter, opts: RuleOpts = CLI_RULES) {
    const and: Prisma.QuizQuestionWhereInput[] = [];
    if (filter.kind && (Object.values(QuizKind) as string[]).includes(filter.kind)) {
      and.push({ kind: filter.kind as QuizKind });
    }
    if (filter.category === '__none') and.push({ categoryId: null });
    else if (filter.category) and.push({ category: { code: filter.category } });
    if (filter.status === 'draft' || filter.status === 'published')
      and.push({ status: filter.status });
    const q = filter.q?.trim();
    if (q) {
      const asNumber = /^#?\d+$/.test(q)
        ? Number.parseInt(q.replace('#', ''), 10)
        : undefined;
      and.push({
        OR: [
          { translations: { some: { prompt: { contains: q, mode: 'insensitive' } } } },
          { translations: { some: { title: { contains: q, mode: 'insensitive' } } } },
          ...(asNumber ? [{ number: asNumber }] : []),
        ],
      });
    }
    const where: Prisma.QuizQuestionWhereInput = { AND: and };
    const page = Math.max(1, filter.page ?? 1);
    const [total, rows, known] = await Promise.all([
      this.prisma.quizQuestion.count({ where }),
      this.prisma.quizQuestion.findMany({
        where,
        orderBy: [{ number: 'asc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { ...QUIZ_INCLUDE, _count: { select: { attempts: true } } },
      }),
      this.knownCodes(),
    ]);
    return {
      total,
      page,
      pageSize: PAGE_SIZE,
      items: rows.map((q) => {
        const draft = rowToDraft(q);
        return {
          id: q.id,
          number: q.number,
          kind: q.kind,
          isScam: q.isScam,
          isPublic: q.isPublic,
          status: q.status,
          order: q.order,
          difficultyLevel: q.difficultyLevel,
          categoryCode: draft.categoryCode,
          signalCodes: draft.signalCodes,
          prompt: {
            en: draft.translations.en?.prompt ?? '',
            vi: draft.translations.vi?.prompt ?? '',
          },
          title: {
            en: draft.translations.en?.title ?? '',
            vi: draft.translations.vi?.title ?? '',
          },
          issueCount: quizIssues(draft, known, opts).length,
          attempts: q._count.attempts,
          updatedAt: q.updatedAt,
        };
      }),
    };
  }

  async get(id: string, opts: RuleOpts = CLI_RULES) {
    const [q, known] = await Promise.all([this.mustFind(id), this.knownCodes()]);
    const draft = rowToDraft(q);
    return {
      id: q.id,
      number: q.number,
      kind: q.kind,
      isScam: q.isScam,
      difficultyLevel: q.difficultyLevel,
      categoryCode: draft.categoryCode,
      isPublic: q.isPublic,
      order: q.order,
      status: q.status,
      signalCodes: draft.signalCodes,
      translations: {
        en: draft.translations.en ?? null,
        vi: draft.translations.vi ?? null,
      },
      issues: await this.allIssues(draft, known, id, opts),
      updatedAt: q.updatedAt,
    };
  }

  /**
   * Notes must be written per quiz: flags a note of this draft that is word-for-word (case/space-insensitive)
   * the same as a note in ANOTHER quiz of the same locale.
   */
  private async duplicateNoteIssues(
    draft: QuizDraft,
    excludeId: string | undefined,
    ui: Locale,
  ): Promise<string[]> {
    const rows = await this.prisma.quizQuestionTranslation.findMany({
      where: excludeId ? { questionId: { not: excludeId } } : {},
      select: { questionId: true, locale: true, scenarioData: true },
    });
    const owner = new Map<string, string>();
    for (const r of rows)
      for (const n of collectNotes(r.scenarioData))
        owner.set(`${r.locale}|${normalizeNote(n)}`, r.questionId);
    const issues: string[] = [];
    for (const locale of Object.keys(draft.translations) as Locale[]) {
      for (const n of collectNotes(draft.translations[locale]?.scenarioData)) {
        if (owner.has(`${locale}|${normalizeNote(n)}`)) {
          issues.push(
            `[${locale.toUpperCase()}] ${RULE_MSG[ui].noteUsedElsewhere(n.slice(0, 40))}`,
          );
        }
      }
    }
    return issues;
  }

  /** All blocking issues: shared rules + cross-quiz duplicate notes. */
  private async allIssues(
    draft: QuizDraft,
    known: KnownCodes,
    excludeId?: string,
    opts: RuleOpts = CLI_RULES,
  ): Promise<string[]> {
    return [
      ...quizIssues(draft, known, opts),
      // Notes copied across quizzes are an authoring-quality rule → CLI only.
      ...(opts.mode === 'full'
        ? await this.duplicateNoteIssues(draft, excludeId, opts.ui)
        : []),
    ];
  }

  /** Checks publish rules (hotspots + shell structure + existing codes) without writing. */
  async check(dto: SaveQuizDto, excludeId?: string, opts: RuleOpts = CLI_RULES) {
    return this.allIssues(dto, await this.knownCodes(), excludeId, opts);
  }

  async create(dto: SaveQuizDto, actorId: string | null, opts: RuleOpts = CLI_RULES) {
    const known = await this.knownCodes();
    const issues = await this.allIssues(dto, known, undefined, opts);
    const id = await this.prisma.$transaction(async (tx) => {
      const q = await tx.quizQuestion.create({
        data: { ...this.questionFields(dto, known), status: 'draft' },
      });
      await this.writeChildren(tx, q.id, dto, known);
      await this.audit.log(tx, {
        actorId,
        action: 'create',
        entity: 'quiz',
        entityId: q.id,
        changes: dto,
      });
      return q.id;
    });
    return { id, status: 'draft' as const, issues };
  }

  /** Edits to a published quiz must keep it valid (learners are seeing it). */
  async update(
    id: string,
    dto: SaveQuizDto,
    actorId: string | null,
    opts: RuleOpts = CLI_RULES,
  ) {
    const [current, known] = await Promise.all([this.mustFind(id), this.knownCodes()]);
    const issues = await this.allIssues(dto, known, id, opts);
    if (current.status === 'published' && issues.length) rejectInvalid(issues, opts.ui);
    await this.prisma.$transaction(async (tx) => {
      await tx.quizQuestion.update({
        where: { id },
        data: this.questionFields(dto, known),
      });
      await tx.quizQuestionTranslation.deleteMany({ where: { questionId: id } });
      await tx.quizQuestionSignal.deleteMany({ where: { questionId: id } });
      await this.writeChildren(tx, id, dto, known);
      await this.audit.log(tx, {
        actorId,
        action: 'update',
        entity: 'quiz',
        entityId: id,
        changes: dto,
      });
    });
    return { id, status: current.status, issues };
  }

  async setStatus(
    id: string,
    status: 'draft' | 'published',
    actorId: string | null,
    opts: RuleOpts = CLI_RULES,
  ) {
    const [q, known] = await Promise.all([this.mustFind(id), this.knownCodes()]);
    if (status === 'published') {
      const issues = await this.allIssues(rowToDraft(q), known, id, opts);
      if (issues.length) rejectInvalid(issues, opts.ui);
    }
    if (q.status !== status) {
      await this.prisma.$transaction(async (tx) => {
        await tx.quizQuestion.update({ where: { id }, data: { status } });
        await this.audit.log(tx, {
          actorId,
          action: status === 'published' ? 'publish' : 'unpublish',
          entity: 'quiz',
          entityId: id,
        });
      });
    }
    return { id, status };
  }

  /** Quizzes with attempts (practice or contest) can't be deleted (score history would be lost) — unpublish instead. */
  async remove(id: string, actorId: string | null, ui: Locale = CLI_RULES.ui) {
    const q = await this.mustFind(id);
    const [practiced, contested] = await Promise.all([
      this.prisma.quizAttempt.count({ where: { questionId: id } }),
      this.prisma.contestItem.count({ where: { questionId: id } }),
    ]);
    const attempts = practiced + contested;
    if (attempts > 0) {
      throw new ConflictException(
        ui === 'en'
          ? `This quiz has ${attempts} attempt(s) — unpublish it instead of deleting`
          : `Bài đã có ${attempts} lượt làm, hãy gỡ xuất bản thay vì xoá`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.quizQuestion.delete({ where: { id } });
      await this.audit.log(tx, {
        actorId,
        action: 'delete',
        entity: 'quiz',
        entityId: id,
        changes: rowToDraft(q),
      });
    });
    return { ok: true };
  }

  private questionFields(dto: SaveQuizDto, known: { categoryIds: Map<string, string> }) {
    return {
      kind: dto.kind as QuizKind,
      isScam: dto.isScam,
      difficultyLevel: dto.difficultyLevel,
      isPublic: dto.isPublic,
      order: dto.order,
      categoryId: dto.categoryCode
        ? (known.categoryIds.get(dto.categoryCode) ?? null)
        : null,
    };
  }

  private async writeChildren(
    tx: Prisma.TransactionClient,
    questionId: string,
    dto: SaveQuizDto,
    known: { signalIds: Map<string, string> },
  ) {
    const rows = (['en', 'vi'] as Locale[])
      .map((locale) => [locale, dto.translations[locale]] as const)
      .filter(
        (
          e,
        ): e is readonly [Locale, QuizText & { scenarioData: Record<string, unknown> }] =>
          Boolean(e[1]),
      )
      .map(([locale, t]) => ({
        questionId,
        locale,
        title: t.title?.trim() || null,
        prompt: t.prompt,
        explanation: t.explanation,
        scenario: t.scenario?.trim() || scenarioToText(t.scenarioData),
        scenarioData: t.scenarioData as Prisma.InputJsonValue,
      }));
    if (rows.length) await tx.quizQuestionTranslation.createMany({ data: rows });

    const signalIds = [...new Set(dto.signalCodes)]
      .map((c) => known.signalIds.get(c))
      .filter((v): v is string => Boolean(v));
    if (signalIds.length) {
      await tx.quizQuestionSignal.createMany({
        data: signalIds.map((signalId) => ({ questionId, signalId })),
      });
    }
  }

  private async mustFind(id: string): Promise<QuizRow> {
    const q = await this.prisma.quizQuestion.findUnique({
      where: { id },
      include: QUIZ_INCLUDE,
    });
    if (!q) throw new NotFoundException('Quiz not found');
    return q;
  }
}
