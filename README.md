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

## 5. Phát triển

```
src/                 # Mã nguồn Apps Script (đẩy lên bằng clasp, rootDir = src)
  Config.gs          #   schema các sheet + cấu hình mặc định
  Db.gs              #   đọc/ghi sheet theo tên cột
  Api.gs             #   API cho webapp: danh mục, lưu/sửa/huỷ phiếu, số phiếu, mã cuộn, báo cáo
  Setup.gs           #   tạo sheet, dropdown, sheet BaoCao, dữ liệu mẫu
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
tools/e2e.mjs        # test giao diện E2E (Chrome headless qua puppeteer-core)
tools/make-buttons.py    # vẽ lại ảnh nút bấm cho sheet Nhập PXK
tools/build-preview.mjs  # dựng bản xem trước offline vào preview/
```

```bash
npm install            # lần đầu: cài puppeteer-core (dùng Chrome có sẵn, không tải trình duyệt)
```

```bash
npm test               # 34 test logic server (src/*.gs) trên sheet giả lập
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

## 6. Video hướng dẫn thao tác (Remotion)

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

- Kịch bản (mốc thời gian, chú thích, subtext) nằm trong [`video/src/data.ts`](video/src/data.ts) và [`video/src/scenes/Custom.tsx`](video/src/scenes/Custom.tsx). Sửa chữ hay thời lượng ở đó rồi render lại.
- Ảnh nền ở `video/public/shots/`. Ảnh web app và mẫu in chụp lại bằng `node tools/capture-shots.mjs` (từ bản preview, không cần Google). Ảnh các tab Google Sheet là ảnh chụp thật; khi giao diện sheet đổi, chụp lại và thay file `sheet-*.jpg`.
- Remotion tải Chrome riêng lần đầu chạy. Nếu máy đã có sẵn `chrome-headless-shell`, thêm `--browser-executable=<đường dẫn>` vào lệnh render.

---

Thực hiện: SOLVIQ · Dữ liệu thuộc sở hữu Giấy A.F.C, lưu trên tài khoản Google do A.F.C đứng tên.
