// Team menu offline checks (#167), the slice's end-goal test. Node only: node docs/proposals/team-menu-harness.js .
// Real copies.js, candy.js, team-draft.js and team-list.js on a made-up save; every check is a relation.
// TM_DRAFT=<file> / TM_LIST=<file> run it against another copy of those two.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = (p, env) => vm.runInThisContext(fs.readFileSync((env && process.env[env]) || R + '/' + p, 'utf8'), { filename: p });
global.window = global;
global.G = { U: {} };
for (const p of ['js/data/species-traits.js', 'js/data/growth-curves.js', 'js/systems/copies.js', 'js/systems/candy.js']) load(p);
load('js/systems/team-draft.js', 'TM_DRAFT');
load('js/systems/team-list.js', 'TM_LIST');
const { Copies, TeamDraft: Draft, TeamList: List } = G;
let fail = 0; const bad = m => { fail++; if (fail < 40) console.log('FAIL', m); };
let seed = 777; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = list => list[Math.floor(rnd() * list.length)];

// a small species table: stats and rarities made up, only their order matters
const SPECIES = [[1, 'Alpha', ['grass', 'poison']], [4, 'Cinder', ['fire']], [7, 'Bubble', ['water']], [25, 'Spark', ['electric']], [143, 'Doze', ['normal']]];
G.DEX = SPECIES.map(([dex, name, types], i) => ({ dex, name, types, gen: 1 + (i % 2), rarity: 1 + i, bst: 300 + 60 * i, stats: [40 + i, 90 - i, 50 + i, 60 + i, 70 - i, 20 + 5 * i] }));
G.DEX_BY = Object.fromEntries(G.DEX.map(p => [p.dex, p]));
G.U.TYPE_COLOR = { normal: 1, fire: 1, water: 1, grass: 1, electric: 1, poison: 1 };
G.Moves = { ALL: [], RETIRED: {}, poolFor: () => [] };

function freshSave(count = 14) {
  const save = { box: [], boxCount: 2, coins: 0, owned: {}, shiny: {}, team: [], partner: null };
  for (let i = 0; i < count; i++) {
    const p = G.DEX[i % G.DEX.length];
    save.box.push(Copies.roll({ dex: p.dex, from: 'wild' }, rnd));
    save.owned[p.dex] = 1;
  }
  const all = Copies.all(save);
  save.team = [0, 1, 2, 3, 4, 5].map(i => (i < 3 ? { dex: all[i].speciesID, shiny: all[i].isShiny, uid: all[i].pokemonUUID } : null));
  save.partner = save.team[0].dex; save.partnerShiny = save.team[0].shiny;
  return save;
}
const uids = save => Copies.all(save).map(c => c.pokemonUUID).sort().join();
const rosterOk = (team, save, why) => {
  const held = team.filter(Boolean).map(t => t.uid);
  if (!team[0]) bad('slot 1 is empty after ' + why);
  if (team.length !== 6) bad('the roster is not six slots after ' + why);
  if (new Set(held).size !== held.length) bad('a copy sits in two slots after ' + why);
  for (const t of team) if (t) { const c = Copies.get(save, t.uid); if (!c || c.speciesID !== t.dex) bad('a slot holds a copy the save does not, after ' + why); }
};

// 1. revert restores the opened roster by copy; what else was saved survives it; a copy no longer owned leaves its slot empty
{ const save = freshSave(), draft = Draft.open(save), opened = Draft.open(save), saved = JSON.stringify(save.team), all = Copies.all(save).map(c => c.pokemonUUID);
  if (Draft.differs(draft, opened)) bad('an untouched roster differs from the opened one');
  Draft.drop(draft, save, { uid: all[8], fromSlot: null }, { kind: 'slot', slot: 4 });
  Draft.drop(draft, save, { uid: draft.team[1].uid, fromSlot: 1 }, { kind: 'grid' });
  if (!Draft.differs(draft, opened)) bad('an edited roster does not differ');
  Draft.commit(draft, save);
  if (Draft.differs(draft, save) || JSON.stringify(opened.team) !== saved) bad('a saved edit did not save, or changed the opened roster');
  Copies.setLocked(save, all[9], true); Copies.setNickname(save, all[10], 'Nick'); Draft.drop(draft, save, { uid: all[11], fromSlot: null }, { kind: 'box', box: 1 });
  const price = Copies.sellPrice(save, all[12]); Copies.sell(save, all[12], Draft.uids(draft));
  const result = Draft.revert(draft, opened, save); Draft.commit(draft, save);
  if (!result.ok || result.missing.length || JSON.stringify(save.team) !== saved) bad('revert did not restore the opened roster');
  if (!Copies.get(save, all[9]).isLocked || Copies.get(save, all[10]).nickname !== 'Nick' || Copies.get(save, all[11]).box !== 1 || Copies.get(save, all[12]) || save.coins !== price) bad('a sale, lock, rename or box move was lost on revert');
  console.log('1 revert restores the roster and keeps what else was saved'); }

// 1b. revert goes by copy: an evolved copy comes back as it is now, a sold one leaves its slot empty, a sold lead moves one up
{ const rebuilt = soldSlots => {
    const save = freshSave(), draft = Draft.open(save), opened = Draft.open(save), spare = Copies.all(save)[8].pokemonUUID;
    Draft.drop(draft, save, { uid: spare, fromSlot: null }, { kind: 'slot', slot: 0 });
    for (const slot of [1, 2]) Draft.drop(draft, save, { uid: draft.team[slot].uid, fromSlot: slot }, { kind: 'grid' });
    Draft.commit(draft, save);
    for (const slot of soldSlots) if (!Copies.sell(save, opened.team[slot].uid, Draft.uids(draft)).ok) bad('a copy taken off the team did not sell');
    const now = JSON.stringify(draft.team);
    return { save, draft, opened, now, spare, result: Draft.revert(draft, opened, save) }; };
  const one = rebuilt([2]);
  if (one.result.missing.join() !== '2' || one.draft.team[2] || one.draft.team[0].uid !== one.opened.team[0].uid || one.draft.team[1].uid !== one.opened.team[1].uid) bad('a sold copy did not leave just its slot empty');
  const lead = rebuilt([0]);
  if (lead.result.missing.join() !== '0' || lead.draft.team[0].uid !== lead.opened.team[1].uid) bad('a sold lead did not bring the next one up');
  rosterOk(lead.draft.team, lead.save, 'a revert with the lead sold');
  const none = rebuilt([0, 1, 2]);
  if (none.result.ok || JSON.stringify(none.draft.team) !== none.now) bad('a revert with nothing left changed the roster');
  const save = freshSave(), draft = Draft.open(save), opened = Draft.open(save), uid = opened.team[1].uid;
  Draft.drop(draft, save, { uid, fromSlot: 1 }, { kind: 'grid' }); Draft.commit(draft, save);
  save.box.find(c => Copies.longId(c.u) === uid).d = 143;
  Draft.revert(draft, opened, save); Draft.commit(draft, save);
  if (save.team[1].uid !== uid || save.team[1].dex !== 143) bad('an evolved copy did not come back as it is now');
  rosterOk(save.team, save, 'a revert after evolving');
  console.log('1b revert goes by copy'); }

// 2. no path empties slot 1, duplicates a copy or loses one: a long random walk over every key and drag path
{ const save = freshSave(), draft = Draft.open(save), before = uids(save), every = Copies.all(save).map(c => c.pokemonUUID);
  const targets = [...Array(6)].map((_, slot) => ({ kind: 'slot', slot })).concat([{ kind: 'grid' }], [0, 1, 2, 9, -1].map(box => ({ kind: 'box', box })));
  for (let i = 0; i < 6000; i++) {
    const fromSlot = rnd() < 0.5 ? Math.floor(rnd() * 6) : null, slot = fromSlot == null ? null : draft.team[fromSlot], uid = fromSlot == null ? pick(every) : slot && slot.uid;
    if (!uid) continue;
    const target = pick(targets), was = JSON.stringify(draft.team), result = Draft.drop(draft, save, { uid, fromSlot }, target);
    rosterOk(draft.team, save, JSON.stringify(target));
    if (!result.ok && JSON.stringify(draft.team) !== was) bad('a refused drop changed the roster');
    if (uids(save) !== before) bad('a drop lost or duplicated a copy');
  }
  Draft.commit(draft, save); rosterOk(save.team, save, 'commit');
  if (Draft.differs(draft, save) || save.partner !== save.team[0].dex) bad('commit did not save the roster and its lead');
  console.log('2 no path empties slot 1, duplicates a copy or loses one'); }

// 2b. a swap keeps both copies; freeing slot 1 is refused with its reason; an unknown copy is refused
{ const save = freshSave(), draft = Draft.open(save), [a, b] = draft.team;
  const swap = Draft.drop(draft, save, { uid: a.uid, fromSlot: 0 }, { kind: 'slot', slot: 1 });
  if (!swap.ok || draft.team[1].uid !== a.uid || draft.team[0].uid !== b.uid) bad('two team members did not swap');
  if (Draft.drop(draft, save, { uid: draft.team[0].uid, fromSlot: 0 }, { kind: 'grid' }).error !== 'lead') bad('the lead left for the grid');
  if (Draft.drop(draft, save, { uid: draft.team[0].uid, fromSlot: 0 }, { kind: 'slot', slot: 5 }).error !== 'lead') bad('the lead left for an empty slot');
  if (Draft.drop(draft, save, { uid: Copies.uuid(), fromSlot: null }, { kind: 'slot', slot: 3 }).error !== 'none') bad('a copy the save lacks was placed');
  Draft.commit(draft, save); if (save.partner !== b.dex || save.team[0].uid !== b.uid) bad('commit kept the old lead');
  console.log('2b swaps keep both, the lead stays, unknown copies are refused'); }

// 3. selling: protected copies never sell, coins rise by exactly the prices
{ const save = freshSave(), draft = Draft.open(save), all = Copies.all(save).map(c => c.pokemonUUID);
  Draft.drop(draft, save, { uid: all[6], fromSlot: null }, { kind: 'slot', slot: 3 });
  Draft.drop(draft, save, { uid: draft.team[1].uid, fromSlot: 1 }, { kind: 'grid' }); // still on the saved team
  Copies.setLocked(save, all[7], true); Copies.setFavorite(save, all[8], true);
  const protectedUids = [all[0], all[1], all[2], all[6], all[7]];
  const sellable = all.filter(uid => !Draft.bulkSellRefusal(draft, save, Copies.get(save, uid)));
  for (const uid of protectedUids.concat(all[8])) if (sellable.includes(uid)) bad('a team, pending, locked or favorite copy can be bulk sold');
  const sum = sellable.reduce((total, uid) => total + Copies.sellPrice(save, uid), 0), coins = save.coins;
  const sold = Copies.sellMany(save, all, Draft.uids(draft));
  if (sold.sold !== sellable.length || save.coins - coins !== sum) bad('coins did not rise by the sum of the prices');
  for (const uid of protectedUids.concat(all[8])) if (!Copies.get(save, uid)) bad('a protected copy was sold');
  for (const uid of protectedUids) if (!Draft.sellRefusal(draft, save, Copies.get(save, uid)) || Copies.sell(save, uid, Draft.uids(draft)).ok) bad('a team, pending or locked copy sold on its own');
  const fav = Copies.get(save, all[8]), price = Copies.sellPrice(save, all[8]), had = save.coins;
  if (Draft.sellRefusal(draft, save, fav) || !Copies.sell(save, all[8], Draft.uids(draft)).ok || save.coins - had !== price) bad('a single favorite did not sell for its price');
  console.log('3 protected copies never sell; coins rise by the prices'); }

// 4. a full or unbought box refuses a move and changes nothing
{ const save = freshSave(), draft = Draft.open(save), uid = Copies.all(save)[9].pokemonUUID;
  while (Copies.inBox(save, 1) < Copies.BOX_SIZE) { const c = Copies.roll({ dex: 4, from: 'wild' }, rnd); c.b = 1; save.box.push(c); }
  for (const [box, error] of [[1, 'full'], [save.boxCount, 'none']]) {
    const was = JSON.stringify(save), result = Draft.drop(draft, save, { uid, fromSlot: null }, { kind: 'box', box });
    if (result.ok || result.error !== error || JSON.stringify(save) !== was) bad('box ' + box + ' did not refuse cleanly: ' + JSON.stringify(result));
  }
  console.log('4 a full or unbought box refuses and changes nothing'); }

// 5. the list: filters only narrow, every sort is a permutation, its direction reverses, ties go by dex number
{ const save = freshSave(40), all = Copies.all(save);
  Copies.setFavorite(save, all[3].pokemonUUID, true); Copies.setLocked(save, all[5].pokemonUUID, true); Copies.setNickname(save, all[6].pokemonUUID, 'Zed');
  const entries = List.boxEntries(save, 0), none = List.newFilter();
  const ids = list => list.map(e => e.copy.pokemonUUID);
  if (List.filtered(entries, none, save).length !== entries.length) bad('an empty filter hid a copy');
  for (const [key, value] of [['types', ['fire']], ['rarity', [2]], ['regions', [1]], ['favorite', true], ['locked', true], ['query', 'zed']]) {
    const shown = List.filtered(entries, { ...none, [key]: value }, save);
    if (!shown.length || shown.length >= entries.length) bad('filter ' + key + ' did not narrow: ' + shown.length);
  }
  const [favOnly, lockOnly, either] = [{ favorite: true }, { locked: true }, { favorite: true, locked: true }].map(f => List.filtered(entries, { ...none, ...f }, save).length);
  if (either !== favOnly + lockOnly) bad('favorite and locked together show either mark');
  for (const sort of List.SORTS) {
    const up = List.sorted(entries, sort.key, 1), down = List.sorted(entries, sort.key, -1), value = e => sort.value(e);
    if (ids(up).slice().sort().join() !== ids(entries).slice().sort().join()) bad('sort ' + sort.key + ' lost a copy');
    for (let i = 1; i < up.length; i++) {
      if (value(up[i - 1]) > value(up[i]) || value(down[i - 1]) < value(down[i])) { bad('sort ' + sort.key + ' is out of order'); break; }
      if (value(up[i - 1]) === value(up[i]) && up[i - 1].species.dex > up[i].species.dex) { bad('sort ' + sort.key + ' ties are not by dex'); break; }
    }
  }
  const dexEntries = List.speciesEntries(), forDex = List.sortsFor(true), dexOrder = list => list.map(e => e.species.dex).join();
  if (forDex.some(s => s.copyOnly) || forDex.length >= List.SORTS.length) bad('the Pokedex tab offers a copy sort');
  if (dexOrder(List.sorted(dexEntries, 'level', -1)) !== dexOrder(List.sorted(dexEntries, 'dex', 1))) bad('a copy sort on the Pokedex tab is not by dex');
  delete save.owned[25];
  const own = List.filtered(dexEntries, { ...none, own: 'own' }, save).length, miss = List.filtered(dexEntries, { ...none, own: 'miss' }, save).length;
  if (own + miss !== dexEntries.length || !miss) bad('owned and unowned do not split the Pokedex');
  if (List.filtered(dexEntries, { ...none, query: 'spark' }, save).length) bad('a name search finds a species you do not own');
  console.log('5 filters narrow, sorts permute, ties go by dex'); }

console.log(fail ? 'team menu harness: ' + fail + ' FAIL' : 'team menu harness: all passed');
process.exit(fail ? 1 : 0);
