"""Main menu row art in the style of the Black/White party panels (the Team cards).

Writes to assets/ui/menu/: row.png, row-sel.png (458x88) and play.png, play-sel.png (502x152), the
exact on-screen size of each row in mockup pixels, so the CSS scales them whole and the band keeps
its 45 degrees. Drawn at 1 art pixel = 2 px like the party rip: a chevron on the left, the panel's
3-line border (edge, light, edge) on the top, bottom and chevron, no border on the right since the
rows run off the screen, the see-through fill and one diagonal band with a shade line on each side.
Colours are those of panel_rect.png / panel_rect_sel.png (assets/ui/BW Pokedex rip/BW Party).

Usage from the repo root:  python tools/make_menu_rows.py
"""

import os

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'assets', 'ui', 'menu')
FILL_A = 179  # the panel fill's alpha

# edge, light line, fill, band, band shade line
NORMAL = ('#00638c', '#8cfff7', '#004263', '#002139', '#00395a')
SELECTED = ('#39dede', '#efefef', '#008cde', '#086b94', '#0073ad')

# name: (art width, art height, chevron steps (rows per art pixel in), flat tip half height)
ROWS = {'row': (229, 44, 2, 3), 'play': (251, 76, 3, 4)}
# The region select cards (css/bw-menu.css .rg-card): pointed at both ends, border all the way round.
CARDS = {'region': (204, 32, 2, 3)}


def rgba(h, a=255):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (a,)


def row(w, h, step, tip, colours, both=False):
    edge, light, fill, band, shade = colours
    out = Image.new('RGBA', (w, h))
    po = out.load()
    left = [int(max(0, abs(y + 0.5 - h / 2) - tip) // step) for y in range(h)]
    # The band runs along x + y like the panel's: centred at 52% of the width, about 1.14 heights wide.
    mid = int(0.52 * w) + h // 2
    half = round(0.57 * h)
    for y in range(h):
        for x in range(left[y], w - left[y] if both else w):
            d = min(y, h - 1 - y, x - left[y])
            if both:
                d = min(d, w - 1 - left[y] - x)
            if d < 3:
                po[x, y] = rgba(light if d == 1 else edge)
                continue
            u = x + y - mid
            if abs(u) == half:
                po[x, y] = rgba(shade, FILL_A)
            elif abs(u) < half:
                po[x, y] = rgba(band, FILL_A)
            else:
                po[x, y] = rgba(fill, FILL_A)
    return out.resize((w * 2, h * 2), Image.NEAREST)


def main():
    for name, (w, h, step, tip) in ROWS.items():
        row(w, h, step, tip, NORMAL).save(os.path.join(OUT, name + '.png'))
        row(w, h, step, tip, SELECTED).save(os.path.join(OUT, name + '-sel.png'))
        print('wrote %s(-sel).png %dx%d' % (name, w * 2, h * 2))
    for name, (w, h, step, tip) in CARDS.items():
        row(w, h, step, tip, NORMAL, True).save(os.path.join(OUT, name + '.png'))
        row(w, h, step, tip, SELECTED, True).save(os.path.join(OUT, name + '-sel.png'))
        print('wrote %s(-sel).png %dx%d' % (name, w * 2, h * 2))


if __name__ == '__main__':
    main()
