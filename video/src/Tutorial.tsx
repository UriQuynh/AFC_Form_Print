import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import manifest from "../public/audio/manifest.json";
import { ScreenSceneView } from "./components/ScreenScene";
import { screenScenes as S } from "./data";
import { Layout, Seg, layout } from "./retime";
import { DmGrid, Intro, Outro, Overview, Phone, PrintA4, PrintSmall, SceneProps } from "./scenes/Custom";
import { customScript } from "./script";
import { ScreenScene } from "./types";

type Entry = { id: string; duration: number; node: React.ReactNode; segs: Seg[] };

const clipsOf = (id: string) => {
  const c = (manifest as Record<string, { file: string; seconds: number }[]>)[id];
  if (!c) throw new Error(`Chưa có thuyết minh cho cảnh "${id}". Chạy: npm run narrate`);
  return c;
};

/** Cảnh chụp màn hình: giãn theo lời, dời mọi mốc (camera, chú thích, subtext) theo. */
function screen(s: ScreenScene): Entry {
  const lay: Layout = layout(
    s.captions.map((c) => c.at),
    s.duration,
    clipsOf(s.id),
    s.id,
  );
  const scene: ScreenScene = {
    ...s,
    duration: lay.duration,
    camera: s.camera.map((k) => ({ ...k, at: lay.map(k.at) })),
    callouts: s.callouts.map((c) => ({ ...c, at: lay.map(c.at), until: c.until === undefined ? undefined : lay.map(c.until) })),
    captions: s.captions.map((c, i) => ({ ...c, at: lay.segs[i].start })),
  };
  return { id: s.id, duration: lay.duration, segs: lay.segs, node: <ScreenSceneView scene={scene} /> };
}

/** Cảnh tự dựng. */
function custom(id: string, Comp: React.FC<SceneProps>): Entry {
  const sc = customScript[id];
  const lay = layout(
    sc.captions.map((c) => c.at),
    sc.duration,
    clipsOf(id),
    id,
  );
  const captions = sc.captions.map((c, i) => ({ ...c, at: lay.segs[i].start }));
  return { id, duration: lay.duration, segs: lay.segs, node: <Comp duration={lay.duration} captions={captions} segs={lay.segs} /> };
}

/** Thứ tự cảnh của video. */
export const ENTRIES: Entry[] = [
  custom("intro", Intro),
  custom("overview", Overview),
  screen(S.tour),
  screen(S.steps),
  custom("print-a4", PrintA4),
  custom("print-small", PrintSmall),
  screen(S.phieuxuat),
  screen(S.chitiet),
  custom("dm-grid", DmGrid),
  screen(S.dmSanPham),
  screen(S.dmTaiXe),
  screen(S.baocao),
  screen(S.cauhinh),
  screen(S.webForm),
  screen(S.webList),
  screen(S.webReport),
  custom("phone", Phone),
  custom("outro", Outro),
];

export const TOTAL_FRAMES = ENTRIES.reduce((a, e) => a + e.duration, 0);

export const Tutorial: React.FC = () => {
  let from = 0;
  return (
    <>
      {ENTRIES.map((e) => {
        const start = from;
        from += e.duration;
        const clips = clipsOf(e.id);
        return (
          <React.Fragment key={e.id}>
            <Sequence from={start} durationInFrames={e.duration} name={e.id}>
              {e.node}
            </Sequence>
            {e.segs.map((seg, i) => (
              <Sequence key={i} from={start + seg.aStart} durationInFrames={seg.aFrames + 2} name={`voice:${e.id}:${i}`}>
                <Audio src={staticFile(clips[i].file)} />
              </Sequence>
            ))}
          </React.Fragment>
        );
      })}
    </>
  );
};
