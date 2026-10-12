import { Controller, Get, Query } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { DEFAULT_LOCALE, isSupportedLocale } from '@redflag/shared';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('variants')
  listVariants(@Query('locale') localeParam?: string) {
    const locale: Locale =
      localeParam && isSupportedLocale(localeParam) ? (localeParam as Locale) : DEFAULT_LOCALE;
    return this.catalog.listVariants(locale);
  }
}
