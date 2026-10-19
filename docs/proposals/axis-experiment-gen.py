# Experiment: classify the 64 in-game moves by AXES instead of by Kind, then compare with the Kinds the game uses today.
#   payload, range, target  <- derived from PokeAPI fields (category, target, contact flag, effect id)
#   shape, persistence, movement <- fuzzy match of the move's PROSE (short effect + long effect + latest English flavor text) against a lexicon
#   Kind <- candidates whose axes agree with the derived ones, ranked by how well the prose supports their other three axes
# Ground truth = the Kind's axes in docs/move_kind_rules.xlsx (sheet Axes). Lexicon is written from the axis definitions, NOT tuned to the 64.
# Run from the repo root:  python docs/proposals/axis-experiment-gen.py   -> docs/axis-experiment.json
import csv, re, json, collections, difflib
import openpyxl
C = 'pokeapi-master/data/v2/csv/'
rd = lambda f: list(csv.DictReader(open(C + f, encoding='utf8')))
mv = {r['identifier']: r for r in rd('moves.csv')}
meta = {r['move_id']: r for r in rd('move_meta.csv')}
cats = {r['id']: r['identifier'] for r in rd('move_meta_categories.csv')}
ail = {r['id']: r['identifier'] for r in rd('move_meta_ailments.csv')}
tg = {r['id']: r['identifier'] for r in rd('move_targets.csv')}
fl = {r['id']: r['identifier'] for r in rd('move_flags.csv')}
flags = collections.defaultdict(set)
for r in rd('move_flag_map.csv'): flags[r['move_id']].add(fl[r['move_flag_id']])
names = {r['move_id']: r['name'] for r in rd('move_names.csv') if r['local_language_id'] == '9'}
eff_short = {r['move_effect_id']: r['short_effect'] for r in rd('move_effect_prose.csv') if r['local_language_id'] == '9'}
eff_long = {r['move_effect_id']: r['effect'] for r in rd('move_effect_prose.csv') if r['local_language_id'] == '9'}
flav = {}
for r in rd('move_flavor_text.csv'):
    if r['language_id'] == '9':
        k = r['move_id']
        if k not in flav or int(r['version_group_id']) > flav[k][0]: flav[k] = (int(r['version_group_id']), r['flavor_text'])
review = {m['id']: m for m in json.load(open('docs/move-import-review.json', encoding='utf8'))['moves']}
src = open('js/data/moves.js', encoding='utf8').read()
ingame = {m.group(1): m.group(2) for m in re.finditer(r"\{ id: '([a-z0-9-]+)'.*?kind: '([a-z]+)'", src)}
G2WK = {'melee': 'Melee', 'projectile': 'Projectile', 'cone': 'Spray', 'nova': 'Burst', 'aura': 'Aura', 'beam': 'Beam', 'orbit': 'Orbit', 'boomerang': 'Boomerang',
        'chain': 'Chain', 'mine': 'Mines', 'meteor': 'Meteors', 'turret': 'Turret', 'dash': 'Dash', 'trail': 'Trail', 'buff': 'Buff'}

# ---- ground truth: Kind -> axes (docs/move_kind_rules.xlsx, sheet Axes)
wb = openpyxl.load_workbook('docs/move_kind_rules.xlsx', data_only=False)
AX = ['payload', 'range', 'target', 'shape', 'persistence', 'movement']
KAX = {}
for row in wb['Axes'].iter_rows(min_row=2, max_row=20, values_only=True):
    if row[0]: KAX[row[0]] = dict(zip(AX, row[1:7]))

# ---- derive payload / range / target from PokeAPI fields
SHIELD_EFFECTS = {'66', '36', '112', '117', '125', '47', '188', '295', '304', '342', '385', '395'}  # protect, detect, endure, reflect, light screen, safeguard, mist ... (hand-listed effect ids)
def derive(ident):
    m = mv[ident]; i = m['id']; mm = meta.get(i, {}); fls = flags[i]; cls = m['damage_class_id']
    c = cats.get(mm.get('meta_category_id', ''), '?'); t = tg[m['target_id']]
    if cls != '1': payload = 'damage'
    elif m['effect_id'] in SHIELD_EFFECTS: payload = 'shield'
    elif c == 'heal': payload = 'heal'
    elif c in ('field-effect', 'whole-field-effect'): payload = 'field'
    elif c == 'net-good-stats' and t in ('user', 'users-field', 'user-and-allies', 'user-or-ally'): payload = 'buff'
    elif c in ('net-good-stats', 'ailment'): payload = 'debuff'
    else: payload = 'buff' if t == 'user' else 'debuff'
    if t in ('user', 'users-field', 'user-and-allies', 'user-or-ally', 'ally', 'all-allies'): rng = 'self'
    elif t == 'entire-field' or c == 'whole-field-effect': rng = 'global'
    elif cls != '1' and 'contact' in fls: rng = 'touch'
    elif t in ('all-opponents', 'all-other-pokemon', 'all-pokemon'): rng = 'near'
    else: rng = 'far'
    if t in ('user', 'user-or-ally'): tgt = 'self'
    elif payload == 'field' and t in ('entire-field', 'users-field', 'opponents-field'): tgt = 'field'
    elif t in ('all-opponents', 'all-other-pokemon', 'all-pokemon', 'user-and-allies', 'all-allies'): tgt = 'multi'
    elif t in ('selected-pokemon', 'random-opponent', 'selected-pokemon-me-first', 'specific-move', 'ally'): tgt = 'single'
    else: tgt = 'field'
    return {'payload': payload, 'range': rng, 'target': tgt, 'mainline_target': t}

# ---- lexicon (written from the axis definitions in the workbook, one pass, not tuned to the 64)
LEX = {
 'shape': {
  'none':  ['raises', 'lowers', 'boosts', 'restores', 'recovers', 'cures', 'increases', 'sharply', 'stat stage', 'stat stages'],
  'point': ['hurls', 'throws', 'shoots', 'fires', 'launches', 'spits', 'spit', 'ball', 'orb', 'sphere', 'bullet', 'seed', 'needle', 'pellet', 'bubble', 'shot', 'single target'],
  'arc':   ['slap', 'slash', 'claw', 'scratch', 'strike', 'punch', 'kick', 'whip', 'bite', 'tackle', 'ram', 'slam', 'swing', 'sweeps', 'pounds', 'pound', 'wing', 'lick', 'tail', 'hits the target'],
  'cone':  ['breath', 'spew', 'spray', 'stream', 'jet', 'flames', 'flame', 'exhale', 'blows', 'gust of', 'fan out', 'cone', 'mist', 'torrent', 'gas'],
  'line':  ['beam', 'ray', 'laser', 'straight', 'cannon', 'pierce', 'line', 'bolt', 'blast of', 'high pressure', 'water'],
  'circle':['surrounding', 'all adjacent', 'around', 'shockwave', 'explode', 'explosion', 'burst', 'all opposing', 'all other', 'both sides', 'radius', 'quake', 'ground shake', 'wave of', 'pulse', 'sound'],
  'ring':  ['swirl', 'whirl', 'vortex', 'spin', 'wrap', 'trap', 'trapping', 'binds', 'twister', 'tornado', 'surrounds the target', 'squeeze', 'clamp', 'wind', 'cyclone'],
  'scatter':['rain', 'falls', 'fall', 'scatter', 'rocks', 'spikes', 'lays', 'strewn', 'sets', 'drops', 'icicles', 'meteor', 'hail', 'debris', 'around the opposing'],
  'chain': ['jump', 'jumps', 'chain', 'arc of', 'lightning', 'electric shock', 'zap', 'current', 'leaps from', 'spark', 'thunder'],
  'global':['weather', 'the field', 'terrain', 'entire', 'arena', 'sandstorm', 'sunlight', 'rain dance', 'all pokemon on the field'],
 },
 'persistence': {
  'instant':      ['hits', 'inflicts', 'damage', 'once'],
  'lingering':    ['pool', 'puddle', 'residue', 'left behind', 'leaves', 'on the ground', 'lingers', 'cloud', 'scatters', 'floor'],
  'persistent':   ['every turn', 'each turn', 'continuously', 'repeatedly', 'lasts', 'remains', 'stays', 'keeps', 'gradually', 'at the end of each turn', 'at the end of every turn', 'ongoing'],
  'timed':        ['temporar', 'for a few turns', 'for several turns', 'rest of', 'wears off'],
  'until-triggered': ['switches in', 'enters the battle', 'when an opposing', 'when a pokemon', 'set a trap', 'sets a trap', 'sets up', 'lay', 'lays', 'trap', 'on the opposing side'],
  'delayed':      ['two turns later', 'after two turns', 'in two turns', 'later', 'delay', 'hits after'],
 },
 'movement': {
  'static':       ['stays', 'in place', 'at the target', 'the opposing field', 'the field'],
  'travels':      ['hurls', 'throws', 'shoots', 'fires', 'launches', 'flies', 'toward', 'flung', 'spits', 'spit', 'projectile', 'shot'],
  'expands':      ['spreads', 'spread', 'shockwave', 'outward', 'all around', 'radiate', 'explod', 'all adjacent', 'all opposing', 'all other', 'nearby', 'surrounding'],
  'falls':        ['falls', 'fall', 'rain', 'drops', 'from above', 'from the sky', 'plunge', 'rocks', 'meteor', 'icicle', 'hail', 'crashes down', 'comes down'],
  'returns':      ['returns', 'back', 'boomerang', 'twice', 'two hits', 'hits two', 'comes back'],
  'follows user': ['around the user', 'surrounds the user', "user's body", 'cloaks', 'envelop', 'veil', 'its body', 'covers itself', 'the user restores', 'shrouds', 'the user'],
  'user moves':   ['charges', 'rush', 'dash', 'rolls', 'rolling', 'lunge', 'tackle', 'moves quickly', 'priority', 'always strikes first', 'speed', 'quick', 'slams into', 'rams', 'spins'],
  'follows target': ['traps', 'binds', 'wraps', 'clamps', 'squeezes', 'four to five turns', 'four or five', 'cannot escape', 'cannot switch', 'seed', 'saps'],
 }}
TURNS = re.compile(r'\b(two|three|four|five|six|seven|[2-9])\b[^.]{0,25}turns')
stem = lambda w: re.sub(r'(ing|ed|es|s|ly)$', '', w) if len(w) > 4 else w

def prose_of(ident):
    m = mv[ident]; i = m['id']
    short = eff_short.get(m['effect_id'], '').replace('$effect_chance', str(m['effect_chance'] or ''))
    long = eff_long.get(m['effect_id'], '').replace('$effect_chance', str(m['effect_chance'] or ''))
    fv = re.sub(r'\s+', ' ', flav.get(i, (0, ''))[1].replace('­', '').replace('\n', ' '))
    return short, long, fv

def score_axis(text, axis):
    norm = ' ' + re.sub(r'[^a-z ]', ' ', text.lower()) + ' '
    norm = re.sub(r'\s+', ' ', norm)
    toks = [t for t in norm.split() if t]
    stems = [stem(t) for t in toks]
    out = {}; ev = {}
    for val, terms in LEX[axis].items():
        s = 0.0; hit = []
        for term in terms:
            if ' ' in term or len(term) <= 3:
                if (' ' + term + ' ') in norm or (' ' not in term and term in toks): s += 1.5 if ' ' in term else 1.0; hit.append(term)
                continue
            st = stem(term); best = 0.0
            for sx in stems:
                if sx == st: best = 1.0; break
                if abs(len(sx) - len(st)) <= 2:
                    r = difflib.SequenceMatcher(None, st, sx).ratio()
                    if r >= 0.86 and r > best: best = r
            if best: s += best; hit.append(term)
        if axis == 'persistence' and val == 'timed' and TURNS.search(norm): s += 1.5; hit.append('N turns')
        out[val] = round(s, 2); ev[val] = hit
    return out, ev

def suggest(scores, ev):
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    top, second = ranked[0], ranked[1]
    if top[1] < 1.0 or top[1] <= second[1]: return None, ranked[:2]
    return top[0], ranked[:2]

rows = []
for ident, gk in ingame.items():
    m = mv[ident]; short, long, fv = prose_of(ident)
    text = ' '.join([short, long, fv])
    d = derive(ident)
    wk = G2WK[gk]; truth = KAX[wk]
    sug = {}; scs = {}; evs = {}
    for ax in ('shape', 'persistence', 'movement'):
        sc, ev = score_axis(text, ax); scs[ax] = sc; evs[ax] = {k: v for k, v in ev.items() if v}
        sug[ax], _ = suggest(sc, ev)
    # Kind from axes: candidates agree on derived axes (relax target, then range, if empty)
    relax = 0; cand = [k for k, a in KAX.items() if (a['payload'], a['range'], a['target']) == (d['payload'], d['range'], d['target'])]
    if not cand: relax = 1; cand = [k for k, a in KAX.items() if (a['payload'], a['range']) == (d['payload'], d['range'])]
    if not cand: relax = 2; cand = [k for k, a in KAX.items() if a['payload'] == d['payload']]
    if not cand: relax = 3; cand = list(KAX)
    ranked = sorted(((sum(scs[ax].get(KAX[k][ax], 0) for ax in ('shape', 'persistence', 'movement')), k) for k in cand), reverse=True)
    top = ranked[0][0]; tied = [k for s, k in ranked if s == top]
    # variant 2: ignore target (the workbook's target axis encodes game design, e.g. pierce = multi, not the mainline target field)
    cand2 = [k for k, a in KAX.items() if (a['payload'], a['range']) == (d['payload'], d['range'])] or [k for k, a in KAX.items() if a['payload'] == d['payload']] or list(KAX)
    r2 = sorted(((sum(scs[ax].get(KAX[k][ax], 0) for ax in ('shape', 'persistence', 'movement')), k) for k in cand2), reverse=True)
    t2 = [k for s, k in r2 if s == r2[0][0]]
    rows.append({'cand2': cand2, 'ranked2': [{'k': k, 's': round(s, 2)} for s, k in r2], 'tied2': t2, 'id': ident, 'n': names[m['id']], 'ty': review.get(ident, {}).get('ty'), 'cls': review.get(ident, {}).get('cls'),
                 'game': gk, 'gwk': wk, 'truth': truth, 'derived': d, 'sug': sug, 'scores': scs, 'ev': evs,
                 'cand': cand, 'relax': relax, 'ranked': [{'k': k, 's': round(s, 2)} for s, k in ranked], 'pick': tied[0], 'tied': tied,
                 'rule': review.get(ident, {}).get('wk'), 'prose': {'short': short, 'long': long, 'flavor': fv}})

# ---- summary
def acc(f): xs = [f(r) for r in rows]; return sum(1 for x in xs if x is True), len(xs)
S = {}
for ax in ('payload', 'range', 'target'): S[ax] = acc(lambda r, ax=ax: r['derived'][ax] == r['truth'][ax])
for ax in ('shape', 'persistence', 'movement'):
    cov = [r for r in rows if r['sug'][ax]]
    S[ax] = {'covered': len(cov), 'correct': sum(1 for r in cov if r['sug'][ax] == r['truth'][ax]), 'n': len(rows)}
S['kind_in_candidates'] = acc(lambda r: r['gwk'] in r['cand'])
S['kind_exact_relax0'] = acc(lambda r: r['relax'] == 0 and r['gwk'] in r['cand'])
S['avg_candidates'] = round(sum(len(r['cand']) for r in rows) / len(rows), 2)
S['pick_unique_correct'] = acc(lambda r: len(r['tied']) == 1 and r['pick'] == r['gwk'])
S['pick_tied_contains'] = acc(lambda r: len(r['tied']) > 1 and r['gwk'] in r['tied'])
S['pick_wrong'] = acc(lambda r: r['gwk'] not in r['tied'])
S['v2_avg_candidates'] = round(sum(len(r['cand2']) for r in rows) / len(rows), 2)
S['v2_in_candidates'] = acc(lambda r: r['gwk'] in r['cand2'])
S['v2_unique_correct'] = acc(lambda r: len(r['tied2']) == 1 and r['tied2'][0] == r['gwk'])
S['v2_tied_contains'] = acc(lambda r: len(r['tied2']) > 1 and r['gwk'] in r['tied2'])
S['v2_wrong'] = acc(lambda r: r['gwk'] not in r['tied2'])
S['confusion'] = {ax: dict(collections.Counter(f"{r['derived'][ax]} -> {r['truth'][ax]}" for r in rows if r['derived'][ax] != r['truth'][ax])) for ax in ('payload', 'range', 'target')}
S['rule_classifier'] = acc(lambda r: r['rule'] == r['gwk'] or (r['rule'] is None and False))
print(json.dumps(S, indent=1))
json.dump({'generated': '2026-10-19', 'axes': KAX, 'summary': S, 'moves': rows}, open('docs/axis-experiment.json', 'w'), separators=(',', ':'))
