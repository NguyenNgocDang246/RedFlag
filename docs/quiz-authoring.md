# Quy tắc tạo bài train (quiz mô phỏng)

Dành cho người và agent soạn bài qua CLI (`rf = pnpm -s --filter @redflag/api data`) hoặc trang admin. Máy tự chặn một phần (đánh dấu **[chặn]**); phần còn lại là cam kết của người soạn.

## A. Cấu trúc
1. Đủ **EN + VI**, cùng cấu trúc (cùng số đoạn, cùng vị trí hotspot); chỉ khác ngôn ngữ, thương hiệu, tiền tệ, định dạng ngày/số điện thoại theo locale. **[chặn]**
2. **Tiêu đề trung tính**, không lộ đáp án (không "giả", "thật", "lừa đảo", "chính thức", "nghi ngờ").
3. Một bài = một tình huống = một vỏ (`kind`). Chọn `categoryCode` đúng chủ đề, `difficultyLevel` theo mục F.
4. Bài lừa: ≥1 signal đáp án và mỗi signal đáp án có ≥1 hotspot. Bài an toàn: không có signal đáp án. **[chặn]**
5. `explanation` 1–3 câu: vì sao lừa/thật, nêu đủ dấu hiệu, và **việc nên làm** (kiểm tra qua kênh nào).

## B. Nội dung thực tế
6. Mỗi dấu hiệu là thủ đoạn **có thật** kẻ gian hay dùng (domain ghép từ khoá + đuôi rẻ, hối thúc theo giờ, tệp .html/.zip/.xlsm, chuyển vào tài khoản người thứ ba, đọc OTP, nhóm Telegram…). Không bịa.
7. Bài lừa phải **đủ tinh vi để dễ tin**: văn phong đúng, thông tin cụ thể (mã đơn, số cuối thẻ), chỉ lộ ở vài chỗ — không dồn mọi dấu hiệu vào một bài.
8. Bài an toàn phải **thật sự an toàn**: domain đúng sổ tay, thông tin cá nhân hoá khớp việc người dùng vừa làm, không link, không đòi nhạy cảm. Có thể chứa chi tiết "trông giống lừa" (đồng hồ đếm ngược trên sàn thật…) để làm mồi.
9. Chỉ dùng **thương hiệu hư cấu trong sổ tay** theo locale (`rf brand list --locale vi|en`); không dùng tên thật. Domain nhái cũng hư cấu, đúng kiểu (`brand-secure-login.com`, `brand.vn.xac-thuc.co`).
10. Số điện thoại, số tài khoản, mã thẻ luôn **che** (`0905 xxx 218`).

## C. Hotspot
Chỉ có 2 loại hotspot: **dấu hiệu lừa đảo** và **mồi**. Mọi đoạn còn lại là chữ thường: người học **không chạm được, rê chuột cũng không có phản ứng gì**. Vì thế chính mồi là thứ buộc người học phân biệt thật/giả giữa những chỗ chạm được.

11. **Hotspot đúng chỉ gắn cho chỗ tự nó đã sai**: đặt nguyên câu đó vào một tin thật thì không thể có. Ví dụ: domain/địa chỉ không khớp sổ tay, link ẩn, đòi OTP/mật khẩu/số thẻ/CCCD, tệp .html/.zip/.rar/.xlsm/.apk/.exe, chuyển vào tài khoản người thứ ba, quyền vượt chức năng app, lỗi chính tả thật, hạn chót phi thực tế (cắt điện sau 2 giờ, có mặt ở toà trong 24 giờ), lãi cố định theo ngày. Câu **chỉ đáng ngờ vì ngữ cảnh** (lời chào chung, "xác nhận ngay để tránh bị khoá", "bạn là khách hàng may mắn", "đang họp không nghe máy", tiêu đề nhắc lại nội dung) thì để **chữ thường**. Mỗi dấu hiệu nên có 1 hotspot rõ nhất; không gắn thêm câu nhắc lại cùng ý.
12. **Bài lừa bắt buộc có ít nhất 1 mồi** **[chặn]**, và nên có **số mồi ≈ số hotspot đúng** (lệch tối đa 1, máy gợi ý). Nếu không, "chạm hết mọi thứ chạm được" sẽ luôn đúng. Bài an toàn: mọi hotspot đều là mồi, có thể không có hotspot nào.
13. **Mồi đặt ở chỗ hay có dấu hiệu**: tên/địa chỉ người gửi, brandname SMS, tên liên hệ chat, thanh URL, link, nút dẫn đi, tệp đính kèm, số điện thoại, số tài khoản, nhà phát triển, quyền app. Mồi phải **tinh vi**: trông giống chỗ có thể sai nhưng ở đây lại đúng (domain/địa chỉ khớp sổ tay, brandname thật, tệp PDF/JPG, quyền đúng chức năng, số tổng đài thật, câu nhắc "không chia sẻ OTP", mã tham chiếu). **Không** gắn mồi cho câu trung tính trong thân bài (lời chào, lời cảm ơn, khẩu hiệu).
14. Một hotspot một signal. Không gắn signal đáp án cho mồi.
15. `HIDDEN_LINK`: chữ hiển thị trông thật, `href` trỏ domain khác. Tệp đính kèm ghi rõ đuôi (.html/.zip/.rar/.xlsm).

## D. Note — bắt buộc cho MỌI hotspot, riêng từng bài
Tối thiểu **60 ký tự** **[chặn]**; không trùng nguyên văn (không phân biệt hoa/thường, khoảng trắng) với note khác trong cùng bài hoặc bài khác cùng locale **[chặn]**; không được rỗng **[chặn]**.

16. **Note hotspot đúng** (2–3 câu): ① kẻ gian đang làm gì ở chỗ này; ② vì sao đáng sợ **trong bài này** (hậu quả cụ thể: lấy OTP, chiếm số, thu thẻ…); ③ người thật sẽ làm khác thế nào / nên kiểm tra bằng cách nào.
17. **Note mồi** (2–3 câu): ① vì sao chỗ này **bình thường** ở đây (tin thật cũng có, kèm ví dụ); ② vì sao nó **không chứng minh gì** nếu kẻ gian chép được; ③ **cái gì mới là bằng chứng** (domain, link thật, yêu cầu OTP…).
18. Bài an toàn: note nói vì sao **khớp** (đối chiếu sổ tay, khớp giao dịch người dùng vừa làm, không link, không đòi gì) — không chỉ "khớp sổ tay".
19. **Cấm**: câu chung dùng cho mọi bài ("đây là nội dung thường…"), note một vế ("bình thường", "đáng ngờ") không nói lý do, note lặp giữa các bài. Mỗi note nhắc ít nhất một chi tiết cụ thể của bài (tên miền, số tiền, hạn giờ, tên app…).
20. Viết cho người học phổ thông: thuật ngữ (macro, subdomain…) phải giải nghĩa; không dọa quá đà.
21. VI và EN không dịch máy từng chữ: dùng tiền tệ, thương hiệu, ví dụ đúng locale; chi tiết khớp với đoạn văn của chính locale đó.

## E. Chống lộ đáp án
22. Mọi đoạn (đúng, mồi, chữ thường) cùng độ dài/văn phong/định dạng; không in đậm hay dấu hiệu thị giác. `note` chỉ trả về sau khi chấm (đã có `stripNotes`).
23. Không xếp hotspot theo khuôn cố định ("hotspot đúng luôn ở cuối"). Vì chỉ hotspot chạm được, mỗi loại vị trí (người gửi, URL, tệp…) phải có lúc là dấu hiệu, có lúc là mồi trong kho bài.

## F. Độ khó và cân bằng kho
24. Mức 1: 2–3 dấu hiệu rõ (domain nhái, hối thúc). Mức 2: tinh vi hơn (subdomain đánh lừa, link ẩn, tệp .zip) kèm mồi tinh vi. Mức 3: chỉ lộ ở 1–2 chi tiết (đổi tài khoản nhà cung cấp, link share từ domain thật), nhiều mồi sát thật.
25. Giữ tỉ lệ **lừa : an toàn ≈ 2 : 1 theo chủ đề**; mỗi chủ đề có bài thật gần giống bài lừa để người học không rút ra "cứ gặp X là lừa". Chạy `rf quiz coverage` để thấy chủ đề đang lệch trước khi chọn chủ đề cho bài mới.

## G. Quy trình
26. `rf quiz coverage` → `rf quiz template <kind> > q.json` → điền EN + VI → `rf quiz check --file q.json` → `rf quiz create --file q.json --dry-run` → `rf quiz create` (nháp) → xem trước `/admin/quiz/<id>` và tự làm thử (chọn chữ thường, chọn mồi, chọn đúng) → `rf quiz publish '#số'`. Sửa bài: `rf quiz export '#số' > q.json` → sửa → `rf quiz check '#số' --file q.json` → `rf quiz update '#số' --file q.json`.
27. **Checklist tự rà — agent in ra khi tạo xong:**
    - [ ] hotspot đúng chỉ ở chỗ tự nó đã sai; câu chỉ đáng ngờ vì ngữ cảnh để chữ thường
    - [ ] mọi hotspot có note riêng, ≥60 ký tự, đủ 2 locale, có chi tiết cụ thể
    - [ ] bài lừa có mồi, số mồi ≈ số hotspot đúng; mồi ở chỗ hay có dấu hiệu và đủ tinh vi
    - [ ] không brand/domain thật; số điện thoại/tài khoản đã che
    - [ ] tiêu đề không lộ đáp án
    - [ ] `rf quiz check` sạch (không còn `<…>` của template)
    - [ ] đã làm thử trên bản xem trước
