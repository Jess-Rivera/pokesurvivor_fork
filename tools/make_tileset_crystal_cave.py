#!/usr/bin/env python3
"""
make_tileset_crystal_cave.py  --  bakes the Crystal Cave atlas from the raw Project Gaia sheet.

Reads  : assets/tileset/Project Gaia set.png        (native 16px tiles)
Writes : assets/tileset/crystal_cave/crystal_cave_atlas.png
         assets/tileset/crystal_cave/crystal_cave_atlas.json   (piece rects + autotile rules)
         assets/tileset/crystal_cave/crystal_cave_atlas.js     (same data as G.TILESETS.crystal_cave, file:// safe)

Tile labels follow the catalog: column letter A-H = x/16, row number = absolute y/16.
No colour filter: the Gaia crystal-cave art is already the target palette.
Baked here: deep-water inner pieces keep only the corner art (plain-water pixels transparent);
pit: the sheet draws the pit BLACK as the outer ring and the centre tile is the 'hole', so tiles are used
inside-out (see rules); concave-corner glow pieces are baked from the block corners with black keyed to transparent.
Needs: Pillow, numpy.
"""
import json, os, sys
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
if len(sys.argv) > 1: ROOT = sys.argv[1]
SRC = os.path.join(ROOT, 'assets', 'tileset', 'Project Gaia set.png')
OUT = os.path.join(ROOT, 'assets', 'tileset', 'crystal_cave')
T = 16
G = Image.open(SRC).convert('RGBA')

def box(s):
    a, _, b = s.partition('-'); b = b or a
    p = lambda t: ((ord(t[0]) - 65) * T, int(t[1:]) * T)
    (x0, y0), (x1, y1) = p(a), p(b)
    x0, x1 = sorted((x0, x1)); y0, y1 = sorted((y0, y1))
    return (x0, y0, x1 + T, y1 + T)
def crop(s): return G.crop(box(s))
def tl(im, c, r): return im.crop((c * T, r * T, c * T + T, r * T + T))

def key_outer_black(im):
    """black (0,0,0) connected to the image border becomes transparent; enclosed black (the pit) stays"""
    a = np.array(im); h, w = a.shape[:2]; blk = a[..., :3].sum(2) == 0
    seen = np.zeros((h, w), bool); q = deque()
    for y in range(h):
        for x in range(w):
            if (y in (0, h - 1) or x in (0, w - 1)) and blk[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and blk[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; q.append((yy, xx))
    a[seen, 3] = 0
    return Image.fromarray(a, 'RGBA')
def diff_mask(inner, base_tile):
    """2x2 inner piece: pixels identical to the plain interior tile become transparent"""
    a = np.array(inner); b = np.array(base_tile); out = a.copy()
    for ty in range(2):
        for tx in range(2):
            t = a[ty * T:ty * T + T, tx * T:tx * T + T]
            out[ty * T:ty * T + T, tx * T:tx * T + T, 3] = np.where((t == b).all(2), 0, 255)
    return Image.fromarray(out, 'RGBA')

# ---------------- source pieces (spec) ----------------
floor = crop('B532')
deep_block = crop('A534-C536'); deep_inner = diff_mask(crop('D534-E535'), tl(deep_block, 1, 1))
wall_block = crop('A526-C528'); wall_inner = crop('D527-E527')
# the inner tiles carry a few ground-tinted pixels (the sheet's ground showing in the notch); inside the wall they must be wall-pink,
# so fill them from the plain interior tile at the same position (otherwise the floor looks like it shows through)
GROUND_TINT = {(134, 102, 118), (112, 72, 96), (128, 88, 112)}
_wi = np.array(wall_inner); _in = np.array(tl(wall_block, 1, 1))
for _ty in range(1):
    for _tx in range(2):
        for _y in range(T):
            for _x in range(T):
                if tuple(_wi[_y, _tx * T + _x, :3]) in GROUND_TINT: _wi[_y, _tx * T + _x] = _in[_y, _x]
wall_inner = Image.fromarray(_wi, 'RGBA')
wall_sw, wall_se = tl(wall_inner, 0, 0), tl(wall_inner, 1, 0)      # D527 = SW concave corner, E527 = SE concave corner (seam-matched against the block)
pit_block = crop('D531-F533'); pit_inner = crop('G531-H532')       # opaque, used as-is
def key_black(t):
    a = np.array(t); a[..., 3] = np.where(a[..., :3].sum(2) == 0, 0, 255); return Image.fromarray(a, 'RGBA')
pit_concave = Image.new('RGBA', (32, 32), (0, 0, 0, 0))                  # glow-only quarter fillets, black transparent
for (dc, dr), (sc, sr) in {(0, 0): (0, 0), (1, 0): (2, 0), (0, 1): (0, 2), (1, 1): (2, 2)}.items():   # SE, SW, NE, NW cases
    pit_concave.paste(key_black(tl(pit_block, sc, sr)), (dc * T, dr * T))
ITEMS = [
    ('floor', floor), ('deep_block', deep_block), ('deep_inner', deep_inner),
    ('wall_block', wall_block), ('wall_inner_sw', wall_sw), ('wall_inner_se', wall_se),
    ('pit_block', pit_block), ('pit_inner', pit_inner), ('pit_concave', pit_concave),
    ('tree1_pass', crop('B537')), ('tree1_base', crop('B538')),
    ('tree2_pass', crop('C537-D537')), ('tree2_base', crop('C538-D538')), ('tree3_base', crop('A537')),
    ('rock1', crop('A539')), ('rock2_base', crop('B539-C539')), ('rock2_pass', crop('B540-C540')),
]
SRCL = dict(floor='B532', deep_block='A534-C536', deep_inner='D534-E535', wall_block='A526-C528', wall_inner_sw='D527', wall_inner_se='E527',
            pit_block='D531-F533', pit_inner='G531-H532', pit_concave='D531,F531,D533,F533 (black keyed)', tree1_pass='B537', tree1_base='B538', tree2_pass='C537-D537', tree2_base='C538-D538',
            tree3_base='A537', rock1='A539', rock2_base='B539-C539', rock2_pass='B540-C540')

# ---------------- pack ----------------
GUT = 2; AW = 192
order = sorted(ITEMS, key=lambda it: (-it[1].height, -it[1].width))
x = y = rowh = 0; place = {}
for name, im in order:
    if x + im.width > AW: x = 0; y += rowh + GUT; rowh = 0
    place[name] = (x, y, im.width, im.height); x += im.width + GUT; rowh = max(rowh, im.height)
AH = y + rowh
atlas = Image.new('RGBA', (AW, AH), (0, 0, 0, 0))
for name, im in ITEMS: atlas.paste(im, place[name][:2])
def R(n): return dict(zip('xywh', place[n]))
def tile(n, c, r): x0, y0, _, _ = place[n]; return dict(x=x0 + c * T, y=y0 + r * T, w=T, h=T)
def grid(n, cols, rows): return [[tile(n, c, r) for c in range(cols)] for r in range(rows)]
pieces = {n: dict(R(n), src=SRCL[n]) for n, _ in ITEMS}

DIAG_TILE = {'SE': (0, 0), 'SW': (1, 0), 'NE': (0, 1), 'NW': (1, 1)}
autotile = dict(
    floor=dict(type='base_only', tile=R('floor'), note='single ground tile; this biome has no ground patch and no grass'),
    water_deep=dict(type='edge_autotile_plus_inner_overlay', tiles=grid('deep_block', 3, 3), inner=R('deep_inner'),
        inner_tile_for_missing_diagonal={k: tile('deep_inner', *v) for k, v in DIAG_TILE.items()},
        rule='pick the edge/interior tile from (N,S,W,E) presence ([row][col]; row 0 = no N, row 2 = no S; col 0 = no W, col 2 = no E); then for each diagonal D whose two orthogonal neighbours are present but whose diagonal cell is not water, draw inner_tile_for_missing_diagonal[D] on top (corner art only, rest transparent). Same rule as Shady Forest water'),
    wall=dict(type='wall_autotile', tiles=grid('wall_block', 3, 3),
        interior=dict(note='tile has N,E,S,W (after cuts); look at which diagonals are missing. Only the SOUTH concave corners have art (cliff-face ends); NE/NW use the plain tile',
            none=tile('wall_block', 1, 1), SE=R('wall_inner_se'), SW=R('wall_inner_sw'), NE=tile('wall_block', 1, 1), NW=tile('wall_block', 1, 1),
            other='unsupported (two or more missing diagonals other than the pinch): generator must not produce it'),
        cuts=['edge tile (no N; W,E,S present) and SE diagonal missing  -> cut edge to E neighbour',
              'edge tile (no N; W,E,S present) and SW diagonal missing  -> cut edge to W neighbour',
              'edge tile (no W; N,E,S present) and SE diagonal missing  -> cut edge to S neighbour',
              'edge tile (no E; N,W,S present) and SW diagonal missing  -> cut edge to S neighbour',
              'interior pinch (NE+SW diagonals missing)  -> cut E and S edges',
              'interior pinch (NW+SE diagonals missing)  -> cut W and S edges',
              'repeat until stable. Cuts are VISUAL only; collision unchanged'],
        generator_cleanup=['delete 1-tile-wide stubs: (no N and no S) or (no E and no W), repeat until none', 'after cuts, delete any tile left thin']),
    pit=dict(type='pit_autotile', center=tile('pit_block', 1, 1),
        edge={'no_N': tile('pit_block', 1, 2), 'no_S': tile('pit_block', 1, 0), 'no_W': tile('pit_block', 2, 1), 'no_E': tile('pit_block', 0, 1)},
        convex_corner={'no_N_no_W': tile('pit_inner', 1, 1), 'no_N_no_E': tile('pit_inner', 0, 1), 'no_S_no_W': tile('pit_inner', 1, 0), 'no_S_no_E': tile('pit_inner', 0, 0)},
        concave_overlay={k: tile('pit_concave', *v) for k, v in {'SE': (0, 0), 'SW': (1, 0), 'NE': (0, 1), 'NW': (1, 1)}.items()},
        rule='The sheet draws the pit INSIDE-OUT: the black ring is the pit and the centre tile is the hole. So: all four neighbours -> centre tile (solid black); exactly one neighbour missing -> the block tile on the OPPOSITE side (no_N uses the block S tile, etc.); two adjacent neighbours missing (convex outer corner) -> the matching 2x2 inner tile; never two opposite or three missing (generator must delete such tiles, same cleanup as walls). Then for each diagonal D whose two orthogonal neighbours are present but whose cell is not pit, overlay concave_overlay[D] (glow only, black transparent). Rim light side is the outside edge'),
)
data = dict(name='crystal_cave', tile=T, image='crystal_cave_atlas.png', size=[AW, AH], pieces=pieces, autotile=autotile,
    trees=dict(
        tree1=dict(size=[16, 32], pass_piece='tree1_pass', base_piece='tree1_base', stack='pass at (0,0), base at (0,16)', anchor_feet=[8, 32], base_footprint_tiles=[[0, 1]]),
        tree2=dict(size=[32, 32], pass_piece='tree2_pass', base_piece='tree2_base', stack='pass at (0,0), base at (0,16)', anchor_feet=[16, 32], base_footprint_tiles=[[0, 1], [1, 1]]),
        tree3=dict(size=[16, 16], pass_piece=None, base_piece='tree3_base', stack='base only', anchor_feet=[8, 16], base_footprint_tiles=[[0, 0]]),
        note='base tiles must sit on plain floor: never on water, water edge, pit, pit edge, wall or rock'),
    rocks=[dict(piece='rock1', size=[16, 16]),
           dict(piece='rock2_base', pass_piece='rock2_pass', size=[32, 32], stack='base at (0,0), pass below it at (0,16)', note='ASSUMPTION: the pass piece is the fringe hanging below the base (walkable); confirm in game')],
    terrain_rules=['no ground patch, no grass in this biome', 'pit is its own terrain: black void with glowing frame, behaves like a wall for generation'],
    generator=dict(source='tools/make_tileset_crystal_cave.py', gaia_labels='column A-H = x/16, row = absolute y/16'))
os.makedirs(OUT, exist_ok=True)
atlas.save(os.path.join(OUT, 'crystal_cave_atlas.png'))
js = json.dumps(data, indent=1)
open(os.path.join(OUT, 'crystal_cave_atlas.json'), 'w').write(js)
open(os.path.join(OUT, 'crystal_cave_atlas.js'), 'w').write(
    '/* crystal_cave_atlas.js -- GENERATED by tools/make_tileset_crystal_cave.py, do not edit by hand.\n'
    ' * Same data as crystal_cave_atlas.json, as a script so the game works from file:// (no fetch). */\n'
    'G.TILESETS = G.TILESETS || {};\nG.TILESETS.crystal_cave = ' + js + ';\n')
print('atlas', atlas.size, 'pieces', len(pieces), '->', OUT)
