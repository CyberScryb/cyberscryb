"""
Crop the togabot.webp source image into the brand variants we need.

Source: public/mascot.webp (1024x1024, full logo with bot + wordmark + black bg)

Outputs:
1. public/mascot-icon.png — square crop of bot HEAD ONLY (head + visor + wreath)
   - For favicon, navbar, app icons, social avatars
   - PNG so favicon support is universal across all browsers
   - 256x256 is plenty sharp for retina favicons and scales down cleanly
2. public/mascot-icon.webp — same head-only crop as webp
3. public/mascot-bot.webp — bot + toga, NO wordmark (1024x720)
4. public/mascot-hero.png — TRANSPARENT-BG version of mascot-bot for hero use
   - Floodfills the black outer background to alpha=0
   - Preserves the bot's black outlines (interior)
   - Hides the hard square edge against the page bg gradient
"""

from PIL import Image, ImageDraw

src = Image.open("public/mascot.webp")
W, H = src.size  # 1024, 1024

# --- CROP 1+2: head-only icon (favicon + navbar) ---
left, top, right, bottom = 232, 60, 792, 620
head_crop = src.crop((left, top, right, bottom))
head_256 = head_crop.resize((256, 256), Image.LANCZOS)
head_256.save("public/mascot-icon.png", "PNG", optimize=True)
head_256.save("public/mascot-icon.webp", "WEBP", quality=92, method=6)
print("mascot-icon.png   : 256x256 head-only crop")
print("mascot-icon.webp  : 256x256 head-only crop")

# --- CROP 3: bot + toga, no wordmark, BLACK bg (for places that want it) ---
bot_crop = src.crop((0, 0, W, 720))
bot_crop.save("public/mascot-bot.webp", "WEBP", quality=90, method=6)
print(f"mascot-bot.webp   : {bot_crop.size} bot+toga only, no wordmark (black bg)")

# --- CROP 4: TRANSPARENT BG version for hero use ---
# Floodfill from each corner to remove the outer black background,
# while preserving the bot's interior black outlines.
bot_rgba = bot_crop.convert("RGBA")
pixels = bot_rgba.load()
w, h = bot_rgba.size

# Use PIL's ImageDraw flood fill via a different approach:
# We'll use the alpha-from-luminance method with a tolerance.
# Simpler reliable approach: flood-fill from corners using
# Image.fromarray + numpy, OR use PIL's ImageDraw.floodfill.

# PIL has ImageDraw.floodfill but it's stateful. Use it from 4 corners.
from PIL import ImageDraw as _ID
# Need to floodfill on the original RGB to mark bg pixels,
# then transfer to alpha channel.
mask = Image.new("L", (w, h), 255)  # 255 = opaque, 0 = transparent
# Convert bot_crop to a workspace where we can floodfill
workspace = bot_crop.convert("RGB").copy()
draw_workspace = workspace  # not directly drawable; use ImageDraw

# Flood fill from each corner with a tolerance; mark filled area as transparent
# PIL's floodfill: ImageDraw.floodfill(image, xy, value, border=None, thresh=0)
from PIL import ImageDraw
for corner in [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)]:
    ImageDraw.floodfill(workspace, corner, (255, 0, 255), thresh=30)
# Now workspace has magenta where bg was. Use that to build the alpha mask.
ws_pixels = workspace.load()
for y in range(h):
    for x in range(w):
        r, g, b = ws_pixels[x, y]
        if (r, g, b) == (255, 0, 255):
            mask.putpixel((x, y), 0)

# Apply the mask as alpha
bot_rgba.putalpha(mask)
bot_rgba.save("public/mascot-hero.png", "PNG", optimize=True)
print(f"mascot-hero.png   : {bot_rgba.size} transparent-bg version for hero use")

print("DONE")
