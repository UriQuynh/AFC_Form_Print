// Test E2E giao diện: chạy bản preview (code src/*.gs thật + Google Sheets giả lập) trong Chrome headless.
//   npm run test:e2e
// Cần Google Chrome đã cài (hoặc đặt CHROME_PATH). Không tải trình duyệt nào về.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const previewDir = path.join(root, 'preview');
execFileSync(process.execPath, [path.join(root, 'tools/build-preview.mjs')], { stdio: 'ignore' });

const CHROME = process.env.CHROME_PATH || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => fs.existsSync(p));
if (!CHROME) { console.error('Không tìm thấy Chrome. Đặt biến CHROME_PATH.'); process.exit(1); }

// ---------- server tĩnh cho thư mục preview ----------
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(previewDir, p === '/' ? 'index.html' : p);
  if (!file.startsWith(previewDir) || !fs.existsSync(file)) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-first-run', '--no-default-browser-check', '--lang=vi-VN'],
  env: { ...process.env, TZ: 'Asia/Ho_Chi_Minh' },
});

// ---------- tiện ích ----------
let ctx;
const errors = [];
async function open(p, viewport = { width: 1280, height: 900 }) {
  const page = await ctx.newPage();
  await page.setViewport(viewport);
  page.on('pageerror', (e) => errors.push(`${p}: ${e.message}`));
  await page.goto(BASE + '/' + p, { waitUntil: 'load' });
  return page;
}
/** Đợi hết lớp "Đang tải…" và các lệnh google.script.run (giả lập trễ 120ms). */
async function idle(page) {
  await page.waitForFunction(() => {
    const l = document.getElementById('loading');
    return !l || l.classList.contains('hidden');
  }, { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 300));
}
const text = (page, sel) => page.$eval(sel, (e) => e.textContent.trim());
const val = (page, sel) => page.$eval(sel, (e) => e.value);
const vals = (page, sel) => page.$$eval(sel, (els) => els.map((e) => e.value));
/** Thay toàn bộ nội dung ô nhập (chọn hết rồi gõ — không dựa vào click 3 lần). */
async function replaceText(page, handle, value) {
  await handle.evaluate((e) => { e.focus(); e.select(); });
  await page.keyboard.type(value);
}
async function typeInto(page, sel, value) {
  await replaceText(page, await page.$(sel), value);
  await page.keyboard.press('Tab'); // kích hoạt sự kiện change (tự điền)
}
async function clickButton(page, scope, label) {
  const handle = await page.evaluateHandle((s, l) => {
    const box = s ? document.querySelector(s) : document;
    return [...box.querySelectorAll('button')].find((b) => b.textContent.trim() === l && b.offsetParent !== null) || null;
  }, scope, label);
  const el = handle.asElement();
  if (!el) throw new Error(`Không thấy nút "${label}"${scope ? ' trong ' + scope : ''}`);
  await el.click();
}
/** Hàng trên bảng in có ô đầu khớp chữ -> mảng nội dung các ô. */
const rowWith = (page, label) => page.$$eval('.px tbody tr', (trs, l) => {
  const tr = trs.find((r) => [...r.children].some((td) => td.textContent.trim() === l));
  return tr ? [...tr.children].map((td) => td.textContent.trim()) : null;
}, label);
async function pdfPages(page) {
  const buf = Buffer.from(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
  const s = buf.toString('latin1');
  const boxes = [...s.matchAll(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g)].map((m) => [Math.round(m[1]), Math.round(m[2])]);
  return { pages: (s.match(/\/Type\s*\/Page[^s]/g) || []).length, box: boxes[0] };
}
const A4 = [595, 842], A5L = [595, 420], A5P = [420, 595];

let passed = 0, failed = 0;
async function t(name, fn) {
  ctx = await browser.createBrowserContext(); // mỗi test 1 hồ sơ sạch (localStorage riêng -> dữ liệu mẫu mới)
  const t0 = Date.now();
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name} (${Date.now() - t0}ms)`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}\n    ${e.message.split('\n').join('\n    ')}`);
  } finally {
    await ctx.close();
  }
}

console.log('AFC Form Print — test E2E giao diện (Chrome headless)');

// ===================== FORM NHẬP LIỆU =====================

await t('Form: tải danh mục vào dropdown, gợi ý số phiếu', async () => {
  const page = await open('index.html');
  await idle(page);
  assert.match(await val(page, '#f-so'), /^\d+\/\d{2}$/);
  assert.deepEqual(await page.$$eval('#f-kho option', (o) => o.map((x) => x.value)), ['M1', 'M2', 'M3']);
  const customers = await page.$$eval('#dl-customers option', (o) => o.map((x) => x.value));
  assert.ok(customers.includes('PHƯỚC HIỆP THÀNH') && customers.includes('STARFLEX'));
  const products = await page.$$eval('.group .g-head select', (s) => [...s[0].options].map((o) => o.value));
  assert.deepEqual(products, ['', 'K76/450', 'K78/450', 'K130/430']);
  assert.equal(await val(page, '#f-nguoiLap'), 'Phòng Nhật Thuận');
});

await t('Form: bấm Lưu khi thiếu dữ liệu -> báo lỗi, tô đỏ ô thiếu, không lưu', async () => {
  const page = await open('index.html');
  await idle(page);
  await page.click('#btn-save');
  await page.waitForSelector('#toast.show.err');
  const msg = await text(page, '#toast');
  assert.match(msg, /Thiếu đơn vị nhận hàng/);
  assert.match(msg, /Chưa có cuộn\/pallet nào/);
  assert.ok(await page.$eval('#f-khach', (e) => e.classList.contains('bad')));
  assert.ok(await page.$eval('#saved-box', (e) => e.classList.contains('hidden')));
});

await t('Form: lập phiếu cuộn — tự điền theo xe, dán nhanh kg, KCS, lưu, mã cuộn tự sinh', async () => {
  const page = await open('index.html');
  await idle(page);
  const so = await val(page, '#f-so');
  await typeInto(page, '#f-khach', 'PHƯỚC HIỆP THÀNH');
  await typeInto(page, '#f-xe', '50LD-200.94');
  assert.equal(await val(page, '#f-soHuuXe'), 'Thuê ngoài', 'chọn xe -> tự điền Công ty/Thuê ngoài');
  await page.select('.group .g-head select', 'K76/450');
  await page.type('.g-quick textarea', '544 540 1.057 552');
  await clickButton(page, '.g-quick', 'Thêm cuộn');
  assert.deepEqual(await vals(page, '.g-table .kg'), ['544', '540', '1057', '552'], '"1.057" hiểu là 1057 kg');
  assert.equal(await text(page, '#t-count'), '4');
  assert.equal(await text(page, '#t-kg'), '2.693');
  assert.equal(await text(page, '#t-net'), '2.693');

  // KCS dòng 1
  await page.click('.g-table tbody tr:first-child .kcs-btn');
  await page.waitForSelector('#kcs-dlg[open]');
  await page.type('#kcs-doDay', '0,62');
  await page.type('#kcs-doAm', '7.5');
  await page.click('#kcs-ok');
  await page.waitForFunction(() => document.querySelector('.g-table tbody tr:first-child .kcs-btn').classList.contains('has'));

  await page.click('#btn-save');
  await page.waitForSelector('#saved-box:not(.hidden)');
  await idle(page);
  assert.equal(await text(page, '#saved-so'), so);
  const codes = await vals(page, '.g-table .code');
  assert.equal(codes.length, 4);
  codes.forEach((c, i) => assert.match(c, new RegExp(`^M1-\\d{6}-C1-00${i + 1}$`), c));
  assert.match(await text(page, '#form-title'), new RegExp('Sửa phiếu ' + so.replace('/', '\\/')));

  // Có trong danh sách
  await page.click('.tab[data-view="list"]');
  await idle(page);
  const sos = await page.$$eval('#l-table tbody tr td:nth-child(2)', (td) => td.map((x) => x.textContent.trim()));
  assert.ok(sos.includes(so), `danh sách có ${so}`);
});

await t('Form: phiếu pallet — "kg/số bánh", trừ bì 12 kg/pallet', async () => {
  const page = await open('index.html');
  await idle(page);
  await page.select('.group .g-head select', 'K130/430');
  await page.waitForSelector('.pill.pallet');
  await page.type('.g-quick textarea', '1154/12 1168/12');
  await clickButton(page, '.g-quick', 'Thêm pallet');
  assert.deepEqual(await vals(page, '.g-table .kg'), ['1154', '1168']);
  assert.deepEqual(await vals(page, '.g-table .bn'), ['12', '12']);
  assert.equal(await text(page, '#t-bi'), '-24');
  assert.equal(await text(page, '#t-net'), '2.298');
});

await t('Form: sửa phiếu từ danh sách -> cập nhật đúng phiếu, không tạo phiếu mới', async () => {
  const page = await open('index.html');
  await idle(page);
  await page.click('.tab[data-view="list"]');
  await idle(page);
  const before = await page.$$eval('#l-table tbody tr', (r) => r.length);
  const row = await page.evaluateHandle(() => [...document.querySelectorAll('#l-table tbody tr')].find((r) => r.children[1].textContent.trim() === '230/11'));
  const edit = await row.asElement().$('td.act button');
  await edit.click();
  await idle(page);
  assert.equal(await text(page, '#form-title'), 'Sửa phiếu 230/11');
  await replaceText(page, await page.$('.g-table .kg'), '600');
  await page.click('#btn-save');
  await page.waitForSelector('#toast.show.ok');
  await idle(page);
  await page.click('.tab[data-view="list"]');
  await idle(page);
  const rows = await page.$$eval('#l-table tbody tr', (r) => r.map((x) => [x.children[1].textContent.trim(), x.children[7].textContent.trim()]));
  assert.equal(rows.length, before, 'không thêm phiếu');
  assert.deepEqual(rows.find((r) => r[0] === '230/11'), ['230/11', '7.077'], '7.021 - 544 + 600');
});

await t('Form: huỷ phiếu -> trạng thái Đã huỷ, không tính vào báo cáo', async () => {
  const page = await open('index.html?so=225/11');
  page.on('dialog', (d) => d.accept('nhập sai'));
  await idle(page);
  assert.equal(await text(page, '#form-title'), 'Sửa phiếu 225/11');
  await page.click('#btn-cancel');
  await page.waitForSelector('#saved-cancel:not(.hidden)');
  assert.ok(await page.$eval('#btn-save', (b) => b.disabled), 'phiếu huỷ không lưu được');
  await page.click('.tab[data-view="report"]');
  await idle(page);
  await page.$eval('#r-from', (e) => { e.value = '2026-11-01'; });
  await page.$eval('#r-to', (e) => { e.value = '2026-11-30'; });
  await page.click('#r-go');
  await idle(page);
  const kpi = await page.$$eval('.kpi b', (b) => b.map((x) => x.textContent.trim()));
  assert.equal(kpi[0], '1', 'chỉ còn 230/11');
});

await t('Form: bản nháp chưa lưu được khôi phục sau khi tải lại trang', async () => {
  const page = await open('index.html');
  await idle(page);
  await typeInto(page, '#f-khach', 'KHÁCH NHÁP');
  await page.select('.group .g-head select', 'K78/450');
  await new Promise((r) => setTimeout(r, 700)); // nháp lưu sau 400ms
  page.on('dialog', (d) => d.accept()); // cảnh báo rời trang
  await page.reload({ waitUntil: 'load' });
  await idle(page);
  assert.ok(await page.$eval('#draft-banner', (e) => !e.classList.contains('hidden')));
  assert.equal(await val(page, '#f-khach'), 'KHÁCH NHÁP');
  await page.click('#draft-discard');
  await idle(page);
  assert.equal(await val(page, '#f-khach'), '');
});

await t('Form: "Lưu & in phiếu" mở tab in đúng phiếu', async () => {
  const page = await open('index.html');
  await idle(page);
  await typeInto(page, '#f-khach', 'STARFLEX');
  await page.select('.group .g-head select', 'K76/450');
  await page.type('.g-quick textarea', '500');
  await clickButton(page, '.g-quick', 'Thêm cuộn');
  const popup = new Promise((r) => page.once('popup', r));
  await page.click('#btn-save-print');
  const tab = await popup;
  await tab.waitForFunction(() => location.href.includes('print.html'), { timeout: 8000 });
  assert.match(tab.url(), /print\.html\?px=PX\d{6}-[0-9A-F]{6}&auto=1$/);
});

await t('Form: điện thoại 375px không bị tràn ngang', async () => {
  const page = await open('index.html', { width: 375, height: 812, isMobile: true, hasTouch: true });
  await idle(page);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(over <= 1, `tràn ngang ${over}px`);
});

// ===================== MẪU IN =====================

await t('In: phiếu xuất kho cuộn 230/11 đúng mẫu BM-04, 1 trang A4', async () => {
  const page = await open('print.html?so=230/11');
  assert.equal(await text(page, '.px-title'), 'PHIẾU XUẤT KHO');
  assert.equal(await text(page, '.px-so'), 'Số:230/11');
  assert.equal(await text(page, '.px-date'), 'Ngày 14 tháng 11 năm 2026');
  assert.deepEqual(await page.$$eval('.px thead th', (th) => th.map((x) => x.textContent)), ['STT', 'GIẤY CARTON', 'SỐ LƯỢNG (kg)', 'CA SX', 'MÃ CUỘN', 'GHI CHÚ']);
  const body = await page.$$eval('.px thead + tbody tr', (r) => r.length);
  assert.equal(body, 20, '20 dòng như mẫu gốc');
  assert.deepEqual((await rowWith(page, 'TỔNG HÀNG')).slice(0, 4), ['20', 'TỔNG HÀNG', '7.021', 'KG']);
  assert.deepEqual((await rowWith(page, '4 CUỘN')).slice(0, 5), ['2', '4 CUỘN', '540', '"', 'M2-141126-C2-002']);
  assert.equal(await page.$$eval('.px .mono', (m) => m.length), 14);
  assert.ok(await page.$('.px-qr svg path'), 'có QR');
  assert.match(await page.$eval('.px-qr', (e) => e.title), /tem\.html\?px=PX/);
  const pdf = await pdfPages(page);
  assert.equal(pdf.pages, 1);
  assert.deepEqual(pdf.box, A4);
});

await t('In: phiếu pallet 225/11 — số bánh, trừ bì, thực xuất, tổng pallet, 1 trang A4', async () => {
  const page = await open('print.html?so=225/11');
  const head = await page.$$eval('.px thead th', (th) => th.map((x) => x.textContent));
  assert.deepEqual(head, ['STT', 'GIẤY CHIA BÁNH', 'SỐ LƯỢNG (kg)', 'SỐ BÁNH', 'CA SX', 'MÃ PALLET', 'GHI CHÚ']);
  assert.deepEqual((await rowWith(page, 'PALLET 1')).slice(1, 5), ['PALLET 1', '1.154', '12', 'C1']);
  assert.deepEqual((await rowWith(page, 'TỔNG')).slice(1, 4), ['TỔNG', '15.561', 'KG']);
  assert.deepEqual((await rowWith(page, 'TRỪ 12kg/1pallet')).slice(1, 4), ['TRỪ 12kg/1pallet', '-168', 'KG']);
  assert.deepEqual((await rowWith(page, 'THỰC XUẤT')).slice(1, 4), ['THỰC XUẤT', '15.393', 'KG']);
  assert.match(await page.$eval('.px-xe td:last-child', (e) => e.textContent), /51F-442\.06 \(TỔNG 14 PALLET\)/);
  const pdf = await pdfPages(page);
  assert.equal(pdf.pages, 1);
  assert.deepEqual(pdf.box, A4);
});

await t('In: biên bản giao nhận 225/11 — tổng & ký nhận, 1 trang A4', async () => {
  const page = await open('print.html?page=bienban&so=225/11');
  assert.equal(await text(page, '.bb h1'), 'BIÊN BẢN GIAO NHẬN HÀNG HOÁ');
  assert.match(await text(page, '.bb .sub'), /phiếu xuất kho số 225\/11/);
  const foot = await page.$$eval('.bb tfoot td', (td) => td.map((x) => x.textContent.trim()));
  assert.deepEqual(foot, ['TỔNG CỘNG', '14', '15.561', '-168', '15.393']);
  assert.match(await text(page, '.bb .codes'), /^M3-141126-C1-001, /);
  assert.deepEqual(await page.$$eval('.bb .sign b', (b) => b.map((x) => x.textContent)), ['ĐẠI DIỆN BÊN GIAO', 'TÀI XẾ', 'ĐẠI DIỆN BÊN NHẬN']);
  const pdf = await pdfPages(page);
  assert.equal(pdf.pages, 1);
  assert.deepEqual(pdf.box, A4);
});

await t('In: tem KCS + COA — đủ tem cho mọi cuộn, lọc 1 cuộn, khổ A5', async () => {
  const page = await open('tem.html?so=230/11');
  assert.equal(await page.$$eval('.sheet.a5l', (s) => s.length), 14, '14 tem KCS');
  assert.equal(await page.$$eval('.sheet.a5p', (s) => s.length), 14, '14 phiếu COA');
  assert.equal(await page.$$eval('.kcs-r .qrw svg', (s) => s.length), 14, 'mỗi tem có QR');
  await page.select('#roll', 'M2-141126-C2-003');
  await page.select('#kind', 'kcs');
  assert.equal(await page.$$eval('.sheet', (s) => s.length), 1);
  const rows = await page.$$eval('.kcs-row', (r) => r.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  assert.ok(rows.includes('TÊN SẢN PHẨMGIẤY CARTON K76/450'), rows[0]);
  assert.ok(rows.includes('TRỌNG LƯỢNG ( kg )557'));
  assert.ok(rows.includes('NGÀY SẢN XUẤT14/11/2026'));
  assert.equal(await text(page, '.kcs-r .code'), 'M2-141126-C2-003');
  const pdfK = await pdfPages(page);
  assert.equal(pdfK.pages, 1);
  assert.deepEqual(pdfK.box, A5L);
  await page.select('#kind', 'coa');
  const pdfC = await pdfPages(page);
  assert.equal(pdfC.pages, 1);
  assert.deepEqual(pdfC.box, A5P);
});

await t('In: không thấy phiếu -> báo lỗi rõ ràng', async () => {
  const page = await open('print.html?px=KHONG-CO');
  assert.match(await text(page, '.note.err'), /Không tìm thấy phiếu xuất kho "KHONG-CO"/);
  const tem = await open('tem.html?px=KHONG-CO');
  assert.match(await text(tem, '.note.err'), /Không tìm thấy phiếu/);
});

// ===================== BÁO CÁO =====================

await t('Báo cáo: tổng sản lượng, theo sản phẩm, theo khách, tài xế', async () => {
  const page = await open('index.html');
  await idle(page);
  await page.click('.tab[data-view="report"]');
  await idle(page);
  await page.$eval('#r-from', (e) => { e.value = '2026-11-01'; });
  await page.$eval('#r-to', (e) => { e.value = '2026-11-30'; });
  await page.click('#r-go');
  await idle(page);
  const kpi = await page.$$eval('.kpi', (k) => k.map((x) => [x.querySelector('small').textContent, x.querySelector('b').textContent, (x.querySelector('span') || {}).textContent || '']));
  assert.deepEqual(kpi[0].slice(0, 2), ['Số phiếu / chuyến', '2']);
  assert.deepEqual(kpi[1].slice(0, 2), ['Số cuộn / pallet', '28']);
  assert.deepEqual(kpi[2], ['Sản lượng thực xuất', '22,41 tấn', '22.414 kg']);
  const tables = await page.$$eval('#r-out table.list', (ts) => ts.map((tb) => [...tb.querySelectorAll('tbody tr')].map((r) => [...r.children].map((c) => c.textContent.trim()))));
  const [byDay, byProduct, byCustomer] = tables;
  assert.deepEqual(byDay[0], ['14/11/2026', '2', '28', '22.582', '22.414']);
  assert.deepEqual(byProduct.map((r) => [r[0], r[3]]), [['K130/430', '15.393'], ['K78/450', '4.828'], ['K76/450', '2.193']]);
  assert.deepEqual(byCustomer.map((r) => r[0]), ['STARFLEX', 'PHƯỚC HIỆP THÀNH']);
});

await browser.close();
server.close();
if (errors.length) {
  console.error('\nLỗi JavaScript trên trang:\n  ' + errors.join('\n  '));
  failed++;
}
console.log(`\n${passed} test E2E đạt${failed ? `, ${failed} lỗi` : ''}`);
process.exit(failed ? 1 : 0);
