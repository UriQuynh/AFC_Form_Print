import { CaptionKey } from "./types";

/** Subtext + độ dài gốc của các cảnh tự dựng (cảnh chụp màn hình nằm trong data.ts). */
export const customScript: Record<string, { duration: number; captions: CaptionKey[] }> = {
  intro: { duration: 120, captions: [{ at: 0, text: "" }] },
  overview: {
    duration: 330,
    captions: [
      { at: 0, text: "Google Sheet có nhiều tab. Chỉ cần nhớ ba nhóm: Nhập liệu → Dữ liệu → Danh mục." },
      { at: 150, text: "Nhân viên chỉ làm việc ở nhóm ①. Nhóm ③ do quản lý cập nhật khi có khách, xe hoặc sản phẩm mới." },
    ],
  },
  "print-a4": {
    duration: 300,
    captions: [
      { at: 0, text: "Bấm IN PHIẾU trên sheet (hoặc “Lưu & in phiếu” trên web app) là trình duyệt mở ngay trang in này." },
      { at: 150, text: "Quét QR góc phải để mở tem KCS + COA. Khi in: khổ A4, lề Không có, tắt Đầu trang và Chân trang." },
    ],
  },
  "print-small": {
    duration: 300,
    captions: [
      { at: 0, text: "Từ phiếu xuất kho, bấm “Tem KCS + COA (A5)” hoặc quét QR: mỗi cuộn có một tem và một phiếu COA riêng." },
      { at: 130, text: "In tem: chọn khổ A5, lề Không có. Chọn được “Tất cả cuộn” hoặc từng cuộn một." },
    ],
  },
  "dm-grid": {
    duration: 270,
    captions: [
      { at: 0, text: "Bảy sheet DM_ và CauHinh. Gõ trực tiếp vào các dòng trống — lần sau mở form hoặc Nhập PXK sẽ thấy ngay trong dropdown." },
    ],
  },
  phone: {
    duration: 270,
    captions: [
      { at: 0, text: "Cùng một dữ liệu, cùng một Google Sheet — chỉ khác cách nhập." },
      { at: 200, text: "Nút bấm trên Google Sheet chỉ chạy trên máy tính. Trên điện thoại dùng web app." },
    ],
  },
  outro: { duration: 180, captions: [{ at: 0, text: "" }] },
  "user-title": { duration: 60, captions: [{ at: 0, text: "" }] },
  flow: {
    duration: 500,
    captions: [
      { at: 0, text: "" },
      { at: 125, text: "" },
      { at: 250, text: "" },
      { at: 375, text: "" },
    ],
  },
  "flow-result": {
    duration: 300,
    captions: [
      { at: 0, text: "" },
      { at: 100, text: "" },
      { at: 200, text: "" },
    ],
  },
  "user-end": { duration: 60, captions: [{ at: 0, text: "" }] },
  "mgr-title": { duration: 60, captions: [{ at: 0, text: "" }] },
  "mgr-end": { duration: 60, captions: [{ at: 0, text: "" }] },
  "web-laptop": {
    duration: 555,
    captions: [
      { at: 0, text: "" },
      { at: 66, text: "" },
      { at: 264, text: "" },
      { at: 454, text: "" },
    ],
  },
  "web-mobile": {
    duration: 555,
    captions: [
      { at: 0, text: "" },
      { at: 66, text: "" },
      { at: 264, text: "" },
      { at: 454, text: "" },
    ],
  },
};
