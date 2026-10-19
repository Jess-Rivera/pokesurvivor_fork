# Generates docs/move-import-review.json: every learnable PokeAPI move with a PROPOSED game kind, readiness tier, and effect list.
# Read-only on the repo (reads pokeapi-master csv + js/data/moves.js). Rules mirror docs/move_kind_rules.xlsx (first match wins).
# Run from the repo root:  python docs/proposals/move-import-review-gen.py
import csv, re, json, collections
C = 'pokeapi-master/data/v2/csv/'
rd = lambda f: list(csv.DictReader(open(C + f, encoding='utf8')))
mv = {r['id']: r for r in rd('moves.csv')}
meta = {r['move_id']: r for r in rd('move_meta.csv')}
cats = {r['id']: r['identifier'] for r in rd('move_meta_categories.csv')}
ail = {r['id']: r['identifier'] for r in rd('move_meta_ailments.csv')}
tg = {r['id']: r['identifier'] for r in rd('move_targets.csv')}
types = {r['id']: r['identifier'] for r in rd('types.csv')}
stats = {r['id']: r['identifier'] for r in rd('stats.csv')}
fl = {r['id']: r['identifier'] for r in rd('move_flags.csv')}
flags = collections.defaultdict(set)
for r in rd('move_flag_map.csv'): flags[r['move_id']].add(fl[r['move_flag_id']])
sc = collections.defaultdict(list)
for r in rd('move_meta_stat_changes.csv'): sc[r['move_id']].append((stats[r['stat_id']], int(r['change'])))
names = {r['move_id']: r['name'] for r in rd('move_names.csv') if r['local_language_id'] == '9'}
prose = {r['move_effect_id']: r['short_effect'] for r in rd('move_effect_prose.csv') if r['local_language_id'] == '9'}
learners = collections.defaultdict(set)
for r in rd('pokemon_moves.csv'): learners[r['move_id']].add(r['pokemon_id'])
src = open('js/data/moves.js', encoding='utf8').read()
ingame = {}
for m in re.finditer(r"\{ id: '([a-z0-9-]+)'.*?kind: '([a-z]+)'", src): ingame[m.group(1)] = m.group(2)

WK2GAME = {'Melee': 'melee', 'Spray': 'cone', 'Burst': 'nova', 'Mines': 'mine', 'Meteors': 'meteor', 'Beam': 'beam', 'Aura': 'aura',
           'Orbit': 'orbit', 'Boomerang': 'boomerang', 'Chain': 'chain', 'Trail': 'trail', 'Turret': 'turret', 'Dash': 'dash',
           'Projectile': 'projectile', 'Buff': 'buff'}
SLICING = {'cut','slash','night-slash','razor-leaf','air-cutter','psycho-cut','leaf-blade','x-scissor','cross-poison','sacred-sword','secret-sword','air-slash','fury-cutter','ceaseless-edge','stone-axe','tachyon-cutter','razor-shell','solar-blade','bitter-blade','aqua-cutter','kowtow-cleave','mighty-cleave','psyblade','shadow-claw','bonemerang'}
TRAIL = {'flame-wheel','rollout','ice-ball','steamroller','spin-out'}
ORBIT_IDS = {'gust','petal-blizzard','twister','razor-wind','leaf-tornado','bleakwind-storm','sandsear-storm','wildbolt-storm','springtide-storm'}
METEOR = {'rock-slide','meteor-mash','hail','icicle-crash','draco-meteor','meteor-beam','rock-tomb','icicle-spear','stone-edge','rock-wrecker','future-sight','doom-desire','astral-barrage','glacial-lance'}
CHAIN_IDS = {'thunderbolt','spark','zap-cannon','hex','thunder','volt-switch','electro-ball','charge-beam','wild-charge','fusion-bolt','bolt-strike','plasma-fists','nuzzle','zing-zap','thunder-fang','shock-wave','curse'}
SPRAY_HINT = re.compile(r'(thrower|breath|spray|stream|gas|bubble-beam|water-spout|scald|flame-burst|sludge-wave|steam-eruption|acid|venoshock|infernal-parade|fire-blast|icy-wind|snarl|smog|eruption|blizzard|inferno|mist-ball|vacuum-wave)')
BEAM_HINT = re.compile(r'(beam|ray|laser|cannon|pump|photon-geyser|tri-attack|prismatic|signal|aurora|psystrike)')
HAZARD = {'spikes','toxic-spikes','stealth-rock','sticky-web','string-shot','toxic-thread','steel-spikes','mortal-spin'}
TURRET = {'substitute','beat-up','spiky-shield','wish','leech-seed'}
WARD = {'protect','detect','endure','spiky-shield','king-s-shield','baneful-bunker','obstruct','silk-trap','burning-bulwark','quick-guard','wide-guard','mat-block','crafty-shield','max-guard','reflect','light-screen','aurora-veil','safeguard','mist','substitute'}
SELF = {'user','users-field','user-and-allies','user-or-ally','ally','all-allies'}

def classify_damaging(m, mm, tgt, fls):
    p = int(m['power']); acc = int(m['accuracy']) if m['accuracy'] else 100; ident = m['identifier']; cls = m['damage_class_id']; prio = int(m['priority'])
    multi_tgt = tgt in ('all-other-pokemon', 'all-opponents', 'all-pokemon')
    if ident in TURRET: return 'Turret', 'Summons a user-side object (hand-tag list)'
    if ident in HAZARD: return 'Mines', 'Entry hazard / trap (hand-tag list)'
    if prio > 0 and 'contact' in fls: return 'Dash', f'Contact move with priority {prio}'
    if ident in TRAIL: return 'Trail', 'Rolling / sustained movement (hand-tag list)'
    if ail.get(mm.get('meta_ailment_id', ''), '') == 'trap' or ident in ORBIT_IDS: return 'Orbit', 'Bind/trap ailment or wind-swirl (hand-tag list)'
    if ident in METEOR: return 'Meteors', 'Falls from above (hand-tag list)' + (' (Gaps sheet: add a delay flag)' if ident in ('future-sight','doom-desire') else '')
    if 'contact' in fls and not multi_tgt and cls == '2' and ident not in SLICING: return 'Melee', 'Contact move, single target, physical'
    if ident in SLICING or (mm.get('min_hits') == '2' and mm.get('max_hits') == '2' and 'contact' not in fls): return 'Boomerang', 'Slicing tag (hand-tag list) or fixed 2-hit non-contact'
    if ident in CHAIN_IDS or (cls == '3' and types[m['type_id']] == 'electric' and not multi_tgt and p >= 60 and ident != 'thunder-shock'): return 'Chain', 'Electric/ghost special arc-jump (heuristic)'
    if ident in METEOR: return 'Meteors', 'Falls from above (hand-tag list)'
    if cls == '3' and ((p >= 100 and acc <= 85) or BEAM_HINT.search(ident)): return 'Beam', 'Special, power >= 100 with accuracy <= 85, or beam/ray/cannon name'
    if (multi_tgt and p > 80) or 'sound' in fls or 'pulse' in fls: return 'Burst', 'Hits all adjacent with power > 80, or has a sound/pulse tag'
    if multi_tgt: return 'Aura', 'Hits all adjacent, power <= 80'
    if cls == '3' and SPRAY_HINT.search(ident): return 'Spray', 'Special stream/flame/cone (name pattern)'
    if cls == '2' and 'contact' in fls: return 'Melee', 'Contact move (fallback)'
    return 'Projectile', 'Default: remaining ranged single-target damaging move'

def classify_status(m, tgt, fls, c, a):
    ident = m['identifier']
    if ident in HAZARD: return 'Mines', 'Entry hazard (hand-tag list)'
    if ident in TURRET: return 'Turret', 'Summon / placed object (hand-tag list)'
    if ident in ('reflect','light-screen','aurora-veil'): return 'Wall', 'Barrier wall (Gaps sheet: new Kind Wall, payload shield)'
    if ident in WARD: return 'Ward', 'Protects user or side / screen'
    if c == 'net-good-stats' and tgt in SELF: return 'Buff', 'Status move, target self, raises a stat stage'
    if c == 'heal' or ('heal' in fls and tgt in SELF): return 'Mend', 'Status move, target self/ally, restores HP' + (' (Gaps sheet variant: healing zone)' if ident in ('aromatherapy','life-dew','heal-pulse','heal-bell','floral-healing','jungle-healing') else '')
    if c in ('field-effect', 'whole-field-effect'): return 'Field', 'Targets field / side / weather / terrain / room'
    if c in ('ailment', 'net-good-stats') or a not in ('none', 'unknown'):
        v = ''
        if 'powder' in fls: v = ' (Gaps sheet variant: powder cone, Control with shape = cone)'
        elif ident in ('mean-look','spider-web','block','bind','octolock','jaw-lock','no-retreat','fairy-lock'): v = ' (Gaps sheet variant: tether / root)'
        return 'Control', 'Status move on foe: inflicts status or lowers a stat' + v
    return None, 'No mainline trigger matches (unique effect)'

RECOIL = {'49', '199', '254', '263', '469'}; SELFD = {'8', '190'}
rows = []
for i, m in mv.items():
    if int(i) >= 10000 or i not in learners: continue
    mm = meta.get(i, {}); ident = m['identifier']; cls = m['damage_class_id']
    c = cats.get(mm.get('meta_category_id', ''), '?'); a = ail.get(mm.get('meta_ailment_id', ''), 'none'); tgt = tg[m['target_id']]; fls = flags[i]
    eff = []
    chance = int(mm.get('ailment_chance') or 0)
    if a not in ('none', 'unknown'): eff.append({'t': 'ailment', 'v': a, 'chance': chance or 100})
    for s, ch in sc[i]: eff.append({'t': 'stat', 'v': s, 'n': ch, 'chance': int(mm.get('stat_chance') or 0) or 100, 'self': tgt in SELF or c == 'damage-raise'})
    if int(mm.get('flinch_chance') or 0): eff.append({'t': 'flinch', 'chance': int(mm['flinch_chance'])})
    if int(mm.get('drain') or 0) > 0: eff.append({'t': 'drain', 'n': int(mm['drain'])})
    if int(mm.get('healing') or 0) > 0: eff.append({'t': 'heal', 'n': int(mm['healing'])})
    if int(mm.get('drain') or 0) < 0 or m['effect_id'] in RECOIL: eff.append({'t': 'recoil'})
    if mm.get('max_hits') not in ('', None, '1'): eff.append({'t': 'multihit', 'min': int(mm['min_hits'] or 1), 'max': int(mm['max_hits'])})
    if int(mm.get('crit_rate') or 0): eff.append({'t': 'crit', 'n': int(mm['crit_rate'])})
    if 'charge' in fls: eff.append({'t': 'charge'})
    if 'recharge' in fls: eff.append({'t': 'recharge'})
    if m['effect_id'] in SELFD: eff.append({'t': 'selfdestruct'})
    power = int(m['power']) if m['power'] else 0
    pp = int(m['pp']) if m['pp'] else None
    acc = int(m['accuracy']) if m['accuracy'] else None
    if cls == '1':
        wk, why = classify_status(m, tgt, fls, c, a)
        if wk is None: tier, kind = 'S3', None
        elif wk == 'Buff': tier, kind = 'S1', 'buff'
        elif wk == 'Mines': tier, kind = 'S2', 'mine'
        elif wk == 'Turret': tier, kind = 'S2', 'turret'
        else: tier, kind = 'S2', wk.lower()   # mend / ward / control / field / wall: kind exists in the workbook, no engine hook yet
    else:
        if not power:
            wk, why, tier, kind = None, 'No base power (fixed damage, OHKO, counter or variable power)', 'R4', None
        else:
            wk, why = classify_damaging(m, mm, tgt, fls)
            kind = WK2GAME[wk]
            kinds = {e['t'] for e in eff}; al = {e['v'] for e in eff if e['t'] == 'ailment'}
            if kinds & {'charge', 'recharge', 'recoil', 'selfdestruct'}: tier = 'R3'
            elif kinds & {'stat', 'flinch', 'drain', 'multihit', 'crit', 'heal'}: tier = 'R2'
            elif al - {'burn', 'poison'}: tier = 'R1'
            else: tier = 'R0'
    cd = round(0.5 * 35 / pp, 3) if pp and power else None
    hits = ((int(mm.get('min_hits') or 1) + int(mm.get('max_hits') or 1)) / 2) if mm.get('max_hits') else 1
    budget = round(power * (acc or 100) / 100 * hits / cd, 1) if cd and power else None
    short = prose.get(m['effect_id'], '').replace('$effect_chance', str(m['effect_chance'] or chance or ''))
    rows.append({'id': ident, 'n': names.get(i, ident), 'ty': types[m['type_id']], 'cls': {'1': 'status', '2': 'physical', '3': 'special'}[cls],
                 'pw': power or None, 'pp': pp, 'ac': acc, 'pr': int(m['priority']), 'gen': int(m['generation_id']), 'tgt': tgt,
                 'fl': sorted(fls & {'contact','sound','pulse','punch','bite','powder','charge','recharge','heal','dance','ballistics'}),
                 'hits': hits, 'eff': eff, 'tier': tier, 'wk': wk, 'kind': kind, 'why': why, 'cd': cd, 'bud': budget,
                 'ln': len(learners[i]), 'desc': short, 'game': ingame.get(ident)})
rows.sort(key=lambda r: (-r['ln'], r['id']))
cal = [(r['id'], r['game'], r['kind']) for r in rows if r['game']]
print('in-game moves matched:', len(cal), 'agree:', sum(1 for _, g, k in cal if g == k))
for x in cal:
    if x[1] != x[2]: print('  MISMATCH', x)
json.dump({'generated': '2026-10-19', 'calibration': [{'id': a, 'game': g, 'rule': k} for a, g, k in cal], 'moves': rows}, open('docs/move-import-review.json', 'w'), separators=(',', ':'))
print('rows', len(rows), dict(collections.Counter(r['tier'] for r in rows)))
print(dict(collections.Counter(r['kind'] for r in rows)))
