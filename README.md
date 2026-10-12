# RedFlag

Sân tập rèn phản xạ nhận biết lừa đảo online — mô hình kiểu Duolingo cho an toàn mạng. Người dùng **tự nguyện** đăng ký để luyện; sản phẩm giáo dục/phòng thủ.

> Tài liệu: [plan/redflag-plan.md](plan/redflag-plan.md) (core rules + phases) · [plan/architecture.md](plan/architecture.md) (kiến trúc).

## Tech stack

- **Web:** Next.js (App Router) — `apps/web`
- **API + Worker:** NestJS (modular monolith, hexagonal) — `apps/api`
- **Shared types/enums:** `packages/shared`
- **DB:** PostgreSQL (Prisma — thêm ở Phase 1)
- **Queue:** Redis + BullMQ (thêm ở Phase 4)
- **Email (dev):** Mailpit

## Yêu cầu

- Node.js >= 20 (đang dùng 25)
- pnpm >= 10
- Docker (cho Postgres/Redis/Mailpit)

## Chạy local (Phase 0)

```bash
# 1. Cài dependencies
pnpm install

# 2. Tạo .env từ mẫu
cp .env.example .env

# 3. Bật hạ tầng (Postgres, Redis, Mailpit)
pnpm infra:up

# 4. Tạo schema DB + seed nội dung mẫu (song ngữ EN/VI)
pnpm --filter @redflag/api prisma:migrate   # apply migrations
pnpm --filter @redflag/api db:seed          # seed Catalog

# 5. Chạy — CÁCH 1: chung 1 terminal (tự build shared trước)
pnpm dev

# 5. Chạy — CÁCH 2: tách BE/FE ra 2 terminal (log không bị trộn/xoá)
#   Terminal 1 (Backend API):
pnpm dev:api
#   Terminal 2 (Frontend Web):
pnpm dev:web
#   (tuỳ chọn) Terminal 3 (Worker nền — Phase 4 mới dùng):
pnpm dev:worker
```

> Mỗi lệnh `dev:*` tự build `shared` trước. Nest watch đã bật `preserveWatchOutput`
> nên không xoá màn hình khi biên dịch lại.

> App tự đọc `.env` ở gốc repo (qua `apps/api/src/load-env.ts`), nên không cần set
> `DATABASE_URL` thủ công khi chạy từ `apps/api`.

Thử Catalog API: http://localhost:4000/api/catalog/variants?locale=vi (đổi `locale=en`).

## API hiện có

**Phase 1 — Catalog (public)**
- `GET /api/catalog/variants?locale=en|vi` — variant kèm signal, nội dung theo locale

**Phase 2 — Auth & onboarding**
- `POST /api/auth/register` `{email, password, locale?}` → gửi mail xác thực (xem Mailpit :8025)
- `POST /api/auth/verify` `{token}` — xác thực email (double opt-in, R1)
- `POST /api/auth/login` `{email, password}` → set cookie `rf_access` (access JWT 15') + `rf_refresh` (refresh)
- `POST /api/auth/refresh` — xoay vòng refresh token (lưu DB), cấp access + refresh mới
- `GET  /api/auth/me` — hồ sơ + trạng thái 2 flow (cần đăng nhập)
- `POST /api/auth/logout` — thu hồi phiên trong DB + xoá cookie
- `GET  /api/onboarding/test-warning?locale=` — text cảnh báo + câu xác nhận kỳ vọng
- `POST /api/onboarding` — hồ sơ (tuỳ chọn) + Training interests + Test opt-in (type-to-confirm)
- `POST /api/test/pause` · `POST /api/test/resume` · `POST /api/test/unsubscribe`

> Bật Test flow yêu cầu **gõ lại đúng câu xác nhận** theo locale (type-to-confirm), không chỉ tick.

**Phase 3 — Training (public, optional-auth)**
- `GET  /api/training/quiz?locale=&category=&kind=&signal=&level=&exclude=&ids=` — một lượt 10 câu bốc ngẫu nhiên (ưu tiên chưa làm → làm sai); `ids` = tải lại đúng bộ đang làm (không lộ đáp án; ~6 lựa chọn signal)
- `GET  /api/training/quiz/:id`
- `GET  /api/training/facets?locale=&level=` — số bài theo kênh / chủ đề / dấu hiệu / độ khó
- `GET  /api/training/library?…&status=&q=&sort=&page=` — thư viện tình huống (phân trang, không lộ đáp án)
- `GET  /api/training/brands?locale=&q=` — sổ tay chính chủ (mỗi locale một bộ thương hiệu)
- `POST /api/training/quiz/:id/answer` `{answeredScam, selectedSignals[]}` — chấm theo signal; user đăng nhập thì lưu `QuizAttempt`

Trang guest: http://localhost:4001/train (server component SSR cho SEO + client component tương tác; đổi ngôn ngữ qua `?locale=en|vi`).

- Web: http://localhost:4001
- API health: http://localhost:4000/api/health
- Web BFF health (kiểm tra cả web lẫn API): http://localhost:4001/api/health
- Mailpit UI: http://localhost:8025

Worker (chạy riêng khi cần): `pnpm dev:worker`.

## Scripts

| Lệnh | Việc |
|---|---|
| `pnpm dev` | Build shared + chạy web & api (watch) |
| `pnpm build` | Build toàn bộ (shared → apps) |
| `pnpm typecheck` | Kiểm tra kiểu toàn repo |
| `pnpm lint` | Lint toàn repo |
| `pnpm test` | Chạy test toàn repo |
| `pnpm infra:up` / `infra:down` | Bật/tắt Docker infra |
| `pnpm -s --filter @redflag/api data …` | CLI dữ liệu — xem mục dưới |

## Quản lý dữ liệu bằng CLI

Thêm / sửa / xoá nội dung (bài train, chủ đề, dấu hiệu, sổ tay) **không cần server hay đăng nhập**, dành cho người và agent. CLI gọi đúng lớp service của trang admin nên áp **cùng luật** (validate DTO, luật hotspot + cấu trúc vỏ khi xuất bản, chặn xoá thứ đang dùng) và **ghi audit log** (hiện là "CLI / agent" trong `/admin/audit`).

```bash
# -s: stdout chỉ còn JSON (pnpm không in dòng tiêu đề)
alias rf="pnpm -s --filter @redflag/api data"

rf                                   # hướng dẫn đầy đủ
rf quiz list --category BANK --status published
rf quiz get '#54'                    # id hoặc #số; kèm lỗi luật xuất bản nếu có
```

**Tạo bài mô phỏng mới**

```bash
rf quiz template sms_inspection > q.json   # khung JSON cho loại vỏ (email/sms/chat/web/qr/file/app/oauth)
rf quiz coverage                           # chủ đề nào đang thiếu bài lừa/an toàn
# … điền nội dung EN + VI vào q.json …
rf quiz check  --file q.json               # kiểm luật, không ghi
rf quiz create --file q.json --dry-run
rf quiz create --file q.json               # tạo NHÁP, in #số + link /admin/quiz/<id> để xem trước
rf quiz publish '#68'                      # lên /train — bị chặn nếu còn lỗi luật
```

**Sửa bài:** `rf quiz export '#54' > q54.json` → sửa → `rf quiz update '#54' --file q54.json`.

**Xoá:** `rf quiz delete '#68'` chỉ in ra thứ sẽ bị xoá; thêm `--yes` để xoá thật. Bài đã có lượt làm không xoá được — dùng `unpublish`.

Chủ đề, dấu hiệu, sổ tay: `rf category|signal list|create|update <CODE>|delete <CODE>` và `rf brand list|create|update <CODE> --locale vi|en|delete <CODE> --locale vi|en`; dữ liệu đầu vào là JSON qua `--file` (hoặc `--file -` từ stdin), cùng dạng với API admin.

**Quy tắc soạn bài:** xem [docs/quiz-authoring.md](docs/quiz-authoring.md) — mọi hotspot (đúng hoặc mồi) cần `note` riêng ≥60 ký tự, mỗi bài cần ≥1 mồi, `rf quiz coverage` cho biết chủ đề nào đang thiếu bài an toàn. Luôn chạy `--dry-run` trước khi ghi.

## Cấu trúc

```
apps/
  web/     Next.js (guest, học/quiz, dashboard, teach page)
  api/     NestJS — main.ts (API) + worker.ts (nền); modules/ theo bounded context
packages/
  shared/  enums dùng chung: SignalCode, CategoryCode, EventType, Locale, Flow
plan/      tài liệu kế hoạch & kiến trúc
```
