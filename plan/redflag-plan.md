# RedFlag — Core Rules & Phase Plan

## Context
RedFlag là sân tập **tự nguyện** giúp cá nhân rèn phản xạ nhận biết lừa đảo online (mô hình kiểu Duolingo cho an toàn mạng). Người dùng tự đăng ký và đồng ý nhận bài test mô phỏng; hệ thống chỉ đo hành vi để dạy lại. Đây là sản phẩm giáo dục/phòng thủ, khác hẳn công cụ tấn công.

**Phạm vi global, không giới hạn một quốc gia.** Nội dung (brand mạo danh, ngôn ngữ, chiêu lừa) là **data đa vùng/đa ngôn ngữ** (R6), có thể bật/tắt theo locale hoặc theo lựa chọn của user; không hard-code brand/bối cảnh của riêng vùng nào vào engine. Bối cảnh một vùng cụ thể (vd VN, US, EU...) chỉ là một tập dữ liệu seed.

Tài liệu thiết kế đã có (định vị, phân loại test, schema 3 tầng, luồng guest/user, tech stack). Nhiệm vụ của plan này: chốt **core rules** bất biến và **lộ trình các phase** để triển khai từ repo trống (`d:\MyProject\RedFlag` hiện chưa có code).

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
- Mọi email mô phỏng gắn dấu hiệu nhận diện nội bộ (header/footer "đây là bài tập RedFlag") đủ để không bị nhầm là mail thật khi cần đối soát, nhưng không phá trải nghiệm luyện tập.
- Domain gửi mail là domain riêng của RedFlag, cấu hình SPF/DKIM/DMARC đầy đủ; không spoof domain của tổ chức có thật.

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

### R10. "Vaccine", KHÔNG phải giáo trình (kim chỉ nam sản phẩm)
- **Ẩn dụ gốc:** RedFlag giống **tiêm vaccine** cho user — cho tiếp xúc có kiểm soát với "mầm bệnh" (tình huống lừa đảo mô phỏng thật) trong môi trường an toàn, để cơ thể (phản xạ) tự sinh "kháng thể". Đây là **inoculation** bằng trải nghiệm, không phải khoá học.
- **Khác học viện lý thuyết (vd ncademy):** giá trị cốt lõi nằm ở **mô phỏng tình huống nguy hiểm/lừa đảo sát thực tế** và đo phản xạ, KHÔNG phải ở việc giảng giải kiến thức. Học viện dạy "biết"; RedFlag rèn "phản xạ làm đúng khi bị tấn công".
- **Thứ tự ưu tiên khi thiết kế mọi tính năng:** (1) tình huống mô phỏng chân thực trước → (2) đo hành vi/phản xạ → (3) lý thuyết chỉ là phần **hỗ trợ giải thích sau khi dính/giải tình huống**, không được phình thành trung tâm. Lesson phục vụ simulation, không phải ngược lại.
- **Bộ lọc R10 cho mọi Phase/tính năng:** hỏi *"cái này có đưa user vào trải nghiệm tình huống thật và rèn phản xạ không, hay chỉ đang biến site thành thư viện bài giảng?"* Nếu là vế sau → thiết kế lại cho giống "sân tập / phòng mô phỏng" hơn.
- **Hệ quả cụ thể:** ưu tiên độ chân thực của kịch bản (Category/Template/Variant sát chiêu thật), bất ngờ đúng lúc (Test flow), phản hồi tức thì gắn với hành động vừa làm; cảnh giác việc sa đà vào nội dung đọc dài, chứng chỉ, điểm số mang tính học thuật.

### R11. Trộn tình huống thật & giả; chấm cả việc nhận ra "an toàn"
- **Bài luyện phải trộn cả tình huống an toàn (thật/hợp lệ) lẫn lừa đảo**, không chỉ toàn bẫy. Nếu 100% là lừa đảo, user học mẹo "cứ nghi hết là đúng" — phản tác dụng.
- **Mục tiêu là phán đoán được hiệu chỉnh (calibrated judgment), không phải hoang tưởng (paranoia).** Giá trị thật là phân biệt đúng, không phải nghi ngờ mọi thứ.
- **Chấm điểm 2 chiều (gắn R7):**
  - Nhận ra lừa đảo đúng = tốt; **nhận ra an toàn đúng (true negative) cũng được tính điểm**.
  - **Báo động giả (false positive — gán "lừa đảo" cho tình huống an toàn) phải bị trừ/ghi nhận là điểm yếu**, giống như bỏ sót bẫy.
  - Với tình huống an toàn, chọn signal "đáng ngờ" = chọn nhầm (wrong) → phản hồi giải thích vì sao nó thực ra an toàn.
- **Hệ quả cho các Phase:**
  - Phase 3 (quiz) & Phase 4 (email test): mỗi bộ bài phải có tỉ lệ hợp lý tình huống an toàn xen kẽ; seed nội dung phải gồm cả mẫu hợp lệ.
  - Phase 5 (scoring): awareness score phản ánh cả độ nhạy (bắt bẫy) lẫn độ đặc hiệu (không báo động giả); `weak_signals`/phân tích điểm yếu tính cả xu hướng false positive.

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
- **Khi bật Test flow, bắt buộc hiện cảnh báo về cách report (xem Phase 4):** nói rõ *đừng dùng nút "Báo cáo lừa đảo" gốc của mail client/nhà cung cấp mail để report bài tập* (chưa có add-on nhận diện; report thật sẽ đi tới nhà cung cấp mail chứ không về RedFlag, và có thể gây rối cho chính hộp thư của user). Hướng dẫn user report bài tập **chỉ qua 2 cách RedFlag hỗ trợ**: forward tới `report@<domain>` hoặc nút trên site.
- **Xác nhận bằng cách gõ lại câu (type-to-confirm), KHÔNG chỉ tick:** trước khi bật Test, user phải **tự gõ chính xác một câu xác nhận** (vd *"Tôi đã đọc và hiểu"* / *"I have read and understood"*). Nút bật Test chỉ mở khi gõ khớp. Lý do: chủ động đọc hiểu thay vì tick cho qua — đúng tinh thần sản phẩm.
  - **Đa ngôn ngữ:** câu xác nhận kỳ vọng lấy theo locale của user (EN/VI...), là **chuỗi i18n** (R6/i18n); so khớp nên chuẩn hoá (trim, bỏ phân biệt hoa thường, gộp khoảng trắng) để công bằng cho người dùng phổ thông (R9).
  - Lưu bản ghi consent kèm **phiên bản text cảnh báo + locale + thời điểm** đã xác nhận.
- Phân quyền Guest vs User (mục 8).
- **DoD:** user đăng ký → xác thực email → hoàn tất onboarding (có thể bỏ qua thông tin cá nhân/locale) → có bản ghi consent + cấu hình training + (nếu opt-in) cấu hình test flow (loại/tần suất).

### Phase 3 — TRAINING FLOW: lý thuyết + quiz on-site (gồm Guest)
Training gồm **2 phần**:
- **(a) Bài học lý thuyết:** nội dung dạy theo signal/category (dấu hiệu nhận biết, cách xử lý). Render on-site, user tự chọn chủ đề học.
  - *(Cập nhật 2026-10-08)* **Đã gỡ** (bảng `Lesson`, API, trang admin) vì chưa có chỗ hiện cho người học. Làm lại sau theo hướng R10: hiện bài học ngắn **ngay sau khi chấm**, gắn với dấu hiệu bị bỏ sót/chọn nhầm — không làm trang thư viện bài giảng.
- **(b) Quiz mô phỏng (Nhóm 2):** nhận diện URL thật/giả, email mẫu, popup giả, OAuth consent giả — không gửi mail. **Bộ bài trộn cả tình huống an toàn lẫn lừa đảo (R11).** Luồng: xem tình huống → chọn an toàn/lừa đảo → nếu cho là lừa, hỏi "dấu hiệu nào khiến bạn nghi?" dưới dạng **trắc nghiệm nhiều lựa chọn (~6 đáp án lấy từ bộ signal, có thể chọn nhiều)** thay vì nhập text → hiện giải thích per-signal. Chọn "an toàn" đúng cũng được ghi nhận; báo động giả (gán "lừa" cho bài an toàn) bị tính là chọn nhầm và được giải thích.

**Mô hình truy cập — tất cả miễn phí, chặn bằng đăng nhập chứ không bằng tiền:**
- **Guest:** chỉ mở **một ít bài phổ biến** (cả lý thuyết lẫn quiz) để trải nghiệm.
- **User (đăng nhập, miễn phí):** mở **toàn bộ** thư viện lý thuyết + quiz, không có tính phí.
- Màn kết (guest): điểm tạm + CTA đăng nhập để mở full.
- **DoD:** guest xem được tập bài phổ biến; user đăng nhập mở toàn bộ lý thuyết + quiz; đều thấy giải thích per-signal; không có paywall.

**Đã làm (cập nhật 2026-10-07):**
- Mọi bài đều là **vỏ mô phỏng giống app thật** (Gmail, Chrome, iOS SMS, WhatsApp, OAuth, Word, camera QR — logo trung tính); `scenarioData` bắt buộc, không còn bài text trơn.
- Chọn dấu hiệu bằng **hotspot "soi tại chỗ"** thay cho trắc nghiệm: số hotspot mồi ≈ số hotspot đúng (lệch tối đa 1; bài an toàn ≥ 2 mồi), mọi chữ trong vỏ chọn được và phản hồi y hệt nhau — chỉ sau khi chấm mới biết đúng/sai. Seed tự kiểm tra luật này.
- `/practice` = trang chọn bài (theo kênh / chủ đề / dấu hiệu, kèm số bài; "Luyện ngẫu nhiên" 10 bài). `/train` = nơi luyện, luyện gì do query quyết định (`?category=&kind=&signal=&seed=&limit=`); từng bài một, `<` / `>`, có thể quay lại, chấm & giải thích ngay sau mỗi bài.
- Phần (a) lý thuyết: mới có API + 2 bài mẫu, **chưa có giao diện** — dự kiến gắn vào kết quả ("Tìm hiểu thêm" theo dấu hiệu) thay vì làm thư viện riêng (R10).

### Phase 3A — CONTEST: thi có chấm điểm (on-site, không gửi mail)
Cùng bộ vỏ mô phỏng + hotspot như Training, nhưng là **bài thi**: đo phản xạ thật, không cho "thử lại cho đúng". Training để học (có gợi ý, quay lại được); Contest để kiểm chứng.

- **Đề random do server quyết định:** server bốc N bài (vd 10) từ kho, **trộn tỉ lệ an toàn/lừa đảo hợp lý (R11)**, xáo thứ tự; user không chọn chủ đề/bài. Có thể có chế độ theo chủ đề sau.
- **Phiên thi phía server (server-authoritative):** tạo `ContestSession` (user, danh sách bài, thời điểm bắt đầu, trạng thái); mỗi câu trả lời ghi ngay về server và **khoá, không sửa được**. Client không bao giờ nhận đáp án.
- **Chỉ đi tới, không quay lại:** không có nút `<`. **Quay lại = đánh rớt:** bấm back trình duyệt, tải lại trang, mở lại link phiên cũ hay rời trang giữa chừng → bài đang làm bị tính **rớt (0 điểm)** và phiên chuyển sang bài kế; bài đã trả lời giữ nguyên kết quả. *(Cần chốt: rớt riêng bài đang làm, hay huỷ cả lượt thi.)*
- **Không phản hồi trong lúc thi:** không hiện đúng/sai hay giải thích sau từng bài (tránh học mẹo giữa chừng); toàn bộ kết quả + giải thích per-signal hiện ở **màn tổng kết**.
- **Chấm điểm theo signal (R7, R11):** điểm phân loại an toàn/lừa đảo + điểm dấu hiệu (nhận ra đúng +, bỏ sót 0, chọn mồi −); báo động giả trên bài an toàn bị trừ như bỏ sót bẫy. Tuỳ chọn: giới hạn thời gian mỗi bài / thưởng tốc độ.
- **Kết quả & lịch sử:** tổng điểm, điểm theo dấu hiệu/chủ đề, xem lại từng bài kèm giải thích; lưu lịch sử các lượt thi (cần đăng nhập). Dữ liệu này là đầu vào cho Phase 5 (`weak_signals`).
- Tuân R2: không thu thập dữ liệu cá nhân trong bài thi. Bảng xếp hạng (nếu có) chỉ hiện tên tuỳ chọn/ẩn danh, mặc định tắt (R9).
- **DoD:** user bắt đầu lượt thi → nhận N bài random có trộn bài an toàn → trả lời lần lượt, không quay lại được; back/reload giữa chừng làm bài đang làm bị tính rớt; màn tổng kết hiện điểm + giải thích; lượt thi được lưu và không thể sửa sau khi nộp.

### Phase 3B — ADMIN: quản trị nội dung & cấu hình
Thay việc sửa `seed.ts` bằng trang quản trị — đúng R6 (thêm kiểu lừa mới = thêm data, không sửa code).

- **Phân quyền:** thêm role (vd `admin`/`editor`) cho user; mọi route admin yêu cầu đăng nhập + role; ghi **audit log** (ai sửa gì, khi nào).
- **Quản lý nội dung:** CRUD Category, Signal, QuizQuestion (bản dịch EN/VI, kênh, chủ đề, độ khó, `isPublic`, thứ tự, nháp/xuất bản), Lesson.
- **Trình soạn `scenarioData`:** form theo từng loại vỏ + **xem trước trực tiếp bằng chính vỏ mô phỏng** của /train; đánh dấu hotspot (đúng/mồi) ngay trên bản xem trước; **kiểm tra cùng luật với seed** (số mồi ≈ số đúng — lệch ≤ 1, bài an toàn ≥ 2 mồi, mọi signal đáp án có hotspot) — chuyển hàm kiểm tra sang `packages/shared` để seed, API và admin dùng chung.
- **Cấu hình Contest:** số bài mỗi lượt, tỉ lệ an toàn/lừa đảo, giới hạn thời gian, luật "quay lại = rớt".
- **Thống kê nội dung:** số lượt làm, tỉ lệ đúng, dấu hiệu hay bị bỏ sót / mồi hay bị chọn nhầm theo từng bài — để chỉnh độ khó và phát hiện bài lỗi.
- Chuẩn bị cho Phase 4: quản lý Template/Variant email (nội dung + signal) dùng chung trình soạn.
- R5: trang admin không hiển thị dữ liệu cá nhân của user ngoài mức cần thiết; số liệu thống kê ở dạng tổng hợp.
- **DoD:** admin tạo/sửa/xuất bản một bài mới (đủ EN/VI, có hotspot) qua giao diện mà không đụng code; bài sai luật hotspot bị chặn khi lưu; bài mới xuất hiện ngay ở /practice, /train và Contest; mọi thay đổi có audit log.
- **Tiến độ (2026-10-07) — đã làm MVP nội dung:** role `admin` cấp qua env `ADMIN_EMAILS` (nâng khi đăng nhập/seed); `/admin` gồm Bài train (trình soạn theo loại vỏ + xem trước bằng vỏ của /train + kiểm luật trực tiếp), Category, Signal, Bài học, Nhật ký; nháp/xuất bản (`ContentStatus`) — chỉ bài `published` hiện ở /practice, /train; luật hotspot chuyển sang `packages/shared/scenario-rules.ts` (seed + API + admin dùng chung); code Category/Signal là string tự do (DB là nguồn sự thật). Xoá category/signal đang dùng hoặc bài đã có lượt làm → bị chặn (409).
  - **Để sau:** thống kê nội dung theo bài, cấu hình Contest (chờ 3A), Template/Variant email (Phase 4), vỏ `popup`.
  - **Gỡ (2026-10-08):** Bài học — xem Phase 3 (a).
  - **CLI dữ liệu (2026-10-08):** `pnpm --filter @redflag/api data …` cho agent/người thêm–sửa–xoá dữ liệu qua đúng lớp service admin (cùng luật xuất bản, ghi audit `via: 'cli'`) — xem README.
  - **Dời sang Phase cuối:** i18n cho giao diện admin — hiện admin chỉ có tiếng Việt (xem Phase 10).

### Phase 4 — TEST FLOW: campaign engine + email thật (lõi kỹ thuật)
- Scheduler: lên lịch gửi ngẫu nhiên thời điểm trong khung giờ, theo tần suất user (R8).
- Queue gửi mail (Redis + worker), render variant per-user, gắn **tracking token** per-user/per-campaign (R2/R5).
- Chỉ chạy cho user đã opt-in Test flow (R1). Tracking endpoints: open (pixel), click (redirect qua token), submit (trang đích chỉ phát tín hiệu "dính" — R2, signal-only, không nhận PII).
- **Trang "Bạn đã dính!" (interstitial, theme hacker):** sau khi "dính", hiện trang cảnh báo kịch tính báo user vừa mắc bẫy, rồi mới có **nút chuyển sang trang dạy** (teach page chỉ rõ signal bỏ lỡ). Report-correct feedback cũng dùng trắc nghiệm signal như Phase 3.

#### Cơ chế nhận report (phản xạ TỐT — flow nhạy cảm, phải làm cẩn thận)
Không dùng nút "Báo cáo lừa đảo" gốc của mail client (chưa có add-on; report đó đi tới nhà cung cấp mail, không về RedFlag). RedFlag nhận report qua **đúng 2 cách**:

1. **Forward email tới `report@<domain>`:** inbound mail handler nhận mail forward, khớp về đúng campaign bằng **token nhúng sẵn** khi gửi (`TrackingPurpose.report`) — ưu tiên tag trong subject dạng `[PG-<token>]` và/hoặc plus-addressing `report+<token>@<domain>` vì forward thường giữ được subject và địa chỉ To; token tra ngược ra campaign. Khớp xong sinh event `reported`.
   - **R2:** chỉ trích tín hiệu khớp campaign; **không lưu nội dung mail forward**, không lưu địa chỉ/nội dung khác. Mail không khớp campaign nào → bỏ qua, không lưu.
2. **Nút "Tôi đã nhận ra email lừa đảo" trên site:** user mở site, chọn **email bài tập từ danh sách** các bài test gần đây của mình → sinh event `reported` cho campaign đó.
   - Danh sách chỉ hiện campaign của chính user (R5), nhãn thân thiện (R9), không lộ token.

- Sau khi report (cả 2 cách) → hỏi "dấu hiệu nào khiến bạn nghi?" (trắc nghiệm signal) → lưu `reportedSignalId`.
- **An toàn chống nhầm lẫn:** mỗi email mô phỏng có footer nhận diện RedFlag + hướng dẫn report đúng 2 cách; nhắc lại cảnh báo "đừng report thật trên mail client".
- Xử lý bounce/complaint, idempotency, retry.
- **DoD:** gửi được 1 campaign test tới hộp thư thật của user đã opt-in; mở/bấm/submit sinh `events` đúng; **report qua forward `report@<domain>` và qua nút trên site đều sinh event `reported` đúng campaign**; khẳng định server không nhận/không ghi bất kỳ dữ liệu nhập/nội dung mail nào (R2).

### Phase 5 — Chấm điểm & phân tích điểm yếu (cầu nối Test → Training)
- Từ `events` + metadata signal của variant → cập nhật `user_scores` (awareness score + `weak_signals`).
- Quy tắc tính điểm theo loại tương tác (report đúng, bấm link, submit, bỏ qua) — chấm theo signal (R7). **Tính 2 chiều (R11):** thưởng cả true-negative (nhận ra an toàn đúng), trừ/ghi nhận false-positive (báo động giả) như một điểm yếu; score phản ánh cả độ nhạy lẫn độ đặc hiệu.
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

### Phase 10 (cuối) — Hoàn thiện: i18n cho admin
Admin chỉ người biên tập nội bộ dùng nên tạm để tiếng Việt; dịch sau cùng, khi giao diện admin đã ổn định.
- **Giao diện admin EN/VI:** chuỗi của menu, tiêu đề, form, nút, thông báo vào `ADMIN_T` trong `apps/web/src/lib/i18n.ts` (cùng kiểu với `TRAIN_T`, `LIBRARY_T`…), dùng chung nút chuyển EN/VI trên header.
- **Thông báo lỗi từ API admin:** hiện viết cứng tiếng Việt (vd "Bài chưa đủ điều kiện xuất bản", danh sách lỗi hotspot trong `quiz-rules.ts` / `scenario-rules.ts`) → chuyển sang mã lỗi + tham số để web tự dịch.
- Không đụng tới chọn ngôn ngữ **nội dung** (bản EN/VI của bài, sổ tay theo locale) — phần đó đã có.
- **DoD:** chuyển EN/VI thì toàn bộ `/admin` đổi ngôn ngữ, kể cả lỗi trả về từ API.

---

## Thứ tự ưu tiên đề xuất
Phase 0 → 1 → 2 → 3 (có demo sớm cho guest) → **3A Contest → 3B Admin** → 4 → 5 → 6 → 7, rồi 8/9 sau; **Phase 10 (i18n admin) làm cuối cùng.**
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
1. **Phạm vi v1 = tới Phase 5** (data → auth → guest quiz → contest → admin → email thật → chấm điểm theo signal). Phase 6–9 làm sau.
   - *(Cập nhật 2026-10-07)* Thứ tự sau Training: **Contest (3A) → Admin (3B) → mới tới Test qua mail thật (Phase 4).** Lý do: Contest tận dụng ngay bộ vỏ mô phỏng đã có và tạo dữ liệu điểm cho Phase 5; Admin cần có trước khi chạy email thật để soạn/kiểm nội dung bằng giao diện thay vì sửa seed.
2. **ORM = Prisma.** Schema đặt tại `apps/api/prisma/schema.prisma`; migrations qua `prisma migrate`; type sinh ra dùng chung quan điểm với enums trong `packages/shared`.
3. **Dev email = Mailpit** trong `docker-compose` (SMTP giả + UI xem mail), không gửi ra ngoài khi dev. SMTP thật/SPF-DKIM-DMARC để dành khi lên staging/prod.
4. **Đa ngôn ngữ EN + VI ngay từ đầu:** FE dùng i18n (next-intl hoặc tương đương), **mặc định EN** (phạm vi global), VI là locale bổ sung. Nội dung Category/Template/Variant/Signal/Lesson lưu đa ngôn ngữ ở tầng dữ liệu (cột/bảng dịch), vì nội dung là data (R6) — cần tính đến ngay trong schema Phase 1.
   - *(Cập nhật 2026-10-07)* Ngoại lệ: giao diện **admin** tạm chỉ có tiếng Việt; i18n cho admin dời sang Phase 10 (cuối). Trang cho người học vẫn EN + VI như trên.
