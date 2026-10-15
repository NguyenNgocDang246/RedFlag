import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { HttpException, type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Locale } from '@prisma/client';
import { collectDecoys, EDITABLE_QUIZ_KINDS } from '@redflag/shared';
import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { BrandAdminService } from '../admin/brand-admin.service';
import { CreateBrandDto, UpdateBrandDto } from '../admin/dto/brand.dto';
import { SaveQuizDto } from '../admin/dto/quiz.dto';
import { CreateCategoryDto, CreateSignalDto, UpdateCategoryDto, UpdateSignalDto } from '../admin/dto/taxonomy.dto';
import { quizHints } from '../admin/quiz-rules';
import { QuizAdminService } from '../admin/quiz-admin.service';
import { TaxonomyService } from '../admin/taxonomy.service';
import { loadEnv } from '../load-env';
import { PrismaService } from '../prisma/prisma.service';
import { flagString, parseArgs, parseQuizRef, type ParsedArgs } from './args';
import { DataCliModule } from './data-cli.module';
import { quizTemplate } from './templates';

/**
 * Data CLI — create/edit/delete content through the SAME admin service layer
 * (same DTO validation, publish rules, audit log with `via: 'cli'`).
 * Run: pnpm -s --filter @redflag/api data <entity> <action> [...] (-s keeps stdout pure JSON). No args shows help.
 */

const HELP = `Dùng: pnpm -s --filter @redflag/api data <entity> <action> [tham số]

quiz      list [--kind K] [--category C] [--status draft|published] [--q TEXT] [--page N]
          get <id|#số>                  xem đầy đủ (kèm lỗi luật xuất bản)
          export <id|#số>               in JSON đúng dạng để sửa rồi update
          template <kind>               khung JSON cho bài mới (${EDITABLE_QUIZ_KINDS.join(', ')})
          check [<id|#số>] --file f.json  chỉ kiểm luật, không ghi (kèm <id> khi kiểm bản sửa của bài đó)
                                        in kèm "hints": gợi ý số dấu hiệu/mồi theo mức, không chặn
          coverage                      cân bằng kho: lừa/an toàn theo chủ đề, và dấu hiệu nào chưa có mồi đối trọng
          create --file f.json          tạo NHÁP
          update <id|#số> --file f.json
          publish <id|#số> | unpublish <id|#số>
          delete <id|#số> --yes
category  list | create --file f.json | update <CODE> --file f.json | delete <CODE> --yes
signal    list | create --file f.json | update <CODE> --file f.json | delete <CODE> --yes
brand     list [--locale en|vi] | create --file f.json
          update <CODE> --locale L --file f.json | delete <CODE> --locale L --yes

Cờ chung: --dry-run (kiểm tra, không ghi) · --file - (đọc JSON từ stdin)
Kết quả in JSON ra stdout; lỗi in ra stderr, exit code 1.`;

/** CLI user error (bad args, missing data…) — printed briefly, without a stack. */
class CliError extends Error {
  constructor(
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

const print = (data: unknown) => process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);

function readJson(flags: ParsedArgs['flags']): unknown {
  const file = flagString(flags, 'file');
  if (!file) throw new CliError('Thiếu --file <đường dẫn JSON> (hoặc --file - để đọc từ stdin)');
  const raw = file === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new CliError(`JSON không hợp lệ trong ${file}: ${(e as Error).message}`);
  }
}

function flattenErrors(errors: ValidationError[], path = ''): string[] {
  return errors.flatMap((e) => {
    const at = path ? `${path}.${e.property}` : e.property;
    return [...Object.values(e.constraints ?? {}).map((m) => `${at}: ${m}`), ...flattenErrors(e.children ?? [], at)];
  });
}

/** Validates like the API's ValidationPipe (whitelist + forbidNonWhitelisted + transform). */
async function toDto<T extends object>(cls: ClassConstructor<T>, plain: unknown): Promise<T> {
  const dto = plainToInstance(cls, plain);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) throw new CliError('Dữ liệu không hợp lệ', flattenErrors(errors));
  return dto;
}

/** Unreplaced `<…>` placeholders from `quiz template` — blocked so half-filled quizzes aren't created. */
function placeholderIssues(plain: unknown): string[] {
  const found = new Set<string>();
  const walk = (node: unknown) => {
    if (typeof node === 'string') node.match(/<[^<>]+>/g)?.forEach((m) => found.add(m));
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') Object.values(node).forEach(walk);
  };
  walk(plain);
  return [...found].map((m) => `còn chữ mẫu chưa thay: ${m}`);
}

const need = (v: string | undefined, what: string) => {
  if (!v) throw new CliError(`Thiếu ${what}`);
  return v;
};

const webUrl = () => process.env.WEB_PUBLIC_URL ?? 'http://localhost:4001';

async function run(app: INestApplicationContext, args: ParsedArgs) {
  const [entity, action, ref] = args.positional;
  const { flags } = args;
  const dryRun = flags['dry-run'] === true;
  const prisma = app.get(PrismaService);
  const quiz = app.get(QuizAdminService);
  const taxonomy = app.get(TaxonomyService);
  const brands = app.get(BrandAdminService);

  const quizId = async (r: string | undefined) => {
    const parsed = parseQuizRef(need(r, '<id|#số> của bài'));
    const row = await prisma.quizQuestion.findUnique({ where: parsed, select: { id: true } });
    if (!row) throw new CliError(`Không tìm thấy bài ${r}`);
    return row.id;
  };
  const categoryId = async (code: string | undefined) => {
    const row = await prisma.category.findUnique({ where: { code: need(code, '<CODE> của chủ đề') } });
    if (!row) throw new CliError(`Không tìm thấy chủ đề ${code}`);
    return row.id;
  };
  const signalId = async (code: string | undefined) => {
    const row = await prisma.signal.findUnique({ where: { code: need(code, '<CODE> của dấu hiệu') } });
    if (!row) throw new CliError(`Không tìm thấy dấu hiệu ${code}`);
    return row.id;
  };
  const brandId = async (code: string | undefined) => {
    const locale = need(flagString(flags, 'locale'), '--locale en|vi') as Locale;
    const row = await prisma.brand.findUnique({ where: { code_locale: { code: need(code, '<CODE> của thương hiệu'), locale } } });
    if (!row) throw new CliError(`Không tìm thấy thương hiệu ${code} (${locale})`);
    return row.id;
  };
  /** Deleting needs --yes; without it, only report what would be deleted. */
  const confirmDelete = (target: unknown) => {
    if (flags.yes === true && !dryRun) return true;
    print({ wouldDelete: target, hint: 'Thêm --yes để xoá thật' });
    return false;
  };
  const quizSummary = async (id: string) => {
    const q = await quiz.get(id);
    return { id: q.id, number: q.number, status: q.status, title: q.translations.vi?.title || q.translations.en?.title || '' };
  };

  switch (`${entity} ${action}`) {
    // ─── Quizzes ───
    case 'quiz list': {
      const res = await quiz.list({
        kind: flagString(flags, 'kind'),
        category: flagString(flags, 'category'),
        status: flagString(flags, 'status'),
        q: flagString(flags, 'q'),
        page: Number(flagString(flags, 'page') ?? 1) || 1,
      });
      return print({
        total: res.total,
        page: res.page,
        pageSize: res.pageSize,
        items: res.items.map((q) => ({
          number: q.number,
          id: q.id,
          status: q.status,
          kind: q.kind,
          category: q.categoryCode,
          isScam: q.isScam,
          level: q.difficultyLevel,
          isPublic: q.isPublic,
          title: q.title.vi || q.title.en,
          issues: q.issueCount,
        })),
      });
    }
    case 'quiz get':
      return print(await quiz.get(await quizId(ref)));
    case 'quiz export': {
      const q = await quiz.get(await quizId(ref));
      const translations = Object.fromEntries(Object.entries(q.translations).filter(([, t]) => t));
      return print({
        kind: q.kind,
        isScam: q.isScam,
        difficultyLevel: q.difficultyLevel,
        categoryCode: q.categoryCode,
        isPublic: q.isPublic,
        order: q.order,
        signalCodes: q.signalCodes,
        translations,
      });
    }
    case 'quiz coverage': {
      const rows = await prisma.quizQuestion.findMany({
        select: {
          isScam: true,
          status: true,
          category: { select: { code: true } },
          signals: { select: { signal: { select: { code: true } } } },
          translations: { select: { scenarioData: true } },
        },
      });
      const by = new Map<string, { scam: number; safe: number }>();
      for (const r of rows) {
        const code = r.category?.code ?? '(không chủ đề)';
        const c = by.get(code) ?? { scam: 0, safe: 0 };
        c[r.isScam ? 'scam' : 'safe']++;
        by.set(code, c);
      }
      // Target ≈ 2 scam : 1 safe — flag topics with fewer than half the safe quizzes that ratio asks for.
      const items = [...by.entries()]
        .map(([category, c]) => {
          const needSafe = Math.ceil(c.scam / 2);
          return { category, scam: c.scam, safe: c.safe, needSafe: Math.max(0, needSafe - c.safe), flag: c.safe === 0 ? 'chưa có bài an toàn' : c.safe < needSafe / 2 ? 'thiếu bài an toàn' : '' };
        })
        .sort((a, b) => b.needSafe - a.needSafe);

      /**
       * Per-signal balance. A signal the learner only ever meets as the right answer is a free
       * giveaway: tap it, always score. The counterweight is the SAME signal appearing as a decoy
       * (tapping it is then wrong) — in a safe quiz or as a decoy inside another scam quiz.
       */
      const sig = new Map<string, { asAnswer: number; asDecoy: number }>();
      const bump = (code: string, key: 'asAnswer' | 'asDecoy') => {
        const c = sig.get(code) ?? { asAnswer: 0, asDecoy: 0 };
        c[key]++;
        sig.set(code, c);
      };
      for (const r of rows) {
        const codes = r.signals.map((s) => s.signal.code);
        codes.forEach((c) => bump(c, 'asAnswer'));
        const decoys = new Set<string>();
        for (const t of r.translations) collectDecoys(t.scenarioData, codes).forEach((d) => decoys.add(d.signal));
        decoys.forEach((c) => bump(c, 'asDecoy'));
      }
      const signals = [...sig.entries()]
        .map(([signal, c]) => ({
          signal,
          asAnswer: c.asAnswer,
          asDecoy: c.asDecoy,
          flag: c.asAnswer > 0 && c.asDecoy === 0 ? 'chưa từng là mồi — chạm vào là luôn đúng' : c.asAnswer > c.asDecoy * 3 ? 'thiếu mồi đối trọng' : '',
        }))
        .sort((a, b) => (b.flag ? 1 : 0) - (a.flag ? 1 : 0) || b.asAnswer - a.asAnswer);

      return print({
        target: 'lừa : an toàn ≈ 2 : 1 theo chủ đề',
        items,
        signalTarget: 'mỗi dấu hiệu dùng làm đáp án phải có ít nhất một bài dùng nó làm mồi',
        signals,
      });
    }
    case 'quiz template':
      return print(quizTemplate(need(ref, `<kind> (${EDITABLE_QUIZ_KINDS.join(', ')})`)));
    case 'quiz check': {
      const plain = readJson(flags);
      // With <id|#số>, that quiz is excluded from the duplicate-note check (checking an edited export of itself).
      const excludeId = ref ? await quizId(ref) : undefined;
      const dto = await toDto(SaveQuizDto, plain);
      const issues = [...placeholderIssues(plain), ...(await quiz.check(dto, excludeId))];
      // `hints` never block — they are the per-level signal/decoy bands (simulation-design.md §1c).
      return print({ ok: issues.length === 0, issues, hints: quizHints(dto) });
    }
    case 'quiz create': {
      const plain = readJson(flags);
      const placeholders = placeholderIssues(plain);
      if (placeholders.length) throw new CliError('Bài còn chữ mẫu của template', placeholders);
      const dto = await toDto(SaveQuizDto, plain);
      const hints = quizHints(dto);
      if (dryRun) return print({ dryRun: true, wouldCreate: 'draft', issues: await quiz.check(dto), hints });
      const res = await quiz.create(dto, null);
      const { number } = await quizSummary(res.id);
      return print({ ...res, number, hints, preview: `${webUrl()}/admin/quiz/${res.id}` });
    }
    case 'quiz update': {
      const id = await quizId(ref);
      const plain = readJson(flags);
      const placeholders = placeholderIssues(plain);
      if (placeholders.length) throw new CliError('Bài còn chữ mẫu của template', placeholders);
      const dto = await toDto(SaveQuizDto, plain);
      const hints = quizHints(dto);
      if (dryRun)
        return print({ dryRun: true, wouldUpdate: await quizSummary(id), issues: await quiz.check(dto, id), hints });
      const res = await quiz.update(id, dto, null);
      return print({ ...res, hints, preview: `${webUrl()}/admin/quiz/${id}` });
    }
    case 'quiz publish':
    case 'quiz unpublish': {
      const id = await quizId(ref);
      const status = action === 'publish' ? 'published' : 'draft';
      if (dryRun) {
        const q = await quiz.get(id);
        return print({ dryRun: true, would: status, issues: status === 'published' ? q.issues : [] });
      }
      return print(await quiz.setStatus(id, status, null));
    }
    case 'quiz delete': {
      const id = await quizId(ref);
      if (!confirmDelete(await quizSummary(id))) return;
      return print(await quiz.remove(id, null));
    }

    // ─── Categories ───
    case 'category list':
      return print(await taxonomy.listCategories());
    case 'category create': {
      const dto = await toDto(CreateCategoryDto, readJson(flags));
      return print(dryRun ? { dryRun: true, wouldCreate: dto.code } : await taxonomy.createCategory(dto, null));
    }
    case 'category update': {
      const id = await categoryId(ref);
      const dto = await toDto(UpdateCategoryDto, readJson(flags));
      return print(dryRun ? { dryRun: true, wouldUpdate: ref } : await taxonomy.updateCategory(id, dto, null));
    }
    case 'category delete': {
      const id = await categoryId(ref);
      if (!confirmDelete({ category: ref })) return;
      return print(await taxonomy.deleteCategory(id, null));
    }

    // ─── Signals ───
    case 'signal list':
      return print(await taxonomy.listSignals());
    case 'signal create': {
      const dto = await toDto(CreateSignalDto, readJson(flags));
      return print(dryRun ? { dryRun: true, wouldCreate: dto.code } : await taxonomy.createSignal(dto, null));
    }
    case 'signal update': {
      const id = await signalId(ref);
      const dto = await toDto(UpdateSignalDto, readJson(flags));
      return print(dryRun ? { dryRun: true, wouldUpdate: ref } : await taxonomy.updateSignal(id, dto, null));
    }
    case 'signal delete': {
      const id = await signalId(ref);
      if (!confirmDelete({ signal: ref })) return;
      return print(await taxonomy.deleteSignal(id, null));
    }

    // ─── Brand handbook ───
    case 'brand list': {
      const locale = flagString(flags, 'locale');
      const rows = await brands.list();
      return print(locale ? rows.filter((b) => b.locale === locale) : rows);
    }
    case 'brand create': {
      const dto = await toDto(CreateBrandDto, readJson(flags));
      return print(dryRun ? { dryRun: true, wouldCreate: `${dto.code} (${dto.locale})` } : await brands.create(dto, null));
    }
    case 'brand update': {
      const id = await brandId(ref);
      const dto = await toDto(UpdateBrandDto, readJson(flags));
      return print(dryRun ? { dryRun: true, wouldUpdate: ref } : await brands.update(id, dto, null));
    }
    case 'brand delete': {
      const id = await brandId(ref);
      if (!confirmDelete({ brand: ref, locale: flagString(flags, 'locale') })) return;
      return print(await brands.remove(id, null));
    }

    default:
      throw new CliError(entity ? `Lệnh không hỗ trợ: ${entity} ${action ?? ''}`.trim() : 'Thiếu lệnh', HELP);
  }
}

/** Service errors (409, 422 with `issues`…) or CLI errors → compact JSON on stderr. */
function report(e: unknown) {
  if (e instanceof CliError) return { error: e.message, details: e.details };
  if (e instanceof HttpException) {
    const body = e.getResponse();
    return typeof body === 'object' ? { status: e.getStatus(), ...(body as object) } : { status: e.getStatus(), error: body };
  }
  return { error: e instanceof Error ? e.message : String(e) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.positional.length === 0 || args.flags.help) {
    process.stdout.write(`${HELP}\n`);
    return;
  }
  loadEnv();
  const app = await NestFactory.createApplicationContext(DataCliModule, { logger: false });
  try {
    await run(app, args);
  } catch (e) {
    const out = report(e);
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
