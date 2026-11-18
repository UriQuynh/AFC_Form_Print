#!/usr/bin/env node
// Công cụ của SOLVIQ để cấp mã kích hoạt bản quyền AFC Form Print (xem README, mục "Bản quyền / chống sao chép").
//
//   node tools/license-key.mjs init                  # 1 lần: sinh cặp khoá Ed25519, lưu KHOÁ RIÊNG ngoài repo,
//                                                    #        ghi KHOÁ CÔNG KHAI vào src/License.gs
//   node tools/license-key.mjs embed                 # ghi lại khoá công khai (suy ra từ khoá riêng) vào src/License.gs
//   node tools/license-key.mjs <spreadsheetId>       # cấp mã kích hoạt cho 1 bảng tính
//   node tools/license-key.mjs verify <id> <mã>      # kiểm 1 mã (không cần khoá riêng, chỉ cần khoá công khai trong License.gs)
//
// Khoá riêng lấy từ (theo thứ tự): biến môi trường AFC_LICENSE_PRIVATE_KEY (nội dung PEM),
// AFC_LICENSE_KEY_FILE (đường dẫn file PEM), hoặc ~/.solviq/afc-license-private.pem.
// Khoá riêng KHÔNG BAO GIỜ nằm trong repo (.gitignore chặn *.pem). Mất khoá riêng = không cấp mã mới được.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PREFIX = 'AFC-LICENSE-V1:'; // phải khớp LICENSE.PREFIX trong src/License.gs
const here = path.dirname(fileURLToPath(import.meta.url));
const LICENSE_GS = path.resolve(here, '..', 'src', 'License.gs');
const DEFAULT_KEY_FILE = path.join(os.homedir(), '.solviq', 'afc-license-private.pem');

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function b32encode(buf) {
  let bits = 0, acc = 0, out = '';
  for (const b of buf) {
    acc = (acc << 8) | b; bits += 8;
    while (bits >= 5) { bits -= 5; out += B32[(acc >> bits) & 31]; acc &= (1 << bits) - 1; }
  }
  if (bits > 0) out += B32[(acc << (5 - bits)) & 31];
  return out;
}

/** Nhóm 4 ký tự cho dễ đọc / dán: ABCD-EFGH-... */
export const groupCode = (s) => s.replace(/(.{4})(?=.)/g, '$1-');

export function generateKeyPair() {
  return crypto.generateKeyPairSync('ed25519');
}

export function publicHex(privateKey) {
  const der = crypto.createPublicKey(privateKey).export({ format: 'der', type: 'spki' });
  return Buffer.from(der.subarray(der.length - 32)).toString('hex');
}

/** Mã kích hoạt = chữ ký Ed25519 trên "AFC-LICENSE-V1:<spreadsheetId>", mã hoá base32, nhóm 4 ký tự. */
export function signCode(privateKey, spreadsheetId) {
  const sig = crypto.sign(null, Buffer.from(PREFIX + spreadsheetId, 'utf8'), privateKey);
  return groupCode(b32encode(sig));
}

export function verifyCode(publicKeyHex, spreadsheetId, code) {
  const raw = code.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, acc = 0; const bytes = [];
  for (const ch of raw) { acc = (acc << 5) | B32.indexOf(ch); bits += 5; if (bits >= 8) { bits -= 8; bytes.push((acc >> bits) & 255); acc &= (1 << bits) - 1; } }
  const pub = crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKeyHex, 'hex')]), format: 'der', type: 'spki' });
  return bytes.length === 64 && crypto.verify(null, Buffer.from(PREFIX + spreadsheetId, 'utf8'), pub, Buffer.from(bytes));
}

function loadPrivateKey() {
  const env = process.env;
  let pem = env.AFC_LICENSE_PRIVATE_KEY;
  const file = env.AFC_LICENSE_KEY_FILE || DEFAULT_KEY_FILE;
  if (!pem) {
    if (!fs.existsSync(file)) throw new Error(`Không thấy khoá riêng. Đặt AFC_LICENSE_PRIVATE_KEY / AFC_LICENSE_KEY_FILE, hoặc chạy "init" (file mặc định: ${file}).`);
    pem = fs.readFileSync(file, 'utf8');
  }
  return crypto.createPrivateKey(pem);
}

function readPubkeyFromGs() {
  const m = fs.readFileSync(LICENSE_GS, 'utf8').match(/PUBKEY: '([0-9a-f]*)'/);
  if (!m) throw new Error('Không tìm thấy dòng PUBKEY trong src/License.gs');
  return m[1];
}

function embed(hex) {
  const s = fs.readFileSync(LICENSE_GS, 'utf8');
  if (!/PUBKEY: '[0-9a-f]*'/.test(s)) throw new Error('Không tìm thấy dòng PUBKEY trong src/License.gs');
  fs.writeFileSync(LICENSE_GS, s.replace(/PUBKEY: '[0-9a-f]*'/, `PUBKEY: '${hex}'`));
}

function main(argv) {
  const [cmd, a, b] = argv;
  if (cmd === 'init') {
    const file = process.env.AFC_LICENSE_KEY_FILE || DEFAULT_KEY_FILE;
    if (fs.existsSync(file)) throw new Error(`Đã có khoá riêng tại ${file}. Không ghi đè (ghi đè = mọi mã đã cấp mất hiệu lực). Xoá file thủ công nếu thật sự muốn đổi khoá.`);
    const { privateKey } = generateKeyPair();
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 });
    const hex = publicHex(privateKey);
    embed(hex);
    console.log(`Đã tạo khoá riêng: ${file}  (SAO LƯU file này ở nơi an toàn, KHÔNG commit)`);
    console.log(`Khoá công khai (đã ghi vào src/License.gs): ${hex}`);
    console.log('Bước tiếp: commit src/License.gs, rồi clasp push khi sẵn sàng.');
  } else if (cmd === 'embed') {
    const hex = publicHex(loadPrivateKey());
    embed(hex);
    console.log('Đã ghi khoá công khai vào src/License.gs:', hex);
  } else if (cmd === 'verify') {
    if (!a || !b) throw new Error('Dùng: verify <spreadsheetId> <mã>');
    const ok = verifyCode(readPubkeyFromGs(), a, b);
    console.log(ok ? 'HỢP LỆ' : 'KHÔNG hợp lệ');
    process.exitCode = ok ? 0 : 1;
  } else if (cmd && !cmd.startsWith('-')) {
    if (!/^[A-Za-z0-9_-]{10,}$/.test(cmd)) throw new Error('ID bảng tính không hợp lệ (lấy từ URL: docs.google.com/spreadsheets/d/<ID>/edit).');
    const priv = loadPrivateKey();
    if (publicHex(priv) !== readPubkeyFromGs()) throw new Error('Khoá riêng không khớp khoá công khai trong src/License.gs (chạy "embed" hoặc dùng đúng khoá).');
    console.log(signCode(priv, cmd));
  } else {
    console.log('Dùng: init | embed | <spreadsheetId> | verify <spreadsheetId> <mã>  (xem đầu file)');
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (e) { console.error('Lỗi:', e.message); process.exitCode = 1; }
}
