#!/usr/bin/env python3
"""
tileset_mockup_ash_volcano.py -- reference renderer for the Ash Volcano tileset.

Reads ONLY assets/tileset/ash_volcano/ash_volcano_atlas.{png,json} (plus Pokemon sprites for the demo) and draws a scene
using the autotile rules recorded in the JSON. MOCKUP / reference for the rules, not game code.
  python3 tools/tileset_mockup_ash_volcano.py [out.png]      Needs: Pillow, numpy.
"""
import csv, json, math, os, re, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
TS_DIR = os.path.join(ROOT, 'assets', 'tileset', 'ash_volcano')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets', 'tileset', 'catalog', 'Ash_Volcano_final_mockup.png')
D = json.load(open(os.path.join(TS_DIR, 'ash_volcano_atlas.json')))
ATLAS = Image.open(os.path.join(TS_DIR, D['image'])).convert('RGBA')
T = D['tile']; PX = 2

def rect(r): return ATLAS.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))
def piece(n): return rect(D['pieces'][n])

# ---------------- masks ----------------
W_T, H_T = 38, 22
def ellipse(cx, cy, rx, ry):
    m = np.zeros((H_T, W_T), bool)
    for y in range(H_T):
        for x in range(W_T):
            if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1: m[y, x] = True
    return m
def rects(rs):
    m = np.zeros((H_T, W_T), bool)
    for x0, y0, x1, y1 in rs: m[y0:y1 + 1, x0:x1 + 1] = True
    return m
def cleanup(B):
    B = B.copy(); h, w = B.shape; removed = 0
    while True:
        p = np.pad(B, 1); ch = False
        for y in range(h):
            for x in range(w):
                if not B[y, x]: continue
                N, S, Wn, E = p[y, x + 1], p[y + 2, x + 1], p[y + 1, x], p[y + 1, x + 2]
                if (not N and not S) or (not E and not Wn): B[y, x] = False; ch = True; removed += 1
        if not ch: break
    return B



DIAGS = dict(NW=(-1, -1), NE=(-1, 1), SW=(1, -1), SE=(1, 1))
def nbrs(p, y, x): return p[y, x + 1], p[y + 2, x + 1], p[y + 1, x], p[y + 1, x + 2]   # N, S, W, E

def draw_floor(cv, rule, w, h):
    f = rect(rule['tile'])
    for y in range(h):
        for x in range(w): cv.alpha_composite(f.crop(((x % 2) * T, (y % 2) * T, (x % 2) * T + T, (y % 2) * T + T)), (x * T, y * T))

def pond_cleanup(B):
    """opposite sides open -> delete; interior tile with 2+ missing diagonals -> delete; repeat"""
    B = B.copy()
    while True:
        p = np.pad(B, 1); ch = False
        for y in range(B.shape[0]):
            for x in range(B.shape[1]):
                if not B[y, x]: continue
                N, S, Wn, E = nbrs(p, y, x)
                bad = (not N and not S) or (not E and not Wn)
                if not bad and N and S and Wn and E:
                    if sum(not p[y + 1 + dy, x + 1 + dx] for dy, dx in DIAGS.values()) >= 2: bad = True
                if bad: B[y, x] = False; ch = True
        if not ch: break
    return B

def replace_autotile(cv, B, rule):
    """3x3 block; interior tile + one missing diagonal -> replaced by the inner tile"""
    tiles = rule['tiles']; m = rule['inner_tile_for_missing_diagonal']; p = np.pad(B, 1)
    for y in range(B.shape[0]):
        for x in range(B.shape[1]):
            if not B[y, x]: continue
            N, S, Wn, E = nbrs(p, y, x)
            row = 0 if not N else (2 if not S else 1); col = 0 if not Wn else (2 if not E else 1)
            t = rect(tiles[row][col])
            if N and S and Wn and E:
                for name, (dy, dx) in DIAGS.items():
                    if not p[y + 1 + dy, x + 1 + dx]: t = rect(m[name])
            cv.alpha_composite(t, (x * T, y * T))

def deep_autotile(cv, B, rule):
    tiles = rule['tiles']; m = rule['inner_tile_for_missing_diagonal']; p = np.pad(B, 1)
    h, w = B.shape
    def depth(y, x):
        d = 0
        while y - d - 1 >= 0 and B[y - d - 1, x]: d += 1
        return d
    def rtype(y, x):                       # 0/1 = rock face rows at the top, 2 = lava, 3 = bottom rim
        if not (0 <= y < h and 0 <= x < w and B[y, x]): return None
        d = depth(y, x); S = y + 1 < h and B[y + 1, x]
        return 3 if not S else (0 if d == 0 else (1 if d == 1 else 2))
    for y in range(h):
        for x in range(w):
            if not B[y, x]: continue
            N, S, Wn, E = nbrs(p, y, x)
            row = rtype(y, x)
            col = 0 if not Wn else (3 if not E else 1 + (x % 2))
            t = rect(tiles[row][col])
            if N and S and Wn and E and row == 2:
                miss = [k for k, (dy, dx) in DIAGS.items() if not p[y + 1 + dy, x + 1 + dx]]
                if len(miss) == 1 and miss[0] in ('SE', 'SW'): t = rect(m[miss[0]])
            cv.alpha_composite(t, (x * T, y * T))

# ---------------- walls: cuts + pinch + stub deletion (same family as Shady Forest / Crystal Cave) ----------------
def wall_analyse_core(B):
    h, w = B.shape; cuts = set()
    def pres(y, x, dy, dx, orth=True):
        yy, xx = y + dy, x + dx
        if yy < 0 or xx < 0 or yy >= h or xx >= w or not B[yy, xx]: return False
        if orth and frozenset(((y, x), (yy, xx))) in cuts: return False
        return True
    def addcut(a, b):
        k = frozenset((a, b))
        if k in cuts: return False
        cuts.add(k); return True
    for _ in range(12):
        new = False
        for y in range(h):
            for x in range(w):
                if not B[y, x]: continue
                N, E, S, Wn = pres(y, x, -1, 0), pres(y, x, 0, 1), pres(y, x, 1, 0), pres(y, x, 0, -1)
                d = dict(NW=pres(y, x, -1, -1, False), NE=pres(y, x, -1, 1, False), SW=pres(y, x, 1, -1, False), SE=pres(y, x, 1, 1, False))
                if N and E and S and Wn:
                    miss = {k for k, v in d.items() if not v}
                    if miss == {'NE', 'SW'}: new |= addcut((y, x), (y, x + 1)); new |= addcut((y, x), (y + 1, x))
                    elif miss == {'NW', 'SE'}: new |= addcut((y, x), (y, x - 1)); new |= addcut((y, x), (y + 1, x))
                    continue
                if not N and Wn and E and S and not d['SE']: new |= addcut((y, x), (y, x + 1))
                if not N and Wn and E and S and not d['SW']: new |= addcut((y, x), (y, x - 1))
                if not Wn and N and E and S and not d['SE']: new |= addcut((y, x), (y + 1, x))
                if not E and N and Wn and S and not d['SW']: new |= addcut((y, x), (y + 1, x))
        if not new: break
    specs = {}
    for y in range(h):
        for x in range(w):
            if not B[y, x]: continue
            N, E, S, Wn = pres(y, x, -1, 0), pres(y, x, 0, 1), pres(y, x, 1, 0), pres(y, x, 0, -1)
            d = dict(NW=pres(y, x, -1, -1, False), NE=pres(y, x, -1, 1, False), SW=pres(y, x, 1, -1, False), SE=pres(y, x, 1, 1, False))
            row = 0 if not N else (2 if not S else 1); col = 0 if not Wn else (2 if not E else 1)
            if (not N and not S) or (not E and not Wn): specs[(y, x)] = ('bad', row, col); continue
            if N and E and S and Wn:
                miss = frozenset(k for k, v in d.items() if not v)
                if not miss: specs[(y, x)] = ('tile', 1, 1)
                elif len(miss) == 1: specs[(y, x)] = ('inner_' + next(iter(miss)).lower(), 1, 1)
                else: specs[(y, x)] = ('bad', 1, 1)
            else: specs[(y, x)] = ('tile', row, col)
    return cuts, specs
def wall_analyse(B):
    B = cleanup(B)
    for _ in range(20):
        cuts, specs = wall_analyse_core(B)
        bad = [k for k, v in specs.items() if v[0] == 'bad']
        if not bad: break
        for (y, x) in bad: B[y, x] = False
        B = cleanup(B)
    return B, cuts, specs
def draw_walls(cv, B0, rule):
    B, cuts, specs = wall_analyse(B0)
    h, w = B.shape
    def pres(y, x, dy, dx):
        yy, xx = y + dy, x + dx
        if yy < 0 or xx < 0 or yy >= h or xx >= w or not B[yy, xx]: return False
        return frozenset(((y, x), (yy, xx))) not in cuts
    def run(y, x):                       # (depth from top, depth to bottom) through the column, honouring cuts
        a = 0
        while pres(y - a, x, -1, 0): a += 1
        b = 0
        while pres(y + b, x, 1, 0): b += 1
        return a, b
    S_, TL = rule['short'], rule['tall']
    def variant(y, x):
        a, b = run(y, x); return 'tall' if a + b + 1 >= 4 else 'short'
    tiles = {}
    for (y, x), (kind, _, _) in specs.items():
        a, b = run(y, x); v = 'tall' if a + b + 1 >= 4 else 'short'
        N, S, Wn, E = pres(y, x, -1, 0), pres(y, x, 1, 0), pres(y, x, 0, -1), pres(y, x, 0, 1)
        col = 0 if not Wn else (3 if not E else 1 + (x % 2))
        if v == 'short':
            row = 0 if not N else (3 if not S else (1 if a % 2 == 1 else 2)); tiles[(y, x)] = rect(S_['tiles'][row][col])
        else:
            if not N: row = 0
            elif not S: row = 5
            elif not pres(y + 1, x, 1, 0): row = 4
            else: row = 1 if a % 2 == 1 else 2
            tiles[(y, x)] = rect(TL['tiles'][row][col])
    # concave corners (override), pairs for tall SE/SW
    for (y, x), (kind, _, _) in specs.items():
        if not kind.startswith('inner_'): continue
        d = kind[6:].upper()
        if d in ('NE', 'NW'):
            v = variant(y, x)
            tiles[(y, x)] = rect(S_['corner'][d]) if v == 'short' else rect(TL['corner_north'][d])
        else:
            nb = (y, x + 1) if d == 'SE' else (y, x - 1)
            v = variant(*nb) if nb in specs else variant(y, x)
            if v == 'short': tiles[(y, x)] = rect(S_['corner'][d])
            else:
                top, bot = TL['corner_pair_south'][d]
                tiles[(y, x)] = rect(bot)
                if (y - 1, x) in tiles: tiles[(y - 1, x)] = rect(top)
    for (y, x), t in tiles.items(): cv.alpha_composite(t, (x * T, y * T))
    return B

# ---------------- sprites (demo only) ----------------
META = open(os.path.join(ROOT, 'js', 'data', 'sprites-meta.js'), encoding='utf-8').read()
HEIGHTS = {int(r['species_id']): int(r['height']) / 10 for r in csv.DictReader(open(os.path.join(ROOT, 'pokeapi-master', 'data', 'v2', 'csv', 'pokemon.csv'))) if r['is_default'] == '1'}
def idle(pid):
    line = re.search(r'^\s*%d:\s*\{.*$' % pid, META, re.M).group(0)
    w, h, ax, ay = re.search(r'"Idle":\{"w":(\d+),"h":(\d+).*?"ax":([\d.]+),"ay":([\d.]+)', line).groups()
    w, h, ax, ay = int(w), int(h), float(ax), float(ay)
    fr = Image.open(os.path.join(ROOT, 'assets', 'pokemon', str(pid), 'Idle.png')).convert('RGBA').crop((0, 0, w, h))
    bb = fr.getbbox(); return fr, ax, ay, bb[3] - bb[1]
def mock_scale(pid, oh):   # mockup-only sizing proposal (see design/shady-forest-tileset-spec.md); NOT game code
    tgt = 22 + 42 * math.log(max(HEIGHTS[pid], 0.3) / 0.3) / math.log(8.8 / 0.3)
    k = max(1, min(2, round(tgt / oh * 2) / 2))
    while k > 1 and oh * k > 64: k -= 0.5
    return k
def shadow(w, h):
    s = Image.new('RGBA', (w, h), (0, 0, 0, 0)); px = s.load(); cx, cy = (w - 1) / 2, (h - 1) / 2
    for y in range(h):
        for x in range(w):
            if ((x - cx) / (w / 2)) ** 2 + ((y - cy) / (h / 2)) ** 2 <= 1: px[x, y] = (0, 0, 0, 70)
    return s
def draw_mon(cv, pid, x, feet):
    fr, ax, ay, oh = idle(pid); sc = mock_scale(pid, oh); k = PX * sc
    big = fr.resize((int(fr.width * k), int(fr.height * k)), Image.NEAREST)
    sw = max(12, int(fr.width * 0.5 * k)); sh = shadow(sw, int(5 * k / 1.2) + 2)
    cv.alpha_composite(sh, (int(x - sw / 2), int(feet - sh.height / 2)))
    cv.alpha_composite(big, (int(x - ax * k), int(feet - ay * k)))

# ---------------- scene ----------------
def main():
    A = D['autotile']
    cv = Image.new('RGBA', (W_T * T, H_T * T)); draw_floor(cv, A['floor'], W_T, H_T)
    patch = pond_cleanup(ellipse(7.5, 16.0, 5.6, 3.3))
    shallow = pond_cleanup(ellipse(30, 6.5, 4.8, 3.0))
    deep = pond_cleanup(ellipse(30.5, 16.5, 5.2, 4.2))
    walls = rects([(1, 1, 8, 5), (9, 3, 12, 8), (14, 1, 17, 3), (3, 6, 5, 8), (16, 5, 22, 6), (19, 7, 21, 10)])
    replace_autotile(cv, patch, A['ground_patch'])
    replace_autotile(cv, shallow, A['lava_shallow'])
    deep_autotile(cv, deep, A['lava_deep'])
    walls = draw_walls(cv, walls, A['wall'])
    blocked = shallow | deep | walls
    big = cv.resize((cv.width * PX, cv.height * PX), Image.NEAREST)
    def free(tx, ty, w=1, h=1): return not blocked[max(ty - h + 1, 0):ty + 1, tx:tx + w].any()
    objs = []
    t1 = Image.new('RGBA', (48, 64)); t1.alpha_composite(piece('tree1_pass'), (0, 0)); t1.alpha_composite(piece('tree1_base'), (16, 32))
    t2 = Image.new('RGBA', (48, 64)); t2.alpha_composite(piece('tree2_pass'), (0, 0)); t2.alpha_composite(piece('tree2_base'), (16, 32))
    for im, tx, ty in [(t1, 1, 12), (t2, 13, 12), (t1, 17, 20), (t2, 24, 20), (t1, 36, 12)]:
        assert free(tx + 1, ty, 2, 2), ('tree', tx, ty); objs.append((ty * T + 16, im, tx * T, (ty - 3) * T))
    def rock(n, tx, ty):
        b = piece(n + '_base'); pn = n + '_pass'; p = piece(pn) if pn in D['pieces'] else None
        w = b.width // T; assert free(tx, ty, w), (n, tx, ty)
        im = Image.new('RGBA', (b.width, b.height + (p.height if p else 0))); 
        if p: im.alpha_composite(p, (0, 0))
        im.alpha_composite(b, (0, p.height if p else 0)); objs.append((ty * T + 16, im, tx * T, ty * T + 16 - im.height))
    for n, tx, ty in [('rock1', 10, 11), ('rock2', 12, 9), ('rock3', 6, 12), ('rock4', 20, 13), ('rock5', 15, 17), ('rock6', 22, 16), ('rock1', 28, 12), ('rock4', 5, 20)]:
        rock(n, tx, ty)
    for g, tx, ty in [('grass1', 3, 18), ('grass2', 4, 18), ('grass3', 3, 19), ('grass4', 4, 19), ('grass1', 10, 14), ('grass2', 11, 14), ('grass3', 11, 13), ('grass2', 9, 20), ('grass4', 10, 20), ('grass1', 34, 20), ('grass3', 35, 20), ('grass4', 35, 19)]:
        assert free(tx, ty), (g, tx, ty); objs.append((ty * T + 16, piece(g), tx * T, ty * T))
    objs.sort(key=lambda o: o[0])
    for fy, im, x, y in objs:
        big.alpha_composite(im.resize((im.width * PX, im.height * PX), Image.NEAREST), (x * PX, y * PX))
    for pid, tx, ty in [(19, 8, 12), (25, 17, 14), (6, 25, 12), (143, 14, 16), (249, 12, 14), (38, 33, 10)]:
        assert free(tx, ty), ('mon', tx, ty)
        draw_mon(big, pid, tx * T * PX + 16, ty * T * PX)
    out = Image.new('RGBA', (big.width, big.height + 34), (18, 18, 18, 255)); out.paste(big, (0, 34))
    d = ImageDraw.Draw(out)
    d.text((6, 4), 'Ash Volcano: drawn only from ash_volcano_atlas.png + .json (floor, patch, shallow + deep lava, short + tall walls, trees, rocks, grass)', fill=(255, 230, 80, 255))
    d.text((6, 18), 'lava inner pieces used as corners; tall wall = run of 4+ cells (two-tile face); no pit / hedge in this biome. mockup sprite sizes are a proposal', fill=(200, 200, 200, 255))
    os.makedirs(os.path.dirname(OUT), exist_ok=True); out.save(OUT); print('saved', OUT, out.size)
main()
