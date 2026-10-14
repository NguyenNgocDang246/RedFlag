# Thư viện thiết kế bài mô phỏng (simulate)

File này là **thư viện kỹ thuật** để thiết kế bài train "đây là lừa đảo hay thật?". Nó trả lời câu "có những kiểu lừa nào, dựng ra sao" — chọn vỏ nào, gắn signal nào, viết nội dung, mồi và note thế nào.

> **Luật soạn bài và checklist** nằm ở [`quiz-authoring.md`](./quiz-authoring.md) — file này không chép lại luật, chỉ bổ trợ phần "có sẵn khuôn để bắt chước".
> **Kiểu dữ liệu** (các vỏ, `Span`, hotspot) nằm ở [`packages/shared/src/scenarios.ts`](../packages/shared/src/scenarios.ts).
> Ví dụ thật đang chạy: [`seed-data/quiz-email.ts`](../apps/api/prisma/seed-data/quiz-email.ts), [`seed-data/quiz-mixed.ts`](../apps/api/prisma/seed-data/quiz-mixed.ts).

Mỗi bài là một `QuizSeed`: một tình huống, một vỏ (`kind`), đủ `en` + `vi`, trong đó vài chỗ là **hotspot** (chạm được) — có hai loại duy nhất: **dấu hiệu lừa** (signal nằm trong đáp án) và **mồi/decoy** (trông đáng ngờ nhưng ở bài này là bình thường). Mọi chỗ khác là chữ thường, không chạm được. Dựng bằng `h()` (hotspot đúng) và `d()` (mồi) trong [`seed-data/common.ts`](../apps/api/prisma/seed-data/common.ts).

---

## 1. Các vỏ (kind) có sẵn

| `kind` | Vỏ mô phỏng | Dùng cho | Shell |
|---|---|---|---|
| `email_inspection` | Hộp thư kiểu Gmail (người gửi, địa chỉ, tiêu đề, thân, tệp đính kèm) | Thư giả ngân hàng, chia sẻ tài liệu, cảnh báo bảo mật, hoá đơn | `shells/email.tsx` |
| `sms_inspection` | Tin nhắn SMS (brandname + bong bóng tin) | Giả shipper, OTP, trúng thưởng, subdomain nhái | `shells/phone.tsx` |
| `chat_inspection` | Khung chat (tên liên hệ + bong bóng hai chiều) | Giả sếp/BEC, tuyển dụng, kéo sang Telegram | `shells/phone.tsx` |
| `web_inspection` | Trình duyệt (thanh URL + trang) | Trang đăng nhập giả, trang nhập OTP, hoá đơn web | `shells/browser.tsx` |
| `qr_inspection` | Áp phích + URL giải mã sau khi "quét" | QR dẫn tới domain nhái | `shells/phone.tsx` |
| `file_inspection` | Cửa sổ mở tệp ("Enable content") | Tệp .html/.xlsm/.zip độc | `shells/desktop-apps.tsx` |
| `app_consent` | Màn hình cài app / quyền | App ngoài store, xin quyền trợ năng | `shells/desktop-apps.tsx` |
| `oauth_consent` | Màn hình "Cho phép ứng dụng truy cập" | OAuth xin quyền quá mức | `shells/desktop-apps.tsx` |

`popup` có trong enum nhưng chưa có shell — bỏ qua khi soạn bài mới.

Mỗi vị trí trong vỏ (người gửi, địa chỉ, URL, link, tệp, quyền…) **lúc là dấu hiệu, lúc là mồi** tuỳ bài — đừng để một vị trí luôn là đáp án (luật chống lộ đáp án).

---

## 2. Bảng 13 tín hiệu (signal)

Lấy nguyên văn từ `SIGNAL_I18N` ([`seed.ts`](../apps/api/prisma/seed.ts)). "Mức dùng" = tần suất trong kho bài hiện tại, để biết signal nào đang thiếu bài.

| Mã | Tên (vi / en) | Bản chất | Hay nằm ở | Mức dùng |
|---|---|---|---|---|
| `LOOKALIKE_DOMAIN` | Tên miền giả gần giống / Look-alike domain | Địa chỉ web trông gần đúng nhưng sai một chút | thanh URL, địa chỉ email, link, QR | rất cao |
| `SENDER_MISMATCH` | Người gửi không khớp / Sender mismatch | Tên hiển thị và địa chỉ email thật không khớp | địa chỉ người gửi | rất cao |
| `HIDDEN_LINK` | Link ẩn khác chữ hiển thị / Hidden link target | Chữ link ghi một nơi, thực tế trỏ nơi khác | link trong thân, nút bấm | vừa |
| `URGENCY` | Tạo cảm giác khẩn cấp / False urgency | Thúc làm ngay hoặc doạ khoá/phạt | câu hạn chót, doạ hậu quả | rất cao |
| `SENSITIVE_REQUEST` | Đòi thông tin nhạy cảm / Asks for secrets | Xin OTP, mật khẩu, số thẻ, giấy tờ | câu yêu cầu, ô nhập | cao |
| `SUSPICIOUS_ATTACHMENT` | File đính kèm lạ / Suspicious attachment | Tệp bất ngờ bị thúc mở | tệp .html/.zip/.rar/.xlsm/.apk | vừa |
| `GENERIC_GREETING` | Lời chào chung chung / Generic greeting | Xưng "quý khách" thay vì tên thật | dòng chào đầu thư | cao |
| `SPELLING_ERRORS` | Sai chính tả, dịch máy / Spelling errors | Câu chữ lủng củng, như dịch máy | bất cứ đoạn nào | thấp |
| `TOO_GOOD` | Quá tốt để là thật / Too good to be true | Trúng thưởng, hoàn tiền, quà không rõ lý do | tiêu đề, nội dung khuyến mãi | cao |
| `OFF_CHANNEL` | Kênh liên hệ lạ / Off-channel contact | Dẫn sang chat riêng/SĐT lạ thay vì kênh chính thức | số gọi lại, link Telegram/Zalo | vừa |
| `MISSING_DETAILS` | Thiếu thông tin cụ thể / Missing specifics | Không nêu mã đơn, số tài khoản, vụ việc | thân thông báo chung chung | cao |
| `UNTRUSTED_APP` | Ứng dụng không đáng tin / Untrusted app | Cài ngoài store hoặc xin quyền quá mức | dòng nhà phát triển, danh sách quyền | thấp |
| `PAYMENT_CHANGE` | Đổi thông tin thanh toán / Payment changed | Bất ngờ đổi số tài khoản nhận tiền | câu "chuyển vào tài khoản mới" | rất thấp (thiếu bài) |

---

## 3. Thư viện kỹ thuật

Danh sách gộp chung mọi kỹ thuật (một số rút từ bộ quiz của Google, phần còn lại từ kho bài hiện có), xếp theo nhóm thủ đoạn cho dễ tra. Mỗi kỹ thuật là một **khuôn tái dùng**: *Vỏ · Signal chính · Thủ đoạn · Ví dụ (vi + en) · Mồi · Gợi ý note · Độ khó*.

Nhớ: ví dụ dùng **thương hiệu hư cấu trong sổ tay** (Sao Mai Bank / Northstar Bank, PhimPlus / StreamBox, PayNhanh / QuickPay, GiaoNhanh / SwiftParcel, Cloudbox, ChợXanh / GreenMart…). **Không dùng brand thật** trong bài — Google/Coca-Cola/PayPal/Netflix chỉ là xuất xứ ngoài đời của kỹ thuật. SĐT và số tài khoản luôn che (`0905 xxx 218`).

### Nhóm 1 — Giả mạo tên miền / link

#### 1. Trang đăng nhập giả
- **Vỏ:** `web_inspection` · **Signal:** `LOOKALIKE_DOMAIN`.
- **Thủ đoạn:** trang đăng nhập sao chép y hệt, chỉ sai ở thanh URL (`saomaibank-secure-login.com`).
- **Ví dụ (vi/en):** thanh URL `https://saomaibank-secure-login.com/ebank` / `https://northstarbank-secure-login.com/ebank`, giao diện ngân hàng đầy đủ.
- **Mồi (kinh điển):** dòng "Vì an toàn, không chia sẻ OTP" — trang thật cũng có.
- **Note:** câu nhắc OTP cảnh báo bạn chứ không xin gì; chỗ lộ là thanh địa chỉ không phải domain thật trong sổ tay.
- **Độ khó:** 1–2.

#### 2. Subdomain nhái
- **Vỏ:** `sms_inspection` / `email_inspection` · **Signal:** `LOOKALIKE_DOMAIN`.
- **Thủ đoạn:** domain thật của brand bị nhét làm **subdomain** của domain kẻ gian: `netflix.com.onlinehome.us`. Phần quyết định là chữ ngay trước đuôi (`.us`) — ở đây là `onlinehome`, không phải brand.
- **Ví dụ (vi):** PhimPlus SMS "khôi phục tại `phimplus.vn.onlinehome.us`". **(en):** StreamBox "restore at `streambox.com.onlinehome.us`".
- **Mồi:** brandname người gửi "PhimPlus" (chép được), câu "khôi phục tài khoản".
- **Note:** domain thật phải là chữ ngay sát đuôi; `…onlinehome.us` mới là chủ thật, phần `phimplus.vn` chỉ ghép phía trước để đánh lừa.
- **Độ khó:** 3.

#### 3. Doạ "có người biết mật khẩu của bạn"
- **Vỏ:** `email_inspection` · **Signal:** `LOOKALIKE_DOMAIN` + `URGENCY`.
- **Thủ đoạn:** cảnh báo bảo mật giả ("Ai đó vừa dùng mật khẩu của bạn để đăng nhập"), nút "Đổi mật khẩu" trỏ sang domain lạ (`ml-security.org`). Khai thác nỗi sợ.
- **Ví dụ (vi/en):** `Cloudbox <no-reply@cloudbox.support>`, nút "Đổi mật khẩu" → `cloudbox-security.org`.
- **Mồi:** chi tiết "đăng nhập từ Slatina, Romania — Firefox" (cảnh báo thật cũng ghi vị trí/trình duyệt).
- **Note:** liên kết đổi mật khẩu dẫn tới domain không phải của dịch vụ; cảnh báo thật đưa về đúng trang tài khoản — gõ tay địa chỉ chính thức thay vì bấm nút.
- **Độ khó:** 2.

#### 4. Domain lạ (email dạng ảnh)
- **Vỏ:** `email_inspection` · **Signal:** `SENDER_MISMATCH` + `TOO_GOOD`.
- **Thủ đoạn:** thư trúng thưởng gửi từ domain vô nghĩa (`opmajvpqjcg.…`). Chữ nhét trong một tấm ảnh để né bộ lọc — "email dạng ảnh" nghĩa là nội dung là hình chứ không phải chữ, nên không soi được bằng tìm kiếm chữ.
- **Ví dụ (vi):** `ChợXanh <email_7f3@opmajvpqjcg.khuyenmai-shop.net>`, "Trả lời và nhận ngay máy xay sinh tố". **(en):** `GreenMart <…@opmajvpqjcg.promo-shop.net>`, "Reply to win a free blender".
- **Mồi:** logo thương hiệu, tiêu đề giật tít.
- **Note:** địa chỉ gửi không thuộc domain trong sổ tay của brand; thương hiệu thật không gửi khuyến mãi từ domain ngẫu nhiên.
- **Độ khó:** 1.

#### 5. Link chia sẻ tài liệu đính kèm
- **Vỏ:** `email_inspection` · **Signal:** `HIDDEN_LINK` (thêm `SENDER_MISMATCH` nếu người gửi là địa chỉ cá nhân lạ).
- **Thủ đoạn:** email "ai đó đã chia sẻ một tài liệu", nút "Mở tài liệu" trông như link chia sẻ thật nhưng `href` trỏ sang domain kẻ gian. Tên tài liệu đánh vào tò mò ("Ngân sách phòng ban 2026").
- **Ví dụ (vi):** `Nguyễn Hoàng Long <long.hoang…@webmail-share.net>`, link hiển thị `cloudbox.vn/d/ngan-sach-2026` nhưng `href` = `https://webmail-share.net/login`. **(en):** `Someone shared "Department Budget 2026"`, link `cloudbox.com/d/budget` → `webmail-share.net/login`.
- **Mồi:** tên người gửi, dòng "Nếu cần gì thêm cứ báo mình".
- **Note:** chữ link và đích thật khác nhau; tài liệu chia sẻ thật mở ngay trên domain của chính dịch vụ, không bắt đăng nhập lại ở domain lạ.
- **Độ khó:** 2.

#### 6. Link rút gọn (tinyurl…)
- **Vỏ:** `email_inspection` · **Signal:** `HIDDEN_LINK`.
- **Thủ đoạn:** nút/liên kết thực chất chuyển hướng qua dịch vụ rút gọn (`tinyurl.com/…`) nên che mất đích thật. "Link rút gọn" = địa chỉ ngắn giấu địa chỉ dài phía sau, không biết dẫn đi đâu tới khi bấm.
- **Ví dụ (vi/en):** cảnh báo "tài khoản có thể bị tấn công", "Đổi mật khẩu" → `href` = `https://tinyurl.com/4k2p…`.
- **Mồi:** văn phong và bố cục giống cảnh báo thật.
- **Note:** tổ chức thật hiếm khi giấu đường dẫn sau link rút gọn; không thấy domain đích thì đừng bấm — tự vào trang chính thức.
- **Độ khó:** 2.

#### 7. QR dẫn domain nhái
- **Vỏ:** `qr_inspection` · **Signal:** `LOOKALIKE_DOMAIN` (hoặc `HIDDEN_LINK`).
- **Thủ đoạn:** áp phích "quét để nhận quà/tra cứu", URL giải mã ra domain nhái.
- **Mồi:** áp phích đẹp, có logo.
- **Note:** QR chỉ là cách giấu đường link — vẫn phải soi domain sau khi quét.
- **Độ khó:** 2.

### Nhóm 2 — Chiếm mã xác minh / mật khẩu

#### 8. Đòi mã xác minh qua SMS
- **Vỏ:** `sms_inspection` · **Signal:** `SENSITIVE_REQUEST` (thêm `URGENCY`).
- **Thủ đoạn:** kẻ gian bấm "quên mật khẩu" để hệ thống gửi OTP về máy bạn, rồi nhắn xui bạn **nhắn lại mã** ("Nếu không phải bạn, trả lời: HUỶ + mã xác minh"). Nhắn lại là mất tài khoản.
- **Ví dụ (vi):** "Có yêu cầu đặt lại mật khẩu? Nếu không, trả lời: HUỶ 131025." **(en):** "Password reset requested? If not, reply: CANCEL 131025." (131025 là OTP thật vừa về máy.)
- **Mồi:** chính tin OTP thật phía trên ("Mã xác minh là 131025").
- **Note:** không hệ thống thật nào bảo bạn nhắn lại OTP cho bất kỳ ai; OTP chỉ để bạn tự nhập vào app chính thức.
- **Độ khó:** 2.

#### 9. Nhập / relay OTP trên trang giả
- **Vỏ:** `web_inspection` / `sms_inspection` · **Signal:** `SENSITIVE_REQUEST`.
- **Thủ đoạn:** sau khi dụ vào trang giả, ô "Nhập mã OTP vừa nhận" để kẻ gian chiếm phiên ngay lúc đó. Khác kỹ thuật 8 ở chỗ nạn nhân tự gõ OTP vào form.
- **Mồi:** giao diện giống app thật, dòng nhắc bảo mật.
- **Note:** app thật không bao giờ hiện ô nhập OTP trên một trang mở từ link lạ; OTP chỉ nhập trong chính app/trang chính thức.
- **Độ khó:** 2.

### Nhóm 3 — Tệp và ứng dụng độc

#### 10. Tệp đính kèm độc
- **Vỏ:** `file_inspection` / `email_inspection` (tệp đính kèm) · **Signal:** `SUSPICIOUS_ATTACHMENT`.
- **Thủ đoạn:** tệp `.html` / `.zip` / `.rar` / `.xlsm` / `.apk` bị thúc mở ("Bật nội dung để xem hoá đơn"). Ghi rõ đuôi tệp. "Macro" = lệnh tự chạy ẩn trong file Office.
- **Mồi:** tệp `.pdf` / `.jpg` đúng ngữ cảnh.
- **Note:** định dạng chạy mã (.html/.xlsm/.apk) trong thư không mời mà tới là bất thường; hoá đơn thật thường là PDF hoặc xem trong tài khoản.
- **Độ khó:** 2–3.

#### 11. OAuth xin quyền quá mức
- **Vỏ:** `oauth_consent` · **Signal:** `UNTRUSTED_APP`.
- **Thủ đoạn:** màn "Cho phép ứng dụng truy cập" xin quyền vượt chức năng (đọc toàn bộ email, gửi thư thay bạn) cho một app lạ.
- **Mồi:** tên app nghe hợp lý, dòng nhà phát triển.
- **Note:** app chính đáng chỉ xin quyền vừa đủ công dụng; quyền đọc/gửi toàn bộ email cho một tiện ích nhỏ là dấu hiệu chiếm hộp thư.
- **Độ khó:** 2–3.

#### 12. App ngoài store / quyền trợ năng
- **Vỏ:** `app_consent` · **Signal:** `UNTRUSTED_APP`.
- **Thủ đoạn:** dụ cài APK ngoài cửa hàng, xin quyền **Trợ năng (Accessibility)** để đọc màn hình và bấm thay bạn. Giải nghĩa: quyền trợ năng vốn dành cho người khuyết tật, bị lạm dụng thì xem được mọi thứ trên máy.
- **Mồi:** biểu tượng app đẹp, mô tả hợp lý.
- **Note:** app thật tải từ cửa hàng chính thức; app cài ngoài store mà đòi quyền trợ năng gần như luôn là mã độc.
- **Độ khó:** 2.

### Nhóm 4 — Tiền và kênh liên hệ

#### 13. Số điện thoại lạ gọi lại (hoá đơn giả)
- **Vỏ:** `email_inspection` / `web_inspection` · **Signal:** `OFF_CHANNEL` (có thể thêm `MISSING_DETAILS`).
- **Thủ đoạn:** "hoá đơn" báo đã trừ một khoản lớn, không link độc, không đòi mật khẩu — **chỗ lộ duy nhất là số hotline lạ** bảo gọi để "huỷ giao dịch". Gọi vào là bị dẫn dắt.
- **Ví dụ (vi):** "Đã trừ 6.000.000đ cho giao dịch thẻ quà tặng. Không phải bạn? Gọi +1 (858) xxx-7823." **(en):** "600 USD charged for a gift-card order. Not you? Call +1 (858) xxx-7823."
- **Mồi:** mã giao dịch trông thật, dòng "giờ làm việc 8:00–18:00", logo.
- **Note:** doanh nghiệp thật cho khiếu nại trong app hoặc website chính thức; số in trong email không chứng minh được là của họ — tự tra số tổng đài trên trang chính thức.
- **Độ khó:** 3 (mọi dấu hiệu khác đều ổn).

#### 14. Đổi tài khoản thanh toán / BEC giả sếp
- **Vỏ:** `email_inspection` / `chat_inspection` · **Signal:** `PAYMENT_CHANGE` (kho đang **rất thiếu** signal này).
- **Thủ đoạn:** "nhà cung cấp đổi số tài khoản, lần này chuyển vào STK mới"; hoặc sếp nhắn gấp "đang họp, chuyển giúp anh".
- **Mồi:** chữ ký, mã hợp đồng, văn phong đúng.
- **Note:** đổi tài khoản nhận tiền phải xác minh bằng cách gọi lại số đã biết trước khi chuyển; email/chat đơn lẻ không đủ.
- **Độ khó:** 3.

#### 15. Kéo sang chat riêng / Telegram
- **Vỏ:** `chat_inspection` / `sms_inspection` · **Signal:** `OFF_CHANNEL`.
- **Thủ đoạn:** dẫn nạn nhân rời kênh chính thức sang Telegram/Zalo "để tiện trao đổi" (việc nhẹ lương cao, nhóm đầu tư kín).
- **Mồi:** lời mời lịch sự, ảnh đại diện chuyên nghiệp.
- **Note:** tổ chức thật xử lý trên kênh chính thức; kéo sang chat riêng là để thoát khỏi giám sát và dễ thao túng.
- **Độ khó:** 1–2.

#### 16. Trúng thưởng / hoàn tiền
- **Vỏ:** `sms_inspection` / `email_inspection` · **Signal:** `TOO_GOOD`.
- **Thủ đoạn:** "Bạn là khách hàng may mắn", "hoàn tiền đơn hàng" cho thứ bạn không đăng ký; thường kèm link lạ.
- **Mồi:** brandname, mã dự thưởng.
- **Note:** phần thưởng cho thứ bạn không tham gia gần như luôn là mồi để lấy thông tin hoặc phí "nhận quà".
- **Độ khó:** 1.

### Nhóm 5 — Dấu hiệu phụ (ít khi đứng một mình)

#### 17. Lời chào chung + hối thúc
- **Vỏ:** `email_inspection` · **Signal:** `GENERIC_GREETING` + `URGENCY`.
- **Thủ đoạn:** "Kính gửi quý khách… xác nhận trong 24 giờ nếu không tài khoản bị đóng". Lưu ý: "xác nhận ngay kẻo bị khoá" chỉ đáng ngờ vì ngữ cảnh — để **chữ thường**, chỉ gắn hotspot vào câu hạn chót phi thực tế.
- **Độ khó:** 1.

#### 18. Thiếu thông tin cụ thể
- **Vỏ:** mọi vỏ · **Signal:** `MISSING_DETAILS`.
- **Thủ đoạn:** thông báo chung chung, không mã đơn/số tài khoản/tên vụ việc. Thường ghép với `URGENCY` hoặc `LOOKALIKE_DOMAIN`.
- **Mồi đối lập:** bài thật nêu đúng mã đơn người dùng vừa tạo.

#### 19. Sai chính tả / dịch máy
- **Signal:** `SPELLING_ERRORS` — dùng làm dấu hiệu phụ trong bài mức 1. Phải là lỗi thật trong văn bản, không phải "nghe hơi lạ".

---

## 4. Thư viện mồi (decoy) tái dùng

Mồi là phần khó nhất và **bắt buộc** ở bài lừa (số mồi ≈ số hotspot đúng). Mồi phải đặt ở chỗ **hay có dấu hiệu** nhưng ở bài này lại đúng:

| Vị trí | Mồi tốt | Vì sao bình thường |
|---|---|---|
| Tên hiển thị người gửi | "Dịch vụ tài khoản", tên brand | Thư thật cũng để tên bộ phận; tên không chứng minh gì — phải xem địa chỉ. |
| Địa chỉ email | đúng domain trong sổ tay | Khớp sổ tay thì an toàn; đây mới là bằng chứng. |
| Dòng nhắc OTP | "Không chia sẻ OTP cho bất kỳ ai" | Trang/thư thật đều có; nó cảnh báo chứ không xin gì. |
| Số hotline | số tổng đài thật trong sổ tay | Số đúng sổ tay là bình thường; số lạ mới đáng ngờ. |
| Tệp đính kèm | `.pdf` / `.jpg` đúng ngữ cảnh | Định dạng xem được, không chạy mã. |
| Mã tham chiếu | mã đơn/giao dịch khớp việc vừa làm | Thông tin cá nhân hoá đúng là dấu hiệu thật. |
| Quyền app | quyền đúng chức năng (app bản đồ xin vị trí) | Quyền hợp lý với công dụng app. |

Note mồi (2–3 câu): ① vì sao chỗ này bình thường ở đây; ② vì sao nó **không chứng minh gì** nếu kẻ gian chép được; ③ **cái gì mới là bằng chứng**.

---

## 5. Mẫu bài an toàn (giữ tỉ lệ 2:1)

Kho cần tỉ lệ **lừa : an toàn ≈ 2 : 1 theo chủ đề**, và mỗi chủ đề có bài thật gần giống bài lừa để người học không rút ra "cứ gặp X là lừa". Bài an toàn: **không có signal đáp án**, mọi hotspot đều là mồi. Vài khuôn:

- **Xác nhận đơn hàng thật:** SMS GiaoNhanh nêu đúng mã đơn người dùng vừa đặt, link đúng `giaonhanh.vn`, không đòi phí qua link. Mồi: brandname, mã đơn.
- **Biên nhận thanh toán thật:** email PhimPlus từ `@phimplus.vn` báo gia hạn, đổi thẻ chỉ trong app. Mồi: logo, "không chia sẻ OTP".
- **Cảnh báo đăng nhập thật:** Cloudbox báo đăng nhập mới, nút dẫn về đúng `cloudbox.vn`. Mồi: chi tiết vị trí/trình duyệt.

Bài an toàn có thể cố tình chứa chi tiết "trông giống lừa" (đồng hồ đếm ngược trên sàn thật, lời nhắc bảo mật) để làm mồi.

---

## 6. Checklist khi thiết kế

Rút gọn — đầy đủ ở [§G `quiz-authoring.md`](./quiz-authoring.md):

- [ ] Chọn **một vỏ** đúng tình huống, **một chủ đề** (`rf quiz coverage` để thấy chủ đề đang lệch).
- [ ] Hotspot đúng chỉ ở chỗ **tự nó đã sai**; câu chỉ đáng ngờ vì ngữ cảnh để chữ thường.
- [ ] Bài lừa có **mồi**, số mồi ≈ số hotspot đúng; mồi ở chỗ hay có dấu hiệu và đủ tinh vi.
- [ ] Mọi hotspot có **note riêng ≥60 ký tự**, đủ `en` + `vi`, nhắc chi tiết cụ thể của bài.
- [ ] Chỉ **brand hư cấu trong sổ tay**; domain nhái hư cấu; SĐT/số tài khoản đã che.
- [ ] Thuật ngữ (subdomain, link rút gọn, macro, OAuth, trợ năng) đều giải nghĩa.
- [ ] Tiêu đề **trung tính**, không lộ đáp án.
- [ ] `en` và `vi` cùng cấu trúc (cùng số đoạn, cùng vị trí hotspot).

---

## 7. Tham chiếu

- [`docs/quiz-authoring.md`](./quiz-authoring.md) — luật soạn bài + checklist đầy đủ + quy trình CLI.
- [`packages/shared/src/scenarios.ts`](../packages/shared/src/scenarios.ts) — `QuizKind`, `Span`, interface từng vỏ.
- [`packages/shared/src/signals.ts`](../packages/shared/src/signals.ts) — `SignalCode`.
- [`apps/api/prisma/seed-data/common.ts`](../apps/api/prisma/seed-data/common.ts) — `h()`, `d()`, `QuizSeed`.
- [`apps/api/prisma/seed-data/quiz-email.ts`](../apps/api/prisma/seed-data/quiz-email.ts), [`quiz-mixed.ts`](../apps/api/prisma/seed-data/quiz-mixed.ts) — ví dụ đang chạy.
- [`apps/api/src/cli/templates.ts`](../apps/api/src/cli/templates.ts) — bộ sinh khung JSON cho `rf quiz template <kind>`.
