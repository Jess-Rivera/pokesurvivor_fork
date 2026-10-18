#!/usr/bin/env python3
"""
classify_species.py  (PROPOSAL DRAFT, offline dev tool, NOT part of the game)

Reads pokeapi-master CSVs and the game's own files, and writes a per-species recommendation for
enemy behavior, plus a summary. It decides nothing by itself: Jess reviews the low-confidence rows,
and the approved result would become a generated static table the game loads.

Evidence layers (see DECISIONS 2026-10-17 "Enemy behavior becomes stat-derived"):
  stats           -> delivery (melee vs ranged), tank candidate, speed percentile
  abilities       -> support-role evidence
  level-up moves  -> signature-move NAME lists (strong), plus move DESCRIPTION + TARGET predicates
                     (short_effect text and who the move targets; can find moves the name lists miss)
  species text    -> English Pokedex flavor text keywords. WEAK layer: capped, and on its own never
                     rises above "low" confidence.
  evolution       -> summoner minion (direct pre-evolution)
TM/tutor/egg moves are NOT used (too broad).

Usage:  python3 classify_species.py <repo_root> [balance|best|plain]
  mode = what to do with LOW-confidence species: balance (fewest-in-region class), best (strongest
  evidence class), plain (leave plain).
Output: docs/proposals/enemy-behavior-report[-mode].md and .csv
"""
import csv, re, sys, collections, os

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
MODE = sys.argv[2] if len(sys.argv) > 2 else 'balance'
SUF = '' if MODE == 'balance' else '-' + MODE
CSV = os.path.join(ROOT, 'pokeapi-master/data/v2/csv')
OUT = os.path.join(ROOT, 'docs/proposals')

# ---------------- tunables ----------------
MIXED_BAND = 15
TANK_HP, TANK_SPE = 95, 50
CONF_HIGH, CONF_MED = 4, 2
WEAK_CAP = 2               # max points weak signals (weak ability, move-text weak, species text) can add to a class
DROPPED_HAND = {102, 173, 183, 184, 301, 375, 700}   # Jess scrapped these hand picks (no data backing)

SUPPORT = {
  'healer':   dict(moves=['heal-pulse','wish','life-dew','floral-healing','heal-order','aromatherapy'],
                   strong=['healer','regenerator'], weak=['natural-cure','shed-skin','poison-heal','rain-dish','ice-body']),
  'shielder': dict(moves=['reflect','light-screen','aurora-veil','safeguard','wide-guard','barrier'],
                   strong=['magic-bounce','filter','solid-rock','prism-armor','multiscale','shadow-shield'],
                   weak=['sturdy','magic-guard','thick-fat','fur-coat','ice-scales','battle-armor','shell-armor']),
  'bomber':   dict(moves=['self-destruct','explosion','misty-explosion','mind-blown'],
                   strong=['aftermath'], weak=['damp']),
}
SUMMON_MOVES = ['helping-hand','beat-up','follow-me','rage-powder','ally-switch','coaching']

# attack pattern -> (strong signature moves = 2 pts, weak/common moves = 1 pt, delivery family)
PATTERN = {
  'beamer':  (['hyper-beam','solar-beam','prismatic-laser','meteor-beam','photon-geyser','eternabeam'],
              ['ice-beam','psybeam','signal-beam','aurora-beam','charge-beam','bubble-beam'], 'ranged'),
  'zoner':   (['earthquake','eruption','magnitude','precipice-blades','thousand-arrows','thousand-waves',
               'lava-plume','sludge-wave','water-spout','fissure'],
              ['bulldoze','rock-slide','surf','discharge','heat-wave','blizzard','muddy-water','sand-tomb','spikes'], 'ranged'),
  'fan':     (['razor-leaf','air-cutter','bullet-seed','pin-missile','icicle-spear','spike-cannon','twineedle',
               'water-shuriken'], ['rock-blast','leaf-tornado','magical-leaf','needle-arm'], 'ranged'),
  'jumper':  (['bounce','high-jump-kick','jump-kick','sky-drop','flying-press'], ['fly','sky-attack'], 'melee'),
  'charger': (['flare-blitz','wild-charge','head-charge','brave-bird','wave-crash','volt-tackle','head-smash',
               'wood-hammer','rock-wrecker'], ['double-edge','take-down','giga-impact','extreme-speed','headbutt'], 'melee'),
}
CLASSES = ['healer', 'shielder', 'bomber', 'summoner', 'beamer', 'zoner', 'fan', 'jumper', 'charger']

# Species flavor-text keywords (WEAK layer). 1-2 distinct matching entries = 1 pt, 3+ = 2 pts.
I = re.I
TEXT_RE = {
  'healer':   re.compile(r"\b(heal(s|ed|ing)?|cur(e|es|ed|ing)|restor(e|es|ed|ing)|nurs(e|es|ed|ing)|mend(s|ed|ing)?|soothe[sd]?|soothing|tends? to|cares? for|medicin\w*|remed(y|ies)|nutritious)\b", I),
  'shielder': re.compile(r"\b(protect(s|ed|ing|ive)?|shield(s|ed|ing)?|guard(s|ed|ing)?|defen[cs]\w*|barrier|armor(ed)?|impenetrable|impregnable|withdraw\w*|retract\w*|hard shell|rock-hard)\b", I),
  'bomber':   re.compile(r"\b(explod\w*|explosi\w*|self-destruct\w*|detonat\w*|blows? up|go(es)? off|volatile|set off|burst(s)? (open|apart))\b", I),
  'summoner': re.compile(r"\b(packs?|swarm\w*|colon(y|ies)|flocks?|herds?|horde|hive|queen|summon\w*|calls? (out )?for (help|friends|allies)|calls? (its|their) (friends|allies|comrades|pack|kind|companions|mates)|rall(y|ies)|in (large )?groups)\b", I),
  'beamer':   re.compile(r"\b(beam\w*|laser\w*|rays? (of|that|from)|(fires|shoots|emits|releases|unleashes) (a |an |powerful |intense )?(beam|ray|blast|bolt|energy|light|laser))\b", I),
  'zoner':    re.compile(r"\b(earthquake\w*|tremor\w*|quake\w*|erupt\w*|lava|magma|geyser\w*|shak(es|ing) the ground|trembl\w*|poison(ous)? gas|toxic gas|spore\w*|pollen|fog|mist|sandstorm|blizzard|tsunami|tidal|whirlpool\w*|quicksand)\b", I),
  'fan':      re.compile(r"\b(barrage|volleys?|spray(s|ed|ing)?|scatter\w*|hurl(s|ed|ing)?|fl(ings?|ung)|shoots? (out )?(seeds|needles|quills|spikes|thorns|bullets|many)|fires? (many|several|numerous)|razor-sharp (leaves|petals|feathers)|needles|quills|thorns)\b", I),
  'jumper':   re.compile(r"\b(jump\w*|leap\w*|bound(s|ed|ing)?|spring(s|ing)?|pounce\w*|hop(s|ped|ping)?|bounc\w*|vault\w*|swoop\w*)\b", I),
  'charger':  re.compile(r"\b(charg(e|es|ed|ing)|ram(s|med|ming)?|rush(es|ed|ing)?|tackl\w*|slam(s|med|ming)?|head-on|butt(s|ed|ing)?|barrel(s|ed|ing)?|stampede\w*|plow\w*|trampl\w*|bulldoz\w*|collid\w*)\b", I),
}
MELEE_RE = re.compile(r"\b(bit(es?|ing)|claws?|punch\w*|kick\w*|slash\w*|tackl\w*|ram(s|med|ming)?|crush\w*|gore[sd]?|grapple\w*|wrestl\w*|pounce\w*|stomp\w*|slam\w*)\b", I)
RANGED_RE = re.compile(r"\b(shoot\w*|fires?|firing|spit\w*|spray\w*|hurl\w*|fl(ing|ings|ung)|beam\w*|blast\w*|launch\w*|throw\w*|thrown|bolts?)\b", I)

# Move DESCRIPTION predicates: returns [(class, strength 2=strong / 1=weak)] from effect text, target, power, name
ALLYISH = {'ally', 'user-or-ally', 'users-field', 'user-and-allies', 'all-allies', 'selected-pokemon-me-first'}
HEAL_RE = re.compile(r"\b(heals?|restores?|cures?)\b", I)
SHIELD_RE = re.compile(r"\b(protects?|barrier|reduces damage|halves? damage|prevents? (any|all)|cannot be|shield)\b", I)
def move_text_flags(eff, tgt, power, ident):
    out = []
    status = not power
    if status and HEAL_RE.search(eff):
        others = tgt in ALLYISH or bool(re.search(r"heals? (the target|every|each|all|the entire|the user.s (ally|allies))|each pok.mon|entire party|party", eff, I))
        out.append(('healer', 2 if others and not re.match(r"heals? the user", eff, I) else 1))
    if status and SHIELD_RE.search(eff):
        out.append(('shielder', 2 if tgt in ALLYISH else 1))
    if re.match(r"user faints", eff, I): out.append(('bomber', 2))
    elif re.search(r"user takes damage equal to half", eff, I): out.append(('bomber', 1))
    if status and tgt in ('ally', 'user-or-ally') and not HEAL_RE.search(eff): out.append(('summoner', 1))
    if re.search(r"requires a turn to charge|charges? (on|for) the first turn", eff, I): out.append(('beamer', 1))
    if re.search(r"(beam|laser|ray|cannon|geyser)", ident): out.append(('beamer', 1))
    if power and tgt in ('all-opponents', 'all-other-pokemon'): out.append(('zoner', 1))
    if tgt == 'opponents-field': out.append(('zoner', 1))
    if power and re.search(r"hits \d[-–]\d times|hits (two|2|three|3|multiple) times|multiple times", eff, I): out.append(('fan', 1))
    if re.search(r"(bounces|flies|leaps|jumps|springs) (high )?(up|into)", eff, I): out.append(('jumper', 2))
    if re.search(r"(jump|bounce|leap|pounce|hop)", ident): out.append(('jumper', 1))
    if power and re.search(r"recoil", eff, I): out.append(('charger', 1))
    return out
# ------------------------------------------

rd = lambda f: list(csv.DictReader(open(os.path.join(CSV, f), encoding='utf-8')))

# Game files
src = open(os.path.join(ROOT, 'js/data/enemies.js'), encoding='utf-8').read()
def grab_set(n): return {int(x) for x in re.search(n + r' = new Set\(\[([^\]]*)\]', src).group(1).split(',')}
HAND = {r_: grab_set(n_) - DROPPED_HAND for r_, n_ in (('healer', 'HEAL'), ('shielder', 'SHIELD'), ('bomber', 'BOMB'))}
SUMMON_HAND = {int(a): int(b) for a, b in re.findall(r'(\d+):\s*(\d+)', re.search(r'const SUMMON = \{(.*?)\};', src, re.S).group(1))}
TIERS = [tuple(map(int, m)) for m in re.findall(r'bst: \[(\d+), (\d+)\]', src)[:6]]
meta = open(os.path.join(ROOT, 'js/data/sprites-meta.js'), encoding='utf-8').read()
SPRITES = {int(m) for m in re.findall(r'^  (\d+): \{', meta, re.M)}

# Data
species = {int(r['id']): r for r in rd('pokemon_species.csv')}
default_poke = {int(r['species_id']): int(r['id']) for r in rd('pokemon.csv') if r['is_default'] == '1'}
stats = collections.defaultdict(dict)
for r in rd('pokemon_stats.csv'): stats[int(r['pokemon_id'])][int(r['stat_id'])] = int(r['base_stat'])
tname = {int(r['id']): r['identifier'] for r in rd('types.csv')}
ptypes = collections.defaultdict(list)
for r in sorted(rd('pokemon_types.csv'), key=lambda r: int(r['slot'])): ptypes[int(r['pokemon_id'])].append(tname[int(r['type_id'])])
aname = {int(r['id']): r['identifier'] for r in rd('abilities.csv')}
pabil = collections.defaultdict(set)
for r in rd('pokemon_abilities.csv'): pabil[int(r['pokemon_id'])].add(aname[int(r['ability_id'])])
tgt_name = {int(r['id']): r['identifier'] for r in rd('move_targets.csv')}
eff_text = {}
for r in rd('move_effect_prose.csv'):
    if r['local_language_id'] == '9':
        t = re.sub(r'\[([^\]]*)\]\{[^}]*\}', r'\1', r['short_effect']).replace('$effect_chance%', 'N%')
        eff_text[int(r['move_effect_id'])] = t
mdata = {}
for r in rd('moves.csv'):
    mdata[int(r['id'])] = (r['identifier'], eff_text.get(int(r['effect_id'] or 0), ''), tgt_name.get(int(r['target_id'] or 0), ''), int(r['power']) if r['power'] else 0)
mname = {k: v[0] for k, v in mdata.items()}
lvl = collections.defaultdict(set)
for r in rd('pokemon_moves.csv'):
    if r['pokemon_move_method_id'] == '1': lvl[int(r['pokemon_id'])].add(int(r['move_id']))

# Species flavor text (English, distinct per species)
flavor = collections.defaultdict(set)
for r in rd('pokemon_species_flavor_text.csv'):
    if r['language_id'] == '9':
        t = re.sub(r'[\x0c\n\xad]+', ' ', r['flavor_text']); t = re.sub(r'\s+', ' ', t).strip()
        flavor[int(r['species_id'])].add(t)

dexes = sorted(d for d in SPRITES if d in default_poke)
elig = [d for d in dexes if species[d]['is_legendary'] == '0' and species[d]['is_mythical'] == '0']
spes = sorted(stats[default_poke[d]][6] for d in elig)

def text_points(d):
    """class -> (points 0..2, Counter of matched keywords) from species flavor text."""
    res = {}
    for cls, rx in TEXT_RE.items():
        hits = [t for t in flavor[d] if rx.search(t)]
        kws = collections.Counter(rx.search(t).group(0).lower() for t in hits)
        res[cls] = (0 if not hits else 1 if len(hits) <= 2 else 2, kws)
    return res

rows = []
for d in dexes:
    pid = default_poke[d]; st = stats[pid]; sp = species[d]
    hp, atk, df, spa, spd, spe = st[1], st[2], st[3], st[4], st[5], st[6]
    bst = sum(st.values())
    moves = {mname[m] for m in lvl[pid]}; abil = pabil[pid]
    delivery = 'ranged' if spa > atk else 'melee'
    mixed = abs(atk - spa) <= MIXED_BAND
    spe_pct = round(100 * sum(1 for x in spes if x <= spe) / len(spes))
    tank = hp >= TANK_HP and spe <= TANK_SPE
    tp = text_points(d)
    # move-description evidence per class: strong moves and weak moves
    mt_strong, mt_weak = collections.defaultdict(set), collections.defaultdict(set)
    for m in lvl[pid]:
        ident, eff, tgt, power = mdata[m]
        for cls, strength in move_text_flags(eff, tgt, power, ident):
            (mt_strong if strength == 2 else mt_weak)[cls].add(ident)
    allt = ' '.join(flavor[d]); mel, ran = len(MELEE_RE.findall(allt)), len(RANGED_RE.findall(allt))
    text_delivery = '' if mel == ran else ('melee' if mel > ran else 'ranged')

    # support roles
    sup = {}
    for role, c in SUPPORT.items():
        names = [x for x in c['moves'] if x in moves]
        extra = sorted(x for x in mt_strong[role] if x not in names)
        m_all = names + extra
        s_ab = [x for x in c['strong'] if x in abil]; w_ab = [x for x in c['weak'] if x in abil]
        base = 2 * (len(m_all) >= 1) + (len(m_all) >= 2) + 2 * (len(s_ab) >= 1)
        wk = min(WEAK_CAP, (1 if w_ab else 0) + (1 if mt_weak[role] else 0) + tp[role][0])
        if base == 0: wk = min(1, wk)          # weak signals alone never exceed "low"
        sup[role] = (base + wk, m_all + ['(desc)' + x for x in sorted(mt_weak[role])[:2]], s_ab + w_ab)
    pre = sp['evolves_from_species_id']; pre = int(pre) if pre else None
    is_final = not any(s['evolves_from_species_id'] == str(d) for s in species.values())
    sm = [x for x in SUMMON_MOVES if x in moves] + sorted(mt_strong['summoner'] | mt_weak['summoner'])[:2]
    summ_score, summ_ev = 0, []
    if d in SUMMON_HAND: summ_score, summ_ev = 4, ['hand list -> minion %d' % SUMMON_HAND[d]]
    elif pre and is_final and sm: summ_score, summ_ev = 2, ['final stage + ' + ','.join(sm)]
    elif pre and is_final and 'bug' in ptypes[pid]: summ_score, summ_ev = 1, ['bug final stage with a pre-evolution']
    if summ_score and summ_score < 4 and tp['summoner'][0]: summ_score += 1
    elif not summ_score and pre and is_final and tp['summoner'][0]: summ_score, summ_ev = 1, ['final stage + species text']
    sup['summoner'] = (summ_score, summ_ev, [])
    ranked = sorted(sup.items(), key=lambda kv: -kv[1][0])
    best, runner = ranked[0], ranked[1]
    handed = [r for r in HAND if d in HAND[r]]
    if handed:
        role, role_conf, role_ev = handed[0], 'hand', ['in current hand list'] + sup[handed[0]][1] + sup[handed[0]][2]
    elif best[1][0] >= CONF_MED:
        role = best[0]; role_conf = 'high' if best[1][0] >= CONF_HIGH else 'medium'; role_ev = best[1][1] + best[1][2]
    elif best[1][0] == 1:
        role, role_conf, role_ev = best[0], 'low', best[1][1] + best[1][2]
    else:
        role, role_conf, role_ev = '', '', []
    runner_up = runner[0] if runner[1][0] >= 1 and runner[0] != role else ''

    # attack pattern
    pat = {}
    for name, (strong, weak, fam) in PATTERN.items():
        s_nm = [x for x in strong if x in moves]; w_nm = [x for x in weak if x in moves]
        extra_s = sorted(x for x in mt_strong[name] if x not in s_nm)
        extra_w = sorted(x for x in mt_weak[name] if x not in w_nm and x not in s_nm)
        ns = len(s_nm) + len(extra_s)
        wk = min(WEAK_CAP, len(w_nm) + len(extra_w) + tp[name][0])
        score = 2 * ns + wk
        if ns == 0: score = min(score, 1)       # no strong move: weak evidence alone stays "low"
        pat[name] = (score, s_nm + extra_s + w_nm, fam, ns)
    pr = sorted(pat.items(), key=lambda kv: -kv[1][0])
    top = pr[0]
    pattern = top[0] if top[1][0] >= 1 else ''
    pat_ev = top[1][1] if pattern else []
    pat_fam = top[1][2] if pattern else ''
    nstrong = top[1][3] if pattern else 0
    pscore = top[1][0] if pattern else 0
    pconf = '' if not pattern else ('high' if nstrong >= 1 and pscore >= 4 else 'medium' if nstrong >= 1 and pscore >= 2 else 'low')
    conflict = bool(pattern and pat_fam != delivery)
    if conflict and pconf: pconf = 'low'
    cands = {r_: v[0] for r_, v in sup.items() if v[0] >= 1}
    for n_, v in pat.items():
        if v[0] >= 1 and v[2] == delivery: cands[n_] = max(cands.get(n_, 0), v[0])

    kwtxt = '; '.join('%s:%s' % (c, '/'.join(k for k, _ in tp[c][1].most_common(3))) for c in CLASSES if tp[c][0])
    rows.append(dict(
        dex=d, name=sp['identifier'], types='/'.join(ptypes[pid]), bst=bst, hp=hp, atk=atk, spa=spa, df=df, spd=spd, spe=spe,
        spe_pct=spe_pct, legendary=int(sp['is_legendary'] == '1' or sp['is_mythical'] == '1'),
        delivery=delivery, text_delivery=text_delivery, mixed=int(mixed), tank=int(tank),
        support_role=role, support_conf=role_conf, support_evidence=' '.join(role_ev), runner_up=runner_up,
        pattern=pattern, pattern_conf=pconf, pattern_evidence=' '.join(pat_ev), pattern_conflict=int(conflict),
        text_keywords=kwtxt, move_text_strong=' '.join('%s:%s' % (c, '/'.join(sorted(v)[:3])) for c, v in mt_strong.items() if v),
        gen=int(sp['generation_id']), in_hand_list=','.join(handed),
        _cands=cands, _tp={c: tp[c][0] for c in CLASSES}, _mt_strong={c: len(v) for c, v in mt_strong.items()}))

# ---------------- final class + low-confidence handling ----------------
REGION = {1: 'Kanto', 2: 'Johto', 3: 'Hoenn', 4: 'Sinnoh', 5: 'Unova', 6: 'Kalos', 7: 'Alola', 8: 'Galar', 9: 'Paldea'}
count = {g: collections.Counter() for g in REGION}
pending = []
for r in rows:
    r['final_class'], r['class_source'] = '', ''
    if r['legendary']: continue
    if r['support_conf'] in ('hand', 'high', 'medium'): r['final_class'], r['class_source'] = r['support_role'], 'support'
    elif r['pattern_conf'] in ('high', 'medium'): r['final_class'], r['class_source'] = r['pattern'], 'pattern'
    elif r['tank']: r['final_class'], r['class_source'] = 'tank', 'stat'
    elif r['_cands']: pending.append(r)
    else: r['final_class'], r['class_source'] = 'plain', 'none'
    if r['final_class'] in CLASSES: count[r['gen']][r['final_class']] += 1
gcount = collections.Counter()
for g_ in count.values(): gcount.update(g_)
for r in sorted(pending, key=lambda r: r['dex']):
    g = r['gen']
    if MODE == 'plain':
        r['final_class'], r['class_source'] = 'plain', 'low->plain'; continue
    if MODE == 'best':
        best = min(r['_cands'], key=lambda c: (-r['_cands'][c], gcount[c], CLASSES.index(c)))   # ties -> globally smallest class
    else:
        best = min(r['_cands'], key=lambda c: (count[g][c], -r['_cands'][c], CLASSES.index(c)))
    r['final_class'], r['class_source'] = best, 'balanced' if MODE == 'balance' else 'best-evidence'
    count[g][best] += 1; gcount[best] += 1

cols = [c for c in rows[0].keys() if not c.startswith('_')]
with open(os.path.join(OUT, 'enemy-behavior-report' + SUF + '.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore', restval=''); w.writeheader(); w.writerows(rows)

# ---------------- summary ----------------
E = [r for r in rows if not r['legendary']]
C = collections.Counter
L = []
L.append('# Enemy behavior classifier report (draft, generated, mode=%s)\n' % MODE)
L.append('Generated by docs/proposals/classify_species.py. %d species with sprites, %d non-legendary (the wild pool). '
         'Per-species rows: enemy-behavior-report%s.csv (includes the keywords that matched).\n' % (len(rows), len(E), SUF))
L.append('Each species gets ONE class. Order: confident support role > confident attack pattern > tank (stats) > low-confidence handling (%s) > plain.\n' % MODE)
srcs = C(r['class_source'] for r in E)
low_n = srcs['balanced'] + srcs['best-evidence'] + srcs['low->plain']
L.append('- confident support: %d | confident pattern: %d | tank by stats: %d | low-confidence handled: %d | plain (no evidence): %d' %
         (srcs['support'], srcs['pattern'], srcs['stat'], low_n, srcs['none']))
L.append('\n## Final class counts\n')
fc = C(r['final_class'] for r in E)
L.append('| ' + ' | '.join(CLASSES + ['tank', 'plain']) + ' |'); L.append('|' + '---|' * (len(CLASSES) + 2))
L.append('| ' + ' | '.join(str(fc[c]) for c in CLASSES + ['tank', 'plain']) + ' |')
L.append('\n## Per region (own generation)\n')
L.append('| region | species | ' + ' | '.join(CLASSES) + ' | tank | plain |'); L.append('|---|---|' + '---|' * (len(CLASSES) + 2))
for g, name in REGION.items():
    G_ = [r for r in E if r['gen'] == g]
    L.append('| %d %s | %d | %s | %d | %d |' % (g, name, len(G_), ' | '.join(str(sum(1 for r in G_ if r['final_class'] == c)) for c in CLASSES),
             sum(1 for r in G_ if r['final_class'] == 'tank'), sum(1 for r in G_ if r['final_class'] == 'plain')))
L.append('\n## Per tier (BST bands overlap; whole dex, before the region rule)\n')
L.append('| tier | BST band | species | ' + ' | '.join(CLASSES) + ' | tank | plain |'); L.append('|---|---|---|' + '---|' * (len(CLASSES) + 2))
for i, (lo, hi) in enumerate(TIERS):
    T = [r for r in E if lo <= r['bst'] <= hi]
    L.append('| T%d | %d-%d | %d | %s | %d | %d |' % (i + 1, lo, hi, len(T), ' | '.join(str(sum(1 for r in T if r['final_class'] == c)) for c in CLASSES),
             sum(1 for r in T if r['final_class'] == 'tank'), sum(1 for r in T if r['final_class'] == 'plain')))
L.append('\n## Is the text informative? (hand-listed species as a test set)\n')
L.append('Share of species with a species-text keyword hit for the class (and a move-description strong hit), hand-listed vs all other wild species. '
         'Lift well above 1.0 means the text separates them; near 1.0 means the keywords are noise for that class.\n')
L.append('| class | hand n | text hit (hand) | text hit (others) | lift | move-desc strong (hand) | move-desc strong (others) |'); L.append('|---|---|---|---|---|---|---|')
for cls in ['healer', 'shielder', 'bomber', 'summoner']:
    hand = [r for r in E if (cls in r['in_hand_list'].split(',')) or (cls == 'summoner' and r['dex'] in SUMMON_HAND)]
    oth = [r for r in E if r not in hand]
    th = sum(1 for r in hand if r['_tp'][cls]) / max(1, len(hand)); to = sum(1 for r in oth if r['_tp'][cls]) / max(1, len(oth))
    mh = sum(1 for r in hand if r['_mt_strong'].get(cls)) / max(1, len(hand)); mo = sum(1 for r in oth if r['_mt_strong'].get(cls)) / max(1, len(oth))
    L.append('| %s | %d | %.0f%% | %.0f%% | %.1fx | %.0f%% | %.0f%% |' % (cls, len(hand), 100 * th, 100 * to, th / to if to else 0, 100 * mh, 100 * mo))
L.append('\nSpecies-text hit rate, other classes (whole wild pool): ' +
         ', '.join('%s %.0f%%' % (c, 100 * sum(1 for r in E if r['_tp'][c]) / len(E)) for c in ['beamer', 'zoner', 'fan', 'jumper', 'charger']))
agree = [r for r in E if r['text_delivery']]
ag = sum(1 for r in agree if r['text_delivery'] == r['delivery'])
L.append('\nText-vs-stats delivery cross-check: text gives a melee/ranged vote for %d species and agrees with the stat rule for %d (%.0f%%).' % (len(agree), ag, 100 * ag / max(1, len(agree))))
L.append('\n## Review queue\n')
L.append('- low-confidence species: %d' % low_n)
L.append('- assigned patterns that contradict stat delivery: %d' % sum(1 for r in E if r['final_class'] in PATTERN and r['final_class'] == r['pattern'] and r['pattern_conflict']))
open(os.path.join(OUT, 'enemy-behavior-report' + SUF + '.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('\n'.join(L))
