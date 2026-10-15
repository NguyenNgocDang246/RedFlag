# Thiết kế bài mô phỏng (simulate)

**File này không phải thực đơn để chọn món.** Nếu ai cũng soạn bài bằng cách bốc một kiểu có sẵn ở đây, kho bài sẽ hội tụ về vài khuôn quen, và người học làm hết một vòng là miễn nhiễm — đúng thứ cần tránh.

Nó có hai việc:

1. **Cho biết kho đã có gì** → để soạn thứ *chưa có*, không phải để chép lại.
2. **Đưa cách nghĩ ra tình huống mới** → phần quan trọng nhất, đặt ngay dưới đây.

> Luật soạn bài và checklist: [`quiz-authoring.md`](./quiz-authoring.md). Kiểu dữ liệu: [`packages/shared/src/scenarios.ts`](../packages/shared/src/scenarios.ts).
> Nội dung bài nằm trong DB, không có file seed. Xem bài có sẵn: `rf quiz list` → `rf quiz export '#số'`. Soạn bài: `rf quiz template <kind>` → điền → `rf quiz create --file`.

---

## 1. Thang đo độ khó

Độ khó đo bằng **chỗ sai nằm ở đâu**.

| Mức | Chỗ sai nằm ở đâu | Người học phải làm gì |
|---|---|---|
| **1** | Ở kịch bản, hoặc ở tên miền đọc ra được ngay | Đọc kịch bản, hoặc nhìn tên miền một lượt |
| **2** | Vẫn trong bài, nhưng phải đọc từng ký tự hoặc soi từng thành phần | Đọc tên miền từng chữ, xem đuôi tệp, xem đích thật của link, đọc danh sách quyền |
| **3** | Không nằm ở hạ tầng. Người gửi, tên miền, link, tệp đều **thật và đúng** | Hiểu rằng tên miền đúng chỉ chứng minh thư đi qua hạ tầng đó, không chứng minh ai soạn nội dung |

### Mức 1 — nhìn là thấy

Một trong hai thứ, chỉ cần một:

- **Kịch bản ai cũng thuộc:** trúng thưởng, hoàn tiền trời cho, doạ khoá tài khoản, doạ cắt điện, mượn tiền gấp, giả công an hoặc giấy triệu tập, việc nhẹ lương cao, duyệt vay nhanh, đóng phí trước để nhận tiền.
- **Tên miền sai kiểu đọc ra được:** ghép từ khoá (`saomaibank-hotro.com`), đuôi rẻ (`.xyz`, `.top`, `.online`, `.info`), hoặc mail miễn phí đứng tên tổ chức (`quyhocbong@gmail.com`).

**Phép thử:** có kịch bản trong danh sách trên, hoặc nhìn tên miền một lượt là thấy sai.

### Mức 2 — phải soi kỹ

- **Tên miền phải đọc từng ký tự:** chữ giả chữ (`phirnplus.vn` rn thay m, `cl0udbox.com` số 0 thay o), đổi hoặc thêm đuôi (`saomaibank.co`, `saomaibank.com.vn`, `saomaibank.vn.co`).
- **Chỗ sai không nằm ở tên miền:** tệp chèn vào (`.xlsm` đòi bật macro, `.zip`/`.rar` phải giải nén, `.apk`/`.exe` phải chạy), link ẩn, quyền app vượt mức, đòi đọc mã OTP.

**Phép thử:** kịch bản không có trong danh sách mức 1, và chỗ sai chỉ thấy khi đọc từng ký tự hoặc mở ra xem thành phần.

#### Tên miền giả: mức 1 hay mức 2

Chỗ hay gán sai nhất, vì cả hai mức đều là "tên miền sai". Luật phân biệt:

> **Mức 1** nếu tên miền có một thành phần **thừa và đọc được**: một từ khoá ghép vào, một đuôi rẻ, một nhà cung cấp mail miễn phí. Mắt bắt được mà không cần đọc từng chữ.
> **Mức 2** nếu tên miền **không thừa gì**, chỉ sai ở mức ký tự hoặc ở cái đuôi cuối cùng. Phải đọc hết tới dấu `/` đầu tiên mới biết.

| Kiểu | Mức 1 | Mức 2 |
|---|---|---|
| Ghép từ khoá vào tên thật | `saomaibank-hotro.com`, `choxanh-voucher.com`, `cloudbox-mail.info` | — |
| Đuôi rẻ | `telnet-sim.xyz`, `giaonhanh-phi.top` | — |
| Mail miễn phí đứng tên tổ chức | `quyhocbong@gmail.com`, `tuyendung.vinaglobal@outlook.com` | — |
| Tên miền chẳng liên quan gì | `mailvn.top`, `mail-congvu.com` | — |
| Ghép đúng phần tên thật của thương hiệu | — | `giaonhanh-express.vn` khi thương hiệu tên "GiaoNhanh Express" còn domain thật là `giaonhanh.vn` |
| Chữ giả chữ | — | `phirnplus.vn`, `cl0udbox.com` |
| Đổi đuôi | — | `saomaibank.co`, `saomaibank.com.vn` |
| Thêm đuôi sau tên miền thật | — | `saomaibank.vn.co` |

**Đừng làm tên miền giả lố.** `saomaibank.vn.xac-thuc.co` thêm hẳn một từ "xac-thuc", mắt bắt ngay, nên thực tế là mức 1 chứ không phải mức 2. Bản mức 2 đúng là `saomaibank.vn.co`: thêm đúng một đuôi, người đọc tới `.vn` đã thấy quen và dừng lại.

**Link ẩn luôn là mức 2**, bất kể đích lố hay tinh vi, vì phải rê chuột hoặc chạm mới thấy đích.

### Mức 3 — bước kiểm hiển nhiên cho kết quả sạch

Người học tra đúng chỗ mà bài chỉ sẵn, và **mọi thứ đều khớp**: tên miền đúng, người gửi đúng, không tệp lạ, không link ẩn. Dừng ở đây là trả lời sai. Phải đi tiếp một bước nữa.

Mức 3 không phải là "bài không có chỗ sai" — bài nào cũng phải có chỗ sai, nếu không thì kẻ gian chẳng được gì. Mức 3 là **chỗ sai nằm ngoài tầm với của bước kiểm hiển nhiên**.

#### Vì sao đối chiếu sổ tay không làm lộ bài

Sổ tay mở ngay trong lúc làm bài, và nó **có mặt ở mọi bài**, không chỉ ra thương hiệu nào đang liên quan. Vì luôn có mặt nên mở nó ra **không tiết lộ gì về bài đang làm** — nó không phải gợi ý.

Đó là lý do mức 3 dựa được vào sổ tay, trong khi mọi cách khác đều hỏng:

> **Đừng nhét vật đối chiếu vào trong bài.** Thứ duy nhất người học được phép đối chiếu là sổ tay. Mọi dữ liệu so sánh đặt riêng cho một bài — thư trích dẫn kèm hoá đơn lần trước, prompt nêu số tài khoản cũ, một dòng "như mọi lần bạn vẫn trả về…" — đều là **mũi tên chỉ chỗ**. Thấy nó là biết ngay phải so cái gì, nên bài tụt thẳng xuống mức thấp dù thủ đoạn có tinh vi tới đâu.

#### Hai khuôn bài mức 3

**3a — trường ít ai nghĩ tới.** Mọi thứ hiển nhiên đều khớp sổ tay; chỗ sai nằm ở một trường mà không gì trong bài gợi ý là phải tra: `hotlines`, `apps` (tên nhà phát hành), `smsSenders`, `shortCodes`, `paymentAccounts`, `taxCodes`, `legalNames`, `addresses`.

> Hoá đơn từ đúng tên miền nhà cung cấp, không câu nào báo đổi tài khoản, nhưng số tài khoản nhận tiền không phải số sổ tay ghi. Ngoài đời không ai tra số tài khoản — và đó chính là lý do chiêu này ăn tiền thật.

**3b — nối hai dòng sổ tay.** Thông tin trong bài **có** khớp sổ tay, nhưng khớp **nhầm thương hiệu**. Tra một dòng thì thấy "cái này có thật"; phải tra tới dòng thứ hai mới thấy nó không thuộc về bên gửi.

> Thư từ đúng tên miền hãng giao hàng, chữ ký ghi một số tổng đài. Số đó có thật trong sổ tay — nhưng là tổng đài của công ty điện lực.

#### Phép thử mức 3

1. **Phép thử chuỗi kiểm.** Viết ra từng bước người học phải đi. Mức 3 phải có **ít nhất hai bước**, và **bước đầu phải cho kết quả sạch**. Chỉ một bước là ra đáp án thì đó là mức 2.
2. **Phép thử mũi tên.** Bỏ sổ tay ra khỏi đầu rồi đọc lại bài. Nếu có bất cứ chỗ nào trong bài gợi ý phải đi tra cái gì, bài chưa đạt mức 3.

#### Bước chiếm lợi vẫn phải có

Dù hạ tầng sạch tới đâu, kẻ gian vẫn phải lấy được cái gì đó, và **bước chiếm lợi đó chính là hotspot đúng**. Ở mức 3 nó thường là: tiền chuyển vào tài khoản kẻ gian (`PAYMENT_CHANGE`), đóng phí trước (`ADVANCE_FEE`), gõ thông tin vào thư trả lời (`SENSITIVE_REQUEST`), hoặc gọi vào số của kẻ gian (`OFF_CHANNEL`).

Hai bước chiếm lợi **không** lên mức 3 được: bấm link và mở tệp. Link phải có đích, đích là một tên miền soi ra được; tệp thì có đuôi. Cả hai tự tố giác ở bước kiểm hiển nhiên.

#### Dạng hộp thư không được mang thông tin

Hộp thư tên người (`hong.nguyen@congty.vn`) là thứ bị chiếm ngoài đời, nên bài mức 3 hay dùng. Nhưng nếu nó **chỉ** xuất hiện ở bài lừa thì nó thành mẹo đoán: gặp tên người là chọn "lừa đảo", khỏi đọc.

Cả hai dạng — tên người và hộp thư bộ phận (`ketoan@`, `no-reply@`) — phải xuất hiện ở **cả bài lừa lẫn bài an toàn, ở cả ba mức**. Đổi hết sang một dạng chỉ là lật ngược cái mẹo chứ không xoá được nó.

### Kênh thu hoạch không quyết định mức

Mỗi bài có hai trục độc lập, và **chỉ trục hạ tầng quyết định mức**. Kênh thu hoạch (bấm link, mở tệp, **gọi điện**, **gõ vào thư trả lời**, cài app) thì không.

Nên callback phishing và kiểu đòi gõ thẳng thông tin vào thư trả lời **không có mức cố định**:

| Kiểu | Hạ tầng mức 1 | Hạ tầng mức 3 |
|---|---|---|
| **Callback phishing** (không link, chỉ có số để gọi) | Thư từ `choxanh-hotro.com` kèm số lạ, tra sổ tay ra ngay → mức 1 | Yêu cầu chuyển tiền **thật** trên `paynhanh.vn`, số của kẻ gian nằm trong ô lời nhắn → mức 3 |
| **Gõ thông tin vào thư trả lời** | Thư từ `outlook.com` đòi ảnh CCCD → mức 1 | Thư từ đúng địa chỉ đồng nghiệp bị chiếm hộp thư → mức 3 |

Nhưng hai kênh này lại là thứ **làm mức 3 soạn được**: mọi kênh khác đều để lại một tên miền hoặc một tệp để soi, còn callback chỉ cần một số điện thoại và trả-lời-thư thì không cần gì cả.

Lưu ý về số tổng đài: sổ tay có cột `hotlines`, nên một số lạ **tra là ra**. Nhưng tra được không có nghĩa là mức 1 — quyết định là **có gì chỉ cho người học biết phải tra số đó hay không**:

- Thư từ một tên miền đã sai sẵn → người học bắt được ở bước đầu, chẳng bao giờ đi tới số tổng đài → **mức 1** (mức bị chặn bởi đường ngắn nhất).
- Thư từ đúng tên miền trong sổ tay, mọi thứ khác sạch, chỉ số tổng đài là lệch → bước kiểm hiển nhiên cho kết quả sạch, phải tra thêm một trường không ai nhắc tới → **mức 3**.

### Hai điều hay nhầm

- **Thủ đoạn tinh vi hơn không tự động thành mức cao hơn.** Subdomain nhái tinh vi hơn `.xyz`, nhưng cả hai đều là một tên miền sai nằm sẵn trong bài.
- **Lạ không đồng nghĩa với khó.** Một kịch bản chưa ai từng soạn mà domain vẫn là `.xyz` thì vẫn là mức 1. Đa dạng không làm bài khó lên; nó chỉ **tăng xác suất** tìm ra hướng cho bài khó (xem mục 2).

### Bài mỏ neo

| Mức | Bài lừa | Bài an toàn |
|---|---|---|
| 1 | **#272** Trang voucher ChợXanh | **#294** Gói data sắp hết |
| 2 | **#336** Thiết bị mới trên tài khoản xem phim (`phirnplus.vn`) | **#300** App lịch xin quyền |
| 3 | *chưa có* | **#335** Nhà cung cấp đổi tài khoản |

---

## 1b. Độ sát thật: điều kiện cần của mọi mức

Mức chỉ đúng khi kịch bản dựng đủ thật. Bài viết vài ba câu rồi gắn dấu hiệu vào thì **người học trả lời đúng vì bài trông giả, không vì họ nhận ra thủ đoạn**. Viết sơ sài là một dấu hiệu rò rỉ ngoài ý muốn, và dấu hiệu đó luôn nhìn phát thấy. Bài mức 3 dựng sơ sài thành mức 1 mà tác giả không biết.

| Yêu cầu | Nghĩa là | Đối lập cần tránh |
|---|---|---|
| **Đúng cấu trúc của loại tin đó** | Thông báo đổi phí thẻ thật có: chào đúng tên, nêu thay đổi, ngày hiệu lực, ai bị ảnh hưởng, cái gì giữ nguyên, cần làm gì, liên hệ, chân thư | Ba câu rồi hết |
| **Chi tiết cụ thể, số lẻ** | Mã đơn, số tài khoản che bớt, chỉ số công tơ, mã tham chiếu, `612.000đ` chứ không phải `600.000đ` | "một khoản tiền", "tài khoản của bạn" |
| **Có phần không phục vụ bài học** | Vài dòng chẳng liên quan tới dấu hiệu lẫn mồi | Mọi dòng đều là dấu hiệu hoặc mồi, đọc ra ngay là đề thi |
| **Số liệu nhất quán với nhau** | Kỳ ghi chỉ số khớp số kWh, tổng khớp đơn giá, hạn sau ngày gửi | Cộng lại không ra |
| **Văn phong đúng người gửi** | Ngân hàng khác shop, sếp khác phòng nhân sự, bạn bè khác tổng đài | Mọi bài một giọng |
| **Kẻ gian cũng chuyên nghiệp** | Thư lừa thật bây giờ không sai chính tả | Bài mức 2–3 mà còn lỗi chính tả là tự mâu thuẫn |

**Sát thật nghĩa là đúng độ dài tự nhiên của kênh đó, không phải dài hơn.** SMS thật ngắn nên bài SMS ba dòng là đúng; email thông báo của tổ chức thật dài nên email ba dòng là sơ sài.

**Phép thử:** che hết hotspot và note đi, đọc phần còn lại. Nếu nó vẫn như một lá thư thật ai cũng có thể nhận hôm nay thì đạt. Bỏ hotspot ra mà chẳng còn gì thì bài chưa dựng, mới chỉ gắn dấu hiệu.

---

## 1c. Số dấu hiệu và số mồi

Hai luật cứng, đặt trước mọi con số:

> **Dấu hiệu nào rõ ràng thì phải tính điểm.** Không để một chỗ sai rành rành nằm nguyên văn trong thân thư mà chạm không được. Người học nhìn ra mà chạm không ăn điểm là bài dạy họ rằng mắt họ sai.
>
> **Số dấu hiệu không phải nút chỉnh độ khó.** Nó là hệ quả của kịch bản: dựng sát thật thì tự ra 2–3 dấu hiệu, vì lừa thật ngoài đời cũng chỉ chừng đó. Nút chỉnh độ khó là **mồi**.

| Mức | Dấu hiệu đáp án | Mồi |
|---|---|---|
| **1** | tối đa 3 | ít nhất 2, và không ít hơn số hotspot đúng |
| **2** | tối đa 3 | ít nhất 2, và không ít hơn số hotspot đúng |
| **3** | tối đa 2 | 4–6 |

**Không có sàn cho số dấu hiệu.** Một dấu hiệu quyết định là đủ, và tốt hơn hai dấu hiệu trong đó một cái bịa thêm cho đủ chỉ tiêu. Mức 3 ít dấu hiệu hơn không phải vì cố ý cắt bớt, mà vì cả nhóm dấu hiệu hạ tầng biến mất theo định nghĩa.

**Không trộn dấu hiệu khác mức trong cùng một bài.** Một dấu hiệu mức 1 nằm trong bài mức 2 hay 3 sẽ kéo cả bài về mức 1, vì người học ăn điểm bằng đường ngắn nhất.

**Bài an toàn thì khác:** người trả lời đúng không chạm gì cả, vì luồng chơi chỉ mở phần chạm sau khi chọn "lừa đảo". Nên mồi ở bài an toàn chỉ phục vụ người trả lời sai, 2–3 cái là đủ.

**Ngoại lệ theo vỏ:** vỏ `qr_inspection` chỉ có hai ô (áp phích và URL giải mã), nên bài QR nhiều nhất chỉ có 2 hotspot. Không áp được sàn mồi cho vỏ này.

---

## 2. Cách nghĩ ra tình huống mới

Đa dạng không phải là mục tiêu tự thân, và cũng không làm bài khó lên. Lý do cần nó: **bài mức 3 hiếm, nên phải thử nhiều hướng khác nhau mới gặp**. Cứ quanh quẩn vài khuôn cũ thì gần như chỉ ra được mức 1–2, vì mấy khuôn đó đều đã dựa vào một chỗ sai nằm sẵn trong bài. Mở rộng hướng tìm là cách tăng xác suất chạm được tình huống không có chỗ nào sai để soi.

Đừng bắt đầu từ signal rồi đi tìm vỏ bọc — làm vậy sẽ ra lại mấy khuôn cũ. Bắt đầu từ **đời sống thật của người học**, dấu hiệu là thứ nghĩ sau cùng.

1. **Chọn một việc thường ngày người học thật sự làm.** Đóng học phí, nhận lương, gia hạn bảo hiểm, đổi vé máy bay, đặt lịch khám, họp online, nhận hàng, nộp hồ sơ, đăng ký giữ xe tháng…
2. **Ai có lý do chính đáng nhắn cho mình về việc đó?** Trường, công ty, bệnh viện, hãng bay, sàn, ngân hàng, đồng nghiệp, chính mình (thiết bị khác).
3. **Thời điểm nào tin đó đến mà mình không nghi?** Mạnh nhất là **ngay sau khi vừa làm xong việc đó**.
4. **Chỉ tới bước này mới hỏi: thứ nhỏ nhất có thể lệch là gì?** Một số tài khoản, một kỳ hạn, một người nhận, một thao tác thừa so với mọi lần trước.
5. **Kiểm lại:** nếu phải thêm một domain sai mới ra được đáp án thì bài đang ở mức 2; nếu bỏ hết artifact sai mà vẫn trả lời được nhờ đối chiếu quy trình thì đạt mức 3.

### Đa dạng là đa dạng **phương thức**, không phải phương tiện

Đa dạng cần có nằm ở **cách lừa vận hành**, không nằm ở kênh nó đến. Email đang chiếm hơn nửa kho bài và **điều đó đúng** — ngoài đời phishing chủ yếu đi bằng email. Soạn thêm bài QR hay bài `file` chỉ để cho đều số là làm kho bài kém thật đi. Chọn vỏ nào là do tình huống đòi hỏi, không do quota.

Cùng một vỏ email vẫn ra được hàng chục phương thức khác hẳn nhau. Ngược lại, đổi một kịch bản cũ từ email sang SMS thì vẫn là **một phương thức cũ**, không tính là bài mới.

Khi bí, xoay các trục dưới đây — đều là trục về phương thức:

| Trục | Các nấc |
|---|---|
| Cơ chế đánh lừa | giả danh · chiếm tài khoản thật · chen vào việc đang làm dở · lợi dụng thói quen · làm người học tự tìm đến kẻ gian |
| Quan hệ người gửi | tổ chức lạ · tổ chức mình đang dùng · người quen · đồng nghiệp · **chính mình** |
| Thời điểm | trước / đang / **ngay sau** khi người học làm một việc; hoặc định kỳ |
| Loại yêu cầu | bấm link · trả lời · chuyển tiền · cài đặt · cung cấp thông tin · **không yêu cầu gì** |
| Chỗ lệch | nằm trong bài (mức 1–2) · chỉ lộ khi đối chiếu (mức 3) |

Nấc **"không yêu cầu gì"**, **"chính mình"** và **"chiếm tài khoản thật"** gần như chưa được khai thác, và là nơi dễ ra bài mức 3 nhất.

### Phương thức chưa có trong kho

Kho hiện có 68 bài đang xuất bản. Theo thang mới ở mục 1, **chưa có bài lừa nào đạt mức 3** — bài mức 3 duy nhất là #335, và nó là bài an toàn. Đó là khoảng trống lớn nhất. Một số phương thức có thật ngoài đời mà kho chưa đụng tới, phần lớn nằm sẵn ở mức 3:

- **Tài khoản thật bị chiếm** — thư đến từ đúng địa chỉ đồng nghiệp/đối tác, domain đúng, không có gì sai để soi.
- **Chen vào chuỗi mail đang trao đổi dở** — trích đúng nội dung thật phía dưới.
- **Người học tự tìm đến kẻ gian** — tra số tổng đài trên công cụ tìm kiếm rồi gọi nhầm số của kẻ gian.
- **Email vô hại trước, cuộc gọi sau** — bản thân thư không có dấu hiệu nào.
- **Hoá đơn đúng, số tiền lệch rất nhỏ** so với lần trước.
- **Đổi thông tin ngay sát kỳ thanh toán**, lợi dụng thói quen.
- **Nhờ người quen thật chuyển tiếp hộ**, người đó không biết mình đang tiếp tay.
- **Thông báo xác thực dồn dập** tới mức bấm đồng ý cho xong.
- **QR dán đè** lên QR thật ở nơi công cộng.
- **Lợi dụng dịch vụ hợp pháp** — yêu cầu chuyển tiền thật trên ví, tài liệu thật được chia sẻ, biểu mẫu của chính dịch vụ. Đây là định nghĩa của mức 3, xem mục 1.
- **Link đúng domain thật nhưng tham số bị sửa** để chuyển hướng đi nơi khác.

Chạy `rf quiz coverage` để xem cân bằng lừa/an toàn theo chủ đề.

---

## 3. Phương thức đã dùng — để tránh lặp

Danh sách này là **thứ đã có rồi**. Trùng một dòng ở đây không sai luật và cũng không tự động dễ hơn — chỉ là bài mới gần như không thêm được gì cho kho, nên hãy đổi góc trước khi soạn. Cột "vỏ" chỉ ghi nơi phương thức đó đã xuất hiện, không phải ràng buộc — và chuyển một dòng ở đây sang vỏ khác vẫn là phương thức cũ.

| Phương thức đã có | Vỏ đã dùng | Mức thực tế |
|---|---|---|
| Trang đăng nhập giả | web | 1, hoặc 2 nếu tên miền phải đọc từng ký tự |
| Link chia sẻ tài liệu | email | 2 |
| Email dạng ảnh, domain lạ | email | 1 |
| Hoá đơn lạ kèm số gọi lại | email, web | 1 (tên miền ghép từ khoá) |
| Đòi mã xác minh qua SMS | sms | 2 |
| Doạ "có người biết mật khẩu" | email | 2 |
| Link rút gọn giấu đích | email | 2 |
| Subdomain / đổi đuôi tên miền | sms, email, web | 2 |
| Chữ giả chữ: `rn` thay `m`, `l` thay `I`, số `0` thay `O` | email, web, sms | 2 |
| Nhập OTP trên trang giả | web, sms | 2 |
| Tệp .html/.zip/.xlsm | file, email | 2 |
| QR dẫn domain nhái | qr | 1 (đuôi rẻ) |
| OAuth xin quyền quá mức | oauth | 2 |
| App ngoài store, quyền trợ năng | app | 2 |
| Đổi tài khoản nhận tiền, BEC giả sếp | email, chat | 1 nếu người gửi là mail miễn phí, 2 nếu đổi đuôi tên miền |
| Kéo sang Telegram/Zalo | chat, sms | 1 |
| Trúng thưởng, hoàn tiền | sms, email | 1 |
| Doạ khoá tài khoản, cắt điện | email, sms | 1 |
| Việc nhẹ lương cao, duyệt vay nhanh | chat, email | 1 |
| Giả công an, giấy triệu tập | chat, email | 1 |
| "Con đổi số mới", bạn mượn tiền | chat, sms | 1 |

Cột "mức thực tế" đã chấm lại theo thang mới ở mục 1. Lưu ý phần lớn phương thức rơi về **mức 1**, vì chúng đều để lại một tên miền đọc ra được; muốn lên mức 2 thì tên miền phải sai ở mức ký tự, muốn lên mức 3 thì không được có tên miền sai nào.

Chi tiết từng bài: `rf quiz list` rồi `rf quiz export '#số'`.

---

## 4. Các vỏ (kind) có sẵn

| `kind` | Vỏ mô phỏng | Shell |
|---|---|---|
| `email_inspection` | Hộp thư kiểu Gmail (người gửi, địa chỉ, tiêu đề, thân, tệp đính kèm) | `shells/email.tsx` |
| `sms_inspection` | Tin nhắn SMS (brandname + bong bóng tin) | `shells/phone.tsx` |
| `chat_inspection` | Khung chat (tên liên hệ + bong bóng hai chiều) | `shells/phone.tsx` |
| `web_inspection` | Trình duyệt (thanh URL + trang) | `shells/browser.tsx` |
| `qr_inspection` | Áp phích + URL giải mã sau khi "quét" | `shells/phone.tsx` |
| `file_inspection` | Cửa sổ mở tệp ("Enable content") | `shells/desktop-apps.tsx` |
| `app_consent` | Màn hình cài app / quyền | `shells/desktop-apps.tsx` |
| `oauth_consent` | Màn hình "Cho phép ứng dụng truy cập" | `shells/desktop-apps.tsx` |

`popup` có trong enum nhưng chưa có shell — bỏ qua. Mỗi vị trí trong vỏ (người gửi, URL, link, tệp, quyền…) **lúc là dấu hiệu, lúc là mồi** tuỳ bài; đừng để một vị trí luôn là đáp án.

---

## 5. Bảng tín hiệu

Tín hiệu là dữ liệu trong DB — xem danh sách hiện có bằng `rf signal list`. Admin thêm được signal mới, nên bảng này không phải giới hạn.

| Mã | Tên | Bản chất | Hay nằm ở |
|---|---|---|---|
| `LOOKALIKE_DOMAIN` | Tên miền giả gần giống | Địa chỉ web trông gần đúng nhưng sai một chút | URL, địa chỉ email, link, QR |
| `SENDER_MISMATCH` | Người gửi không khớp | Tên hiển thị và địa chỉ thật không khớp | địa chỉ người gửi |
| `HIDDEN_LINK` | Link ẩn khác chữ hiển thị | Chữ link ghi một nơi, thực tế trỏ nơi khác | link, nút bấm |
| `URGENCY` | Tạo cảm giác khẩn cấp | Thúc làm ngay hoặc doạ khoá/phạt | câu hạn chót |
| `SENSITIVE_REQUEST` | Đòi thông tin nhạy cảm | Xin OTP, mật khẩu, số thẻ, giấy tờ | câu yêu cầu, ô nhập |
| `SUSPICIOUS_ATTACHMENT` | File đính kèm lạ | Tệp bất ngờ bị thúc mở | .html/.zip/.rar/.xlsm/.apk |
| `GENERIC_GREETING` | Lời chào chung chung | Xưng "quý khách" thay vì tên thật | dòng chào đầu thư |
| `SPELLING_ERRORS` | Sai chính tả, dịch máy | Câu chữ lủng củng | bất cứ đoạn nào |
| `TOO_GOOD` | Quá tốt để là thật | Trúng thưởng, hoàn tiền không rõ lý do | tiêu đề, nội dung |
| `OFF_CHANNEL` | Kênh liên hệ lạ | Dẫn sang chat riêng/SĐT lạ | số gọi lại, link Telegram |
| `MISSING_DETAILS` | Thiếu thông tin cụ thể | Không nêu mã đơn, số tài khoản, vụ việc | thân thông báo |
| `UNTRUSTED_APP` | Ứng dụng không đáng tin | Cài ngoài store, quyền quá mức | nhà phát triển, quyền |
| `PAYMENT_CHANGE` | Đổi thông tin thanh toán | Bất ngờ đổi số tài khoản nhận tiền | câu "chuyển vào tài khoản mới" |
| `ADVANCE_FEE` | Đòi đóng phí trước | Trả một khoản nhỏ để nhận khoản lớn hơn hoặc lấy lại thứ gì đó | phí giải ngân, phí xét hồ sơ, phí ship quà, thuế hải quan |

---

## 6. Thư viện mồi (decoy)

Mồi là tay nghề, không phải kịch bản, nên dùng lại thoải mái. Mồi **bắt buộc** ở bài lừa, số mồi ≈ số hotspot đúng, và phải đặt ở chỗ **hay có dấu hiệu** nhưng ở bài này lại đúng:

| Vị trí | Mồi tốt | Vì sao bình thường |
|---|---|---|
| Tên hiển thị người gửi | "Dịch vụ tài khoản", tên brand | Thư thật cũng để tên bộ phận; tên không chứng minh gì |
| Địa chỉ email | đúng domain trong sổ tay | Khớp sổ tay thì an toàn; đây mới là bằng chứng |
| Dòng nhắc OTP | "Không chia sẻ OTP cho bất kỳ ai" | Thư/trang thật đều có; nó cảnh báo chứ không xin gì |
| Số hotline | số tổng đài thật trong sổ tay | Số đúng sổ tay là bình thường |
| Tệp đính kèm | `.pdf` / `.jpg` đúng ngữ cảnh | Định dạng xem được, không chạy mã |
| Mã tham chiếu | mã đơn khớp việc vừa làm | Thông tin cá nhân hoá đúng là dấu hiệu thật |
| Quyền app | quyền đúng chức năng | Hợp lý với công dụng app |

Note mồi (2–3 câu): ① vì sao chỗ này bình thường ở đây; ② vì sao nó **không chứng minh gì** nếu kẻ gian chép được; ③ **cái gì mới là bằng chứng**.

---

## 7. Bài an toàn

Giữ tỉ lệ **lừa : an toàn ≈ 2 : 1 theo chủ đề**, và mỗi chủ đề nên có bài thật gần giống bài lừa để người học không rút ra "cứ gặp X là lừa". Bài an toàn: không có signal đáp án, mọi hotspot đều là mồi.

**Đừng viết bài an toàn bằng đầu óc kẻ gian.** Thư thật không tự biện hộ. Những câu như "chúng tôi không bao giờ hỏi mật khẩu", "bạn không cần làm gì thêm", "buổi phỏng vấn hoàn toàn miễn phí" chỉ xuất hiện khi người soạn đang lo người học nghi mình — và nếu chúng chỉ có ở bài an toàn thì thành mẹo đoán đáp án. Ngoài đời thì ngược lại: thư lừa rất hay chép đúng mấy câu đó cho giống thật.

---

## 8. Checklist

Đầy đủ ở [§G `quiz-authoring.md`](./quiz-authoring.md). Riêng về đa dạng và độ khó:

- [ ] **Phương thức** không trùng bảng ở mục 3. (Đổi kênh cho một phương thức cũ không tính là bài mới.)
- [ ] Vỏ được chọn vì tình huống đòi hỏi, không vì cho đủ số bài mỗi kênh.
- [ ] Mức gán đúng theo mục 1 — không nhầm "thủ đoạn tinh vi" với "mức cao", và nhớ mức bị chặn bởi đường ngắn nhất.
- [ ] **Phép thử mức 3:** tra mọi tên miền trong bài vào sổ tay; tất cả khớp mà bài vẫn là lừa thì mới là mức 3.
- [ ] Không trộn dấu hiệu khác mức trong cùng một bài.
- [ ] Mọi chỗ sai rành rành đều là hotspot và đều tính điểm (mục 1c).
- [ ] Số mồi đạt sàn của mức (mục 1c), và mồi trải ở nhiều vị trí khác nhau.
- [ ] **Kẻ gian được gì?** Trả lời được bằng một câu, và bước chiếm lợi đó là hotspot đúng.
- [ ] **Phép thử che hotspot:** che hết hotspot và note đi, phần còn lại vẫn đọc như một lá thư thật cùng loại (mục 1b).
- [ ] Bài an toàn không có câu tự biện hộ.
- [ ] Không lấy người gửi làm đáp án nếu tổ chức bị giả danh không có trong sổ tay, trừ loại tổ chức chắc chắn không dùng mail miễn phí.

---

## 9. Tham chiếu

- [`docs/quiz-authoring.md`](./quiz-authoring.md) — luật soạn bài + checklist đầy đủ + quy trình CLI.
- [`packages/shared/src/scenarios.ts`](../packages/shared/src/scenarios.ts) — `QuizKind`, `Span`, interface từng vỏ.
- [`packages/shared/src/scenario-rules.ts`](../packages/shared/src/scenario-rules.ts) — luật kiểm hotspot/mồi mà `rf quiz check` chạy.
- [`apps/api/src/cli/templates.ts`](../apps/api/src/cli/templates.ts) — bộ sinh khung JSON cho `rf quiz template <kind>`.
- [`apps/api/src/cli/data.ts`](../apps/api/src/cli/data.ts) — toàn bộ lệnh data CLI (quiz, signal, category, brand).
