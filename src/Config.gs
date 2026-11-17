/**
 * AFC Form Print — cấu hình & schema Google Sheets.
 *
 * Mỗi sheet được đọc theo TÊN CỘT ở dòng 1 (không theo vị trí), nên có thể
 * đổi thứ tự cột hoặc thêm cột phụ trên sheet mà không làm hỏng webapp.
 * Chỉ đổi TÊN cột khi sửa luôn ở đây.
 */

var APP = {
  NAME: 'AFC Form Print',
  VERSION: '1.0.0',
  TZ: 'Asia/Ho_Chi_Minh',
  STATUS_OK: 'Đã xuất',
  STATUS_CANCEL: 'Đã huỷ',
  UNIT_ROLL: 'CUỘN',
  UNIT_PALLET: 'PALLET',
};

/**
 * key nội bộ  ->  tiêu đề cột trên sheet.
 * `list` = sheet danh mục (dropdown). `data` = sheet dữ liệu giao dịch.
 */
var SCHEMA = {
  // ---------- Danh mục (nhập trực tiếp trên sheet) ----------
  DM_SanPham: {
    kind: 'list',
    color: '#e8f0fe',
    cols: [
      ['maSP', 'Mã SP'],
      ['loaiGiay', 'Loại giấy'],
      ['khoGiay', 'Khổ (cm)'],
      ['dinhLuong', 'Định lượng (g/m2)'],
      ['donVi', 'Đơn vị (CUỘN/PALLET)'],
      ['truBi', 'Trừ bì (kg/đơn vị)'],
      ['ghiChu', 'Ghi chú'],
      ['ngung', 'Ngừng dùng'],
    ],
  },
  DM_KhachHang: {
    kind: 'list',
    color: '#e8f0fe',
    cols: [
      ['ten', 'Tên đơn vị nhận hàng'],
      ['diaChi', 'Địa chỉ giao hàng'],
      ['lienHe', 'Người liên hệ'],
      ['sdt', 'SĐT'],
      ['ghiChu', 'Ghi chú'],
      ['ngung', 'Ngừng dùng'],
    ],
  },
  DM_TaiXe: {
    kind: 'list',
    color: '#fef7e0',
    cols: [
      ['ten', 'Họ tên tài xế'],
      ['sdt', 'SĐT'],
      ['loai', 'Loại (Công ty/Thuê ngoài)'],
      ['xeMacDinh', 'Xe mặc định'],
      ['donGiaChuyen', 'Đơn giá/chuyến (đ)'],
      ['donGiaTan', 'Đơn giá/tấn (đ)'],
      ['ghiChu', 'Ghi chú'],
      ['ngung', 'Ngừng dùng'],
    ],
  },
  DM_Xe: {
    kind: 'list',
    color: '#fef7e0',
    cols: [
      ['bienSo', 'Biển số xe'],
      ['loaiXe', 'Loại xe'],
      ['taiTrong', 'Tải trọng (tấn)'],
      ['soHuu', 'Sở hữu (Công ty/Thuê ngoài)'],
      ['taiXeMacDinh', 'Tài xế mặc định'],
      ['ghiChu', 'Ghi chú'],
      ['ngung', 'Ngừng dùng'],
    ],
  },
  DM_Kho: {
    kind: 'list',
    color: '#e6f4ea',
    cols: [
      ['ma', 'Mã kho / máy'],
      ['ten', 'Mô tả'],
      ['ngung', 'Ngừng dùng'],
    ],
  },
  DM_Ca: {
    kind: 'list',
    color: '#e6f4ea',
    cols: [
      ['ma', 'Mã ca'],
      ['ten', 'Mô tả'],
      ['ngung', 'Ngừng dùng'],
    ],
  },
  DM_NhanVien: {
    kind: 'list',
    color: '#e6f4ea',
    cols: [
      ['ten', 'Họ tên'],
      ['boPhan', 'Bộ phận'],
      ['vaiTro', 'Vai trò (Lập phiếu/Thủ kho/KCS)'],
      ['ngung', 'Ngừng dùng'],
    ],
  },

  // ---------- Dữ liệu (webapp ghi) ----------
  PhieuXuat: {
    kind: 'data',
    color: '#fce8e6',
    cols: [
      ['id', 'ID'],
      ['so', 'Số phiếu'],
      ['ngay', 'Ngày xuất'],
      ['khach', 'Đơn vị nhận hàng'],
      ['diaChi', 'Địa chỉ giao'],
      ['kho', 'Xuất tại kho'],
      ['loaiGiay', 'Loại giấy'],
      ['xe', 'Biển số xe'],
      ['soHuuXe', 'Xe (Công ty/Thuê ngoài)'],
      ['taiXe', 'Tài xế'],
      ['sdtTaiXe', 'SĐT tài xế'],
      ['soLuong', 'Số cuộn/pallet'],
      ['tongKg', 'Tổng kg'],
      ['truBi', 'Trừ bì (kg)'],
      ['thucXuat', 'Thực xuất (kg)'],
      ['nguoiLap', 'Người lập phiếu'],
      ['thuKho', 'Thủ kho'],
      ['phuCap', 'Phụ cấp chuyến (đ)'],
      ['ghiChu', 'Ghi chú'],
      ['trangThai', 'Trạng thái'],
      ['taoLuc', 'Tạo lúc'],
      ['nguoiTao', 'Người tạo'],
      ['capNhat', 'Cập nhật lúc'],
    ],
  },
  ChiTiet: {
    kind: 'data',
    color: '#fce8e6',
    cols: [
      ['phieuId', 'ID phiếu'],
      ['so', 'Số phiếu'],
      ['ngay', 'Ngày xuất'],
      ['stt', 'STT'],
      ['maSP', 'Mã SP'],
      ['loaiGiay', 'Loại giấy'],
      ['khoGiay', 'Khổ (cm)'],
      ['dinhLuong', 'Định lượng (g/m2)'],
      ['donVi', 'Đơn vị'],
      ['maCuon', 'Mã cuộn/pallet'],
      ['kg', 'Trọng lượng (kg)'],
      ['soBanh', 'Số bánh'],
      ['truBi', 'Trừ bì (kg)'],
      ['ca', 'Ca SX'],
      ['may', 'Máy'],
      ['ngaySX', 'Ngày SX'],
      ['doDay', 'Độ dày (mm)'],
      ['doAm', 'Độ ẩm (%)'],
      ['doBuc', 'Độ chịu bục (kgf/cm2)'],
      ['nenVong', 'Nén vòng (kgf)'],
      ['tachLop', 'Tách lớp (J/m2)'],
      ['cobb', 'Cobb 60s'],
      ['moiNoi', 'Số mối nối'],
      ['dauThu', 'Số dấu thử'],
      ['ghiChu', 'Ghi chú'],
      ['khach', 'Đơn vị nhận hàng'],
      ['xe', 'Biển số xe'],
      ['taiXe', 'Tài xế'],
      ['trangThai', 'Trạng thái'],
    ],
  },

  CauHinh: {
    kind: 'config',
    color: '#f1f3f4',
    cols: [
      ['key', 'Khoá'],
      ['value', 'Giá trị'],
      ['moTa', 'Mô tả'],
    ],
  },
};

/** Giá trị mặc định cho sheet CauHinh (sửa được trên sheet). */
var DEFAULT_CONFIG = [
  ['COMPANY_NAME', 'Công ty TNHH Giấy A.F.C', 'Tên công ty trên phiếu xuất kho'],
  ['COMPANY_NAME_UPPER', 'Công ty TNHH GIẤY A.F.C', 'Tên công ty trên tem KCS'],
  ['COMPANY_EN', 'A.F.C CO., LTD', 'Tên tiếng Anh trên COA'],
  ['COMPANY_ADDRESS', 'C6/4C Hamlet 39, Tan Vinh Loc Ward, Ho Chi Minh City, Vietnam', 'Địa chỉ tiếng Anh trên COA'],
  ['COMPANY_HOTLINE', '+84 913694541 (+84 916694541)', 'Hotline trên COA'],
  ['DEPT_LINE_1', 'Phòng Kế hoạch Sản xuất', 'Dòng 2 tiêu đề phiếu'],
  ['DEPT_LINE_2', 'Bộ phận Kế hoạch', 'Dòng 3 tiêu đề phiếu'],
  ['FORM_CODE', 'Mã số: BM-04/ KH-SX', 'Mã biểu mẫu phiếu xuất kho'],
  ['FORM_NOTE', '(Ban hành theo QĐ số: 15/2006/ QĐ-BTC ngày 20/03/2006 của Bộ Tài Chính)', 'Ghi chú biểu mẫu'],
  ['FORM_SOURCE', 'Nguồn: Công ty Giấy A.F.C- Ban Điều Hành/ Phòng KH-SX/ Bộ phận Kế hoạch', 'Dòng nguồn cuối phiếu'],
  ['KCS_CODE', 'BM-18/BP.KCS', 'Mã biểu mẫu tem KCS'],
  ['MIN_ROWS', '20', 'Số dòng tối thiểu trên phiếu xuất kho A4 (mẫu gốc 20)'],
  ['SO_PHIEU_RESET', 'THANG', 'Đánh số phiếu lại từ 1 mỗi THANG hoặc NAM'],
  ['LOGO_URL', '', 'Để trống = dùng logo có sẵn; hoặc dán link ảnh logo công khai'],
];
