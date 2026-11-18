import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, MONO } from "../theme";
import { CaptionKey } from "../types";

/** Nền + vầng sáng nhẹ. */
export const Backdrop: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(1200px 700px at 20% 0%, #1b2a55 0%, transparent 60%), radial-gradient(900px 600px at 100% 100%, #14284d 0%, transparent 55%), ${C.bg}`,
      fontFamily: FONT,
      color: C.text,
    }}
  >
    {children}
  </AbsoluteFill>
);

/** Fade vào/ra ở hai đầu mỗi cảnh. */
export const SceneFade: React.FC<{ duration: number; children: React.ReactNode }> = ({ duration, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, duration - 8, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

/** Thanh tiêu đề: huy hiệu tab (giống tab Google Sheet) + tên cảnh. */
export const Header: React.FC<{ tab?: string; title: string; kind?: "sheet" | "web" }> = ({ tab, title, kind = "sheet" }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 260,
        top: 26,
        right: 260,
        height: 56,
        display: "flex",
        alignItems: "center",
        gap: 20,
        opacity: t,
        transform: `translateY(${(1 - t) * -12}px)`,
      }}
    >
      {tab ? (
        <div
          style={{
            fontFamily: kind === "sheet" ? FONT : FONT,
            fontSize: 30,
            fontWeight: 700,
            padding: "6px 22px",
            borderRadius: "10px 10px 0 0",
            background: kind === "sheet" ? "#e8f0fe" : C.blue,
            color: kind === "sheet" ? "#1a56db" : "#fff",
            borderBottom: `4px solid ${kind === "sheet" ? "#1a56db" : "#93c5fd"}`,
            letterSpacing: 0.2,
          }}
        >
          {tab}
        </div>
      ) : null}
      <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -0.3 }}>{title}</div>
    </div>
  );
};

/** Subtext: chữ giải thích ở cuối màn hình, đổi theo mốc frame. */
export const Caption: React.FC<{ captions: CaptionKey[]; duration: number }> = ({ captions, duration }) => {
  const f = useCurrentFrame();
  let idx = 0;
  captions.forEach((c, i) => {
    if (f >= c.at) idx = i;
  });
  const cur = captions[idx];
  const start = cur.at;
  const end = idx + 1 < captions.length ? captions[idx + 1].at : duration;
  const o = interpolate(f, [start, start + 10, end - 6, end], [0, 1, 1, idx + 1 < captions.length ? 0 : 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(f, [start, start + 10], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 120, right: 120, bottom: 28, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          opacity: o,
          transform: `translateY(${y}px)`,
          background: "rgba(8,12,28,.78)",
          border: `1px solid ${C.line}`,
          borderRadius: 18,
          padding: "14px 32px",
          fontSize: 33,
          lineHeight: 1.3,
          fontWeight: 600,
          textAlign: "center",
          maxWidth: 1640,
          boxShadow: "0 10px 40px rgba(0,0,0,.35)",
        }}
      >
        {cur.text}
      </div>
    </div>
  );
};

/** Mã/tên kỹ thuật (tên sheet, mã cuộn…) hiện dạng chip đơn cách. */
export const Chip: React.FC<{ children: React.ReactNode; color?: string; size?: number }> = ({ children, color = C.blue, size = 24 }) => (
  <span
    style={{
      fontFamily: MONO,
      fontSize: size,
      fontWeight: 700,
      color,
      background: "rgba(255,255,255,.06)",
      border: `1px solid ${color}55`,
      padding: "2px 12px",
      borderRadius: 8,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

export const useFps = () => useVideoConfig().fps;
