import React from "react";
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, VIEW, shot } from "../theme";
import { Callout, CameraKey, ScreenScene as ScreenSceneT, Side } from "../types";
import { Backdrop, Caption, Header, SceneFade } from "./Chrome";

const MOVE = 32; // số frame camera di chuyển giữa hai mốc

type Cam = { cx: number; cy: number; zoom: number };

const ease = Easing.inOut(Easing.cubic);

/** Camera: giữ nguyên ở mốc trước, đến `at` thì trượt sang mốc mới trong MOVE frame. */
export function cameraAt(keys: CameraKey[], f: number): Cam {
  let prev: Cam = keys[0];
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f <= k.at) return prev;
    const p = Math.min(1, (f - k.at) / MOVE);
    if (p < 1) {
      const e = ease(p);
      return {
        cx: prev.cx + (k.cx - prev.cx) * e,
        cy: prev.cy + (k.cy - prev.cy) * e,
        zoom: prev.zoom + (k.zoom - prev.zoom) * e,
      };
    }
    prev = k;
  }
  return prev;
}

/** Kích thước ảnh ở zoom = 1: vừa chiều ngang khung (ảnh sheet 1400px nên giữ nguyên 1:1), cao hơn thì cắt mép. */
function baseSize(imageW: number, imageH: number) {
  const s = VIEW.w / imageW;
  return { bw: imageW * s, bh: imageH * s };
}

/** Vị trí trái/trên của ảnh trong khung sau khi áp camera. */
function place(cam: Cam, bw: number, bh: number) {
  const w = bw * cam.zoom;
  const h = bh * cam.zoom;
  let left = VIEW.w / 2 - cam.cx * w;
  let top = VIEW.h / 2 - cam.cy * h;
  left = w >= VIEW.w ? Math.min(0, Math.max(VIEW.w - w, left)) : (VIEW.w - w) / 2;
  top = h >= VIEW.h ? Math.min(0, Math.max(VIEW.h - h, top)) : (VIEW.h - h) / 2;
  return { left, top, w, h };
}

const estW = (label: string, hasNum: boolean) => label.length * 15.6 + 52 + (hasNum ? 44 : 0);

function labelPos(side: Side, r: { x: number; y: number; w: number; h: number }, lw: number, lh: number) {
  const gap = 14;
  let x = r.x + r.w / 2 - lw / 2;
  let y = r.y - lh - gap;
  if (side === "bottom") y = r.y + r.h + gap;
  if (side === "left") {
    x = r.x - lw - gap;
    y = r.y + r.h / 2 - lh / 2;
  }
  if (side === "right") {
    x = r.x + r.w + gap;
    y = r.y + r.h / 2 - lh / 2;
  }
  // luôn nằm trong khung hiển thị
  x = Math.max(10, Math.min(VIEW.w - lw - 10, x));
  y = Math.max(10, Math.min(VIEW.h - lh - 10, y));
  return { x, y };
}

export const ScreenSceneView: React.FC<{ scene: ScreenSceneT }> = ({ scene }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { bw, bh } = baseSize(scene.imageW, scene.imageH);
  const cam = cameraAt(scene.camera, f);
  const pl = place(cam, bw, bh);

  const active = scene.callouts.filter((c) => f >= c.at && (c.until === undefined || f < c.until));
  const spot = [...active].reverse().find((c) => c.spot);

  const rectOf = (box: Callout["box"]) => ({
    x: pl.left + box[0] * pl.w,
    y: pl.top + box[1] * pl.h,
    w: box[2] * pl.w,
    h: box[3] * pl.h,
  });

  const spotRect = spot ? rectOf(spot.box) : null;

  return (
    <Backdrop>
      <SceneFade duration={scene.duration}>
        <Header tab={scene.tab} title={scene.title} kind={scene.source} />
        {/* khung cửa sổ */}
        <div
          style={{
            position: "absolute",
            left: VIEW.x,
            top: VIEW.y,
            width: VIEW.w,
            height: VIEW.h,
            borderRadius: 16,
            overflow: "hidden",
            background: "#f3f4f6",
            boxShadow: "0 30px 90px rgba(0,0,0,.55), 0 0 0 1px rgba(148,163,184,.25)",
          }}
        >
          <Img
            src={staticFile(shot(scene.image))}
            style={{ position: "absolute", left: pl.left, top: pl.top, width: pl.w, height: pl.h }}
          />
          {spotRect ? (
            <div
              style={{
                position: "absolute",
                left: spotRect.x - 6,
                top: spotRect.y - 6,
                width: spotRect.w + 12,
                height: spotRect.h + 12,
                borderRadius: 10,
                boxShadow: "0 0 0 4000px rgba(6,10,24,.62)",
                opacity: interpolate(f, [spot!.at, spot!.at + 10], [0, 1], { extrapolateRight: "clamp" }),
              }}
            />
          ) : null}
          {active.map((c, i) => {
            const color = c.color ?? C.amber;
            const t = spring({ frame: f - c.at, fps, config: { damping: 16, stiffness: 160 }, durationInFrames: 24 });
            const out = c.until !== undefined ? interpolate(f, [c.until - 6, c.until], [1, 0], { extrapolateLeft: "clamp" }) : 1;
            const r = rectOf(c.box);
            const lw = estW(c.label, c.num !== undefined);
            const lh = 58;
            const side = c.side ?? "top";
            const lp = labelPos(side, r, lw, lh);
            const pulse = 0.5 + 0.5 * Math.sin((f - c.at) / 7);
            return (
              <React.Fragment key={i}>
                <div
                  style={{
                    position: "absolute",
                    left: r.x - 5,
                    top: r.y - 5,
                    width: r.w + 10,
                    height: r.h + 10,
                    border: `4px solid ${color}`,
                    borderRadius: 10,
                    boxShadow: `0 0 ${14 + pulse * 14}px ${color}aa`,
                    opacity: t * out,
                    transform: `scale(${0.94 + 0.06 * t})`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: lp.x,
                    top: lp.y,
                    height: lh,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: c.num !== undefined ? "0 22px 0 10px" : "0 22px",
                    borderRadius: 29,
                    background: color,
                    color: C.ink,
                    fontFamily: FONT,
                    fontSize: 28,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    opacity: t * out,
                    transform: `translateY(${(1 - t) * 14}px)`,
                    boxShadow: "0 8px 24px rgba(0,0,0,.45)",
                  }}
                >
                  {c.num !== undefined ? (
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        background: C.ink,
                        color,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                      }}
                    >
                      {c.num}
                    </span>
                  ) : null}
                  {c.label}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <Caption captions={scene.captions} duration={scene.duration} />
      </SceneFade>
    </Backdrop>
  );
};
