# Golden damage numbers for the move-sim harness (slice 3c). Written from the architecture text D5 to D11, NOT from the JS,
# so the harness cannot pass by repeating the code's arithmetic. Usage from the repo root:  python3 docs/proposals/move-sim-golden.py
# Prints one JSON line per case; the harness pins these values (paste them into GOLDEN when the formula or a constant changes on purpose).
import json, math

STAB, DMG_SCALAR, CRIT = 1.5, 1.0, 1.5        # stats.js STAB, DMG_SCALAR (code value, D7), combat CRIT_MUL
def stat(base, lvl): return math.floor(2 * base * lvl / 100) + 5          # mainline non-HP stat, IV/EV 0
def stage_mul(s, B=2): return (B + s) / B if s >= 0 else B / (B - s)     # D30 ladder
SOFT = {2: 1.6, 0.5: 0.6, 0: 0.3}                                          # types.js softened chart, clamp [0.3, 2.4]
def chart(*mults):
    m = 1.0
    for x in mults: m *= SOFT[x] if x != 1 else 1
    return min(2.4, max(0.3, m))

MOVES = {  # id: (type, category, basePower) as resolved (D1)
    'tackle': ('normal', 'physical', 40), 'ember': ('fire', 'special', 40), 'water-gun': ('water', 'special', 40),
    'hydro-pump': ('water', 'special', 88), 'heat-wave': ('fire', 'special', 85.5), 'mud-shot': ('ground', 'special', 52.25),
    'flamethrower': ('fire', 'special', 90)}
OWNER = dict(level=30, atk=84, spa=109, types=['fire'], extra=1.1, atkStage=1, spaStage=1)
ENEMY = dict(defBase=65, spdBase=64, level=25)   # Squirtle base Def/SpD, enemy level (atkLvl)

def dmg(move, owner=OWNER, enemy=ENEMY, k=1.0, defStage=0, crit=False, item=1.0, typeOverride=None):
    t, cat, P = MOVES[move]
    L = owner['level']
    a_stat = stat(owner['spa'] if cat == 'special' else owner['atk'], L)
    stg = owner['spaStage'] if cat == 'special' else owner['atkStage']
    A = ((2 * L / 5 + 2) * P * a_stat) / 50 * owner['extra'] * stg                              # D6
    dl = enemy['level'] if enemy['level'] > 0 else L                                           # boss: owner level
    d_stat = stat(enemy['spdBase'] if cat == 'special' else enemy['defBase'], dl) * stage_mul(defStage)
    D = (A / max(1, d_stat) + 2) * (STAB if t in owner['types'] else 1) * DMG_SCALAR            # D7, D8
    return max(1.0, D * k * item * (CRIT if crit else 1))                                      # D9 to D11

cases = []
for m in MOVES: cases.append(('neutral ' + m, dmg(m)))
cases += [
    ('ember vs grass (x1.6, STAB)', dmg('ember', k=chart(2))),
    ('ember vs grass, crit', dmg('ember', k=chart(2), crit=True)),
    ('water-gun in rain (weather x1.5)', dmg('water-gun', k=1.5)),
    ('ember, owner SpA stage x2', dmg('ember', owner=dict(OWNER, spaStage=2))),
    ('tackle vs Def stage -1', dmg('tackle', defStage=-1)),
    ('water-gun vs grass with Power Stone (floor 1)', dmg('water-gun', k=max(1, chart(0.5)))),
    ('ember vs grass, Expert Belt + fire boost', dmg('ember', k=chart(2), item=1.2 * 1.2)),
    ('boss (atkLvl 0) defends at owner level', dmg('ember', enemy=dict(ENEMY, level=0))),
    ('weak owner tackle vs ghost (x0.3), crit, floor', dmg('tackle', owner=dict(OWNER, level=2, extra=1.0), k=chart(0), crit=True)),
    ('weak owner tackle vs ghost, no crit, floor', dmg('tackle', owner=dict(OWNER, level=2, extra=1.0), k=chart(0))),
]
for name, v in cases: print(json.dumps([name, v]))
