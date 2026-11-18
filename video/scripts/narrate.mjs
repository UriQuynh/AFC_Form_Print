// Tạo giọng đọc thuyết minh bằng giọng tiếng Việt có sẵn của macOS (say -v Linh), chạy cục bộ.
//   npm run narrate            -> chỉ tạo lại đoạn nào có chữ đổi
//   FORCE=1 npm run narrate    -> tạo lại tất cả
//   VOICE=Linh RATE=205 npm run narrate
// Chọn giọng ElevenLabs (cần ELEVENLABS_API_KEY trong video/.env):
//   PROVIDER=eleven npm run narrate
//   PROVIDER=eleven EL_VOICE=<voice_id> EL_MODEL=eleven_v3 npm run narrate
// Đọc src/narration.json -> ghi public/audio/<cảnh>-<n>.mp3 + public/audio/manifest.json (độ dài từng đoạn).
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
// NARRATION=<tên> -> src/narration.<tên>.json -> public/audio-<tên> (short = bản rút gọn, user = nhân viên, manager = quản lý)
const NAME = process.env.NARRATION || "";
const narration = JSON.parse(fs.readFileSync(path.join(root, NAME ? `src/narration.${NAME}.json` : "src/narration.json"), "utf8"));
const AUDIO_DIR = NAME ? `audio-${NAME}` : "audio";
const outDir = path.join(root, "public", AUDIO_DIR);
const tmpDir = path.join(root, NAME ? `out/tts-${NAME}` : "out/tts");
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

// đọc video/.env (không commit) nếu có
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const PROVIDER = process.env.PROVIDER || (process.env.ELEVENLABS_API_KEY ? "eleven" : "say");
const EL_KEY = process.env.ELEVENLABS_API_KEY || "";
const EL_VOICE = process.env.EL_VOICE || "21m00Tcm4TlvDq8ikWAM";
const EL_MODEL = process.env.EL_MODEL || "eleven_v3";
const VOICE = PROVIDER === "eleven" ? `eleven:${EL_MODEL}:${EL_VOICE}` : process.env.VOICE || "Linh";
const RATE = PROVIDER === "eleven" ? "-" : String(process.env.RATE || 205);
if (PROVIDER === "eleven" && !EL_KEY) throw new Error("Thiếu ELEVENLABS_API_KEY (đặt trong video/.env)");

// Lời trong narration.json viết phiên âm cho giọng macOS ("Gu-gồ Sít"). ElevenLabs đọc tên riêng đúng hơn khi viết nguyên gốc.
const ELEVEN_FIX = [
  [/Gu-gồ Sít/g, "Google Sheets"],
  [/oép áp/gi, "web app"],
  [/A ép xê/g, "AFC"],
  [/pê xê ca/g, "PXK"],
  [/ca xê ét cộng xê ô a/g, "KCS cộng COA"],
  [/ca xê ét/g, "KCS"],
  [/xê ô a/g, "COA"],
  [/mã kiu a/gi, "mã QR"],
  [/kiu a/gi, "QR"],
  [/bê em không bốn/g, "BM-04"],
  [/Éc-xeo/g, "Excel"],
  [/pa-lét/gi, (m) => (m[0] === "P" ? "Pallet" : "pallet")],
  [/ki-lô-gam/g, "ki-lô-gam"],
  [/\ba bốn\b/g, "A4"],
  [/\ba năm\b/g, "A5"],
  [/Sol-vích/g, "SOLVIQ"],
];
const forEleven = (t) => ELEVEN_FIX.reduce((a, [re, to]) => a.replace(re, to), t);

async function elevenTts(text, outMp3) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}?output_format=mp3_44100_96`;
  const body = JSON.stringify({
    text: forEleven(text),
    model_id: EL_MODEL,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
  });
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(url, { method: "POST", headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json" }, body });
    if (r.ok) {
      fs.writeFileSync(outMp3, Buffer.from(await r.arrayBuffer()));
      return;
    }
    const msg = (await r.text()).slice(0, 300);
    if ((r.status === 429 || r.status >= 500) && attempt < 4) {
      await new Promise((ok) => setTimeout(ok, 1500 * attempt));
      continue;
    }
    throw new Error(`ElevenLabs lỗi ${r.status}: ${msg}`);
  }
}
const FORCE = process.env.FORCE === "1";
const manifestPath = path.join(outDir, "manifest.json");
const old = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};

const hash = (t) => crypto.createHash("sha1").update(`${VOICE}|${RATE}|${PROVIDER === "eleven" ? forEleven(t) : t}`).digest("hex").slice(0, 12);
const probe = (f) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).trim());

const manifest = {};
let made = 0;
for (const [id, parts] of Object.entries(narration)) {
  manifest[id] = [];
  for (const [i, text] of parts.entries()) {
    const name = `${id}-${i}.mp3`;
    const file = path.join(outDir, name);
    const h = hash(text);
    const prev = old[id]?.[i];
    if (!FORCE && prev && prev.hash === h && fs.existsSync(file)) {
      manifest[id].push(prev);
      continue;
    }
    const aiff = path.join(tmpDir, `${id}-${i}.${PROVIDER === "eleven" ? "raw.mp3" : "aiff"}`);
    if (PROVIDER === "eleven") await elevenTts(text, aiff);
    else execFileSync("say", ["-v", VOICE, "-r", RATE, "-o", aiff, text]);
    // chuẩn hoá âm lượng, mono 44.1 kHz
    execFileSync("ffmpeg", [
      "-v", "error", "-y", "-i", aiff,
      "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100",
      "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "96k", file,
    ]);
    const seconds = Math.round(probe(file) * 1000) / 1000;
    manifest[id].push({ file: `${AUDIO_DIR}/${name}`, seconds, hash: h });
    made++;
    console.log(`  ✓ ${name}  ${seconds.toFixed(1)}s`);
  }
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
const total = Object.values(manifest).flat().reduce((s, c) => s + c.seconds, 0);
console.log(`Giọng ${VOICE}${PROVIDER === "eleven" ? "" : `, tốc độ ${RATE}`}: tạo mới ${made} đoạn, tổng thời lượng lời ${(total / 60).toFixed(1)} phút`);
