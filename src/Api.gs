/**
 * API gọi từ webapp qua google.script.run.
 * Mọi giá trị trả về chỉ gồm string/number/boolean/array/object (KHÔNG Date).
 */

// ===================== Cấu hình & danh mục =====================

function getConfig_() {
  var cfg = {};
  DEFAULT_CONFIG.forEach(function (c) { cfg[c[0]] = c[1]; });
  try {
    readTable_('CauHinh').rows.forEach(function (r) {
      var k = str_(r.key);
      if (k) cfg[k] = str_(r.value);
    });
  } catch (e) { /* chưa setup: dùng mặc định */ }
  return cfg;
}

function listActive_(name) {
  return readTable_(name).rows
    .filter(function (r) { return isActive_(r.active); })
    .map(clean_);
}

/** Toàn bộ dữ liệu cho dropdown + cấu hình. */
function getMasterData() {
  var products = listActive_('DM_SanPham').map(function (p) {
    return {
      maSP: str_(p.maSP),
      loaiGiay: str_(p.loaiGiay) || 'GIẤY CARTON',
      khoGiay: optNum_(p.khoGiay),
      dinhLuong: optNum_(p.dinhLuong),
      donVi: normUnit_(p.donVi),
      truBi: num_(p.truBi),
      ghiChu: str_(p.ghiChu),
    };
  }).filter(function (p) { return p.maSP; });

  var pick = function (name, fn) { return listActive_(name).map(fn).filter(function (x) { return x && (x.ten || x.ma || x.bienSo); }); };

  return {
    products: products,
    customers: pick('DM_KhachHang', function (r) { return { ten: str_(r.ten), diaChi: str_(r.diaChi), sdt: str_(r.sdt) }; }),
    drivers: pick('DM_TaiXe', function (r) {
      return { ten: str_(r.ten), sdt: str_(r.sdt), loai: str_(r.loai), xeMacDinh: str_(r.xeMacDinh) };
    }),
    vehicles: pick('DM_Xe', function (r) {
      return { bienSo: str_(r.bienSo), loaiXe: str_(r.loaiXe), soHuu: str_(r.soHuu), taiXeMacDinh: str_(r.taiXeMacDinh) };
    }),
    warehouses: pick('DM_Kho', function (r) { return { ma: str_(r.ma), ten: str_(r.ten) }; }),
    shifts: pick('DM_Ca', function (r) { return { ma: str_(r.ma), ten: str_(r.ten) }; }),
    staff: pick('DM_NhanVien', function (r) { return { ten: str_(r.ten), boPhan: str_(r.boPhan), vaiTro: str_(r.vaiTro) }; }),
    config: getConfig_(),
    today: isoDate_(new Date()),
    user: currentUser_(),
    webAppUrl: webAppUrl_(),
    sheetUrl: sheetUrl_(),
  };
}

function sheetUrl_() {
  try { return ss_().getUrl(); } catch (e) { return ''; }
}

function normUnit_(v) {
  var s = str_(v).toUpperCase();
  if (s.indexOf('PALLET') >= 0 || s.indexOf('BÁNH') >= 0 || s.indexOf('KIỆN') >= 0) return APP.UNIT_PALLET;
  return APP.UNIT_ROLL;
}

function currentUser_() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
}

function webAppUrl_() {
  try { return ScriptApp.getService().getUrl() || ''; } catch (e) { return ''; }
}

// ===================== Số phiếu & mã cuộn =====================

/** Gợi ý số phiếu kế tiếp: "<stt>/<MM>" — đánh lại từ 1 theo tháng (hoặc năm). */
function getNextSoPhieu(ngayIso) {
  var d = ngayIso ? parseDate_(ngayIso) : new Date();
  var cfg = getConfig_();
  var byYear = String(cfg.SO_PHIEU_RESET || '').toUpperCase() === 'NAM';
  var y = d.getFullYear(), m = d.getMonth();
  var max = 0;
  readTable_('PhieuXuat').rows.forEach(function (r) {
    var rd = r.ngay instanceof Date ? r.ngay : (r.ngay ? safeDate_(r.ngay) : null);
    if (!rd || rd.getFullYear() !== y || (!byYear && rd.getMonth() !== m)) return;
    var n = parseInt(String(r.so).split('/')[0], 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return (max + 1) + '/' + ('0' + (m + 1)).slice(-2);
}

function safeDate_(v) { try { return parseDate_(v); } catch (e) { return null; } }

/** Tiền tố mã cuộn: <Máy>-<ddMMyy>-<Ca>-  (vd M2-141126-C2-) */
function rollPrefix_(may, ngaySX, ca) {
  var d = parseDate_(ngaySX);
  return [str_(may) || 'M', Utilities.formatDate(d, tz_(), 'ddMMyy'), str_(ca) || 'C', ''].join('-');
}

// ===================== Đọc phiếu =====================

function findPhieuRow_(t, id) {
  for (var i = 0; i < t.rows.length; i++) if (str_(t.rows[i].id) === id) return t.rows[i];
  return null;
}

function headerOut_(r) {
  var o = clean_(r);
  o.ngay = isoDate_(r.ngay);
  o.taoLuc = isoDateTime_(r.taoLuc);
  o.capNhat = isoDateTime_(r.capNhat);
  ['soLuong', 'tongKg', 'truBi', 'thucXuat', 'phuCap'].forEach(function (k) { o[k] = num_(r[k]); });
  o.id = str_(r.id); o.so = str_(r.so);
  return o;
}

function lineOut_(r) {
  var o = clean_(r);
  o.ngaySX = isoDate_(r.ngaySX);
  o.ngay = isoDate_(r.ngay);
  o.stt = num_(r.stt);
  o.kg = num_(r.kg);
  o.truBi = num_(r.truBi);
  o.soBanh = r.soBanh === '' ? '' : num_(r.soBanh);
  o.maCuon = str_(r.maCuon);
  o.maSP = str_(r.maSP);
  o.dauThu = str_(r.dauThu);
  return o;
}

/** Lấy 1 phiếu kèm chi tiết. */
function getPhieu(id) {
  id = str_(id);
  var h = findPhieuRow_(readTable_('PhieuXuat'), id);
  if (!h) return null;
  var lines = readTable_('ChiTiet').rows
    .filter(function (r) { return str_(r.phieuId) === id; })
    .map(lineOut_)
    .sort(function (a, b) { return a.stt - b.stt; });
  var out = headerOut_(h);
  out.lines = lines;
  return out;
}

/** Danh sách phiếu (mới nhất trước). filter: {from, to, q, status} */
function listPhieu(filter) {
  filter = filter || {};
  var from = filter.from ? parseDate_(filter.from).getTime() : -Infinity;
  var to = filter.to ? parseDate_(filter.to).getTime() : Infinity;
  var q = str_(filter.q).toLowerCase();
  var rows = readTable_('PhieuXuat').rows.map(headerOut_).filter(function (r) {
    var t = r.ngay ? parseDate_(r.ngay).getTime() : 0;
    if (t < from || t > to) return false;
    if (filter.status && r.trangThai !== filter.status) return false;
    if (q) {
      var hay = [r.so, r.khach, r.xe, r.taiXe, r.kho, r.loaiGiay, r.ghiChu].join(' ').toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  });
  rows.sort(function (a, b) {
    if (a.ngay !== b.ngay) return a.ngay < b.ngay ? 1 : -1;
    return (b.taoLuc || '').localeCompare(a.taoLuc || '');
  });
  return rows.slice(0, filter.limit || 300);
}

// ===================== Lưu phiếu =====================

/**
 * Lưu (tạo mới hoặc cập nhật) phiếu xuất kho.
 * payload: {id?, so, ngay, khach, diaChi, kho, xe, soHuuXe, taiXe, sdtTaiXe, nguoiLap, thuKho,
 *           phuCap, ghiChu, lines:[{maSP, kg, soBanh, ca, may, ngaySX, maCuon, doDay, doAm, ...}]}
 */
function savePhieu(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return savePhieuLocked_(payload || {});
  } finally {
    lock.releaseLock();
  }
}

function savePhieuLocked_(p) {
  var errors = [];
  var so = str_(p.so);
  var khach = str_(p.khach);
  if (!so) errors.push('Thiếu số phiếu.');
  if (!p.ngay) errors.push('Thiếu ngày xuất.');
  if (!khach) errors.push('Thiếu đơn vị nhận hàng.');
  var ngay = p.ngay ? parseDate_(p.ngay) : null;
  var linesIn = (p.lines || []).filter(function (l) { return str_(l.maSP) || num_(l.kg) > 0; });
  if (!linesIn.length) errors.push('Phiếu chưa có cuộn/pallet nào.');

  var products = {};
  readTable_('DM_SanPham').rows.forEach(function (r) { products[str_(r.maSP)] = r; });

  linesIn.forEach(function (l, i) {
    var n = i + 1;
    if (!str_(l.maSP)) errors.push('Dòng ' + n + ': thiếu mã sản phẩm.');
    if (!(num_(l.kg) > 0)) errors.push('Dòng ' + n + ': trọng lượng phải > 0.');
  });
  if (errors.length) throw new Error(errors.join('\n'));

  var pt = readTable_('PhieuXuat');
  var id = str_(p.id);
  var existing = id ? findPhieuRow_(pt, id) : null;
  if (id && !existing) throw new Error('Không tìm thấy phiếu ' + id + ' để cập nhật.');
  if (existing && str_(existing.trangThai) === APP.STATUS_CANCEL) throw new Error('Phiếu đã huỷ, không sửa được.');

  // Trùng số phiếu trong cùng năm (bỏ qua phiếu huỷ và chính nó)
  var y = ngay.getFullYear();
  pt.rows.forEach(function (r) {
    if (str_(r.id) === id || str_(r.trangThai) === APP.STATUS_CANCEL) return;
    var rd = r.ngay instanceof Date ? r.ngay : safeDate_(r.ngay);
    if (str_(r.so) === so && rd && rd.getFullYear() === y) {
      errors.push('Số phiếu ' + so + ' đã dùng cho phiếu ngày ' + isoDate_(rd) + ' (' + str_(r.khach) + ').');
    }
  });
  if (errors.length) throw new Error(errors.join('\n'));

  if (!id) id = newId_(ngay);

  // ----- Mã cuộn: kiểm tra trùng + cấp số tự động -----
  var ct = readTable_('ChiTiet');
  var used = {};
  var maxSeq = {};
  ct.rows.forEach(function (r) {
    if (str_(r.phieuId) === id || str_(r.trangThai) === APP.STATUS_CANCEL) return;
    var code = str_(r.maCuon);
    if (!code) return;
    used[code] = str_(r.so);
    trackSeq_(maxSeq, code);
  });
  linesIn.forEach(function (l) { if (str_(l.maCuon)) trackSeq_(maxSeq, str_(l.maCuon)); });

  var seen = {};
  var lines = linesIn.map(function (l, i) {
    var maSP = str_(l.maSP);
    var prod = products[maSP] || {};
    var donVi = normUnit_(prod.donVi || l.donVi);
    var ngaySX = l.ngaySX ? parseDate_(l.ngaySX) : ngay;
    var ca = str_(l.ca);
    var may = str_(l.may) || str_(p.kho);
    var code = str_(l.maCuon).toUpperCase();
    if (!code) {
      var prefix = rollPrefix_(may, ngaySX, ca);
      var next = (maxSeq[prefix] || 0) + 1;
      maxSeq[prefix] = next;
      code = prefix + ('00' + next).slice(-3);
    }
    if (used[code]) errors.push('Dòng ' + (i + 1) + ': mã ' + code + ' đã có trong phiếu ' + used[code] + '.');
    if (seen[code]) errors.push('Dòng ' + (i + 1) + ': mã ' + code + ' bị lặp trong phiếu.');
    seen[code] = true;
    var truBi = l.truBi !== undefined && l.truBi !== '' ? num_(l.truBi) : (donVi === APP.UNIT_PALLET ? num_(prod.truBi) : 0);
    return {
      phieuId: id, so: so, ngay: ngay, stt: i + 1,
      maSP: maSP,
      loaiGiay: str_(prod.loaiGiay) || str_(l.loaiGiay) || 'GIẤY CARTON',
      khoGiay: prod.khoGiay !== undefined ? optNum_(prod.khoGiay) : optNum_(l.khoGiay),
      dinhLuong: prod.dinhLuong !== undefined ? optNum_(prod.dinhLuong) : optNum_(l.dinhLuong),
      donVi: donVi,
      maCuon: code,
      kg: num_(l.kg),
      soBanh: optNum_(l.soBanh),
      truBi: truBi,
      ca: ca, may: may, ngaySX: ngaySX,
      doDay: optNum_(l.doDay), doAm: optNum_(l.doAm), doBuc: optNum_(l.doBuc),
      nenVong: optNum_(l.nenVong), tachLop: optNum_(l.tachLop), cobb: optNum_(l.cobb),
      moiNoi: optNum_(l.moiNoi === undefined || l.moiNoi === '' ? 0 : l.moiNoi),
      dauThu: str_(l.dauThu) || '01',
      ghiChu: str_(l.ghiChu),
      khach: khach, xe: str_(p.xe), taiXe: str_(p.taiXe),
      trangThai: APP.STATUS_OK,
    };
  });
  if (errors.length) throw new Error(errors.join('\n'));

  var tongKg = 0, truBi = 0;
  var loai = {};
  lines.forEach(function (l) { tongKg += l.kg; truBi += l.truBi; loai[l.loaiGiay] = 1; });

  var now = new Date();
  var header = {
    id: id, so: so, ngay: ngay, khach: khach,
    diaChi: str_(p.diaChi), kho: str_(p.kho),
    loaiGiay: Object.keys(loai).join(', '),
    xe: str_(p.xe).toUpperCase(), soHuuXe: str_(p.soHuuXe),
    taiXe: str_(p.taiXe), sdtTaiXe: str_(p.sdtTaiXe),
    soLuong: lines.length, tongKg: tongKg, truBi: truBi, thucXuat: tongKg - truBi,
    nguoiLap: str_(p.nguoiLap), thuKho: str_(p.thuKho),
    phuCap: num_(p.phuCap), ghiChu: str_(p.ghiChu),
    trangThai: APP.STATUS_OK,
    capNhat: now,
  };
  lines.forEach(function (l) { l.xe = header.xe; });

  if (existing) {
    updateRow_(pt, existing._row, header);
    var old = ct.rows.filter(function (r) { return str_(r.phieuId) === id; }).map(function (r) { return r._row; });
    deleteRows_(ct.sheet, old);
  } else {
    header.taoLuc = now;
    header.nguoiTao = currentUser_();
    appendObjects_('PhieuXuat', [header]);
  }
  appendObjects_('ChiTiet', lines);

  // Tự thêm khách / xe / tài xế mới vào danh mục (nếu người dùng gõ tên mới)
  autoAddMaster_(header);

  return getPhieu(id);
}

function trackSeq_(maxSeq, code) {
  var m = String(code).match(/^(.*-)(\d+)$/);
  if (!m) return;
  var n = parseInt(m[2], 10);
  if (!maxSeq[m[1]] || n > maxSeq[m[1]]) maxSeq[m[1]] = n;
}

function newId_(ngay) {
  var rand = Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
  return 'PX' + Utilities.formatDate(ngay, tz_(), 'yyMMdd') + '-' + rand;
}

function autoAddMaster_(h) {
  var add = function (name, key, value, extra) {
    if (!value) return;
    var t = readTable_(name);
    var exists = t.rows.some(function (r) { return str_(r[key]).toLowerCase() === value.toLowerCase(); });
    if (!exists) {
      var o = extra || {};
      o[key] = value;
      o.active = true;
      appendObjects_(name, [o]);
    }
  };
  add('DM_KhachHang', 'ten', h.khach, { diaChi: h.diaChi });
  add('DM_Xe', 'bienSo', h.xe, { soHuu: h.soHuuXe, taiXeMacDinh: h.taiXe });
  add('DM_TaiXe', 'ten', h.taiXe, { sdt: h.sdtTaiXe, xeMacDinh: h.xe, loai: h.soHuuXe });
}

/** Huỷ phiếu (giữ lại dữ liệu, không tính vào báo cáo). */
function cancelPhieu(id, reason) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    id = str_(id);
    var pt = readTable_('PhieuXuat');
    var h = findPhieuRow_(pt, id);
    if (!h) throw new Error('Không tìm thấy phiếu ' + id);
    var note = str_(h.ghiChu);
    var stamp = '[Huỷ ' + isoDateTime_(new Date()) + (currentUser_() ? ' bởi ' + currentUser_() : '') + (reason ? ': ' + reason : '') + ']';
    updateRow_(pt, h._row, { trangThai: APP.STATUS_CANCEL, ghiChu: (note ? note + ' ' : '') + stamp, capNhat: new Date() });
    var ct = readTable_('ChiTiet');
    ct.rows.forEach(function (r) {
      if (str_(r.phieuId) === id) updateRow_(ct, r._row, { trangThai: APP.STATUS_CANCEL });
    });
    return getPhieu(id);
  } finally {
    lock.releaseLock();
  }
}

// ===================== Báo cáo =====================

/**
 * Báo cáo sản lượng xuất kho & lương tài xế trong khoảng ngày.
 * Lương tài xế = số chuyến × đơn giá/chuyến + số tấn thực xuất × đơn giá/tấn + phụ cấp chuyến.
 * (1 phiếu xuất kho = 1 chuyến.)
 */
function getReport(from, to) {
  var f = from ? parseDate_(from).getTime() : -Infinity;
  var t = to ? parseDate_(to).getTime() : Infinity;
  var inRange = function (d) { var x = d instanceof Date ? d.getTime() : (safeDate_(d) || new Date(0)).getTime(); return x >= f && x <= t; };
  var ok = function (r) { return str_(r.trangThai) !== APP.STATUS_CANCEL; };

  var headers = readTable_('PhieuXuat').rows.filter(function (r) { return ok(r) && inRange(r.ngay); });
  var lines = readTable_('ChiTiet').rows.filter(function (r) { return ok(r) && inRange(r.ngay); });

  var group = function (rows, keyFn, init, addFn) {
    var m = {};
    rows.forEach(function (r) {
      var k = keyFn(r);
      if (!m[k]) m[k] = init(k, r);
      addFn(m[k], r);
    });
    return Object.keys(m).map(function (k) { return m[k]; });
  };

  var byDay = group(lines, function (r) { return isoDate_(r.ngay); },
    function (k) { return { ngay: k, soPhieu: {}, soLuong: 0, tongKg: 0, truBi: 0 }; },
    function (a, r) { a.soPhieu[str_(r.phieuId)] = 1; a.soLuong++; a.tongKg += num_(r.kg); a.truBi += num_(r.truBi); })
    .map(function (a) { a.soPhieu = Object.keys(a.soPhieu).length; a.thucXuat = a.tongKg - a.truBi; return a; })
    .sort(function (a, b) { return a.ngay < b.ngay ? -1 : 1; });

  var byProduct = group(lines, function (r) { return str_(r.maSP); },
    function (k, r) { return { maSP: k, loaiGiay: str_(r.loaiGiay), donVi: str_(r.donVi), soLuong: 0, tongKg: 0, truBi: 0 }; },
    function (a, r) { a.soLuong++; a.tongKg += num_(r.kg); a.truBi += num_(r.truBi); })
    .map(function (a) { a.thucXuat = a.tongKg - a.truBi; return a; })
    .sort(function (a, b) { return b.thucXuat - a.thucXuat; });

  var byCustomer = group(headers, function (r) { return str_(r.khach); },
    function (k) { return { khach: k, soPhieu: 0, soLuong: 0, thucXuat: 0 }; },
    function (a, r) { a.soPhieu++; a.soLuong += num_(r.soLuong); a.thucXuat += num_(r.thucXuat); })
    .sort(function (a, b) { return b.thucXuat - a.thucXuat; });

  var rates = {};
  readTable_('DM_TaiXe').rows.forEach(function (r) {
    rates[str_(r.ten).toLowerCase()] = { chuyen: num_(r.donGiaChuyen), tan: num_(r.donGiaTan), loai: str_(r.loai), sdt: str_(r.sdt) };
  });
  var byDriver = group(headers, function (r) { return str_(r.taiXe) || '(Chưa nhập tài xế)'; },
    function (k) {
      var rt = rates[k.toLowerCase()] || { chuyen: 0, tan: 0, loai: '', sdt: '' };
      return { taiXe: k, loai: rt.loai, sdt: rt.sdt, donGiaChuyen: rt.chuyen, donGiaTan: rt.tan, soChuyen: 0, thucXuat: 0, phuCap: 0, xe: {}, chuyen: [] };
    },
    function (a, r) {
      a.soChuyen++; a.thucXuat += num_(r.thucXuat); a.phuCap += num_(r.phuCap);
      if (str_(r.xe)) a.xe[str_(r.xe)] = 1;
      a.chuyen.push({ id: str_(r.id), so: str_(r.so), ngay: isoDate_(r.ngay), khach: str_(r.khach), xe: str_(r.xe), thucXuat: num_(r.thucXuat), phuCap: num_(r.phuCap) });
    })
    .map(function (a) {
      a.xe = Object.keys(a.xe).join(', ');
      a.tan = Math.round(a.thucXuat) / 1000;
      a.luong = Math.round(a.soChuyen * a.donGiaChuyen + a.tan * a.donGiaTan + a.phuCap);
      a.chuyen.sort(function (x, y) { return x.ngay < y.ngay ? -1 : 1; });
      return a;
    })
    .sort(function (a, b) { return b.luong - a.luong || b.soChuyen - a.soChuyen; });

  var tot = { soPhieu: headers.length, soLuong: lines.length, tongKg: 0, truBi: 0, thucXuat: 0, luong: 0 };
  lines.forEach(function (r) { tot.tongKg += num_(r.kg); tot.truBi += num_(r.truBi); });
  tot.thucXuat = tot.tongKg - tot.truBi;
  byDriver.forEach(function (d) { tot.luong += d.luong; });

  return { from: from || '', to: to || '', total: tot, byDay: byDay, byProduct: byProduct, byCustomer: byCustomer, byDriver: byDriver };
}

/** Ghi báo cáo lương tài xế ra 1 sheet mới để lưu/gửi kế toán. */
function exportDriverReport(from, to) {
  var rep = getReport(from, to);
  var name = 'Luong_' + (from || 'all') + '_' + (to || 'all');
  var ss = ss_();
  var sh = ss.getSheetByName(name);
  if (sh) sh.clear(); else sh = ss.insertSheet(name);
  var rows = [['BÁO CÁO CHUYẾN & LƯƠNG TÀI XẾ', '', '', '', '', '', '', '', ''],
    ['Từ ngày', from || '', 'Đến ngày', to || '', '', '', '', '', ''],
    ['Tài xế', 'Loại', 'Xe', 'Số chuyến', 'Thực xuất (kg)', 'Đơn giá/chuyến', 'Đơn giá/tấn', 'Phụ cấp', 'Thành tiền']];
  rep.byDriver.forEach(function (d) {
    rows.push([d.taiXe, d.loai, d.xe, d.soChuyen, d.thucXuat, d.donGiaChuyen, d.donGiaTan, d.phuCap, d.luong]);
  });
  rows.push(['TỔNG', '', '', rep.total.soPhieu, rep.total.thucXuat, '', '', '', rep.total.luong]);
  rows.push(['', '', '', '', '', '', '', '', '']);
  rows.push(['CHI TIẾT CHUYẾN', '', '', '', '', '', '', '', '']);
  rows.push(['Tài xế', 'Ngày', 'Số phiếu', 'Khách hàng', 'Xe', 'Thực xuất (kg)', 'Phụ cấp', '', '']);
  rep.byDriver.forEach(function (d) {
    d.chuyen.forEach(function (c) { rows.push([d.taiXe, c.ngay, c.so, c.khach, c.xe, c.thucXuat, c.phuCap, '', '']); });
  });
  sh.getRange(1, 1, rows.length, 9).setValues(rows);
  sh.getRange(1, 1).setFontWeight('bold').setFontSize(13);
  sh.getRange(3, 1, 1, 9).setFontWeight('bold').setBackground('#fef7e0');
  sh.getRange(4, 5, rows.length, 5).setNumberFormat('#,##0');
  sh.setFrozenRows(3);
  return { sheetName: name, url: ss.getUrl() + '#gid=' + sh.getSheetId() };
}
