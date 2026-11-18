export const FPS = 30;
export const W = 1920;
export const H = 1080;

/** Khung hiển thị ảnh chụp màn hình (đúng 1:1 với ảnh chụp sheet 1400×841). */
export const VIEW = { x: 260, y: 98, w: 1400, h: 816 };

export const C = {
  bg: "#0b1020",
  bg2: "#111a33",
  panel: "#16213f",
  line: "#2a3a66",
  text: "#f1f5f9",
  mute: "#94a3b8",
  blue: "#3b82f6",
  green: "#34d399",
  amber: "#fbbf24",
  pink: "#f472b6",
  red: "#f87171",
  ink: "#0b1020",
};

export const FONT =
  '-apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
export const MONO = '"SF Mono", Menlo, Consolas, monospace';

/** Chuyển 'tên file' trong public/shots thành đường dẫn tĩnh. */
export const shot = (name: string) => `shots/${name}`;
