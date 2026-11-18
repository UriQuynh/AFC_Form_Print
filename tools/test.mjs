// Chạy logic server (src/*.gs) trên Google Sheets giả lập: node tools/test.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { generateKeyPair, publicHex, signCode, groupCode, b32encode } from './license-key.mjs';

process.env.TZ = 'Asia/Ho_Chi_Minh';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const require = createRequire(import.meta.url);
const { createFakeGas } = require(path.join(root, 'dev/fake-gas.js'));

const gas = createFakeGas({ webAppUrl: 'https://script.google.com/macros/s/TEST/exec' });
gas.install(globalThis);
const files = ['Config.gs', 'Db.gs', 'Api.gs', 'Setup.gs', 'License.gs', 'Code.gs', 'Pxk.gs', 'PxkButtons.gs'];
for (const f of files) (0, eval)(fs.readFileSync(path.join(root, 'src', f), 'utf8'));

let passed = 0;
const t = (name, fn) => {
  try { fn(); passed++; console.log('  ✓', name); } catch (e) { console.error('  ✗', name, '\n   ', e.message); process.exitCode = 1; }
};

// ---- Khoá bản bản quyền: cặp khoá chỉ dùng trong test (khoá công khai thay vào LICENSE.PUBKEY) ----
const { privateKey: TEST_PRIV } = generateKeyPair();
LICENSE.PUBKEY = publicHex(TEST_PRIV);
const grant = (g) => { const id = g.spreadsheet.getId(); g.props.LICENSE_SSID = id; g.props.LICENSE_CODE = signCode(TEST_PRIV, id); };
/** Chạy fn với một bảng tính giả lập khác đang là "bảng tính hiện tại" (rồi trả về bảng chính). */
const withFake = (g, fn) => {
  const saved = { ...globalThis };
  g.install(globalThis);
  try { return fn(); } finally { gas.install(globalThis); Object.keys(g.env).forEach((k) => { globalThis[k] = saved[k]; }); }
};
const noDates = (o, where = 'root') => {
  if (o instanceof Date) throw new Error('Date trả về client tại ' + where);
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) noDates(v, where + '.' + k);
};

console.log('AFC Form Print — test logic server');

// ===================== Bản quyền =====================
console.log('— Bản quyền —');

t('Ed25519 (BigInt trong License.gs) khớp Node crypto: chữ ký đúng qua, sai/giả mạo bị loại', () => {
  const id = 'SHEET_ID_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const code = signCode(TEST_PRIV, id);
  assert.match(code, /^([A-Z2-7]{4}-){25}[A-Z2-7]{3}$/);
  assert.equal(licenseVerifyCode_(id, code), true);
  assert.equal(licenseVerifyCode_(id, code.toLowerCase().replace(/-/g, ' ')), true, 'chấp nhận chữ thường / dấu cách khi gõ tay');
  assert.equal(licenseVerifyCode_(id + 'x', code), false, 'mã gắn với ID');
  const sig = Buffer.from(crypto.sign(null, Buffer.from('AFC-LICENSE-V1:' + id), TEST_PRIV));
  const flip = Buffer.from(sig); flip[5] ^= 1;
  assert.equal(licenseVerifyCode_(id, groupCode(b32encode(flip))), false, 'đổi 1 bit là hỏng');
  const other = signCode(generateKeyPair().privateKey, id);
  assert.equal(licenseVerifyCode_(id, other), false, 'ký bằng khoá khác bị loại');
  // chữ ký "dẻo": S + L vẫn thoả phương trình nhưng phải bị loại (S >= L)
  const L = (1n << 252n) + 27742317777372353535851937790883648493n;
  let S = 0n; for (let i = 63; i >= 32; i--) S = (S << 8n) | BigInt(sig[i]);
  let S2 = S + L; const mal = Buffer.from(sig);
  for (let i = 32; i < 64; i++) { mal[i] = Number(S2 & 255n); S2 >>= 8n; }
  assert.equal(licenseVerifyCode_(id, groupCode(b32encode(mal))), false, 'S >= L bị loại');
  for (const bad of ['', 'abc', code.slice(0, -5), code + 'AAAA', '!!!!-????', null]) assert.equal(licenseVerifyCode_(id, bad), false, String(bad));
});

t('chưa kích hoạt (ví dụ bản sao): mọi thao tác ghi/đọc bị chặn bằng thông báo tiếng Việt, không ghi gì', () => {
  assert.equal(licenseStatus_().code, 'missing');
  const msg = /chưa được cấp phép[\s\S]*SOLVIQ/;
  assert.throws(() => setupSheets(), msg);
  assert.throws(() => seedDemoData(), msg);
  assert.throws(() => savePhieu({ so: '1/11', ngay: '2026-11-14', khach: 'X', lines: [{ maSP: 'A', kg: 1 }] }), msg);
  assert.throws(() => cancelPhieu('PX1'), msg);
  assert.throws(() => exportDriverReport('2026-11-01', '2026-11-30'), msg);
  assert.throws(() => getMasterData(), msg);
  assert.throws(() => listPhieu({}), msg);
  assert.throws(() => getReport('', ''), msg);
  assert.throws(() => pxkSave_(), msg);
  assert.equal(gas.spreadsheet.getSheets().length, 0, 'không tạo sheet nào');
});

t('doGet bản chưa cấp phép trả trang "chưa được cấp phép" (không có dữ liệu / form)', () => {
  const out = doGet({ parameter: { page: 'print', px: 'PX1' } });
  const html = out.getContent();
  assert.match(html, /Bản sao chưa được cấp phép/);
  assert.match(html, /SOLVIQ/);
  assert.ok(!/__BOOT__/.test(html));
});

t('kích hoạt: mã sai / mã của bảng tính khác / mã hỏng bị từ chối, không ghi property', () => {
  const wrongSheet = signCode(TEST_PRIV, 'MOT_BANG_TINH_KHAC_0123456789');
  for (const c of ['', 'AAAA-BBBB', wrongSheet, signCode(generateKeyPair().privateKey, 'FAKE_SPREADSHEET')]) {
    const r = licenseActivateWithCode_(c);
    assert.equal(r.ok, false, c);
  }
  assert.deepEqual(Object.keys(gas.props), []);
  assert.equal(licenseStatus_().ok, false);
});

t('kích hoạt với mã đúng: ghi LICENSE_*, từ đó ghi dữ liệu được', () => {
  const r = licenseActivateWithCode_(signCode(TEST_PRIV, 'FAKE_SPREADSHEET'));
  assert.equal(r.ok, true);
  assert.equal(gas.props.LICENSE_SSID, 'FAKE_SPREADSHEET');
  assert.ok(gas.props.LICENSE_CODE && gas.props.LICENSE_AT && gas.props.LICENSE_BY === 'demo@local');
  assert.equal(licenseStatus_().ok, true);
  assert.equal(setupSheets(), true);
});

t('khoá công khai chưa cấu hình (bản chưa chạy "init") -> chặn hết, không kích hoạt được', () => {
  const keep = LICENSE.PUBKEY;
  LICENSE.PUBKEY = '';
  try {
    assert.equal(licenseStatus_().code, 'no_key');
    assert.throws(() => savePhieu({}), /chưa được cấp phép/);
    assert.equal(licenseActivateWithCode_(signCode(TEST_PRIV, 'FAKE_SPREADSHEET')).ok, false);
  } finally { LICENSE.PUBKEY = keep; }
});


t('setupSheets tạo đủ sheet + danh mục mẫu', () => {
  setupSheets();
  const names = gas.spreadsheet.getSheets().map((s) => s.getName());
  for (const n of ['PhieuXuat', 'ChiTiet', 'BaoCao', 'DM_SanPham', 'DM_TaiXe', 'DM_Xe', 'CauHinh']) assert.ok(names.includes(n), n);
  assert.deepEqual(names.slice(0, 2), ['Nhập PXK', 'PhieuXuat']);
  const md = getMasterData();
  assert.equal(md.products.length, 3);
  assert.equal(md.products.find((p) => p.maSP === 'K130/430').donVi, 'PALLET');
  assert.equal(md.shifts.length, 3);
  noDates(md);
});

t('setupSheets chạy lại không nhân đôi dữ liệu', () => {
  setupSheets();
  assert.equal(getMasterData().products.length, 3);
  assert.equal(readTable_('CauHinh').rows.length, DEFAULT_CONFIG.length);
});

t('BaoCao có công thức QUERY với câu lệnh nằm trọn trong chuỗi', () => {
  const sh = gas.spreadsheet.getSheetByName('BaoCao');
  const f = sh.getRange('A5').getFormula();
  assert.match(f, /^=QUERY\(ChiTiet!A:/);
  assert.match(f, /group by C/);
  for (const a1 of ['A5', 'G5', 'K5', 'P5']) {
    const q = sh.getRange(a1).getFormula();
    // QUERY(range,"select ... where X >= "&$D$2&" and X <= "&$D$3&" and ... ",1)
    assert.match(q, /^=QUERY\([A-Za-z]+!A:[A-Z]+,"select [^"]+ where [A-Z]+ >= "&\$D\$2&" and [A-Z]+ <= "&\$D\$3&" and [^"]+",1\)$/, a1 + ': ' + q);
    assert.equal((q.match(/"/g) || []).length % 2, 0, a1 + ' số dấu " lẻ');
    // QUERY: cột trong "order by" phải có trong "select"
    const sel = q.match(/select (.+?) where/)[1].split(', ').map((x) => x.trim());
    const ord = q.match(/order by (.+?)(?: desc| asc)? label/)[1].trim();
    assert.ok(sel.includes(ord), a1 + ': order by ' + ord + ' không có trong select');
  }
  assert.match(sh.getRange('T5').getFormula(), /Lương/);
});

t('số phiếu kế tiếp khi chưa có dữ liệu', () => {
  assert.equal(getNextSoPhieu('2026-11-14'), '1/11');
});

let px1;
t('seedDemoData tạo phiếu 230/11 + 225/11, mã cuộn tự sinh', () => {
  const made = seedDemoData();
  assert.deepEqual(made, ['230/11', '225/11']);
  const list = listPhieu({});
  assert.equal(list.length, 2);
  px1 = getPhieu(list.find((p) => p.so === '230/11').id);
  assert.equal(px1.lines.length, 14);
  assert.equal(px1.lines[0].maCuon, 'M2-141126-C2-001');
  assert.equal(px1.lines[13].maCuon, 'M2-141126-C2-014');
  assert.equal(px1.tongKg, 7021);
  assert.equal(px1.thucXuat, 7021);
  noDates(px1);
});

t('phiếu pallet trừ bì 12kg/pallet', () => {
  const p = getPhieu(listPhieu({ q: 'starflex' })[0].id);
  assert.equal(p.soLuong, 14);
  assert.equal(p.tongKg, 15561);
  assert.equal(p.truBi, 168);
  assert.equal(p.thucXuat, 15393);
  assert.equal(p.lines[0].soBanh, 12);
  assert.equal(p.lines[0].donVi, 'PALLET');
});

t('seedDemoData chạy lại không tạo trùng', () => {
  assert.deepEqual(seedDemoData(), []);
});

t('gợi ý số phiếu = max + 1 trong tháng', () => {
  assert.equal(getNextSoPhieu('2026-11-20'), '231/11');
  assert.equal(getNextSoPhieu('2026-12-01'), '1/12');
});

t('chặn trùng số phiếu cùng năm', () => {
  assert.throws(() => savePhieu({ so: '230/11', ngay: '2026-11-15', khach: 'X', lines: [{ maSP: 'K76/450', kg: 500, ca: 'C1', may: 'M1' }] }), /đã dùng/);
});

t('chặn mã cuộn trùng với phiếu khác', () => {
  assert.throws(() => savePhieu({ so: '231/11', ngay: '2026-11-15', khach: 'X', lines: [{ maSP: 'K76/450', kg: 500, maCuon: 'M2-141126-C2-001' }] }), /đã có trong phiếu 230\/11/);
});

t('validate thiếu dữ liệu', () => {
  assert.throws(() => savePhieu({ so: '', ngay: '', khach: '', lines: [] }), /Thiếu số phiếu[\s\S]*Thiếu ngày[\s\S]*Thiếu đơn vị[\s\S]*chưa có cuộn/);
  assert.throws(() => savePhieu({ so: '232/11', ngay: '2026-11-15', khach: 'X', lines: [{ maSP: 'K76/450', kg: 0 }] }), /trọng lượng phải > 0/);
});

let px3;
t('tạo phiếu mới: mã cuộn tiếp nối số thứ tự cùng máy/ngày/ca', () => {
  px3 = savePhieu({
    so: '231/11', ngay: '2026-11-14', khach: 'KHÁCH MỚI', kho: 'M2', xe: '59c-123.45', taiXe: 'Nguyễn Văn A', sdtTaiXe: '0900000000', soHuuXe: 'Công ty', phuCap: 50000,
    lines: [{ maSP: 'K76/450', kg: '1.050', ca: 'C2', may: 'M2', ngaySX: '2026-11-14', doDay: '0,62', doAm: 7.5 }, { maSP: 'K76/450', kg: 498, ca: 'C2', may: 'M2', ngaySX: '2026-11-14' }],
  });
  assert.equal(px3.lines[0].maCuon, 'M2-141126-C2-015');
  assert.equal(px3.lines[1].maCuon, 'M2-141126-C2-016');
  assert.equal(px3.lines[0].kg, 1050);
  assert.equal(px3.lines[0].doDay, 0.62);
  assert.equal(px3.xe, '59C-123.45');
  assert.equal(px3.nguoiTao, 'demo@local');
});

t('khách / xe / tài xế mới tự thêm vào danh mục', () => {
  const md = getMasterData();
  assert.ok(md.customers.some((c) => c.ten === 'KHÁCH MỚI'));
  assert.ok(md.vehicles.some((v) => v.bienSo === '59C-123.45'));
  assert.ok(md.drivers.some((d) => d.ten === 'Nguyễn Văn A' && d.xeMacDinh === '59C-123.45'));
});

t('sửa phiếu: thay chi tiết, giữ mã cuộn cũ, không nhân đôi dòng', () => {
  const before = readTable_('ChiTiet').rows.length;
  const edited = savePhieu({ ...px3, lines: [...px3.lines, { maSP: 'K78/450', kg: 470, ca: 'C3', may: 'M2', ngaySX: '2026-11-14' }] });
  assert.equal(edited.id, px3.id);
  assert.equal(edited.lines.length, 3);
  assert.equal(edited.lines[0].maCuon, 'M2-141126-C2-015');
  assert.equal(edited.lines[2].maCuon, 'M2-141126-C3-001');
  assert.equal(readTable_('ChiTiet').rows.length, before + 1);
  assert.equal(edited.tongKg, 1050 + 498 + 470);
  assert.equal(listPhieu({}).length, 3);
});

t('báo cáo sản lượng + lương tài xế', () => {
  // đặt đơn giá cho tài xế
  const tx = readTable_('DM_TaiXe');
  const a = tx.rows.find((r) => r.ten === 'Nguyễn Văn A');
  updateRow_(tx, a._row, { donGiaChuyen: 300000, donGiaTan: 20000 });
  const rep = getReport('2026-11-01', '2026-11-30');
  noDates(rep);
  assert.equal(rep.total.soPhieu, 3);
  assert.equal(rep.total.thucXuat, 7021 + 15393 + 2018);
  assert.equal(rep.byDay.length, 1);
  assert.equal(rep.byProduct.find((p) => p.maSP === 'K130/430').thucXuat, 15393);
  const d = rep.byDriver.find((x) => x.taiXe === 'Nguyễn Văn A');
  assert.equal(d.soChuyen, 1);
  assert.equal(d.luong, 300000 + Math.round(2.018 * 20000) + 50000);
});

t('huỷ phiếu: loại khỏi báo cáo, giải phóng số phiếu', () => {
  const c = cancelPhieu(px3.id, 'nhập sai');
  assert.equal(c.trangThai, 'Đã huỷ');
  assert.match(c.ghiChu, /Huỷ .*nhập sai/);
  assert.equal(getReport('2026-11-01', '2026-11-30').total.soPhieu, 2);
  assert.throws(() => savePhieu({ ...c }), /đã huỷ/);
  // số 231/11 dùng lại được, mã cuộn của phiếu huỷ cũng không chặn
  assert.equal(getNextSoPhieu('2026-11-20'), '231/11', 'gợi ý lại số của phiếu đã huỷ');
  const again = savePhieu({ so: '231/11', ngay: '2026-11-14', khach: 'KHÁCH MỚI', kho: 'M2', lines: [{ maSP: 'K76/450', kg: 600, maCuon: 'M2-141126-C2-015' }] });
  assert.equal(again.lines[0].maCuon, 'M2-141126-C2-015');
});

t('doGet trả dữ liệu boot cho trang in', () => {
  const b = getBoot_('print', { px: px1.id });
  assert.equal(b.phieu.so, '230/11');
  noDates(b);
  const s = bootScript_({ x: '</script><b>' });
  assert.ok(!s.slice(8, -9).includes('</script>'));
});

t('exportDriverReport ghi sheet lương', () => {
  const r = exportDriverReport('2026-11-01', '2026-11-30');
  const sh = gas.spreadsheet.getSheetByName(r.sheetName);
  assert.equal(sh.getRange('A3').getValue(), 'Tài xế');
});

t('đọc theo tên cột: đổi thứ tự cột trên sheet vẫn chạy', () => {
  const sh = gas.spreadsheet.getSheetByName('DM_SanPham');
  sh.data = sh.data.map((row) => { const r = row.slice(); const tmp = r[0]; r[0] = r[1]; r[1] = tmp; return r; });
  const md = getMasterData();
  assert.ok(md.products.some((p) => p.maSP === 'K76/450' && p.loaiGiay === 'GIẤY CARTON'));
});

// ===================== Sheet PXK =====================
const pxk = () => gas.spreadsheet.getSheetByName(PXK.NAME);
const setCell = (a1, v) => pxk().getRange(a1).setValue(v);
const kgCol = () => pxkCol_('kg');

t('PXK: tạo sheet, nút bấm gắn đúng hàm, điền sẵn phiếu mới', () => {
  const sh = pxk();
  assert.ok(sh, 'có sheet PXK');
  assert.equal(gas.spreadsheet.getSheets()[0].getName(), 'Nhập PXK');
  assert.deepEqual(sh.getImages().map((i) => i.getScript()).sort(), ['pxkLoad', 'pxkNew', 'pxkPrint']);
  assert.match(sh.getRange(PXK.F.so).getValue(), /^\d+\/\d{2}$/);
  assert.ok(sh.getRange(PXK.F.ngay).getValue() instanceof Date);
  assert.match(sh.getRange(PXK.TOTALS.bi).getFormula(), /SUMPRODUCT/);
  assert.equal(sh.getRange(PXK.HEADER_ROW, 1).getValue(), 'Mã SP *');
});

t('PXK: cài đặt lại không nhân đôi nút và giữ dữ liệu đang nhập', () => {
  setCell(PXK.F.khach, 'KHÁCH ĐANG NHẬP');
  setupSheets();
  assert.equal(pxk().getImages().length, 3);
  assert.equal(pxk().getRange(PXK.F.khach).getValue(), 'KHÁCH ĐANG NHẬP');
});

let pxkSaved;
t('PXK: gõ kg dòng mới -> tự lấy Mã SP/Ca/Máy theo dòng trên (onEdit)', () => {
  const sh = pxk();
  pxkClear_(sh); pxkFillNew_(sh);
  setCell(PXK.F.ngay, new Date(2026, 10, 20));
  setCell(PXK.F.kho, 'M2');
  setCell(PXK.F.khach, 'KHÁCH PXK');
  setCell(PXK.F.xe, '51F-442.06');
  pxkOnEdit_(sh, sh.getRange(PXK.F.xe));
  assert.equal(sh.getRange(PXK.F.soHuuXe).getValue(), 'Công ty');
  const r = PXK.FIRST;
  sh.getRange(r, pxkCol_('maSP')).setValue('K76/450');
  sh.getRange(r, pxkCol_('ca')).setValue('C3');
  sh.getRange(r, pxkCol_('may')).setValue('M2');
  sh.getRange(r, kgCol()).setValue(520);
  // dán 2 dòng kg cùng lúc
  sh.getRange(r + 1, kgCol(), 2, 1).setValues([[510], [505]]);
  pxkOnEdit_(sh, sh.getRange(r + 1, kgCol(), 2, 1));
  assert.equal(sh.getRange(r + 2, pxkCol_('maSP')).getValue(), 'K76/450');
  assert.equal(sh.getRange(r + 2, pxkCol_('ca')).getValue(), 'C3');
});

t('PXK: tự điền chỉ ghi vào ô trống, không ghi đè ô đã có', () => {
  const sh = pxk();
  const r = PXK.FIRST + 20;
  sh.getRange(r, pxkCol_('maSP')).setValue('K78/450');
  sh.getRange(r, pxkCol_('ca')).setValue('C2');
  sh.getRange(r, pxkCol_('may')).setValue('M1');
  sh.getRange(r, kgCol()).setValue(690);
  sh.getRange(r + 1, pxkCol_('ca')).setValue('C3'); // người dùng gõ sẵn ca khác
  sh.getRange(r + 1, kgCol()).setValue(700);
  pxkOnEdit_(sh, sh.getRange(r + 1, kgCol()));
  assert.equal(sh.getRange(r + 1, pxkCol_('maSP')).getValue(), 'K78/450');
  assert.equal(sh.getRange(r + 1, pxkCol_('may')).getValue(), 'M1');
  assert.equal(sh.getRange(r + 1, pxkCol_('ca')).getValue(), 'C3');
  sh.getRange(r, 1, 2, PXK.COLS.length).clearContent();
});

t('PXK: thiếu Ca SX báo lỗi rõ dòng', () => {
  const sh = pxk();
  const ca = sh.getRange(PXK.FIRST, pxkCol_('ca'));
  ca.setValue('');
  assert.throws(() => pxkSave_(), /Dòng 10: thiếu Ca SX/);
  ca.setValue('C3');
});

t('PXK: IN PHIẾU lưu vào PhieuXuat/ChiTiet và ghi lại số phiếu, ID, mã cuộn', () => {
  const sh = pxk();
  const before = readTable_('ChiTiet').rows.length;
  pxkSaved = pxkSave_();
  assert.equal(pxkSaved.khach, 'KHÁCH PXK');
  assert.equal(pxkSaved.lines.length, 3);
  assert.equal(pxkSaved.tongKg, 520 + 510 + 505);
  assert.equal(readTable_('ChiTiet').rows.length, before + 3);
  assert.equal(sh.getRange(PXK.F.id).getValue(), pxkSaved.id);
  assert.equal(sh.getRange(PXK.F.so).getValue(), pxkSaved.so);
  assert.equal(sh.getRange(PXK.FIRST, pxkCol_('maCuon')).getValue(), 'M2-201126-C3-001');
  assert.equal(sh.getRange(PXK.FIRST + 2, pxkCol_('maCuon')).getValue(), 'M2-201126-C3-003');
  assert.match(sh.getRange(PXK.STATUS).getValue(), /^Đã lưu/);
});

t('PXK: sửa rồi bấm IN PHIẾU lần nữa -> cập nhật cùng phiếu, không tạo phiếu mới', () => {
  const sh = pxk();
  const nPhieu = listPhieu({}).length;
  sh.getRange(PXK.FIRST + 3, kgCol()).setValue(499);
  pxkOnEdit_(sh, sh.getRange(PXK.FIRST + 3, kgCol()));
  assert.equal(sh.getRange(PXK.STATUS).getValue(), PXK.STATUS_DIRTY);
  const again = pxkSave_();
  assert.equal(again.id, pxkSaved.id);
  assert.equal(again.lines.length, 4);
  assert.equal(listPhieu({}).length, nPhieu);
  assert.equal(sh.getRange(PXK.FIRST, pxkCol_('maCuon')).getValue(), 'M2-201126-C3-001');
});

t('PXK: phiếu mới xoá trắng; mở phiếu theo số nạp lại đủ dữ liệu', () => {
  const sh = pxk();
  pxkClear_(sh); pxkFillNew_(sh);
  assert.equal(sh.getRange(PXK.F.id).getValue(), '');
  assert.equal(sh.getRange(PXK.FIRST, kgCol()).getValue(), '');
  const ph = pxkFindBySo_('225/11');
  pxkFill_(sh, ph);
  assert.equal(sh.getRange(PXK.F.khach).getValue(), 'STARFLEX');
  assert.equal(sh.getRange(PXK.FIRST + 13, kgCol()).getValue(), 1180);
  assert.equal(sh.getRange(PXK.FIRST, pxkCol_('soBanh')).getValue(), 12);
  // in lại không đổi dữ liệu
  const re = pxkSave_();
  assert.equal(re.id, ph.id);
  assert.equal(re.thucXuat, 15393);
});

t('PXK: KHÔNG đụng vào sheet "pxk" có sẵn của người dùng (trùng tên không phân biệt hoa/thường)', () => {
  const g3 = createFakeGas(); grant(g3);
  const saved = { ...globalThis };
  g3.install(globalThis);
  try {
    // fake: mô phỏng getSheetByName không phân biệt hoa/thường như Google Sheets
    const ss = g3.spreadsheet;
    const orig = ss.getSheetByName.bind(ss);
    ss.getSheetByName = (n) => orig(n) || ss.sheets.find((x) => x.name.toLowerCase() === String(n).toLowerCase()) || null;
    const mine = ss.insertSheet('pxk');
    mine.getRange('A4').setValue('PHIẾU XUẤT KHO');
    mine.getRange('A7').setValue('STT');
    setupSheets();
    assert.equal(mine.getRange('A4').getValue(), 'PHIẾU XUẤT KHO');
    assert.equal(mine.getRange('A7').getValue(), 'STT');
    assert.equal(mine.getImages().length, 0);
    assert.ok(!pxkIsOurs_(mine));
    assert.ok(pxkIsOurs_(ss.getSheetByName('Nhập PXK')), 'sheet nhập riêng được tạo');
    // nếu ai đó đặt sheet của họ trùng tên sheet nhập -> vẫn không ghi đè
    ss.deleteSheet(ss.getSheetByName('Nhập PXK'));
    const clash = ss.insertSheet('nhập pxk');
    clash.getRange('A1').setValue('CỦA NGƯỜI DÙNG');
    setupSheets();
    assert.equal(clash.getRange('A1').getValue(), 'CỦA NGƯỜI DÙNG');
    assert.throws(() => pxkSave_(), /không phải sheet nhập liệu/);
  } finally {
    gas.install(globalThis);
    Object.keys(g3.env).forEach((k) => { globalThis[k] = saved[k]; });
  }
});

t('webAppUrl_: ưu tiên WEB_APP_URL trong CauHinh', () => {
  const t0 = readTable_('CauHinh');
  const row = t0.rows.find((r) => r.key === 'WEB_APP_URL');
  updateRow_(t0, row._row, { value: 'https://script.google.com/macros/s/X/exec' });
  assert.equal(webAppUrl_(), 'https://script.google.com/macros/s/X/exec');
  updateRow_(t0, row._row, { value: '' });
  // không điền tay -> dùng link /exec doGet đã ghi nhớ, không dùng link /dev
  PropertiesService.getScriptProperties().setProperty('WEB_APP_URL_SEEN', '');
  assert.equal(webAppUrl_(), 'https://script.google.com/macros/s/TEST/exec');
  const realSvc = ScriptApp.getService;
  ScriptApp.getService = () => ({ getUrl: () => 'https://script.google.com/macros/s/REAL/exec' });
  rememberWebAppUrl_();
  ScriptApp.getService = () => ({ getUrl: () => 'https://script.google.com/macros/s/DEV/dev' });
  rememberWebAppUrl_();
  assert.equal(webAppUrl_(), 'https://script.google.com/macros/s/REAL/exec');
  ScriptApp.getService = realSvc;
});

t('localizeFormula_: đổi dấu ngăn cho bảng tính tiếng Việt, giữ nguyên chuỗi QUERY', () => {
  assert.equal(localizeFormula_('=SUM(1,2)', ','), '=SUM(1,2)');
  assert.equal(localizeFormula_('=IF(A1="",DATE(2000,1,1),A1)', ';'), '=IF(A1="";DATE(2000;1;1);A1)');
  assert.equal(localizeFormula_('=QUERY(X!A:B,"select A, sum(B) group by A",1)', ';'), '=QUERY(X!A:B;"select A, sum(B) group by A";1)');
  assert.equal(localizeFormula_('={"L";ARRAYFORMULA(VLOOKUP(P6:P,{D!A:A,D!E:E},2,0))}', ';'), '={"L";ARRAYFORMULA(VLOOKUP(P6:P;{D!A:A\\D!E:E};2;0))}');
});

t('setup trên bảng tính dùng ";" ghi công thức đúng kiểu', () => {
  const g2 = createFakeGas({ formulaSep: ';' }); grant(g2);
  const saved = { ...globalThis };
  g2.install(globalThis);
  try {
    setupSheets();
    const sh = g2.spreadsheet.getSheetByName('BaoCao');
    assert.match(sh.getRange('D2').getFormula(), /DATE\(2000;1;1\)/);
    assert.match(sh.getRange('A5').getFormula(), /^=QUERY\(ChiTiet!A:AC;"select C, count/);
    assert.match(sh.getRange('T5').getFormula(), /\{DM_TaiXe!A:A\\DM_TaiXe!E:E\};2;0/);
  } finally {
    gas.install(globalThis);
    Object.keys(g2.env).forEach((k) => { globalThis[k] = saved[k]; });
  }
});

t('dòng chỉ có checkbox không chặn ghi thêm: khách mới nằm ngay sau dòng dữ liệu cuối', () => {
  const sh = gas.spreadsheet.getSheetByName('DM_KhachHang');
  const col = colIndex_('DM_KhachHang', sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]).ngung + 1;
  const lastData = Math.max(...readTable_('DM_KhachHang').rows.map((r) => r._row));
  for (let r = 2; r <= 400; r++) if (sh.getRange(r, col).getValue() === '') sh.getRange(r, col).setValue(false);
  assert.equal(sh.getLastRow(), 400);
  savePhieu({ so: '240/11', ngay: '2026-11-16', khach: 'KHÁCH CHECKBOX', lines: [{ maSP: 'K76/450', kg: 500, ca: 'C1', may: 'M1' }] });
  const hit = readTable_('DM_KhachHang').rows.find((r) => r.ten === 'KHÁCH CHECKBOX');
  assert.equal(hit._row, lastData + 1);
});

t('tick "Ngừng dùng" -> ẩn khỏi dropdown', () => {
  const t0 = readTable_('DM_Ca');
  updateRow_(t0, t0.rows.find((r) => r.ma === 'C3')._row, { ngung: true });
  assert.deepEqual(getMasterData().shifts.map((c) => c.ma), ['C1', 'C2']);
});

t('nâng cấp cột cũ "Đang dùng" -> "Ngừng dùng" + xoá tab _conflict trống', () => {
  const sh = gas.spreadsheet.getSheetByName('DM_Kho');
  const hdr = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const c = hdr.indexOf('Ngừng dùng') + 1;
  sh.getRange(1, c).setValue('Đang dùng');
  sh.getRange(2, c).setValue(true); sh.getRange(3, c).setValue(false); sh.getRange(4, c).setValue(true);
  for (let r = 5; r <= 60; r++) sh.getRange(r, c).setValue(false);
  gas.spreadsheet.insertSheet('DM_KhachHang_conflict35786537').getRange(1, 1).setValue('Tên đơn vị nhận hàng');
  setupSheets();
  const hdr2 = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  assert.ok(hdr2.includes('Ngừng dùng') && !hdr2.includes('Đang dùng'));
  assert.deepEqual(getMasterData().warehouses.map((w) => w.ma), ['M1', 'M3']);
  assert.equal(sh.getLastRow(), 4);
  assert.equal(gas.spreadsheet.getSheetByName('DM_KhachHang_conflict35786537'), null);
});

// ===================== Bản quyền: bản sao & clone =====================
console.log('— Bản quyền: bản sao —');

// Bản sao = cùng dữ liệu + cùng mã nguồn, nhưng ID bảng tính MỚI và Script Properties trống (File > Make a copy)
const makeCopy = (id) => {
  const g = createFakeGas({ spreadsheetId: id, ui: true, email: 'khach@copy.vn' });
  g.load(gas.serialize());
  g.spreadsheet.id = id;
  return g;
};
const COPY_ID = 'BAN_SAO_0123456789_ABCDEFGHIJKLMNOPQR';
const copyG = makeCopy(COPY_ID);
const sheetSnapshot = (g) => JSON.stringify(g.spreadsheet.getSheets().map((s) => s.data));
const snap0 = sheetSnapshot(copyG);

t('bản sao (ID khác, properties trống): bị chặn ghi, dữ liệu không đổi', () => withFake(copyG, () => {
  assert.equal(licenseStatus_().code, 'missing');
  const lines = [{ maSP: 'K76/450', kg: 500, ca: 'C1', may: 'M1' }];
  assert.throws(() => savePhieu({ so: '999/11', ngay: '2026-11-16', khach: 'LẬU', lines }), /chưa được cấp phép/);
  assert.throws(() => cancelPhieu(listPhieu0_().id), /chưa được cấp phép/);
  assert.throws(() => exportDriverReport('2026-11-01', '2026-11-30'), /chưa được cấp phép/);
  assert.throws(() => pxkSave_(), /chưa được cấp phép/);
  assert.throws(() => setupSheets(), /chưa được cấp phép/);
  assert.throws(() => seedDemoData(), /chưa được cấp phép/);
  assert.throws(() => appendObjects_('DM_KhachHang', [{ ten: 'LẬU' }]), /chưa được cấp phép/);
  assert.throws(() => getMasterData(), /chưa được cấp phép/);
  assert.equal(sheetSnapshot(copyG), snap0, 'không có ô nào bị ghi');
}));
function listPhieu0_() { return readTable_('PhieuXuat').rows[0]; }

t('bản sao: doGet hiện trang chưa cấp phép, nút trên sheet (pxkNew/pxkLoad) báo và dừng', () => withFake(copyG, () => {
  const html = doGet({ parameter: {} }).getContent();
  assert.match(html, /chưa được cấp phép/);
  const before = copyG.ui.alerts.length;
  pxkNew(); pxkLoad();
  assert.equal(copyG.ui.alerts.length - before, 2);
  assert.match(copyG.ui.alerts[before].message, /chưa được cấp phép/);
  assert.equal(copyG.ui.prompts.length, 0, 'pxkLoad không hỏi số phiếu');
}));

t('bản sao: onOpen chỉ còn menu "Bản quyền" + cảnh báo; onEdit không tự điền', () => withFake(copyG, () => {
  onOpen();
  const menu = copyG.ui.menus[copyG.ui.menus.length - 1];
  assert.equal(menu.name, 'AFC Form');
  assert.deepEqual(menu.items.map((i) => i.label), ['Bản quyền']);
  assert.deepEqual(menu.items[0].sub.items.map((i) => i.label), ['Kích hoạt bản quyền', 'Kiểm tra bản quyền', 'Gỡ kích hoạt (chủ sở hữu)']);
  const sh = copyG.spreadsheet.getSheetByName(PXK.NAME);
  const veh = readTable_('DM_Xe').rows.find((r) => r.soHuu);
  sh.getRange(PXK.F.soHuuXe).clearContent(); sh.getRange(PXK.F.taiXe).clearContent();
  sh.getRange(PXK.F.xe).setValue(veh.bienSo);
  onEdit({ range: sh.getRange(PXK.F.xe) });
  assert.equal(sh.getRange(PXK.F.soHuuXe).getValue(), '', 'bản chưa cấp phép không tự điền');
}));

t('clone: properties bị sao chép nguyên (nếu Google có làm vậy) vẫn không dùng được — gắn với ID khác', () => {
  const g = makeCopy('BAN_CLONE_PROPS_0123456789_ABCDEFGHIJ');
  Object.assign(g.props, gas.props);
  withFake(g, () => {
    assert.equal(licenseStatus_().code, 'mismatch');
    assert.throws(() => savePhieu({}), /chưa được cấp phép/);
  });
});

t('clone: tự đặt LICENSE_SSID bằng tay hoặc dùng lại mã của bảng tính gốc cho ID mới -> bị loại', () => {
  const g = makeCopy('BAN_CLONE_TU_DAT_0123456789_ABCDEFGHI');
  const id = g.spreadsheet.getId();
  withFake(g, () => {
    g.props.LICENSE_SSID = id; g.props.LICENSE_CODE = 'ABCD-EFGH';
    assert.equal(licenseStatus_().code, 'bad_code', 'đặt SSID nhưng không có mã hợp lệ');
    g.props.LICENSE_CODE = gas.props.LICENSE_CODE; // mã hợp lệ của bảng tính gốc
    assert.equal(licenseStatus_().code, 'bad_code', 'mã của bảng tính khác');
    assert.throws(() => savePhieu({}), /chưa được cấp phép/);
  });
});

t('menu Kích hoạt trên bản sao: mã sai bị từ chối; mã SOLVIQ cấp đúng ID thì chạy và dựng lại menu đầy đủ', () => withFake(copyG, () => {
  const ui = copyG.ui;
  ui.promptReplies = ['SAI-SAI-SAI'];
  licenseMenuActivate_();
  assert.match(ui.alerts[ui.alerts.length - 1].message, /không đúng/);
  assert.equal(licenseStatus_().ok, false);
  ui.promptReplies = [null]; // bấm Huỷ
  licenseMenuActivate_();
  assert.equal(licenseStatus_().ok, false);
  ui.promptReplies = [signCode(TEST_PRIV, COPY_ID)];
  licenseMenuActivate_();
  assert.equal(licenseStatus_().ok, true);
  assert.equal(copyG.props.LICENSE_BY, 'khach@copy.vn');
  const menu = ui.menus[ui.menus.length - 1];
  assert.ok(menu.items.length > 5 && menu.items.some((i) => i.label === 'Nhập PXK: In phiếu (lưu + in)'));
  assert.equal(menu.items[menu.items.length - 1].label, 'Bản quyền');
  // đã kích hoạt rồi thì không cho kích hoạt lại
  const n = ui.prompts.length; licenseMenuActivate_();
  assert.equal(ui.prompts.length, n);
  // ghi được + onEdit tự điền
  const saved = savePhieu({ so: '998/11', ngay: '2026-11-16', khach: 'KHÁCH BẢN SAO HỢP LỆ', lines: [{ maSP: 'K76/450', kg: 500, ca: 'C1', may: 'M1' }] });
  assert.equal(saved.so, '998/11');
  const sh = copyG.spreadsheet.getSheetByName(PXK.NAME);
  const veh = readTable_('DM_Xe').rows.find((r) => r.soHuu);
  sh.getRange(PXK.F.soHuuXe).clearContent();
  sh.getRange(PXK.F.xe).setValue(veh.bienSo);
  onEdit({ range: sh.getRange(PXK.F.xe) });
  assert.equal(sh.getRange(PXK.F.soHuuXe).getValue(), veh.soHuu, 'đã cấp phép thì onEdit tự điền');
}));

t('bản gốc (đã kích hoạt) không bị ảnh hưởng bởi bản sao', () => {
  assert.equal(licenseStatus_().ok, true);
  assert.equal(getMasterData().products.length, 3);
});

t('Gỡ kích hoạt: chỉ chủ sở hữu; xong thì bị chặn lại, kích hoạt lại được', () => withFake(copyG, () => {
  const ui = copyG.ui;
  copyG.spreadsheet.owner = 'chu@solviq.vn';
  licenseMenuDeactivate_();
  assert.match(ui.alerts[ui.alerts.length - 1].message, /Chỉ chủ sở hữu/);
  assert.equal(licenseStatus_().ok, true, 'người không phải chủ không gỡ được');
  copyG.spreadsheet.owner = 'khach@copy.vn';
  licenseMenuDeactivate_();
  assert.equal(licenseStatus_().ok, false);
  assert.deepEqual(Object.keys(copyG.props).filter((k) => k.startsWith('LICENSE_')), []);
  assert.throws(() => savePhieu({}), /chưa được cấp phép/);
  assert.equal(licenseActivateWithCode_(signCode(TEST_PRIV, COPY_ID)).ok, true);
}));

t('Kiểm tra bản quyền hiện trạng thái', () => withFake(copyG, () => {
  licenseMenuCheck_();
  assert.match(copyG.ui.alerts[copyG.ui.alerts.length - 1].message, /Đã được cấp phép[\s\S]*khach@copy\.vn/);
}));

console.log(`\n${passed} test đạt${process.exitCode ? ' — CÓ LỖI' : ''}`);
