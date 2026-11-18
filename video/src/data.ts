import { C } from "./theme";
import { ScreenScene, px } from "./types";

const BLUE = "#60a5fa";
const GREEN = C.green;
const AMBER = C.amber;
const PINK = C.pink;

// ---------------- Sheet "Nhập PXK" ----------------
const NHAP = { image: "sheet-nhap-pxk.jpg", imageW: 1400, imageH: 841 } as const;

const BTN_PRINT = px(310, 138, 169, 29);
const BTN_NEW = px(527, 138, 103, 29);
const BTN_LOAD = px(669, 138, 138, 29);
const INFO = px(38, 188, 847, 78);
const TOTALS = px(955, 188, 150, 78);
const STATUS = px(145, 266, 500, 17);
const TABLE_HEAD = px(38, 310, 625, 52);
const CODE_CELL = px(523, 345, 140, 18);

export const tour: ScreenScene = {
  kind: "screen",
  id: "tour",
  source: "sheet",
  duration: 450,
  tab: "Nhập PXK",
  title: "Cửa sổ lập phiếu — nơi nhân viên làm việc",
  ...NHAP,
  camera: [
    { at: 0, cx: 0.5, cy: 0.5, zoom: 1 },
    { at: 70, cx: 0.4, cy: 0.18, zoom: 2.1 },
    { at: 205, cx: 0.41, cy: 0.28, zoom: 1.3 },
    { at: 330, cx: 0.3, cy: 0.46, zoom: 1.8 },
  ],
  callouts: [
    { at: 90, until: 200, box: BTN_PRINT, label: "IN PHIẾU: lưu + mở trang in", side: "top", color: BLUE },
    { at: 105, until: 200, box: BTN_NEW, label: "+ PHIẾU MỚI: xoá trắng", side: "bottom", color: GREEN },
    { at: 120, until: 200, box: BTN_LOAD, label: "MỞ PHIẾU THEO SỐ: sửa phiếu cũ", side: "top", color: AMBER },
    { at: 225, until: 325, box: INFO, label: "Ô nền vàng = ô nhập (có dropdown)", side: "bottom", color: AMBER },
    { at: 255, until: 325, box: TOTALS, label: "Tổng tự tính", side: "bottom", color: PINK },
    { at: 285, until: 325, box: STATUS, label: "Trạng thái phiếu", side: "bottom", color: GREEN },
    { at: 350, box: TABLE_HEAD, label: "Bảng hàng: mỗi dòng 1 cuộn / pallet", side: "bottom", color: BLUE },
    { at: 395, box: CODE_CELL, label: "Mã cuộn tự sinh khi lưu", side: "bottom", color: GREEN },
  ],
  captions: [
    { at: 0, text: "Sheet “Nhập PXK” là nơi lập phiếu xuất kho. Nhân viên chỉ cần làm việc ở cửa sổ này." },
    { at: 70, text: "Ba nút ở hàng trên cùng: IN PHIẾU (lưu rồi in), + PHIẾU MỚI, MỞ PHIẾU THEO SỐ." },
    { at: 205, text: "Các ô nền vàng là ô để nhập, đều có dropdown. Ô tím bên phải tự cộng số cuộn, tổng kg, trừ bì, thực xuất." },
    { at: 330, text: "Bảng hàng bên dưới: mỗi dòng là một cuộn hoặc một pallet. Mã cuộn để trống, hệ thống tự cấp khi lưu." },
  ],
};

export const steps: ScreenScene = {
  kind: "screen",
  id: "steps",
  source: "sheet",
  duration: 720,
  tab: "Nhập PXK",
  title: "Lập một phiếu xuất kho: 4 bước",
  ...NHAP,
  camera: [
    { at: 0, cx: 0.4, cy: 0.18, zoom: 2.1 },
    { at: 160, cx: 0.33, cy: 0.27, zoom: 1.4 },
    { at: 330, cx: 0.3, cy: 0.47, zoom: 1.9 },
    { at: 510, cx: 0.4, cy: 0.18, zoom: 2.1 },
    { at: 610, cx: 0.35, cy: 0.33, zoom: 1.7 },
  ],
  callouts: [
    { at: 20, until: 160, box: BTN_NEW, label: "Bấm + PHIẾU MỚI", num: 1, side: "bottom", color: GREEN, spot: true },
    { at: 185, until: 330, box: INFO, label: "Điền các ô nền vàng", num: 2, side: "bottom", color: AMBER, spot: true },
    { at: 355, until: 510, box: TABLE_HEAD, label: "Nhập kg từng dòng", num: 3, side: "bottom", color: PINK, spot: true },
    { at: 530, until: 610, box: BTN_PRINT, label: "Bấm IN PHIẾU", num: 4, side: "bottom", color: "#60a5fa", spot: true },
    { at: 625, box: STATUS, label: "Đã lưu — ghi lại số phiếu và ID", side: "top", color: GREEN },
    { at: 650, box: CODE_CELL, label: "Mã cuộn tự sinh", side: "bottom", color: AMBER },
  ],
  captions: [
    { at: 0, text: "Bước 1 — Bấm + PHIẾU MỚI: số phiếu, ngày xuất, kho và người lập được điền sẵn." },
    { at: 170, text: "Bước 2 — Chọn khách hàng và biển số xe: loại xe và tài xế tự điền theo xe. Gõ tên mới cũng được, hệ thống tự thêm vào danh mục." },
    { at: 340, text: "Bước 3 — Dòng đầu chọn Mã SP và Ca. Các dòng sau chỉ cần gõ kg, Mã SP / Ca / Máy tự lấy theo dòng trên. Dán được cả cột kg từ Excel." },
    { at: 520, text: "Bước 4 — Bấm IN PHIẾU: phiếu được lưu vào PhieuXuat và ChiTiet, rồi mở trang in A4." },
    { at: 615, text: "Sau khi lưu, trạng thái báo “Đã lưu” và mã cuộn / pallet được cấp tự động. Muốn sửa: MỞ PHIẾU THEO SỐ rồi IN PHIẾU lại." },
  ],
};

// ---------------- Sheet dữ liệu ----------------
export const phieuxuat: ScreenScene = {
  kind: "screen",
  id: "phieuxuat",
  source: "sheet",
  duration: 330,
  tab: "PhieuXuat",
  title: "Danh sách phiếu — mỗi dòng là một chuyến xe",
  image: "sheet-phieuxuat.jpg",
  imageW: 1400,
  imageH: 841,
  camera: [
    { at: 0, cx: 0.5, cy: 0.5, zoom: 1 },
    { at: 130, cx: 0.56, cy: 0.22, zoom: 1.55 },
  ],
  callouts: [
    { at: 25, until: 130, box: px(38, 168, 1307, 67), label: "1 dòng = 1 phiếu = 1 chuyến xe", side: "bottom", color: AMBER },
    { at: 160, until: 250, box: px(607, 134, 245, 101), label: "Biển số xe + tài xế → tính lương", side: "bottom", color: GREEN },
    { at: 250, box: px(1178, 134, 81, 101), label: "Thực xuất → tính sản lượng", side: "bottom", color: PINK },
  ],
  captions: [
    { at: 0, text: "PhieuXuat: mỗi dòng là một phiếu xuất kho, cũng là một chuyến xe. Hệ thống tự ghi, không cần gõ tay." },
    { at: 130, text: "Biển số xe và tài xế dùng để tính số chuyến và lương. Cột Trạng thái (kéo sang phải) có “Đã xuất” hoặc “Đã huỷ”." },
  ],
};

export const chitiet: ScreenScene = {
  kind: "screen",
  id: "chitiet",
  source: "sheet",
  duration: 330,
  tab: "ChiTiet",
  title: "Chi tiết — mỗi dòng là một cuộn / pallet",
  image: "sheet-chitiet.jpg",
  imageW: 1400,
  imageH: 841,
  camera: [
    { at: 0, cx: 0.5, cy: 0.5, zoom: 1 },
    { at: 140, cx: 0.62, cy: 0.3, zoom: 1.45 },
  ],
  callouts: [
    { at: 25, until: 140, box: px(38, 168, 1307, 530), label: "Mỗi dòng = 1 cuộn hoặc 1 pallet", side: "top", color: AMBER },
    { at: 165, until: 250, box: px(770, 134, 81, 566), label: "Mã: Máy-ngày SX-Ca-STT", side: "left", color: GREEN },
    { at: 200, until: 250, box: px(852, 134, 81, 566), label: "Trọng lượng (kg)", side: "bottom", color: PINK },
    { at: 255, box: px(934, 134, 162, 566), label: "Pallet: số bánh + trừ bì", side: "bottom", color: "#60a5fa" },
  ],
  captions: [
    { at: 0, text: "ChiTiet: mỗi dòng là một cuộn hoặc một pallet, gắn với số phiếu ở cột đầu. Đây là dữ liệu gốc để làm báo cáo sản lượng." },
    { at: 140, text: "Mã cuộn dạng M2-141126-C2-001 = Máy 2, ngày sản xuất 14/11/26, Ca 2, số thứ tự 001. Kéo sang phải: chỉ tiêu KCS để in tem." },
  ],
};

// ---------------- Sheet danh mục ----------------
export const dmSanPham: ScreenScene = {
  kind: "screen",
  id: "dm-sanpham",
  source: "sheet",
  duration: 300,
  tab: "DM_SanPham",
  title: "Danh mục sản phẩm — gõ trực tiếp trên sheet",
  image: "sheet-dm-sanpham.jpg",
  imageW: 1400,
  imageH: 841,
  camera: [{ at: 0, cx: 0.375, cy: 0.2, zoom: 1.4 }],
  callouts: [
    { at: 20, until: 150, box: px(38, 168, 730, 51), label: "Gõ thêm sản phẩm ở dòng trống", side: "bottom", color: AMBER },
    { at: 70, until: 150, box: px(524, 134, 121, 85), label: "CUỘN hay PALLET", side: "right", color: GREEN },
    { at: 105, until: 150, box: px(646, 134, 121, 85), label: "Pallet trừ 12 kg", side: "bottom", color: PINK },
    { at: 170, box: px(890, 134, 121, 85), label: "Tick = ngừng dùng", side: "bottom", color: "#60a5fa" },
  ],
  captions: [
    { at: 0, text: "Các sheet DM_ là danh mục: gõ trực tiếp trên sheet, form và Nhập PXK tự cập nhật dropdown." },
    { at: 70, text: "Đơn vị CUỘN hay PALLET quyết định cách in phiếu. Pallet được trừ bì theo cột “Trừ bì” khi tính thực xuất." },
    { at: 170, text: "Không dùng nữa thì tick “Ngừng dùng”: mục đó biến khỏi dropdown nhưng lịch sử vẫn còn." },
  ],
};

export const dmTaiXe: ScreenScene = {
  kind: "screen",
  id: "dm-taixe",
  source: "sheet",
  duration: 270,
  tab: "DM_TaiXe",
  title: "Danh mục tài xế — nơi nhập đơn giá tính lương",
  image: "sheet-dm-taixe.jpg",
  imageW: 1400,
  imageH: 841,
  camera: [{ at: 0, cx: 0.375, cy: 0.2, zoom: 1.4 }],
  callouts: [
    { at: 20, until: 120, box: px(38, 168, 485, 34), label: "Tài xế · loại · xe mặc định", side: "bottom", color: AMBER },
    { at: 140, box: px(525, 134, 243, 68), label: "Nhập đơn giá → báo cáo tự tính lương", side: "bottom", color: GREEN },
  ],
  captions: [
    { at: 0, text: "DM_TaiXe: danh sách tài xế, xe mặc định. Chọn xe trên phiếu thì tài xế tự điền." },
    { at: 120, text: "Điền Đơn giá/chuyến và Đơn giá/tấn: lương = số chuyến × đơn giá chuyến + số tấn × đơn giá tấn + phụ cấp." },
  ],
};

export const baocao: ScreenScene = {
  kind: "screen",
  id: "baocao",
  source: "sheet",
  duration: 330,
  tab: "BaoCao",
  title: "Báo cáo — tự tính, không cần gõ",
  image: "sheet-baocao.jpg",
  imageW: 1400,
  imageH: 841,
  camera: [
    { at: 0, cx: 0.17, cy: 0.2, zoom: 1.9 },
    { at: 105, cx: 0.34, cy: 0.24, zoom: 1.45 },
    { at: 215, cx: 0.72, cy: 0.24, zoom: 1.5 },
  ],
  callouts: [
    { at: 15, until: 105, box: px(127, 157, 80, 33), label: "Đổi ngày để lọc báo cáo", side: "right", color: AMBER },
    { at: 125, until: 215, box: px(38, 190, 414, 70), label: "Sản lượng theo ngày", side: "bottom", color: GREEN },
    { at: 150, until: 215, box: px(474, 190, 242, 90), label: "Theo sản phẩm", side: "bottom", color: PINK },
    { at: 235, box: px(738, 190, 407, 70), label: "Theo khách hàng", side: "bottom", color: "#60a5fa" },
    { at: 260, box: px(1166, 190, 179, 62), label: "Số chuyến + lương tài xế", side: "bottom", color: AMBER },
  ],
  captions: [
    { at: 0, text: "BaoCao: nhập “Từ ngày / Đến ngày” ở hai ô vàng, các bảng bên dưới tự cập nhật." },
    { at: 105, text: "Bảng sản lượng theo ngày và theo sản phẩm. Phiếu đã huỷ không được tính." },
    { at: 215, text: "Bảng theo khách hàng, và bảng tài xế với số chuyến và lương (dựa trên đơn giá ở DM_TaiXe)." },
  ],
};

export const cauhinh: ScreenScene = {
  kind: "screen",
  id: "cauhinh",
  source: "sheet",
  duration: 240,
  tab: "CauHinh",
  title: "Cấu hình — thông tin in trên phiếu",
  image: "sheet-cauhinh.jpg",
  imageW: 1400,
  imageH: 841,
  camera: [
    { at: 0, cx: 0.4, cy: 0.27, zoom: 1.5 },
  ],
  callouts: [
    { at: 15, until: 110, box: px(183, 152, 339, 240), label: "Sửa trực tiếp cột “Giá trị”", side: "right", color: AMBER },
    { at: 120, until: 175, box: px(38, 341, 484, 17), label: "Số dòng tối thiểu của phiếu A4", side: "right", color: GREEN },
    { at: 150, until: 205, box: px(38, 358, 484, 17), label: "Đánh lại số phiếu theo THANG / NAM", side: "right", color: PINK },
    { at: 195, box: px(38, 391, 840, 17), label: "Link web app cho nút IN PHIẾU", side: "bottom", color: "#60a5fa" },
  ],
  captions: [
    { at: 0, text: "CauHinh: tên công ty, mã biểu mẫu, dòng nguồn cuối phiếu… Sửa ở đây là phiếu in ra đổi theo." },
    { at: 120, text: "Ngoài ra: số dòng tối thiểu của phiếu, cách đánh số phiếu theo tháng hay năm, và link web app." },
  ],
};

// ---------------- Web app ----------------
const WEB = { source: "web", imageW: 2560, imageH: 1440 } as const;

export const webForm: ScreenScene = {
  kind: "screen",
  ...WEB,
  id: "web-form",
  duration: 300,
  tab: "Web app · Lập phiếu",
  title: "Web app — cùng dữ liệu, dùng được trên điện thoại",
  image: "web-form-phieu.png",
  camera: [{ at: 0, cx: 0.5, cy: 0.5, zoom: 1 }],
  callouts: [
    { at: 20, until: 110, box: [0.68, 0.008, 0.315, 0.058], label: "3 tab: Lập phiếu · Danh sách · Báo cáo", side: "bottom", color: AMBER },
    { at: 115, until: 200, box: [0.065, 0.284, 0.87, 0.378], label: "Điền giống hệt sheet Nhập PXK", side: "top", color: GREEN },
    { at: 205, until: 260, box: [0.558, 0.115, 0.377, 0.042], label: "Sau khi lưu: in phiếu, tem, biên bản", side: "bottom", color: PINK },
    { at: 262, box: [0.6375, 0.931, 0.311, 0.053], label: "Lưu / Lưu & in phiếu", side: "top", color: "#60a5fa" },
  ],
  captions: [
    { at: 0, text: "Web app là cách thứ hai để lập phiếu, mở bằng link trên điện thoại hoặc máy tính. Dữ liệu ghi vào cùng một Google Sheet." },
    { at: 115, text: "Các ô và quy tắc tự điền giống sheet Nhập PXK: dán nhanh kg, mã cuộn tự sinh, nhập chỉ tiêu KCS cho từng cuộn." },
    { at: 205, text: "Lưu xong hiện thanh xanh với ba nút: In phiếu xuất kho (A4), Tem KCS + COA (A5), Biên bản giao nhận." },
  ],
};

export const webList: ScreenScene = {
  kind: "screen",
  ...WEB,
  id: "web-list",
  duration: 240,
  tab: "Web app · Danh sách",
  title: "Tìm, sửa, in lại phiếu cũ",
  image: "web-danh-sach.png",
  camera: [{ at: 0, cx: 0.5, cy: 0.5, zoom: 1 }],
  callouts: [
    { at: 15, until: 110, box: [0.065, 0.18, 0.87, 0.085], label: "Lọc theo ngày, tìm số phiếu / khách / xe / tài xế", side: "bottom", color: AMBER },
    { at: 120, until: 190, box: [0.845, 0.342, 0.095, 0.109], label: "Sửa · In · Tem", side: "left", color: GREEN },
    { at: 195, box: [0.052, 0.465, 0.896, 0.047], label: "Tổng không tính phiếu huỷ", side: "bottom", color: PINK },
  ],
  captions: [
    { at: 0, text: "Tab Danh sách: tìm phiếu theo ngày, số phiếu, khách, xe hoặc tài xế." },
    { at: 120, text: "Mỗi phiếu có Sửa, In (phiếu A4) và Tem (tem KCS + COA). Phiếu đã huỷ vẫn còn trong danh sách nhưng bị gạch." },
  ],
};

export const webReport: ScreenScene = {
  kind: "screen",
  ...WEB,
  id: "web-report",
  duration: 270,
  tab: "Web app · Báo cáo",
  title: "Báo cáo sản lượng và lương tài xế",
  image: "web-bao-cao.png",
  camera: [{ at: 0, cx: 0.5, cy: 0.5, zoom: 1 }],
  callouts: [
    { at: 15, until: 125, box: [0.0525, 0.307, 0.895, 0.144], label: "Số phiếu · số cuộn · sản lượng (tấn) · lương tài xế", side: "bottom", color: AMBER },
    { at: 55, until: 125, box: [0.776, 0.213, 0.159, 0.052], label: "Xuất bảng lương ra Sheet", side: "bottom", color: GREEN },
    { at: 145, box: [0.0525, 0.707, 0.895, 0.267], label: "Theo sản phẩm và theo khách hàng", side: "top", color: PINK },
  ],
  captions: [
    { at: 0, text: "Tab Báo cáo: chọn khoảng ngày rồi bấm Xem báo cáo. Nút Xuất bảng lương ghi một sheet riêng gửi kế toán." },
    { at: 130, text: "Phía dưới là sản lượng theo ngày, theo sản phẩm, theo khách hàng, và bảng chuyến của từng tài xế." },
  ],
};

export const screenScenes = {
  tour,
  steps,
  phieuxuat,
  chitiet,
  dmSanPham,
  dmTaiXe,
  baocao,
  cauhinh,
  webForm,
  webList,
  webReport,
};
