# PhishGym — Core Rules & Phase Plan

## Context
PhishGym là sân tập **tự nguyện** giúp cá nhân rèn phản xạ nhận biết lừa đảo online (mô hình kiểu Duolingo cho an toàn mạng). Người dùng tự đăng ký và đồng ý nhận bài test mô phỏng; hệ thống chỉ đo hành vi để dạy lại. Đây là sản phẩm giáo dục/phòng thủ, khác hẳn công cụ tấn công.

**Phạm vi global, không giới hạn một quốc gia.** Nội dung (brand mạo danh, ngôn ngữ, chiêu lừa) là **data đa vùng/đa ngôn ngữ** (R6), có thể bật/tắt theo locale hoặc theo lựa chọn của user; không hard-code brand/bối cảnh của riêng vùng nào vào engine. Bối cảnh một vùng cụ thể (vd VN, US, EU...) chỉ là một tập dữ liệu seed.

Tài liệu thiết kế đã có (định vị, phân loại test, schema 3 tầng, luồng guest/user, tech stack). Nhiệm vụ của plan này: chốt **core rules** bất biến và **lộ trình các phase** để triển khai từ repo trống (`d:\MyProject\PhishGym` hiện chưa có code).

## Mô hình 2 flow độc lập (Training ⟂ Test)
Sản phẩm gồm **2 flow tách biệt**, user bật/chọn từng cái độc lập:

- **Training flow (chủ động học):** bài học + quiz mô phỏng on-site. User tự chọn học chủ đề/kỹ năng nào, lúc nào. Không bất ngờ, không gửi mail thật. Đây là nơi người dùng "luyện".
- **Test flow (bị test bất ngờ):** mô phỏng gửi qua kênh thật (email) vào thời điểm ngẫu nhiên để **đo phản xạ thật**. User opt-in riêng cho việc bị test, chọn loại + tần suất.

Hai flow **không phụ thuộc nhau về vận hành**: có thể chỉ học mà không bị test, hoặc ngược lại. **Cầu nối một chiều:** dữ liệu từ Test flow (dính signal nào, yếu ở đâu) → **gợi ý** bài Training nên làm tiếp. Training không tự sinh ra Test; Test chỉ feed khuyến nghị cho Training.

---

## Core Rules (bất biến — mọi phase phải tuân)

### R1. Chỉ gửi cho người đã đồng ý
- Chỉ gửi bài test tới user đã tự đăng ký và bật đồng ý (opt-in). Có cơ chế tắt/tạm dừng (pause) và huỷ (unsubscribe) bất cứ lúc nào.
- Không gửi cho địa chỉ chưa xác thực (double opt-in email verification).

### R2. Test không bao giờ đụng PII (signal-only)
- Bài test **không thu thập, không nhận, không lưu, không log** bất kỳ dữ liệu cá nhân nào (mật khẩu/OTP/số thẻ/giấy tờ tuỳ thân...). **Kể cả việc dụ user nhập cũng tránh** — mục tiêu là đo phản xạ, không phải bẫy nhập liệu.
- "Dính" chỉ là **tín hiệu/sự kiện**: có bấm link không, có tới bước submit không, variant nào, signal nào bị bỏ lỡ. Nếu trang đích có field hình thức, giá trị **không gửi về server** (hoặc server loại bỏ ngay, không đọc, không ghi).
- Chạm vào bước "dính" → redirect ngay sang trang dạy, chỉ rõ signal đã bỏ lỡ.
- **(Deferred — chờ quyết định của user)** "Full simulation" cho user thực sự tương tác form giả: *mặc định KHÔNG làm*. Nếu sau này cân nhắc cần, phải opt-in rõ ràng + cam kết dùng-rồi-huỷ-trong-request, không persist/không log. **Không thuộc v1.**

### R3. Minh bạch & an toàn kênh thật
- Mọi email mô phỏng gắn dấu hiệu nhận diện nội bộ (header/footer "đây là bài tập PhishGym") đủ để không bị nhầm là mail thật khi cần đối soát, nhưng không phá trải nghiệm luyện tập.
- Domain gửi mail là domain riêng của PhishGym, cấu hình SPF/DKIM/DMARC đầy đủ; không spoof domain của tổ chức có thật.

### R4. Ranh giới kênh & nội dung
- **Không** gửi SMS/gọi điện mạo danh; **không** tạo deepfake người thật (rủi ro pháp lý/đạo đức ở nhiều vùng tài phán). Các loại này chỉ dạy quy trình + quiz (Nhóm 3).
- Không mô phỏng theo cách có thể dùng lại để tấn công người ngoài hệ thống: nội dung lure chỉ render trong phạm vi bài test của chính user, gắn token cá nhân, hết hạn.
- Kênh/loại test được phép có thể khác nhau theo vùng tài phán; quy tắc này là ngưỡng tối thiểu, cấu hình thêm giới hạn theo locale ở tầng data khi cần.

### R5. Cô lập dữ liệu người dùng
- Dữ liệu mỗi user tách riêng; token tracking là per-user, per-campaign, có hạn dùng và thu hồi được.
- Tracking (mở/bấm) không yêu cầu đăng nhập nhưng token không đoán được và không tiết lộ PII khi bị chia sẻ nhầm.

### R6. Dữ liệu mở rộng bằng data, không sửa code
- Thêm kiểu lừa mới = thêm Category/Template/Variant/Signal trong DB, **không** đổi code engine.
- Mỗi Variant mang metadata: category, template gốc, danh sách signal, độ khó.

### R7. Chấm điểm theo signal, không chỉ đúng/sai
- Hệ thống phải biết user yếu ở **loại dấu hiệu** nào, không chỉ pass/fail từng bài.
- Awareness score cập nhật theo thời gian, hiển thị xu hướng; lộ trình kế tiếp ưu tiên signal yếu.

### R8. Fail-safe cho job nền
- Gửi mail qua queue, idempotent, xử lý bounce/complaint; job lỗi không được gửi trùng hoặc gửi sai người.
- Scheduler gửi "ngẫu nhiên thời điểm" nhưng trong khung giờ cho phép và tôn trọng tần suất user chọn.

### R9. Đơn giản tối đa cho người dùng phổ thông (nguyên tắc UX bao trùm)
- **Tệp user mục tiêu là người bình thường, không rành công nghệ** (gồm người lớn tuổi). Mọi flow/UI/UX phải đơn giản hết mức.
- Không dùng thuật ngữ kỹ thuật trần trụi ("token", "campaign", "signal", "DKIM"...) trên giao diện người dùng — diễn đạt bằng ngôn ngữ đời thường. Thuật ngữ nội bộ chỉ nằm trong code/schema.
- Mỗi màn hình một mục tiêu rõ ràng, tối thiểu lựa chọn, ít bước; default thông minh để user "bỏ qua" được phần phức tạp (khớp việc thông tin cá nhân/locale là tuỳ chọn).
- Giải thích sau mỗi bài luôn ngắn, trực quan, dễ hiểu; ưu tiên hình ảnh/ví dụ hơn chữ dày.
- Mọi thiết kế màn hình trong các Phase phải qua "bộ lọc R9": nếu một người không rành công nghệ không hiểu ngay, phải làm đơn giản hơn.

---

## Phase Plan

### Phase 0 — Khởi tạo & nền tảng
- Monorepo: `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared` (types/enums dùng chung FE-BE).
- Hạ tầng dev: PostgreSQL + Redis qua `docker-compose`; biến môi trường `.env.example`.
- Lint/format/test skeleton, CI chạy test + typecheck.
- **DoD:** `docker compose up` chạy được DB/Redis; web & api khởi động, health-check OK.

### Phase 1 — Mô hình dữ liệu & seed nội dung
- Migrations cho: `users, categories, templates, variants, signals, campaigns, events, lessons, user_scores` (theo schema trong tài liệu, mục 6).
- Seed tối thiểu: tập `signals` (mục 5), vài `categories` (mục 4), 1–2 template + vài variant mỗi loại để chạy thử.
- Repository/DAL + ràng buộc R5/R6 ở tầng schema (FK, index theo user_id).
- **i18n nội dung:** các field hiển thị của `templates/variants/signals/lessons` lưu đa ngôn ngữ (EN/VI) ngay từ schema, mặc định EN.
- **Tách 2 flow ở schema:** cấu hình Training và cờ opt-in Test (loại/tần suất) lưu tách bạch trên user (hoặc bảng consent riêng), để bật/tắt độc lập.
- **DoD:** seed chạy được; query lấy variant kèm signal hoạt động; lấy được nội dung theo locale.

### Phase 2 — Auth, đăng ký & onboarding
- Đăng ký + double opt-in email verification (R1); đăng nhập; quản lý consent/pause/unsubscribe.
- Onboarding: **(tuỳ chọn)** khai tên/nghề/dịch vụ hay dùng và chọn locale/vùng nội dung — bỏ qua được, mặc định EN; nếu khai thì dùng để cá nhân hoá spear-phishing mô phỏng. Hai lựa chọn chính, **độc lập**: (a) chủ đề **Training** quan tâm; (b) có **opt-in Test flow** hay không — nếu có thì chọn loại lừa + tần suất. User có thể chỉ chọn Training, hoặc chỉ Test, hoặc cả hai.
- Phân quyền Guest vs User (mục 8).
- **DoD:** user đăng ký → xác thực email → hoàn tất onboarding (có thể bỏ qua thông tin cá nhân/locale) → có bản ghi consent + cấu hình training + (nếu opt-in) cấu hình test flow (loại/tần suất).

### Phase 3 — TRAINING FLOW: lý thuyết + quiz on-site (gồm Guest)
Training gồm **2 phần**:
- **(a) Bài học lý thuyết:** nội dung dạy theo signal/category (dấu hiệu nhận biết, cách xử lý). Render on-site, user tự chọn chủ đề học.
- **(b) Quiz mô phỏng (Nhóm 2):** nhận diện URL thật/giả, email mẫu, popup giả, OAuth consent giả — không gửi mail. Luồng: xem tình huống → chọn an toàn/lừa đảo → nếu cho là lừa, hỏi "dấu hiệu nào khiến bạn nghi?" dưới dạng **trắc nghiệm nhiều lựa chọn (~6 đáp án lấy từ bộ signal, có thể chọn nhiều)** thay vì nhập text → hiện giải thích per-signal. Trắc nghiệm giúp chấm theo signal chuẩn và không cần parse text tự do.

**Mô hình truy cập — tất cả miễn phí, chặn bằng đăng nhập chứ không bằng tiền:**
- **Guest:** chỉ mở **một ít bài phổ biến** (cả lý thuyết lẫn quiz) để trải nghiệm.
- **User (đăng nhập, miễn phí):** mở **toàn bộ** thư viện lý thuyết + quiz, không có tính phí.
- Màn kết (guest): điểm tạm + CTA đăng nhập để mở full.
- **DoD:** guest xem được tập bài phổ biến; user đăng nhập mở toàn bộ lý thuyết + quiz; đều thấy giải thích per-signal; không có paywall.

### Phase 4 — TEST FLOW: campaign engine + email thật (lõi kỹ thuật)
- Scheduler: lên lịch gửi ngẫu nhiên thời điểm trong khung giờ, theo tần suất user (R8).
- Queue gửi mail (Redis + worker), render variant per-user, gắn **tracking token** per-user/per-campaign (R2/R5).
- Chỉ chạy cho user đã opt-in Test flow (R1). Tracking endpoints: open (pixel), click (redirect qua token), submit (trang đích chỉ phát tín hiệu "dính" — R2, signal-only, không nhận PII).
- **Trang "Bạn đã dính!" (interstitial, theme hacker):** sau khi "dính", hiện trang cảnh báo kịch tính báo user vừa mắc bẫy, rồi mới có **nút chuyển sang trang dạy** (teach page chỉ rõ signal bỏ lỡ). Report-correct feedback cũng dùng trắc nghiệm signal như Phase 3.
- Xử lý bounce/complaint, idempotency, retry.
- **DoD:** gửi được 1 campaign test tới hộp thư thật của user đã opt-in; mở/bấm/submit sinh `events` đúng; khẳng định server không nhận/không ghi bất kỳ dữ liệu nhập nào (R2).

### Phase 5 — Chấm điểm & phân tích điểm yếu (cầu nối Test → Training)
- Từ `events` + metadata signal của variant → cập nhật `user_scores` (awareness score + `weak_signals`).
- Quy tắc tính điểm theo loại tương tác (report đúng, bấm link, submit, bỏ qua) — chấm theo signal (R7).
- Luồng "report đúng → hỏi dấu hiệu nào khiến bạn nghi" (trắc nghiệm signal) để xác nhận nhận biết thật.
- **Gợi ý Training một chiều:** từ `weak_signals` → đề xuất bài Training tương ứng (không tự ép, user vẫn chủ động chọn học).
- **DoD:** sau vài campaign, score & danh sách signal yếu thay đổi hợp lý; có danh sách Training gợi ý theo điểm yếu.

### Phase 6 — Lộ trình Training theo điểm yếu + gửi test nhắm điểm yếu
- Training: dùng lại thư viện lý thuyết + quiz (Phase 3), sắp thành **lộ trình** ưu tiên signal yếu; user chủ động theo lộ trình gợi ý.
- Test (nếu user còn opt-in): scheduler ưu tiên variant nhấn vào signal yếu để kiểm chứng tiến bộ.
- Hai nhánh vẫn độc lập, nối nhau qua `weak_signals` (Phase 5), không ràng buộc cứng.
- **DoD:** user yếu signal X thấy Training gợi ý về X; nếu opt-in test thì nhận variant nhắm X.

### Phase 7 — Dashboard tiến bộ
- Xu hướng awareness score theo thời gian; mạnh/yếu theo loại signal & category; lịch sử campaign.
- **DoD:** dashboard hiển thị đúng dữ liệu từ `user_scores`/`events`.

### Phase 8 — Nhóm 3 (dạy quy trình, không test)
- Nội dung quiz + quy trình cho: deepfake, vishing, smishing, BEC cá nhân, evil-twin/tailgating (mục 3, Nhóm 3) — thuần on-site, tuân R4.
- **DoD:** các module này có quiz + checklist quy trình, không phát sinh gửi kênh thật.

### Phase 9 (tuỳ chọn) — Roleplay LLM
- LLM đóng vai kẻ lừa cho pretexting/romance/investment; chấm theo việc user có lộ thông tin không (không lưu nội dung nhạy cảm — R2).
- Guardrail: chỉ roleplay trong phạm vi bài tập, có cảnh báo, dừng được.
- **DoD:** phiên roleplay chạy, chấm được tín hiệu lộ thông tin, có guardrail.

---

## Thứ tự ưu tiên đề xuất
Phase 0 → 1 → 2 → 3 (có demo sớm cho guest) → 4 → 5 → 6 → 7, rồi 8/9 sau.
Lý do: Phase 3 cho sản phẩm demo được mà chưa đụng email thật (rủi ro thấp); Phase 4 là lõi kỹ thuật khó nhất, làm sau khi dữ liệu + auth đã vững.

## Critical files (sẽ tạo khi implement)
- `docker-compose.yml`, `.env.example` (Phase 0)
- `apps/api` migrations + entities theo schema mục 6 (Phase 1)
- `packages/shared` enums: `SignalCode`, `CategoryCode`, `EventType` (dùng chung, phục vụ R6/R7)
- `apps/api` modules: `auth`, `campaigns`, `scheduler`, `tracking`, `scoring`, `lessons`
- `apps/web` routes: landing/guest-quiz, onboarding, dashboard, **trang "Bạn đã dính!" (theme hacker)** → teach page (đích cuối của tracking)

## Verification (khi đã code)
- Unit test scoring: given events + signals → score/weak_signals kỳ vọng.
- Integration test tracking: mô phỏng open/click/submit bằng token → đúng `events`. Test R2: khẳng định server **không nhận và không ghi** bất kỳ dữ liệu nhập nào (signal-only).
- E2E (Playwright): luồng guest quiz; luồng user onboarding; nhận mail test trên inbox dev (Mailpit/Mailhog) → bấm → landing teach page.
- Kiểm consent: user pause/unsubscribe → scheduler không còn xếp lịch (test R1/R8).

## Quyết định đã chốt
1. **Phạm vi v1 = tới Phase 5** (data → auth → guest quiz → email thật → chấm điểm theo signal). Phase 6–9 làm sau.
2. **ORM = Prisma.** Schema đặt tại `apps/api/prisma/schema.prisma`; migrations qua `prisma migrate`; type sinh ra dùng chung quan điểm với enums trong `packages/shared`.
3. **Dev email = Mailpit** trong `docker-compose` (SMTP giả + UI xem mail), không gửi ra ngoài khi dev. SMTP thật/SPF-DKIM-DMARC để dành khi lên staging/prod.
4. **Đa ngôn ngữ EN + VI ngay từ đầu:** FE dùng i18n (next-intl hoặc tương đương), **mặc định EN** (phạm vi global), VI là locale bổ sung. Nội dung Category/Template/Variant/Signal/Lesson lưu đa ngôn ngữ ở tầng dữ liệu (cột/bảng dịch), vì nội dung là data (R6) — cần tính đến ngay trong schema Phase 1.
