"""
Crop the togabot.webp source image into the brand variants we need.

Source: public/mascot.webp (1024x1024, full logo with bot + wordmark + black bg)

Outputs:
1. public/mascot-icon.png — square crop of bot HEAD ONLY (head + visor + wreath)
   - For favicon, navbar, app icons, social avatars
   - PNG so favicon support is universal across all browsers
   - 256x256 is plenty sharp for retina favicons and scales down cleanly

2. public/mascot-bot.webp — bot + toga, NO wordmark
   - For hero spots (homepage, about, 404)
   - 1024 wide, ~720 tall

3. public/mascot-icon.webp — same as #1 but webp for places that use it as <img>
"""

from PIL import Image

src = Image.open("public/mascot.webp")
W, H = src.size  # 1024, 1024

# --- CROP 1: head-only icon (for favicon and navbar small sizes) ---
# Head visually centered around x=512, runs roughly y=80 to y=520
# Make a tight square crop centered on the head with some breathing room
# Use a 520x520 crop centered around the head
left   = 232      # 1024/2 - 260
top    = 60
right  = 792      # 1024/2 + 260
bottom = 620
head_crop = src.crop((left, top, right, bottom))

# Save as PNG (transparent background not possible since source is RGB,
# but pure black bg works fine for both light and dark contexts;
# also produces tiny file at this size)
head_256 = head_crop.resize((256, 256), Image.LANCZOS)
head_256.save("public/mascot-icon.png", "PNG", optimize=True)
head_256.save("public/mascot-icon.webp", "WEBP", quality=92, method=6)

print(f"mascot-icon.png   : 256x256 head-only crop")
print(f"mascot-icon.webp  : 256x256 head-only crop")

# --- CROP 2: bot + toga WITHOUT wordmark (for hero spots) ---
# The wordmark sits roughly y=700 to y=920
# Bot + toga ends at roughly y=700
bot_crop = src.crop((0, 0, W, 720))
bot_crop.save("public/mascot-bot.webp", "WEBP", quality=90, method=6)
print(f"mascot-bot.webp   : {bot_crop.size} bot+toga only, no wordmark")

print("DONE")
