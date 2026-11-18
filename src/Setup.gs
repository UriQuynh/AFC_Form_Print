/**
 * Tạo / cập nhật cấu trúc Google Sheet (chạy lại nhiều lần an toàn):
 *  - tạo các sheet danh mục, dữ liệu, cấu hình, báo cáo
 *  - thêm cột còn thiếu (không xoá, không đổi thứ tự cột đang có)
 *  - gắn dropdown (data validation) để nhập trực tiếp trên sheet
 *  - dữ liệu danh mục ban đầu (chỉ khi sheet còn trống)
 */

var SEED = {
  DM_Kho: [['M1', 'Kho / máy 1'], ['M2', 'Kho / máy 2'], ['M3', 'Kho / máy 3']],
  DM_Ca: [['C1', 'Ca 1'], ['C2', 'Ca 2'], ['C3', 'Ca 3']],
  DM_SanPham: [
    // maSP, loaiGiay, khổ, định lượng, đơn vị, trừ bì
    ['K76/450', 'GIẤY CARTON', 76, 450, 'CUỘN', 0],
    ['K78/450', 'GIẤY CARTON', 78, 450, 'CUỘN', 0],
    ['K130/430', 'GIẤY CHIA BÁNH', 130, 430, 'PALLET', 12],
  ],
  DM_KhachHang: [['PHƯỚC HIỆP THÀNH'], ['STARFLEX']],
  DM_Xe: [['50LD-200.94', 'Tải', '', 'Thuê ngoài'], ['51F-442.06', 'Tải', '', 'Công ty']],
  DM_TaiXe: [],
  DM_NhanVien: [['Phòng Nhật Thuận', 'Kế hoạch', 'Lập phiếu']],
};

function setupSheets() {
  requireLicenseUi_();
  // Chặn 2 lần chạy song song (vd bấm menu 2 lần) -> tránh tạo sheet "..._conflict"
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    try { SpreadsheetApp.getUi().alert('Đang có một lần cài đặt khác chạy. Đợi chạy xong rồi thử lại.'); } catch (e) { /* editor */ }
    return false;
  }
  try {
    return setupSheetsLocked_();
  } finally {
    lock.releaseLock();
  }
}

function setupSheetsLocked_() {
  var ss = ss_();
  PropertiesService.getScriptProperties().setProperty(SPREADSHEET_ID_PROP, ss.getId());
  try { ss.setSpreadsheetTimeZone(APP.TZ); } catch (e) { /* ignore */ }

  var order = [PXK.NAME, 'PhieuXuat', 'ChiTiet', 'BaoCao', 'DM_SanPham', 'DM_KhachHang', 'DM_TaiXe', 'DM_Xe', 'DM_Kho', 'DM_Ca', 'DM_NhanVien', 'CauHinh'];
  var created = {};
  order.forEach(function (name) {
    if (name === 'BaoCao' || name === PXK.NAME) return;
    if (SCHEMA[name].kind === 'list') migrateActiveColumn_(ss, name);
    created[name] = ensureSheet_(ss, name);
  });
  removeEmptyConflictSheets_(ss);

  // Dữ liệu ban đầu cho danh mục mới tạo
  Object.keys(SEED).forEach(function (name) {
    if (!created[name] || !SEED[name].length) return;
    var keys = SCHEMA[name].cols.map(function (c) { return c[0]; });
    appendObjects_(name, SEED[name].map(function (vals) {
      var o = {};
      vals.forEach(function (v, i) { o[keys[i]] = v; });
      return o;
    }));
  });
  if (created.CauHinh) {
    appendObjects_('CauHinh', DEFAULT_CONFIG.map(function (c) { return { key: c[0], value: c[1], moTa: c[2] }; }));
  } else {
    // bổ sung khoá cấu hình mới (nếu có)
    var have = {};
    readTable_('CauHinh').rows.forEach(function (r) { have[str_(r.key)] = 1; });
    var missing = DEFAULT_CONFIG.filter(function (c) { return !have[c[0]]; });
    if (missing.length) appendObjects_('CauHinh', missing.map(function (c) { return { key: c[0], value: c[1], moTa: c[2] }; }));
  }

  applyFormats_(ss);
  applyValidations_(ss);
  buildReportSheet_(ss);
  var pxkSheet = buildPxkSheet_(ss, formulaSeparator_(ss.getSheetByName('BaoCao')));

  // Sắp thứ tự tab
  order.forEach(function (name, i) {
    if (name === PXK.NAME && !pxkSheet) return;
    var sh = ss.getSheetByName(name);
    if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); }
  });
  ss.setActiveSheet(pxkSheet || ss.getSheetByName('PhieuXuat'));

  try {
    SpreadsheetApp.getUi().alert('Đã cài đặt xong cấu trúc sheet.\n\nLập phiếu ngay trên sheet "Nhập PXK" (nút IN PHIẾU), hoặc mở web app: menu "AFC Form" → "Mở form nhập liệu".');
  } catch (e) { /* chạy từ editor: không có UI */ }
  return true;
}

/** Tạo sheet nếu chưa có; thêm cột còn thiếu. Trả về true nếu vừa tạo mới. */
function ensureSheet_(ss, name) {
  var def = SCHEMA[name];
  var sh = ss.getSheetByName(name);
  var isNew = false;
  if (!sh) { sh = ss.insertSheet(name); isNew = true; }
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var have = header.map(function (h) { return String(h).trim().toLowerCase(); });
  var blankHeader = have.every(function (h) { return !h; });
  if (blankHeader) { header = []; have = []; isNew = isNew || sh.getLastRow() <= 1; }
  var add = def.cols.filter(function (c) { return have.indexOf(c[1].toLowerCase()) < 0; }).map(function (c) { return c[1]; });
  if (add.length) {
    var start = header.length + 1;
    if (sh.getMaxColumns() < start + add.length - 1) sh.insertColumnsAfter(sh.getMaxColumns(), start + add.length - 1 - sh.getMaxColumns());
    sh.getRange(1, start, 1, add.length).setValues([add]);
  }
  var full = sh.getRange(1, 1, 1, sh.getLastColumn());
  full.setFontWeight('bold').setBackground(def.color).setWrap(true).setVerticalAlignment('middle');
  sh.setFrozenRows(1);
  return isNew;
}

function colLetter_(n) {
  var s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Chữ cột (A, B, ...) của key trên sheet thực tế. */
function letterOf_(name, key) {
  var sh = ss_().getSheetByName(name);
  var idx = colIndex_(name, sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]);
  if (idx[key] === undefined) throw new Error('Sheet ' + name + ' thiếu cột ' + key);
  return colLetter_(idx[key] + 1);
}

function colRange_(ss, name, key) {
  var sh = ss.getSheetByName(name);
  var L = letterOf_(name, key);
  return sh.getRange(L + '2:' + L);
}

function applyFormats_(ss) {
  var fmt = function (name, keys, pattern) {
    keys.forEach(function (k) { colRange_(ss, name, k).setNumberFormat(pattern); });
  };
  fmt('PhieuXuat', ['ngay'], 'dd/MM/yyyy');
  fmt('PhieuXuat', ['taoLuc', 'capNhat'], 'dd/MM/yyyy HH:mm');
  fmt('PhieuXuat', ['tongKg', 'truBi', 'thucXuat', 'phuCap'], '#,##0');
  fmt('ChiTiet', ['ngay', 'ngaySX'], 'dd/MM/yyyy');
  fmt('ChiTiet', ['kg', 'truBi'], '#,##0');
  fmt('DM_TaiXe', ['donGiaChuyen', 'donGiaTan'], '#,##0');
  // Mã cuộn / số phiếu / số dấu thử dạng text để không bị đổi thành số/ngày
  fmt('PhieuXuat', ['so', 'id'], '@');
  fmt('ChiTiet', ['so', 'phieuId', 'maCuon', 'dauThu'], '@');

  Object.keys(SCHEMA).forEach(function (name) {
    if (SCHEMA[name].kind !== 'list') return;
    // Checkbox "Ngừng dùng": để trống = đang dùng; tick = ẩn khỏi dropdown.
    // Dùng data validation (không insertCheckboxes) để không ghi FALSE vào hàng trăm dòng trống.
    colRange_(ss, name, 'ngung').setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
    var sh = ss.getSheetByName(name);
    sh.setColumnWidths(1, Math.max(sh.getLastColumn(), 1), 150);
  });
  ss.getSheetByName('CauHinh').setColumnWidth(1, 180).setColumnWidth(2, 420).setColumnWidth(3, 360);
}

function applyValidations_(ss) {
  var listRule = function (srcName, srcKey, allowNew) {
    var L = letterOf_(srcName, srcKey);
    return SpreadsheetApp.newDataValidation()
      .requireValueInRange(ss.getSheetByName(srcName).getRange(L + '2:' + L), true)
      .setAllowInvalid(!!allowNew)
      .build();
  };
  var set = function (name, key, rule) { colRange_(ss, name, key).setDataValidation(rule); };

  // Danh mục -> dropdown trên sheet dữ liệu (cho phép gõ giá trị mới, chỉ cảnh báo)
  set('PhieuXuat', 'khach', listRule('DM_KhachHang', 'ten', true));
  set('PhieuXuat', 'kho', listRule('DM_Kho', 'ma', true));
  set('PhieuXuat', 'xe', listRule('DM_Xe', 'bienSo', true));
  set('PhieuXuat', 'taiXe', listRule('DM_TaiXe', 'ten', true));
  set('PhieuXuat', 'nguoiLap', listRule('DM_NhanVien', 'ten', true));
  set('PhieuXuat', 'thuKho', listRule('DM_NhanVien', 'ten', true));
  set('PhieuXuat', 'trangThai', SpreadsheetApp.newDataValidation().requireValueInList([APP.STATUS_OK, APP.STATUS_CANCEL], true).build());
  set('ChiTiet', 'maSP', listRule('DM_SanPham', 'maSP', true));
  set('ChiTiet', 'ca', listRule('DM_Ca', 'ma', true));
  set('ChiTiet', 'may', listRule('DM_Kho', 'ma', true));
  set('ChiTiet', 'trangThai', SpreadsheetApp.newDataValidation().requireValueInList([APP.STATUS_OK, APP.STATUS_CANCEL], true).build());

  // Danh mục tham chiếu chéo
  set('DM_SanPham', 'donVi', SpreadsheetApp.newDataValidation().requireValueInList([APP.UNIT_ROLL, APP.UNIT_PALLET], true).setAllowInvalid(false).build());
  set('DM_SanPham', 'loaiGiay', SpreadsheetApp.newDataValidation().requireValueInList(['GIẤY CARTON', 'GIẤY CHIA BÁNH'], true).setAllowInvalid(true).build());
  set('DM_TaiXe', 'loai', SpreadsheetApp.newDataValidation().requireValueInList(['Công ty', 'Thuê ngoài'], true).setAllowInvalid(true).build());
  set('DM_TaiXe', 'xeMacDinh', listRule('DM_Xe', 'bienSo', true));
  set('DM_Xe', 'soHuu', SpreadsheetApp.newDataValidation().requireValueInList(['Công ty', 'Thuê ngoài'], true).setAllowInvalid(true).build());
  set('DM_Xe', 'taiXeMacDinh', listRule('DM_TaiXe', 'ten', true));
  set('DM_NhanVien', 'vaiTro', SpreadsheetApp.newDataValidation().requireValueInList(['Lập phiếu', 'Thủ kho', 'KCS', 'Quản lý'], true).setAllowInvalid(true).build());
}

/**
 * Sheet BaoCao: nhập Từ ngày / Đến ngày ở B2:B3, các bảng QUERY tự cập nhật.
 */
function buildReportSheet_(ss) {
  var sh = ss.getSheetByName('BaoCao') || ss.insertSheet('BaoCao');
  sh.clear();
  var sep = formulaSeparator_(sh);
  var F = function (a1, formula) { sh.getRange(a1).setFormula(localizeFormula_(formula, sep)); };
  var C = function (k) { return letterOf_('ChiTiet', k); };
  var P = function (k) { return letterOf_('PhieuXuat', k); };
  var T = function (k) { return letterOf_('DM_TaiXe', k); };
  var lastCT = colLetter_(ss.getSheetByName('ChiTiet').getLastColumn());
  var lastPX = colLetter_(ss.getSheetByName('PhieuXuat').getLastColumn());
  var cancel = APP.STATUS_CANCEL;

  var today = new Date();
  sh.getRange('A1').setValue('BÁO CÁO SẢN LƯỢNG XUẤT KHO & CHUYẾN TÀI XẾ').setFontWeight('bold').setFontSize(14);
  sh.getRange('A2:A3').setValues([['Từ ngày'], ['Đến ngày']]).setFontWeight('bold');
  sh.getRange('B2:B3').setValues([[new Date(today.getFullYear(), today.getMonth(), 1)], [new Date(today.getFullYear(), today.getMonth() + 1, 0)]])
    .setNumberFormat('dd/MM/yyyy').setBackground('#fff8e1');
  sh.getRange('B2:B3').setDataValidation(SpreadsheetApp.newDataValidation().requireDate().build());
  sh.getRange('C2').setValue('← sửa ngày để lọc');
  F('D2', '="date \'"&TEXT(IF(B2="",DATE(2000,1,1),B2),"yyyy-mm-dd")&"\'"');
  F('D3', '="date \'"&TEXT(IF(B3="",DATE(2100,1,1),B3),"yyyy-mm-dd")&"\'"');
  sh.getRange('D2:D3').setFontColor('#bbbbbb');

  var ctRange = 'ChiTiet!A:' + lastCT;
  var pxRange = 'PhieuXuat!A:' + lastPX;
  var whereCT = ' where ' + C('ngay') + ' >= "&$D$2&" and ' + C('ngay') + ' <= "&$D$3&" and ' + C('trangThai') + ' <> \'' + cancel + '\'';
  var wherePX = ' where ' + P('ngay') + ' >= "&$D$2&" and ' + P('ngay') + ' <= "&$D$3&" and ' + P('trangThai') + ' <> \'' + cancel + '\'';

  var blocks = [
    {
      cell: 'A5', title: 'SẢN LƯỢNG THEO NGÀY',
      q: '=QUERY(' + ctRange + ',"select ' + C('ngay') + ', count(' + C('maCuon') + '), sum(' + C('kg') + '), sum(' + C('truBi') + '), sum(' + C('kg') + ')-sum(' + C('truBi') + ')' +
        whereCT + ' group by ' + C('ngay') + ' order by ' + C('ngay') +
        ' label ' + C('ngay') + ' \'Ngày\', count(' + C('maCuon') + ') \'Số cuộn/pallet\', sum(' + C('kg') + ') \'Tổng kg\', sum(' + C('truBi') + ') \'Trừ bì\', sum(' + C('kg') + ')-sum(' + C('truBi') + ') \'Thực xuất (kg)\'",1)',
      fmt: [['A6:A', 'dd/MM/yyyy'], ['B6:E', '#,##0']],
    },
    {
      cell: 'G5', title: 'THEO SẢN PHẨM',
      q: '=QUERY(' + ctRange + ',"select ' + C('maSP') + ', count(' + C('maCuon') + '), sum(' + C('kg') + ')-sum(' + C('truBi') + ')' +
        whereCT + ' group by ' + C('maSP') + ' order by count(' + C('maCuon') + ') desc' +
        ' label ' + C('maSP') + ' \'Mã SP\', count(' + C('maCuon') + ') \'Số cuộn/pallet\', sum(' + C('kg') + ')-sum(' + C('truBi') + ') \'Thực xuất (kg)\'",1)',
      fmt: [['H6:I', '#,##0']],
    },
    {
      cell: 'K5', title: 'THEO KHÁCH HÀNG',
      q: '=QUERY(' + pxRange + ',"select ' + P('khach') + ', count(' + P('id') + '), sum(' + P('soLuong') + '), sum(' + P('thucXuat') + ')' +
        wherePX + ' group by ' + P('khach') + ' order by sum(' + P('thucXuat') + ') desc' +
        ' label ' + P('khach') + ' \'Khách hàng\', count(' + P('id') + ') \'Số phiếu\', sum(' + P('soLuong') + ') \'Số cuộn/pallet\', sum(' + P('thucXuat') + ') \'Thực xuất (kg)\'",1)',
      fmt: [['L6:N', '#,##0']],
    },
    {
      cell: 'P5', title: 'TÀI XẾ — SỐ CHUYẾN & LƯƠNG',
      q: '=QUERY(' + pxRange + ',"select ' + P('taiXe') + ', count(' + P('id') + '), sum(' + P('thucXuat') + '), sum(' + P('phuCap') + ')' +
        wherePX + ' and ' + P('taiXe') + ' is not null group by ' + P('taiXe') + ' order by count(' + P('id') + ') desc' +
        ' label ' + P('taiXe') + ' \'Tài xế\', count(' + P('id') + ') \'Số chuyến\', sum(' + P('thucXuat') + ') \'Thực xuất (kg)\', sum(' + P('phuCap') + ') \'Phụ cấp\'",1)',
      fmt: [['Q6:T', '#,##0']],
    },
  ];
  blocks.forEach(function (b) {
    var cell = sh.getRange(b.cell);
    cell.offset(-1, 0).setValue(b.title).setFontWeight('bold').setFontColor('#1a56db');
    F(b.cell, b.q);
    b.fmt.forEach(function (f) { sh.getRange(f[0]).setNumberFormat(f[1]); });
  });
  // Lương = số chuyến × đơn giá/chuyến + tấn × đơn giá/tấn + phụ cấp (đơn giá lấy từ DM_TaiXe)
  var name = T('ten'), dgc = T('donGiaChuyen'), dgt = T('donGiaTan');
  F('T5',
    '={"Lương (đ)";ARRAYFORMULA(IF(P6:P="","",Q6:Q*IFERROR(VLOOKUP(P6:P,{DM_TaiXe!' + name + ':' + name + ',DM_TaiXe!' + dgc + ':' + dgc + '},2,0),0)' +
    '+R6:R/1000*IFERROR(VLOOKUP(P6:P,{DM_TaiXe!' + name + ':' + name + ',DM_TaiXe!' + dgt + ':' + dgt + '},2,0),0)+N(S6:S)))}');
  sh.getRange('A5:T5').setFontWeight('bold').setBackground('#e8f0fe');
  sh.setFrozenRows(5);
  sh.setColumnWidth(1, 110);
  [6, 10, 15].forEach(function (c) { sh.setColumnWidth(c, 24); });
  sh.setColumnWidth(11, 200);
  sh.setColumnWidth(16, 170);
}

// ===================== Công thức theo ngôn ngữ bảng tính =====================

/**
 * Bảng tính dùng dấu thập phân "," (vd tiếng Việt) thì công thức dùng ";" để ngăn đối số.
 * Dò bằng cách ghi thử 1 công thức vào ô tạm.
 */
function formulaSeparator_(sh) {
  var probe = sh.getRange(sh.getMaxRows(), sh.getMaxColumns());
  try {
    probe.setFormula('=SUM(1,2)');
    SpreadsheetApp.flush();
    var v = probe.getValue();
    if (v === 3) return ',';
    if (v !== '' && v !== null) return ';'; // #ERROR! -> bảng tính dùng ";"
    return ',';
  } catch (e) {
    return ',';
  } finally {
    probe.clearContent();
  }
}

/**
 * Đổi công thức viết kiểu en-US sang kiểu dùng ";":
 *   ","  ngăn đối số trong (...)  -> ";"
 *   ","  ngăn cột trong mảng {...} -> "\"
 * Không đụng tới chữ bên trong "..." (vd câu lệnh QUERY).
 */
function localizeFormula_(f, sep) {
  if (sep !== ';') return f;
  var out = '', inStr = false, stack = [];
  for (var i = 0; i < f.length; i++) {
    var ch = f.charAt(i);
    if (ch === '"') { inStr = !inStr; out += ch; continue; }
    if (!inStr) {
      if (ch === '(' || ch === '{') stack.push(ch);
      else if (ch === ')' || ch === '}') stack.pop();
      else if (ch === ',') { out += stack[stack.length - 1] === '{' ? '\\' : ';'; continue; }
    }
    out += ch;
  }
  return out;
}

// ===================== Nâng cấp / dọn dẹp =====================

/** Đổi cột cũ "Đang dùng" (tick = dùng) thành "Ngừng dùng" (tick = ẩn), đảo giá trị. */
function migrateActiveColumn_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 1) return;
  var lastCol = sh.getLastColumn();
  if (lastCol < 1) return;
  var header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var oldCol = header.indexOf('đang dùng');
  if (oldCol < 0 || header.indexOf('ngừng dùng') >= 0) return;
  var lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    var values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var out = values.map(function (row) {
      var hasData = row.some(function (v, c) { return c !== oldCol && v !== '' && v !== null && typeof v !== 'boolean'; });
      if (!hasData) return [''];
      var old = row[oldCol];
      var active = old === '' || old === null || isChecked_(old);
      return [!active];
    });
    var col = sh.getRange(2, oldCol + 1, lastRow - 1, 1);
    col.clearDataValidations();
    col.setValues(out);
  }
  sh.getRange(1, oldCol + 1).setValue('Ngừng dùng');
}

/** Xoá các tab "<tên>_conflict123" còn trống do chạy cài đặt 2 lần cùng lúc. */
function removeEmptyConflictSheets_(ss) {
  ss.getSheets().forEach(function (sh) {
    var m = sh.getName().match(/^(.+)_conflict\d+$/);
    if (m && SCHEMA[m[1]] && sh.getLastRow() <= 1) ss.deleteSheet(sh);
  });
}

/** Tạo 2 phiếu mẫu (230/11 cuộn carton, 225/11 pallet chia bánh) để thử in. */
function seedDemoData() {
  requireLicenseUi_();
  var demo = [
    {
      so: '230/11', ngay: '2026-11-14', khach: 'PHƯỚC HIỆP THÀNH', kho: 'M2', xe: '50LD-200.94',
      taiXe: 'Tài xế mẫu A', soHuuXe: 'Thuê ngoài', nguoiLap: 'Phòng Nhật Thuận',
      lines: [544, 540, 557, 552].map(function (kg) { return { maSP: 'K76/450', kg: kg, ca: 'C2', may: 'M2', ngaySX: '2026-11-14' }; })
        .concat([494, 495, 502, 499, 492, 464, 460, 486, 454, 482].map(function (kg) { return { maSP: 'K78/450', kg: kg, ca: 'C2', may: 'M2', ngaySX: '2026-11-14' }; })),
    },
    {
      so: '225/11', ngay: '2026-11-14', khach: 'STARFLEX', kho: 'M3', xe: '51F-442.06',
      taiXe: 'Tài xế mẫu B', soHuuXe: 'Công ty', nguoiLap: 'Phòng Nhật Thuận',
      lines: [[1154, 12], [1168, 12], [1141, 12], [966, 10], [1168, 12], [1207, 12], [966, 10], [1088, 12], [1054, 11], [972, 10], [1156, 12], [1171, 12], [1170, 12], [1180, 12]]
        .map(function (x) { return { maSP: 'K130/430', kg: x[0], soBanh: x[1], ca: 'C1', may: 'M3', ngaySX: '2026-11-14' }; }),
    },
  ];
  var made = [];
  demo.forEach(function (p) {
    var exists = readTable_('PhieuXuat').rows.some(function (r) { return str_(r.so) === p.so && str_(r.trangThai) !== APP.STATUS_CANCEL; });
    if (!exists) made.push(savePhieu(p).so);
  });
  try { SpreadsheetApp.getUi().alert(made.length ? 'Đã tạo phiếu mẫu: ' + made.join(', ') : 'Phiếu mẫu đã có sẵn.'); } catch (e) { /* editor */ }
  return made;
}
