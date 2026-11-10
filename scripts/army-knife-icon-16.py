"""Hand-placed 16x16 version of the CTF Army Knife icon (from the 64 px PixelLab original).

Regenerate: python3 scripts/army-knife-icon-16.py apps/web/public/brand/army-knife-64.png <out-dir>
(needs Pillow). Writes k16-hand.png; copy it to apps/web/app/icon1.png and
apps/web/public/brand/army-knife-16.png. The preview step expects k16-cropped.png and is optional.
"""
import sys
from pathlib import Path
from PIL import Image

src, out = Path(sys.argv[1]), Path(sys.argv[2])
tile = Image.open(src).convert("RGBA")
px = [tile.getpixel((x, y)) for y in range(tile.height) for x in range(tile.width) if tile.getpixel((x, y))[3] > 128]
green = max(px, key=lambda p: p[1] - (p[0] + p[2]) / 2)[:3]          # the emblem green from the original
PAL = {"K": (1, 3, 6), "B": (49, 52, 57), "D": (32, 35, 39), "L": (197, 210, 219), "M": (156, 174, 186), "S": (111, 120, 128), "G": green}

cells = {}
def put(x, y, c): cells[(x, y)] = c
# Body: rounded vertical slab with a darker right edge and a 2x2 green emblem.
for y in range(2, 14):
    for x in range(6, 10):
        if (x, y) in {(6, 2), (9, 2), (6, 13), (9, 13)}: continue
        put(x, y, "D" if x == 9 else "B")
for x, y in [(7, 7), (8, 7), (7, 8), (8, 8)]: put(x, y, "G")
# Blades: light top edge, mid-grey underside, running in behind the body.
for i, (x, y) in enumerate([(1, 2), (2, 3), (3, 4), (4, 5)]):        # upper left
    put(x, y, "L"); put(x, y + 1, "M")
for x, y in [(1, 11), (2, 10), (3, 9), (4, 8)]:                        # lower left
    put(x, y, "L"); put(x, y + 1, "M")
for x, y in [(14, 2), (13, 3), (12, 4), (11, 5)]:                      # upper right
    put(x, y, "L"); put(x, y + 1, "M")
# Ring at lower right, on a short stem from the body.
for x, y in [(11, 10), (12, 10), (13, 10), (11, 11), (14, 11), (11, 12), (14, 12), (12, 13), (13, 13), (14, 10)]:
    put(x, y, "S")
cells.pop((14, 10)); cells.pop((11, 12))
put(12, 13, "S"); put(11, 12, "S")
# 1 px black outline around everything, like the original.
outline = set()
for (x, y) in list(cells):
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        n = (x + dx, y + dy)
        if n not in cells and 0 <= n[0] < 16 and 0 <= n[1] < 16: outline.add(n)
for n in outline: put(*n, "K")

img = Image.new("RGBA", (16, 16))
for (x, y), c in cells.items(): img.putpixel((x, y), PAL[c] + (255,))
img.save(out / "k16-hand.png")

# Optional preview beside an automatic reduction, zoomed and at actual size.
if not (out / "k16-cropped.png").exists():
    sys.exit(0)
auto = Image.open(out / "k16-cropped.png").convert("RGBA")
Z = 16
prev = Image.new("RGBA", (2 * (16 * Z + 24), 16 * Z + 60), (30, 30, 30, 255))
for i, v in enumerate([auto, img]):
    x = i * (16 * Z + 24)
    bg = Image.new("RGBA", (16 * Z, 16 * Z), (19, 20, 22, 255)); bg.alpha_composite(v.resize((16 * Z, 16 * Z), Image.NEAREST)); prev.alpha_composite(bg, (x, 0))
    for j, g in enumerate([(19, 20, 22), (243, 243, 241), (60, 64, 70)]):
        t = Image.new("RGBA", (24, 24), g + (255,)); t.alpha_composite(v, (4, 4)); prev.alpha_composite(t.resize((48, 48), Image.NEAREST), (x + j * 56, 16 * Z + 8))
prev.save(out / "k16-hand-preview.png")
print("green", "#%02x%02x%02x" % green)
