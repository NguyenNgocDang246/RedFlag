# RedFlag — Software Architecture

Tài liệu kiến trúc, trình bày theo các mô hình chuẩn:
- **C4 model** — mô tả hệ thống ở 3 mức: Context → Container → Component.
- **Modular Monolith** — phong cách triển khai tổng thể (một deployable, nhiều module ranh giới rõ, tách được về sau).
- **Hexagonal / Clean Architecture** — cấu trúc nội bộ mỗi module (domain lõi ở trong, infra ở ngoài, phụ thuộc hướng vào trong).
- **DDD (Domain-Driven Design)** — chia **bounded contexts** theo nghiệp vụ.

> Mọi quyết định ở đây bám **Core Rules R1–R9** trong [redflag-plan.md](redflag-plan.md). Đặc biệt R2 (không đụng PII) và R6 (mở rộng bằng data) là ràng buộc kiến trúc, không chỉ là feature.

---

## 1. Architecture drivers (vì sao chọn như vậy)

| Driver | Ảnh hưởng kiến trúc |
|---|---|
| R6 — thêm kiểu lừa = thêm data | Content Catalog là context riêng, engine đọc data; không nhúng business của từng brand vào code |
| R2 — test không đụng PII | Tracking context có **biên an toàn cứng**: chỉ nhận tín hiệu, không có đường ghi PII xuống DB/log |
| R7 — chấm theo signal | Scoring context tách khỏi Testing; tiêu thụ `events` qua message, không gọi chéo trực tiếp |
| 2 flow độc lập (Training ⟂ Test) | 2 bounded context tách biệt, nối một chiều qua `weak_signals` |
| R8 — job nền fail-safe | Async qua queue (BullMQ/Redis), worker tách tiến trình, idempotent |
| R9 — đơn giản cho user phổ thông | Thuật ngữ nội bộ (token/campaign/signal) **không rò** ra API công khai/UI; BFF dịch sang ngôn ngữ đời thường |
| Solo/demo, cần ship nhanh | **Modular monolith** thay vì microservices: ít ops, vẫn tách module sạch để tách service sau nếu cần |

---

## 2. C4 — Level 1: System Context

```
                         ┌─────────────────────────────┐
      Guest  ───────────▶│                             │
 (chưa đăng ký)          │          RedFlag           │
                         │  (sân tập nhận biết lừa đảo) │◀──── Admin/Content editor
      User   ───────────▶│                             │       (quản lý Catalog)
 (đã đăng ký, miễn phí)  └───────┬───────────┬─────────┘
                                 │           │
                                 ▼           ▼
                        ┌──────────────┐  ┌───────────────────┐
                        │ Email (SMTP) │  │ (tuỳ chọn) LLM API │
                        │ domain riêng │  │  cho roleplay P9   │
                        │ SPF/DKIM/DMARC│ └───────────────────┘
                        └──────┬───────┘
                               ▼
                      Hộp thư thật của User
                 (nơi "bài test bất ngờ" xuất hiện)
```

- **Người dùng:** Guest (preview vài bài), User (full, miễn phí), Admin/Content editor (biên tập Catalog đa ngôn ngữ).
- **Hệ ngoài:** SMTP (gửi email mô phỏng từ domain riêng); LLM API (chỉ Phase 9). Không có SMS/voice (R4).

---

## 3. C4 — Level 2: Container

```
┌──────────────────────────────────────────────────────────────────────┐
│                              RedFlag                                   │
│                                                                        │
│  ┌────────────────┐        HTTPS        ┌──────────────────────────┐   │
│  │  Web (Next.js) │  ◀───────────────▶  │   API (NestJS)           │   │
│  │  App Router    │   JSON / BFF layer  │   - modular monolith     │   │
│  │  i18n EN/VI    │                     │   - REST (public API)    │   │
│  │  Guest + Auth  │                     │   - module boundaries    │   │
│  └────────────────┘                     └───────┬───────┬──────────┘   │
│         ▲                                        │       │              │
│         │ tracking pixel / click (no-auth, token)│       │ enqueue      │
│         │                                        ▼       ▼              │
│  ┌──────┴────────────┐                   ┌───────────┐ ┌─────────────┐  │
│  │ Tracking endpoints│                   │ PostgreSQL│ │ Redis       │  │
│  │ (biên an toàn R2) │──events──────────▶│ (Prisma)  │ │ (BullMQ)    │  │
│  └───────────────────┘                   └───────────┘ └──────┬──────┘  │
│                                                                │         │
│                                           ┌────────────────────▼──────┐  │
│                                           │ Worker (NestJS process)   │  │
│                                           │ - Scheduler (lên lịch)    │  │
│                                           │ - Mailer (gửi qua SMTP)   │  │
│                                           │ - Scoring (tiêu thụ event)│  │
│                                           └─────────────┬─────────────┘  │
│                                                         │ SMTP           │
└─────────────────────────────────────────────────────────┼──────────────┘
                                                          ▼
                                            Mailpit (dev) / SMTP thật (prod)
```

**Containers:**
1. **Web (Next.js, App Router):** trang guest, học/quiz, onboarding, dashboard, teach page, trang "Bạn đã dính!". i18n EN/VI. Chứa **BFF layer** (route handlers) để gọi API và dịch dữ liệu sang ngôn ngữ đời thường (R9).
2. **API (NestJS):** modular monolith, REST public API. Chứa tất cả bounded context dưới dạng module.
3. **Worker (NestJS, cùng codebase, tiến trình riêng):** chạy BullMQ consumers + scheduler. Tách tiến trình để job nền không ảnh hưởng độ trễ API (R8).
4. **PostgreSQL** (Prisma) — nguồn sự thật dữ liệu.
5. **Redis** — hàng đợi job (BullMQ) + cache nhẹ.
6. **SMTP** — Mailpit ở dev, SMTP thật ở prod.

> API và Worker **chung một codebase** (một repo, một image), chạy bằng entrypoint khác nhau. Đây là đặc trưng modular monolith: dễ deploy, vẫn tách scaling.

---

## 4. C4 — Level 3: Component (bounded contexts trong API)

Mỗi context là một **NestJS module** với ranh giới rõ. Giao tiếp giữa context: **ưu tiên qua domain events (BullMQ)**; gọi đồng bộ chỉ qua **port interface** đã công bố, không chọc thẳng vào repository của context khác.

```
apps/api/src/modules/
├── identity/        (Identity & Consent)      — user, auth, verify email, consent, opt-in Test, cấu hình Training
├── catalog/         (Content Catalog)         — categories, templates, variants, signals, lessons (i18n, R6)
├── training/        (Training flow)            — chọn bài, quiz trắc nghiệm, lý thuyết, tiến độ học
├── testing/         (Test flow)                — campaign, scheduler, variant rendering per-user
├── delivery/        (Delivery)                 — mailer, queue producer, bounce/complaint webhook, INBOUND report@ handler
├── tracking/        (Tracking — biên an toàn)  — open/click/submit/report, token, SINH events (không PII)
├── scoring/         (Scoring & Analytics)      — tiêu thụ events → awareness score, weak_signals, gợi ý
└── shared-kernel/   (Shared Kernel)            — SignalCode/CategoryCode/EventType, Result, i18n helpers
```

### Quan hệ giữa các context (context map)

```
 identity ──(user profile, locale, consent)──▶ testing, training
 catalog  ──(variant + signals metadata)─────▶ testing (render), training (bài học/quiz)
 testing  ──enqueue "send" job──────────────▶ delivery ──SMTP──▶ user inbox
 user ──bấm/mở/submit──▶ tracking ──emit EventRecorded──▶ scoring
 scoring ──weak_signals (một chiều)─────────▶ training (gợi ý lộ trình)
```

- **Downstream/Upstream:** `catalog` là **upstream** cung cấp nội dung cho `testing` và `training`. `scoring` **downstream** của `tracking`.
- **Anti-corruption:** `scoring` chỉ hiểu `EventRecorded` (shared kernel), không biết chi tiết nội bộ `tracking`.
- **Cầu nối một chiều Test→Training:** `scoring` phát `WeaknessUpdated`; `training` tiêu thụ để gợi ý. `training` **không** gọi ngược `testing`.

---

## 5. Hexagonal / Clean Architecture — cấu trúc trong một module

Mỗi module chia 4 tầng, **phụ thuộc hướng vào trong** (Dependency Rule). Domain không biết gì về NestJS/Prisma/HTTP.

```
         ┌───────────────────────────────────────────────┐
         │  Adapters (ngoài cùng) — phụ thuộc framework   │
         │  • HTTP controllers (NestJS)                   │
         │  • Prisma repositories                         │
         │  • BullMQ producers/consumers                  │
         │  • SMTP mailer, LLM client                     │
         │        │ implement                             │
         │        ▼                                       │
         │  ┌──────────────────────────────────────────┐ │
         │  │ Ports (interface)                         │ │
         │  │ • Repository<T>, Mailer, Clock, EventBus  │ │
         │  │        ▲ dùng                             │ │
         │  │  ┌───────────────────────────────────┐    │ │
         │  │  │ Application (use cases)            │    │ │
         │  │  │ • ScheduleCampaign, RecordEvent,  │    │ │
         │  │  │   RecomputeScore, StartQuiz...    │    │ │
         │  │  │     ▲ dùng                        │    │ │
         │  │  │  ┌──────────────────────────┐     │    │ │
         │  │  │  │ Domain (lõi thuần)        │     │    │ │
         │  │  │  │ • Entities, Value Objects │     │    │ │
         │  │  │  │ • Awareness scoring rules │     │    │ │
         │  │  │  │ • Invariants (R2, R7)     │     │    │ │
         │  │  │  └──────────────────────────┘     │    │ │
         │  │  └───────────────────────────────────┘    │ │
         │  └──────────────────────────────────────────┘ │
         └───────────────────────────────────────────────┘
```

**Quy ước thư mục một module (ví dụ `scoring`):**
```
modules/scoring/
├── domain/            # entities, value objects, scoring logic thuần (không import nestjs/prisma)
├── application/       # use cases (services điều phối), định nghĩa PORTS (interface)
├── adapters/
│   ├── http/          # controllers, DTO, mapping sang ngôn ngữ đời thường (R9)
│   ├── persistence/   # Prisma repo implement port
│   └── messaging/     # BullMQ consumer `EventRecorded`, producer `WeaknessUpdated`
└── scoring.module.ts  # wiring: bind port → adapter
```

**Lợi ích:** domain test được bằng unit test thuần (không cần DB); đổi Prisma→khác chỉ sửa adapter; R2/R7 là **invariant trong domain**, không thể lách qua controller.

---

## 6. Biên an toàn PII (R2) — kiến trúc cưỡng chế

PII-safety không để làm "bằng ý thức" — ràng buộc bằng cấu trúc:

- **Tracking endpoints nhận ít nhất có thể:** chỉ `token` (định danh campaign/variant per-user) + loại tương tác. DTO **không có field** cho password/otp/card → dữ liệu nhập từ form giả không có đường map vào.
- **Trang đích form giả:** input không `name`/không submit giá trị, hoặc submit tới endpoint **ghi đè rỗng** — contract test khẳng định body bị bỏ.
- **Không log body** ở tracking (logging middleware loại trừ route tracking khỏi body capture).
- **Token ≠ PII:** opaque, random, hết hạn, thu hồi được; chia sẻ nhầm cũng không lộ user (R5).
- **Inbound report@ handler:** chỉ trích token (từ subject/plus-address) để khớp campaign rồi sinh event `reported`; **không lưu nội dung/headers/địa chỉ** của mail forward. Mail không khớp → drop, không lưu.
- Test kiến trúc: integration test gửi payload có "mật khẩu" → assert **không** xuất hiện trong DB lẫn log.

---

## 7. Kiến trúc async (R8)

```
testing.ScheduleCampaign ──┐
                           ├─▶ BullMQ queue "delivery" ──▶ Worker: Mailer ──SMTP──▶ inbox
scheduler (cron, jitter) ──┘                                   │
                                                               ▼ (bounce/complaint webhook)
                                                          delivery adapter ──▶ cập nhật trạng thái
user tương tác ──▶ tracking ──▶ BullMQ queue "events" ──▶ Worker: Scoring ──▶ user_scores
```

- **Scheduler:** cron quét user opt-in Test, sinh campaign với **thời điểm ngẫu nhiên (jitter)** trong khung giờ cho phép + tần suất user.
- **Idempotency:** mỗi job có khoá (campaignId) → retry không gửi trùng.
- **Bounce/complaint:** webhook từ SMTP → đánh dấu địa chỉ, dừng lịch (tôn trọng R1).
- **Backpressure:** queue tách "delivery" và "events"; lỗi gửi mail không chặn chấm điểm.

---

## 8. Data architecture (Prisma, Postgres)

- **Một schema, phân nhóm bảng theo context** (modular monolith → một DB). Tách DB chỉ khi tách service.
- **i18n nội dung:** bảng dịch riêng cho field hiển thị, vd `variant_translations(variant_id, locale, subject, body)`; default `en`. Catalog là data (R6).
- **Tách cấu hình 2 flow:** `user_training_prefs` và `user_test_optin` (loại/tần suất) tách bạch → bật/tắt độc lập.
- **Append-only `events`:** nguồn cho scoring; `user_scores` là projection (đọc nhanh cho dashboard).
- **Ràng buộc cô lập (R5):** mọi bảng dữ liệu người dùng mang `user_id`, index theo `user_id`; tầng repository luôn scope theo user.

```
identity:  users, email_verifications, consents, user_training_prefs, user_test_optin
catalog:   categories, templates, variants, signals, lessons (+ *_translations)
testing:   campaigns
delivery:  deliveries (trạng thái gửi/bounce)
tracking:  tracking_tokens, events          ← không bao giờ chứa PII
scoring:   user_scores (projection: awareness_score, weak_signals jsonb)
```

---

## 9. Frontend architecture (Next.js)

- **App Router + feature folders**, tách rõ `(guest)` và `(app)` (đã đăng nhập).
- **BFF layer** (route handlers / server actions): gọi API, **dịch thuật ngữ nội bộ sang ngôn ngữ đời thường** (R9) — UI không thấy chữ "token/campaign/signal".
- **i18n** (next-intl): EN mặc định, VI bổ sung; locale từ user prefs (tuỳ chọn) hoặc trình duyệt.
- **Tối giản (R9):** mỗi màn một mục tiêu; quiz là trắc nghiệm ~6 lựa chọn; teach page trực quan; trang "Bạn đã dính!" theme hacker đơn giản, 1 nút.
- **Guest vs User:** guest render tập bài phổ biến (không cần auth); full cần đăng nhập (login-wall, không paywall).

---

## 10. Cross-cutting concerns

| Mối quan tâm | Cách làm |
|---|---|
| **AuthN/AuthZ** | Access token JWT ngắn hạn (15') ở cookie + **refresh token lưu DB** (model `Session`, rotating, revoke được) ở identity; guest không session; tracking no-auth nhưng token-scoped |
| **i18n** | FE next-intl; nội dung đa ngôn ngữ ở DB (catalog) |
| **Validation** | DTO + class-validator ở biên adapter; domain tự giữ invariant |
| **Error handling** | Result/Either trong domain; exception filter map ra HTTP + message thân thiện (R9) |
| **Observability** | Structured logging (loại trừ body tracking), request id, metric queue depth |
| **Config/secrets** | `.env` + schema validation lúc boot; SMTP/LLM key không vào repo |
| **Testing** | Unit (domain), integration (adapter+DB), contract (R2 PII-safety), E2E Playwright + Mailpit |

---

## 11. Deployment (dev)

```
docker-compose:
  web      (Next.js)        :3000
  api      (NestJS http)    :4000
  worker   (NestJS worker)  — no port, cùng image api, entrypoint khác
  postgres                  :5432
  redis                     :6379
  mailpit  (SMTP+UI)        :1025 / :8025
```

Prod: tách image `api`/`worker`/`web`, SMTP thật cấu hình SPF/DKIM/DMARC (R3), scale worker độc lập.

---

## 12. Vì sao KHÔNG microservices (ghi nhận để sau này)

- Quy mô hiện tại (solo/demo) → chi phí ops & distributed tx không đáng.
- Modular monolith + hexagonal đã cho ranh giới sạch: khi `testing`/`scoring` cần scale riêng, **tách thành service là việc bóc module**, không viết lại domain.
- Ứng viên tách đầu tiên nếu cần: `delivery` + `worker` (đã async sẵn qua queue).

---

## 13. Ánh xạ sang Phase Plan

| Context/Container | Xuất hiện ở Phase |
|---|---|
| Monorepo, docker-compose, shared-kernel | Phase 0 |
| catalog + data schema + i18n | Phase 1 |
| identity (auth, consent, 2-flow config) | Phase 2 |
| training (lý thuyết + quiz) | Phase 3 |
| testing + delivery + tracking + worker/scheduler | Phase 4 |
| scoring + cầu nối Test→Training | Phase 5 |
| training path + test nhắm điểm yếu | Phase 6 |
| dashboard (đọc projection user_scores) | Phase 7 |
| Nhóm 3 content (trong catalog/training) | Phase 8 |
| LLM roleplay (module + LLM adapter) | Phase 9 |
