import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import manifestFull from "../public/audio/manifest.json";
import manifestShort from "../public/audio-short/manifest.json";
import narrationShort from "./narration.short.json";
import { ScreenSceneView } from "./components/ScreenScene";
import { screenScenes as S } from "./data";
import { Clip, Layout, Seg, layout } from "./retime";
import { DmGrid, Intro, Outro, Overview, Phone, PrintA4, PrintSmall, SceneProps } from "./scenes/Custom";
import { customScript } from "./script";
import { ScreenScene } from "./types";

export type Entry = { id: string; duration: number; node: React.ReactNode; segs: Seg[] };
export type Manifest = Record<string, Clip[]>;

/** Tuỳ chọn dựng cảnh: bản đầy đủ dùng mặc định, bản rút gọn chọn bớt đoạn và co nhịp hình. */
export type Opt = {
  manifest: Manifest;
  /** chỉ giữ các đoạn subtext có chỉ số này (đoạn đầu tiên giữ lại luôn bắt đầu ở frame 0) */
  keep?: number[];
  /** nội dung subtext thay thế (cùng thứ tự với đoạn giữ lại) */
  texts?: string[];
  /** hệ số co độ dài hình gốc (lời vẫn quyết định độ dài tối thiểu) */
  scale?: number;
};

const clipsOf = (o: Opt, id: string) => {
  const c = o.manifest[id];
  if (!c) throw new Error(`Chưa có thuyết minh cho cảnh "${id}". Chạy: npm run narrate (hoặc narrate:short)`);
  return c;
};

/** Cảnh chụp màn hình: giãn theo lời, dời mọi mốc (camera, chú thích, subtext) theo. */
export function screen(s: ScreenScene, o: Opt): Entry {
  const k = o.scale ?? 1;
  const keep = o.keep ?? s.captions.map((_, i) => i);
  const oldAts = keep.map((ci, j) => (j === 0 ? 0 : Math.round(s.captions[ci].at * k)));
  const lay: Layout = layout(oldAts, Math.round(s.duration * k), clipsOf(o, s.id), s.id);
  const m = (f: number) => lay.map(Math.round(f * k));
  const scene: ScreenScene = {
    ...s,
    duration: lay.duration,
    camera: s.camera.map((c) => ({ ...c, at: m(c.at) })),
    callouts: s.callouts.map((c) => ({ ...c, at: m(c.at), until: c.until === undefined ? undefined : m(c.until) })),
    captions: keep.map((ci, j) => ({ at: lay.segs[j].start, text: o.texts?.[j] ?? s.captions[ci].text })),
  };
  return { id: s.id, duration: lay.duration, segs: lay.segs, node: <ScreenSceneView scene={scene} /> };
}

/** Cảnh tự dựng. */
export function custom(id: string, Comp: React.FC<SceneProps>, o: Opt): Entry {
  const sc = customScript[id];
  const k = o.scale ?? 1;
  const lay = layout(
    sc.captions.map((c) => Math.round(c.at * k)),
    Math.round(sc.duration * k),
    clipsOf(o, id),
    id,
  );
  const captions = sc.captions.map((c, i) => ({ ...c, at: lay.segs[i].start, text: o.texts?.[i] ?? c.text }));
  return { id, duration: lay.duration, segs: lay.segs, node: <Comp duration={lay.duration} captions={captions} segs={lay.segs} /> };
}

const FULL: Opt = { manifest: manifestFull as Manifest };
const SHORT = (keep?: number[]): Opt => ({ manifest: manifestShort as Manifest, keep, scale: 0.5 });
const shortTexts = (id: string, o: Opt): Opt => ({ ...o, texts: (narrationShort as Record<string, string[]>)[id] });
const sh = (id: string, keep?: number[]) => shortTexts(id, SHORT(keep));

/** Thứ tự cảnh của video đầy đủ (~6,5 phút). */
export const ENTRIES: Entry[] = [
  custom("intro", Intro, FULL),
  custom("overview", Overview, FULL),
  screen(S.tour, FULL),
  screen(S.steps, FULL),
  custom("print-a4", PrintA4, FULL),
  custom("print-small", PrintSmall, FULL),
  screen(S.phieuxuat, FULL),
  screen(S.chitiet, FULL),
  custom("dm-grid", DmGrid, FULL),
  screen(S.dmSanPham, FULL),
  screen(S.dmTaiXe, FULL),
  screen(S.baocao, FULL),
  screen(S.cauhinh, FULL),
  screen(S.webForm, FULL),
  screen(S.webList, FULL),
  screen(S.webReport, FULL),
  custom("phone", Phone, FULL),
  custom("outro", Outro, FULL),
];

/** Bản rút gọn (< 2 phút): chỉ các cửa sổ chính, mỗi cảnh một hai câu. */
export const SHORT_ENTRIES: Entry[] = [
  custom("intro", Intro, sh("intro")),
  custom("overview", Overview, sh("overview")),
  screen(S.tour, sh("tour", [0, 2])),
  screen(S.steps, sh("steps", [0, 1, 2, 3])),
  custom("print-a4", PrintA4, sh("print-a4")),
  custom("print-small", PrintSmall, sh("print-small")),
  screen(S.phieuxuat, sh("phieuxuat", [0])),
  screen(S.chitiet, sh("chitiet", [0])),
  custom("dm-grid", DmGrid, sh("dm-grid")),
  screen(S.dmTaiXe, sh("dm-taixe", [1])),
  screen(S.baocao, sh("baocao", [0, 2])),
  screen(S.webForm, sh("web-form", [0, 2])),
  screen(S.webList, sh("web-list", [1])),
  screen(S.webReport, sh("web-report", [0])),
  custom("phone", Phone, sh("phone")),
  custom("outro", Outro, sh("outro")),
];

export const TOTAL_FRAMES = ENTRIES.reduce((a, e) => a + e.duration, 0);
export const SHORT_TOTAL_FRAMES = SHORT_ENTRIES.reduce((a, e) => a + e.duration, 0);

export const make = (entries: Entry[]): React.FC => () => {
  let from = 0;
  return (
    <>
      {entries.map((e) => {
        const start = from;
        from += e.duration;
        return (
          <React.Fragment key={e.id}>
            <Sequence from={start} durationInFrames={e.duration} name={e.id}>
              {e.node}
            </Sequence>
            {e.segs.map((seg, i) => (
              <Sequence key={i} from={start + seg.aStart} durationInFrames={seg.aFrames + 2} name={`voice:${e.id}:${i}`}>
                <Audio src={staticFile(seg.file)} />
              </Sequence>
            ))}
          </React.Fragment>
        );
      })}
    </>
  );
};

export const Tutorial = make(ENTRIES);
export const TutorialShort = make(SHORT_ENTRIES);
