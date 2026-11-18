import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, Caption, Chip, Header, SceneFade } from "../components/Chrome";
import { C, FONT, MONO, shot } from "../theme";

/** Hiện dần theo thứ tự: trả về 0..1 cho phần tử thứ i. */
function useAppear(i: number, start = 0, gap = 14) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - start - i * gap, fps, config: { damping: 18, stiffness: 140 }, durationInFrames: 26 });
}

const Appear: React.FC<{ i: number; start?: number; gap?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  i,
  start,
  gap,
  children,
  style,
}) => {
  const t = useAppear(i, start, gap);
  return <div style={{ opacity: t, transform: `translateY(${(1 - t) * 26}px)`, ...style }}>{children}</div>;
};

// ====================================================== MỞ ĐẦU
export const Intro: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: f, fps, config: { damping: 16 }, durationInFrames: 30 });
  const t2 = spring({ frame: f - 14, fps, config: { damping: 16 }, durationInFrames: 30 });
  const t3 = spring({ frame: f - 28, fps, config: { damping: 16 }, durationInFrames: 30 });
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
  i: number;
  color: string;
  tag: string;
  title: string;
  sub: string;
  items: Item[];
  chips?: string[];
}> = ({ i, color, tag, title, sub, items, chips }) => (
  <Appear i={i} start={20} gap={55} style={{ width: 540 }}>
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

export const Overview: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const arrow = interpolate(f, [90, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Backdrop>
      <SceneFade duration={duration}>
        <Header title="Mỗi cửa sổ (tab) trong Google Sheet dùng để làm gì?" />
        <div style={{ position: "absolute", left: 90, top: 140, display: "flex", gap: 60 }}>
          <Card
            i={0}
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
            i={1}
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
            i={2}
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
        <Caption
          duration={duration}
          captions={[
            { at: 0, text: "Google Sheet có nhiều tab. Chỉ cần nhớ ba nhóm: Nhập liệu → Dữ liệu → Danh mục." },
            { at: 150, text: "Nhân viên chỉ làm việc ở nhóm ①. Nhóm ③ do quản lý cập nhật khi có khách, xe hoặc sản phẩm mới." },
          ]}
        />
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

export const DmGrid: React.FC<{ duration: number }> = ({ duration }) => (
  <Backdrop>
    <SceneFade duration={duration}>
      <Header title="Các sheet danh mục — gõ một lần, dùng mãi" />
      <div style={{ position: "absolute", left: 140, top: 130, width: 1640, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 26 }}>
        {DM.map((d, i) => (
          <Appear key={d.name} i={i} start={8} gap={9}>
            <div style={{ background: C.panel, border: `2px solid ${(d.name === "CauHinh" ? C.pink : C.amber)}55`, borderRadius: 20, padding: "22px 24px", height: 290 }}>
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
      <div style={{ position: "absolute", left: 140, top: 870, width: 1640, textAlign: "center", fontSize: 28, color: C.mute }}>
        Cột <b style={{ color: C.text }}>Ngừng dùng</b> (ô tick) ở mỗi danh mục: tick để ẩn một mục khỏi dropdown mà vẫn giữ lịch sử.
      </div>
      <Caption
        duration={duration}
        captions={[
          { at: 0, text: "Bảy sheet DM_ và CauHinh. Gõ trực tiếp vào các dòng trống — lần sau mở form hoặc Nhập PXK sẽ thấy ngay trong dropdown." },
        ]}
      />
    </SceneFade>
  </Backdrop>
);

// ====================================================== MẪU IN
const Paper: React.FC<{ src: string; w: number; h: number; style?: React.CSSProperties }> = ({ src, w, h, style }) => (
  <div style={{ width: w, height: h, background: "#fff", borderRadius: 6, boxShadow: "0 24px 70px rgba(0,0,0,.6)", overflow: "hidden", ...style }}>
    <Img src={staticFile(shot(src))} style={{ width: "100%", height: "100%", display: "block" }} />
  </div>
);

const Bullet: React.FC<{ i: number; n: number; children: React.ReactNode; color?: string }> = ({ i, n, children, color = C.blue }) => (
  <Appear i={i} start={30} gap={42}>
    <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
      <div style={{ flex: "0 0 52px", height: 52, borderRadius: 26, background: color, color: C.ink, fontWeight: 800, fontSize: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</div>
      <div style={{ fontSize: 33, lineHeight: 1.32, fontWeight: 500 }}>{children}</div>
    </div>
  </Appear>
);

export const PrintA4: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, 24], [0, 1], { extrapolateRight: "clamp" });
  const H1 = 800;
  return (
    <Backdrop>
      <SceneFade duration={duration}>
        <Header tab="Trang in" title="Phiếu xuất kho A4 — đúng mẫu BM-04/KH-SX" kind="web" />
        <div style={{ position: "absolute", left: 130, top: 112, width: 1000, height: H1 + 40 }}>
          <Paper src="print-phieu-pallet.png" w={565} h={800} style={{ position: "absolute", left: 250, top: 20, transform: "rotate(5deg)", opacity: 0.95 * t }} />
          <Paper src="print-phieu-cuon.png" w={565} h={800} style={{ position: "absolute", left: 0, top: 0, opacity: t, transform: `translateY(${(1 - t) * 30}px)` }} />
        </div>
        <div style={{ position: "absolute", left: 1010, top: 150, width: 800, display: "flex", flexDirection: "column", gap: 34 }}>
          <Bullet i={0} n={1}>
            Phiếu in ra <b>đúng mẫu BM-04/KH-SX</b> của A.F.C: tiêu đề, khách hàng, kho, bảng cuộn, xe, chữ ký.
          </Bullet>
          <Bullet i={1} n={2} color={C.green}>
            <b>Mã QR góc phải</b>: quét bằng điện thoại để mở tem KCS + COA của các cuộn trong phiếu.
          </Bullet>
          <Bullet i={2} n={3} color={C.pink}>
            Phiếu <b>cuộn</b> ghi mã cuộn từng dòng. Phiếu <b>pallet</b> (phía sau) có số bánh, trừ bì 12 kg/pallet và thực xuất.
          </Bullet>
          <Bullet i={3} n={4} color={C.amber}>
            Khi in: khổ <b>A4</b>, lề <b>Không có</b>, tắt <b>Đầu trang và chân trang</b>.
          </Bullet>
        </div>
        <Caption
          duration={duration}
          captions={[{ at: 0, text: "Bấm IN PHIẾU trên sheet (hoặc “Lưu & in phiếu” trên web app) là trình duyệt mở ngay trang in này." }]}
        />
      </SceneFade>
    </Backdrop>
  );
};

const Doc: React.FC<{ i: number; src: string; w: number; h: number; tag: string; title: string; note: string; color: string }> = ({ i, src, w, h, tag, title, note, color }) => (
  <Appear i={i} start={10} gap={22} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 560 }}>
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

export const PrintSmall: React.FC<{ duration: number }> = ({ duration }) => (
  <Backdrop>
    <SceneFade duration={duration}>
      <Header tab="Trang in" title="Tem KCS, phiếu COA và biên bản giao nhận" kind="web" />
      <div style={{ position: "absolute", left: 120, top: 130, width: 1680, display: "flex", justifyContent: "space-between" }}>
        <Doc i={0} src="print-tem-kcs.png" w={700} h={493} tag="BM-18 · A5 ngang" title="Tem KCS" note="Dán lên từng cuộn; QR là mã cuộn" color={C.green} />
        <Doc i={1} src="print-coa.png" w={353} h={500} tag="A5 dọc" title="Phiếu COA" note="Phiếu chất lượng kèm cuộn, chỉ tiêu KCS để trống nếu chưa nhập" color={C.pink} />
        <Doc i={2} src="print-bien-ban.png" w={353} h={500} tag="A4" title="Biên bản giao nhận" note="In kèm phiếu xuất kho, tài xế và khách hàng ký nhận" color={C.amber} />
      </div>
      <Caption
        duration={duration}
        captions={[
          { at: 0, text: "Từ phiếu xuất kho, bấm “Tem KCS + COA (A5)” hoặc quét QR: mỗi cuộn có một tem và một phiếu COA riêng." },
          { at: 130, text: "In tem: chọn khổ A5, lề Không có. Chọn được “Tất cả cuộn” hoặc từng cuộn một." },
        ]}
      />
    </SceneFade>
  </Backdrop>
);

// ====================================================== ĐIỆN THOẠI
export const Phone: React.FC<{ duration: number }> = ({ duration }) => {
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
          <Bullet i={0} n={1}>
            Mở <b>link web app</b> trên điện thoại, chọn “Thêm vào màn hình chính” để mở nhanh như một ứng dụng.
          </Bullet>
          <Bullet i={1} n={2} color={C.green}>
            Ba tab <b>Lập phiếu · Danh sách · Báo cáo</b>; thanh dưới cùng luôn hiện tổng kg và nút <b>Lưu</b>.
          </Bullet>
          <Bullet i={2} n={3} color={C.pink}>
            Nhập số kg một lần, <b>dán cả dãy số</b> (vd 544 540 557 552) để thêm nhiều cuộn.
          </Bullet>
          <Bullet i={3} n={4} color={C.amber}>
            Nút bấm trên Google Sheet chỉ chạy trên máy tính. <b>Trên điện thoại dùng web app.</b>
          </Bullet>
        </div>
        <Caption duration={duration} captions={[{ at: 0, text: "Cùng một dữ liệu, cùng một Google Sheet — chỉ khác cách nhập." }]} />
      </SceneFade>
    </Backdrop>
  );
};

// ====================================================== KẾT
export const Outro: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: f, fps, config: { damping: 16 }, durationInFrames: 30 });
  return (
    <Backdrop>
      <SceneFade duration={duration}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34 }}>
          <div style={{ opacity: t, fontSize: 70, fontWeight: 800, letterSpacing: -1.5 }}>Nhớ ba điều</div>
          <div style={{ display: "flex", gap: 26 }}>
            {[
              ["1", "Lập phiếu ở Nhập PXK, bấm IN PHIẾU", "#60a5fa"],
              ["2", "Danh mục gõ trực tiếp thành dropdown", C.amber],
              ["3", "Báo cáo tự tính ở BaoCao", C.green],
            ].map(([n, text, col], i) => (
              <Appear key={n} i={i} start={16} gap={16} style={{ width: 500 }}>
                <div style={{ background: C.panel, border: `2px solid ${col}66`, borderRadius: 22, padding: "30px 30px", height: 230 }}>
                  <div style={{ width: 60, height: 60, borderRadius: 30, background: col, color: C.ink, fontSize: 36, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</div>
                  <div style={{ fontSize: 35, fontWeight: 700, marginTop: 18, lineHeight: 1.25 }}>{text}</div>
                </div>
              </Appear>
            ))}
          </div>
          <Appear i={3} start={16} gap={16}>
            <div style={{ fontSize: 30, color: C.mute }}>Cần hỗ trợ? Liên hệ SOLVIQ · Nguyễn Sĩ Quỳnh</div>
          </Appear>
        </div>
      </SceneFade>
    </Backdrop>
  );
};
