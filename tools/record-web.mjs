// Quay video thao tác thật trên web app (bản preview) cho video hướng dẫn: node tools/record-web.mjs
// Ra video/public/clips/web-laptop.mp4 + web-mobile.mp4 và file .json ghi mốc thời gian từng bước. Cần Chrome + ffmpeg.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'video/public/clips');
const tmp = path.join(root, 'video/out/rec');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(tmp, { recursive: true });
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
// tab in/popup do nút "Lưu & in phiếu" mở ra: đóng ngay, không đưa vào video
browser.on('targetcreated', async (t) => {
  if (t.type() === 'page' && t.opener()) {
    try { const p = await t.page(); if (p) setTimeout(() => p.close().catch(() => {}), 50); } catch { /* bỏ qua */ }
  }
});

// Con trỏ chuột giả + gợn sóng khi bấm (chế độ headless không có con trỏ thật)
const CURSOR_JS = () => {
  const c = document.createElement('div');
  c.id = '__cur';
  c.style.cssText = 'position:fixed;left:0;top:0;width:34px;height:42px;z-index:2147483647;pointer-events:none;transition:transform .6s cubic-bezier(.45,0,.2,1);transform:translate(-100px,-100px);filter:drop-shadow(0 3px 5px rgba(0,0,0,.45))';
  c.innerHTML = '<svg width="34" height="42" viewBox="0 0 24 30"><path d="M2 2 L2 24 L8 18.5 L12.5 28 L16 26.5 L11.6 17.4 L19.5 17 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.appendChild(c);
  const st = document.createElement('style');
  st.textContent = '@keyframes __rp{from{transform:translate(-50%,-50%) scale(.2);opacity:.9}to{transform:translate(-50%,-50%) scale(1.5);opacity:0}}button[title^="Bản xem trước"]{display:none!important}';
  document.head.appendChild(st);
  window.__go = (x, y) => { c.style.transform = `translate(${x - 6}px,${y - 4}px)`; };
  window.__ripple = (x, y) => {
    const r = document.createElement('div');
    r.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:64px;height:64px;border-radius:50%;border:4px solid rgba(37,99,235,.8);z-index:2147483646;pointer-events:none;animation:__rp .5s ease-out forwards`;
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 600);
  };
};

async function record(name, { vw, vh, dsf, mobile }, script) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: vw, height: vh, deviceScaleFactor: dsf, isMobile: mobile, hasTouch: mobile });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await sleep(1200);
  await page.evaluate(CURSOR_JS);
  // không mở tab in thật (tab phụ làm hỏng khung quay): trả về cửa sổ giả
  await page.evaluate(() => { window.open = () => ({ document: { write() {} }, location: {}, close() {} }); });
  const webm = path.join(tmp, name + '.webm');
  const rec = await page.screencast({ path: webm });
  const t0 = Date.now();
  const steps = [];
  const mark = (n) => steps.push({ name: n, t: Math.round(((Date.now() - t0) / 1000) * 100) / 100 });
  const api = {
    sleep,
    mark,
    async glide(sel, { ms = 700, fx = 0.5, fy = 0.5, scroll = true } = {}) {
      const h = await page.$(sel);
      if (scroll) {
        const vis = await h.evaluate((e) => { const r = e.getBoundingClientRect(); return r.top > 120 && r.bottom < innerHeight - 140; });
        if (!vis) { await h.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'smooth' })); await sleep(750); }
      }
      const b = await h.boundingBox();
      const x = b.x + b.width * fx;
      const y = b.y + b.height * fy;
      await page.evaluate((px, py) => window.__go(px, py), x, y);
      await sleep(ms);
      return { x, y };
    },
    async click(sel, opts) {
      const { x, y } = await api.glide(sel, opts);
      await page.evaluate((px, py) => window.__ripple(px, py), x, y);
      await page.mouse.click(x, y);
      await sleep(350);
    },
    async type(sel, text, delay = 70) {
      await api.click(sel);
      await page.type(sel, text, { delay });
      await sleep(250);
    },
    page,
  };
  await script(api);
  await sleep(900);
  mark('end');
  await rec.stop();
  await ctx.close();
  const mp4 = path.join(out, name + '.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', webm, '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-movflags', '+faststart', mp4]);
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { encoding: 'utf8' }).trim());
  fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify({ duration: dur, steps }, null, 2) + '\n');
  console.log(`  ✓ ${name}  ${dur.toFixed(1)}s`, steps.map((s) => `${s.name}@${s.t}`).join(' '));
}

// Chuỗi thao tác chung cho laptop và điện thoại: phiếu mới → khách + xe → sản phẩm + kg → lưu & in
async function flow(a) {
  const { page } = a;
  await a.sleep(500);
  a.mark('new');
  await a.click('#btn-new');
  await a.sleep(900);
  a.mark('khach');
  await a.type('#f-khach', 'PHƯỚC HIỆP THÀNH', 55);
  await a.type('#f-xe', '50LD-200.94', 70);
  await page.keyboard.press('Tab');
  await a.sleep(900);
  await a.type('#f-taiXe', 'Tài xế mẫu A', 55);
  await page.keyboard.press('Tab');
  await a.sleep(900);
  a.mark('hang');
  await a.glide('.group .g-head select', { ms: 500 });
  await a.click('.group .g-head select');
  await page.select('.group .g-head select', 'K76/450');
  await a.sleep(700);
  await a.type('.g-quick textarea', '544 540 557 552', 90);
  await a.sleep(300);
  await a.click('.g-quick .btn');
  await a.sleep(1400);
  a.mark('luu');
  await a.click('#btn-save-print', { scroll: false });
  await page.waitForSelector('#saved-box:not(.hidden)', { timeout: 8000 });
  await a.sleep(2200);
}

console.log('Quay thao tác web app:');
await record('web-laptop', { vw: 1400, vh: 816, dsf: 1, mobile: false }, flow);
await record('web-mobile', { vw: 390, vh: 844, dsf: 2, mobile: true }, flow);
await browser.close();
server.close();
