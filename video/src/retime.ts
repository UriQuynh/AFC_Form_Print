import { FPS } from "./theme";

export type Clip = { file: string; seconds: number };

/** Một đoạn của cảnh: ứng với một đoạn subtext và một đoạn lời thuyết minh. */
export type Seg = {
  /** frame bắt đầu / kết thúc đoạn (tính từ đầu cảnh, sau khi giãn theo lời) */
  start: number;
  end: number;
  /** frame bắt đầu đọc và số frame của lời */
  aStart: number;
  aFrames: number;
  file: string;
};

export type Layout = {
  duration: number;
  segs: Seg[];
  /** đổi mốc frame cũ (theo kịch bản gốc) sang mốc mới sau khi giãn */
  map: (f: number) => number;
};

const LEAD_FIRST = 10; // chờ một chút trước câu đầu của cảnh
const LEAD = 8;
const TAIL = 16; // lặng sau mỗi đoạn
const END_PAD = 18; // lặng cuối cảnh

/**
 * Giãn cảnh cho vừa lời thuyết minh.
 * Mỗi đoạn dài tối thiểu bằng độ dài gốc (giữ nhịp hình), dài hơn nếu lời dài hơn.
 * Mốc cũ trong đoạn được dồn theo tỉ lệ để chú thích / camera vẫn nằm đúng đoạn lời.
 */
export function layout(oldAts: number[], oldDuration: number, clips: Clip[], id = "?"): Layout {
  if (oldAts.length !== clips.length) {
    throw new Error(`Cảnh "${id}": có ${oldAts.length} đoạn subtext nhưng ${clips.length} đoạn thuyết minh (sửa narration.json rồi chạy npm run narrate).`);
  }
  if (oldAts[0] !== 0) throw new Error(`Cảnh "${id}": đoạn subtext đầu phải bắt đầu ở frame 0.`);
  const oldBounds = [...oldAts, oldDuration];
  const newBounds = [0];
  const segs: Seg[] = [];
  let cursor = 0;
  clips.forEach((c, i) => {
    const aFrames = Math.ceil(c.seconds * FPS);
    const lead = i === 0 ? LEAD_FIRST : LEAD;
    const oldLen = oldBounds[i + 1] - oldBounds[i];
    const need = lead + aFrames + TAIL + (i === clips.length - 1 ? END_PAD : 0);
    const len = Math.max(oldLen, need);
    segs.push({ start: cursor, end: cursor + len, aStart: cursor + lead, aFrames, file: c.file });
    cursor += len;
    newBounds.push(cursor);
  });
  const map = (f: number) => {
    const x = Math.max(0, Math.min(oldDuration, f));
    for (let i = 0; i < clips.length; i++) {
      if (x <= oldBounds[i + 1] || i === clips.length - 1) {
        const span = oldBounds[i + 1] - oldBounds[i];
        const p = span > 0 ? (x - oldBounds[i]) / span : 0;
        return Math.round(newBounds[i] + p * (newBounds[i + 1] - newBounds[i]));
      }
    }
    return cursor;
  };
  return { duration: cursor, segs, map };
}

/** Frame của thời điểm "frac" (0..1) trong lời của đoạn i. */
export const cue = (segs: Seg[], i: number, frac = 0) => Math.round(segs[i].aStart + frac * segs[i].aFrames);
