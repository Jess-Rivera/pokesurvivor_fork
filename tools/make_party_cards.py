"""Team screen art from the Black/White party rip (assets/ui/BW Pokedex rip/BW Party).

Writes to assets/ui/team/:
  cell.png, cell-sel.png  tall Pokedex cards from panel_rect.png / panel_rect_sel.png. The frame is
                          9-sliced (cut corners and border kept pixel for pixel, straight edges lengthened)
                          and the see-through fill is redrawn so the diagonal band keeps its 45 degrees and
                          its colours. Built at 1 art pixel = 1 px, then doubled like the rip.
  cell-frame.png,         the opaque frame of each card alone, drawn over the sprite so a sprite that reaches
  cell-sel-frame.png      the inner edge disappears under the border.
  slot-*.png              the team slots, 192x73 art (384x146 px), the same way: slot-rect(-sel, -swap) from
                          panel_rect (diagonal band), slot-round(-sel, -swap) from panel_round (chevron band),
                          slot-blank from panel_blank (its 1 px stripes keep their rhythm).

And to assets/ui/inventory/: frame.png (the card border alone, for the window), slot(-sel).png and
slot-blank.png (82x82 item slots), cell(-sel).png (136x88 item cards).

Usage from the repo root:  python tools/make_party_cards.py [art_w art_h [out_dir]]   (cards; default 50 68 -> 100x136 px)
"""

import os
import sys
from collections import Counter

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'assets', 'ui', 'BW Pokedex rip', 'BW Party')
OUT = os.path.join(ROOT, 'assets', 'ui', 'team')
CORNER = 12  # art pixels kept fixed at each corner (covers the cut corners)
SLOT = (192, 73)  # team slot art size; 73 - 49 is even, so panel_blank's stripes stay in step
INV_OUT = os.path.join(ROOT, 'assets', 'ui', 'inventory')
INV_FRAME = (32, 32)  # the window border alone, used as a CSS border-image (24 px slices)
INV_SLOT = (41, 41)  # item slot tiles; 41 - 49 is even, as above
INV_CELL = (68, 44)  # item cards


def is_fill(p):
    """The panel fill is see-through; the frame is opaque."""
    return 0 < p[3] < 255


def diagonal(x, y, w, h):
    """panel_rect's band runs along x + y."""
    return x + y


def chevron(x, y, w, h):
    """panel_round's band is a pair of '<' shapes: constant along x - |y - middle| (doubled to stay whole)."""
    return 2 * x - abs(2 * y - (h - 1))


def card(name, w, h, key=diagonal, stripes=False):
    big = Image.open(os.path.join(SRC, name)).convert('RGBA')
    src = big.resize((big.width // 2, big.height // 2), Image.NEAREST)  # the rip is doubled: back to art pixels
    ws, hs = src.size
    sp = src.load()
    out = Image.new('RGBA', (w, h))
    po = out.load()
    # 9-slice: corners as drawn, edges from the middle row / column. With stripes, the edge rows alternate
    # between two neighbouring source rows so 1 px stripes keep going.
    mid_y = (lambda y: CORNER + (y - CORNER) % 2) if stripes else (lambda y: hs // 2)
    sx = lambda x: x if x < CORNER else (ws - (w - x) if x >= w - CORNER else ws // 2)
    sy = lambda y: y if y < CORNER else (hs - (h - y) if y >= h - CORNER else mid_y(y))
    for y in range(h):
        for x in range(w):
            po[x, y] = sp[sx(x), sy(y)]
    # The fill colour at each value of the band's key, by majority of the source fill pixels.
    votes = {}
    for y in range(hs):
        for x in range(ws):
            if is_fill(sp[x, y]):
                votes.setdefault(key(x, y, ws, hs), Counter())[sp[x, y]] += 1
    if votes:  # panel_blank has no see-through fill
        lo_s, hi_s = min(votes), max(votes)
        pts = [key(x, y, w, h) for y in range(h) for x in range(w) if is_fill(po[x, y])]
        lo_t, hi_t = min(pts), max(pts)
        for y in range(h):
            for x in range(w):
                if is_fill(po[x, y]):
                    v = int(lo_s + (key(x, y, w, h) - lo_t) / (hi_t - lo_t) * (hi_s - lo_s))
                    while v not in votes:
                        v += 1
                    po[x, y] = votes[v].most_common(1)[0][0]
    return out.resize((w * 2, h * 2), Image.NEAREST)


def frame_only(img):
    """Keep the opaque frame; clear the see-through fill."""
    out = img.copy()
    po = out.load()
    for y in range(out.height):
        for x in range(out.width):
            if is_fill(po[x, y]):
                po[x, y] = (0, 0, 0, 0)
    return out


def main():
    w, h = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (50, 68)
    out = sys.argv[3] if len(sys.argv) > 3 else OUT
    os.makedirs(out, exist_ok=True)
    for src, name in (('panel_rect.png', 'cell'), ('panel_rect_sel.png', 'cell-sel')):
        c = card(src, w, h)
        c.save(os.path.join(out, name + '.png'))
        frame_only(c).save(os.path.join(out, name + '-frame.png'))
    print('wrote', out, 'cards', w * 2, 'x', h * 2)
    sw, sh = SLOT
    for shape, key in (('rect', diagonal), ('round', chevron)):
        for state in ('', '_sel', '_swap'):
            name = 'slot-' + shape + state.replace('_', '-')
            card('panel_%s%s.png' % (shape, state), sw, sh, key).save(os.path.join(out, name + '.png'))
    card('panel_blank.png', sw, sh, stripes=True).save(os.path.join(out, 'slot-blank.png'))
    print('wrote', out, 'slots', sw * 2, 'x', sh * 2)
    os.makedirs(INV_OUT, exist_ok=True)
    frame_only(card('panel_rect.png', *INV_FRAME)).save(os.path.join(INV_OUT, 'frame.png'))
    for state in ('', '_sel'):
        suffix = state.replace('_', '-')
        card('panel_rect%s.png' % state, *INV_SLOT).save(os.path.join(INV_OUT, 'slot' + suffix + '.png'))
        card('panel_rect%s.png' % state, *INV_CELL).save(os.path.join(INV_OUT, 'cell' + suffix + '.png'))
    card('panel_blank.png', *INV_SLOT, stripes=True).save(os.path.join(INV_OUT, 'slot-blank.png'))
    print('wrote', INV_OUT, 'frame, slots', INV_SLOT[0] * 2, 'x', INV_SLOT[1] * 2, 'cells', INV_CELL[0] * 2, 'x', INV_CELL[1] * 2)


if __name__ == '__main__':
    main()
