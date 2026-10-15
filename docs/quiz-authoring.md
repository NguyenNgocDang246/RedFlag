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
Tối thiểu **25 ký tự** **[chặn]** (rõ ràng là đủ, không cần dài); không trùng nguyên văn (không phân biệt hoa/thường, khoảng trắng) với note khác trong cùng bài hoặc bài khác cùng locale **[chặn]**; không được rỗng **[chặn]**.

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
24. Độ khó đo bằng **chỗ sai nằm ở đâu**. Định nghĩa đầy đủ ở [§1 `simulation-design.md`](./simulation-design.md); bản rút gọn để dùng ngay:
    - **Mức 1 — nhìn là thấy:** kịch bản ai cũng thuộc (trúng thưởng, doạ khoá tài khoản, doạ cắt điện, mượn tiền gấp, giả công an, việc nhẹ lương cao, duyệt vay nhanh, đóng phí trước), **hoặc** tên miền sai kiểu đọc ra được — ghép từ khoá (`saomaibank-hotro.com`), đuôi rẻ (`.xyz`, `.top`, `.online`, `.info`), mail miễn phí đứng tên tổ chức.
    - **Mức 2 — phải soi kỹ:** tên miền phải đọc từng ký tự (chữ giả chữ `phirnplus.vn`, đổi đuôi `saomaibank.co`, thêm đuôi `saomaibank.vn.co`), **hoặc** chỗ sai nằm ngoài tên miền — tệp chèn vào, link ẩn, quyền app vượt mức, đòi đọc OTP.
    - **Mức 3 — bước kiểm hiển nhiên cho kết quả sạch:** người học tra đúng chỗ bài chỉ sẵn và mọi thứ đều khớp, nên phải đi thêm một bước. Hai khuôn: **3a** chỗ sai nằm ở một trường sổ tay không ai nghĩ tới tra (`hotlines`, `apps`, `shortCodes`, `paymentAccounts`, `taxCodes`, `legalNames`, `addresses`); **3b** thông tin có khớp sổ tay nhưng khớp **nhầm thương hiệu**. Hotspot đúng là **bước chiếm lợi**, mọi thứ thuộc hạ tầng bắt buộc là mồi.
    - **Hai phép thử mức 3:** (a) *chuỗi kiểm* — viết ra từng bước người học phải đi, phải có ít nhất hai bước và bước đầu cho kết quả sạch; (b) *mũi tên* — bỏ sổ tay ra khỏi đầu rồi đọc lại bài, không được có chỗ nào gợi ý phải đi tra cái gì.
    - **Đừng nhét vật đối chiếu vào trong bài.** Thứ duy nhất được phép đối chiếu là sổ tay, vì sổ tay có ở mọi bài nên mở ra không tiết lộ gì. Thư trích dẫn kèm hoá đơn cũ, prompt nêu số tài khoản cũ, câu "như mọi lần bạn vẫn trả về…" đều là mũi tên chỉ chỗ và kéo bài xuống mức thấp.
    - **Mức bị chặn bởi đường ngắn nhất.** Bài có cả kịch bản ai cũng thuộc lẫn một tên miền tinh vi thì vẫn là mức 1, vì người học ăn điểm mà chẳng cần nhìn tên miền. Không trộn dấu hiệu khác mức trong cùng một bài.
    - **Đừng làm tên miền giả lố.** Thêm hẳn một từ khoá vào (`saomaibank.vn.xac-thuc.co`) là mắt bắt ngay, tức mức 1 chứ không phải mức 2. Bản mức 2 đúng là `saomaibank.vn.co`.
    - **Bài an toàn:** mức = mức bài lừa mà người học phải loại trừ hết. Chỉ có tên miền để đối chiếu sổ tay → mức 1. Có một thành phần sạch buộc phải soi (tệp đính kèm, danh sách quyền, subdomain thật, link có href khớp) → mức 2. Phải tra tới một trường sổ tay ít ai nghĩ tới, hoặc tra ra **lệch** mà vẫn phải kết luận an toàn → mức 3.
24b. **Dấu hiệu nào rõ ràng thì phải tính điểm.** Không để một chỗ sai rành rành nằm nguyên văn trong thân bài mà chạm không được — người học nhìn ra mà chạm không ăn điểm là bài dạy họ rằng mắt họ sai.
24c. **Số dấu hiệu là hệ quả của kịch bản, không phải nút chỉnh độ khó.** Dựng sát thật thì tự ra 2–3 dấu hiệu. Nút chỉnh độ khó là **mồi**: mồi làm bài khó, dấu hiệu làm bài dễ.

    | Mức | Dấu hiệu đáp án | Mồi |
    |---|---|---|
    | 1 | tối đa 3 | ít nhất 2, và không ít hơn số hotspot đúng |
    | 2 | tối đa 3 | ít nhất 2, và không ít hơn số hotspot đúng |
    | 3 | tối đa 2 | 4–6 |

    Không có sàn cho số dấu hiệu: một dấu hiệu quyết định là đủ, và tốt hơn hai dấu hiệu trong đó một cái bịa thêm cho đủ chỉ tiêu. Bài an toàn chỉ cần 2–3 mồi vì người trả lời đúng không chạm gì cả. Vỏ `qr_inspection` chỉ có 2 ô nên không áp được sàn mồi.
24d. **Mỗi bài lừa phải trả lời được "kẻ gian được gì?" bằng một câu**, và bước chiếm lợi đó chính là hotspot đúng. Không trả lời được thì bài chưa phải kịch bản có thật.
24e. **Dựng xong kịch bản rồi mới đặt dấu hiệu**, không bắt đầu từ signal rồi viết vài câu quanh nó. Phép thử: che hết hotspot và note đi, phần còn lại vẫn phải đọc được như một lá thư thật cùng loại, đúng độ dài tự nhiên của kênh đó. Bỏ hotspot ra mà chẳng còn gì thì bài chưa dựng.
24f. **Không lấy người gửi hay tên miền làm đáp án nếu tổ chức bị giả danh không có trong sổ tay** — người học không có gì để đối chiếu. Ngoại lệ: loại tổ chức chắc chắn không dùng mail miễn phí (ngân hàng, toà án, trường, công ty) thì một địa chỉ Gmail/Outlook vẫn là đáp án hợp lệ. Nhóm tự phát hay cá nhân (nhóm từ thiện, người bán lẻ) dùng Gmail là bình thường, phải để làm mồi.
24g. `note` **rõ ràng là đủ, không cần dài**. Nhưng mỗi note phải viết riêng cho bài đó, không chép từ bài khác.
24h. **Dạng hộp thư không được mang thông tin.** Hộp thư tên người (`hong.nguyen@congty.vn`) và hộp thư bộ phận (`ketoan@`, `no-reply@`) phải cùng xuất hiện ở bài lừa lẫn bài an toàn, ở cả ba mức. Nếu một dạng chỉ có ở bài lừa thì nó thành mẹo đoán, khỏi cần đọc bài.
25. Giữ tỉ lệ **lừa : an toàn ≈ 2 : 1 theo chủ đề**; mỗi chủ đề có bài thật gần giống bài lừa để người học không rút ra "cứ gặp X là lừa". Chạy `rf quiz coverage` để thấy chủ đề đang lệch trước khi chọn chủ đề cho bài mới.

## G. Quy trình
26. `rf quiz coverage` → `rf quiz template <kind> > q.json` → điền EN + VI → `rf quiz check --file q.json` → `rf quiz create --file q.json --dry-run` → `rf quiz create` (nháp) → xem trước `/admin/quiz/<id>` và tự làm thử (chọn chữ thường, chọn mồi, chọn đúng) → `rf quiz publish '#số'`. Sửa bài: `rf quiz export '#số' > q.json` → sửa → `rf quiz check '#số' --file q.json` → `rf quiz update '#số' --file q.json`.
27. **Checklist tự rà — agent in ra khi tạo xong:**
    - [ ] hotspot đúng chỉ ở chỗ tự nó đã sai; câu chỉ đáng ngờ vì ngữ cảnh để chữ thường
    - [ ] mọi hotspot có note riêng, viết rõ ràng, đủ 2 locale, có chi tiết cụ thể
    - [ ] bài lừa có mồi, số mồi ≈ số hotspot đúng; mồi ở chỗ hay có dấu hiệu và đủ tinh vi
    - [ ] không brand/domain thật; số điện thoại/tài khoản đã che
    - [ ] tiêu đề không lộ đáp án
    - [ ] `rf quiz check` sạch (không còn `<…>` của template)
    - [ ] đã làm thử trên bản xem trước
