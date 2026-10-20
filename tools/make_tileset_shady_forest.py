#!/usr/bin/env python3
"""
make_tileset_shady_forest.py  --  bakes the Shady Forest atlas from the raw Project Gaia sheet.

Reads  : assets/tileset/Project Gaia set.png        (native 16px tiles; the source stays in the repo)
Writes : assets/tileset/shady_forest/shady_forest_atlas.png
         assets/tileset/shady_forest/shady_forest_atlas.json   (piece rects + autotile rules)
         assets/tileset/shady_forest/shady_forest_atlas.js     (same data as G.TILESETS.shady_forest,
                                                                 for file:// play, no fetch)

Tile labels follow the catalog: column letter A-H = x/16, row number = y/16 (absolute).
Filters (baked here, offline): wall + rocks = gradient map, water = mute, hedge = mean-colour match to floor.
Needs: Pillow, numpy.   Run from anywhere:  python3 tools/make_tileset_shady_forest.py
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(ROOT, 'assets', 'tileset', 'Project Gaia set.png')
OUT = os.path.join(ROOT, 'assets', 'tileset', 'shady_forest')
if len(sys.argv) > 1: ROOT = sys.argv[1]; SRC = os.path.join(ROOT, 'assets', 'tileset', 'Project Gaia set.png'); OUT = os.path.join(ROOT, 'assets', 'tileset', 'shady_forest')
T = 16
G = Image.open(SRC).convert('RGBA')

def box(s):
    a, _, b = s.partition('-'); b = b or a
    p = lambda t: ((ord(t[0]) - 65) * T, int(t[1:]) * T)
    (x0, y0), (x1, y1) = p(a), p(b)
    x0, x1 = sorted((x0, x1)); y0, y1 = sorted((y0, y1))
    return (x0, y0, x1 + T, y1 + T)
def crop(s): return G.crop(box(s))

# ---------------- filters ----------------
def hexc(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
WALL = [(0, hexc('#26301f')), (0.30, hexc('#3e4934')), (0.62, hexc('#5d6e49')), (1.0, hexc('#88a06e'))]
ROCK = [(0, hexc('#3d444c')), (0.45, hexc('#5e6670')), (0.75, hexc('#7f8893')), (1.0, hexc('#a1aab4'))]
def gradient_map(im, stops, lo=None, hi=None):
    a = np.array(im).astype(float); rgb = a[..., :3]; al = a[..., 3]
    lum = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]) / 255
    m = al > 0
    if lo is None: lo, hi = np.percentile(lum[m], 2), np.percentile(lum[m], 98)
    t = np.clip((lum - lo) / max(hi - lo, 1e-6), 0, 1)
    xs = [s[0] for s in stops]; out = np.zeros_like(rgb)
    for c in range(3): out[..., c] = np.interp(t, xs, [s[1][c] for s in stops])
    a[..., :3] = out
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
def mute(im, sat=0.62, val=0.84):
    a = np.array(im).astype(float); g = a[..., :3].mean(2, keepdims=True)
    a[..., :3] = (g + (a[..., :3] - g) * sat) * val
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
def match_mean(im, ref, strength=1.0):
    a = np.array(im).astype(float); r = np.array(ref).astype(float)
    ca = a[a[..., 3] > 0][:, :3].mean(0); cr = r[r[..., 3] > 0][:, :3].mean(0)
    gain = np.clip(cr / ca, 0.6, 1.4); gain = 1 + (gain - 1) * strength
    a[..., :3] *= gain
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')

# ---------------- source pieces (spec) ----------------
floor_block, floor_inner = crop('D213-F215'), crop('G216-H217')
patch_block, patch_inner = crop('A216-C218'), crop('G218-H219')
shal_block, shal_inner = mute(crop('A50-C52')), mute(crop('G51-H52'))
deep_block, deep_inner = mute(crop('A47-C49')), mute(crop('G47-H48'))
def keep_corner_art(im):
    """water inner pieces are drawn over an ordinary edge/interior tile, so make the plain-water pixels transparent"""
    a = np.array(im); water = (a[..., 2].astype(int) - a[..., 0].astype(int)) >= 40
    a[water, 3] = 0
    return Image.fromarray(a, 'RGBA')
shal_inner, deep_inner = keep_corner_art(shal_inner), keep_corner_art(deep_inner)
# wall: block + the two inner-corner tiles are filtered together so the colour ramps agree
w_raw_block, w_raw_inner = crop('A446-C448'), crop('G446-H447')
tmp = Image.new('RGBA', (48 + 32, 48)); tmp.paste(w_raw_block, (0, 0)); tmp.paste(w_raw_inner, (48, 0))
tmp = gradient_map(tmp, WALL)
wall_block = tmp.crop((0, 0, 48, 48))
wall_se = tmp.crop((48, 0, 64, 16))      # G446: used when the SE diagonal is missing
wall_sw = tmp.crop((64, 0, 80, 16))      # H446: used when the SW diagonal is missing
floor_ref = floor_block.crop((16, 16, 32, 32))
def hed(s): return match_mean(crop(s), floor_ref)
trees = dict(t1_pass=crop('F43'), t1_base=crop('F44'), t2_pass=crop('A10-D11'), t2_base=crop('B12-C12'))
rocks = [gradient_map(crop(s), ROCK, lo=0.1, hi=0.8) for s in ('H455', 'F453-F454', 'H451')]

# ---------------- pack ----------------
ITEMS = [  # (name, image, extra)
    ('floor_block', floor_block), ('floor_inner', floor_inner),
    ('patch_block', patch_block), ('patch_inner', patch_inner),
    ('shallow_block', shal_block), ('shallow_inner', shal_inner),
    ('deep_block', deep_block), ('deep_inner', deep_inner),
    ('wall_block', wall_block), ('wall_inner_se', wall_se), ('wall_inner_sw', wall_sw),
    ('hedge_fill', hed('D666-E667')), ('hedge_top', hed('F667-H667')), ('hedge_bottom', hed('F666-H666')),
    ('hedge_thin_h', hed('D668-F668')), ('hedge_thin_v', hed('H668-H670')), ('hedge_single', hed('G668')),
    ('tree1_pass', trees['t1_pass']), ('tree1_base', trees['t1_base']),
    ('tree2_pass', trees['t2_pass']), ('tree2_base', trees['t2_base']),
    ('rock1', rocks[0]), ('rock2', rocks[1]), ('rock3', rocks[2]),
]
GUT = 2; AW = 256
order = sorted(ITEMS, key=lambda it: (-it[1].height, -it[1].width))
x = y = rowh = 0; place = {}
for name, im in order:
    if x + im.width > AW: x = 0; y += rowh + GUT; rowh = 0
    place[name] = (x, y, im.width, im.height); x += im.width + GUT; rowh = max(rowh, im.height)
AH = y + rowh
atlas = Image.new('RGBA', (AW, AH), (0, 0, 0, 0))
for name, im in ITEMS: atlas.paste(im, place[name][:2])

def R(name): return dict(zip('xywh', place[name]))
def tile(name, col, row):
    x0, y0, _, _ = place[name]; return dict(x=x0 + col * T, y=y0 + row * T, w=T, h=T)
def grid(name, cols, rows): return [[tile(name, c, r) for c in range(cols)] for r in range(rows)]

src = dict(floor_block='D213-F215', floor_inner='G216-H217', patch_block='A216-C218', patch_inner='G218-H219',
           shallow_block='A50-C52', shallow_inner='G51-H52', deep_block='A47-C49', deep_inner='G47-H48',
           wall_block='A446-C448', wall_inner_se='G446', wall_inner_sw='H446',
           hedge_fill='D666-E667', hedge_top='F667-H667', hedge_bottom='F666-H666', hedge_thin_h='D668-F668',
           hedge_thin_v='H668-H670', hedge_single='G668', tree1_pass='F43', tree1_base='F44', tree2_pass='A10-D11',
           tree2_base='B12-C12', rock1='H455', rock2='F453-F454', rock3='H451')
pieces = {n: dict(R(n), src=src[n]) for n, _ in ITEMS}

def quad(block, inner):
    return dict(type='quad_autotile',
        tiles=grid(block, 3, 3),          # [row][col]; row 0 = no N neighbour, row 2 = no S; col 0 = no W, col 2 = no E
        inner=R(inner),                   # 32x32 cross piece; quadrants of 8x8 are pasted into edge tiles
        inner_quadrants={'NW': dict(src=[0, 0], dst=[0, 0]), 'NE': dict(src=[24, 0], dst=[8, 0]),
                         'SW': dict(src=[0, 24], dst=[0, 8]), 'SE': dict(src=[24, 24], dst=[8, 8])},
        rule='tile=tiles[row][col] from (N,S,W,E) presence; for each diagonal D whose two orthogonal neighbours are both present but the diagonal cell is not, paste inner quadrant D onto that corner of the tile')
def overlay(block, inner):
    return dict(type='edge_autotile_plus_inner_overlay',
        tiles=grid(block, 3, 3),          # [row][col]; row 0 = no N neighbour, row 2 = no S; col 0 = no W, col 2 = no E
        inner=R(inner),                   # 32x32 = 2x2 tiles, water pixels already transparent
        inner_tile_for_missing_diagonal={'SE': tile(inner, 0, 0), 'SW': tile(inner, 1, 0), 'NE': tile(inner, 0, 1), 'NW': tile(inner, 1, 1)},
        rule='pick the edge/interior tile from (N,S,W,E) presence; then for each diagonal D whose two orthogonal neighbours are both present but whose diagonal cell is not water, draw inner_tile_for_missing_diagonal[D] on top of it (it only has the corner art, the rest is transparent). All four diagonals are used (tested: dropping the south ones leaves square notches in deep water)')
autotile = dict(
    floor=dict(type='base_only', base_tile=tile('floor_block', 1, 1), edge_tiles=grid('floor_block', 3, 3), inner=R('floor_inner'),
               note='base ground fill is the centre tile. Edge/inner pieces are packed but their autotile rule is NOT verified or used'),
    ground_patch=quad('patch_block', 'patch_inner'),
    water_shallow=overlay('shallow_block', 'shallow_inner'),
    water_deep=overlay('deep_block', 'deep_inner'),
    wall=dict(type='wall_autotile',
        tiles=grid('wall_block', 3, 3),
        interior=dict(note='tile has N,E,S,W (after cuts). Look at which diagonals are missing',
            none=tile('wall_block', 1, 1), SE=R('wall_inner_se'), SW=R('wall_inner_sw'),
            NE=tile('wall_block', 1, 0), NW=tile('wall_block', 1, 0), other='unsupported: generator must not produce it'),
        cuts=['edge tile (no N; W,E,S present) and SE diagonal missing  -> cut edge to E neighbour',
              'edge tile (no N; W,E,S present) and SW diagonal missing  -> cut edge to W neighbour',
              'edge tile (no W; N,E,S present) and SE diagonal missing  -> cut edge to S neighbour',
              'edge tile (no E; N,W,S present) and SW diagonal missing  -> cut edge to S neighbour',
              'interior pinch (NE+SW diagonals missing)  -> cut E and S edges (tile joins the NW lobe)',
              'interior pinch (NW+SE diagonals missing)  -> cut W and S edges (tile joins the NE lobe)',
              'repeat until stable. Cuts are VISUAL only (each side renders as its own blob); collision is unchanged'],
        generator_cleanup=['delete 1-tile-wide stubs: (no N and no S) or (no E and no W), repeat until none',
                           'after cuts, delete any tile left thin'],
        stress_test='300 random blob shapes, 20.5k tiles, 0 unsupported'),
)
hedge = dict(type='hedge_patch',
    pieces=dict(fill=R('hedge_fill'), top=R('hedge_top'), bottom=R('hedge_bottom'),
                thin_h=R('hedge_thin_h'), thin_v=R('hedge_thin_v'), single=R('hedge_single')),
    layout='w>=3,h>=3 tiles. Row 0 = top (left/mid/right = tile 0/1/2 of hedge_top, mid repeats). Last row = bottom (same with hedge_bottom). Rows between = hedge_fill 2x2 variants picked by (x%2, y%2). Thin 1-wide hedges use thin_h / thin_v, a lone bush uses single.',
    occlusion=dict(
        applies_to='every Pokemon (player and enemies) whose feet tile is a hedge tile',
        height_art_px=9, height_screen_px_at_PX2=18,
        measured_from='feet anchor (ay in sprites-meta); fixed regardless of sprite scale',
        edge='jagged tufts: edge offset in {-3,-1,+1,+3} screen px, 3 art-px wide steps, deterministic hash of WORLD x only (never y, never random per frame), no dark rim',
        draw='after the sprite, redraw the hedge tiles under it for y in [feet-H+tuft, feet+7 art-px]; mask by hedge tile alpha',
        projectiles_and_hud='draw above the hedge, not occluded'))
tree1 = dict(size=[16, 32], pass_=R('tree1_pass'), base=R('tree1_base'), stack='pass at (0,0), base at (0,16)', anchor_feet=[8, 32], base_footprint_tiles=[[0, 1]])
tree2 = dict(size=[64, 48], pass_=R('tree2_pass'), base=R('tree2_base'), stack='pass at (0,0), base at (16,32)', anchor_feet=[32, 48], base_footprint_tiles=[[1, 2], [2, 2]])
for t in (tree1, tree2): t['pass'] = t.pop('pass_'); t['note'] = 'canopy (pass) draws over entities, base (impass) blocks; base tiles must sit on plain floor: never on water, water edge, patch, patch edge, wall or rock'
data = dict(name='shady_forest', tile=T, image='shady_forest_atlas.png', size=[AW, AH], pieces=pieces, autotile=autotile,
            hedge=hedge, trees=dict(tree1=tree1, tree2=tree2),
            rocks=[dict(piece=n, size=[pieces[n]['w'], pieces[n]['h']]) for n in ('rock1', 'rock2', 'rock3')],
            terrain_rules=['shallow and deep water are separate lakes, never mixed', 'tall grass is not in this tileset'],
            generator=dict(source='tools/make_tileset_shady_forest.py', gaia_labels='column A-H = x/16, row = absolute y/16'))
os.makedirs(OUT, exist_ok=True)
atlas.save(os.path.join(OUT, 'shady_forest_atlas.png'))
js = json.dumps(data, indent=1)
open(os.path.join(OUT, 'shady_forest_atlas.json'), 'w').write(js)
open(os.path.join(OUT, 'shady_forest_atlas.js'), 'w').write(
    '/* shady_forest_atlas.js -- GENERATED by tools/make_tileset_shady_forest.py, do not edit by hand.\n'
    ' * Same data as shady_forest_atlas.json, as a script so the game works from file:// (no fetch). */\n'
    'G.TILESETS = G.TILESETS || {};\nG.TILESETS.shady_forest = ' + js + ';\n')
print('atlas', atlas.size, 'pieces', len(pieces), '->', OUT)
