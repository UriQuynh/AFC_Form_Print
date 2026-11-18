// Chụp ảnh màn hình web app + mẫu in từ bản preview cho video hướng dẫn: node tools/capture-shots.mjs
// Ảnh ra video/public/shots/ (web-*.png, print-*.png). Cần Google Chrome (hoặc CHROME_PATH).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'video/public/shots');
fs.mkdirSync(out, { recursive: true });
execFileSync(process.execPath, [path.join(root, 'tools/build-preview.mjs')], { stdio: 'ignore' });
const previewDir = path.join(root, 'preview');

const CHROME = process.env.CHROME_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(previewDir, p === '/' ? 'index.html' : p);
  if (!file.startsWith(previewDir) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, env: { ...process.env, TZ: 'Asia/Ho_Chi_Minh' } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(name, url, { vw = 1280, vh = 720, scale = 2, el = null, mobile = false, prep = null } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: vw, height: vh, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile });
  await page.goto(BASE + '/' + url, { waitUntil: 'load' });
  await sleep(900);
  if (prep) await prep(page);
  await sleep(400);
  // ẩn nút "Reset dữ liệu demo" của preview
  // ẩn các thành phần chỉ có trong bản preview / chỉ hiện trên màn hình (không in ra giấy)
  await page.addStyleTag({ content: 'button[title^="Bản xem trước"]{display:none!important}.hide-print{display:none!important}' });
  const target = el ? await page.$(el) : page;
  await target.screenshot({ path: path.join(out, name + '.png') });
  await ctx.close();
  console.log('  ✓', name);
}
const click = (sel) => async (page) => { await page.click(sel); await sleep(900); };

console.log('Chụp ảnh web app + mẫu in:');
await shot('web-form-moi', 'index.html');
await shot('web-form-phieu', 'index.html?so=225/11', { prep: async (p) => { await sleep(600); await p.evaluate(() => window.scrollTo(0, 0)); } });
await shot('web-danh-sach', 'index.html', { prep: click('.tab[data-view="list"]') });
await shot('web-bao-cao', 'index.html', { prep: async (p) => {
  await p.click('.tab[data-view="report"]'); await sleep(700);
  await p.$eval('#r-from', (e) => { e.value = '2026-11-01'; }); await p.$eval('#r-to', (e) => { e.value = '2026-11-30'; });
  await p.click('#r-go'); await sleep(900);
} });
await shot('web-dien-thoai', 'index.html?so=230/11', { vw: 390, vh: 844, scale: 3, mobile: true });
await shot('print-phieu-cuon', 'print.html?so=230/11', { vw: 900, vh: 1200, el: '.sheet' });
await shot('print-phieu-pallet', 'print.html?so=225/11', { vw: 900, vh: 1200, el: '.sheet' });
await shot('print-bien-ban', 'print.html?page=bienban&so=225/11', { vw: 900, vh: 1200, el: '.sheet' });
await shot('print-tem-kcs', 'tem.html?so=230/11&cuon=M2-141126-C2-001&loai=kcs', { vw: 1000, vh: 900, el: '.sheet' });
await shot('print-coa', 'tem.html?so=230/11&cuon=M2-141126-C2-001&loai=coa', { vw: 800, vh: 1000, el: '.sheet' });
await browser.close(); server.close();
