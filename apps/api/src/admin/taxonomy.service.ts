import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { collectHotspots } from '@redflag/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import type {
  CreateCategoryDto,
  CreateSignalDto,
  UpdateCategoryDto,
  UpdateSignalDto,
} from './dto/taxonomy.dto';

type Texts<T> = { en: T; vi: T };

function byLocale<T extends { locale: string }>(
  rows: T[],
): { en: T | null; vi: T | null } {
  return {
    en: rows.find((r) => r.locale === 'en') ?? null,
    vi: rows.find((r) => r.locale === 'vi') ?? null,
  };
}

function translationRows<T extends object>(t: Texts<T>) {
  return (['en', 'vi'] as const).map((locale) => ({ locale, ...t[locale] }));
}

/** Category + Signal: content taxonomy (DATA — R6). Codes are fixed after creation. */
@Injectable()
export class TaxonomyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─── Category ───

  async listCategories() {
    const cats = await this.prisma.category.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        translations: true,
        _count: { select: { quizQuestions: true, templates: true } },
      },
    });
    return cats.map((c) => {
      const t = byLocale(c.translations);
      return {
        id: c.id,
        code: c.code,
        impersonates: c.impersonates,
        order: c.order,
        translations: {
          en: { name: t.en?.name ?? '', description: t.en?.description ?? '' },
          vi: { name: t.vi?.name ?? '', description: t.vi?.description ?? '' },
        },
        usage: { quiz: c._count.quizQuestions, templates: c._count.templates },
      };
    });
  }

  async createCategory(dto: CreateCategoryDto, actorId: string | null) {
    if (await this.prisma.category.findUnique({ where: { code: dto.code } })) {
      throw new ConflictException(
        `Chủ đề ${dto.code} đã tồn tại / Category ${dto.code} already exists`,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const c = await tx.category.create({
        data: {
          code: dto.code,
          impersonates: dto.impersonates ?? [],
          order: dto.order ?? 0,
          translations: { create: translationRows(dto.translations) },
        },
      });
      await this.audit.log(tx, {
        actorId,
        action: 'create',
        entity: 'category',
        entityId: c.id,
        changes: dto,
      });
      return { id: c.id };
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, actorId: string | null) {
    await this.mustFindCategory(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.category.update({
        where: { id },
        data: {
          impersonates: dto.impersonates ?? undefined,
          order: dto.order ?? undefined,
        },
      });
      for (const row of translationRows(dto.translations)) {
        await tx.categoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: id, locale: row.locale } },
          create: { categoryId: id, ...row },
          update: { name: row.name, description: row.description ?? null },
        });
      }
      await this.audit.log(tx, {
        actorId,
        action: 'update',
        entity: 'category',
        entityId: id,
        changes: dto,
      });
      return { id };
    });
  }

  async deleteCategory(id: string, actorId: string | null) {
    const c = await this.mustFindCategory(id);
    const [quiz, templates] = await Promise.all([
      this.prisma.quizQuestion.count({ where: { categoryId: id } }),
      this.prisma.template.count({ where: { categoryId: id } }),
    ]);
    if (quiz + templates > 0) {
      throw new ConflictException(
        `Chủ đề đang được dùng (${quiz} bài, ${templates} template) — gỡ trước khi xoá / Category in use (${quiz} quizzes, ${templates} templates) — detach it first`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.category.delete({ where: { id } });
      await this.audit.log(tx, {
        actorId,
        action: 'delete',
        entity: 'category',
        entityId: id,
        changes: { code: c.code },
      });
    });
    return { ok: true };
  }

  private async mustFindCategory(id: string) {
    const c = await this.prisma.category.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Category not found');
    return c;
  }

  // ─── Signal ───

  async listSignals() {
    const [signals, hotspotUse] = await Promise.all([
      this.prisma.signal.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          translations: true,
          _count: { select: { quizSignals: true, variantSignals: true } },
        },
      }),
      this.hotspotUsage(),
    ]);
    return signals.map((s) => {
      const t = byLocale(s.translations);
      return {
        id: s.id,
        code: s.code,
        translations: {
          en: { name: t.en?.name ?? '', explanation: t.en?.explanation ?? '' },
          vi: { name: t.vi?.name ?? '', explanation: t.vi?.explanation ?? '' },
        },
        usage: {
          quiz: s._count.quizSignals,
          variants: s._count.variantSignals,
          hotspots: hotspotUse.get(s.code) ?? 0,
        },
      };
    });
  }

  /** Quizzes with hotspots carrying the signal (decoys included) — stored as JSON, so it has to scan. */
  private async hotspotUsage(): Promise<Map<string, number>> {
    const rows = await this.prisma.quizQuestionTranslation.findMany({
      select: { questionId: true, scenarioData: true },
    });
    const seen = new Map<string, Set<string>>();
    for (const r of rows) {
      for (const code of collectHotspots(r.scenarioData).values()) {
        if (!seen.has(code)) seen.set(code, new Set());
        seen.get(code)!.add(r.questionId);
      }
    }
    return new Map([...seen].map(([code, ids]) => [code, ids.size]));
  }

  async createSignal(dto: CreateSignalDto, actorId: string | null) {
    if (await this.prisma.signal.findUnique({ where: { code: dto.code } })) {
      throw new ConflictException(
        `Dấu hiệu ${dto.code} đã tồn tại / Signal ${dto.code} already exists`,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const s = await tx.signal.create({
        data: {
          code: dto.code,
          translations: { create: translationRows(dto.translations) },
        },
      });
      await this.audit.log(tx, {
        actorId,
        action: 'create',
        entity: 'signal',
        entityId: s.id,
        changes: dto,
      });
      return { id: s.id };
    });
  }

  async updateSignal(id: string, dto: UpdateSignalDto, actorId: string | null) {
    await this.mustFindSignal(id);
    return this.prisma.$transaction(async (tx) => {
      for (const row of translationRows(dto.translations)) {
        await tx.signalTranslation.upsert({
          where: { signalId_locale: { signalId: id, locale: row.locale } },
          create: { signalId: id, ...row },
          update: { name: row.name, explanation: row.explanation },
        });
      }
      await this.audit.log(tx, {
        actorId,
        action: 'update',
        entity: 'signal',
        entityId: id,
        changes: dto,
      });
      return { id };
    });
  }

  /** Blocks deleting a signal in use — otherwise the cascade silently deletes quiz answers. */
  async deleteSignal(id: string, actorId: string | null) {
    const s = await this.mustFindSignal(id);
    const [quiz, variants, hotspots] = await Promise.all([
      this.prisma.quizQuestionSignal.count({ where: { signalId: id } }),
      this.prisma.variantSignal.count({ where: { signalId: id } }),
      this.hotspotUsage().then((m) => m.get(s.code) ?? 0),
    ]);
    if (quiz + variants + hotspots > 0) {
      throw new ConflictException(
        `Dấu hiệu đang được dùng (${quiz} đáp án, ${hotspots} bài có hotspot, ${variants} variant) — gỡ trước khi xoá / Signal in use (${quiz} answers, ${hotspots} quizzes with hotspots, ${variants} variants) — detach it first`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.signal.delete({ where: { id } });
      await this.audit.log(tx, {
        actorId,
        action: 'delete',
        entity: 'signal',
        entityId: id,
        changes: { code: s.code },
      });
    });
    return { ok: true };
  }

  private async mustFindSignal(id: string) {
    const s = await this.prisma.signal.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Signal not found');
    return s;
  }
}
