import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import type { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

const CHANNELS = [
  'websites',
  'emailDomains',
  'smsSenders',
  'hotlines',
  'apps',
  'socialPages',
  'paymentAccounts',
  'legalNames',
  'taxCodes',
  'addresses',
  'shortCodes',
] as const;

/** Trims whitespace, drops blank and duplicate lines. */
const clean = (list?: string[]) => [
  ...new Set((list ?? []).map((v) => v.trim()).filter(Boolean)),
];

/**
 * Brand handbook: each brand's official contact channels (DATA — R6).
 * One brand set per locale; code + locale are fixed after creation.
 */
@Injectable()
export class BrandAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const rows = await this.prisma.brand.findMany({
      orderBy: [{ locale: 'asc' }, { order: 'asc' }, { name: 'asc' }],
      include: { category: { select: { code: true } } },
    });
    return rows.map((b) => ({
      id: b.id,
      code: b.code,
      locale: b.locale,
      name: b.name,
      description: b.description,
      categoryCode: b.category?.code ?? null,
      websites: b.websites,
      emailDomains: b.emailDomains,
      smsSenders: b.smsSenders,
      hotlines: b.hotlines,
      apps: b.apps,
      socialPages: b.socialPages,
      paymentAccounts: b.paymentAccounts,
      legalNames: b.legalNames,
      taxCodes: b.taxCodes,
      addresses: b.addresses,
      shortCodes: b.shortCodes,
      order: b.order,
      status: b.status,
    }));
  }

  async create(dto: CreateBrandDto, actorId: string | null) {
    const locale = dto.locale as Locale;
    if (
      await this.prisma.brand.findUnique({
        where: { code_locale: { code: dto.code, locale } },
      })
    ) {
      throw new ConflictException(
        `Thương hiệu ${dto.code} (${locale}) đã tồn tại / Brand ${dto.code} (${locale}) already exists`,
      );
    }
    const data = await this.fields(dto);
    return this.prisma.$transaction(async (tx) => {
      const b = await tx.brand.create({ data: { code: dto.code, locale, ...data } });
      await this.audit.log(tx, {
        actorId,
        action: 'create',
        entity: 'brand',
        entityId: b.id,
        changes: dto,
      });
      return { id: b.id };
    });
  }

  async update(id: string, dto: UpdateBrandDto, actorId: string | null) {
    await this.mustFind(id);
    const data = await this.fields(dto);
    return this.prisma.$transaction(async (tx) => {
      await tx.brand.update({ where: { id }, data });
      await this.audit.log(tx, {
        actorId,
        action: 'update',
        entity: 'brand',
        entityId: id,
        changes: dto,
      });
      return { id };
    });
  }

  async remove(id: string, actorId: string | null) {
    const b = await this.mustFind(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.brand.delete({ where: { id } });
      await this.audit.log(tx, {
        actorId,
        action: 'delete',
        entity: 'brand',
        entityId: id,
        changes: { code: b.code, locale: b.locale },
      });
    });
    return { ok: true };
  }

  private async fields(dto: UpdateBrandDto) {
    let categoryId: string | null = null;
    if (dto.categoryCode) {
      const c = await this.prisma.category.findUnique({
        where: { code: dto.categoryCode },
        select: { id: true },
      });
      if (!c)
        throw new NotFoundException(
          `Chủ đề ${dto.categoryCode} không tồn tại / Category ${dto.categoryCode} not found`,
        );
      categoryId = c.id;
    }
    const channels = Object.fromEntries(
      CHANNELS.map((k) => [k, clean(dto[k])]),
    ) as Record<(typeof CHANNELS)[number], string[]>;
    return {
      name: dto.name.trim(),
      description: dto.description?.trim() ?? '',
      categoryId,
      ...channels,
      order: dto.order ?? 0,
      status: dto.status ?? 'published',
    };
  }

  private async mustFind(id: string) {
    const b = await this.prisma.brand.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Brand not found');
    return b;
  }
}
