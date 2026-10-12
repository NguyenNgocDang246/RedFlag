# Deploy lên Vercel

Một repo, hai project Vercel: `redflag-api` (thư mục `apps/api`) và `redflag-web` (thư mục `apps/web`). Database dùng Neon, Redis dùng Upstash (không bắt buộc), mail gửi qua Resend.

## Cách hệ thống chạy trên Vercel

- **API** chạy thành một function duy nhất: `apps/api/api/index.js` → `dist/serverless.js`. File `apps/api/vercel.json` chuyển mọi đường dẫn vào function đó.
- **Web** chuyển tiếp `/api/*` sang API (`API_PROXY_URL`, xem `apps/web/next.config.mjs`). Trình duyệt chỉ làm việc với domain của web, nên cookie đăng nhập nằm trên domain web, là nơi middleware đọc nó.
- **Email test**: Vercel Hobby chỉ cho cron chạy 1 lần/ngày. Lúc 00:00 UTC (7h sáng giờ VN), cron gọi `/api/cron/daily`. Lệnh này lên lịch cho người đến lượt, rồi giao cho Resend mọi email sẽ đến hạn trong 25 giờ tới, kèm `scheduled_at`, để Resend gửi đúng giờ. Khi người dùng tạm dừng, đổi tần suất hoặc hủy đăng ký, email đã giao sẽ được gọi lại qua API cancel của Resend.
- `worker.ts` vẫn giữ để chạy local với Mailpit.

## 1. Chuẩn bị dịch vụ

1. **Neon** (neon.tech): tạo project, nên chọn region Singapore. Lấy hai chuỗi kết nối:
   - *Pooled* (host có `-pooler`): thêm `&pgbouncer=true&connection_limit=1`. Đây là `DATABASE_URL` cho Vercel.
   - *Direct* (host không có `-pooler`): chỉ dùng để chạy migrate từ máy mình.
2. Chạy migrate và seed vào Neon từ máy local (PowerShell):
   ```powershell
   $env:DATABASE_URL = "<direct URL>"
   pnpm --filter @redflag/api exec prisma migrate deploy
   pnpm --filter @redflag/api db:seed
   Remove-Item Env:DATABASE_URL
   ```
3. **Upstash Redis** (không bắt buộc): tạo database, lấy URL dạng `rediss://...`. Nếu không có, rate limit chỉ đếm trong RAM của từng instance, nên lỏng hơn.
4. **Resend**: verify domain gửi (SPF, DKIM, DMARC) và tạo API key.
5. Tạo hai chuỗi ngẫu nhiên cho `SESSION_SECRET` và `CRON_SECRET`:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```
6. Push code lên GitHub.

## 2. Project `redflag-api`

Vercel → Add New → Project → chọn repo.

- **Root Directory**: `apps/api`
- **Framework Preset**: Other. Build/Install/Output đã có trong `apps/api/vercel.json`, không cần sửa.
- Bật **Include files outside the root directory** (để đọc được `packages/shared`).

Environment Variables (`<web>` là domain của project web, ví dụ `redflag-web.vercel.app`; nếu chưa có thì điền tạm rồi sửa sau):

| Biến | Giá trị |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | pooled URL của Neon |
| `REDIS_URL` | URL Upstash (nếu có) |
| `SESSION_SECRET` | chuỗi ngẫu nhiên |
| `CRON_SECRET` | chuỗi ngẫu nhiên |
| `MAIL_TRANSPORT` | `resend` |
| `RESEND_API_KEY` | `re_...` |
| `MAIL_FROM` | `RedFlag <no-reply@domain-đã-verify>` |
| `ADMIN_EMAILS` | email admin |
| `SEND_WINDOW_START`, `SEND_WINDOW_END` | khung giờ được phép gửi mail test, tính theo giờ của người nhận (mặc định 8 và 20, không bắt buộc) |
| `REPORT_EMAIL`, `RESEND_WEBHOOK_SECRET` | nếu dùng tính năng chuyển tiếp mail để báo cáo |
| `WEB_PUBLIC_URL` | `https://<web>` |
| `API_PUBLIC_URL` | `https://<web>` (người dùng gọi API qua domain web) |
| `TRACKING_PUBLIC_URL` | domain tracking riêng, hoặc `https://<api>` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | nếu bật đăng nhập Google |
| `GOOGLE_REDIRECT_URI` | `https://<web>/api/auth/google/callback` |

Deploy, rồi kiểm tra `https://<api>/api/health` có trả `{"status":"ok",...}` không.

## 3. Project `redflag-web`

Add New → Project → cùng repo.

- **Root Directory**: `apps/web`
- **Framework Preset**: Next.js. Build/Install đã có trong `apps/web/vercel.json`.
- Bật **Include files outside the root directory**.

| Biến | Giá trị |
|---|---|
| `API_PROXY_URL` | `https://<api>` |
| `API_PUBLIC_URL` | `https://<api>` (để server của web gọi thẳng API khi render) |
| `NEXT_PUBLIC_API_URL` | `https://<web>` |

`NEXT_PUBLIC_API_URL` được gắn vào code lúc build, nên mỗi lần đổi biến này phải Redeploy web.

Deploy xong, nếu domain web khác với giá trị đã điền tạm ở bước 2 thì sửa env của API rồi **Redeploy** API.

## 4. Sau khi deploy

- Google Cloud Console → OAuth client → thêm Authorized redirect URI: `https://<web>/api/auth/google/callback`.
- Resend inbound (nếu dùng): webhook trỏ về `https://<web>/api/inbound/resend`.
- Vercel → `redflag-api` → Settings → Cron Jobs: phải thấy `/api/cron/daily`.

## 5. Kiểm tra

1. `https://<web>/api/health` trả ok.
2. Đăng ký, xác minh email, đăng nhập. F5 vẫn còn đăng nhập. Sau hơn 5 phút vẫn còn (refresh token chạy được).
3. Gọi cron bằng tay:
   ```powershell
   curl.exe -H "Authorization: Bearer <CRON_SECRET>" https://<api>/api/cron/daily
   ```
   Kết quả có dạng `{"planned":n,"handedOff":m}`. Trên dashboard Resend, email đã giao hiện trạng thái *Scheduled*.
4. Vào trang cá nhân bấm tạm dừng test: email đó trên Resend chuyển sang *Canceled*.
5. Admin → gửi thử một email test: mail tới ngay, bấm link trong mail mở được trang `/caught`.

## Giới hạn cần biết

- Cron trên Hobby có thể chạy trễ tối đa khoảng 1 giờ. Khoảng 25 giờ đã tính dư cho việc này.
- Một lần chạy cron dài tối đa 300 giây. Resend cho khoảng 2 request/giây, nên mỗi lần giao được chừng 400 email; phần còn lại để lần sau.
- Mail đã giao cho Resend thì không kiểm tra lại consent lúc gửi. Thay vào đó, mọi thao tác tạm dừng, đổi tần suất hay hủy đăng ký đều gọi Resend để hủy mail.
