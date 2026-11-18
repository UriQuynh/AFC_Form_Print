import React from "react";
import { Sequence } from "remotion";
import { ScreenSceneView } from "./components/ScreenScene";
import { screenScenes as S } from "./data";
import { DmGrid, Intro, Outro, Overview, Phone, PrintA4, PrintSmall } from "./scenes/Custom";

type Entry = { id: string; duration: number; node: React.ReactNode };

const screen = (s: (typeof S)[keyof typeof S]): Entry => ({ id: s.id, duration: s.duration, node: <ScreenSceneView scene={s} /> });
const custom = (id: string, duration: number, C: React.FC<{ duration: number }>): Entry => ({
  id,
  duration,
  node: <C duration={duration} />,
});

/** Thứ tự cảnh của video. */
export const ENTRIES: Entry[] = [
  custom("intro", 120, Intro),
  custom("overview", 330, Overview),
  screen(S.tour),
  screen(S.steps),
  custom("print-a4", 300, PrintA4),
  custom("print-small", 300, PrintSmall),
  screen(S.phieuxuat),
  screen(S.chitiet),
  custom("dm-grid", 270, DmGrid),
  screen(S.dmSanPham),
  screen(S.dmTaiXe),
  screen(S.baocao),
  screen(S.cauhinh),
  screen(S.webForm),
  screen(S.webList),
  screen(S.webReport),
  custom("phone", 270, Phone),
  custom("outro", 180, Outro),
];

export const TOTAL_FRAMES = ENTRIES.reduce((a, e) => a + e.duration, 0);

export const Tutorial: React.FC = () => {
  let from = 0;
  return (
    <>
      {ENTRIES.map((e) => {
        const start = from;
        from += e.duration;
        return (
          <Sequence key={e.id} from={start} durationInFrames={e.duration} name={e.id}>
            {e.node}
          </Sequence>
        );
      })}
    </>
  );
};
