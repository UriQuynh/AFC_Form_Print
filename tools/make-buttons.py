"""Tạo ảnh nút bấm cho sheet PXK -> src/PxkButtons.gs (base64). Chạy: python3 tools/make-buttons.py"""
import base64, io, pathlib
from PIL import Image, ImageDraw, ImageFont

FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
S = 2  # vẽ gấp đôi cho nét, sheet hiển thị 1/2
BUTTONS = {
    # key: (chữ, nền, viền, màu chữ, rộng)
    "PRINT": ("IN PHIẾU  (lưu + in)", "#1d4ed8", "#1e40af", "#ffffff", 210),
    "NEW": ("+ PHIẾU MỚI", "#ffffff", "#9ca3af", "#111827", 130),
    "LOAD": ("MỞ PHIẾU THEO SỐ", "#ffffff", "#9ca3af", "#111827", 172),
}
H = 36

def make(text, bg, border, fg, w):
    W, HH = w * S, H * S
    im = Image.new("RGBA", (W, HH), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([1, 1, W - 2, HH - 2], radius=9 * S, fill=bg, outline=border, width=2 * S // 2)
    f = ImageFont.truetype(FONT, 14 * S)
    box = d.textbbox((0, 0), text, font=f)
    tw, th = box[2] - box[0], box[3] - box[1]
    d.text(((W - tw) / 2 - box[0], (HH - th) / 2 - box[1]), text, font=f, fill=fg)
    buf = io.BytesIO(); im.save(buf, "PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode(), w, H

lines = ["/** Ảnh nút bấm trên sheet PXK (sinh bởi tools/make-buttons.py — không sửa tay). */", "var PXK_BUTTONS = {"]
for k, spec in BUTTONS.items():
    b64, w, h = make(*spec)
    lines.append(f"  {k}: {{ w: {w}, h: {h}, png: '{b64}' }},")
lines.append("};")
pathlib.Path(__file__).resolve().parent.parent.joinpath("src/PxkButtons.gs").write_text("\n".join(lines) + "\n", encoding="utf-8")
print("ok", {k: len(v) for k, v in [(l.split(':')[0].strip(), l) for l in lines[2:-1]]})
