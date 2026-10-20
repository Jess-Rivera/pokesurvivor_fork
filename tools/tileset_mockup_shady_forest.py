#!/usr/bin/env python3
"""
tileset_mockup_shady_forest.py -- reference renderer for the Shady Forest tileset.

Reads ONLY assets/tileset/shady_forest/shady_forest_atlas.{png,json} (plus Pokemon sprites for the
demo) and draws a scene using the autotile rules recorded in the JSON. If this picture is right,
the atlas + mapping are complete. It is a MOCKUP / reference for the rules, not game code.

  python3 tools/tileset_mockup_shady_forest.py [out.png]
Needs: Pillow, numpy.
"""
import csv, json, math, os, re, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
TS_DIR = os.path.join(ROOT, 'assets', 'tileset', 'shady_forest')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets', 'tileset', 'catalog', 'Shady_Forest_final_mockup.png')
D = json.load(open(os.path.join(TS_DIR, 'shady_forest_atlas.json')))
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

# ---------------- quad autotile (floor-like terrains) ----------------
def quad_autotile(cv, B, rule):
    tiles = rule['tiles']; inner = rect(rule['inner']); q = rule['inner_quadrants']
    p = np.pad(B, 1)
    for y in range(B.shape[0]):
        for x in range(B.shape[1]):
            if not B[y, x]: continue
            N, S, Wn, E = p[y, x + 1], p[y + 2, x + 1], p[y + 1, x], p[y + 1, x + 2]
            row = 0 if not N else (2 if not S else 1); col = 0 if not Wn else (2 if not E else 1)
            t = rect(tiles[row][col]).copy()
            for name, (dy, dx, ok) in dict(NW=(-1, -1, N and Wn), NE=(-1, 1, N and E), SW=(1, -1, S and Wn), SE=(1, 1, S and E)).items():
                if ok and not p[y + 1 + dy, x + 1 + dx]:
                    sx, sy = q[name]['src']; dxx, dyy = q[name]['dst']
                    t.paste(inner.crop((sx, sy, sx + 8, sy + 8)), (dxx, dyy))
            cv.alpha_composite(t, (x * T, y * T))

def overlay_autotile(cv, B, rule):
    tiles = rule['tiles']; m = rule['inner_tile_for_missing_diagonal']; p = np.pad(B, 1)
    for y in range(B.shape[0]):
        for x in range(B.shape[1]):
            if not B[y, x]: continue
            N, S, Wn, E = p[y, x + 1], p[y + 2, x + 1], p[y + 1, x], p[y + 1, x + 2]
            row = 0 if not N else (2 if not S else 1); col = 0 if not Wn else (2 if not E else 1)
            t = rect(tiles[row][col]).copy()
            for name, (dy, dx, ok) in dict(NW=(-1, -1, N and Wn), NE=(-1, 1, N and E), SW=(1, -1, S and Wn), SE=(1, 1, S and E)).items():
                if ok and not p[y + 1 + dy, x + 1 + dx]: t.alpha_composite(rect(m[name]))
            cv.alpha_composite(t, (x * T, y * T))

# ---------------- walls: cuts + pinch + stub deletion ----------------
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
                elif miss == {'SE'}: specs[(y, x)] = ('inner_se', 1, 1)
                elif miss == {'SW'}: specs[(y, x)] = ('inner_sw', 1, 1)
                elif miss in (frozenset({'NE'}), frozenset({'NW'})): specs[(y, x)] = ('tile', 0, 1)
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
def draw_walls(cv, B, rule):
    B, cuts, specs = wall_analyse(B)
    for (y, x), (kind, row, col) in specs.items():
        if kind == 'tile': t = rect(rule['tiles'][row][col])
        elif kind == 'inner_se': t = rect(rule['interior']['SE'])
        else: t = rect(rule['interior']['SW'])
        cv.alpha_composite(t, (x * T, y * T))
    return B

# ---------------- hedge ----------------
def build_hedge(w, h):
    s = Image.new('RGBA', (w * T, h * T), (0, 0, 0, 0))
    top, bot, fill = piece('hedge_top'), piece('hedge_bottom'), piece('hedge_fill')
    for x in range(w):
        sx = 0 if x == 0 else (2 if x == w - 1 else 1)
        s.alpha_composite(top.crop((sx * T, 0, sx * T + T, T)), (x * T, 0))
        s.alpha_composite(bot.crop((sx * T, 0, sx * T + T, T)), (x * T, (h - 1) * T))
        for y in range(1, h - 1):
            s.alpha_composite(fill.crop(((x % 2) * T, (y % 2) * T, (x % 2) * T + T, (y % 2) * T + T)), (x * T, y * T))
    return s

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
    floor = rect(A['floor']['base_tile'])
    cv = Image.new('RGBA', (W_T * T, H_T * T))
    for y in range(H_T):
        for x in range(W_T): cv.alpha_composite(floor, (x * T, y * T))
    patch = cleanup(ellipse(6.5, 16.2, 4.8, 2.9))
    shallow = cleanup(ellipse(30, 16, 5.2, 3.2))
    deep = cleanup(ellipse(27, 5.2, 4.6, 2.6))
    walls = rects([(1, 1, 7, 4), (8, 3, 11, 7), (13, 1, 15, 3), (3, 5, 4, 7), (6, 6, 7, 8)])
    quad_autotile(cv, patch, A['ground_patch'])
    overlay_autotile(cv, shallow, A['water_shallow'])
    overlay_autotile(cv, deep, A['water_deep'])
    walls = draw_walls(cv, walls, A['wall'])
    hx0, hy0, hw, hh = 12, 9, 12, 5
    hedge = build_hedge(hw, hh); cv.alpha_composite(hedge, (hx0 * T, hy0 * T))
    blocked = patch | shallow | deep | walls
    blocked[hy0:hy0 + hh, hx0:hx0 + hw] = True
    def free(tx, ty, w=1): return not blocked[ty - 1:ty + 1, tx:tx + w].any()
    # objects (y-sorted by foot y)
    objs = []
    t1p, t1b = piece('tree1_pass'), piece('tree1_base')
    t2p, t2b = piece('tree2_pass'), piece('tree2_base')
    tree1 = Image.new('RGBA', (16, 32)); tree1.alpha_composite(t1p, (0, 0)); tree1.alpha_composite(t1b, (0, 16))
    tree2 = Image.new('RGBA', (64, 48)); tree2.alpha_composite(t2p, (0, 0)); tree2.alpha_composite(t2b, (16, 32))
    for tx, ty in [(1, 9), (19, 7), (36, 13), (10, 12)]:
        assert free(tx, ty), ('tree1 on blocked tile', tx, ty); objs.append((ty * T + 16, tree1, tx * T, ty * T + 16 - 32))
    for tx, ty in [(26, 10), (31, 3), (17, 20)]:
        assert free(tx + 1, ty, 2), ('tree2 on blocked tile', tx, ty); objs.append((ty * T + 16, tree2, tx * T, ty * T + 16 - 48))
    rocks = [piece(n) for n in ('rock1', 'rock2', 'rock3')]
    for r, (tx, ty) in zip([0, 1, 2, 0, 2], [(13, 6), (21, 5), (33, 11), (3, 12), (23, 8)]):
        assert free(tx, ty), ('rock on blocked tile', tx, ty); objs.append((ty * T + 16, rocks[r], tx * T, ty * T + 16 - rocks[r].height))
    objs.sort(key=lambda o: o[0])
    big = cv.resize((cv.width * PX, cv.height * PX), Image.NEAREST)
    for fy, im, x, y in objs:
        big.alpha_composite(im.resize((im.width * PX, im.height * PX), Image.NEAREST), (x * PX, y * PX))
    # Pokemon on open ground
    for pid, tx, ty in [(19, 4, 10), (25, 15, 7), (6, 19, 8), (143, 9, 12), (249, 33, 8)]:
        draw_mon(big, pid, tx * T * PX + 16, ty * T * PX)
    # Pokemon standing in the hedge + occluder
    hedge2 = hedge.resize((hedge.width * PX, hedge.height * PX), Image.NEAREST)
    H = 9 * PX; feet = (hy0 * T + 4 * T) * PX - 8
    mons = [19, 25, 39, 6, 143]; xs = [(hx0 * T + (i + .5) * hw * T / len(mons)) * PX for i in range(len(mons))]
    for pid, x in zip(mons, xs): draw_mon(big, pid, x, feet)
    hp = hedge2.load(); bp = big.load(); ox, oy = hx0 * T * PX, hy0 * T * PX
    for X in range(hedge2.width):
        n = (X + ox) // 6                                    # world-x hash -> tuft offset
        tuft = [-3, -1, 1, 3][((n * 2654435761) >> 8) & 3]
        for Y in range(feet - H - tuft, feet + 14):
            if 0 <= Y - oy < hedge2.height:
                r = hp[X, Y - oy]
                if r[3]: bp[X + ox, Y] = r
    # legend
    out = Image.new('RGBA', (big.width, big.height + 34), (18, 18, 18, 255)); out.paste(big, (0, 34))
    d = ImageDraw.Draw(out)
    d.text((6, 4), 'Shady Forest: drawn only from shady_forest_atlas.png + .json (walls, patch, shallow + deep water, hedge, trees, rocks)', fill=(255, 230, 80, 255))
    d.text((6, 18), 'hedge: occluder 9 art-px, jagged tufts from world x, every Pokemon. mockup sprite sizes are a proposal (separate slice)', fill=(200, 200, 200, 255))
    os.makedirs(os.path.dirname(OUT), exist_ok=True); out.save(OUT); print('saved', OUT, out.size)
main()
