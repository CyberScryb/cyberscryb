#!/usr/bin/env python3
"""Generate public/og-image.png — a 1200x630 social card matching the brand.

Social platforms (Facebook, LinkedIn, Slack) reject SVG og:images, so we ship a
PNG. Mirrors the design of the legacy public/og-image.svg: dark vignette
background, red (#c41e1e) accent, logo glyph, title, tagline, and URL.

Run: python3 scripts/gen-og-image.py  (requires Pillow)
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (10, 10, 10)        # #0a0a0a
CENTER = (17, 17, 17)    # #111111 vignette center
RED = (196, 30, 30)      # #c41e1e
GREY = (160, 160, 160)   # #a0a0a0

FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# Radial vignette: brighter center fading to edges
cx, cy = W / 2, H * 0.45
maxd = (W ** 2 + H ** 2) ** 0.5 / 2
for y in range(0, H, 2):
    for x in range(0, W, 2):
        dist = (((x - cx) ** 2 + (y - cy) ** 2) ** 0.5) / maxd
        t = min(1.0, dist)
        r = int(CENTER[0] * (1 - t) + BG[0] * t)
        g = int(CENTER[1] * (1 - t) + BG[1] * t)
        b = int(CENTER[2] * (1 - t) + BG[2] * t)
        d.rectangle([x, y, x + 1, y + 1], fill=(r, g, b))

# Corner accents
for (a, b, c) in [((0, 80), (0, 0), (80, 0)),
                  ((1120, 0), (1200, 0), (1200, 80)),
                  ((0, 550), (0, 630), (80, 630)),
                  ((1200, 550), (1200, 630), (1120, 630))]:
    d.line([a, b, c], fill=(49, 20, 20), width=2)

# Thin border
d.rectangle([1, 1, W - 2, H - 2], outline=(40, 18, 18), width=1)

# Logo glyph: rounded square with three "text lines"
lx, ly, ls = 560, 150, 80
d.rounded_rectangle([lx, ly, lx + ls, ly + ls], radius=16, outline=RED, width=3)
for (yy, wlen) in [(26, 36), (40, 24), (54, 30)]:
    d.line([lx + 22, ly + yy, lx + 22 + wlen, ly + yy], fill=RED, width=3)

def centered(text, y, font, fill, spacing=0):
    if spacing:
        # crude letter-spacing
        total = sum(d.textlength(ch, font=font) + spacing for ch in text) - spacing
        x = (W - total) / 2
        for ch in text:
            d.text((x, y), ch, font=font, fill=fill)
            x += d.textlength(ch, font=font) + spacing
    else:
        w = d.textlength(text, font=font)
        d.text(((W - w) / 2, y), text, font=font, fill=fill)

title_f = ImageFont.truetype(FONT, 76)
tag_f = ImageFont.truetype(FONT_REG, 28)
url_f = ImageFont.truetype(FONT_REG, 20)

centered("CyberScryb", 268, title_f, RED, spacing=6)
# accent line
d.rectangle([350, 360, 850, 362], fill=RED)
centered("Free, Privacy-First AI & Developer Tools", 392, tag_f, GREY, spacing=2)
centered("cyberscryb.com", 552, url_f, (120, 30, 30), spacing=3)

img.save("public/og-image.png", "PNG", optimize=True)
print("wrote public/og-image.png")
