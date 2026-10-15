import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Locale, Prisma } from '@prisma/client';
import { DEFAULT_LOCALE, renderSimEmail } from '@redflag/shared';
import { DeliveryService } from '../delivery/delivery.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import type { SaveTestEmailDto, VariantDto } from './dto/test-email.dto';
import { testEmailIssues } from './test-email-rules';

type Ui = 'en' | 'vi';
const LOCALES = ['en', 'vi'] as const;

const DETAIL_INCLUDE = {
  translations: true,
  category: { select: { code: true } },
  variants: {
    orderBy: { createdAt: 'asc' },
    include: {
      translations: true,
      signals: { include: { signal: { select: { code: true } } } },
      // Sent to a learner (not an admin preview) = locked, see `sentCounts`.
      _count: { select: { campaigns: { where: { isTest: false } } } },
    },
  },
} satisfies Prisma.TemplateInclude;

/**
 * Admin side of the email tests (Phase 4): write them, preview them exactly as they will arrive,
 * and send one to yourself before it ever goes to a learner.
 *
 * An email already sent to a learner is locked: the teach page, the report page and forwarded-report
 * matching all read its subject, body and red flags, so changing them would rewrite what the learner
 * actually received. To change it, add a new email and leave the old one in place.
 */
@Injectable()
export class TestEmailAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: DeliveryService,
    private readonly audit: AuditService,
  ) {}

  private pick<T extends { locale: Locale }>(rows: T[], locale: Locale): T | undefined {
    return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === DEFAULT_LOCALE);
  }

  /** Templates with their variants. Drafts are listed too, but the scheduler only sends published ones. */
  async list(ui: Locale = DEFAULT_LOCALE) {
    const templates = await this.prisma.template.findMany({
      orderBy: { code: 'asc' },
      include: {
        translations: true,
        category: { include: { translations: true } },
        variants: {
          orderBy: { createdAt: 'asc' },
          include: {
            translations: { select: { locale: true, senderName: true, subject: true } },
            signals: { include: { signal: true } },
            _count: { select: { campaigns: { where: { isTest: false } } } },
          },
        },
      },
    });

    return templates.map((t) => ({
      id: t.id,
      code: t.code,
      status: t.status,
      title: this.pick(t.translations, ui)?.title ?? t.code,
      category: t.category
        ? { code: t.category.code, name: this.pick(t.category.translations, ui)?.name ?? t.category.code }
        : null,
      variants: t.variants.map((v) => ({
        id: v.id,
        difficulty: v.difficultyLevel,
        locales: v.translations.map((x) => x.locale),
        subject: this.pick(v.translations, ui)?.subject ?? '',
        senderName: this.pick(v.translations, ui)?.senderName ?? '',
        signals: v.signals.map((s) => s.signal.code),
        sent: v._count.campaigns,
      })),
    }));
  }

  /** One template, in the shape the editor saves back. */
  async get(id: string, ui: Ui) {
    const t = await this.prisma.template.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!t) throw new NotFoundException(ui === 'vi' ? 'Không tìm thấy mẫu email' : 'Test email not found');
    const dto = this.toDto(t);
    return {
      id: t.id,
      status: t.status,
      ...dto,
      variants: dto.variants.map((v, i) => ({ ...v, sent: t.variants[i]._count.campaigns })),
      issues: testEmailIssues(dto, ui),
      updatedAt: t.updatedAt,
    };
  }

  async create(dto: SaveTestEmailDto, actorId: string, ui: Ui) {
    const code = dto.code?.trim().toUpperCase();
    if (!code) throw new BadRequestException(ui === 'vi' ? 'Thiếu mã mẫu' : 'A code is required');
    if (await this.prisma.template.findUnique({ where: { code } })) {
      throw new ConflictException(ui === 'vi' ? `Mã ${code} đã có` : `Code ${code} already exists`);
    }
    const issues = testEmailIssues(dto, ui);
    const status = dto.status === 'published' && issues.length === 0 ? 'published' : 'draft';
    if (dto.status === 'published' && issues.length) this.rejectInvalid(issues, ui);

    const categoryId = await this.categoryId(dto.categoryCode, ui);
    const signalIds = await this.signalIds(dto.variants, ui);

    const id = await this.prisma.$transaction(async (tx) => {
      const t = await tx.template.create({
        data: { code, categoryId, status, translations: { create: this.titleRows(dto) } },
      });
      for (const v of dto.variants) await this.createVariant(tx, t.id, v, signalIds);
      await this.audit.log(tx, { actorId, action: 'create', entity: 'test_email', entityId: t.id, changes: dto });
      return t.id;
    });
    return { id, status, issues };
  }

  /**
   * Saves the whole template: unlocked variants are rewritten, new ones added, missing ones removed.
   * Locked variants (already sent to a learner) are kept exactly as they are, whatever was sent for them.
   */
  async update(id: string, dto: SaveTestEmailDto, actorId: string, ui: Ui) {
    const current = await this.prisma.template.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!current) throw new NotFoundException(ui === 'vi' ? 'Không tìm thấy mẫu email' : 'Test email not found');

    const locked = new Map(current.variants.filter((v) => v._count.campaigns > 0).map((v) => [v.id, v]));
    const lockedGone = [...locked.keys()].filter((vid) => !dto.variants.some((v) => v.id === vid));
    if (lockedGone.length) {
      throw new BadRequestException(
        ui === 'vi'
          ? 'Không xoá được email đã gửi cho người học. Hãy gỡ xuất bản cả mẫu nếu không muốn gửi nữa.'
          : 'An email already sent to learners cannot be removed. Unpublish the template to stop sending it.',
      );
    }
    const known = new Set(current.variants.map((v) => v.id));
    if (dto.variants.some((v) => v.id && !known.has(v.id))) {
      throw new BadRequestException(ui === 'vi' ? 'Email không thuộc mẫu này' : 'Email does not belong to this template');
    }

    // Judge what will actually be stored: locked variants as they are now.
    const lockedDto = new Map(this.toDto(current).variants.filter((v) => locked.has(v.id!)).map((v) => [v.id!, v]));
    const effective: SaveTestEmailDto = {
      ...dto,
      variants: dto.variants.map((v) => (v.id && lockedDto.has(v.id) ? lockedDto.get(v.id)! : v)),
    };
    const issues = testEmailIssues(effective, ui);
    const wantStatus = dto.status ?? current.status;
    if (wantStatus === 'published' && issues.length) this.rejectInvalid(issues, ui);

    const categoryId = await this.categoryId(dto.categoryCode, ui);
    const editable = effective.variants.filter((v) => !(v.id && locked.has(v.id)));
    const signalIds = await this.signalIds(editable, ui);
    const removed = current.variants.filter((v) => !locked.has(v.id) && !dto.variants.some((x) => x.id === v.id));

    await this.prisma.$transaction(async (tx) => {
      await tx.template.update({ where: { id }, data: { categoryId, status: wantStatus } });
      await tx.templateTranslation.deleteMany({ where: { templateId: id } });
      await tx.templateTranslation.createMany({
        data: this.titleRows(dto).map((r) => ({ ...r, templateId: id })),
      });

      // Admin previews are the only campaigns an unlocked variant can have; they go with it.
      const removedIds = removed.map((v) => v.id);
      if (removedIds.length) {
        await tx.campaign.deleteMany({ where: { variantId: { in: removedIds }, isTest: true } });
        await tx.variant.deleteMany({ where: { id: { in: removedIds } } });
      }

      for (const v of editable) {
        if (!v.id) {
          await this.createVariant(tx, id, v, signalIds);
          continue;
        }
        await tx.variant.update({ where: { id: v.id }, data: { difficultyLevel: v.difficultyLevel } });
        await tx.variantTranslation.deleteMany({ where: { variantId: v.id } });
        await tx.variantTranslation.createMany({
          data: this.textRows(v).map((r) => ({ ...r, variantId: v.id! })),
        });
        await tx.variantSignal.deleteMany({ where: { variantId: v.id } });
        await tx.variantSignal.createMany({
          data: [...new Set(v.signalCodes)].map((c) => ({ variantId: v.id!, signalId: signalIds.get(c)! })),
        });
      }
      await this.audit.log(tx, { actorId, action: 'update', entity: 'test_email', entityId: id, changes: dto });
    });
    return { id, status: wantStatus, issues };
  }

  async setStatus(id: string, status: 'draft' | 'published', actorId: string, ui: Ui) {
    const t = await this.prisma.template.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!t) throw new NotFoundException(ui === 'vi' ? 'Không tìm thấy mẫu email' : 'Test email not found');
    if (status === 'published') {
      const issues = testEmailIssues(this.toDto(t), ui);
      if (issues.length) this.rejectInvalid(issues, ui);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.template.update({ where: { id }, data: { status } });
      await this.audit.log(tx, {
        actorId,
        action: status === 'published' ? 'publish' : 'unpublish',
        entity: 'test_email',
        entityId: id,
      });
    });
    return { id, status };
  }

  /** Only a template never sent to a learner can be deleted; otherwise unpublish it. */
  async remove(id: string, actorId: string, ui: Ui) {
    const t = await this.prisma.template.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!t) throw new NotFoundException(ui === 'vi' ? 'Không tìm thấy mẫu email' : 'Test email not found');
    if (t.variants.some((v) => v._count.campaigns > 0)) {
      throw new BadRequestException(
        ui === 'vi'
          ? 'Mẫu này đã gửi cho người học, không xoá được. Hãy gỡ xuất bản.'
          : 'This template was sent to learners and cannot be deleted. Unpublish it instead.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.campaign.deleteMany({ where: { variant: { templateId: id }, isTest: true } });
      await tx.template.delete({ where: { id } });
      await this.audit.log(tx, {
        actorId,
        action: 'delete',
        entity: 'test_email',
        entityId: id,
        changes: { code: t.code },
      });
    });
    return { ok: true };
  }

  /** The rendered email, exactly as the worker would build it — minus the tracking pixel. */
  async preview(variantId: string, locale: Locale) {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
      include: { translations: true },
    });
    if (!variant) throw new NotFoundException('Test email not found');
    const content = this.pick(variant.translations, locale);
    if (!content) throw new BadRequestException('This test email has no content in that language');

    const mail = renderSimEmail({
      locale: content.locale as 'en' | 'vi',
      subject: content.subject,
      body: content.body,
      name: null,
      // A placeholder: previews are never clickable, so no real token is spent on them.
      linkUrl: '#preview-link',
    });
    return { senderName: content.senderName, ...mail };
  }

  /**
   * Sends one test email to the admin's own address, right now. Scoped to themselves — this takes
   * no recipient, so it cannot be used to send to anyone else (R1).
   */
  async sendToSelf(variantId: string, adminId: string, locale: Locale) {
    const [variant, admin] = await Promise.all([
      this.prisma.variant.findUnique({ where: { id: variantId }, include: { translations: true } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: adminId }, select: { emailVerifiedAt: true } }),
    ]);
    if (!variant) throw new NotFoundException('Test email not found');
    const content = this.pick(variant.translations, locale);
    if (!content) throw new BadRequestException('This test email has no content in that language');
    if (!admin.emailVerifiedAt) throw new BadRequestException('Verify your own email address first');

    const campaign = await this.prisma.campaign.create({
      data: { userId: adminId, variantId, locale: content.locale, isTest: true, scheduledAt: new Date() },
      select: { id: true },
    });
    const sent = await this.delivery.sendCampaign(campaign.id);
    if (!sent) throw new BadRequestException('Could not send — check the mail server');
    return { ok: true, campaignId: campaign.id };
  }

  // ─── helpers ───

  private rejectInvalid(issues: string[], ui: Ui): never {
    throw new UnprocessableEntityException({
      message: ui === 'vi' ? 'Mẫu chưa đủ điều kiện xuất bản' : 'This test email is not ready to publish',
      issues,
    });
  }

  private toDto(t: Prisma.TemplateGetPayload<{ include: typeof DETAIL_INCLUDE }>): SaveTestEmailDto {
    const title = (l: Locale) => t.translations.find((x) => x.locale === l)?.title ?? '';
    return {
      code: t.code,
      categoryCode: t.category.code,
      titles: { en: title('en'), vi: title('vi') },
      variants: t.variants.map((v) => ({
        id: v.id,
        difficultyLevel: v.difficultyLevel,
        signalCodes: v.signals.map((s) => s.signal.code),
        translations: Object.fromEntries(
          v.translations.map((x) => [x.locale, { senderName: x.senderName, subject: x.subject, body: x.body }]),
        ),
      })),
    };
  }

  private titleRows(dto: SaveTestEmailDto) {
    return LOCALES.filter((l) => dto.titles[l]?.trim()).map((l) => ({ locale: l, title: dto.titles[l]!.trim() }));
  }

  /** Only the languages actually written; an all-blank language is simply not stored. */
  private textRows(v: VariantDto) {
    return LOCALES.flatMap((l) => {
      const t = v.translations[l];
      if (!t || (!t.senderName.trim() && !t.subject.trim() && !t.body.trim())) return [];
      return [{ locale: l, senderName: t.senderName.trim(), subject: t.subject.trim(), body: t.body.trim() }];
    });
  }

  private async createVariant(
    tx: Prisma.TransactionClient,
    templateId: string,
    v: VariantDto,
    signalIds: Map<string, string>,
  ) {
    await tx.variant.create({
      data: {
        templateId,
        difficultyLevel: v.difficultyLevel,
        translations: { create: this.textRows(v) },
        signals: { create: [...new Set(v.signalCodes)].map((c) => ({ signalId: signalIds.get(c)! })) },
      },
    });
  }

  private async categoryId(code: string, ui: Ui) {
    const c = await this.prisma.category.findUnique({ where: { code }, select: { id: true } });
    if (!c) throw new NotFoundException(ui === 'vi' ? `Chủ đề ${code} không tồn tại` : `Category ${code} not found`);
    return c.id;
  }

  private async signalIds(variants: VariantDto[], ui: Ui) {
    const codes = [...new Set(variants.flatMap((v) => v.signalCodes))];
    const rows = await this.prisma.signal.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } });
    const map = new Map(rows.map((r) => [r.code, r.id]));
    const missing = codes.filter((c) => !map.has(c));
    if (missing.length) {
      throw new NotFoundException(
        ui === 'vi' ? `Dấu hiệu không tồn tại: ${missing.join(', ')}` : `Unknown red flags: ${missing.join(', ')}`,
      );
    }
    return map;
  }
}
