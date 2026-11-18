/**
 * Khoá bản quyền (SOLVIQ) — chống sao chép sheet / clone mã sang bảng tính khác.
 *
 * Cách hoạt động:
 *  - SOLVIQ giữ KHOÁ RIÊNG Ed25519 (không nằm trong repo). Mã kích hoạt của một bảng tính =
 *    chữ ký Ed25519 trên "AFC-LICENSE-V1:<ID bảng tính>" (tools/license-key.mjs sinh ra).
 *  - Trong file này chỉ có KHOÁ CÔNG KHAI (LICENSE.PUBKEY) — đủ để KIỂM chữ ký, không đủ để TẠO mã.
 *  - Kích hoạt: menu AFC Form → Bản quyền → Kích hoạt. Mã đúng thì ghi LICENSE_SSID / LICENSE_CODE
 *    / LICENSE_AT / LICENSE_BY vào Script Properties.
 *  - Mỗi lần ghi dữ liệu, code kiểm lại: LICENSE_SSID phải trùng ID bảng tính đang chạy VÀ chữ ký
 *    trong LICENSE_CODE phải hợp lệ cho đúng ID đó. Bản copy (ID khác) hoặc clone sang dự án khác
 *    không có mã hợp lệ cho ID của nó -> bị chặn ghi, web app hiện trang "chưa được cấp phép".
 *
 * GIỚI HẠN (xem README, mục "Bản quyền / chống sao chép"): người có quyền Editor đọc được mã và
 * có thể xoá đoạn kiểm tra này. Đây là rào cản thực tế, không phải bảo vệ tuyệt đối.
 */

var LICENSE = {
  // Khoá công khai Ed25519 (hex, 64 ký tự). Điền bằng: node tools/license-key.mjs init
  PUBKEY: '',
  PREFIX: 'AFC-LICENSE-V1:',
  CONTACT: 'SOLVIQ',
  P_SSID: 'LICENSE_SSID',
  P_CODE: 'LICENSE_CODE',
  P_AT: 'LICENSE_AT',
  P_BY: 'LICENSE_BY',
};

// ===================== Trạng thái & chặn =====================

var licenseMemo_ = null; // nhớ kết quả kiểm chữ ký trong 1 lần chạy (khoá theo ID + mã + khoá công khai)

/**
 * Trả về {ok, code, reason, ssid}. code: ok | no_key | no_ss | missing | mismatch | bad_code | error.
 * 'error' = không đọc được PropertiesService (vd simple trigger bị hạn chế) — KHÔNG phải bản sao.
 */
function licenseStatus_() {
  var ssid = '';
  try { ssid = ss_().getId(); } catch (e) {
    return { ok: false, code: 'no_ss', reason: 'Không xác định được bảng tính đang chạy.', ssid: '' };
  }
  if (!/^[0-9a-fA-F]{64}$/.test(LICENSE.PUBKEY)) {
    return { ok: false, code: 'no_key', reason: 'Bản mã này chưa được cấu hình khoá bản quyền.', ssid: ssid };
  }
  var stored = '', code = '';
  try {
    var all = PropertiesService.getScriptProperties().getProperties();
    stored = all[LICENSE.P_SSID] || '';
    code = all[LICENSE.P_CODE] || '';
  } catch (e) {
    return { ok: false, code: 'error', reason: 'Không đọc được thông tin bản quyền.', ssid: ssid };
  }
  if (!stored || !code) {
    return { ok: false, code: 'missing', reason: 'Bảng tính này chưa được kích hoạt bản quyền (có thể là bản sao).', ssid: ssid };
  }
  if (stored !== ssid) {
    return { ok: false, code: 'mismatch', reason: 'Bản quyền gắn với một bảng tính khác (đây là bản sao).', ssid: ssid };
  }
  var key = ssid + '|' + code + '|' + LICENSE.PUBKEY;
  if (!licenseMemo_ || licenseMemo_.key !== key) {
    licenseMemo_ = { key: key, ok: licenseVerifyCode_(ssid, code) };
  }
  if (!licenseMemo_.ok) {
    return { ok: false, code: 'bad_code', reason: 'Mã kích hoạt không hợp lệ cho bảng tính này.', ssid: ssid };
  }
  return { ok: true, code: 'ok', reason: 'Đã cấp phép.', ssid: ssid };
}

function licenseMessage_(st) {
  return 'Bản sao chưa được cấp phép sử dụng.\n' + st.reason + '\n' +
    'Liên hệ ' + LICENSE.CONTACT + ' để được cấp mã kích hoạt cho bảng tính này' +
    (st.ssid ? ' (ID bảng tính: ' + st.ssid + ')' : '') + '.';
}

/** Gọi ở đầu mọi thao tác GHI / đọc dữ liệu: ném lỗi tiếng Việt nếu chưa cấp phép. */
function requireLicense_() {
  var st = licenseStatus_();
  if (!st.ok) throw new Error(licenseMessage_(st));
  return st;
}

/** Như requireLicense_ nhưng còn hiện hộp thoại (lệnh chạy từ menu): vẫn ném lỗi để dừng lệnh. */
function requireLicenseUi_() {
  var st = licenseStatus_();
  if (st.ok) return st;
  try { SpreadsheetApp.getUi().alert('Chưa được cấp phép', licenseMessage_(st), SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { /* editor */ }
  throw new Error(licenseMessage_(st));
}

/** Dùng ở các lệnh menu/nút: chưa cấp phép thì báo bằng hộp thoại và trả false. */
function licenseGuardUi_() {
  var st = licenseStatus_();
  if (st.ok) return true;
  try { SpreadsheetApp.getUi().alert('Chưa được cấp phép', licenseMessage_(st), SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { /* editor */ }
  return false;
}

/** Trang HTML thay cho web app khi chưa cấp phép (không chứa dữ liệu). */
function licensePageHtml_(st) {
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  return '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<body style="font:16px/1.5 Arial,sans-serif;max-width:520px;margin:12vh auto;padding:0 20px;color:#111">' +
    '<h2 style="margin:0 0 8px">Bản sao chưa được cấp phép</h2>' +
    '<p>' + esc(st.reason) + '</p>' +
    '<p>Ứng dụng này không chạy trên bản sao. Vui lòng liên hệ <b>' + esc(LICENSE.CONTACT) + '</b> để được cấp mã kích hoạt.</p></body>';
}

// ===================== Kích hoạt / gỡ =====================

/** Kiểm mã rồi ghi Script Properties. Trả {ok, reason}. */
function licenseActivateWithCode_(codeInput) {
  var st = licenseStatus_();
  if (st.code === 'no_key' || st.code === 'no_ss') return { ok: false, reason: st.reason };
  var code = licenseNormCode_(codeInput);
  if (!licenseVerifyCode_(st.ssid, code)) return { ok: false, reason: 'Mã kích hoạt không đúng cho bảng tính này.' };
  var props = PropertiesService.getScriptProperties();
  props.setProperty(LICENSE.P_SSID, st.ssid);
  props.setProperty(LICENSE.P_CODE, code);
  props.setProperty(LICENSE.P_AT, new Date().toISOString());
  var by = '';
  try { by = Session.getActiveUser().getEmail() || ''; } catch (e) { by = ''; }
  props.setProperty(LICENSE.P_BY, by);
  licenseMemo_ = null;
  return { ok: true, reason: 'Đã kích hoạt.' };
}

function licenseNormCode_(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z2-7]/g, '').replace(/(.{4})(?=.)/g, '$1-');
}

function licenseSubMenu_(ui) {
  return ui.createMenu('Bản quyền')
    .addItem('Kích hoạt bản quyền', 'licenseMenuActivate_')
    .addItem('Kiểm tra bản quyền', 'licenseMenuCheck_')
    .addItem('Gỡ kích hoạt (chủ sở hữu)', 'licenseMenuDeactivate_');
}

function licenseMenuCheck_() {
  var ui = SpreadsheetApp.getUi();
  var st = licenseStatus_();
  if (!st.ok) { ui.alert('Bản quyền', licenseMessage_(st), ui.ButtonSet.OK); return; }
  var p = PropertiesService.getScriptProperties();
  ui.alert('Bản quyền', 'Đã được cấp phép.\nKích hoạt lúc: ' + (p.getProperty(LICENSE.P_AT) || '?') +
    '\nBởi: ' + (p.getProperty(LICENSE.P_BY) || '?') + '\nID bảng tính: ' + st.ssid, ui.ButtonSet.OK);
}

function licenseMenuActivate_() {
  var ui = SpreadsheetApp.getUi();
  var st = licenseStatus_();
  if (st.ok) { ui.alert('Bản quyền', 'Bảng tính này đã được cấp phép, không cần kích hoạt lại.', ui.ButtonSet.OK); return; }
  if (st.code === 'no_key') { ui.alert('Bản quyền', st.reason, ui.ButtonSet.OK); return; }
  var yes = ui.alert('Kích hoạt bản quyền',
    'Gắn bản quyền với bảng tính này?\nID: ' + st.ssid + '\n\nMã kích hoạt do ' + LICENSE.CONTACT + ' cấp riêng cho ID này.', ui.ButtonSet.YES_NO);
  if (yes !== ui.Button.YES) return;
  var res = ui.prompt('Kích hoạt bản quyền', 'Dán mã kích hoạt:', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var r = licenseActivateWithCode_(res.getResponseText());
  ui.alert('Bản quyền', r.ok ? 'Kích hoạt thành công. Menu sẽ được tải lại.' : r.reason, ui.ButtonSet.OK);
  if (r.ok) onOpen();
}

function licenseMenuDeactivate_() {
  var ui = SpreadsheetApp.getUi();
  var st = licenseStatus_();
  if (!st.ok) { ui.alert('Bản quyền', 'Bảng tính chưa được kích hoạt, không có gì để gỡ.', ui.ButtonSet.OK); return; }
  var me = '', owner = '';
  try { me = Session.getActiveUser().getEmail() || ''; } catch (e) { me = ''; }
  try { var o = ss_().getOwner(); owner = o ? o.getEmail() : ''; } catch (e) { owner = ''; }
  if (owner && me.toLowerCase() !== owner.toLowerCase()) {
    ui.alert('Bản quyền', 'Chỉ chủ sở hữu bảng tính (' + owner + ') được gỡ kích hoạt.', ui.ButtonSet.OK);
    return;
  }
  var yes = ui.alert('Gỡ kích hoạt', 'Gỡ bản quyền khỏi bảng tính này? Sau đó ứng dụng ngừng ghi dữ liệu cho đến khi kích hoạt lại bằng mã.', ui.ButtonSet.YES_NO);
  if (yes !== ui.Button.YES) return;
  var props = PropertiesService.getScriptProperties();
  [LICENSE.P_SSID, LICENSE.P_CODE, LICENSE.P_AT, LICENSE.P_BY].forEach(function (k) { props.deleteProperty(k); });
  licenseMemo_ = null;
  ui.alert('Bản quyền', 'Đã gỡ kích hoạt.', ui.ButtonSet.OK);
  onOpen();
}

// ===================== Kiểm chữ ký Ed25519 (RFC 8032) bằng BigInt =====================
// Apps Script không có hàm kiểm chữ ký, nên tự cài. Chỉ dùng Utilities.computeDigest (SHA-512).

var ED_ = null;

function edMod_(a, m) { var r = a % m; return r < 0 ? r + m : r; }

function edPow_(b, e, m) {
  var r = BigInt(1), one = BigInt(1);
  b = edMod_(b, m);
  while (e > 0) {
    if (e & one) r = (r * b) % m;
    b = (b * b) % m;
    e = e >> one;
  }
  return r;
}

function edInit_() {
  if (ED_) return ED_;
  var B = BigInt;
  var p = (B(1) << B(255)) - B(19);
  var E = { p: p };
  E.L = (B(1) << B(252)) + B('27742317777372353535851937790883648493');
  var inv = function (x) { return edPow_(x, p - B(2), p); };
  E.inv = inv;
  E.d = edMod_(B(-121665) * inv(B(121666)), p);
  E.d2 = edMod_(E.d * B(2), p);
  E.I = edPow_(B(2), (p - B(1)) / B(4), p); // căn bậc hai của -1
  E.ID = [B(0), B(1), B(1), B(0)];
  ED_ = E;
  E.G = edDecode_(edEncodeY_(edMod_(B(4) * inv(B(5)), p)), E);
  return E;
}

/** y (BigInt) -> 32 byte little-endian, bit dấu = 0 */
function edEncodeY_(y) {
  var out = [], B256 = BigInt(256);
  for (var i = 0; i < 32; i++) { out.push(Number(y % B256)); y = y / B256; }
  return out;
}

function edLE_(bytes) {
  var v = BigInt(0);
  for (var i = bytes.length - 1; i >= 0; i--) v = (v << BigInt(8)) + BigInt(bytes[i]);
  return v;
}

/** 32 byte (0..255) -> điểm [X,Y,Z,T] hoặc null */
function edDecode_(bytes, E) {
  E = E || edInit_();
  var B = BigInt, p = E.p;
  var arr = bytes.slice();
  var sign = (arr[31] & 128) ? 1 : 0;
  arr[31] = arr[31] & 127;
  var y = edLE_(arr);
  if (y >= p) return null;
  var y2 = (y * y) % p;
  var x2 = edMod_((y2 - B(1)) * E.inv(edMod_(E.d * y2 + B(1), p)), p);
  var x = edPow_(x2, (p + B(3)) / B(8), p);
  if (edMod_(x * x - x2, p) !== B(0)) x = (x * E.I) % p;
  if (edMod_(x * x - x2, p) !== B(0)) return null;
  if (x === B(0) && sign) return null;
  if (Number(x & B(1)) !== sign) x = p - x;
  return [x, y, B(1), (x * y) % p];
}

function edAdd_(P, Q, E) {
  var p = E.p, two = BigInt(2);
  var A = edMod_((P[1] - P[0]) * (Q[1] - Q[0]), p);
  var Bv = edMod_((P[1] + P[0]) * (Q[1] + Q[0]), p);
  var C = edMod_(P[3] * E.d2 * Q[3], p);
  var D = edMod_(P[2] * two * Q[2], p);
  var e = Bv - A, f = D - C, g = D + C, h = Bv + A;
  return [edMod_(e * f, p), edMod_(g * h, p), edMod_(f * g, p), edMod_(e * h, p)];
}

function edMul_(k, P, E) {
  var Q = E.ID, bits = k.toString(2);
  for (var i = 0; i < bits.length; i++) {
    Q = edAdd_(Q, Q, E);
    if (bits.charAt(i) === '1') Q = edAdd_(Q, P, E);
  }
  return Q;
}

function edSame_(P, Q, E) {
  return edMod_(P[0] * Q[2] - Q[0] * P[2], E.p) === BigInt(0) && edMod_(P[1] * Q[2] - Q[1] * P[2], E.p) === BigInt(0);
}

function edSha512_(bytes) {
  var signed = bytes.map(function (v) { return v > 127 ? v - 256 : v; });
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, signed).map(function (v) { return v & 255; });
}

/** pub: 32 byte, msg: mảng byte (0..255), sig: 64 byte. */
function edVerify_(pub, msg, sig) {
  var E = edInit_();
  if (pub.length !== 32 || sig.length !== 64) return false;
  var Rb = sig.slice(0, 32);
  var R = edDecode_(Rb, E), A = edDecode_(pub, E);
  if (!R || !A) return false;
  var S = edLE_(sig.slice(32));
  if (S >= E.L) return false;
  var h = edLE_(edSha512_(Rb.concat(pub, msg))) % E.L;
  var left = edMul_(S, E.G, E);
  var right = edAdd_(R, edMul_(h, A, E), E);
  return edSame_(left, right, E);
}

function licenseHexBytes_(hex) {
  var out = [];
  for (var i = 0; i < hex.length; i += 2) out.push(parseInt(hex.substr(i, 2), 16));
  return out;
}

/** Base32 (RFC 4648, A-Z2-7), bỏ dấu '-'; trả mảng byte hoặc null nếu sai ký tự. */
function licenseB32Decode_(s) {
  var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', bits = 0, acc = 0, out = [];
  s = String(s || '').toUpperCase().replace(/[\s-]/g, '');
  for (var i = 0; i < s.length; i++) {
    var v = alpha.indexOf(s.charAt(i));
    if (v < 0) return null;
    acc = (acc << 5) | v;
    bits += 5;
    if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 255); acc = acc & ((1 << bits) - 1); }
  }
  return out;
}

/** Mã kích hoạt có phải chữ ký hợp lệ của khoá công khai trên ID bảng tính này không? */
function licenseVerifyCode_(ssid, code) {
  try {
    if (!/^[0-9a-fA-F]{64}$/.test(LICENSE.PUBKEY)) return false;
    var sig = licenseB32Decode_(code);
    if (!sig || sig.length !== 64) return false;
    var msg = [], text = LICENSE.PREFIX + ssid;
    for (var i = 0; i < text.length; i++) msg.push(text.charCodeAt(i) & 255);
    return edVerify_(licenseHexBytes_(LICENSE.PUBKEY), msg, sig);
  } catch (e) {
    return false;
  }
}
