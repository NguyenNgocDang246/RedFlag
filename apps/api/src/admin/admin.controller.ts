import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import type { AuthedUser } from '../identity/auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AuditService } from './audit.service';
import { BrandAdminService } from './brand-admin.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { StatusDto } from './dto/common.dto';
import { SaveQuizDto } from './dto/quiz.dto';
import { SaveTestEmailDto } from './dto/test-email.dto';
import {
  CreateCategoryDto,
  CreateSignalDto,
  UpdateCategoryDto,
  UpdateSignalDto,
} from './dto/taxonomy.dto';
import { QuizAdminService } from './quiz-admin.service';
import { TaxonomyService } from './taxonomy.service';
import { TestEmailAdminService } from './test-email-admin.service';
import type { RuleOpts } from './quiz-rules';
import { UiLocale } from './ui-locale.decorator';
import { IdResponse, OkResponse } from '../common/responses.dto';
import {
  AdminAuditEntry,
  AdminBrand,
  AdminCategory,
  AdminQuizCreated,
  AdminQuizDetail,
  AdminQuizPage,
  AdminSaveResult,
  AdminSendToSelfResult,
  AdminSignal,
  AdminStatusResult,
  AdminTestEmailDetail,
  AdminTestEmailPreview,
  AdminTestEmailSaved,
  AdminTestEmailSummary,
} from './dto/admin-response.dto';

/** Admin UI edits: only the rules a quiz needs to work (authoring-quality rules are for the data CLI). */
const adminRules = (ui: 'en' | 'vi'): RuleOpts => ({ ui, mode: 'basic' });

/**
 * Content admin (Phase 3B) — replaces editing seed.ts (R6).
 * Every route requires the admin role; every change is audit-logged.
 */
@ApiTags('admin')
@ApiCookieAuth()
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly taxonomy: TaxonomyService,
    private readonly quiz: QuizAdminService,
    private readonly brands: BrandAdminService,
    private readonly testEmails: TestEmailAdminService,
    private readonly audit: AuditService,
  ) {}

  // ─── Test emails (Phase 4) ───

  @Get('test-emails')
  listTestEmails(@UiLocale() ui: 'en' | 'vi'): Promise<AdminTestEmailSummary[]> {
    return this.testEmails.list(ui);
  }

  @Get('test-emails/:id')
  getTestEmail(@Param('id') id: string, @UiLocale() ui: 'en' | 'vi'): Promise<AdminTestEmailDetail> {
    return this.testEmails.get(id, ui);
  }

  @Post('test-emails')
  createTestEmail(
    @CurrentUser() user: AuthedUser,
    @Body() dto: SaveTestEmailDto,
    @UiLocale() ui: 'en' | 'vi',
  ): Promise<AdminTestEmailSaved> {
    return this.testEmails.create(dto, user.id, ui);
  }

  /** Saves the whole template. Emails already sent to learners are kept as they are. */
  @Put('test-emails/:id')
  updateTestEmail(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() dto: SaveTestEmailDto,
    @UiLocale() ui: 'en' | 'vi',
  ): Promise<AdminSaveResult> {
    return this.testEmails.update(id, dto, user.id, ui);
  }

  @Patch('test-emails/:id/status')
  setTestEmailStatus(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() dto: StatusDto,
    @UiLocale() ui: 'en' | 'vi',
  ): Promise<AdminStatusResult> {
    return this.testEmails.setStatus(id, dto.status, user.id, ui);
  }

  @Delete('test-emails/:id')
  deleteTestEmail(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @UiLocale() ui: 'en' | 'vi',
  ): Promise<OkResponse> {
    return this.testEmails.remove(id, user.id, ui);
  }

  /** Renders a test email exactly as it would arrive, without sending anything. */
  @Get('test-emails/:variantId/preview')
  previewTestEmail(@Param('variantId') variantId: string, @UiLocale() ui: 'en' | 'vi'): Promise<AdminTestEmailPreview> {
    return this.testEmails.preview(variantId, ui);
  }

  /**
   * Sends it to the signed-in admin's own address — there is no way to name another recipient.
   * `locale` in the body picks the language of the email (default: the admin UI's).
   */
  @Post('test-emails/:variantId/send-to-me')
  sendTestEmailToSelf(
    @CurrentUser() user: AuthedUser,
    @Param('variantId') variantId: string,
    @UiLocale() ui: 'en' | 'vi',
    @Body('locale') locale?: string,
  ): Promise<AdminSendToSelfResult> {
    return this.testEmails.sendToSelf(variantId, user.id, locale === 'en' || locale === 'vi' ? locale : ui);
  }

  // ─── Category ───

  @Get('categories')
  listCategories(): Promise<AdminCategory[]> {
    return this.taxonomy.listCategories();
  }

  @Post('categories')
  createCategory(@CurrentUser() user: AuthedUser, @Body() dto: CreateCategoryDto): Promise<IdResponse> {
    return this.taxonomy.createCategory(dto, user.id);
  }

  @Patch('categories/:id')
  updateCategory(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<IdResponse> {
    return this.taxonomy.updateCategory(id, dto, user.id);
  }

  @Delete('categories/:id')
  deleteCategory(@CurrentUser() user: AuthedUser, @Param('id') id: string): Promise<OkResponse> {
    return this.taxonomy.deleteCategory(id, user.id);
  }

  // ─── Signal ───

  @Get('signals')
  listSignals(): Promise<AdminSignal[]> {
    return this.taxonomy.listSignals();
  }

  @Post('signals')
  createSignal(@CurrentUser() user: AuthedUser, @Body() dto: CreateSignalDto): Promise<IdResponse> {
    return this.taxonomy.createSignal(dto, user.id);
  }

  @Patch('signals/:id')
  updateSignal(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSignalDto,
  ): Promise<IdResponse> {
    return this.taxonomy.updateSignal(id, dto, user.id);
  }

  @Delete('signals/:id')
  deleteSignal(@CurrentUser() user: AuthedUser, @Param('id') id: string): Promise<OkResponse> {
    return this.taxonomy.deleteSignal(id, user.id);
  }

  // ─── Quizzes ───

  /** ?kind=&category=(code | __none)&status=draft|published&q=&page= */
  @Get('quiz')
  listQuiz(
    @UiLocale() ui: 'en' | 'vi',
    @Query('kind') kind?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
  ): Promise<AdminQuizPage> {
    return this.quiz.list(
      { kind, category, status, q, page: page ? Number.parseInt(page, 10) || 1 : 1 },
      adminRules(ui),
    );
  }

  @Get('quiz/:id')
  getQuiz(@Param('id') id: string, @UiLocale() ui: 'en' | 'vi'): Promise<AdminQuizDetail> {
    return this.quiz.get(id, adminRules(ui));
  }

  @Post('quiz')
  createQuiz(
    @CurrentUser() user: AuthedUser,
    @Body() dto: SaveQuizDto,
    @UiLocale() ui: 'en' | 'vi',
  ): Promise<AdminQuizCreated> {
    return this.quiz.create(dto, user.id, adminRules(ui));
  }

  @Put('quiz/:id')
  updateQuiz(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() dto: SaveQuizDto,
    @UiLocale() ui: 'en' | 'vi',
  ): Promise<AdminSaveResult> {
    return this.quiz.update(id, dto, user.id, adminRules(ui));
  }

  @Patch('quiz/:id/status')
  setQuizStatus(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() dto: StatusDto,
    @UiLocale() ui: 'en' | 'vi',
  ): Promise<AdminStatusResult> {
    return this.quiz.setStatus(id, dto.status, user.id, adminRules(ui));
  }

  @Delete('quiz/:id')
  deleteQuiz(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @UiLocale() ui: 'en' | 'vi',
  ): Promise<OkResponse> {
    return this.quiz.remove(id, user.id, ui);
  }

  // ─── Brand handbook ───

  @Get('brands')
  listBrands(): Promise<AdminBrand[]> {
    return this.brands.list();
  }

  @Post('brands')
  createBrand(@CurrentUser() user: AuthedUser, @Body() dto: CreateBrandDto): Promise<IdResponse> {
    return this.brands.create(dto, user.id);
  }

  @Patch('brands/:id')
  updateBrand(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
  ): Promise<IdResponse> {
    return this.brands.update(id, dto, user.id);
  }

  @Delete('brands/:id')
  deleteBrand(@CurrentUser() user: AuthedUser, @Param('id') id: string): Promise<OkResponse> {
    return this.brands.remove(id, user.id);
  }

  // ─── Audit log ───

  @Get('audit')
  listAudit(@Query('entity') entity?: string, @Query('entityId') entityId?: string): Promise<AdminAuditEntry[]> {
    return this.audit.list({ entity, entityId });
  }
}
