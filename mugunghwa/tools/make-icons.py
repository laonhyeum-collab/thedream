"""앱 아이콘(무궁화 꽃) 만들기: python3 tools/make-icons.py"""
import math, os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), '..', 'icons')

def icon(size, maskable=False, rounded=True):
    S = size * 4  # 크게 그린 뒤 줄여서 부드럽게
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bg = (255, 228, 238, 255)
    if maskable or not rounded:
        d.rectangle([0, 0, S, S], fill=bg)
    else:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=S * 0.22, fill=bg)
    cx = cy = S / 2
    scale = 0.62 if maskable else 0.82  # maskable은 안전 영역 안에
    R = S / 2 * scale
    for i in range(5):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        px, py = cx + math.cos(a) * R * 0.5, cy + math.sin(a) * R * 0.5
        r = R * 0.5
        d.ellipse([px - r, py - r, px + r, py + r], fill=(247, 140, 186, 255), outline=(224, 86, 127, 255), width=max(2, S // 120))
    rc = R * 0.3
    d.ellipse([cx - rc, cy - rc, cx + rc, cy + rc], fill=(214, 51, 108, 255))
    for i in range(5):
        a = -math.pi / 2 + (i + 0.5) * 2 * math.pi / 5
        x2, y2 = cx + math.cos(a) * R * 0.55, cy + math.sin(a) * R * 0.55
        d.line([cx, cy, x2, y2], fill=(214, 51, 108, 255), width=max(2, S // 90))
    rs = R * 0.1
    d.ellipse([cx - rs, cy - rs, cx + rs, cy + rs], fill=(255, 230, 120, 255))
    return img.resize((size, size), Image.LANCZOS)

icon(192).save(os.path.join(OUT, 'icon-192.png'))
icon(512).save(os.path.join(OUT, 'icon-512.png'))
icon(512, maskable=True).save(os.path.join(OUT, 'icon-maskable-512.png'))
icon(180, rounded=False).save(os.path.join(OUT, 'apple-touch-icon.png'))
print('ok')
