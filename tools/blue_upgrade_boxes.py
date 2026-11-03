"""Hue-shift the Upgrades box art (assets/ui/upgrades) from teal to the Inventory cards' blue.
Run once on the teal originals; saturated fills shift, the white/cyan outline stays."""
import colorsys
from PIL import Image

SHIFT = 37 / 360  # teal 163 deg -> Inventory blue 200 deg
for name in ('box', 'box-sel'):
    p = f'assets/ui/upgrades/{name}.png'
    im = Image.open(p).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s > 0.6:
                r, g, b = (round(c * 255) for c in colorsys.hsv_to_rgb((h + SHIFT) % 1, s, v))
                px[x, y] = (r, g, b, a)
    im.save(p)
    print(name, px[im.width // 2, im.height // 2], px[20, im.height // 2])
