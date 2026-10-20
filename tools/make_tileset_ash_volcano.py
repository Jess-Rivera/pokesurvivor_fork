#!/usr/bin/env python3
"""
make_tileset_ash_volcano.py  --  bakes the Ash Volcano atlas from assets/tileset/volcano_test_tileset.png (16px tiles).

Writes assets/tileset/ash_volcano/ash_volcano_atlas.{png,json,js}  (js = G.TILESETS.ash_volcano, file:// safe).
Labels follow the catalog: column letter(s) = x/16, row = y/16.  No filter: the raw art is already the target palette.
Needs: Pillow, numpy.
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
if len(sys.argv) > 1: ROOT = sys.argv[1]
SRC = os.path.join(ROOT, 'assets', 'tileset', 'volcano_test_tileset.png')
OUT = os.path.join(ROOT, 'assets', 'tileset', 'ash_volcano')
T = 16
G = Image.open(SRC).convert('RGBA')

def parse(t):
    i = 0
    while t[i].isalpha(): i += 1
    c = 0
    for ch in t[:i]: c = c * 26 + ord(ch) - 64
    return c - 1, int(t[i:])
def box(s):
    a, _, b = s.partition('-'); b = b or a
    (c0, r0), (c1, r1) = parse(a), parse(b)
    return (min(c0, c1) * T, min(r0, r1) * T, (max(c0, c1) + 1) * T, (max(r0, r1) + 1) * T)
def crop(s): return G.crop(box(s))
def empty(im): return im.getchannel('A').getbbox() is None

# (name, source label)  -- everything is used as-is; the sheet is already RGBA with transparent margins
SPEC = [
    ('floor', 'A0-B1'),
    ('patch_block', 'A2-C4'), ('patch_inner', 'A5-B6'),
    ('grass1', 'C0'), ('grass2', 'D0'), ('grass3', 'C1'), ('grass4', 'D1'),
    ('lava_shallow', 'E0-G2'), ('lava_shallow_inner', 'H1-I2'),
    ('lava_deep', 'D3-G6'), ('lava_deep_inner', 'H4-I6'),
    ('wall_short', 'A14-D17'), ('wall_short_inner', 'E17-F18'),
    ('wall_tall', 'G14-J19'), ('wall_tall_inner_south', 'K14-L15'), ('wall_tall_inner_north', 'K19-L19'),
    ('tree1_pass', 'U0-W1'), ('tree1_base', 'V2-W3'), ('tree2_pass', 'U4-W5'), ('tree2_base', 'V6-W7'),
    ('rock1_base', 'Q1'), ('rock1_pass', 'Q0'), ('rock2_base', 'R1'), ('rock2_pass', 'R0'),
    ('rock3_base', 'S1-T1'), ('rock3_pass', 'S0-T0'),
    ('rock4_base', 'Q3-R3'), ('rock4_pass', 'Q2-R2'),
    ('rock5_base', 'Q7-R7'), ('rock5_pass', 'Q6-R6'),
    ('rock6_base', 'S7-T7'), ('rock6_pass', 'S6-T6'),
]
ITEMS = [(n, crop(s)) for n, s in SPEC if not empty(crop(s))]
SKIPPED = [n for n, s in SPEC if empty(crop(s))]
SRCL = dict(SPEC)

GUT = 2; AW = 256
order = sorted(ITEMS, key=lambda it: (-it[1].height, -it[1].width))
x = y = rowh = 0; place = {}
for name, im in order:
    if x + im.width > AW: x = 0; y += rowh + GUT; rowh = 0
    place[name] = (x, y, im.width, im.height); x += im.width + GUT; rowh = max(rowh, im.height)
AH = y + rowh
atlas = Image.new('RGBA', (AW, AH), (0, 0, 0, 0))
for name, im in ITEMS: atlas.paste(im, place[name][:2])
def R(n): return dict(zip('xywh', place[n])) if n in place else None
def tile(n, c, r): x0, y0, _, _ = place[n]; return dict(x=x0 + c * T, y=y0 + r * T, w=T, h=T)
def grid(n, cols, rows): return [[tile(n, c, r) for c in range(cols)] for r in range(rows)]
pieces = {n: dict(R(n), src=SRCL[n]) for n, _ in ITEMS}

# corner tile maps: concave corner (both orthogonal neighbours present, diagonal missing) -> replacement tile in the inner piece
C4 = {'SE': (0, 0), 'SW': (1, 0), 'NE': (0, 1), 'NW': (1, 1)}
def corner_map(n, m): return {k: tile(n, *v) for k, v in m.items()}
autotile = dict(
    floor=dict(type='pattern_2x2', tile=R('floor'), rule='tile (x%2, y%2) of the 2x2 piece'),
    ground_patch=dict(type='edge_autotile_replace_corner', tiles=grid('patch_block', 3, 3), inner=R('patch_inner'),
        inner_tile_for_missing_diagonal=corner_map('patch_inner', C4),
        rule='row = N missing ? 0 : S missing ? 2 : 1; col = W missing ? 0 : E missing ? 2 : 1. An INTERIOR tile (N,S,W,E all present) whose single diagonal is missing is REPLACED by inner_tile_for_missing_diagonal[D] (it has a transparent notch at that corner). Edge tiles ignore missing diagonals. Generator: delete tiles with opposite sides open and interior tiles with 2+ missing diagonals'),
    lava_shallow=dict(type='edge_autotile_replace_corner', tiles=grid('lava_shallow', 3, 3), inner=R('lava_shallow_inner'),
        inner_tile_for_missing_diagonal=corner_map('lava_shallow_inner', C4),
        rule='same as ground_patch. The inner piece is a rock stump ring in lava; its four quarters are used as the four concave corners (seam-matched against the block)'),
    lava_deep=dict(type='deep_pool_autotile', tiles=grid('lava_deep', 4, 4), inner=R('lava_deep_inner'),
        inner_tile_for_missing_diagonal={'SE': tile('lava_deep_inner', 0, 0), 'SW': tile('lava_deep_inner', 1, 0)},
        rule='4x4 block: the north face is TWO tiles tall. depth = number of pool cells above in the same column (0 = top edge). row = no S ? 3 : depth 0 ? 0 : depth 1 ? 1 : 2. col = no W ? 0 : no E ? 3 : (1 or 2 by x parity). INTERIOR tiles (row 2 type) whose single missing diagonal is SE or SW are replaced by the top row of the inner piece (the 2x3 stump: only its top ring matches a lava-side corner). NE/NW concave corners (rock-face side) have no art and stay plain; the rim there is a straight seam. Pools need height >= 3 (top pair + bottom row)'),
    wall=dict(type='wall_autotile_short_tall',
        short=dict(tiles=grid('wall_short', 4, 4), inner=R('wall_short_inner'), corner=corner_map('wall_short_inner', C4),
            rows='no N -> 0; no S -> 3 (face); else 1 if depth(N run)%2==1 else 2', cols='no W -> 0; no E -> 3; else 1 or 2 by x parity'),
        tall=dict(tiles=grid('wall_tall', 4, 6), inner_south=R('wall_tall_inner_south'), inner_north=R('wall_tall_inner_north'),
            corner_pair_south={'SE': [tile('wall_tall_inner_south', 0, 0), tile('wall_tall_inner_south', 0, 1)], 'SW': [tile('wall_tall_inner_south', 1, 0), tile('wall_tall_inner_south', 1, 1)]},
            corner_north={'NE': tile('wall_tall_inner_north', 0, 0), 'NW': tile('wall_tall_inner_north', 1, 0)},
            rows='no N -> 0; no S -> 5 (face lower); S present and S has no S -> 4 (face upper); else 1 if depth%2==1 else 2 (row 3 of the block is unused)', cols='no W -> 0; no E -> 3; else 1 or 2 by x parity'),
        choose='per vertical run: a column run of >= 4 wall cells uses tall (two-tile face), shorter runs use short',
        corners='interior tile (N,S,W,E present after cuts) with exactly one diagonal missing: NE/NW -> inner piece tile at the tile (short: E18/F18, tall: K19/L19). SE/SW -> short: E17/F17 at the tile; tall: the pair, top element on the tile ABOVE and bottom element on the tile (K14/K15 for SE, L14/L15 for SW). Variant (short/tall) of SE/SW follows the run of the neighbour whose face wraps (E for SE, W for SW)',
        cuts=['edge tile (no N; W,E,S present) and SE diagonal missing  -> cut edge to E neighbour',
              'edge tile (no N; W,E,S present) and SW diagonal missing  -> cut edge to W neighbour',
              'edge tile (no W; N,E,S present) and SE diagonal missing  -> cut edge to S neighbour',
              'edge tile (no E; N,W,S present) and SW diagonal missing  -> cut edge to S neighbour',
              'interior pinch (NE+SW diagonals missing)  -> cut E and S edges', 'interior pinch (NW+SE diagonals missing)  -> cut W and S edges',
              'repeat until stable. Cuts are VISUAL only; collision unchanged'],
        generator_cleanup=['delete 1-tile-wide stubs: (no N and no S) or (no E and no W), repeat until none', 'after cuts, delete any tile left thin']),
)
def stack(parts): return parts
data = dict(name='ash_volcano', tile=T, image='ash_volcano_atlas.png', size=[AW, AH], pieces=pieces, autotile=autotile,
    grass=dict(variants=['grass1', 'grass2', 'grass3', 'grass4'], note='clump grass drawn in groups, variant 1 -> 4 is a gradient (density/growth), anchor at the tile'),
    trees=dict(
        tree1=dict(size=[48, 64], pass_piece='tree1_pass', base_piece='tree1_base', stack='pass at (0,0) 48x32, base at (16,32) 32x32', anchor_feet=[32, 64], base_footprint_tiles=[[1, 2], [2, 2], [1, 3], [2, 3]]),
        tree2=dict(size=[48, 64], pass_piece='tree2_pass', base_piece='tree2_base', stack='pass at (0,0) 48x32, base at (16,32) 32x32', anchor_feet=[32, 64], base_footprint_tiles=[[1, 2], [2, 2], [1, 3], [2, 3]]),
        note='base tiles must sit on plain floor: never on lava, lava edge, wall or rock. tree2 is the darker dead tree'),
    rocks=[dict(piece=f'rock{i}_base', pass_piece=(f'rock{i}_pass' if f'rock{i}_pass' in place else None)) for i in range(1, 7)],
    skipped_empty=SKIPPED,
    terrain_rules=['no pit, no hedge in this biome', 'lava inner pieces are corner pieces (Jess), not islands', 'rocks r1/r4/r5 as specified use columns Q.. (spec said O..): the O columns hold lava stumps'],
    generator=dict(source='tools/make_tileset_ash_volcano.py', sheet='assets/tileset/volcano_test_tileset.png'))
os.makedirs(OUT, exist_ok=True)
atlas.save(os.path.join(OUT, 'ash_volcano_atlas.png'))
js = json.dumps(data, indent=1)
open(os.path.join(OUT, 'ash_volcano_atlas.json'), 'w').write(js)
open(os.path.join(OUT, 'ash_volcano_atlas.js'), 'w').write(
    '/* ash_volcano_atlas.js -- GENERATED by tools/make_tileset_ash_volcano.py, do not edit by hand.\n'
    ' * Same data as ash_volcano_atlas.json, as a script so the game works from file:// (no fetch). */\n'
    'G.TILESETS = G.TILESETS || {};\nG.TILESETS.ash_volcano = ' + js + ';\n')
print('atlas', atlas.size, 'pieces', len(pieces), 'skipped empty', SKIPPED, '->', OUT)
