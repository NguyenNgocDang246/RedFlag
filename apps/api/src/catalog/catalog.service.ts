import { Injectable } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { DEFAULT_LOCALE } from '@redflag/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Variants with their signals and locale content (falls back to en).
   */
  async listVariants(locale: Locale = DEFAULT_LOCALE) {
    const variants = await this.prisma.variant.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        template: { include: { category: { include: { translations: true } } } },
        translations: true,
        signals: { include: { signal: { include: { translations: true } } } },
      },
    });

    const pick = <T extends { locale: Locale }>(rows: T[]): T | undefined =>
      rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === DEFAULT_LOCALE);

    return variants.map((v) => {
      const vt = pick(v.translations);
      const ct = pick(v.template.category.translations);
      return {
        id: v.id,
        difficultyLevel: v.difficultyLevel,
        templateCode: v.template.code,
        category: {
          code: v.template.category.code,
          name: ct?.name ?? v.template.category.code,
        },
        subject: vt?.renderedSubject ?? '',
        body: vt?.renderedBody ?? '',
        signals: v.signals.map((vs) => {
          const st = pick(vs.signal.translations);
          return {
            code: vs.signal.code,
            name: st?.name ?? vs.signal.code,
            explanation: st?.explanation ?? '',
          };
        }),
      };
    });
  }
}
