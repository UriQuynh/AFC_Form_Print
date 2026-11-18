export type Side = "top" | "bottom" | "left" | "right";

export type Callout = {
  /** frame (tính từ đầu cảnh) bắt đầu hiện */
  at: number;
  /** frame ẩn đi (mặc định: hiện đến hết cảnh) */
  until?: number;
  /** [x, y, w, h] theo toạ độ chuẩn hoá 0..1 của ảnh */
  box: [number, number, number, number];
  label: string;
  side?: Side;
  color?: string;
  /** số thứ tự hiện trong huy hiệu tròn */
  num?: number;
  /** làm tối phần còn lại để dồn sự chú ý */
  spot?: boolean;
};

export type CameraKey = { at: number; cx: number; cy: number; zoom: number };

export type CaptionKey = { at: number; text: string };

export type ScreenScene = {
  kind: "screen";
  id: string;
  duration: number;
  /** sheet = tab Google Sheet, web = màn hình web app */
  source: "sheet" | "web";
  /** tên tab / màn hình hiện ở góc trên */
  tab: string;
  title: string;
  image: string;
  imageW: number;
  imageH: number;
  camera: CameraKey[];
  callouts: Callout[];
  captions: CaptionKey[];
};

/** Toạ độ ảnh sheet 1400×841 (px) -> chuẩn hoá. */
export const px = (x: number, y: number, w: number, h: number): [number, number, number, number] => [
  x / 1400,
  y / 841,
  w / 1400,
  h / 841,
];
