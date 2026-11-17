// Chạy logic server (src/*.gs) trên Google Sheets giả lập: node tools/test.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

process.env.TZ = 'Asia/Ho_Chi_Minh';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const require = createRequire(import.meta.url);
const { createFakeGas } = require(path.join(root, 'dev/fake-gas.js'));

const gas = createFakeGas({ webAppUrl: 'https://script.google.com/macros/s/TEST/exec' });
gas.install(globalThis);
const files = ['Config.gs', 'Db.gs', 'Api.gs', 'Setup.gs', 'Code.gs'];
for (const f of files) (0, eval)(fs.readFileSync(path.join(root, 'src', f), 'utf8'));

let passed = 0;
const t = (name, fn) => {
  try { fn(); passed++; console.log('  ✓', name); } catch (e) { console.error('  ✗', name, '\n   ', e.message); process.exitCode = 1; }
};
const noDates = (o, where = 'root') => {
  if (o instanceof Date) throw new Error('Date trả về client tại ' + where);
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) noDates(v, where + '.' + k);
};

console.log('AFC Form Print — test logic server');

t('setupSheets tạo đủ sheet + danh mục mẫu', () => {
  setupSheets();
  const names = gas.spreadsheet.getSheets().map((s) => s.getName());
  for (const n of ['PhieuXuat', 'ChiTiet', 'BaoCao', 'DM_SanPham', 'DM_TaiXe', 'DM_Xe', 'CauHinh']) assert.ok(names.includes(n), n);
  assert.equal(names[0], 'PhieuXuat');
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

t('BaoCao có công thức QUERY', () => {
  const sh = gas.spreadsheet.getSheetByName('BaoCao');
  const f = sh.getRange('A5').getFormula();
  assert.match(f, /^=QUERY\(ChiTiet!A:/);
  assert.match(f, /group by C/);
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

console.log(`\n${passed} test đạt${process.exitCode ? ' — CÓ LỖI' : ''}`);
