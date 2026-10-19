# Merges the few-shot (LLM) classification into the review JSON. Inputs: docs/move-import-review.json, docs/move-llm-classification.json
import json, random, collections, sys
src = sys.argv[1]; cls = sys.argv[2]; out = sys.argv[3]
R = json.load(open(src)); L = json.load(open(cls))
N = {'me':'melee','pr':'projectile','co':'cone','no':'nova','au':'aura','be':'beam','or':'orbit','bo':'boomerang','ch':'chain','mi':'mine','mt':'meteor','tu':'turret','da':'dash','tr':'trail','bu':'buff','md':'mend','wd':'ward','ct':'control','fd':'field','wl':'wall','none':None}
for m in R['moves']:
    m['rk'] = m.get('rk', m['kind'])
    if m['game']: m['lk'] = None; continue
    l = L[m['id']]; k = N[l['k']]
    m['lk'] = k; m['kind'] = k; m['cf'] = l['c']; m['nt'] = l['note']
    if m['cls'] == 'status': m['tier'] = 'S1' if k == 'buff' else ('S3' if k is None else 'S2')
    m['agree'] = (k == m['rk'])
# audit sample: seeded random 50 of non-game moves
ng = sorted(m['id'] for m in R['moves'] if not m['game']); random.Random(7).shuffle(ng)
aud = set(ng[:50])
for m in R['moves']: m['aud'] = m['id'] in aud
R['method'] = 'few-shot'
json.dump(R, open(out, 'w'), separators=(',', ':'))
ngm = [m for m in R['moves'] if not m['game']]
print(len(ngm), 'agree', sum(m['agree'] for m in ngm), 'conf', collections.Counter(m['cf'] for m in ngm))
print(collections.Counter(m['tier'] for m in R['moves']))
