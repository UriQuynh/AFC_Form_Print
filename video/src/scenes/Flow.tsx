import React from "react";
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, Caption, Header, SceneFade } from "../components/Chrome";
import { cue } from "../retime";
import { C, FONT, MONO, VIEW, shot } from "../theme";
import { Appear, Bullet, SceneProps } from "./Custom";

// ====================================================== THẺ TIÊU ĐỀ / KẾT (dùng cho các clip theo vai trò)
export const titleCard = (opts: { badge: string; title: string; sub: string; chips: string[]; color: string }): React.FC<SceneProps> => {
  const Comp: React.FC<SceneProps> = ({ duration }) => {
    const f = useCurrentFrame();
    const { fps } = useVideoConfig();
    const t = spring({ frame: f, fps, config: { damping: 16 }, durationInFrames: 30 });
    const t2 = spring({ frame: f - 12, fps, config: { damping: 16 }, durationInFrames: 30 });
    const t3 = spring({ frame: f - 26, fps, config: { damping: 16 }, durationInFrames: 30 });
    return (
      <Backdrop>
        <SceneFade duration={duration}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28 }}>
            <div style={{ opacity: t, transform: `scale(${0.9 + 0.1 * t})`, background: "#fff", borderRadius: 18, padding: "12px 24px" }}>
              <Img src={staticFile("shots/afc-logo.png")} style={{ height: 96, display: "block" }} />
            </div>
            <div style={{ opacity: t, fontSize: 34, fontWeight: 800, color: C.ink, background: opts.color, padding: "6px 28px", borderRadius: 999, letterSpacing: 1 }}>{opts.badge}</div>
            <div style={{ opacity: t2, transform: `translateY(${(1 - t2) * 24}px)`, fontSize: 84, fontWeight: 800, letterSpacing: -2, textAlign: "center", lineHeight: 1.05 }}>{opts.title}</div>
            <div style={{ opacity: t2, fontSize: 40, color: "#93c5fd", fontWeight: 600 }}>{opts.sub}</div>
            <div style={{ opacity: t3, display: "flex", gap: 18, marginTop: 10 }}>
              {opts.chips.map((s) => (
                <div key={s} style={{ fontSize: 30, fontWeight: 700, padding: "10px 26px", borderRadius: 999, border: `2px solid ${C.line}`, background: "rgba(255,255,255,.05)" }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </SceneFade>
      </Backdrop>
    );
  };
  return Comp;
};

// ====================================================== SHEET "NHẬP PXK" GIẢ LẬP: gõ từng thao tác rồi bấm IN PHIẾU
const SW = VIEW.w;
const SH = VIEW.h;
const ease = Easing.inOut(Easing.cubic);

// bố cục (toạ độ trong khung 1400×816)
const ROW_Y = (r: number) => 184 + 38 * r;
const TBL_Y = 436;
const TBL_H = 38;
const COLS = { sp: [20, 170], kg: [190, 190], banh: [380, 100], ca: [480, 100], may: [580, 100], ngay: [680, 140], ma: [820, 280] } as const;
const cellCenter = (col: readonly [number, number], row: number) => ({ x: col[0] + col[1] / 2, y: TBL_Y + TBL_H * row + TBL_H / 2 });
const BTN_NEW = { x: 690, y: 98, w: 130, h: 36 };
const BTN_PRINT = { x: 470, y: 98, w: 190, h: 36 };
const BTN_LOAD = { x: 840, y: 98, w: 200, h: 36 };

const YEL = "#fff3c4";
const YEL_LINE = "#e8cf7a";
const PUR = "#ede4ff";

const Cell: React.FC<{ x: number; y: number; w: number; h?: number; bg?: string; align?: "left" | "right" | "center"; bold?: boolean; color?: string; mono?: boolean; glow?: number; children?: React.ReactNode }> = ({
  x, y, w, h = 38, bg = "#fff", align = "left", bold, color = "#1f2937", mono, glow = 0, children,
}) => (
  <div
    style={{
      position: "absolute", left: x, top: y, width: w, height: h, boxSizing: "border-box", background: bg, border: "1px solid #d9dce3",
      padding: "0 10px", display: "flex", alignItems: "center", justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start",
      fontSize: 19, fontWeight: bold ? 700 : 500, color, fontFamily: mono ? MONO : FONT, whiteSpace: "nowrap", overflow: "hidden",
      boxShadow: glow > 0 ? `inset 0 0 0 3px rgba(52,211,153,${glow}), 0 0 ${18 * glow}px rgba(52,211,153,${glow})` : undefined,
    }}
  >
    {children}
  </div>
);

const Label: React.FC<{ x: number; y: number; w: number; children: React.ReactNode }> = ({ x, y, w, children }) => (
  <Cell x={x} y={y} w={w} bg="#f8f9fb" align="right" color="#475569">
    {children}
  </Cell>
);

const Tag: React.FC<{ at: number; x: number; y: number; children: React.ReactNode; color?: string }> = ({ at, x, y, children, color = C.green }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at, at + 8, at + 70, at + 82], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: o, transform: `translateY(${(1 - o) * 6}px)`, background: color, color: C.ink, fontWeight: 800, fontSize: 17, padding: "3px 12px", borderRadius: 999, zIndex: 20, boxShadow: "0 6px 18px rgba(0,0,0,.35)" }}>
      {children}
    </div>
  );
};

const Dropdown: React.FC<{ from: number; to: number; pick: number; x: number; y: number; w: number; items: string[] }> = ({ from, to, pick, x, y, w, items }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const o = interpolate(f, [from, from + 5, to - 4, to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, opacity: o, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, boxShadow: "0 12px 34px rgba(0,0,0,.3)", zIndex: 30, overflow: "hidden" }}>
      {items.map((it, i) => (
        <div key={it} style={{ height: 34, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 18, fontWeight: 600, color: "#1f2937", background: f >= pick && i === 0 ? "#dbeafe" : "#fff" }}>
          {it}
        </div>
      ))}
    </div>
  );
};

const fmt = (n: number) => n.toLocaleString("de-DE");

export const SheetFlow: React.FC<SceneProps> = ({ duration, captions, segs }) => {
  const f = useCurrentFrame();
  const T = (i: number, fr: number) => cue(segs, i, fr);
  const typed = (text: string, start: number, cpf = 0.7) => text.slice(0, Math.max(0, Math.min(text.length, Math.floor((f - start) * cpf))));
  const glow = (at: number) => interpolate(f, [at, at + 4, at + 34], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const t0 = useIn(f);

  // ---- giá trị theo thời gian
  const tNew = T(0, 0.34);
  const soPhieu = typed("230/11", tNew + 4, 0.5);
  const ngay = typed("14/11/2026", tNew + 6, 0.9);
  const kho = f >= tNew + 12 ? "M2" : "";
  const nguoi = typed("Phòng Nhật Thuận", tNew + 14, 1.3);

  const tKhach = T(1, 0.38);
  const khach = typed("PHƯỚC HIỆP THÀNH", tKhach, 1.6);
  const tBien = T(1, 0.7);
  const bien = f >= tBien ? "50LD-200.94" : "";
  const tAuto = T(1, 0.78);
  const xe = f >= tAuto ? "Công ty" : "";
  const taixe = f >= tAuto ? "Tài xế mẫu A" : "";

  const tSp = T(2, 0.19);
  const tCa = T(2, 0.27);
  const tMay = T(2, 0.33);
  const kgStart = [T(2, 0.42), T(2, 0.55), T(2, 0.67), T(2, 0.79)];
  const kgVal = ["544", "540", "557", "552"];
  const rowKg = kgVal.map((v, i) => (i === 0 ? typed(v, kgStart[0], 0.5) : typed(v, kgStart[i], 0.5)));
  const filled = kgStart.map((s) => f >= s + 2);
  const inherit = (i: number) => (i === 0 ? f >= tSp : f >= kgStart[i]);
  const count = filled.filter(Boolean).length;
  const total = kgVal.reduce((a, v, i) => a + (filled[i] ? Number(v) : 0), 0);

  const tPrint = T(3, 0.2);
  const tSaved = T(3, 0.36);
  const saving = f >= tPrint && f < tSaved;
  const saved = f >= tSaved;
  const maStart = (i: number) => T(3, 0.4 + 0.07 * i);
  const maText = (i: number) => (f >= maStart(i) ? `M2-141126-C2-00${i + 1}` : "");
  const toast = interpolate(f, [T(3, 0.66), T(3, 0.66) + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ---- con trỏ chuột
  const kg = (r: number) => cellCenter(COLS.kg, r);
  const keys: [number, number, number][] = [
    [0, 980, 560],
    [T(0, 0.28), BTN_NEW.x + 60, BTN_NEW.y + 20],
    [T(1, 0.1), 350, ROW_Y(1) + 19],
    [T(1, 0.35), 230, ROW_Y(1) + 19 + 56],
    [T(1, 0.56), 215, ROW_Y(2) + 19],
    [T(1, 0.68), 200, ROW_Y(2) + 19 + 56],
    [T(2, 0.06), cellCenter(COLS.sp, 0).x, cellCenter(COLS.sp, 0).y],
    [T(2, 0.17), 100, TBL_Y + 20 + 56],
    [T(2, 0.26), cellCenter(COLS.ca, 0).x, cellCenter(COLS.ca, 0).y],
    [T(2, 0.32), cellCenter(COLS.may, 0).x, cellCenter(COLS.may, 0).y],
    [T(2, 0.4), kg(0).x, kg(0).y],
    [T(2, 0.53), kg(1).x, kg(1).y],
    [T(2, 0.65), kg(2).x, kg(2).y],
    [T(2, 0.77), kg(3).x, kg(3).y],
    [T(3, 0.12), BTN_PRINT.x + 95, BTN_PRINT.y + 20],
    [T(3, 0.5), 1180, 640],
  ];
  const ks = keys.reduce<[number, number, number][]>((a, k) => {
    const prev = a[a.length - 1];
    a.push(prev && k[0] <= prev[0] ? [prev[0] + 1, k[1], k[2]] : k);
    return a;
  }, []);
  const cx = interpolate(f, ks.map((k) => k[0]), ks.map((k) => k[1]), { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cy = interpolate(f, ks.map((k) => k[0]), ks.map((k) => k[2]), { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const clicks = [tNew, T(1, 0.15), T(1, 0.38), T(1, 0.58), T(1, 0.7), T(2, 0.1), T(2, 0.19), T(2, 0.28), T(2, 0.34), kgStart[0], kgStart[1], kgStart[2], kgStart[3], tPrint];
  const ripple = clicks.map((c) => interpolate(f, [c, c + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })).reduce((a, v) => (v > 0 && v < 1 ? v : a), -1);
  const pressed = (at: number) => (f >= at && f < at + 7 ? 0.95 : 1);

  const z = 1;
  const tx = 0;
  const ty = 0;

  // ---- huy hiệu bước
  let step = 0;
  segs.forEach((s, i) => {
    if (f >= s.start) step = i;
  });
  const stepNames = ["Phiếu mới", "Khách hàng + xe", "Sản phẩm + số kg", "Bấm IN PHIẾU"];
  const stepColors = [C.green, C.amber, C.pink, "#60a5fa"];

  const infoY = (r: number) => ROW_Y(r);
  const hasPhieu = f >= tNew + 4;

  return (
    <Backdrop>
      <SceneFade duration={duration}>
        <Header tab="Nhập PXK" title="Nhân viên: nhập phiếu rồi bấm IN" />
        <div style={{ position: "absolute", right: 260, top: 34, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 23, background: stepColors[step], color: C.ink, fontSize: 28, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{step + 1}</div>
          <div style={{ fontSize: 34, fontWeight: 800 }}>{stepNames[step]}</div>
        </div>
        <div style={{ position: "absolute", left: VIEW.x, top: VIEW.y, width: SW, height: SH, borderRadius: 14, overflow: "hidden", boxShadow: "0 30px 90px rgba(0,0,0,.55)", border: `1px solid ${C.line}`, background: "#fff", opacity: t0 }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: SW, height: SH, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${z})`, fontFamily: FONT }}>
            {/* thanh trên giống Google Sheets */}
            <div style={{ position: "absolute", left: 0, top: 0, width: SW, height: 74, background: "#f9fbfd", borderBottom: "1px solid #dadce0" }}>
              <div style={{ position: "absolute", left: 18, top: 12, width: 34, height: 34, borderRadius: 6, background: "#1e8e3e" }} />
              <div style={{ position: "absolute", left: 66, top: 10, fontSize: 24, fontWeight: 600, color: "#202124" }}>Test Demo AFC</div>
              <div style={{ position: "absolute", left: 66, top: 44, fontSize: 16, color: "#444", display: "flex", gap: 20 }}>
                {["File", "Edit", "View", "Insert", "Format", "Data", "Tools", "Extensions", "Help", "AFC Form"].map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
            {/* tiêu đề + nút */}
            <div style={{ position: "absolute", left: 20, top: 96, fontSize: 28, fontWeight: 800, color: "#1f2937" }}>PHIẾU XUẤT KHO — NHẬP LIỆU</div>
            <div style={{ position: "absolute", left: BTN_PRINT.x, top: BTN_PRINT.y, width: BTN_PRINT.w, height: BTN_PRINT.h, borderRadius: 18, background: "#1d4ed8", color: "#fff", fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pressed(tPrint)})`, boxShadow: "0 3px 10px rgba(29,78,216,.4)" }}>
              IN PHIẾU (lưu + in)
            </div>
            <div style={{ position: "absolute", left: BTN_NEW.x, top: BTN_NEW.y, width: BTN_NEW.w, height: BTN_NEW.h, borderRadius: 18, background: "#fff", border: "1.5px solid #9aa3b2", color: "#1f2937", fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pressed(tNew)})` }}>
              + PHIẾU MỚI
            </div>
            <div style={{ position: "absolute", left: BTN_LOAD.x, top: BTN_LOAD.y, width: BTN_LOAD.w, height: BTN_LOAD.h, borderRadius: 18, background: "#fff", border: "1.5px solid #9aa3b2", color: "#1f2937", fontSize: 17, fontWeight: 800, whiteSpace: "nowrap", display: "flex", alignItems: "center", justifyContent: "center" }}>
              MỞ PHIẾU THEO SỐ
            </div>
            <div style={{ position: "absolute", left: 20, top: 150, fontSize: 16, color: "#94a3b8", fontStyle: "italic" }}>Ô nền vàng là ô nhập (có dropdown). Bấm IN PHIẾU để lưu vào PhieuXuat/ChiTiet và mở trang in A4.</div>

            {/* khối thông tin */}
            <Label x={20} y={infoY(0)} w={115}>Số phiếu</Label>
            <Cell x={135} y={infoY(0)} w={150} bg={YEL} bold>{soPhieu}</Cell>
            <Label x={285} y={infoY(0)} w={115}>Ngày xuất *</Label>
            <Cell x={400} y={infoY(0)} w={150} bg={YEL} align="right">{ngay}</Cell>
            <Label x={550} y={infoY(0)} w={115}>Xuất tại kho</Label>
            <Cell x={665} y={infoY(0)} w={150} bg={YEL}>{kho}</Cell>
            <Label x={815} y={infoY(0)} w={115}>Người lập</Label>
            <Cell x={930} y={infoY(0)} w={190} bg={YEL}>{nguoi}</Cell>

            <Label x={20} y={infoY(1)} w={190}>Đơn vị nhận hàng *</Label>
            <Cell x={210} y={infoY(1)} w={335} bg={YEL} bold>{khach}</Cell>
            <Label x={550} y={infoY(1)} w={115}>Địa chỉ giao</Label>
            <Cell x={665} y={infoY(1)} w={455} bg={YEL} />

            <Label x={20} y={infoY(2)} w={115}>Biển số xe</Label>
            <Cell x={135} y={infoY(2)} w={150} bg={YEL}>{bien}</Cell>
            <Label x={285} y={infoY(2)} w={115}>Xe</Label>
            <Cell x={400} y={infoY(2)} w={150} bg={YEL} glow={glow(tAuto)}>{xe}</Cell>
            <Label x={550} y={infoY(2)} w={115}>Tài xế</Label>
            <Cell x={665} y={infoY(2)} w={150} bg={YEL} glow={glow(tAuto)}>{taixe}</Cell>
            <Label x={815} y={infoY(2)} w={115}>SĐT tài xế</Label>
            <Cell x={930} y={infoY(2)} w={190} bg={YEL} />

            <Label x={20} y={infoY(3)} w={115}>Thủ kho</Label>
            <Cell x={135} y={infoY(3)} w={150} bg={YEL} />
            <Label x={285} y={infoY(3)} w={115}>Phụ cấp (đ)</Label>
            <Cell x={400} y={infoY(3)} w={150} bg={YEL} />
            <Label x={550} y={infoY(3)} w={115}>Ghi chú</Label>
            <Cell x={665} y={infoY(3)} w={455} bg={YEL} />

            {/* tổng tự tính */}
            {[
              ["Số cuộn", String(count)],
              ["Tổng kg", count ? fmt(total) : "0"],
              ["Trừ bì (kg)", "0"],
              ["Thực xuất", count ? fmt(total) : "0"],
            ].map(([l, v], r) => (
              <React.Fragment key={l}>
                <Cell x={1135} y={infoY(r)} w={140} bg="#f8f9fb" align="right" color="#475569">{l}</Cell>
                <Cell x={1275} y={infoY(r)} w={110} bg={PUR} bold align="right" glow={r === 1 || r === 3 ? glow(kgStart[Math.max(0, Math.min(3, count - 1))] + 3) * (count ? 1 : 0) : 0}>{v}</Cell>
              </React.Fragment>
            ))}

            {/* trạng thái */}
            <Label x={20} y={340} w={115}>Trạng thái</Label>
            <Cell x={135} y={340} w={985} h={34} bg="#fff" bold color={saved ? "#15803d" : saving ? "#b45309" : "#64748b"}>
              {saved ? "Đã lưu 230/11 · 4 cuộn/pallet · thực xuất 2.193 kg" : saving ? "Đang lưu…" : hasPhieu ? "Phiếu mới — chưa lưu" : "—"}
            </Cell>

            {/* bảng hàng */}
            {[
              ["Mã SP *", COLS.sp],
              ["Trọng lượng (kg) *", COLS.kg],
              ["Số bánh", COLS.banh],
              ["Ca SX *", COLS.ca],
              ["Máy", COLS.may],
              ["Ngày SX", COLS.ngay],
              ["Mã cuộn / pallet (tự sinh)", COLS.ma],
            ].map(([l, c]) => (
              <Cell key={l as string} x={(c as readonly [number, number])[0]} y={384} w={(c as readonly [number, number])[1]} h={52} bg="#fce4e8" bold align="center" color="#7f1d1d">
                {l as string}
              </Cell>
            ))}
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const y = TBL_Y + TBL_H * i;
              const inh = i < 4 && inherit(i);
              const g = i < 4 ? glow(i === 0 ? tSp : kgStart[i]) : 0;
              return (
                <React.Fragment key={i}>
                  <Cell x={COLS.sp[0]} y={y} w={COLS.sp[1]} glow={i > 0 ? g : 0}>{inh ? "K76/450" : ""}</Cell>
                  <Cell x={COLS.kg[0]} y={y} w={COLS.kg[1]} align="right" bold>{i < 4 ? rowKg[i] : ""}</Cell>
                  <Cell x={COLS.banh[0]} y={y} w={COLS.banh[1]} />
                  <Cell x={COLS.ca[0]} y={y} w={COLS.ca[1]} glow={i > 0 ? g : 0}>{inh && (i > 0 || f >= tCa) ? "C2" : ""}</Cell>
                  <Cell x={COLS.may[0]} y={y} w={COLS.may[1]} glow={i > 0 ? g : 0}>{inh && (i > 0 || f >= tMay) ? "M2" : ""}</Cell>
                  <Cell x={COLS.ngay[0]} y={y} w={COLS.ngay[1]} align="right" glow={i > 0 ? g : 0}>{inh && (i > 0 || f >= tMay) ? "14/11/2026" : ""}</Cell>
                  <Cell x={COLS.ma[0]} y={y} w={COLS.ma[1]} mono glow={i < 4 && maText(i) ? glow(maStart(i)) : 0} color="#166534" bold>{i < 4 ? maText(i) : ""}</Cell>
                </React.Fragment>
              );
            })}

            {/* nhãn "tự điền" */}
            <Tag at={tNew + 14} x={700} y={infoY(0) - 32}>số phiếu, ngày, kho, người lập tự điền</Tag>
            <Tag at={tAuto} x={420} y={infoY(2) - 32}>xe + tài xế tự điền</Tag>
            <Tag at={kgStart[1] + 4} x={20} y={TBL_Y + TBL_H * 1 - 30}>dòng sau tự lấy theo dòng trên</Tag>
            <Tag at={maStart(0) + 4} x={1110} y={TBL_Y + 6}>mã cuộn tự sinh</Tag>
            <Tag at={kgStart[3] + 6} x={1135} y={infoY(0) - 32} color={C.pink}>tổng tự cộng</Tag>

            {/* dropdown */}
            <Dropdown from={T(1, 0.15)} to={T(1, 0.42)} pick={T(1, 0.3)} x={210} y={infoY(1) + 38} w={335} items={["PHƯỚC HIỆP THÀNH", "CÔNG TY GIẤY ĐẠI PHÁT", "TNHH BAO BÌ AN KHANG"]} />
            <Dropdown from={T(1, 0.58)} to={T(1, 0.73)} pick={T(1, 0.66)} x={135} y={infoY(2) + 38} w={200} items={["50LD-200.94", "51C-123.45"]} />
            <Dropdown from={T(2, 0.1)} to={T(2, 0.22)} pick={T(2, 0.16)} x={20} y={TBL_Y + TBL_H} w={200} items={["K76/450", "K78/450", "K80/450"]} />

            {/* thông báo mở trang in */}
            <div style={{ position: "absolute", left: 480, top: 640, opacity: toast, transform: `translateY(${(1 - toast) * 14}px)`, background: "#1d4ed8", color: "#fff", borderRadius: 14, padding: "14px 26px", fontSize: 24, fontWeight: 800, boxShadow: "0 14px 40px rgba(0,0,0,.4)" }}>
              Trình duyệt mở trang in phiếu A4…
            </div>

            {/* thanh tab dưới */}
            <div style={{ position: "absolute", left: 0, top: SH - 40, width: SW, height: 40, background: "#f1f3f4", borderTop: "1px solid #dadce0", display: "flex", alignItems: "center", gap: 6, padding: "0 14px", fontSize: 16, color: "#444" }}>
              {["Nhập PXK", "PhieuXuat", "ChiTiet", "BaoCao", "DM_SanPham", "DM_KhachHang", "DM_TaiXe", "CauHinh"].map((n, i) => (
                <span key={n} style={{ padding: "6px 14px", borderRadius: 6, background: i === 0 ? "#fff" : "transparent", color: i === 0 ? "#1a56db" : "#444", fontWeight: i === 0 ? 700 : 500, boxShadow: i === 0 ? "0 1px 3px rgba(0,0,0,.2)" : undefined }}>
                  {n}
                </span>
              ))}
            </div>

            {/* con trỏ chuột */}
            {ripple >= 0 ? <div style={{ position: "absolute", left: cx - 22 * ripple - 6, top: cy - 22 * ripple - 6, width: 44 * ripple + 12, height: 44 * ripple + 12, borderRadius: "50%", border: "3px solid rgba(37,99,235,.7)", opacity: 1 - ripple, zIndex: 40 }} /> : null}
            <svg style={{ position: "absolute", left: cx, top: cy, zIndex: 41, filter: "drop-shadow(0 3px 5px rgba(0,0,0,.5))" }} width="30" height="38" viewBox="0 0 24 30">
              <path d="M2 2 L2 24 L8 18.5 L12.5 28 L16 26.5 L11.6 17.4 L19.5 17 Z" fill="#fff" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <Caption duration={duration} captions={captions} />
      </SceneFade>
    </Backdrop>
  );
};

const useIn = (f: number) => interpolate(f, [0, 16], [0, 1], { extrapolateRight: "clamp" });

// ====================================================== KẾT QUẢ: TRANG IN PHIẾU A4
const PW = 665;
const PH = 941; // chiều cao ảnh khi rộng 665
const Box: React.FC<{ at: number; n: number; color: string; b: { x: number; y: number; w: number; h: number } }> = ({ at, n, color, b }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: f - at, fps, config: { damping: 15, stiffness: 150 }, durationInFrames: 22 });
  return (
    <div style={{ position: "absolute", left: b.x - 6, top: b.y - 6, width: b.w + 12, height: b.h + 12, opacity: t, transform: `scale(${0.96 + 0.04 * t})`, border: `4px solid ${color}`, borderRadius: 10, boxShadow: `0 0 0 2000px rgba(8,12,28,${0.0}), 0 0 24px ${color}88` }}>
      <div style={{ position: "absolute", left: -18, top: -18, width: 38, height: 38, borderRadius: 19, background: color, color: C.ink, fontWeight: 800, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</div>
    </div>
  );
};

export const PrintResult: React.FC<SceneProps> = ({ duration, captions, segs }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, 24], [0, 1], { extrapolateRight: "clamp" });
  // ảnh in gốc là 1414×2000 khi hiển thị; hộp toạ độ quy theo đó
  const box = (x: number, y: number, w: number, h: number) => ({ x: (x / 1414) * PW, y: (y / 2000) * PH, w: (w / 1414) * PW, h: (h / 2000) * PH });
  return (
    <Backdrop>
      <SceneFade duration={duration}>
        <Header tab="Kết quả" title="Bấm IN PHIẾU xong, trang in hiện ra" kind="web" />
        <div style={{ position: "absolute", left: 300, top: 104, width: PW, height: 800, opacity: t, transform: `translateY(${(1 - t) * 30}px)` }}>
          <div style={{ width: PW, height: 800, background: "#fff", borderRadius: 6, boxShadow: "0 24px 70px rgba(0,0,0,.6)", overflow: "hidden", position: "relative" }}>
            <Img src={staticFile(shot("print-phieu-cuon.png"))} style={{ width: PW, height: PH, display: "block" }} />
          </div>
          <Box at={cue(segs, 0, 0.12)} n={1} color={C.amber} b={box(405, 362, 590, 115)} />
          <Box at={cue(segs, 0, 0.3)} n={2} color={C.green} b={box(1000, 225, 335, 80)} />
          <Box at={cue(segs, 0, 0.6)} n={3} color={C.pink} b={box(83, 1590, 1250, 100)} />
          <Box at={cue(segs, 1, 0.1)} n={4} color="#60a5fa" b={box(83, 590, 1250, 250)} />
          <Box at={cue(segs, 2, 0.1)} n={5} color={C.amber} b={box(1190, 75, 135, 130)} />
        </div>
        <div style={{ position: "absolute", left: 1090, top: 150, width: 640, display: "flex", flexDirection: "column", gap: 34 }}>
          <Bullet at={cue(segs, 0, 0.12)} n={1} color={C.amber}>
            <b>Khách hàng</b> và kho xuất đúng như đã chọn
          </Bullet>
          <Bullet at={cue(segs, 0, 0.3)} n={2} color={C.green}>
            <b>Số phiếu</b> cấp tự động: 230/11
          </Bullet>
          <Bullet at={cue(segs, 0, 0.6)} n={3} color={C.pink}>
            <b>Biển số xe</b> và tài xế ở cuối phiếu
          </Bullet>
          <Bullet at={cue(segs, 1, 0.1)} n={4} color="#60a5fa">
            <b>4 cuộn</b>, mỗi cuộn một mã riêng, tổng <b>2.193 kg</b>
          </Bullet>
          <Bullet at={cue(segs, 2, 0.1)} n={5} color={C.amber}>
            <b>Mã QR</b> mở tem KCS + COA. In khổ A4, lề Không có
          </Bullet>
        </div>
        <Caption duration={duration} captions={captions} />
      </SceneFade>
    </Backdrop>
  );
};
