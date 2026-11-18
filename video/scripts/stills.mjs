// Chụp nhanh các khung hình để soát bố cục: node scripts/stills.mjs 60 560 1150 ...  (ảnh ra out/stills/)
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const root = path.resolve(import.meta.dirname, "..");
const SHELL = process.env.REMOTION_BROWSER ||
  "/Users/uriquynh/Project/Remotion/remotion-project/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const frames = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
const scale = Number(process.env.SCALE || 0.6);
const outDir = path.join(root, "out/stills");
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.join(root, "public") });
const browserExecutable = fs.existsSync(SHELL) ? SHELL : undefined;
const comp = await selectComposition({ serveUrl, id: process.env.COMP || "Tutorial", browserExecutable });
console.log(`Tổng ${comp.durationInFrames} khung (${(comp.durationInFrames / comp.fps).toFixed(1)}s)`);
for (const f of frames) {
  const output = path.join(outDir, `f${String(f).padStart(4, "0")}.png`);
  await renderStill({ composition: comp, serveUrl, frame: f, output, scale, browserExecutable });
  console.log("  ✓", output);
}
