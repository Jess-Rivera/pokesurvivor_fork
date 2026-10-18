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

Usage:  python3 classify_species.py <repo_root>
Output: docs/proposals/enemy-behavior-report.md and .csv

TAXONOMY (DECISIONS 2026-10-17 "Enemy taxonomy"), decided top-down:
  1. confident SUPPORT evidence -> Support (Healer, Shielder, Summoner); confident Bomber -> Melee/Bomber
  2. otherwise stats set the FAMILY: Atk >= SpA -> Melee, SpA > Atk -> Range
  3. evidence picks the class inside the family (Melee: Charger, Jumper; Range: Beamer, Zoner, Fan),
     else the family default (Plain / Shooter)
  4. modifiers from stats only: Tank (Runner is relative to the drawn cast, so decided at runtime)
Confident = two independent evidence layers agree (move + strong ability, or move + species text, ...);
a signature move alone is LOW and falls back to the family default (shown as 'leaning' for review).
"""
import csv, re, sys, collections, os, json

WRITE = '--write' in sys.argv            # also write the live table to js/data/enemy-classes.js (otherwise only the draft in docs/proposals/)
sys.argv = [a for a in sys.argv if a != '--write']
ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
MODE = sys.argv[2] if len(sys.argv) > 2 else 'single'      # 'single' (default: one signature move is enough for a PATTERN) or 'strict' (two layers); support is always strict
SUF = ''
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
# STATUS support: applies debuffs/ailments to the player or buffs to allies (other than heal / shield)
STATUS_AB_STRONG = ['intimidate','gooey','tangling-hair','cotton-down','power-spot','steely-spirit','battery','plus','minus']
STATUS_AB_WEAK = ['effect-spore','static','poison-point','flame-body','cute-charm','stench','mummy']
STATUS_DISABLE = {'sleep','paralysis','confusion','freeze','infatuation','yawn'}   # takes control away from the player: the core of the Status class
STATUS_DOT = {'poison','burn','leech-seed','nightmare'}                           # damage-over-time ailments: weaker identity
STATUS_OFFENSE_CAP = 100   # a strong attacker with a few status moves stays in its attack family
STATUS_NEED_SIG = 2        # disable / ally-buff moves needed for 'multi'
STATUS_NEED_ALL = 4        # ... and this many status moves counting DoT ailments and plain debuffs
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
CLASSES = ['healer', 'shielder', 'status', 'bomber', 'summoner', 'beamer', 'zoner', 'fan', 'jumper', 'charger']

# Species flavor-text keywords (WEAK layer). 1-2 distinct matching entries = 1 pt, 3+ = 2 pts.
I = re.I
TEXT_RE = {
  'healer':   re.compile(r"\b(heal(s|ed|ing)?|cur(e|es|ed|ing)|restor(e|es|ed|ing)|nurs(e|es|ed|ing)|mend(s|ed|ing)?|soothe[sd]?|soothing|tends? to|cares? for|medicin\w*|remed(y|ies)|nutritious)\b", I),
  'shielder': re.compile(r"\b(protect(s|ed|ing|ive)?|shield(s|ed|ing)?|guard(s|ed|ing)?|defen[cs]\w*|barrier|armor(ed)?|impenetrable|impregnable|withdraw\w*|retract\w*|hard shell|rock-hard)\b", I),
  'status':   re.compile(r"\b(sleep\w*|lull\w*|drows\w*|hypnoti\w*|paraly\w*|numb\w*|stun\w*|mesmeri\w*|entranc\w*|dazzl\w*|bewitch\w*|confus\w*|sluggish|slow(s|ed|ing)? (down|its|the|them)|saps?|puts? .{0,25} to sleep|sings?|lullaby)\b", I),
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
# The original author's hand lists (they used to live in js/data/enemies.js; removed when that file switched to the generated table).
# They are kept here as seed evidence for the classifier only.
HAND = {
    'healer':   {35, 36, 113, 173, 183, 184, 242, 301, 440, 531, 594, 700, 764, 858} - DROPPED_HAND,
    'shielder': {95, 122, 208, 213, 227, 306, 375, 410, 411, 436, 437, 439, 476, 703} - DROPPED_HAND,
    'bomber':   {74, 75, 76, 100, 101, 102, 109, 110, 337, 338, 343, 344} - DROPPED_HAND,
}
SUMMON_HAND = {15: 13, 18: 16, 24: 23, 28: 27, 31: 29, 34: 32, 42: 41, 51: 50, 53: 52, 57: 56, 59: 58,
               62: 60, 68: 66, 73: 72, 78: 77, 82: 81, 85: 84, 91: 90, 117: 116, 130: 129, 168: 167, 169: 41,
               199: 79, 230: 116, 262: 261, 334: 333, 405: 403, 416: 415, 462: 81, 466: 239, 553: 551, 637: 636}
TIERS = [tuple(map(int, m)) for m in re.findall(r'bst: \[(\d+), (\d+)\]', src)[:6]]
meta = open(os.path.join(ROOT, 'js/data/sprites-meta.js'), encoding='utf-8').read()
SPRITES = {int(m) for m in re.findall(r'^  (\d+): \{', meta, re.M)}

# Data
species = {int(r['id']): r for r in rd('pokemon_species.csv')}
default_poke = {int(r['species_id']): int(r['id']) for r in rd('pokemon.csv') if r['is_default'] == '1'}
body = {int(r['species_id']): (int(r['height']), int(r['weight'])) for r in rd('pokemon.csv') if r['is_default'] == '1'}   # dm, hg
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
_ail = {r['id']: r['identifier'] for r in rd('move_meta_ailments.csv')}
_mm = {int(r['move_id']): r for r in rd('move_meta.csv')}
_sc = collections.defaultdict(list)
for r in rd('move_meta_stat_changes.csv'): _sc[int(r['move_id'])].append(int(r['change']))
_dmg = {int(r['id']): r['damage_class_id'] for r in rd('moves.csv')}
STATUS_AIL = {}       # move identifier -> ailment name (for the status effect the enemy applies)
STATUS_KIND = {}      # move identifier -> 'ailment' | 'allybuff' | 'debuff' (status-class moves only)
for _i, _m in _mm.items():
    if _dmg.get(_i) != '1' or _i not in mdata: continue
    _t = mdata[_i][2]; _a = _ail[_m['meta_ailment_id']]; _c = _sc.get(_i, [])
    if _a in STATUS_DISABLE and _t not in ('user', 'users-field'): STATUS_KIND[mdata[_i][0]] = 'ailment'; STATUS_AIL[mdata[_i][0]] = _a
    elif _a in STATUS_DOT and _t not in ('user', 'users-field'): STATUS_KIND[mdata[_i][0]] = 'dot'
    elif _c and all(x < 0 for x in _c) and _t in ('selected-pokemon', 'all-opponents', 'all-other-pokemon', 'random-opponent'): STATUS_KIND[mdata[_i][0]] = 'debuff'
    elif _c and all(x > 0 for x in _c) and _t in ('user-and-allies', 'ally', 'all-allies'): STATUS_KIND[mdata[_i][0]] = 'allybuff'
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

# ---- profile fallback (type + body + stats; deterministic, no hash). Tunables (override with env PROF_JSON): ----
PROF_AGILE, PROF_LIGHT = 65, 350        # speed percentile and weight (hg = 0.1 kg) for a Jumper
PROF_HEAVY = 800                        # weight for a slow heavy Charger
PROF_BRUISER_TYPES, PROF_ATK = ('ground', 'rock', 'fighting', 'steel'), 100   # type-based Charger
PROF_BEAM_TYPES, PROF_SPA = ('electric', 'psychic', 'dragon', 'ice', 'fire', 'ghost'), 95   # Beamer
PROF_ZONE_TYPES, PROF_SLOW = ('ground', 'poison', 'ghost'), 40     # slow area-control types -> Zoner
PROF_ZONE_HEAVY_TYPES, PROF_ZONE_W = ('water', 'fire', 'rock'), 700   # extra types that make a Zoner only when also heavy
ZONER_SPREAD_N = 3                      # spread/field damage moves (by description) that count as one strong Zoner signal
PROF_FAN_TYPES, PROF_FANMIN, PROF_FAN_LIGHT = ('grass', 'bug', 'fairy', 'flying', 'normal', 'steel'), 50, 0   # Fan (light-weight rule off)
if os.environ.get('PROF_JSON'):
    import json; globals().update(json.loads(os.environ['PROF_JSON']))
def profile_class(family, types, hw, spe_pct, atk, spa):
    h, w = hw; t = set(types)
    if family == 'melee':
        agile = spe_pct >= PROF_AGILE
        if agile and w <= PROF_LIGHT: return 'jumper', 'agile+light'
        if w >= PROF_HEAVY and not agile: return 'charger', 'heavy+slow'
        if t & set(PROF_BRUISER_TYPES) and atk >= PROF_ATK: return 'charger', 'bruiser type'
        return 'plain', ''
    if spa >= PROF_SPA and t & set(PROF_BEAM_TYPES): return 'beamer', 'high SpA + beam type'
    if spe_pct <= PROF_SLOW and (t & set(PROF_ZONE_TYPES) or (t & set(PROF_ZONE_HEAVY_TYPES) and w >= PROF_ZONE_W)): return 'zoner', 'slow area type'
    if spe_pct >= PROF_FANMIN and (t & set(PROF_FAN_TYPES) or (PROF_FAN_LIGHT and w <= PROF_FAN_LIGHT)): return 'fan', 'light shooter type'
    return 'shooter', ''

# ====================== top-down classification ======================
FAMILY_PATTERNS = {'melee': ['charger', 'jumper'], 'range': ['beamer', 'zoner', 'fan']}
FAMILY_DEFAULT = {'melee': 'plain', 'range': 'shooter', 'support': ''}
NEED = {'healer': 2, 'shielder': 3, 'bomber': 2}          # signature moves that count as "multi" on their own
RANK = {'hand': 3, 'high': 2, 'medium': 1, 'low': 0, '': -1}
CONFIDENT = ('hand', 'high', 'medium', 'jess')
GEN_REGION = {1: 'Kanto', 2: 'Johto', 3: 'Hoenn', 4: 'Sinnoh', 5: 'Unova', 6: 'Kalos', 7: 'Alola', 8: 'Galar', 9: 'Paldea'}
ALL_CLASSES = ['healer', 'shielder', 'summoner', 'status', 'plain', 'charger', 'jumper', 'bomber', 'shooter', 'beamer', 'zoner', 'fan']

rows = []
for d in dexes:
    pid = default_poke[d]; st = stats[pid]; sp = species[d]
    hp, atk, df, spa, spd, spe = st[1], st[2], st[3], st[4], st[5], st[6]
    bst = sum(st.values())
    moves = {mname[m] for m in lvl[pid]}; abil = pabil[pid]
    mixed = abs(atk - spa) <= MIXED_BAND
    spe_pct = round(100 * sum(1 for x in spes if x <= spe) / len(spes))
    tank = hp >= TANK_HP and spe <= TANK_SPE
    tp = text_points(d)
    mt_strong, mt_weak = collections.defaultdict(set), collections.defaultdict(set)
    for m in lvl[pid]:
        ident, eff, tgt, power = mdata[m]
        for cls, strength in move_text_flags(eff, tgt, power, ident):
            (mt_strong if strength == 2 else mt_weak)[cls].add(ident)
    if len(mt_weak['zoner']) >= ZONER_SPREAD_N: mt_strong['zoner'].add(sorted(mt_weak['zoner'])[0])   # N+ spread-damage moves = one strong Zoner signal
    allt = ' '.join(flavor[d]); mel, ran = len(MELEE_RE.findall(allt)), len(RANGED_RE.findall(allt))
    text_delivery = '' if mel == ran else ('melee' if mel > ran else 'ranged')
    handed = [r for r in HAND if d in HAND[r]]

    # ---- role evidence (healer, shielder, bomber) ----
    roles = {}
    for role, c in SUPPORT.items():
        names = [x for x in c['moves'] if x in moves]
        m_all = names + sorted(x for x in mt_strong[role] if x not in names)
        s_ab = [x for x in c['strong'] if x in abil]; w_ab = [x for x in c['weak'] if x in abil]
        l_move, l_ab = len(m_all) >= 1, bool(s_ab)
        l_txt = tp[role][0] > 0 or bool(w_ab) or bool(mt_weak[role])
        layers = int(l_move) + int(l_ab) + int(l_txt); multi = len(m_all) >= NEED[role]
        conf = 'high' if (layers == 3 or (layers >= 2 and multi)) else 'medium' if (layers >= 2 or multi) else 'low' if layers == 1 else ''
        if role in handed: conf = 'hand'
        ev = m_all + s_ab + w_ab + (['text:' + '/'.join(k for k, _ in tp[role][1].most_common(2))] if tp[role][0] else []) + ['desc:' + x for x in sorted(mt_weak[role])[:2]]
        roles[role] = dict(conf=conf, layers=layers, n=len(m_all), ev=ev)
    # ---- status (debuffs / ailments on the player, buffs on allies) ----
    sig = sorted(x for x in moves if STATUS_KIND.get(x) in ('ailment', 'allybuff'))
    deb = sorted(x for x in moves if STATUS_KIND.get(x) in ('debuff', 'dot'))
    s_ab = [x for x in STATUS_AB_STRONG if x in abil]; w_ab = [x for x in STATUS_AB_WEAK if x in abil]
    l_move, l_ab, l_txt = len(sig) >= 1, bool(s_ab), tp['status'][0] > 0 or bool(w_ab)
    layers = int(l_move) + int(l_ab) + int(l_txt)
    multi = len(sig) >= STATUS_NEED_SIG and len(sig) + len(deb) >= STATUS_NEED_ALL
    conf = 'high' if (layers == 3 or (layers >= 2 and multi)) else 'medium' if (multi and layers >= 2) or (len(sig) >= 3) else 'low' if layers >= 1 else ''
    status_capped = conf in CONFIDENT and max(atk, spa) > STATUS_OFFENSE_CAP   # strong attacker: stays an attacker, gets Status as a secondary
    if status_capped: conf = 'low'
    _fx = collections.Counter()
    for x in sorted(moves):
        k = STATUS_KIND.get(x)
        if k == 'ailment': _fx['drowsy' if STATUS_AIL.get(x) in ('sleep', 'yawn') else 'daze'] += 1
        elif k == 'allybuff': _fx['haste'] += 1
        elif k in ('debuff', 'dot'): _fx['slow'] += 1
    status_fx = sorted(_fx, key=lambda e: (-_fx[e], ['drowsy', 'daze', 'haste', 'slow'].index(e)))[:2] or ['slow']
    roles['status'] = dict(conf=conf, layers=layers, n=len(sig) + len(deb),
        ev=sig + deb[:2] + s_ab + w_ab + (['text:' + '/'.join(k for k, _ in tp['status'][1].most_common(2))] if tp['status'][0] else []))
    # ---- summoner ----
    pre = sp['evolves_from_species_id']
    is_final = not any(s['evolves_from_species_id'] == str(d) for s in species.values())
    base = bool(pre) and is_final
    sm = [x for x in SUMMON_MOVES if x in moves] + sorted(mt_strong['summoner'] | mt_weak['summoner'])[:2]
    l_sm = [bool(sm), tp['summoner'][0] > 0, 'bug' in ptypes[pid]]
    sl = sum(l_sm)
    conf = 'hand' if d in SUMMON_HAND else ('high' if base and sl == 3 else 'medium' if base and sl == 2 else 'low' if base and sl == 1 else '')
    sev = (['hand list -> minion %d' % SUMMON_HAND[d]] if d in SUMMON_HAND else []) + sm + (['text:' + '/'.join(k for k, _ in tp['summoner'][1].most_common(2))] if tp['summoner'][0] else []) + (['bug'] if 'bug' in ptypes[pid] else [])
    roles['summoner'] = dict(conf=conf, layers=sl, n=len(sm), ev=sev)

    # ---- STEP 1: support / bomber ----
    key = lambda r: (RANK[roles[r]['conf']], roles[r]['layers'], roles[r]['n'])
    sup_best = max(['healer', 'shielder', 'summoner', 'status'], key=key)
    sup_ok = roles[sup_best]['conf'] in CONFIDENT
    bomb_ok = roles['bomber']['conf'] in CONFIDENT
    family_stat = 'melee' if atk >= spa else 'range'
    if bomb_ok and (not sup_ok or key('bomber') > key(sup_best)):
        family, cls, conf, ev = 'melee', 'bomber', roles['bomber']['conf'], roles['bomber']['ev']
    elif sup_ok:
        family, cls, conf, ev = 'support', sup_best, roles[sup_best]['conf'], roles[sup_best]['ev']
    else:
        # ---- STEP 2: family by stats; STEP 3: class inside the family ----
        family = family_stat
        pats = {}
        for name in FAMILY_PATTERNS[family]:
            strong, weak, fam = PATTERN[name]
            s_nm = [x for x in strong if x in moves]; w_nm = [x for x in weak if x in moves]
            ex_s = sorted(x for x in mt_strong[name] if x not in s_nm)
            ex_w = sorted(x for x in mt_weak[name] if x not in w_nm and x not in s_nm)
            ns, nw, txt = len(s_nm) + len(ex_s), len(w_nm) + len(ex_w), tp[name][0] > 0
            if ns >= 1 and (txt or ns + nw >= 2): pc = 'high' if (txt and ns + nw >= 2) else 'medium'
            elif ns >= 1 and MODE == 'single': pc = 'medium'
            elif ns or nw or txt: pc = 'low'
            else: pc = ''
            pats[name] = dict(conf=pc, score=2 * ns + nw + (1 if txt else 0), ev=s_nm + ex_s + w_nm + (['text:' + '/'.join(k for k, _ in tp[name][1].most_common(2))] if txt else []))
        pbest = max(pats, key=lambda n: (RANK[pats[n]['conf']], pats[n]['score']))
        if pats[pbest]['conf'] in CONFIDENT:
            cls, conf, ev = pbest, pats[pbest]['conf'], pats[pbest]['ev']
        else:
            cls, why = profile_class(family, ptypes[pid], body[d], spe_pct, atk, spa)
            conf, ev = ('profile', ['profile:' + why]) if cls != FAMILY_DEFAULT[family] else ('default', [])
    # leaning (for review): strongest unconfident evidence that did not win
    lean = ''
    if conf in ('default', 'profile'):
        cand = [(n, pats[n]) for n in pats if pats[n]['conf'] == 'low']
        if cand: lean = max(cand, key=lambda kv: kv[1]['score'])[0]
    if not lean and family in ('melee', 'range') and conf in ('default', 'profile'):
        lows = [r for r in ('healer', 'shielder', 'summoner', 'status', 'bomber') if roles[r]['conf'] == 'low']
        if lows: lean = max(lows, key=key)
    layers_used = roles[cls]['layers'] if cls in roles else 0
    palt, pwhy = profile_class(family_stat, ptypes[pid], body[d], spe_pct, atk, spa)
    kw = '; '.join('%s:%s' % (c, '/'.join(k for k, _ in tp[c][1].most_common(3))) for c in tp if tp[c][0])
    rows.append(dict(
        dex=d, name=sp['identifier'], types='/'.join(ptypes[pid]), bst=bst, hp=hp, atk=atk, spa=spa, df=df, spd=spd, spe=spe,
        spe_pct=spe_pct, legendary=int(sp['is_legendary'] == '1' or sp['is_mythical'] == '1'), gen=int(sp['generation_id']),
        family=family, cls=cls, confidence=conf, tank=int(tank), mixed=int(mixed), leaning=lean, evidence=' '.join(ev),
        text_delivery=text_delivery, stat_family=family_stat, text_keywords=kw,
        in_hand_list=','.join(handed), layers=layers_used, profile_alt=palt, profile_why=pwhy, h=body[d][0], w=body[d][1],
        secondary=('status' if status_capped else ''), unique='', status_fx='+'.join(status_fx), handtuned=0, was='',
        _tp={c: tp[c][0] for c in tp}, _mts={c: len(v) for c, v in mt_strong.items()}))

# ====================== Jess's hand tuning (tools/hand-overrides.json), applied on top of the generated classes ======================
FAM_OF = {}
for _f, _l in (('melee', ['plain', 'charger', 'jumper', 'bomber']), ('range', ['shooter', 'beamer', 'zoner', 'fan']), ('support', ['healer', 'shielder', 'summoner', 'status'])):
    for _c in _l: FAM_OF[_c] = _f
_ovp = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hand-overrides.json')   # lives beside this script in tools/
OV = json.load(open(_ovp, encoding='utf-8')) if os.path.exists(_ovp) else {}
for r in rows:
    k = str(r['dex']); new = OV.get('classes', {}).get(k)
    if new and new != r['cls']:
        r['was'] = r['cls']; r['cls'] = new; r['family'] = FAM_OF[new]; r['confidence'] = 'jess'; r['handtuned'] = 1
        r['evidence'] = (r['evidence'] + ' [hand-tuned from %s]' % r['was']).strip()
    if r['dex'] in OV.get('tank', []): r['tank'] = 1; r['handtuned'] = 1
    if r['dex'] in OV.get('secondary_status', []): r['secondary'] = 'status'; r['handtuned'] = 1
    if k in OV.get('unique', {}): r['unique'] = OV['unique'][k]; r['handtuned'] = 1
    if r['secondary'] and r['cls'] == 'status': r['secondary'] = ''

# ====================== frozen class table (draft of js/data/enemy-classes.js) ======================
import hashlib
def _minion(r):
    if r['cls'] != 'summoner': return 0
    if r['dex'] in SUMMON_HAND: return SUMMON_HAND[r['dex']]
    return int(species[r['dex']]['evolves_from_species_id'] or 0)
def emit_table():
    body = []
    wild = [r for r in rows if not r['legendary']]
    for r in sorted(wild, key=lambda r: r['dex']):
        o = ["c:'%s'" % r['cls']]
        if r['tank']: o.append('t:1')
        if r['secondary']: o.append("s:'%s'" % r['secondary'])
        if r['cls'] == 'status' or r['secondary'] == 'status': o.append("fx:'%s'" % r['status_fx'])
        m = _minion(r)
        if m: o.append('m:%d' % m)
        if r['unique']: o.append("u:'%s'" % r['unique'])
        body.append('  %d:{%s}' % (r['dex'], ','.join(o)))
    text = ',\n'.join(body)
    digest = hashlib.sha1(text.encode()).hexdigest()[:10]
    hdr = ('/* ============ enemy-classes.js — GENERATED, do not edit by hand ============\n'
           ' * Source of truth for the enemy class of every wild (non-legendary) species: %d entries.\n'
           ' * Produced by classify_species.py from the pokeapi data + hand-overrides.json. To change a species,\n'
           ' * edit hand-overrides.json and regenerate. Table checksum: %s\n'
           ' *   c  class: plain charger jumper bomber | shooter beamer zoner fan | healer shielder summoner status\n'
           ' *   t  1 = Tank modifier        s  secondary class (only \'status\')\n'
           ' *   fx status effects it applies (drowsy daze slow haste), strongest first\n'
           ' *   m  summoner: dex of the minion  u  unique behavior key\n'
           ' */\n') % (len(wild), digest)
    out_js = hdr + 'G.ENEMY_CLASSES = {\n' + text + '\n};\n'
    open(os.path.join(OUT, 'enemy-classes.draft.js'), 'w', encoding='utf-8').write(out_js)
    if WRITE:
        open(os.path.join(ROOT, 'js/data/enemy-classes.js'), 'w', encoding='utf-8', newline='\r\n').write(out_js)
        print('wrote js/data/enemy-classes.js')
    print('class table draft: %d entries, checksum %s' % (len(wild), digest))
emit_table()

# ====================== output ======================
cols = [c for c in rows[0].keys() if not c.startswith('_')]
with open(os.path.join(OUT, 'enemy-behavior-report.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore', restval=''); w.writeheader(); w.writerows(rows)

E = [r for r in rows if not r['legendary']]
C = collections.Counter
L = []
cnt = lambda rs, c: sum(1 for r in rs if r['cls'] == c)
L.append('# Enemy behavior classifier report (draft, generated, top-down)\n')
L.append('Generated by tools/classify_species.py. %d species with sprites, %d non-legendary (the wild pool). '
         'Per-species rows with the evidence: enemy-behavior-report.csv. Taxonomy: DECISIONS 2026-10-17 "Enemy taxonomy".\n' % (len(rows), len(E)))
fam = C(r['family'] for r in E); conf = C(r['confidence'] for r in E)
L.append('## Overview\n')
L.append('- families: support %d | melee %d | range %d' % (fam['support'], fam['melee'], fam['range']))
L.append('- confidence: hand %d | attested high %d | attested medium %d | profile (type+body+stats) %d | family default (Plain/Shooter, nothing fit) %d' % (conf['hand'], conf['high'], conf['medium'], conf['profile'], conf['default']))
L.append('- Plain + Shooter share of the wild pool: %.0f%%  (mode=%s)' % (100 * (cnt(E, 'plain') + cnt(E, 'shooter')) / len(E), MODE))
L.append('- tank modifier: %d species (%d of them also hold another class)\n' % (sum(r['tank'] for r in E), sum(1 for r in E if r['tank'])))
L.append('| family | class | species | confident |'); L.append('|---|---|---|---|')
for c in ALL_CLASSES:
    rs = [r for r in E if r['cls'] == c]
    if rs: L.append('| %s | %s | %d | %d |' % (rs[0]['family'], c, len(rs), sum(1 for r in rs if r['confidence'] in CONFIDENT)))
L.append('\n## Per tier (whole dex; BST bands overlap)\n')
L.append('| tier | BST band | species | ' + ' | '.join(ALL_CLASSES) + ' | tank |'); L.append('|---|---|---|' + '---|' * (len(ALL_CLASSES) + 1))
for i, (lo, hi) in enumerate(TIERS):
    T = [r for r in E if lo <= r['bst'] <= hi]
    L.append('| T%d | %d-%d | %d | %s | %d |' % (i + 1, lo, hi, len(T), ' | '.join(str(cnt(T, c)) for c in ALL_CLASSES), sum(r['tank'] for r in T)))
L.append('\n## Region pools (a run of region N draws from generations 1..N) \n')
L.append('Species per family in each region pool, and the classes with fewest candidates in the smallest tier cells. '
         'Support = healer + shielder + summoner + status.\n')
L.append('| region pool | species | support | melee | range | bomber | charger | jumper | beamer | zoner | fan |'); L.append('|---|---|---|---|---|---|---|---|---|---|---|')
for g, name in GEN_REGION.items():
    P = [r for r in E if r['gen'] <= g]
    L.append('| up to %d %s | %d | %d | %d | %d | %d | %d | %d | %d | %d | %d |' % (g, name, len(P), sum(1 for r in P if r['family'] == 'support'),
             sum(1 for r in P if r['family'] == 'melee'), sum(1 for r in P if r['family'] == 'range'), cnt(P, 'bomber'), cnt(P, 'charger'),
             cnt(P, 'jumper'), cnt(P, 'beamer'), cnt(P, 'zoner'), cnt(P, 'fan')))
thin = []
for g, name in GEN_REGION.items():
    for i, (lo, hi) in enumerate(TIERS):
        T = [r for r in E if r['gen'] <= g and lo <= r['bst'] <= hi]
        for f_ in ('support', 'melee', 'range'):
            n = sum(1 for r in T if r['family'] == f_)
            if n < 2: thin.append('%s T%d %s=%d' % (name, i + 1, f_, n))
L.append('\nThin cells (a region pool with fewer than 2 species of a family in a tier): ' + (', '.join(thin) if thin else 'none') + '\n')
L.append('## Is the text informative? (hand-listed species as a test set)\n')
L.append('| class | hand n | text hit (hand) | text hit (others) | lift | move-desc strong (hand) | move-desc strong (others) |'); L.append('|---|---|---|---|---|---|---|')
for cl in ['healer', 'shielder', 'bomber', 'summoner']:
    hand = [r for r in E if (cl in r['in_hand_list'].split(',')) or (cl == 'summoner' and r['dex'] in SUMMON_HAND)]
    oth = [r for r in E if r not in hand]
    th = sum(1 for r in hand if r['_tp'][cl]) / max(1, len(hand)); to = sum(1 for r in oth if r['_tp'][cl]) / max(1, len(oth))
    mh = sum(1 for r in hand if r['_mts'].get(cl)) / max(1, len(hand)); mo = sum(1 for r in oth if r['_mts'].get(cl)) / max(1, len(oth))
    L.append('| %s | %d | %.0f%% | %.0f%% | %.1fx | %.0f%% | %.0f%% |' % (cl, len(hand), 100 * th, 100 * to, th / to if to else 0, 100 * mh, 100 * mo))
ag = [r for r in E if r['text_delivery']]
L.append('\nText vs stat family: text votes on %d species and agrees with the stat rule for %.0f%% (so text is NOT used for the family).' %
         (len(ag), 100 * sum(1 for r in ag if r['text_delivery'] == ('melee' if r['stat_family'] == 'melee' else 'ranged')) / max(1, len(ag))))
L.append('\n## Review queue\n')
lean = [r for r in E if r['leaning']]
L.append('- species that fell to the family default but have unconfident evidence (see the `leaning` column): %d' % len(lean))
L.append('- leaning counts: ' + ', '.join('%s %d' % (k, v) for k, v in C(r['leaning'] for r in lean).most_common()))
L.append('- Plain/Shooter by default (no attested or profile signal): %d species' % conf['default'])
MEL_SP, RNG_SP = ('charger', 'jumper', 'bomber'), ('beamer', 'zoner', 'fan')
L.append('\n## Cast feasibility (3-5 melee, 3-5 range, 1-2 support, total 9; from T2 on >=1 melee special and >=1 range special)\n')
L.append('Cell = melee(special) / range(special) / support available in the cumulative region pool for that tier.\n')
L.append('| region pool | ' + ' | '.join('T%d' % (i + 1) for i in range(6)) + ' |'); L.append('|---|' + '---|' * 6)
fail = []
for g, name in GEN_REGION.items():
    cells = []
    for i, (lo, hi) in enumerate(TIERS):
        T = [r for r in E if r['gen'] <= g and lo <= r['bst'] <= hi]
        m = [r for r in T if r['family'] == 'melee']; rg = [r for r in T if r['family'] == 'range']; sp_ = [r for r in T if r['family'] == 'support']
        ms, rs_ = sum(1 for r in m if r['cls'] in MEL_SP), sum(1 for r in rg if r['cls'] in RNG_SP)
        cells.append('%d(%d)/%d(%d)/%d' % (len(m), ms, len(rg), rs_, len(sp_)))
        if len(m) < 3 or len(rg) < 3 or len(sp_) < 1 or len(T) < 9: fail.append('%s T%d cannot fill the family mix (%d/%d/%d, %d total)' % (name, i + 1, len(m), len(rg), len(sp_), len(T)))
        elif i >= 1 and (ms < 1 or rs_ < 1): fail.append('%s T%d lacks a special-class slot (melee special %d, range special %d)' % (name, i + 1, ms, rs_))
        elif len(m) < 4 or len(rg) < 4: fail.append('%s T%d fits only with flex (%d/%d/%d)' % (name, i + 1, len(m), len(rg), len(sp_)))
    L.append('| up to %d %s | %s |' % (g, name, ' | '.join(cells)))
L.append('\nCells that need the flex range or fail the rule: ' + ('; '.join(fail) if fail else 'none'))
open(os.path.join(OUT, 'enemy-behavior-report.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('\n'.join(L))

# ====================== review document ======================
def tiers_of(bst): return ','.join('T%d' % (i + 1) for i, (lo, hi) in enumerate(TIERS) if lo <= bst <= hi)
def desc(r):
    ev = r['evidence'].strip()
    return (ev[:70] + '...') if len(ev) > 72 else ev
def line(r, extra=''):
    return '| %d | %s | %s | %s/%s | %s | %s | %s %s |' % (r['dex'], r['name'], r['types'], r['atk'], r['spa'], r['family'] + ' ' + r['cls'] + (' +tank' if r['tank'] else '') + (' +' + r['secondary'] if r['secondary'] else '') + (' *' + r['unique'] if r['unique'] else ''), r['confidence'], desc(r), extra)
HDR = '| dex | species | types | Atk/SpA | assigned | confidence | evidence |\n|---|---|---|---|---|---|---|'
PATS = ('charger', 'jumper', 'beamer', 'zoner', 'fan')
flags = collections.OrderedDict()
flags['F1 High-offense support (not hand-listed): Atk or SpA >= 110 but assigned a support role'] = [r for r in E if not r['handtuned'] and r['family'] == 'support' and r['confidence'] != 'hand' and max(r['atk'], r['spa']) >= 110]
flags['F2 Support from a single evidence layer (moves alone, not hand-listed): healer/shielder with no ability or text backing'] = [r for r in E if not r['handtuned'] and r['cls'] in ('healer', 'shielder', 'status') and r['confidence'] in ('medium', 'high') and r['layers'] <= 1]
flags['F3 Pokedex text disagrees with a CLEAR stat lean (|Atk-SpA| >= 40 but the text reads the other way)'] = [r for r in E if not r['handtuned'] and abs(r['atk'] - r['spa']) >= 40 and r['text_delivery'] and r['text_delivery'] != ('melee' if r['stat_family'] == 'melee' else 'ranged')]
flags['F4 Attested pattern vs body/type profile disagree in character (charger vs jumper, or two different range patterns)'] = [r for r in E if not r['handtuned'] and r['confidence'] in ('medium', 'high') and r['cls'] in PATS and r['profile_alt'] in PATS and r['profile_alt'] != r['cls']]
flags['F5 Coin-flip family: |Atk - SpA| <= 3, so melee vs range is decided by a hair'] = [r for r in E if not r['handtuned'] and abs(r['atk'] - r['spa']) <= 3 and r['family'] != 'support']
flags['F6 Heavy species (>= 100 kg) assigned Jumper, or very light (<= 5 kg) assigned Charger'] = [r for r in E if not r['handtuned'] and (r['cls'] == 'jumper' and r['w'] >= 1000) or (r['cls'] == 'charger' and r['w'] <= 50)]
flags['F7 Tanks that also hold an attack pattern or support role (tank is a modifier, so this is expected, listed for a sanity check)'] = [r for r in E if not r['handtuned'] and r['tank'] and r['cls'] not in ('plain', 'shooter')]
R = []
R.append('# Enemy class assignments and review flags (generated)\n')
R.append('Generated by tools/classify_species.py (mode=%s). Wild pool only: %d non-legendary species with sprites. '
         'Bosses and legendaries are handled separately and are NOT in this list. Machine-readable version: enemy-behavior-report.csv.\n' % (MODE, len(E)))
R.append('How to read: **assigned** = family + class (+tank if it also has the Tank modifier). **confidence**: hand = already in the game\'s hand lists; '
         'high/medium = attested by moves, abilities, move descriptions or Pokedex text; profile = no attested evidence, class chosen from type + body + stats; '
         'default = nothing fit, so Plain (melee) or Shooter (range). Plain = the current "chase" behavior, Shooter = the current "ranged" behavior.\n')
R.append('Classes: ' + ', '.join('%s %d' % (c, cnt(E, c)) for c in ALL_CLASSES) + '. Tank modifier on %d. Secondary Status on %d. Hand-tuned by Jess: %d. Total %d.\n' % (sum(r['tank'] for r in E), sum(1 for r in E if r['secondary']), sum(r['handtuned'] for r in E), len(E)))
R.append('## Review flags (%d categories)\n' % len(flags))
for k, v in flags.items(): R.append('- **%s**: %d species' % (k.split(' ')[0], len(v)) + ' (' + k.split(' ', 1)[1] + ')')
R.append('')
newlist = [r for r in E if r['family'] == 'support' and r['confidence'] != 'hand' or (r['cls'] == 'bomber' and r['confidence'] != 'hand')]
R.append('### N. NEW support and bomber species (not in the original hand lists): %d\n' % len(newlist))
R.append('These are the roster expansion by lore. Each one needs a yes/no from you.\n')
for role in ('healer', 'shielder', 'summoner', 'status', 'bomber'):
    sub = [r for r in newlist if r['cls'] == role]
    R.append('**%s (%d new):** ' % (role, len(sub)) + ', '.join('%s (%s)' % (r['name'], r['confidence']) for r in sub) + '\n')
for k, v in flags.items():
    R.append('### %s: %d\n' % (k, len(v)))
    if not v: R.append('none\n'); continue
    R.append(HDR)
    for r in sorted(v, key=lambda r: r['dex']): R.append(line(r, 'profile alt: ' + r['profile_alt'] if k.startswith('F4') else ''))
    R.append('')
R.append('## Full assignments by class\n')
for fam_name in ('support', 'melee', 'range'):
    for c in [c for c in ALL_CLASSES if any(r['cls'] == c and r['family'] == fam_name for r in E)]:
        sub = sorted([r for r in E if r['cls'] == c and r['family'] == fam_name], key=lambda r: r['dex'])
        R.append('### %s / %s (%d)\n' % (fam_name, c, len(sub)))
        R.append('| dex | species | types | Atk/SpA | tiers | confidence | evidence |\n|---|---|---|---|---|---|---|')
        for r in sub: R.append('| %d | %s%s | %s | %s/%s | %s | %s | %s |' % (r['dex'], r['name'], ' (tank)' if r['tank'] else '', r['types'], r['atk'], r['spa'], tiers_of(r['bst']), r['confidence'], desc(r)))
        R.append('')
open(os.path.join(OUT, 'enemy-class-review.md'), 'w', encoding='utf-8').write('\n'.join(R) + '\n')
print('review doc:', {k.split(' ')[0]: len(v) for k, v in flags.items()}, 'new support/bomber:', len(newlist))

# ====================== review-data JSON (feeds the interactive review page) ======================
import json
FLAG_WHY = {
 'F1': 'Strong attacker (Atk or Sp.Atk 110+) but given a support job',
 'F2': 'Support role rests on one kind of evidence only (moves)',
 'F3': 'Pokedex text reads one way, stats lean clearly the other',
 'F4': 'Move/lore evidence and body/type profile suggest different behaviours',
 'F5': 'Atk and Sp.Atk are within 3 points, so melee vs range is a coin flip',
 'F6': 'Body size looks odd for the class (heavy jumper or featherweight charger)',
 'F7': 'Tank modifier on top of a special class (sanity check)'}
fl_by = collections.defaultdict(list)
for k, v in flags.items():
    for r in v: fl_by[r['dex']].append(k.split(' ')[0])
newset = {r['dex'] for r in newlist}
out_rows = []
for r in E:
    out_rows.append(dict(d=r['dex'], n=r['name'], t=r['types'], b=r['bst'], hp=r['hp'], a=r['atk'], s=r['spa'], sp=r['spe'], g=r['gen'],
        tr=tiers_of(r['bst']), fam=r['family'], c=r['cls'], cf=r['confidence'], tk=r['tank'], ev=r['evidence'].strip(), pa=r['profile_alt'],
        fl=fl_by.get(r['dex'], []), nw=int(r['dex'] in newset), hd=int(bool(r['in_hand_list'])), sec=r['secondary'], un=r['unique'], ht=r['handtuned'], was=r['was'], w=r['w'], h=r['h']))
os.makedirs(os.path.join(OUT, 'review-build'), exist_ok=True)
json.dump(dict(rows=out_rows, flagWhy=FLAG_WHY, flagTitle={k.split(' ')[0]: k.split(' ', 1)[1] for k in flags}),
          open(os.path.join(OUT, 'review-build', 'review-data.json'), 'w'), separators=(',', ':'))
print('review json rows:', len(out_rows))
