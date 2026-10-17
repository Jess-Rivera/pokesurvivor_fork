#!/usr/bin/env python3
"""
Adds the six base stats to every Pokemon in js/data/pokedex.js, from the local
PokeAPI CSVs (no internet needed):

    python tools/add_base_stats.py

For each Pokemon it adds   "stats":[HP, Atk, Def, SpA, SpD, Spe]   right after "bst".
Nothing else in the file changes (hp / spd / atk, which the game uses, stay as they are).
PokeAPI's pokemon_stats.csv already holds the CURRENT-generation values; the old
ones live in pokemon_stats_past.csv, which this script ignores.
It is safe to run again: an existing "stats" field is replaced.
"""
import csv, io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV = os.path.join(ROOT, 'pokeapi-master', 'data', 'v2', 'csv')
OUT = os.path.join(ROOT, 'js', 'data', 'pokedex.js')
NOTE = ' * stats = the six base stats [HP, Atk, Def, SpA, SpD, Spe] (PokeAPI, current generation).'


def main():
    # species -> id of its default form
    default = {}
    with io.open(os.path.join(CSV, 'pokemon.csv'), encoding='utf-8') as f:
        for r in csv.DictReader(f):
            if r['is_default'] == '1':
                default[int(r['species_id'])] = int(r['id'])
    # pokemon id -> {stat id: base stat}; stat ids 1..6 are HP, Atk, Def, SpA, SpD, Spe
    stats = {}
    with io.open(os.path.join(CSV, 'pokemon_stats.csv'), encoding='utf-8') as f:
        for r in csv.DictReader(f):
            stats.setdefault(int(r['pokemon_id']), {})[int(r['stat_id'])] = int(r['base_stat'])

    with io.open(OUT, encoding='utf-8') as f:
        text = f.read()

    row_re = re.compile(r'^  (\{.*\}),$', re.M)
    missing = []

    def patch(m):
        o = json.loads(m.group(1))
        st = stats.get(default.get(o['dex']), {})
        if any(i not in st for i in range(1, 7)):
            missing.append(o['dex'])
            return m.group(0)
        new = {}
        for k, v in o.items():
            if k == 'stats':
                continue
            new[k] = v
            if k == 'bst':
                new['stats'] = [st[i] for i in range(1, 7)]
        if sum(new['stats']) != o.get('bst'):
            print(f"  ! {o['dex']} {o['name']}: stats sum {sum(new['stats'])} != bst {o.get('bst')}")
        return '  ' + json.dumps(new, ensure_ascii=False, separators=(',', ':')) + ','

    text = row_re.sub(patch, text)
    if NOTE not in text:
        text = text.replace(' * hp/spd/atk are game stats derived from the base stats.\n',
                            ' * hp/spd/atk are game stats derived from the base stats.\n' + NOTE + '\n', 1)
    if missing:
        print('No stats found for:', missing)
        sys.exit(1)
    with io.open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print(f'stats added to {len(row_re.findall(text))} Pokemon')


if __name__ == '__main__':
    main()
