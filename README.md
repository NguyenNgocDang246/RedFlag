# PhishGym

Sân tập rèn phản xạ nhận biết lừa đảo online — mô hình kiểu Duolingo cho an toàn mạng. Người dùng **tự nguyện** đăng ký để luyện; sản phẩm giáo dục/phòng thủ.

> Tài liệu: [plan/phishgym-plan.md](plan/phishgym-plan.md) (core rules + phases) · [plan/architecture.md](plan/architecture.md) (kiến trúc).

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
pnpm --filter @phishgym/api prisma:migrate   # apply migrations
pnpm --filter @phishgym/api db:seed          # seed Catalog

# 5. Chạy web + api (tự build shared trước)
pnpm dev
```

> App tự đọc `.env` ở gốc repo (qua `apps/api/src/load-env.ts`), nên không cần set
> `DATABASE_URL` thủ công khi chạy từ `apps/api`.

Thử Catalog API: http://localhost:4000/api/catalog/variants?locale=vi (đổi `locale=en`).

- Web: http://localhost:3000
- API health: http://localhost:4000/api/health
- Web BFF health (kiểm tra cả web lẫn API): http://localhost:3000/api/health
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

## Cấu trúc

```
apps/
  web/     Next.js (guest, học/quiz, dashboard, teach page)
  api/     NestJS — main.ts (API) + worker.ts (nền); modules/ theo bounded context
packages/
  shared/  enums dùng chung: SignalCode, CategoryCode, EventType, Locale, Flow
plan/      tài liệu kế hoạch & kiến trúc
```
