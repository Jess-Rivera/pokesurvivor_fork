// Move schema slice 7a, the UI readers (menus, level-up cards, icons, the sheet, the player's cast glue), offline checks (Node only).
// Usage from the repo root:  node docs/proposals/ui-readers-harness.js .
// Under test: js/ui/move-info.js (G.MoveInfo), js/ui/sheet.js (routed rows on the folded def), js/systems/levelup.js (new-move cards and
// the 2-buff limit), js/entities/player.js cast() (Life Orb, animation), js/core/stats.js moveCat, tools/kind-guard.js (the 7a guard).
// Rulings: Jess 2026-10-31 (plan picks 1c generated descriptions, 2a badges from the def, 3a player.js readers migrated with a parity
// table, 4a flag-on sheet rows). Expected values are hand-derived from js/data/moves-generated.js and the plan's mapping rules, never read
// from the code under test. Each "changes" list is a move whose answer differs from the legacy kind, shown to Jess in the build report.
// The mutation runner (ui-readers-mutate.js) points the UR_* variables (SRC below) at altered copies; every mutation must make this fail.
const fs = require('fs'), vm = require('vm'), path = require('path');
const R = process.argv[2] || '.';
const SRC = { 'js/ui/move-info.js': 'UR_INFO', 'js/ui/sheet.js': 'UR_SHEET', 'js/systems/levelup.js': 'UR_LEVELUP', 'js/entities/player.js': 'UR_PLAYER',
  'js/core/stats.js': 'UR_STATS' };
const pathOf = p => process.env[SRC[p]] || R + '/' + p;
const load = p => vm.runInThisContext(fs.readFileSync(pathOf(p), 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#' + t);
global.window = global; global.location = { search: '?dev' };
const sfx = [];
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), pickN: a => a, pick: a => a[0], rand: (a) => a },
  DEX: [], DEX_BY: {}, Audio: { sfx: (n, o) => sfx.push(o) }, Sprites: { animMeta: () => null, Animator: class { } }, Log: { on: false } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
const FILES = ['js/core/stats.js', 'js/systems/stages.js', 'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js',
  'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js', 'js/systems/team-cards.js',
  'js/data/moves.js', 'js/entities/player.js', 'js/systems/levelup.js', 'js/ui/move-info.js', 'js/ui/sheet.js'];
for (const p of FILES) { try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } }
// Slice 7b-2a: the legacy table is gone from the game; the parity checks read its frozen copy (docs/move_rework_holding/legacy-moves.js).
const LB = { G: {}, console }; LB.window = LB; vm.runInNewContext(fs.readFileSync(R + '/docs/move_rework_holding/legacy-moves.js', 'utf8'), LB);
const I = G.MoveInfo, D = G.MoveDefs, L = LB.G.Moves.BY_ID, IDS = Object.keys(D);
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 60) console.log('FAIL', m); } };
const set = a => [...a].sort().join(' ');
const legacyWhere = f => Object.values(L).filter(m => D[m.id] && f(m)).map(m => m.id);

// ===== 1. names, types, categories: every def, and Bubble (no def, D-BUBBLE) =====
ok(IDS.length === 178, '178 resolved defs, Kanto batch 1, Fly, Defense Curl, Roar, Fissure and Future Sight included (' + IDS.length + ')');
ok(IDS.every(id => I.name(id) === D[id].name && I.type(id) === D[id].type), 'name and type come from the def for every move');
ok(IDS.every(id => I.cat(id) === D[id].category), 'category from the def for every move');
ok(IDS.filter(id => L[id]).every(id => D[id].category === L[id].cat), 'parity: every def with a legacy entry keeps the legacy cat (no change)');
ok(!D.bubble && I.name('bubble') === 'bubble' && I.badge('bubble') === null && G.Moves.RETIRED.bubble === 'water-gun', 'Bubble: retired (D-BUBBLE), no def and no badge; a save naming it loads Water Gun');
ok(I.name('no-such-move') === 'no-such-move' && I.type('no-such-move') === 'normal', 'an unknown id falls back to its id and Normal');
ok(G.Stats.moveCat({ id: 'ember' }) === 'special' && G.Stats.moveCat({ id: 'tackle' }) === 'physical' && G.Stats.moveCat({ id: 'harden' }) === 'status' && G.Stats.moveCat({}) === 'physical',
  'moveCat with no cat: the def category, else physical');
console.log('1 names, types, categories');

// ===== 2. the badge (plan 2a): from shape, motion and anchor =====
const KEYS = new Set([...fs.readFileSync(R + '/js/ui/icons.js', 'utf8').match(/const KIND_GLYPH = \{([\s\S]*?)\};/)[1].matchAll(/^\s*(\w+):/gm)].map(m => m[1]));
const BADGE = {
  melee: 'tackle vine-whip wing-attack body-slam bug-bite karate-chop lick metal-claw bite psycho-cut',
  dash: 'quick-attack aerial-ace', buff: 'swords-dance agility harden aqua-ring dragon-dance substitute',
  projectile: 'ember water-gun giga-drain thunder-shock confusion sludge poison-sting rock-throw aura-sphere shadow-ball psychic mud-shot gust string-shot fairy-wind meteor-mash bubble-beam',
  cone: 'flamethrower powder-snow dazzling-gleam', orbit: 'fire-spin leaf-storm', nova: 'heat-wave hyper-voice dark-pulse bulldoze discharge',
  beam: 'hydro-pump psybeam ice-beam dragon-rage flash-cannon', boomerang: 'razor-leaf bonemerang', chain: 'thunderbolt hex', aura: 'bug-buzz night-shade',
  trail: 'toxic flame-wheel', mine: 'spikes toxic-spikes', meteor: 'rock-slide', turret: 'will-o-wisp'
};
const want = {}; for (const b in BADGE) for (const id of BADGE[b].split(' ')) want[id] = b; want.hail = null;
ok(Object.keys(want).length === 63, 'the expected badge table covers 63 moves');
for (const id of IDS.filter(id => id in want)) ok(I.badge(id) === want[id], 'badge ' + id + ': ' + I.badge(id) + ', want ' + want[id]); // pre-Kanto moves; batch 1 badges are checked at its batch review
ok(IDS.every(id => I.badge(id) === null || KEYS.has(I.badge(id))), 'every badge is a glyph icons.js can draw');
const BADGE_CHANGES = 'bubble-beam bulldoze dazzling-gleam discharge fairy-wind gust hail meteor-mash mud-shot powder-snow psychic psycho-cut string-shot substitute';
ok(set(IDS.filter(id => L[id] && I.badge(id) !== (L[id].kind === undefined ? null : L[id].kind))) === BADGE_CHANGES, 'badge changes from the legacy family are exactly the reviewed 14');
console.log('2 badges');

// ===== 3. the description (plan 1c): built from the def =====
ok(IDS.every(id => /^[A-Z][^\n]*\.$/.test(I.desc(id))), 'every def gets a one-line, capitalized, full-stop description');
const DESC = {
  tackle: 'Close strike: damage, knockback.', ember: 'Shot: damage, 10% burn.', 'swords-dance': 'Self: team Attack +2.',
  'fire-spin': 'Circles you, always on: damage, burns, traps.', 'giga-drain': 'Shot: damage, heals 50% of damage dealt.',
  'aqua-ring': 'Self, always on: heals 6.3% max HP every 2 s.', 'dragon-rage': 'Beam: 40 fixed damage.', 'night-shade': 'Field around you, always on: damage equal to your level.',
  substitute: 'Self: costs 25% HP, shield for 4 s.', 'string-shot': 'Shot: foe Speed -2, traps.', toxic: 'Leaves a trail as you move, always on: poisons.',
  'leaf-storm': 'Circles you, always on: damage, own Sp. Atk -2.', 'metal-claw': 'Close strike: damage, 10% team Attack +1, knockback.', hail: 'Effect: sets snow for 10 s.',
  hex: 'Chains between foes: damage, x2 on a statused foe, hops to more foes.', 'bug-bite': 'Close strike: damage, knockback.'
};
ok(I.desc('no-such-move') === '', 'desc of an unknown move id is empty, not a throw (legacy() was removed in 7b)');
for (const id in DESC) ok(I.desc(id) === DESC[id], 'desc ' + id + ': "' + I.desc(id) + '"');
ok(I.effects(D.discharge).join() === 'damage,30% paralysis', 'effects walk an emitted child (Discharge: damage from the parent power, 30% paralysis)');
console.log('3 descriptions');

// ===== 4. the parity tables (plan 3a) =====
const OLD = IDS.filter(id => L[id]); // parity is against the legacy table: the pre-Kanto moves (batch 1 has no legacy entry)
// the 2-buff limit: self-only (Jess 2026-10-31); legacy kind buff plus Substitute
ok(set(OLD.filter(I.isBuff)) === set('swords-dance agility harden aqua-ring dragon-dance substitute'.split(' ')), 'buffs: the five plus Substitute');
ok(set(OLD.filter(I.isBuff)) === set(legacyWhere(m => m.kind === 'buff').concat('substitute')), 'buff change from legacy: Substitute only');
ok(!I.isBuff('bubble') && G.LevelUp.teamBuff('substitute') && !G.LevelUp.teamBuff('ember'), 'Bubble is no buff; LevelUp.teamBuff is the same test');
// the melee 25% damage-taken cut: balanceClass melee
const MELEE = OLD.filter(id => D[id].balanceClass === 'melee');
ok(set(MELEE) === set(legacyWhere(m => m.kind === 'melee').concat('quick-attack powder-snow aerial-ace psycho-cut'.split(' '))), 'melee cut: legacy melee plus Quick Attack, Powder Snow, Aerial Ace, Psycho Cut');
// ranged-first targeting: a travelling shot or a beam
const RANGED = OLD.filter(id => (D[id].delivery || {}).motion === 'travels' || (D[id].space || {}).shape === 'linear');
ok(set(RANGED) === set(legacyWhere(m => m.kind === 'projectile' || m.kind === 'beam').concat('psychic mud-shot meteor-mash hex heat-wave'.split(' '))), 'ranged targeting: legacy projectile and beam plus Psychic, Mud Shot, Meteor Mash, Hex, Heat Wave (a travelling wave since 2026-11-02)');
// Life Orb exemption: a persistent def
const FREE = IDS.filter(id => D[id].persistent);
ok(set(FREE) === set('fire-spin leaf-storm toxic flame-wheel aqua-ring bug-buzz night-shade'.split(' ')), 'Life Orb free: the persistent defs (legacy orbit and trail minus Gust, plus Aqua Ring, Bug Buzz, Night Shade)');
console.log('4 parity');

// ===== 5. player.cast: Life Orb and animation through the real method =====
{ const mk = () => { const anims = []; return { hp: 100, maxHp: 1000, remote: false, cdMul: 1, dex: 1, anims, hasItem: k => k === 'lifeorb',
    anim: { busy: () => false, progress: () => 1, play: a => anims.push(a) } }; };
  const cast = id => { const p = mk(); G.Player.prototype.cast.call(p, { id, type: D[id] ? D[id].type : 'normal', cd: 1 }); return p; };
  ok(cast('ember').hp === 90 && cast('gust').hp === 90 && cast('harden').hp === 90, 'Life Orb: Ember, Gust and Harden cost 1% max HP');
  ok(FREE.every(id => cast(id).hp === 100), 'Life Orb: every persistent def is free');
  ok(cast('tackle').anims[0] === 'Attack' && cast('ember').anims[0] === 'Shoot' && cast('harden').anims[0] === 'Charge' && cast('fire-spin').anims[0] === 'Charge',
    'animation by family: Tackle Attack, Ember Shoot, Harden and Fire Spin Charge');
  sfx.length = 0; const t = cast('toxic');
  ok(t.anims.length === 0 && sfx.length === 0, 'a trail plays no sound and no animation');
  sfx.length = 0; cast('hydro-pump'); cast('razor-leaf'); cast('hail');
  ok(sfx.map(o => o.kind).join() === 'beam,projectile,melee', 'the shot sound: beam, boomerang as projectile, no badge as melee (' + sfx.map(o => o.kind) + ')'); }
console.log('5 player.cast');

// ===== 6. the level-up cards =====
{ const pf = G.Moves.poolFor, ROUTE = G.MoveRoute, COOP = G.Coop;
  G.Coop = { active: false }; G.Moves.poolFor = () => ['ember', 'agility'];
  const mkT = (ids, o = {}) => Object.assign({ mon: { types: ['fire'] }, maxMoves: 4, slots: ids.map(id => [{ id }]), moves: ids.map(id => G.Moves.instance(id)),
    hasMove(id) { return ids.includes(id); }, banned: null, teamCards: G.TeamCards.store(), incOf: () => 0, inc: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }, o);
  G.MoveRoute = { on: true, routed: id => !!D[id] };
  // Move Shop step 5 (Jess 2026-11-05): the New Move card is gone. Its text checks moved to tools/smoke-ui.js (a Move Trainer offer
  // for every move) and the 2-buff limit to docs/proposals/shop-screens-harness.js section 7.
  const fam = G.LevelUp.teamFamilies(mkT(['tackle']), [mkT(['tackle'])]);
  ok(!('newmove' in fam) && Object.values(fam).flat().every(c => c.type !== 'new'), 'a free slot and a learnable pool (Ember, Agility) offer no New Move card');
  ok(!('newmove' in G.LevelUp.TEAM_W), 'the family weights have no New Move entry');
  G.Moves.poolFor = pf; G.MoveRoute = ROUTE; G.Coop = COOP; }
console.log('6 level-up cards');

// ===== 7. the sheet: routed rows on the folded def (plan 4a) =====
{ const ROUTE = G.MoveRoute; G.MoveRoute = { on: true, routed: id => !!D[id] };
  G.DEX = [{ stats: [50, 50, 70, 50, 70, 50] }];
  const P = { level: 20, cdMul: 1, moveRadiusMul: 1, atkMul: 1, teamCards: G.TeamCards.store(), myTypes: [], baseAtkStat: 80, baseSpAStat: 80,
    moveFactor(m) { return G.Stats.attackFactor(80, 80, 20, m, 1); }, stabFor() { return false; } };
  const S = G.Sheet, line = id => S.moveLines(P, { id, name: D[id].name, type: D[id].type });
  // Tackle: power 40, cd 0.5, radial radius 54, arc 1.7 rad = 97 degrees, its 0.15 s swing hidden; Ember: power 40, cd 0.7, size 7, speed 310, range 1.6 s
  ok(line('tackle').raw === 'Power 40 · every 0.5 s · area 54 · arc 97°', 'Tackle rows: "' + line('tackle').raw + '"');
  ok(line('ember').raw === 'Power 40 · every 0.7 s · size 7 · speed 310 · range 1.6 s', 'Ember rows: "' + line('ember').raw + '"');
  ok(line('ember').ail === '10% burn' && line('tackle').ail === 'knockback', 'the effect line leaves out plain damage');
  ok(line('swords-dance').hit === '' && line('dragon-rage').hit === '' && line('hydro-pump').hit !== '', 'hit damage only on a move with power and a damage effect');
  ok(IDS.every(id => { const x = line(id); return typeof x.raw === 'string' && x.stacks === ''; }), 'every routed move renders rows, with no legacy stack list');
  const m ={ cat: 'physical', dmg: 40, type: 'normal' }, d40 = G.Stats.applyDamage(P.moveFactor(m), 70, 70, m, 20, false);
  ok(line('tackle').hit === 'Hits for about ' + String(+d40.toFixed(1)), 'Tackle hit: the move-effects adapter against the median Def (' + line('tackle').hit + ')');
  G.TeamCards.add(P.teamCards, 'damage', 2);
  const p2 = G.TeamCards.defOf(P, 'tackle').basePower;
  ok(p2 > 40 && line('tackle').raw.startsWith('Power ' + Math.round(p2)), 'two Damage cards: the row shows the folded power (' + Math.round(p2) + ')');
  G.MoveRoute = ROUTE; }
console.log('7 sheet');

// ===== 8. the 7a guard =====
{ const KG = require(path.resolve(R, 'tools/kind-guard.js'));
  const plant = ['const k = G.Moves.BY_ID[id];', 'const b = G.Kinds.BY[x];', 'if (m.kind) go();', 'if (slot.kind === "orbit") go();', 'if (q.kind !== \'buff\') go();', 'const t = TABLE[def.kind];'];
  ok(plant.every(l => KG.scanText(l).length === 1), 'every planted legacy read is caught (' + plant.filter(l => !KG.scanText(l).length).join(' | ') + ')');
  ok(KG.scanText('const k = G.Moves.BY_ID[id];     // legacy-7b: D-BUBBLE').length === 1 && KG.tagged('a\nb // legacy-7b').join() === '2', 'a legacy-7b tag no longer excuses a line (7b-2b); a stray tag is still listed');
  ok(KG.scanText('if (p.kind === \'coin\') go(); const kind = 3; e.applyBurn(kind);').length === 0, 'a pickup kind, a local named kind: not move reads');
  const r = KG.run(R);
  ok(r.bad.length === 0, 'the tree is clean: ' + r.bad.map(h => h.file + ':' + h.line).join(' '));
  ok(r.tagged.length === 0, 'no legacy-7b tag left (slice 7b-2a): ' + r.tagged.map(t => t.file + ':' + t.line).join(' ')); }
console.log('8 guard');

console.log((fail ? 'FAIL ' : '') + 'ui-readers harness: ' + (n - fail) + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
