/**
 * Sheet "Nhập PXK" — lập phiếu xuất kho NGAY TRÊN GOOGLE SHEET.
 * (Tách riêng khỏi sheet mẫu "pxk" của người dùng; code không bao giờ ghi vào sheet không do nó tạo.)
 *
 *  - Ô nhập có dropdown lấy từ các sheet danh mục (DM_*).
 *  - Nút "IN PHIẾU": lưu phiếu vào PhieuXuat + ChiTiet (cùng logic với web app),
 *    ghi lại số phiếu / ID / mã cuộn lên sheet, rồi mở trang in A4.
 *  - Nút "+ PHIẾU MỚI": xoá trắng, điền sẵn số phiếu kế tiếp.
 *  - Nút "MỞ PHIẾU THEO SỐ": nạp lại phiếu cũ để sửa / in lại.
 *  - Gõ kg ở dòng mới mà để trống Mã SP / Ca / Máy -> tự lấy theo dòng trên.
 *
 * Nút bấm (ảnh gắn script) chỉ chạy trên trình duyệt máy tính; trên điện thoại dùng web app.
 */

var PXK = {
  NAME: 'Nhập PXK',
  FIRST: 10,          // dòng đầu bảng hàng
  LAST: 69,           // dòng cuối (60 cuộn / pallet)
  HEADER_ROW: 9,
  // ô nhập thông tin phiếu (ô đầu của vùng gộp)
  F: {
    so: 'B3', ngay: 'D3', kho: 'G3', nguoiLap: 'I3',
    khach: 'B4', diaChi: 'G4',
    xe: 'B5', soHuuXe: 'D5', taiXe: 'G5', sdtTaiXe: 'I5',
    thuKho: 'B6', phuCap: 'D6', ghiChu: 'G6',
    id: 'B7',
  },
  STATUS: 'D7',
  LABELS: [
    ['A3', 'Số phiếu'], ['C3', 'Ngày xuất *'], ['F3', 'Xuất tại kho'], ['H3', 'Người lập'],
    ['A4', 'Đơn vị nhận hàng *'], ['F4', 'Địa chỉ giao'],
    ['A5', 'Biển số xe'], ['C5', 'Xe'], ['F5', 'Tài xế'], ['H5', 'SĐT tài xế'],
    ['A6', 'Thủ kho'], ['C6', 'Phụ cấp (đ)'], ['F6', 'Ghi chú'],
    ['A7', 'ID phiếu'], ['C7', 'Trạng thái'],
    ['L3', 'Số cuộn/pallet'], ['L4', 'Tổng kg'], ['L5', 'Trừ bì (kg)'], ['L6', 'Thực xuất (kg)'],
  ],
  TOTALS: { count: 'M3', kg: 'M4', bi: 'M5', net: 'M6' },
  MERGES: ['A1:C1', 'D3:E3', 'I3:J3', 'B4:E4', 'G4:J4', 'D5:E5', 'I5:J5', 'D6:E6', 'G6:J6', 'D7:J7', 'A8:P8'],
  // cột bảng hàng (A→P): [key, tiêu đề, độ rộng]
  COLS: [
    ['maSP', 'Mã SP *', 130], ['kg', 'Trọng lượng (kg) *', 120], ['soBanh', 'Số bánh', 80], ['ca', 'Ca SX *', 80],
    ['may', 'Máy', 80], ['ngaySX', 'Ngày SX', 105], ['maCuon', 'Mã cuộn / pallet (tự sinh)', 175],
    ['doDay', 'Độ dày (mm)', 90], ['doAm', 'Độ ẩm (%)', 90], ['doBuc', 'Độ bục (kgf/cm2)', 90], ['nenVong', 'Nén vòng (kgf)', 90],
    ['tachLop', 'Tách lớp (J/m2)', 90], ['cobb', 'Cobb 60s', 90], ['moiNoi', 'Số mối nối', 90], ['dauThu', 'Số dấu thử', 90],
    ['ghiChu', 'Ghi chú', 170],
  ],
  BUTTONS: [['PRINT', 'pxkPrint', 4], ['NEW', 'pxkNew', 7], ['LOAD', 'pxkLoad', 8]], // [ảnh, hàm, cột đặt nút ở dòng 1]
  STATUS_NEW: 'Phiếu mới — chưa lưu. Nhập xong bấm IN PHIẾU.',
  STATUS_DIRTY: 'Có thay đổi CHƯA LƯU — bấm IN PHIẾU để lưu và in lại.',
};

function pxkCol_(key) {
  for (var i = 0; i < PXK.COLS.length; i++) if (PXK.COLS[i][0] === key) return i + 1;
  throw new Error('PXK thiếu cột ' + key);
}

/**
 * Sheet nhập liệu có phải do code này tạo không? (dấu nhận biết: tiêu đề bảng hàng ở dòng HEADER_ROW).
 * Lưu ý: getSheetByName KHÔNG phân biệt hoa/thường -> "pxk" của người dùng cũng khớp "PXK".
 */
function pxkIsOurs_(sh) {
  if (!sh) return false;
  var want = PXK.COLS.slice(0, 3).map(function (c) { return c[1]; }).join('|');
  var got = sh.getRange(PXK.HEADER_ROW, 1, 1, 3).getValues()[0].map(function (v) { return String(v); }).join('|');
  return got === want;
}

function pxkSheet_() {
  var sh = ss_().getSheetByName(PXK.NAME);
  if (!sh) throw new Error('Chưa có sheet ' + PXK.NAME + '. Chạy menu "AFC Form" → "Cài đặt / cập nhật cấu trúc sheet".');
  if (!pxkIsOurs_(sh)) throw new Error('Sheet "' + sh.getName() + '" không phải sheet nhập liệu do AFC Form tạo — không đọc/ghi để tránh làm hỏng dữ liệu của bạn.');
  return sh;
}

// ===================== Dựng sheet =====================

/** Tạo / làm mới bố cục sheet PXK. Giữ nguyên dữ liệu đang nhập nếu sheet đã có. */
function buildPxkSheet_(ss, sep) {
  var sh = ss.getSheetByName(PXK.NAME);
  // Đã có sheet trùng tên (không phân biệt hoa/thường) mà không phải của mình -> KHÔNG đụng vào.
  if (sh && !pxkIsOurs_(sh)) return null;
  var isNew = !sh;
  if (isNew) sh = ss.insertSheet(PXK.NAME);
  var nCols = PXK.COLS.length;
  if (sh.getMaxColumns() < nCols) sh.insertColumnsAfter(sh.getMaxColumns(), nCols - sh.getMaxColumns());

  // Tiêu đề + nhãn
  sh.getRange('A1').setValue('PHIẾU XUẤT KHO — NHẬP LIỆU').setFontSize(15).setFontWeight('bold').setFontColor('#0f172a');
  sh.getRange('A2').setValue('Ô nền vàng là ô nhập (có dropdown). Bấm IN PHIẾU để lưu vào PhieuXuat/ChiTiet và mở trang in A4.')
    .setFontColor('#6b7280').setFontStyle('italic');
  PXK.LABELS.forEach(function (l) { sh.getRange(l[0]).setValue(l[1]).setFontWeight('bold').setFontColor('#374151').setHorizontalAlignment('right'); });
  PXK.MERGES.forEach(function (a1) { try { sh.getRange(a1).merge(); } catch (e) { /* đã gộp */ } });
  sh.getRange('A8').setValue('Mỗi dòng 1 cuộn/pallet. Gõ kg ở dòng mới, ô Mã SP / Ca / Máy để trống sẽ tự lấy theo dòng trên. Mã cuộn để trống = tự sinh khi lưu. Chỉ tiêu KCS (cột I→P) để trống thì tem in trống.')
    .setFontColor('#6b7280').setFontStyle('italic').setWrap(true);

  // Ô nhập
  var inputs = Object.keys(PXK.F).filter(function (k) { return k !== 'id'; }).map(function (k) { return PXK.F[k]; });
  inputs.forEach(function (a1) { sh.getRange(a1).setBackground('#fff8e1').setBorder(true, true, true, true, false, false, '#e5c66b', null); });
  sh.getRange(PXK.F.id).setBackground('#f3f4f6').setFontColor('#6b7280').setFontFamily('Roboto Mono');
  sh.getRange(PXK.STATUS).setFontColor('#b45309').setFontWeight('bold');
  sh.getRange(PXK.F.so).setNumberFormat('@').setFontWeight('bold').setFontSize(12);
  sh.getRange(PXK.F.ngay).setNumberFormat('dd/MM/yyyy');
  sh.getRange(PXK.F.phuCap).setNumberFormat('#,##0');
  sh.getRange(PXK.F.khach).setFontWeight('bold').setFontSize(12);
  sh.getRange(PXK.TOTALS.count + ':' + PXK.TOTALS.net).setNumberFormat('#,##0').setFontWeight('bold').setFontSize(12).setBackground('#eef2ff');

  // Bảng hàng
  var hdr = PXK.COLS.map(function (c) { return c[1]; });
  sh.getRange(PXK.HEADER_ROW, 1, 1, nCols).setValues([hdr]).setFontWeight('bold').setBackground('#e8f0fe').setWrap(true)
    .setVerticalAlignment('middle').setHorizontalAlignment('center');
  PXK.COLS.forEach(function (c, i) { sh.setColumnWidth(i + 1, c[2]); });
  var body = function (key) { var c = pxkCol_(key); return sh.getRange(PXK.FIRST, c, PXK.LAST - PXK.FIRST + 1, 1); };
  body('maCuon').setNumberFormat('@').setFontFamily('Roboto Mono').setBackground('#f9fafb');
  body('dauThu').setNumberFormat('@');
  body('kg').setNumberFormat('#,##0.##').setFontWeight('bold');
  body('ngaySX').setNumberFormat('dd/MM/yyyy');
  sh.getRange(PXK.FIRST, 1, PXK.LAST - PXK.FIRST + 1, nCols).setBorder(true, true, true, true, true, true, '#e5e7eb', null);
  sh.setFrozenRows(PXK.HEADER_ROW);
  sh.setRowHeight(1, 46);
  sh.setRowHeight(8, 34);
  sh.setRowHeight(PXK.HEADER_ROW, 40);

  // Công thức tổng
  var F = function (a1, f) { sh.getRange(a1).setFormula(localizeFormula_(f, sep)); };
  var kgL = colLetter_(pxkCol_('kg')), spL = colLetter_(pxkCol_('maSP'));
  var kgR = kgL + PXK.FIRST + ':' + kgL + PXK.LAST, spR = spL + PXK.FIRST + ':' + spL + PXK.LAST;
  var sp = letterOf_('DM_SanPham', 'maSP'), bi = letterOf_('DM_SanPham', 'truBi'), dv = letterOf_('DM_SanPham', 'donVi');
  var T = PXK.TOTALS;
  F(T.count, '=COUNTIF(' + kgR + ',">0")');
  F(T.kg, '=SUM(' + kgR + ')');
  F(T.bi, '=SUMPRODUCT(ARRAYFORMULA((N(' + kgR + ')>0)*(IFERROR(VLOOKUP(' + spR + ',{DM_SanPham!' + sp + ':' + sp + ',DM_SanPham!' + dv + ':' + dv + '},2,0),"")="PALLET")' +
    '*IFERROR(VLOOKUP(' + spR + ',{DM_SanPham!' + sp + ':' + sp + ',DM_SanPham!' + bi + ':' + bi + '},2,0),0)))');
  F(T.net, '=' + T.kg + '-' + T.bi);

  pxkApplyValidations_(ss, sh);
  pxkPlaceButtons_(sh);
  if (isNew) pxkFillNew_(sh);
  return sh;
}

function pxkApplyValidations_(ss, sh) {
  var listRule = function (src, key) {
    var L = letterOf_(src, key);
    return SpreadsheetApp.newDataValidation().requireValueInRange(ss.getSheetByName(src).getRange(L + '2:' + L), true).setAllowInvalid(true).build();
  };
  var inList = function (arr) { return SpreadsheetApp.newDataValidation().requireValueInList(arr, true).setAllowInvalid(true).build(); };
  var F = PXK.F;
  sh.getRange(F.khach).setDataValidation(listRule('DM_KhachHang', 'ten'));
  sh.getRange(F.kho).setDataValidation(listRule('DM_Kho', 'ma'));
  sh.getRange(F.xe).setDataValidation(listRule('DM_Xe', 'bienSo'));
  sh.getRange(F.taiXe).setDataValidation(listRule('DM_TaiXe', 'ten'));
  sh.getRange(F.nguoiLap).setDataValidation(listRule('DM_NhanVien', 'ten'));
  sh.getRange(F.thuKho).setDataValidation(listRule('DM_NhanVien', 'ten'));
  sh.getRange(F.soHuuXe).setDataValidation(inList(['Công ty', 'Thuê ngoài']));
  sh.getRange(F.ngay).setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
  var n = PXK.LAST - PXK.FIRST + 1;
  sh.getRange(PXK.FIRST, pxkCol_('maSP'), n, 1).setDataValidation(listRule('DM_SanPham', 'maSP'));
  sh.getRange(PXK.FIRST, pxkCol_('ca'), n, 1).setDataValidation(listRule('DM_Ca', 'ma'));
  sh.getRange(PXK.FIRST, pxkCol_('may'), n, 1).setDataValidation(listRule('DM_Kho', 'ma'));
  sh.getRange(PXK.FIRST, pxkCol_('ngaySX'), n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build());
  sh.getRange(PXK.FIRST, pxkCol_('kg'), n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireNumberGreaterThan(0).setAllowInvalid(false)
    .setHelpText('Trọng lượng (kg) phải là số > 0').build());
}

/** Đặt ảnh nút bấm ở dòng 1 và gắn hàm. Xoá nút cũ để không bị trùng khi cài đặt lại. */
function pxkPlaceButtons_(sh) {
  var mine = {};
  PXK.BUTTONS.forEach(function (b) { mine[b[1]] = 1; });
  sh.getImages().forEach(function (img) {
    var fn = '';
    try { fn = img.getScript(); } catch (e) { fn = ''; }
    if (mine[fn]) img.remove();
  });
  PXK.BUTTONS.forEach(function (b) {
    var spec = PXK_BUTTONS[b[0]];
    var blob = Utilities.newBlob(Utilities.base64Decode(spec.png), 'image/png', 'btn_' + b[0] + '.png');
    var img = sh.insertImage(blob, b[2], 1, 4, 4);
    img.setWidth(spec.w).setHeight(spec.h);
    img.assignScript(b[1]);
    try { img.setAltTextTitle(b[0] === 'PRINT' ? 'In phiếu (lưu + in)' : b[0] === 'NEW' ? 'Phiếu mới' : 'Mở phiếu theo số'); } catch (e) { /* ignore */ }
  });
}

// ===================== Đọc / ghi sheet =====================

function pxkCell_(values, a1) {
  var m = a1.match(/^([A-Z]+)(\d+)$/);
  var col = 0;
  for (var i = 0; i < m[1].length; i++) col = col * 26 + (m[1].charCodeAt(i) - 64);
  return values[Number(m[2]) - 1][col - 1];
}

/** Đọc sheet PXK -> payload cho savePhieu + vị trí dòng của từng cuộn. */
function pxkRead_(sh) {
  var nCols = PXK.COLS.length;
  var values = sh.getRange(1, 1, PXK.LAST, nCols).getValues();
  var p = {};
  Object.keys(PXK.F).forEach(function (k) { p[k] = pxkCell_(values, PXK.F[k]); });
  p.id = str_(p.id);
  p.so = str_(p.so);
  p.lines = [];
  var rows = [];
  var prev = null;
  for (var r = PXK.FIRST; r <= PXK.LAST; r++) {
    var row = values[r - 1];
    var o = {};
    PXK.COLS.forEach(function (c, i) { o[c[0]] = row[i]; });
    var hasKg = o.kg !== '' && o.kg !== null;
    if (!hasKg && !str_(o.maSP) && !str_(o.maCuon)) continue;
    // ô trống = giống dòng trên
    if (prev) ['maSP', 'ca', 'may', 'ngaySX'].forEach(function (k) { if (o[k] === '' || o[k] === null) o[k] = prev[k]; });
    if (!o.may) o.may = p.kho;
    p.lines.push(o);
    rows.push(r);
    prev = o;
  }
  return { payload: p, rows: rows, values: values };
}

/** Lưu phiếu từ sheet PXK, ghi lại số phiếu / ID / mã cuộn. Trả về phiếu đã lưu. */
function pxkSave_() {
  var sh = pxkSheet_();
  var rd = pxkRead_(sh);
  var p = rd.payload;
  var miss = [];
  p.lines.forEach(function (l, i) { if (!str_(l.ca)) miss.push('Dòng ' + rd.rows[i] + ': thiếu Ca SX.'); });
  if (miss.length) throw new Error(miss.join('\n'));
  if (!p.so && p.ngay) p.so = getNextSoPhieu(isoDate_(p.ngay));
  var saved = savePhieu(p);

  // Ghi lại lên sheet
  sh.getRange(PXK.F.so).setValue(saved.so);
  sh.getRange(PXK.F.id).setValue(saved.id);
  // ghi 1 lần cho cả khối Mã SP → Mã cuộn (nhanh hơn ghi từng ô)
  var c1 = pxkCol_('maSP'), c2 = pxkCol_('maCuon');
  var n = PXK.LAST - PXK.FIRST + 1;
  var block = sh.getRange(PXK.FIRST, c1, n, c2 - c1 + 1).getValues();
  saved.lines.forEach(function (l, i) {
    var r = rd.rows[i];
    if (!r) return;
    var row = block[r - PXK.FIRST];
    row[pxkCol_('maSP') - c1] = l.maSP;
    row[pxkCol_('ca') - c1] = l.ca;
    row[pxkCol_('may') - c1] = l.may;
    row[pxkCol_('maCuon') - c1] = l.maCuon;
  });
  sh.getRange(PXK.FIRST, c1, n, c2 - c1 + 1).setValues(block);
  sh.getRange(PXK.STATUS).setValue('Đã lưu ' + isoDateTime_(new Date()).replace(/^(\d{4})-(\d{2})-(\d{2})/, '$3/$2/$1') +
    ' · ' + saved.soLuong + ' cuộn/pallet · thực xuất ' + saved.thucXuat + ' kg').setFontColor('#047857');
  return saved;
}

/** Điền mặc định cho phiếu mới. */
function pxkFillNew_(sh) {
  var md = getMasterData();
  var today = parseDate_(md.today);
  var lap = md.staff.filter(function (s) { return (s.vaiTro || '').toLowerCase().indexOf('lập') >= 0; })[0];
  var tk = md.staff.filter(function (s) { return (s.vaiTro || '').toLowerCase().indexOf('thủ kho') >= 0; })[0];
  var set = function (k, v) { sh.getRange(PXK.F[k]).setValue(v); };
  set('so', getNextSoPhieu(md.today));
  set('ngay', today);
  set('kho', md.warehouses[0] ? md.warehouses[0].ma : '');
  set('nguoiLap', lap ? lap.ten : '');
  set('thuKho', tk ? tk.ten : '');
  sh.getRange(PXK.STATUS).setValue(PXK.STATUS_NEW).setFontColor('#b45309');
}

function pxkClear_(sh) {
  Object.keys(PXK.F).forEach(function (k) { sh.getRange(PXK.F[k]).clearContent(); });
  sh.getRange(PXK.FIRST, 1, PXK.LAST - PXK.FIRST + 1, PXK.COLS.length).clearContent();
}

/** Nạp 1 phiếu đã lưu lên sheet PXK. */
function pxkFill_(sh, ph) {
  if (ph.lines.length > PXK.LAST - PXK.FIRST + 1) throw new Error('Phiếu có ' + ph.lines.length + ' dòng, sheet PXK chỉ chứa ' + (PXK.LAST - PXK.FIRST + 1) + ' dòng. Dùng web app để sửa phiếu này.');
  pxkClear_(sh);
  var set = function (k, v) { sh.getRange(PXK.F[k]).setValue(v === undefined || v === null ? '' : v); };
  set('so', ph.so); set('ngay', parseDate_(ph.ngay)); set('kho', ph.kho); set('nguoiLap', ph.nguoiLap);
  set('khach', ph.khach); set('diaChi', ph.diaChi);
  set('xe', ph.xe); set('soHuuXe', ph.soHuuXe); set('taiXe', ph.taiXe); set('sdtTaiXe', ph.sdtTaiXe);
  set('thuKho', ph.thuKho); set('phuCap', ph.phuCap || ''); set('ghiChu', ph.ghiChu); set('id', ph.id);
  if (ph.lines.length) {
    var rows = ph.lines.map(function (l) {
      return PXK.COLS.map(function (c) {
        var v = l[c[0]];
        if (c[0] === 'ngaySX') return v ? parseDate_(v) : '';
        return v === undefined || v === null ? '' : v;
      });
    });
    sh.getRange(PXK.FIRST, 1, rows.length, PXK.COLS.length).setValues(rows);
  }
  var cancelled = ph.trangThai === APP.STATUS_CANCEL;
  sh.getRange(PXK.STATUS).setValue(cancelled ? 'PHIẾU ĐÃ HUỶ — chỉ xem, không lưu được.' : 'Đã mở phiếu ' + ph.so + ' (đã lưu). Sửa xong bấm IN PHIẾU để lưu lại.')
    .setFontColor(cancelled ? '#b91c1c' : '#047857');
}

/** Tìm phiếu theo số (ưu tiên phiếu chưa huỷ, mới nhất). */
function pxkFindBySo_(so) {
  so = str_(so);
  var hits = listPhieu({ q: so, limit: 1000 }).filter(function (r) { return r.so === so; });
  hits.sort(function (a, b) {
    var ca = a.trangThai === APP.STATUS_CANCEL ? 1 : 0, cb = b.trangThai === APP.STATUS_CANCEL ? 1 : 0;
    return ca - cb || (a.ngay < b.ngay ? 1 : -1);
  });
  return hits[0] ? getPhieu(hits[0].id) : null;
}

// ===================== Hàm gắn vào nút bấm =====================

/** Nút IN PHIẾU: lưu + mở trang in. */
function pxkPrint() {
  var ui = SpreadsheetApp.getUi();
  var ss = ss_();
  try {
    ss.toast('Đang lưu phiếu…', 'AFC Form', 10);
    var saved = pxkSave_();
    ss.toast('Đã lưu phiếu ' + saved.so, 'AFC Form', 4);
    pxkShowPrintDialog_(saved);
  } catch (e) {
    ui.alert('Chưa lưu được phiếu', e.message, ui.ButtonSet.OK);
  }
}

/** Nút + PHIẾU MỚI. */
function pxkNew() {
  var ui = SpreadsheetApp.getUi();
  var sh = pxkSheet_();
  var status = str_(sh.getRange(PXK.STATUS).getValue());
  var hasLines = pxkRead_(sh).payload.lines.length > 0;
  var unsaved = hasLines && (!str_(sh.getRange(PXK.F.id).getValue()) || status === PXK.STATUS_DIRTY);
  if (unsaved) {
    var ok = ui.alert('Phiếu mới', 'Phiếu đang nhập có thay đổi CHƯA LƯU. Xoá và lập phiếu mới?', ui.ButtonSet.YES_NO);
    if (ok !== ui.Button.YES) return;
  }
  pxkClear_(sh);
  pxkFillNew_(sh);
  sh.getRange(PXK.F.khach).activate();
}

/** Nút MỞ PHIẾU THEO SỐ. */
function pxkLoad() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('Mở phiếu theo số', 'Nhập số phiếu cần mở (vd 230/11):', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var so = str_(res.getResponseText());
  if (!so) return;
  var ph = pxkFindBySo_(so);
  if (!ph) { ui.alert('Không tìm thấy phiếu số ' + so + '.'); return; }
  pxkFill_(pxkSheet_(), ph);
}

function pxkShowPrintDialog_(ph) {
  var base = webAppUrl_();
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  var url = function (page, extra) { return base + '?page=' + page + '&px=' + encodeURIComponent(ph.id) + (extra || ''); };
  var body;
  if (!base) {
    body = '<p>Đã lưu phiếu <b>' + esc(ph.so) + '</b>, nhưng chưa có link web app để mở trang in.</p>' +
      '<p>Điền link web app (…/exec) vào sheet <b>CauHinh</b>, khoá <b>WEB_APP_URL</b>.</p>';
  } else {
    var btn = function (href, text, pri) {
      return '<a href="' + esc(href) + '" target="_blank" style="display:block;text-align:center;margin:6px 0;padding:10px;border-radius:8px;text-decoration:none;font-weight:600;' +
        (pri ? 'background:#1d4ed8;color:#fff' : 'border:1px solid #d1d5db;color:#111827') + '">' + esc(text) + '</a>';
    };
    body = '<p style="margin:0 0 10px">Đã lưu phiếu <b>' + esc(ph.so) + '</b> · ' + esc(ph.khach) + '<br>' +
      ph.soLuong + ' cuộn/pallet · thực xuất <b>' + Number(ph.thucXuat).toLocaleString('vi-VN') + ' kg</b></p>' +
      btn(url('print', '&auto=1'), 'Mở trang in phiếu xuất kho (A4)', true) +
      btn(url('tem'), 'Tem KCS + COA (A5)') +
      btn(url('bienban'), 'Biên bản giao nhận (A4)') +
      '<script>var w=window.open(' + JSON.stringify(url('print', '&auto=1')) + ',"_blank");if(w)setTimeout(function(){google.script.host.close()},300);</script>';
  }
  var html = HtmlService.createHtmlOutput('<div style="font:14px Arial,sans-serif;color:#111">' + body + '</div>').setWidth(360).setHeight(base ? 250 : 150);
  SpreadsheetApp.getUi().showModalDialog(html, 'In phiếu ' + ph.so);
}

// ===================== Tự điền khi sửa trên sheet PXK =====================

/** Simple trigger: chạy mỗi khi sửa ô trên bảng tính. */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sh = e.range.getSheet();
    if (sh.getName() !== PXK.NAME) return;
    pxkOnEdit_(sh, e.range);
  } catch (err) {
    // không làm phiền người dùng, nhưng ghi log để xem ở Apps Script → Executions
    console.error('onEdit lỗi: ' + (err && err.stack ? err.stack : err));
  }
}

function pxkOnEdit_(sh, rg) {
  var r0 = rg.getRow(), c0 = rg.getColumn(), nr = rg.getNumRows(), nc = rg.getNumColumns();
  var a1 = rg.getA1Notation();
  var F = PXK.F;
  var get = function (k) { return str_(sh.getRange(F[k]).getValue()); };
  var setIfEmpty = function (k, v, force) { if (v && (force || !get(k))) sh.getRange(F[k]).setValue(v); };

  // 1) Thông tin phiếu: xe -> tài xế; tài xế -> SĐT; khách -> địa chỉ
  if (nr === 1 && nc === 1 && r0 < PXK.HEADER_ROW) {
    var v = str_(rg.getValue()).toLowerCase();
    if (a1 === F.xe && v) {
      var veh = readTable_('DM_Xe').rows.filter(function (x) { return str_(x.bienSo).toLowerCase() === v; })[0];
      if (veh) { setIfEmpty('soHuuXe', str_(veh.soHuu), true); setIfEmpty('taiXe', str_(veh.taiXeMacDinh)); }
    }
    if (a1 === F.xe || a1 === F.taiXe) {
      var tx = get('taiXe').toLowerCase();
      var d = tx && readTable_('DM_TaiXe').rows.filter(function (x) { return str_(x.ten).toLowerCase() === tx; })[0];
      if (d) { setIfEmpty('sdtTaiXe', str_(d.sdt), a1 === F.taiXe); setIfEmpty('xe', str_(d.xeMacDinh)); }
    }
    if (a1 === F.khach && v) {
      var c = readTable_('DM_KhachHang').rows.filter(function (x) { return str_(x.ten).toLowerCase() === v; })[0];
      if (c) setIfEmpty('diaChi', str_(c.diaChi), true);
    }
  }

  // 2) Bảng hàng: khi gõ kg ở dòng nào, ô Mã SP / Ca / Máy / Ngày SX còn trống của dòng đó
  //    lấy theo dòng có kg gần nhất phía trên (giống dấu " trên phiếu giấy). Ô nào còn trống
  //    lúc lưu cũng được điền theo cùng quy tắc. Chỉ ghi đúng ô trống (không ghi đè cả khối,
  //    tránh mất chữ người dùng vừa gõ trong lúc trigger đang chạy).
  var cKg = pxkCol_('kg');
  var lastRow = Math.min(r0 + nr - 1, PXK.LAST);
  if (lastRow >= PXK.FIRST && c0 <= cKg && c0 + nc - 1 >= cKg) {
    var cB = pxkCol_('maSP'), width = pxkCol_('ngaySX') - cB + 1;
    var block = sh.getRange(PXK.FIRST, cB, lastRow - PXK.FIRST + 1, width).getValues();
    var iKg = cKg - cB;
    var inherit = ['maSP', 'ca', 'may', 'ngaySX'].map(function (k) { return pxkCol_(k) - cB; });
    var prev = null;
    for (var i = 0; i < block.length; i++) {
      var row = block[i];
      if (row[iKg] === '' || row[iKg] === null) continue;
      if (prev && PXK.FIRST + i >= r0) {
        inherit.forEach(function (j) {
          if ((row[j] === '' || row[j] === null) && prev[j] !== '' && prev[j] !== null) {
            row[j] = prev[j];
            sh.getRange(PXK.FIRST + i, cB + j).setValue(prev[j]);
          }
        });
      }
      prev = row;
    }
  }

  // 3) Đánh dấu "chưa lưu" nếu đang sửa phiếu đã lưu
  if (r0 >= 3 && a1 !== PXK.STATUS && a1 !== F.id && get('id')) {
    var st = sh.getRange(PXK.STATUS);
    if (str_(st.getValue()).indexOf('ĐÃ HUỶ') < 0) st.setValue(PXK.STATUS_DIRTY).setFontColor('#b45309');
  }
}

