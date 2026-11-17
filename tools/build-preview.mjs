// Dựng bản xem trước chạy offline: node tools/build-preview.mjs  ->  preview/*.html
// Ghép các file src/*.html (giải các <?!= include('...') ?>), nhúng src/*.gs + Google Sheets giả lập
// (dev/fake-gas.js) để google.script.run chạy CHÍNH logic server ngay trong trình duyệt.
// Dữ liệu preview lưu ở localStorage của trình duyệt (nút "Reset dữ liệu demo" để xoá).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const out = path.join(root, 'preview');
fs.mkdirSync(out, { recursive: true });

const GS = ['Config.gs', 'Db.gs', 'Api.gs', 'Setup.gs', 'Code.gs'];
const gsCode = GS.map((f) => `// ---- src/${f} ----\n${src(f)}`).join('\n');
const fake = fs.readFileSync(path.join(root, 'dev/fake-gas.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'dev/preview-runtime.js'), 'utf8');

const include = (html, depth = 0) => html.replace(/<\?!=\s*include\('([\w]+)'\);?\s*\?>/g, (_m, name) => {
  if (depth > 5) throw new Error('include lồng quá sâu');
  return include(src(`${name}.html`), depth + 1);
});

const pages = [['Index.html', 'index.html', 'form'], ['Print.html', 'print.html', 'print'], ['Tem.html', 'tem.html', 'tem']];
for (const [file, target, page] of pages) {
  let html = include(src(file));
  const boot = [
    '<script>window.__PREVIEW__=true;window.__PREVIEW_PAGE__=' + JSON.stringify(page) + ';</script>',
    '<script>\n' + fake + '\n</script>',
    '<script>\n' + gsCode.replace(/<\/script/gi, '<\\/script') + '\n</script>',
    '<script>\n' + runtime + '\n</script>',
  ].join('\n');
  if (!/<\?!=\s*boot\s*\?>/.test(html)) throw new Error(file + ' thiếu <?!= boot ?>');
  html = html.replace(/<\?!=\s*boot\s*\?>/, () => boot);
  if (/<\?/.test(html)) throw new Error(file + ' còn scriptlet chưa xử lý');
  fs.writeFileSync(path.join(out, target), html);
  console.log('preview/' + target, (html.length / 1024).toFixed(0) + ' KB');
}
