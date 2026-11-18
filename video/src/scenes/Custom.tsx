import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, Caption, Chip, Header, SceneFade } from "../components/Chrome";
import { Seg, cue } from "../retime";
import { C, MONO, shot } from "../theme";
import { CaptionKey } from "../types";

/** Props chung của cảnh tự dựng: độ dài, subtext và các đoạn lời (đã dồn theo giọng đọc). */
export type SceneProps = { duration: number; captions: CaptionKey[]; segs: Seg[] };

/** Hiện dần tại frame `at` (tính từ đầu cảnh). */
export const Appear: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: f - at, fps, config: { damping: 18, stiffness: 140 }, durationInFrames: 26 });
  return <div style={{ opacity: t, transform: `translateY(${(1 - t) * 26}px)`, ...style }}>{children}</div>;
};

// ====================================================== MỞ ĐẦU
export const Intro: React.FC<SceneProps> = ({ duration }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: f, fps, config: { damping: 16 }, durationInFrames: 30 });
  const t2 = spring({ frame: f - 14, fps, config: { damping: 16 }, durationInFrames: 30 });
  const t3 = spring({ frame: f - 100, fps, config: { damping: 16 }, durationInFrames: 30 });
  return (
    <Backdrop>
      <SceneFade duration={duration}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
          <div style={{ opacity: t, transform: `scale(${0.9 + 0.1 * t})`, background: "#fff", borderRadius: 18, padding: "14px 26px" }}>
            <Img src={staticFile("shots/afc-logo.png")} style={{ height: 120, display: "block" }} />
          </div>
          <div style={{ opacity: t2, transform: `translateY(${(1 - t2) * 24}px)`, fontSize: 92, fontWeight: 800, letterSpacing: -2, textAlign: "center", lineHeight: 1.05 }}>
            Phiếu xuất kho Giấy A.F.C
          </div>
          <div style={{ opacity: t2, fontSize: 42, color: "#93c5fd", fontWeight: 600 }}>Hướng dẫn thao tác trên Google Sheet và web app</div>
          <div style={{ opacity: t3, display: "flex", gap: 18, marginTop: 18 }}>
            {["Nhập 1 lần", "In đúng mẫu", "Dữ liệu sẵn để làm báo cáo"].map((s) => (
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

// ====================================================== TỔNG QUAN
type Item = { name: string; desc: string };
const Card: React.FC<{
  at: number;
  color: string;
  tag: string;
  title: string;
  sub: string;
  items: Item[];
  chips?: string[];
}> = ({ at, color, tag, title, sub, items, chips }) => (
  <Appear at={at} style={{ width: 540 }}>
    <div style={{ background: C.panel, border: `2px solid ${color}66`, borderRadius: 24, overflow: "hidden", height: 560, boxShadow: "0 24px 70px rgba(0,0,0,.45)" }}>
      <div style={{ background: `${color}`, color: C.ink, padding: "18px 28px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, opacity: 0.75, letterSpacing: 1 }}>{tag}</div>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -0.5 }}>{title}</div>
      </div>
      <div style={{ padding: "18px 28px 0", fontSize: 25, color: C.mute, fontWeight: 600 }}>{sub}</div>
      <div style={{ padding: "14px 28px", display: "flex", flexDirection: "column", gap: 22 }}>
        {items.map((it) => (
          <div key={it.name}>
            <Chip color={color} size={27}>
              {it.name}
            </Chip>
            <div style={{ fontSize: 27, marginTop: 8, lineHeight: 1.3, color: C.text }}>{it.desc}</div>
          </div>
        ))}
        {chips ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {chips.map((c) => (
              <Chip key={c} color={color} size={22}>
                {c}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  </Appear>
);

export const Overview: React.FC<SceneProps> = ({ duration, captions, segs }) => {
  const f = useCurrentFrame();
  const a1 = cue(segs, 1, 0);
  const arrow = interpolate(f, [a1, a1 + 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Backdrop>
      <SceneFade duration={duration}>
        <Header title="Mỗi cửa sổ (tab) trong Google Sheet dùng để làm gì?" />
        <div style={{ position: "absolute", left: 90, top: 140, display: "flex", gap: 60 }}>
          <Card
            at={cue(segs, 0, 0.3)}
            color="#60a5fa"
            tag="① NHẬP LIỆU"
            title="Nơi lập phiếu"
            sub="Nhân viên làm việc ở đây"
            items={[
              { name: "Nhập PXK", desc: "Lập phiếu ngay trên sheet: ô vàng có dropdown, bấm IN PHIẾU" },
              { name: "Web app", desc: "Lập phiếu trên điện thoại hoặc máy tính" },
            ]}
          />
          <Card
            at={cue(segs, 0, 0.5)}
            color={C.green}
            tag="② DỮ LIỆU"
            title="Hệ thống tự ghi"
            sub="Không cần gõ tay"
            items={[
              { name: "PhieuXuat", desc: "1 dòng = 1 phiếu = 1 chuyến xe" },
              { name: "ChiTiet", desc: "1 dòng = 1 cuộn / pallet + chỉ tiêu KCS" },
              { name: "BaoCao", desc: "Sản lượng và lương tài xế tự tính" },
            ]}
          />
          <Card
            at={cue(segs, 0, 0.72)}
            color={C.amber}
            tag="③ DANH MỤC"
            title="Gõ trực tiếp"
            sub="Thành dropdown cho ① và web app"
            items={[{ name: "CauHinh", desc: "Tên công ty, mã biểu mẫu, số dòng phiếu" }]}
            chips={["DM_SanPham", "DM_KhachHang", "DM_TaiXe", "DM_Xe", "DM_Kho", "DM_Ca", "DM_NhanVien"]}
          />
        </div>
        {/* mũi tên luồng dữ liệu */}
        <div style={{ position: "absolute", left: 90, top: 730, width: 1740, opacity: arrow, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, fontSize: 30, fontWeight: 700 }}>
          <Chip color="#60a5fa" size={28}>① Nhập</Chip>
          <span style={{ color: C.mute }}>→ ghi vào →</span>
          <Chip color={C.green} size={28}>② Dữ liệu</Chip>
          <span style={{ color: C.mute }}>← lấy dropdown từ ←</span>
          <Chip color={C.amber} size={28}>③ Danh mục</Chip>
        </div>
        <div style={{ position: "absolute", left: 90, top: 808, width: 1740, textAlign: "center", opacity: arrow, fontSize: 25, color: C.mute }}>
          Sheet <span style={{ fontFamily: MONO, color: C.text }}>pxk</span> là mẫu BM-04 gốc để đối chiếu — hệ thống không ghi vào sheet này.
        </div>
        <Caption duration={duration} captions={captions} />
      </SceneFade>
    </Backdrop>
  );
};

// ====================================================== LƯỚI DANH MỤC
const DM: { name: string; desc: string[] }[] = [
  { name: "DM_SanPham", desc: ["Mã SP, loại giấy", "Khổ, định lượng", "CUỘN / PALLET, trừ bì"] },
  { name: "DM_KhachHang", desc: ["Đơn vị nhận hàng", "Địa chỉ giao", "Người liên hệ, SĐT"] },
  { name: "DM_TaiXe", desc: ["Tài xế, SĐT", "Công ty / thuê ngoài", "Đơn giá chuyến, đơn giá tấn"] },
  { name: "DM_Xe", desc: ["Biển số xe", "Công ty / thuê ngoài", "Tài xế mặc định"] },
  { name: "DM_Kho", desc: ["Kho / máy xuất hàng", "M1, M2, M3"] },
  { name: "DM_Ca", desc: ["Ca sản xuất", "C1, C2, C3"] },
  { name: "DM_NhanVien", desc: ["Người lập phiếu", "Thủ kho, KCS"] },
  { name: "CauHinh", desc: ["Tên công ty, mã biểu mẫu", "Số dòng phiếu, đánh số phiếu", "Link web app"] },
];

export const DmGrid: React.FC<SceneProps> = ({ duration, captions, segs }) => (
  <Backdrop>
    <SceneFade duration={duration}>
      <Header title="Các sheet danh mục — gõ một lần, dùng mãi" />
      <div style={{ position: "absolute", left: 140, top: 130, width: 1640, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 26 }}>
        {DM.map((d, i) => (
          <Appear key={d.name} at={cue(segs, 0, 0.04 + i * 0.045)}>
            <div style={{ background: C.panel, border: `2px solid ${d.name === "CauHinh" ? C.pink : C.amber}55`, borderRadius: 20, padding: "22px 24px", height: 290 }}>
              <Chip color={d.name === "CauHinh" ? C.pink : C.amber} size={30}>
                {d.name}
              </Chip>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                {d.desc.map((l) => (
                  <div key={l} style={{ fontSize: 28, lineHeight: 1.25, display: "flex", gap: 10 }}>
                    <span style={{ color: C.amber }}>•</span>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          </Appear>
        ))}
      </div>
      <Appear at={cue(segs, 0, 0.62)} style={{ position: "absolute", left: 140, top: 870, width: 1640, textAlign: "center", fontSize: 28, color: C.mute }}>
        Cột <b style={{ color: C.text }}>Ngừng dùng</b> (ô tick) ở mỗi danh mục: tick để ẩn một mục khỏi dropdown mà vẫn giữ lịch sử.
      </Appear>
      <Caption duration={duration} captions={captions} />
    </SceneFade>
  </Backdrop>
);

// ====================================================== MẪU IN
const Paper: React.FC<{ src: string; w: number; h: number; style?: React.CSSProperties }> = ({ src, w, h, style }) => (
  <div style={{ width: w, height: h, background: "#fff", borderRadius: 6, boxShadow: "0 24px 70px rgba(0,0,0,.6)", overflow: "hidden", ...style }}>
    <Img src={staticFile(shot(src))} style={{ width: "100%", height: "100%", display: "block" }} />
  </div>
);

export const Bullet: React.FC<{ at: number; n: number; children: React.ReactNode; color?: string }> = ({ at, n, children, color = C.blue }) => (
  <Appear at={at}>
    <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
      <div style={{ flex: "0 0 52px", height: 52, borderRadius: 26, background: color, color: C.ink, fontWeight: 800, fontSize: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</div>
      <div style={{ fontSize: 33, lineHeight: 1.32, fontWeight: 500 }}>{children}</div>
    </div>
  </Appear>
);

export const PrintA4: React.FC<SceneProps> = ({ duration, captions, segs }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, 24], [0, 1], { extrapolateRight: "clamp" });
  return (
    <Backdrop>
      <SceneFade duration={duration}>
        <Header tab="Trang in" title="Phiếu xuất kho A4 — đúng mẫu BM-04/KH-SX" kind="web" />
        <div style={{ position: "absolute", left: 130, top: 112, width: 1000, height: 840 }}>
          <Paper src="print-phieu-pallet.png" w={565} h={800} style={{ position: "absolute", left: 250, top: 20, transform: "rotate(5deg)", opacity: 0.95 * t }} />
          <Paper src="print-phieu-cuon.png" w={565} h={800} style={{ position: "absolute", left: 0, top: 0, opacity: t, transform: `translateY(${(1 - t) * 30}px)` }} />
        </div>
        <div style={{ position: "absolute", left: 1010, top: 150, width: 800, display: "flex", flexDirection: "column", gap: 34 }}>
          <Bullet at={cue(segs, 0, 0.05)} n={1}>
            Phiếu in ra <b>đúng mẫu BM-04/KH-SX</b> của A.F.C: tiêu đề, khách hàng, kho, bảng cuộn, xe, chữ ký.
          </Bullet>
          <Bullet at={cue(segs, 0, 0.5)} n={2} color={C.pink}>
            Phiếu <b>cuộn</b> ghi mã cuộn từng dòng. Phiếu <b>pallet</b> (phía sau) có số bánh, trừ bì 12 kg/pallet và thực xuất.
          </Bullet>
          <Bullet at={cue(segs, 1, 0.05)} n={3} color={C.green}>
            <b>Mã QR góc phải</b>: quét bằng điện thoại để mở tem KCS + COA của các cuộn trong phiếu.
          </Bullet>
          <Bullet at={cue(segs, 1, 0.55)} n={4} color={C.amber}>
            Khi in: khổ <b>A4</b>, lề <b>Không có</b>, tắt <b>Đầu trang và chân trang</b>.
          </Bullet>
        </div>
        <Caption duration={duration} captions={captions} />
      </SceneFade>
    </Backdrop>
  );
};

const Doc: React.FC<{ at: number; src: string; w: number; h: number; tag: string; title: string; note: string; color: string }> = ({ at, src, w, h, tag, title, note, color }) => (
  <Appear at={at} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 560 }}>
    <div style={{ height: 500, display: "flex", alignItems: "flex-end" }}>
      <Paper src={src} w={w} h={h} />
    </div>
    <div style={{ marginTop: 26, textAlign: "center" }}>
      <Chip color={color} size={26}>
        {tag}
      </Chip>
      <div style={{ fontSize: 36, fontWeight: 800, marginTop: 12 }}>{title}</div>
      <div style={{ fontSize: 27, color: C.mute, marginTop: 8, lineHeight: 1.3, maxWidth: 520 }}>{note}</div>
    </div>
  </Appear>
);

export const PrintSmall: React.FC<SceneProps> = ({ duration, captions, segs }) => (
  <Backdrop>
    <SceneFade duration={duration}>
      <Header tab="Trang in" title="Tem KCS, phiếu COA và biên bản giao nhận" kind="web" />
      <div style={{ position: "absolute", left: 120, top: 130, width: 1680, display: "flex", justifyContent: "space-between" }}>
        <Doc at={cue(segs, 0, 0.18)} src="print-tem-kcs.png" w={700} h={493} tag="BM-18 · A5 ngang" title="Tem KCS" note="Dán lên từng cuộn; QR là mã cuộn" color={C.green} />
        <Doc at={cue(segs, 0, 0.5)} src="print-coa.png" w={353} h={500} tag="A5 dọc" title="Phiếu COA" note="Phiếu chất lượng kèm cuộn, chỉ tiêu KCS để trống nếu chưa nhập" color={C.pink} />
        <Doc at={cue(segs, 0, 0.75)} src="print-bien-ban.png" w={353} h={500} tag="A4" title="Biên bản giao nhận" note="In kèm phiếu xuất kho, tài xế và khách hàng ký nhận" color={C.amber} />
      </div>
      <Caption duration={duration} captions={captions} />
    </SceneFade>
  </Backdrop>
);

// ====================================================== ĐIỆN THOẠI
export const Phone: React.FC<SceneProps> = ({ duration, captions, segs }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, 24], [0, 1], { extrapolateRight: "clamp" });
  return (
    <Backdrop>
      <SceneFade duration={duration}>
        <Header tab="Web app · Điện thoại" title="Dùng trên điện thoại" kind="web" />
        <div style={{ position: "absolute", left: 300, top: 108, opacity: t, transform: `translateY(${(1 - t) * 34}px)` }}>
          <div style={{ width: 400, height: 836, borderRadius: 52, padding: 11, background: "#0a0f1f", border: "3px solid #3a4a78", boxShadow: "0 30px 90px rgba(0,0,0,.6)" }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 42, overflow: "hidden", background: "#f3f4f6" }}>
              <Img src={staticFile(shot("web-dien-thoai.png"))} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 800, top: 190, width: 900, display: "flex", flexDirection: "column", gap: 40 }}>
          <Bullet at={cue(segs, 0, 0.05)} n={1}>
            Mở <b>link web app</b> trên điện thoại, chọn “Thêm vào màn hình chính” để mở nhanh như một ứng dụng.
          </Bullet>
          <Bullet at={cue(segs, 0, 0.35)} n={2} color={C.green}>
            Ba tab <b>Lập phiếu · Danh sách · Báo cáo</b>; thanh dưới cùng luôn hiện tổng kg và nút <b>Lưu</b>.
          </Bullet>
          <Bullet at={cue(segs, 0, 0.72)} n={3} color={C.pink}>
            Nhập số kg một lần, <b>dán cả dãy số</b> (vd 544 540 557 552) để thêm nhiều cuộn.
          </Bullet>
          <Bullet at={cue(segs, 1, 0.1)} n={4} color={C.amber}>
            Nút bấm trên Google Sheet chỉ chạy trên máy tính. <b>Trên điện thoại dùng web app.</b>
          </Bullet>
        </div>
        <Caption duration={duration} captions={captions} />
      </SceneFade>
    </Backdrop>
  );
};

// ====================================================== KẾT
export const Outro: React.FC<SceneProps> = ({ duration, segs }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: f, fps, config: { damping: 16 }, durationInFrames: 30 });
  const items: [string, string, string, number][] = [
    ["1", "Lập phiếu ở Nhập PXK, bấm IN PHIẾU", "#60a5fa", 0.2],
    ["2", "Danh mục gõ trực tiếp thành dropdown", C.amber, 0.38],
    ["3", "Báo cáo tự tính ở BaoCao", C.green, 0.52],
  ];
  return (
    <Backdrop>
      <SceneFade duration={duration}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34 }}>
          <div style={{ opacity: t, fontSize: 70, fontWeight: 800, letterSpacing: -1.5 }}>Nhớ ba điều</div>
          <div style={{ display: "flex", gap: 26 }}>
            {items.map(([n, text, col, frac]) => (
              <Appear key={n} at={cue(segs, 0, frac)} style={{ width: 500 }}>
                <div style={{ background: C.panel, border: `2px solid ${col}66`, borderRadius: 22, padding: "30px 30px", height: 230 }}>
                  <div style={{ width: 60, height: 60, borderRadius: 30, background: col, color: C.ink, fontSize: 36, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</div>
                  <div style={{ fontSize: 35, fontWeight: 700, marginTop: 18, lineHeight: 1.25 }}>{text}</div>
                </div>
              </Appear>
            ))}
          </div>
          <Appear at={cue(segs, 0, 0.74)}>
            <div style={{ fontSize: 30, color: C.mute }}>Cần hỗ trợ? Liên hệ SOLVIQ · Nguyễn Sĩ Quỳnh</div>
          </Appear>
        </div>
      </SceneFade>
    </Backdrop>
  );
};
