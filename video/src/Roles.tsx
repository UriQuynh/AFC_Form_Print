import { Entry, Manifest, custom, make, screen } from "./Tutorial";
import manifestUser from "../public/audio-user/manifest.json";
import manifestManager from "../public/audio-manager/manifest.json";
import narrationUser from "./narration.user.json";
import narrationManager from "./narration.manager.json";
import { screenScenes as S } from "./data";
import { PrintResult, SheetFlow, titleCard } from "./scenes/Flow";
import { C } from "./theme";

const opt = (manifest: unknown, narration: Record<string, string[]>, id: string, keep?: number[]) => ({
  manifest: manifest as Manifest,
  texts: narration[id],
  keep,
  scale: 0.5,
});
const u = (id: string, keep?: number[]) => opt(manifestUser, narrationUser, id, keep);
const m = (id: string, keep?: number[]) => opt(manifestManager, narrationManager, id, keep);

const UserTitle = titleCard({ badge: "DÀNH CHO NHÂN VIÊN", title: "Nhập phiếu → bấm IN", sub: "Từng thao tác trên sheet Nhập PXK và kết quả in ra", chips: ["Phiếu mới", "Chọn khách, xe, sản phẩm", "Nhập kg", "IN PHIẾU"], color: C.green });
const UserEnd = titleCard({ badge: "HOÀN TẤT", title: "Phiếu đã lưu và in xong", sub: "Dữ liệu sẵn trong PhieuXuat / ChiTiet để làm báo cáo", chips: ["Số phiếu tự cấp", "Mã cuộn tự sinh", "Có QR mở tem KCS + COA"], color: "#60a5fa" });
const MgrTitle = titleCard({ badge: "DÀNH CHO QUẢN LÝ", title: "Lấy báo cáo · Đọc báo cáo · Xem dữ liệu", sub: "Sản lượng xuất kho, chuyến xe và lương tài xế", chips: ["BaoCao", "Báo cáo trên web", "PhieuXuat · ChiTiet"], color: C.amber });
const MgrEnd = titleCard({ badge: "TÓM LẠI", title: "Báo cáo tự cập nhật", sub: "Mỗi phiếu mới lưu xong là có ngay trong báo cáo", chips: ["Chọn khoảng ngày", "Xuất bảng lương cho kế toán", "Đối chiếu ở ChiTiet"], color: C.green });

export const USER_ENTRIES: Entry[] = [
  custom("user-title", UserTitle, u("user-title")),
  custom("flow", SheetFlow, u("flow")),
  custom("flow-result", PrintResult, u("flow-result")),
  custom("user-end", UserEnd, u("user-end")),
];

export const MANAGER_ENTRIES: Entry[] = [
  custom("mgr-title", MgrTitle, m("mgr-title")),
  screen(S.baocao, m("baocao", [0, 1, 2])),
  screen(S.webReport, m("web-report", [0, 1])),
  screen(S.phieuxuat, m("phieuxuat", [0, 1])),
  screen(S.chitiet, m("chitiet", [0, 1])),
  screen(S.dmTaiXe, m("dm-taixe", [1])),
  custom("mgr-end", MgrEnd, m("mgr-end")),
];

export const USER_TOTAL = USER_ENTRIES.reduce((a, e) => a + e.duration, 0);
export const MANAGER_TOTAL = MANAGER_ENTRIES.reduce((a, e) => a + e.duration, 0);
export const TutorialUser = make(USER_ENTRIES);
export const TutorialManager = make(MANAGER_ENTRIES);
