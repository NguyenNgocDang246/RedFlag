import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Admin UI language from `Accept-Language` (the admin client sends `en` or `vi`).
 * Only localizes validation messages — content locales are explicit in the payload.
 */
export const UiLocale = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): 'en' | 'vi' => {
    const header =
      ctx.switchToHttp().getRequest<Request>().headers['accept-language'] ?? '';
    return header.toLowerCase().startsWith('en') ? 'en' : 'vi';
  },
);
