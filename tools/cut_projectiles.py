#!/usr/bin/env python3
"""Cut assets/projectiles/uncut/frame_1..8.png (7 shapes x 4 colours x 8 anim frames)
into one sheet per shape: 8 frames across, 4 colour rows down.
Usage: python3 tools/cut_projectiles.py <projectiles_dir>
Writes <dir>/sheets/x1/<shape>.png (art pixels, 1/4 of source),
       <dir>/sheets/x4/<shape>.png (source resolution) and <dir>/sheets/atlas.json."""
import sys, json, os
from PIL import Image
d = sys.argv[1]
SCALE = 4
FR = [Image.open(f'{d}/uncut/frame_{i}.png').convert('RGBA') for i in range(1, 9)]
ROWS = [(144, 235), (272, 363), (400, 491), (528, 619)]          # y bands (inclusive), source px
COLS = [(140, 227), (256, 363), (384, 503), (516, 627), (644, 755), (792, 867), (900, 1019)]
SHAPES = ['orb', 'shard', 'rock', 'vine', 'gust', 'ring', 'bolt']
# Row order (top to bottom) differs per shape, so colours are listed per shape.
COLORS = {
    'orb':   ['orange', 'blue', 'magenta', 'green'],
    'shard': ['blue', 'green', 'gray', 'orange'],
    'rock':  ['brown', 'gray', 'orange', 'blue'],
    'vine':  ['green', 'orange', 'blue', 'purple'],
    'gust':  ['gray', 'brown', 'white', 'yellow'],
    'ring':  ['purple', 'gray', 'green', 'orange'],
    'bolt':  ['cyan', 'yellow', 'purple', 'red'],
}
H4 = max(b - a + 1 for a, b in ROWS)
atlas = {'scale': SCALE, 'frames': 8, 'shapes': {}}
for p in ('x1', 'x4'):
    os.makedirs(f'{d}/sheets/{p}', exist_ok=True)
for ci, (x0, x1) in enumerate(COLS):
    w4 = x1 - x0 + 1; cw4 = -(-w4 // SCALE) * SCALE; ch4 = -(-H4 // SCALE) * SCALE
    sheet = Image.new('RGBA', (cw4 * 8, ch4 * 4))
    for ri, (y0, y1) in enumerate(ROWS):
        for fi, im in enumerate(FR):
            crop = im.crop((x0, y0, x0 + cw4, y0 + ch4))
            sheet.paste(crop, (fi * cw4, ri * ch4))
    sheet.save(f'{d}/sheets/x4/{SHAPES[ci]}.png')
    cw, ch = cw4 // SCALE, ch4 // SCALE
    small = Image.new('RGBA', (cw * 8, ch * 4))
    for r in range(4):
        for f in range(8):
            cell = sheet.crop((f * cw4, r * ch4, (f + 1) * cw4, (r + 1) * ch4))
            # sample block centres: the art is a ~4x upscale, so nearest at offset keeps it crisp
            px = Image.new('RGBA', (cw, ch))
            src = cell.load(); dst = px.load()
            for y in range(ch):
                for x in range(cw):
                    dst[x, y] = src[x * SCALE + SCALE // 2, y * SCALE + SCALE // 2]
            small.paste(px, (f * cw, r * ch))
    small.save(f'{d}/sheets/x1/{SHAPES[ci]}.png')
    atlas['shapes'][SHAPES[ci]] = {'cw': cw, 'ch': ch, 'cw4': cw4, 'ch4': ch4, 'rows': COLORS[SHAPES[ci]]}
json.dump(atlas, open(f'{d}/sheets/atlas.json', 'w'), indent=1)
print('ok', {k: (v['cw'], v['ch']) for k, v in atlas['shapes'].items()})
