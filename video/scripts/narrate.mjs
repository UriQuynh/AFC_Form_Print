// Tạo giọng đọc thuyết minh bằng giọng tiếng Việt có sẵn của macOS (say -v Linh), chạy cục bộ.
//   npm run narrate            -> chỉ tạo lại đoạn nào có chữ đổi
//   FORCE=1 npm run narrate    -> tạo lại tất cả
//   VOICE=Linh RATE=205 npm run narrate
// Đọc src/narration.json -> ghi public/audio/<cảnh>-<n>.mp3 + public/audio/manifest.json (độ dài từng đoạn).
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const narration = JSON.parse(fs.readFileSync(path.join(root, "src/narration.json"), "utf8"));
const outDir = path.join(root, "public/audio");
const tmpDir = path.join(root, "out/tts");
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

const VOICE = process.env.VOICE || "Linh";
const RATE = String(process.env.RATE || 205);
const FORCE = process.env.FORCE === "1";
const manifestPath = path.join(outDir, "manifest.json");
const old = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};

const hash = (t) => crypto.createHash("sha1").update(`${VOICE}|${RATE}|${t}`).digest("hex").slice(0, 12);
const probe = (f) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).trim());

const manifest = {};
let made = 0;
for (const [id, parts] of Object.entries(narration)) {
  manifest[id] = [];
  parts.forEach((text, i) => {
    const name = `${id}-${i}.mp3`;
    const file = path.join(outDir, name);
    const h = hash(text);
    const prev = old[id]?.[i];
    if (!FORCE && prev && prev.hash === h && fs.existsSync(file)) {
      manifest[id].push(prev);
      return;
    }
    const aiff = path.join(tmpDir, `${id}-${i}.aiff`);
    execFileSync("say", ["-v", VOICE, "-r", RATE, "-o", aiff, text]);
    // chuẩn hoá âm lượng, mono 44.1 kHz
    execFileSync("ffmpeg", [
      "-v", "error", "-y", "-i", aiff,
      "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100",
      "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "96k", file,
    ]);
    const seconds = Math.round(probe(file) * 1000) / 1000;
    manifest[id].push({ file: `audio/${name}`, seconds, hash: h });
    made++;
    console.log(`  ✓ ${name}  ${seconds.toFixed(1)}s`);
  });
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
const total = Object.values(manifest).flat().reduce((s, c) => s + c.seconds, 0);
console.log(`Giọng ${VOICE}, tốc độ ${RATE}: tạo mới ${made} đoạn, tổng thời lượng lời ${(total / 60).toFixed(1)} phút`);
