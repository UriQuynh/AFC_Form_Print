/**
 * Lớp truy cập Google Sheets: đọc/ghi theo tên cột (header dòng 1).
 */

var SPREADSHEET_ID_PROP = 'SPREADSHEET_ID';

function ss_() {
  var ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; }
  if (ss) return ss;
  var id = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_PROP);
  if (!id) throw new Error('Chưa gắn Google Sheet. Mở Sheet → menu "AFC Form" → "Cài đặt / cập nhật cấu trúc sheet".');
  return SpreadsheetApp.openById(id);
}

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Không thấy sheet "' + name + '". Chạy menu "AFC Form" → "Cài đặt / cập nhật cấu trúc sheet".');
  return sh;
}

/** Map key -> chỉ số cột (0-based) theo header thực tế trên sheet. */
function colIndex_(name, headerRow) {
  var def = SCHEMA[name];
  var idx = {};
  var norm = function (s) { return String(s).trim().toLowerCase(); };
  var hdr = headerRow.map(norm);
  def.cols.forEach(function (c) {
    var i = hdr.indexOf(norm(c[1]));
    if (i >= 0) idx[c[0]] = i;
  });
  return idx;
}

/**
 * Đọc toàn bộ sheet thành mảng object {key: value, _row: số dòng trên sheet}.
 */
function readTable_(name) {
  var sh = sheet_(name);
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return { rows: [], idx: {}, header: [], sheet: sh };
  var values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  var header = values[0];
  var idx = colIndex_(name, header);
  var keys = Object.keys(idx);
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var line = values[r];
    var empty = true;
    var o = { _row: r + 1 };
    for (var k = 0; k < keys.length; k++) {
      var v = line[idx[keys[k]]];
      if (v !== '' && v !== null) empty = false;
      o[keys[k]] = v;
    }
    if (!empty) rows.push(o);
  }
  return { rows: rows, idx: idx, header: header, sheet: sh };
}

/** Chuyển object -> mảng giá trị theo header thực tế của sheet. */
function toRow_(header, idx, obj) {
  var row = new Array(header.length);
  for (var i = 0; i < row.length; i++) row[i] = '';
  Object.keys(idx).forEach(function (k) {
    if (obj[k] !== undefined && obj[k] !== null) row[idx[k]] = obj[k];
  });
  return row;
}

/** Ghi thêm nhiều dòng cuối sheet. */
function appendObjects_(name, objs) {
  if (!objs.length) return;
  var t = readTable_(name);
  var rows = objs.map(function (o) { return toRow_(t.header, t.idx, o); });
  var start = Math.max(t.sheet.getLastRow(), 1) + 1;
  t.sheet.getRange(start, 1, rows.length, t.header.length).setValues(rows);
}

/** Ghi đè một dòng (giữ nguyên các cột không có trong obj). */
function updateRow_(t, rowNum, obj) {
  var range = t.sheet.getRange(rowNum, 1, 1, t.header.length);
  var cur = range.getValues()[0];
  Object.keys(t.idx).forEach(function (k) {
    if (obj[k] !== undefined) cur[t.idx[k]] = obj[k] === null ? '' : obj[k];
  });
  range.setValues([cur]);
}

/** Xoá các dòng theo số dòng (xoá từ dưới lên, gộp các khối liền nhau). */
function deleteRows_(sh, rowNums) {
  var sorted = rowNums.slice().sort(function (a, b) { return b - a; });
  var i = 0;
  while (i < sorted.length) {
    var end = sorted[i];
    var start = end;
    while (i + 1 < sorted.length && sorted[i + 1] === start - 1) { i++; start--; }
    sh.deleteRows(start, end - start + 1);
    i++;
  }
}

// ---------- Kiểu dữ liệu ----------

function tz_() {
  try { return Session.getScriptTimeZone() || APP.TZ; } catch (e) { return APP.TZ; }
}

/** 'yyyy-MM-dd' -> Date (nửa đêm theo múi giờ script). */
function parseDate_(s) {
  if (s instanceof Date) return s;
  if (!s) return '';
  var m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  throw new Error('Ngày không hợp lệ: ' + s);
}

/** Date -> 'yyyy-MM-dd' (chuỗi, an toàn để trả về client). */
function isoDate_(d) {
  if (!d) return '';
  if (!(d instanceof Date)) {
    try { d = parseDate_(d); } catch (e) { return String(d); }
  }
  return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
}

function isoDateTime_(d) {
  if (!(d instanceof Date)) return d ? String(d) : '';
  return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd HH:mm');
}

function num_(v) {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  var s = String(v).trim().replace(/\s/g, '');
  // "1.154" (vi) hoặc "1,154" -> 1154 ; "12,5" -> 12.5
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
  else s = s.replace(',', '.');
  var n = Number(s);
  return isNaN(n) ? 0 : n;
}

/** Ô trống -> ''; số -> số; giữ chuỗi. Dùng cho chỉ tiêu KCS. */
function optNum_(v) {
  if (v === '' || v === null || v === undefined) return '';
  var s = String(v).trim();
  if (s === '') return '';
  var n = Number(s.replace(',', '.'));
  return isNaN(n) ? s : n;
}

function str_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return isoDate_(v);
  return String(v).trim();
}

function isActive_(v) {
  if (v === '' || v === null || v === undefined) return true; // để trống = đang dùng
  if (v === true) return true;
  if (v === false) return false;
  var s = String(v).trim().toLowerCase();
  return !(s === 'false' || s === 'không' || s === 'khong' || s === 'no' || s === '0' || s === 'x');
}

/** Bỏ _row và chuẩn hoá Date -> chuỗi để trả qua google.script.run. */
function clean_(o) {
  var r = {};
  Object.keys(o).forEach(function (k) {
    if (k === '_row') return;
    var v = o[k];
    r[k] = v instanceof Date ? isoDate_(v) : v;
  });
  return r;
}
