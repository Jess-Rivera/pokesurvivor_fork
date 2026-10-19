# Exports one feature row per learnable PokeAPI move (API fields + derived axes + prose) to docs/classifier-features.json.
# The model itself is trained and scored elsewhere (leave-one-out on the 64 in-game moves). Run from the repo root.
import csv, re, json, collections
C = 'pokeapi-master/data/v2/csv/'
rd = lambda f: list(csv.DictReader(open(C + f, encoding='utf8')))
mv = {r['id']: r for r in rd('moves.csv')}
meta = {r['move_id']: r for r in rd('move_meta.csv')}
cats = {r['id']: r['identifier'] for r in rd('move_meta_categories.csv')}
ail = {r['id']: r['identifier'] for r in rd('move_meta_ailments.csv')}
tg = {r['id']: r['identifier'] for r in rd('move_targets.csv')}
types = {r['id']: r['identifier'] for r in rd('types.csv')}
fl = {r['id']: r['identifier'] for r in rd('move_flags.csv')}
flags = collections.defaultdict(set)
for r in rd('move_flag_map.csv'): flags[r['move_id']].add(fl[r['move_flag_id']])
stat_n = collections.Counter(r['move_id'] for r in rd('move_meta_stat_changes.csv'))
names = {r['move_id']: r['name'] for r in rd('move_names.csv') if r['local_language_id'] == '9'}
eff_short = {r['move_effect_id']: r['short_effect'] for r in rd('move_effect_prose.csv') if r['local_language_id'] == '9'}
eff_long = {r['move_effect_id']: r['effect'] for r in rd('move_effect_prose.csv') if r['local_language_id'] == '9'}
flav = {}
for r in rd('move_flavor_text.csv'):
    if r['language_id'] == '9':
        k = r['move_id']
        if k not in flav or int(r['version_group_id']) > flav[k][0]: flav[k] = (int(r['version_group_id']), r['flavor_text'])
learners = collections.defaultdict(set)
for r in rd('pokemon_moves.csv'): learners[r['move_id']].add(r['pokemon_id'])
review = {m['id']: m for m in json.load(open('docs/move-import-review.json', encoding='utf8'))['moves']}
rows = []
for i, m in mv.items():
    if int(i) >= 10000 or i not in learners: continue
    ident = m['identifier']; mm = meta.get(i, {}); rv = review.get(ident, {})
    clean = lambda s: re.sub(r'\s+', ' ', s.replace('­', '').replace('\n', ' ')).strip()
    ch = str(m['effect_chance'] or mm.get('ailment_chance') or '')
    rows.append({
        'id': ident, 'n': names.get(i, ident), 'ty': types[m['type_id']], 'cls': rv.get('cls'), 'pw': int(m['power']) if m['power'] else 0,
        'pp': int(m['pp']) if m['pp'] else 0, 'ac': int(m['accuracy']) if m['accuracy'] else 0, 'pr': int(m['priority']),
        'tgt': tg[m['target_id']], 'cat': cats.get(mm.get('meta_category_id', ''), '?'), 'ail': ail.get(mm.get('meta_ailment_id', ''), 'none'),
        'fl': sorted(flags[i]), 'minh': int(mm.get('min_hits') or 1), 'maxh': int(mm.get('max_hits') or 1), 'drain': int(mm.get('drain') or 0),
        'heal': int(mm.get('healing') or 0), 'crit': int(mm.get('crit_rate') or 0), 'flinch': int(mm.get('flinch_chance') or 0), 'nstat': stat_n[i],
        'effid': m['effect_id'], 'ln': len(learners[i]),
        'short': clean(eff_short.get(m['effect_id'], '').replace('$effect_chance', ch)), 'long': clean(eff_long.get(m['effect_id'], '').replace('$effect_chance', ch)),
        'flavor': clean(flav.get(i, (0, ''))[1]),
        'rule': rv.get('wk'), 'rule_kind': rv.get('kind'), 'game': rv.get('game'), 'tier': rv.get('tier'),
    })
json.dump({'generated': '2026-10-19', 'moves': rows}, open('docs/classifier-features.json', 'w'), separators=(',', ':'))
print(len(rows), sum(1 for r in rows if r['game']))
