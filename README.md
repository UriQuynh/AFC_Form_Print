# AFC Form Print — Phiếu xuất kho Giấy A.F.C

Webapp nhập liệu và in chứng từ xuất kho cho **Công ty TNHH Giấy A.F.C** (Phương án 2 — Template in ấn: Webapp + Google Sheets).

- **Nhập 1 lần** trên form web (máy tính hoặc điện thoại) → lưu vào **Google Sheets** của A.F.C.
- **In đúng mẫu**: Phiếu xuất kho A4 **BM-04/KH-SX** (QR góc phải), Tem KCS A5 **BM-18/BP.KCS**, Phiếu chất lượng **COA** A5, **Biên bản giao nhận** A4.
- **Quét QR** trên phiếu xuất kho → mở tem KCS + COA của các cuộn trong phiếu để in.
- **Dữ liệu xuất kho hằng ngày** → báo cáo sản lượng theo ngày / sản phẩm / khách hàng.
- **Tài xế – xe – chuyến** → báo cáo số chuyến và tính lương tài xế.
- **Danh mục** (sản phẩm, khách hàng, tài xế, xe, kho/máy, ca, nhân viên) sửa **trực tiếp trên sheet**, form tự cập nhật dropdown.

Không cần máy chủ riêng: toàn bộ chạy trên **Google Apps Script** gắn với Google Sheet.

---

## 1. Cấu trúc Google Sheet

Chạy menu **AFC Form → Cài đặt / cập nhật cấu trúc sheet** sẽ tự tạo các sheet sau (chạy lại nhiều lần an toàn, không xoá dữ liệu):

| Sheet | Vai trò | Ai sửa |
|---|---|---|
| `Nhập PXK` | Lập phiếu **ngay trên Google Sheet**: ô nhập có dropdown, nút **IN PHIẾU / + PHIẾU MỚI / MỞ PHIẾU THEO SỐ** (xem mục 4) | Nhân viên nhập |
| `PhieuXuat` | 1 dòng = 1 phiếu xuất kho = 1 chuyến xe (số phiếu, ngày, khách, kho, xe, tài xế, tổng kg, trừ bì, thực xuất, trạng thái…) | Form ghi |
| `ChiTiet` | 1 dòng = 1 cuộn / pallet (mã cuộn, mã SP, kg, số bánh, ca, máy, ngày SX, chỉ tiêu KCS…) | Form ghi |
| `BaoCao` | Bảng QUERY tự cập nhật: sản lượng theo ngày, theo SP, theo khách, tài xế & lương. Sửa **Từ ngày / Đến ngày** ở ô B2:B3 | Tự động |
| `DM_SanPham` | Mã SP (vd `K76/450`), loại giấy, khổ, định lượng, đơn vị **CUỘN/PALLET**, trừ bì kg/pallet | Nhập tay |
| `DM_KhachHang` | Đơn vị nhận hàng, địa chỉ giao | Nhập tay (form tự thêm khách mới) |
| `DM_TaiXe` | Tài xế, SĐT, Công ty/Thuê ngoài, xe mặc định, **đơn giá/chuyến**, **đơn giá/tấn** | Nhập tay |
| `DM_Xe` | Biển số, loại xe, sở hữu, tài xế mặc định | Nhập tay |
| `DM_Kho` / `DM_Ca` | Kho/máy (M1, M2, M3), ca (C1, C2, C3) | Nhập tay |
| `DM_NhanVien` | Người lập phiếu, thủ kho, KCS | Nhập tay |
| `CauHinh` | Tên công ty, mã biểu mẫu, dòng nguồn, số dòng tối thiểu của phiếu, logo… | Nhập tay |

Ghi chú:

- Code **không bao giờ ghi vào sheet không do nó tạo** (vd sheet mẫu `pxk` của bạn). Lưu ý: Google Sheets so tên sheet không phân biệt hoa/thường, nên đừng đặt tên sheet riêng của bạn là "Nhập PXK".
- Webapp đọc theo **tên cột** ở dòng 1, nên có thể đổi thứ tự cột hoặc thêm cột phụ. Không đổi tên cột.
- Cột **Ngừng dùng** (checkbox) ở danh mục: để trống = đang dùng; tick để ẩn khỏi dropdown nhưng vẫn giữ lịch sử. Dòng mới gõ trực tiếp trên sheet tự động là "đang dùng".
- Công thức sheet `BaoCao` tự theo ngôn ngữ bảng tính (dấu `,` hoặc `;`), không cần sửa tay.
- Sheet `PhieuXuat` / `ChiTiet` đã có dropdown (data validation) lấy từ danh mục, nên khi sửa trực tiếp trên sheet vẫn chọn được.
- **Huỷ phiếu** không xoá dòng: trạng thái chuyển `Đã huỷ`, không tính vào báo cáo, số phiếu và mã cuộn được dùng lại.

## 2. Quy tắc tự động

| Mục | Quy tắc |
|---|---|
| Số phiếu | Gợi ý `<STT>/<tháng>` (vd `231/11`), đánh lại từ 1 mỗi tháng (đổi sang theo năm: `CauHinh.SO_PHIEU_RESET = NAM`). Sửa tay được; chặn trùng trong năm. |
| Mã cuộn / pallet | `<Máy>-<ddMMyy ngày SX>-<Ca>-<STT 3 số>`, vd `M2-141126-C2-001`. STT tiếp nối theo máy + ngày + ca trên toàn bộ dữ liệu. Nhập tay được (vd mã in sẵn); chặn trùng. |
| Tổng | Tổng kg, số cuộn/pallet; pallet trừ bì theo `DM_SanPham` (vd 12 kg/pallet) → **Thực xuất**. |
| Danh mục | Gõ khách / xe / tài xế mới trên form → tự thêm vào sheet danh mục khi lưu. |
| Lương tài xế | `số chuyến × đơn giá/chuyến + số tấn thực xuất × đơn giá/tấn + phụ cấp chuyến` (1 phiếu = 1 chuyến). Đơn giá ở `DM_TaiXe`, phụ cấp nhập trên từng phiếu. |

## 3. Cài đặt (lần đầu, ~10 phút)

### Cách A — Dán code thủ công (không cần cài gì)

1. Mở Google Sheet của A.F.C → **Tiện ích mở rộng → Apps Script**.
2. Trong trình soạn thảo Apps Script, tạo các file đúng **tên** như thư mục [`src/`](src/) (bỏ phần đuôi):
   - File **Script** (`.gs`): `Config`, `Db`, `Api`, `Setup`, `Code`, `Pxk`, `PxkButtons`
   - File **HTML**: `Index`, `Print`, `Tem`, `css_App`, `css_Print`, `js_Common`, `js_Form`, `js_Print`, `js_Tem`, `lib_Qr`, `lib_Logo`
   - Dán nội dung tương ứng. Bật hiển thị `appsscript.json` (Cài đặt dự án → *Hiện tệp kê khai "appsscript.json"*) và dán nội dung [`src/appsscript.json`](src/appsscript.json).
3. Chọn hàm `setupSheets` → **Chạy** → cấp quyền. Sheet được tạo đủ cấu trúc + danh mục mẫu.
   (Tuỳ chọn) chạy `seedDemoData` để có 2 phiếu mẫu 230/11 và 225/11 để thử in.
4. **Triển khai → Tùy chọn triển khai mới → Ứng dụng web**
   - *Thực thi với tư cách*: **Người dùng truy cập ứng dụng web**
   - *Người có quyền truy cập*: **Bất kỳ ai có Tài khoản Google**
   - Bấm Triển khai, copy **URL ứng dụng web** (`.../exec`).
5. Tải lại Google Sheet → menu **AFC Form → Mở form nhập liệu**. Lưu URL vào bookmark / màn hình chính điện thoại.
6. Mở link web app **một lần** (để nút IN PHIẾU trên sheet ghi nhớ đúng link `/exec`), hoặc dán link đó vào sheet `CauHinh`, khoá `WEB_APP_URL`.

### Cách B — Đẩy code bằng clasp (cho dev)

```bash
npm install -g @google/clasp
```

```bash
clasp login
```

Lấy Script ID ở Apps Script → Cài đặt dự án, rồi:

```bash
cp .clasp.json.example .clasp.json   # sửa scriptId
```

```bash
npm run push
```

Sau đó làm tiếp bước 3–5 của Cách A. Mỗi lần cập nhật code, đẩy code rồi cập nhật bản triển khai hiện có (giữ nguyên URL web app):

```bash
npm run push
```

```bash
clasp update-deployment <DEPLOYMENT_ID> --description "mô tả thay đổi"
```

`<DEPLOYMENT_ID>` xem bằng `clasp list-deployments` (dòng có `@<số phiên bản>`, không phải `@HEAD`). Sau khi đổi cấu trúc sheet trong code, chạy lại menu **AFC Form → Cài đặt / cập nhật cấu trúc sheet** (mất khoảng 1 phút, chỉ bấm 1 lần).

### Phân quyền

Webapp chạy **với tài khoản của người dùng**, nên quyền = quyền chia sẻ Google Sheet:

- Nhân viên **Kế hoạch / Kho** (lập & sửa phiếu): chia sẻ Sheet quyền **Người chỉnh sửa**.
- Người chỉ cần **quét QR xem / in tem** (KCS, tài xế): quyền **Người xem** là đủ.
- Người không được chia sẻ Sheet sẽ không mở được dữ liệu, kể cả có link.

Lần đầu mỗi người mở form, Google hỏi cấp quyền — bấm cho phép.

## 4. Sử dụng hằng ngày

### Cách 1 — Lập phiếu ngay trên Google Sheet (sheet `Nhập PXK`, máy tính)

1. Bấm **+ PHIẾU MỚI** → số phiếu kế tiếp, ngày hôm nay, kho, người lập được điền sẵn.
2. Điền các ô nền vàng (đều có dropdown; gõ tên mới vẫn được, khi lưu sẽ tự thêm vào danh mục). Chọn **Biển số xe** → tự điền Xe (Công ty/Thuê ngoài) và tài xế mặc định; chọn **Tài xế** → tự điền SĐT.
3. Bảng hàng (dòng 10–69): mỗi dòng 1 cuộn/pallet. Dòng đầu chọn **Mã SP, Ca SX** (Máy để trống = kho xuất); các dòng sau chỉ cần gõ **kg** (và số bánh nếu là pallet) — Mã SP / Ca / Máy tự lấy theo dòng trên. Có thể dán cả cột kg từ Excel. Chỉ tiêu KCS nhập ở cột H→O (để trống thì tem in trống).
4. Bấm **IN PHIẾU (lưu + in)** → phiếu được lưu vào `PhieuXuat` + `ChiTiet`, sheet ghi lại số phiếu, ID, mã cuộn, rồi mở trang in A4 (có link tem KCS/COA và biên bản giao nhận). Nếu trình duyệt chặn cửa sổ mới, bấm nút trong hộp thoại.
5. Sửa phiếu đã lưu: **MỞ PHIẾU THEO SỐ** → sửa → **IN PHIẾU** lần nữa (cập nhật đúng phiếu đó, không tạo phiếu mới).

Nút bấm chỉ chạy trên trình duyệt máy tính; cùng các lệnh có ở menu **AFC Form → Nhập PXK: …**. Trên điện thoại dùng web app (Cách 2).

### Cách 2 — Web app (máy tính hoặc điện thoại)

1. **Lập phiếu**: số phiếu tự gợi ý → chọn ngày, kho, khách, xe (tài xế tự điền theo xe), người lập.
2. **Thêm mặt hàng**: chọn mã SP, ca, máy, ngày SX → dán số kg từng cuộn vào ô nhập nhanh
   (vd `544 540 557 552`, hoặc dán 1 cột từ Excel; pallet: `1154/12` hoặc 2 cột *kg ⇥ số bánh*) → **Thêm cuộn**.
3. Nút **KCS** trên từng dòng: nhập độ dày, độ ẩm, độ bục, nén vòng, tách lớp, Cobb… (*Áp dụng cho cả nhóm* nếu giống nhau).
4. **Lưu & in phiếu** → mở phiếu A4 để in. Từ phiếu: **Tem KCS + COA (A5)**, **Biên bản giao nhận**.
5. Tab **Danh sách**: tìm, sửa, in lại, huỷ phiếu. Tab **Báo cáo**: sản lượng & lương tài xế theo khoảng ngày, nút **Xuất bảng lương ra Sheet**.

**Thiết lập máy in**: khổ **A4** (phiếu, biên bản) hoặc **A5** (tem/COA), lề **Không có**, tắt **Đầu trang và chân trang**.

Form tự lưu **bản nháp** trên máy (mất mạng / lỡ tắt tab vẫn khôi phục được). `Ctrl/⌘ + S` để lưu.

## 5. Bản quyền / chống sao chép

> **Sự thật cần nói trước:** Google **không có cách chặn tuyệt đối** việc sao chép Apps Script. Người có quyền **Editor** trên Sheet đọc được toàn bộ mã và có thể xoá đoạn kiểm tra. Khoá bản quyền này là **rào cản thực tế**: bản sao (*File → Make a copy*) và bản clone mã sang dự án khác sẽ chạy ra **"chưa được cấp phép"** — không ghi được dữ liệu, web app không mở được, kèm thông báo liên hệ SOLVIQ. Không hơn.

### 5.1 Cách hoạt động

- **SOLVIQ giữ khoá riêng Ed25519** (ngoài repo). **Mã kích hoạt** của một bảng tính = chữ ký Ed25519 trên `AFC-LICENSE-V1:<ID bảng tính>` (ID là đoạn giữa `/d/` và `/edit` trong URL Sheet). Mã chỉ đúng cho **đúng ID đó**.
- Trong `src/License.gs` chỉ có **khoá công khai**: đủ để *kiểm* chữ ký, không đủ để *tạo* mã. Kho mã nguồn không chứa bí mật nào.
- **Kích hoạt** (menu **AFC Form → Bản quyền → Kích hoạt bản quyền**): hỏi xác nhận → nhập mã → mã đúng thì ghi `LICENSE_SSID`, `LICENSE_CODE`, `LICENSE_AT`, `LICENSE_BY` vào **Script Properties** (Cài đặt dự án → Thuộc tính tập lệnh).
- Mỗi lần chạy, code kiểm lại: `LICENSE_SSID` phải **trùng ID bảng tính đang chạy** *và* chữ ký trong `LICENSE_CODE` phải hợp lệ cho ID đó. Tự gõ `LICENSE_SSID` bằng tay không đủ — vẫn cần mã SOLVIQ ký.
- **Chưa cấp phép thì:**
  - `savePhieu`, `cancelPhieu`, `exportDriverReport`, `setupSheets`, `seedDemoData`, `pxkSave_`/IN PHIẾU và mọi ghi xuống sheet (`appendObjects_`, `updateRow_`, `deleteRows_`) ném lỗi tiếng Việt; `getMasterData`, `getPhieu`, `listPhieu`, `getReport`, `getNextSoPhieu` cũng bị chặn.
  - `doGet` trả trang **"Bản sao chưa được cấp phép"** (không có dữ liệu, không có form).
  - Menu **AFC Form** chỉ còn **Bản quyền** (+ một thông báo ngắn); nút trên sheet `Nhập PXK` báo "chưa được cấp phép"; `onEdit` không tự điền.
- **Gỡ kích hoạt** (chỉ chủ sở hữu bảng tính): xoá 4 thuộc tính trên — dùng khi bàn giao / chuyển bảng tính.
- Chi phí: kiểm chữ ký bằng BigInt ~ vài chục ms mỗi lần gọi (kết quả được nhớ trong 1 lần chạy).

### 5.2 Vì sao chữ ký Ed25519 (và các phương án đã cân nhắc)

Phía Apps Script **không được chứa bí mật**, nên không thể tự kiểm HMAC với khoá bí mật.

| Phương án | Ưu | Nhược |
|---|---|---|
| (a) Nhúng sẵn `SHA-256(ID + ':' + mã)` cho từng khách vào `License.gs` | Đơn giản, ngắn gọn | Mỗi khách / mỗi lần chuyển sheet phải **sửa và đẩy lại mã**; danh sách hash nằm trong mã |
| **(b) Chữ ký Ed25519 — ĐÃ CHỌN** | Mã nguồn **giống nhau cho mọi khách**; cấp mã mới = chạy 1 lệnh, **không đụng mã**; kho mã không có bí mật; không brute-force được | Mã dài (~104 ký tự, dán vào hộp thoại); phải tự cài bước kiểm chữ ký (~80 dòng BigInt trong `License.gs`, đã đối chiếu test với `crypto` của Node) |
| (c) Hỏi máy chủ SOLVIQ mỗi lần chạy | Thu hồi được từ xa | Cần `UrlFetchApp` → phải **mở rộng `oauthScopes`** + dựng máy chủ + phụ thuộc mạng. Không làm |

### 5.3 Thiết lập khoá (SOLVIQ làm 1 lần)

```bash
node tools/license-key.mjs init
```

Sinh cặp khoá, lưu **khoá riêng** vào `~/.solviq/afc-license-private.pem` (quyền 600; đổi chỗ bằng `AFC_LICENSE_KEY_FILE`, hoặc đưa nội dung PEM qua `AFC_LICENSE_PRIVATE_KEY`) và ghi **khoá công khai** vào dòng `PUBKEY` của `src/License.gs`. **Sao lưu file khoá riêng ở nơi an toàn, không commit** (`.gitignore` đã chặn `*.pem`). Mất khoá riêng = không cấp mã mới được; đổi khoá = mọi mã đã cấp mất hiệu lực. Commit `src/License.gs` sau khi `init`.

> Khi `PUBKEY` còn trống (chưa chạy `init`), bản mã tự **khoá hết** và báo "chưa được cấu hình khoá bản quyền" — chủ ý, để không lỡ giao bản không có khoá.

### 5.4 Kích hoạt cho khách / bảng tính mới

1. Lấy **ID bảng tính** từ URL Sheet của khách.
2. SOLVIQ cấp mã: `node tools/license-key.mjs <ID>` → in ra mã dạng `ABCD-EFGH-…`. (Kiểm lại: `node tools/license-key.mjs verify <ID> <mã>`.)
3. Dán mã nguồn vào dự án Apps Script gắn với Sheet (Cách A/B ở mục 3).
4. Mở Sheet → menu **AFC Form → Bản quyền → Kích hoạt bản quyền** → xác nhận → dán mã. Menu đầy đủ hiện ra.
5. Sau đó mới **Cài đặt / cập nhật cấu trúc sheet** (lệnh này cũng cần cấp phép).

**Sheet AFC đang chạy:** sau khi đẩy bản có khoá, sheet sẽ bị khoá đến khi kích hoạt. Thứ tự an toàn: `init` → cấp mã cho ID Sheet AFC → `clasp push` → mở Sheet, **Kích hoạt** ngay → tải lại trang. Triển khai web app lại (phiên bản mới) để `doGet` dùng mã mới.

### 5.5 Chuyển sheet / bản sao hợp lệ

Khi khách xin bản sao hợp lệ (đổi Sheet, nhân bản sang chi nhánh…): họ gửi **ID bảng tính mới** → SOLVIQ cấp mã mới cho ID đó (bước 2 ở trên) → họ dán vào menu Kích hoạt trên bản sao. **Không phải đổi mã nguồn.** Bảng tính cũ có thể **Gỡ kích hoạt** nếu thôi dùng.

### 5.6 Giới hạn còn lại (đừng hứa hơn)

- **Editor đọc được mã** (Tiện ích mở rộng → Apps Script) và có thể xoá `requireLicense_()`, sửa `licenseStatus_()` thành luôn `ok`, hoặc thay `PUBKEY` bằng khoá của họ rồi tự ký. Khoá này chặn người sao chép *thông thường*, không chặn người có kỹ năng và có quyền Editor.
- **Dữ liệu** trong Sheet vẫn sao chép được (chỉ *chức năng* của mã bị khoá).
- Mã kích hoạt nằm trong Script Properties — Editor của bảng tính gốc đọc được; nhưng mã chỉ đúng cho **ID gốc**, không kích hoạt được bảng tính khác.
- **Script Properties có được sao chép khi *Make a copy* không?** Tài liệu Google không nói rõ (đã tìm, không có nguồn xác nhận). Thiết kế **không phụ thuộc** vào điều đó: nếu thuộc tính không được sao chép → bản sao trống → bị chặn; nếu được sao chép → `LICENSE_SSID` lệch ID mới → bị chặn (có test cho cả hai). Nên **tự kiểm bằng 1 bản sao thử** trước khi giao.
- `onOpen`/`onEdit` là *simple trigger*. Chúng chỉ cần `PropertiesService` (không cần thêm quyền). Nếu môi trường nào đó không cho đọc Properties trong trigger (trạng thái `error`), menu / tự điền vẫn hiện đầy đủ — nhưng **mọi thao tác ghi vẫn kiểm lại** khi chạy, nên không thành lỗ hổng ghi dữ liệu.
- Không có thu hồi từ xa: mã đã cấp đúng ID là dùng được mãi (trừ khi đổi khoá, làm mất hiệu lực tất cả).
- Liên hệ hiển thị là `LICENSE.CONTACT` (hiện là `SOLVIQ`) trong `src/License.gs` — sửa thành email / SĐT thật của SOLVIQ trước khi giao.

### 5.7 Biện pháp phụ (làm tay trên Google Drive, không đụng `oauthScopes`)

Mở Sheet → **Chia sẻ** → biểu tượng **bánh răng ⚙ (Cài đặt)** ở góc trên bên phải hộp thoại:

1. **Bỏ tick "Người xem và người nhận xét có thể xem tuỳ chọn tải xuống, in và sao chép"** — Viewer/Commenter không còn *Make a copy / Tải xuống / In*. Viewer vốn không thấy mã Apps Script.
2. **Bỏ tick "Biên tập viên có thể thay đổi quyền và chia sẻ"** — chỉ chủ sở hữu mới mời thêm người / đổi quyền.
3. **Chia sẻ nhân viên ở quyền Người xem** khi họ chỉ cần xem/in lại; chỉ cấp **Biên tập viên** cho người thật sự nhập liệu (Editor vẫn *Make a copy* và đọc mã được — hai tuỳ chọn trên không chặn Editor).
4. Cấp quyền cho từng email, tránh "Bất kỳ ai có đường liên kết".

*Tuỳ chọn nâng cao (không bật mặc định):* có thể viết thêm hàm `lockSharing()` dùng **Drive nâng cao** để đặt hai cờ trên bằng mã — việc đó cần **mở rộng `oauthScopes` sang `drive`**, nên **không** thêm vào `src/appsscript.json`; chỉ làm khi SOLVIQ chấp nhận quyền rộng hơn.

*Hướng nâng cao:* giữ mã ở **dự án / web app riêng của SOLVIQ** (chạy "Execute as: Me") để khách không có mã trong Sheet của họ. Đổi lại kiến trúc thay đổi lớn (dữ liệu đi qua tài khoản SOLVIQ, cần ủy quyền truy cập Sheet khách). **Thư viện Apps Script** không che được mã với người được cấp quyền dùng thư viện (người dùng thư viện cần ít nhất quyền xem dự án thư viện — hãy kiểm tra tài liệu Google hiện hành trước khi dựa vào). Cả hai là hướng dài hạn, chưa làm trong repo này.

### 5.8 Phát triển & test

- `npm test` có nhóm test **Bản quyền** (49 test tổng): Ed25519 trong `License.gs` khớp `crypto` của Node (kể cả chữ ký giả / dẻo), chưa kích hoạt bị chặn, mã sai / mã của ID khác bị từ chối, bản sao & clone (properties trống hoặc sao nguyên) bị chặn và không ghi ô nào, menu chỉ còn **Bản quyền**, kích hoạt bằng menu, gỡ kích hoạt chỉ chủ sở hữu.
- Test dùng **cặp khoá riêng của test** (`LICENSE.PUBKEY` bị thay trong bộ nhớ) — không đụng khoá thật.
- Bản **preview / E2E** (`dev/preview-runtime.js`) ghi đè `licenseStatus_` thành "đã cấp phép" vì chạy trên dữ liệu giả lập — mã đó **không** nằm trong `src/` nên không được đẩy lên Google.

## 6. Phát triển

```
src/                 # Mã nguồn Apps Script (đẩy lên bằng clasp, rootDir = src)
  Config.gs          #   schema các sheet + cấu hình mặc định
  Db.gs              #   đọc/ghi sheet theo tên cột
  Api.gs             #   API cho webapp: danh mục, lưu/sửa/huỷ phiếu, số phiếu, mã cuộn, báo cáo
  Setup.gs           #   tạo sheet, dropdown, sheet BaoCao, dữ liệu mẫu
  License.gs         #   khoá bản quyền: kiểm chữ ký Ed25519, kích hoạt/gỡ, chặn ghi ở bản sao
  Code.gs            #   doGet (định tuyến trang), menu trên Sheet
  Pxk.gs             #   sheet "Nhập PXK": dựng sheet, nút IN PHIẾU / PHIẾU MỚI / MỞ PHIẾU, onEdit tự điền
  PxkButtons.gs      #   ảnh nút bấm (sinh bằng tools/make-buttons.py)
  Index.html, js_Form.html, css_App.html      # form nhập liệu / danh sách / báo cáo
  Print.html, js_Print.html, css_Print.html   # phiếu xuất kho A4 + biên bản giao nhận
  Tem.html, js_Tem.html                       # tem KCS A5 + COA A5
  js_Common.html, lib_Qr.html, lib_Logo.html  # tiện ích, thư viện QR (MIT), logo
dev/fake-gas.js      # giả lập SpreadsheetApp/Utilities… để chạy src/*.gs ngoài Google
dev/preview-runtime.js
tools/test.mjs       # test logic server (Node)
tools/license-key.mjs    # SOLVIQ: sinh khoá / cấp mã kích hoạt theo ID bảng tính (mục 5)
tools/e2e.mjs        # test giao diện E2E (Chrome headless qua puppeteer-core)
tools/make-buttons.py    # vẽ lại ảnh nút bấm cho sheet Nhập PXK
tools/build-preview.mjs  # dựng bản xem trước offline vào preview/
```

```bash
npm install            # lần đầu: cài puppeteer-core (dùng Chrome có sẵn, không tải trình duyệt)
```

```bash
npm test               # 49 test logic server (gồm bản quyền) (src/*.gs) trên sheet giả lập
```

```bash
npm run test:e2e       # 15 test giao diện trong Chrome headless: form, lưu/sửa/huỷ, nháp, phiếu in A4, tem A5, biên bản, báo cáo, điện thoại
```

```bash
npm run test:all       # chạy cả hai
```

Test E2E dựng bản preview rồi bấm thật trên giao diện; kiểm tra cả bản in xuất PDF đúng 1 trang A4 / khổ A5. Nếu Chrome không nằm ở vị trí mặc định, đặt biến `CHROME_PATH`.

```bash
npm run preview        # dựng preview/ và mở http://localhost:5178
```

Bản preview chạy **chính code `src/*.gs`** trong trình duyệt với Google Sheets giả lập (dữ liệu lưu localStorage, có sẵn phiếu mẫu 230/11 và 225/11). Mở trang in theo số phiếu: `print.html?so=230/11`, `tem.html?so=230/11`, `print.html?page=bienban&so=225/11`.

URL trang khi đã deploy:

| Trang | URL |
|---|---|
| Form | `<exec>` |
| Phiếu xuất kho A4 | `<exec>?page=print&px=<ID>` |
| Biên bản giao nhận | `<exec>?page=bienban&px=<ID>` |
| Tem KCS + COA | `<exec>?page=tem&px=<ID>[&cuon=<mã cuộn>][&loai=kcs\|coa]` |

## 7. Video hướng dẫn thao tác (Remotion)

Thư mục [`video/`](video/) chứa mã nguồn video hướng dẫn các cửa sổ (tab) của Google Sheet và web app, có subtext giải thích từng cửa sổ dùng để làm gì (~3 phút, 1920×1080, 30fps).

```bash
cd video && npm install
```

```bash
npm run dev          # xem / chỉnh trong Remotion Studio
```

```bash
npm run narrate      # (tuỳ chọn) tạo lại giọng đọc từ video/src/narration.json
```

```bash
npm run render       # xuất video/out/huong-dan-phieu-xuat-kho-thuyet-minh.mp4
```

**Giọng đọc thuyết minh**: dùng giọng tiếng Việt **Linh** có sẵn của macOS (chạy cục bộ, không gửi chữ ra ngoài). Lời đọc nằm trong [`video/src/narration.json`](video/src/narration.json), mỗi cảnh một danh sách đoạn, **số đoạn phải bằng số đoạn subtext** của cảnh đó. Viết sẵn dạng đọc được (vd "PXK" → "pê xê ca", "KCS" → "ca xê ét", "web app" → "oép áp"). Sửa lời rồi chạy `npm run narrate`; chỉ đoạn nào đổi chữ mới được đọc lại. Đổi giọng hoặc tốc độ: `VOICE=Linh RATE=190 npm run narrate` (`say -v '?'` liệt kê giọng). Các file `video/public/audio/*.mp3` đã được commit nên máy không có macOS vẫn render được. Độ dài từng cảnh tự giãn theo lời, chú thích và camera dời theo.

**Bản rút gọn (< 2 phút, ~1:59)** dùng giọng ElevenLabs: lời ở [`video/src/narration.short.json`](video/src/narration.short.json) (viết tên riêng nguyên gốc: "Google Sheets", "KCS"…), danh sách cảnh và đoạn giữ lại ở `SHORT_ENTRIES` trong [`video/src/Tutorial.tsx`](video/src/Tutorial.tsx). Đặt khoá API vào `video/.env` (đã `.gitignore`, **không commit**):

```
ELEVENLABS_API_KEY=sk_...
```

```bash
cd video
npm run narrate:short   # tạo lời bằng ElevenLabs (mặc định model eleven_v3, giọng 21m00Tcm4TlvDq8ikWAM)
npm run render:short    # xuất video/out/huong-dan-phieu-xuat-kho-ngan.mp4
```

Đổi giọng: `EL_VOICE=<voice_id> EL_MODEL=eleven_v3 npm run narrate:short`. Có `ELEVENLABS_API_KEY` thì `npm run narrate` (bản đầy đủ) cũng tự dùng ElevenLabs; muốn dùng giọng macOS thì thêm `PROVIDER=say`. Các file `video/public/audio-short/*.mp3` được commit nên không cần khoá để render lại.

**Hai clip theo vai trò** (cùng giọng ElevenLabs, cần `ELEVENLABS_API_KEY` nếu muốn đổi lời):

| Clip | Dành cho | Nội dung | Lệnh |
|---|---|---|---|
| `huong-dan-nhan-vien-nhap-in.mp4` (~1:54) | Nhân viên | Từng thao tác nhập phiếu ở ba nơi: sheet Nhập PXK, web app trên máy tính, web app trên điện thoại (Phiếu mới → khách, xe, tài xế → sản phẩm, kg → Lưu & in), kèm kết quả trang in A4 | `npm run narrate:user && npm run render:user` |
| `huong-dan-quan-ly-bao-cao.mp4` (~1:13) | Quản lý | Lấy báo cáo, đọc báo cáo, xem dữ liệu PhieuXuat / ChiTiet, đơn giá tài xế | `npm run narrate:manager && npm run render:manager` |

Hai cảnh web app là video quay thao tác thật trên bản preview bằng `node tools/record-web.mjs` (ra `video/public/clips/web-laptop.mp4`, `web-mobile.mp4` và file `.json` mốc bước; cần Chrome và ffmpeg), nên giao diện luôn khớp bản web hiện tại. Lời nằm ở `video/src/narration.user.json` và `narration.manager.json`; cảnh dựng ở [`video/src/Roles.tsx`](video/src/Roles.tsx) và [`video/src/scenes/Flow.tsx`](video/src/scenes/Flow.tsx) (sheet giả lập có con trỏ chuột gõ từng ô).

- Kịch bản (mốc thời gian, chú thích, subtext) nằm trong [`video/src/data.ts`](video/src/data.ts) và [`video/src/scenes/Custom.tsx`](video/src/scenes/Custom.tsx). Sửa chữ hay thời lượng ở đó rồi render lại.
- Ảnh nền ở `video/public/shots/`. Ảnh web app và mẫu in chụp lại bằng `node tools/capture-shots.mjs` (từ bản preview, không cần Google). Ảnh các tab Google Sheet là ảnh chụp thật; khi giao diện sheet đổi, chụp lại và thay file `sheet-*.jpg`.
- Remotion tải Chrome riêng lần đầu chạy. Nếu máy đã có sẵn `chrome-headless-shell`, thêm `--browser-executable=<đường dẫn>` vào lệnh render.

---

Thực hiện: SOLVIQ · Dữ liệu thuộc sở hữu Giấy A.F.C, lưu trên tài khoản Google do A.F.C đứng tên.
