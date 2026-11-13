// Pokebox step 5 (EVs), offline checks (Node only). Usage from the repo root:  node docs/proposals/pokebox-evs-harness.js .
// Design: docs/proposals/ev-progression.md (Jess, 2026-11-04). Plan: docs/ASCII Concept Maps/Pokebox 5 - EVs.txt (F1 to F10).
// Loads the REAL js/core/stats.js, types.js, status.js, stages.js, js/entities/player.js, js/data/species-traits.js and
// js/systems/copies.js with stubs (pattern: pokebox-stats-harness.js), and reads js/game.js, js/entities/enemy.js, js/ui/run-ui.js,
// js/ui/ev-screen.js (#104), js/ui/ui.js, js/main.js and dev.html as text for the wiring. Expected numbers are hand-derived, never read from the code under test:
//   stat = floor((2B + IV + floor(EV / 4)) x L / 100) + 5, then the nature;  HP = (floor((2B + IV + floor(EV / 4)) x L / 100) + L + 10) x 2;
//   EV yields written out from pokeapi pokemon_stats.csv (effort); bank rates F1: wild 1, elite 2, gym 1000 thousandths per point, shiny x2.
// The mutation runner (pokebox-evs-mutate.js) points PE_STATS, PE_PLAYER, PE_COPIES, PE_GAME, PE_ENEMY, PE_RUNUI and PE_EVSCREEN at altered
// copies; every mutation must make this harness fail.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/core/stats.js': 'PE_STATS', 'js/entities/player.js': 'PE_PLAYER', 'js/systems/copies.js': 'PE_COPIES', 'js/game.js': 'PE_GAME',
  'js/entities/enemy.js': 'PE_ENEMY', 'js/ui/run-ui.js': 'PE_RUNUI', 'js/ui/ev-screen.js': 'PE_EVSCREEN' };
const pathOf = p => process.env[SRC[p]] || R + '/' + p;
const load = p => vm.runInThisContext(fs.readFileSync(pathOf(p), 'utf8'), { filename: p });
const readText = p => fs.readFileSync(pathOf(p), 'utf8');
// @@SETUP
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const DEX_BY = { 143: { dex: 143, name: 'Snorlax', types: ['normal'], stats: [160, 110, 65, 65, 110, 30] },
  40: { dex: 40, name: 'Lowhp', types: ['normal'], stats: [40, 50, 50, 50, 50, 65] },
  16: { dex: 16, name: 'Pidgey', types: ['normal', 'flying'], stats: [40, 45, 40, 35, 35, 56] } };
global.window = global; global.location = { search: '?dev' };
const base = { U: { clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: (a, b) => (a + b) / 2, randInt: a => a, pick: a => a[0], TYPE_COLOR: {}, TYPE_NAME: {} },
  DEX_BY, DEX: [], FX: { dmgText() {}, spark() {}, ring() {}, burst() {}, sp() {}, px() {}, twinkle() {} },
  Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hasShiny: () => false, hovers: () => false, dirFromAngle: () => 0 },
  Weather: { mult: () => 1, speedFor: () => 1, force() {} }, Game: new Proxy({ everyone: () => [] }, { get: (t, k) => (k in t ? t[k] : noop) }),
  Audio: { sfx() {} }, Camera: { kick() {} }, Log: { on: false },
  World: { collide: () => false, isLiquid: () => false, isFree: () => true, projectileBlock: () => null, propsInCircle: () => [] } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
// @@LOAD
for (const p of ['js/core/stats.js', 'js/data/types.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/player.js',
  'js/data/species-traits.js', 'js/systems/copies.js']) { try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } }
const TXT = { game: readText('js/game.js'), enemy: readText('js/entities/enemy.js'), runui: readText('js/ui/run-ui.js'),
  evscreen: readText('js/ui/ev-screen.js'), ui: fs.readFileSync(R + '/js/ui/ui.js', 'utf8'), dev: fs.readFileSync(R + '/dev.html', 'utf8'),
  main: fs.readFileSync(R + '/js/main.js', 'utf8') };
// @@TESTS
const S = G.Stats, C = G.Copies, P = G.Player;
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 80) console.log('FAIL', m); } };
const near = (a, b, e = 1e-9) => typeof a === 'number' && Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const SNOR_ID = '7f3c2a9e-4b1d-4e8a-9c21-5d0e8f6a1b34', B_ID = '0b9d6f1e-2c3a-4d5b-8e7f-a1b2c3d4e5f6', SPE_ID = '22222222-3333-4444-8555-666666666666',
  LOW_ID = '11111111-2222-4333-8444-555555555555', GONE_ID = '99999999-9999-4999-8999-999999999999';
const rec = (id, d, n, i, e) => { const c = { u: C.shortId(id), d, t: 1793736000, m: 'g', n, i, g: 0, x: 142, y: 97, a: 1 }; if (e) c.e = e; return c; };
// The plan's Snorlax (Adamant, IVs 28 31 12 5 22 9, EVs 180 252 78 0 0 0); a plain Snorlax; a plain Snorlax with 252 Speed EVs; a base 40 HP mon with 252 HP EVs.
const mkSave = () => ({ trainerId: 't', box: [rec(SNOR_ID, 143, 11, '47MFWJ', [180, 252, 78, 0, 0, 0]), rec(B_ID, 143, 1, 'AAAAAA'),
  rec(SPE_ID, 143, 1, 'AAAAAA', [0, 0, 0, 0, 0, 252]), rec(LOW_ID, 40, 1, 'AAAAAA', [252, 0, 0, 0, 0, 0])], team: [] });
const mon = d => DEX_BY[d];
const evOf = (s, id) => C.get(s, id).ev;

// ===== 1. the math: EVs in the mainline formula (plan "THE MATH", the Snorlax step 5 column) =====
{ const s = mkSave(), p = S.profile(C.get(s, SNOR_ID)), st = mon(143).stats, W = [512, 178, 85, 64, 126, 39];
  ok(same(p.ev, [180, 252, 78, 0, 0, 0]), 'the profile carries the copy EVs');
  ok(S.hpForLevel(st[0], 50, p.iv[0], p.ev[0]) === W[0], 'Snorlax HP 440 -> 468 (IV) -> 512 (EV 180)');
  for (let i = 1; i <= 5; i++) ok(S.statValue(st[i], 50, p.iv[i], p.ev[i], p.nat[i]) === W[i], 'Snorlax stat ' + i + ' = ' + W[i]);
  ok(S.statValue(100, 100, 0, 3) === 205 && S.statValue(100, 100, 0, 4) === 206, 'floor(EV / 4): 3 EVs change nothing (205), 4 add a point at L100 (206)');
  ok(near(S.speedToPx(30, 0, 1, 252), 100.93899933570495) && near(S.speedToPx(65, 0, 1, 252), 134.95820358432826) && near(S.speedToPx(100, 0, 1, 252), 138.64183210363015), '252 Speed EVs: base 30 100.9, base 65 135.0, base 100 138.6 px/s');
  ok(near(S.speedToPx(30, 9, 1, 0), 76.8629887151295), 'no Speed EVs: Snorlax stays 76.9 px/s');
  const q = S.profile({ iv: [0, 0, 0, 0, 0, 0], natureUp: 1, natureDown: 1, ev: [300, -5, 'x', 4.9, null, 252] });
  ok(same(q.ev, [252, 0, 0, 4, 0, 252]), 'the profile clamps EVs to whole 0 to 252');
  ok(same(S.profile({ iv: [0, 0, 0, 0, 0, 0], natureUp: 1, natureDown: 1 }).ev, [0, 0, 0, 0, 0, 0]), 'a copy with no EVs: six zeros');
  ok(same(S.NEUTRAL_PROFILE.ev, [0, 0, 0, 0, 0, 0]) && Object.isFrozen(S.NEUTRAL_PROFILE.ev), 'the neutral profile has six frozen zero EVs');
}

// ===== 2. yield data (pokeapi pokemon_stats.csv effort, written out here) =====
{ ok(same(C.evYieldOf(10), [1, 0, 0, 0, 0, 0]), 'Caterpie yields 1 HP');
  ok(same(C.evYieldOf(16), [0, 0, 0, 0, 0, 1]), 'Pidgey yields 1 Speed');
  ok(same(C.evYieldOf(74), [0, 0, 1, 0, 0, 0]), 'Geodude yields 1 Defense');
  ok(same(C.evYieldOf(143), [2, 0, 0, 0, 0, 0]), 'Snorlax yields 2 HP');
  ok(same(C.evYieldOf(52), [0, 0, 0, 0, 0, 1]), 'Meowth (the thief) yields 1 Speed');
  ok(same(C.evYieldOf(424242), [0, 0, 0, 0, 0, 0]), 'a species with no data yields nothing');
  ok(Object.values(G.SpeciesTraits.SPECIES).every(r => Array.isArray(r[5]) && r[5].length === 6), 'every species row carries a six-stat yield');
}

// ===== 3. the bank: typed yield x class rate (F1, F2), in thousandths =====
{ const sum = (list) => list.reduce((b, e) => b.map((v, k) => v + C.killEvs(e)[k]), [0, 0, 0, 0, 0, 0]);
  const times = (e, k) => Array.from({ length: k }, () => e);
  ok(same(C.killEvs({ dex: 16 }), [0, 0, 0, 0, 0, 1]), 'a wild Pidgey: 1 thousandth of a Speed EV');
  ok(same(C.killEvs({ dex: 16, elite: { hp: 1 } }), [0, 0, 0, 0, 0, 2]), 'an elite Pidgey: 1/500');
  ok(same(C.killEvs({ dex: 143, gym: { level: 20 } }), [2000, 0, 0, 0, 0, 0]), 'a gym Snorlax: its full yield, 2 HP');
  ok(same(C.killEvs({ dex: 16, shiny: true }), [0, 0, 0, 0, 0, 2]) && same(C.killEvs({ dex: 16, elite: {}, shiny: true }), [0, 0, 0, 0, 0, 4]), 'a shiny doubles its class: wild 2, elite 4');
  ok(same(C.killEvs({ dex: 143, gym: {}, shiny: true }), [4000, 0, 0, 0, 0, 0]), 'a shiny gym Snorlax: 4 HP');
  ok(same(C.killEvs({ dex: 16, golden: true }), [0, 0, 0, 0, 0, 1]) && same(C.killEvs({ dex: 52, behavior: 'thief' }), [0, 0, 0, 0, 0, 1]), 'golden and thief units use the wild rate (F2)');
  ok(C.evClassOf({ gym: {}, elite: {} }) === 'gym' && C.evClassOf({ elite: {} }) === 'elite' && C.evClassOf({ boss: true }) === 'wild' && C.evClassOf({}) === 'wild', 'class: gym, then elite, else wild');
  ok(same(C.wholeEvs(sum(times({ dex: 16 }, 1000))), [0, 0, 0, 0, 0, 1]) && same(C.wholeEvs(sum(times({ dex: 16 }, 999))), [0, 0, 0, 0, 0, 0]), '1000 wild Pidgey are exactly 1 Speed EV, 999 are none');
  ok(same(C.wholeEvs(sum(times({ dex: 16, elite: {} }, 500))), [0, 0, 0, 0, 0, 1]), '500 elite Pidgey are 1 Speed EV');
  const mix = sum([...times({ dex: 16 }, 1500), ...times({ dex: 74 }, 2400), { dex: 143, gym: {} }]);
  ok(same(mix, [2000, 0, 2400, 0, 0, 1500]), 'the banks never mix: Pidgey only Speed, Geodude only Defense, Snorlax only HP');
}

// ===== 4. withdrawing: whole EVs only, the draft's example =====
{ ok(same(C.wholeEvs([0, 3742, 2315, 0, 0, 1891]), [0, 3, 2, 0, 0, 1]), '3.742 / 2.315 / 1.891 give 3 / 2 / 1 (ev-progression.md)');
  ok(same(C.wholeEvs([999, 1000, 0, -5, 1, 252000]), [0, 1, 0, 0, 0, 252]), 'fractions are dropped, never rounded up; a negative bank gives 0');
}

// ===== 5. allocation: across copies, within a stat, 252 and 510 (F4 to F6) =====
{ const s = mkSave();
  let r = C.applyEvPlan(s, [0, 3, 2, 0, 0, 1], [{ uid: B_ID, stat: 1, n: 2 }, { uid: SPE_ID, stat: 1, n: 1 }, { uid: B_ID, stat: 2, n: 2 }, { uid: SPE_ID, stat: 5, n: 1 }]);
  ok(same(r.given, [0, 3, 2, 0, 0, 0]) && same(r.left, [0, 0, 0, 0, 0, 1]), 'one stat split across two copies; the Speed EV is left (that copy already has 252)');
  ok(same(evOf(s, B_ID), [0, 2, 2, 0, 0, 0]) && same(evOf(s, SPE_ID), [0, 1, 0, 0, 0, 252]), 'the EVs landed on the right copies (the Speed one was already 252: refused)');
  r = C.applyEvPlan(s, [0, 3, 0, 0, 0, 0], [{ uid: B_ID, stat: 1, n: 5 }, { uid: B_ID, stat: 0, n: 1 }]);
  ok(same(r.given, [0, 3, 0, 0, 0, 0]) && same(evOf(s, B_ID), [0, 5, 2, 0, 0, 0]), 'never more of a stat than the run banked, never across stats');
  const t = mkSave(); t.box[1].e = [0, 250, 0, 0, 0, 0];
  ok(C.addEvs(t, B_ID, 1, 5) === 2 && evOf(t, B_ID)[1] === 252 && C.addEvs(t, B_ID, 1, 1) === 0, '252 in a stat: 250 + 5 lands 2, then none');
  t.box[1].e = [252, 252, 4, 0, 0, 0];
  ok(C.addEvs(t, B_ID, 3, 5) === 2 && C.get(t, B_ID).evTotal === 510 && C.addEvs(t, B_ID, 4, 1) === 0, '510 per Pokemon: 508 + 5 lands 2, then none in any stat');
  ok(C.addEvs(t, GONE_ID, 1, 4) === 0 && C.addEvs(t, 'junk', 1, 4) === 0 && C.addEvs(t, B_ID, 6, 4) === 0 && C.addEvs(t, SPE_ID, 2, -3) === 0, 'a missing copy, a bad id, a bad stat or a negative count gives nothing');
}

// ===== 6. the save: absent EVs, evTotal, clean() =====
{ const s = mkSave();
  ok(same(C.get(s, B_ID).ev, [0, 0, 0, 0, 0, 0]) && C.get(s, B_ID).evTotal === 0 && C.get(s, SNOR_ID).evTotal === 510, 'no e: six zeros, total 0; the Snorlax total is 510');
  const sv = { box: [rec(B_ID, 143, 1, 'AAAAAA', [300, 300, 0, 0, 0, 0]), rec(SPE_ID, 143, 1, 'AAAAAA', [252, 252, 252, 0, 0, 0]), rec(LOW_ID, 40, 1, 'AAAAAA', [-5, 0, 0, 0, 0, 0])] };
  C.clean(sv);
  ok(same(sv.box[0].e, [252, 252, 0, 0, 0, 0]) && same(sv.box[1].e, [252, 252, 6, 0, 0, 0]) && !('e' in sv.box[2]), 'clean() caps a stat at 252 and the total at 510, and drops all-zero EVs');
  const back = JSON.parse(JSON.stringify(s)); C.clean(back);
  ok(same(back.box[0].e, [180, 252, 78, 0, 0, 0]) && !('e' in back.box[1]), 'a save round trip keeps the EVs');
  // setEvs (#104b): the same cap as clean(), on one copy; numbers by hand
  const t = mkSave();
  ok(same(C.setEvs(t, B_ID, [300, 300, 0, 0, 0, 0]), [252, 252, 0, 0, 0, 0]) && same(evOf(t, B_ID), [252, 252, 0, 0, 0, 0]), 'setEvs caps a stat at 252');
  ok(same(C.setEvs(t, B_ID, [252, 252, 252, 0, 0, 0]), [252, 252, 6, 0, 0, 0]) && C.get(t, B_ID).evTotal === 510, 'setEvs caps the total at 510, later stats cut first');
  ok(same(C.setEvs(t, B_ID, [0, 0, 0, 0, 0, 0]), [0, 0, 0, 0, 0, 0]) && !('e' in t.box[1]), 'setEvs to all zero removes the field');
  const untouched = JSON.stringify(t);
  ok(C.setEvs(t, GONE_ID, [4, 0, 0, 0, 0, 0]) === null && C.setEvs(t, 'junk', [4, 0, 0, 0, 0, 0]) === null && JSON.stringify(t) === untouched, 'setEvs on a missing copy or a bad id returns null and changes nothing');
}

// ===== 7. a real Player: EVs in HP, damage dealt, damage taken, movement =====
{ const s = mkSave(), mk = (id, dex) => { const p = new P(mon(dex), {}, false, C.profileOf(s, id, dex)); return p; };
  const a = mk(SNOR_ID, 143), b = mk(B_ID, 143);
  ok(a.statEv(0) === 180 && a.statEv(1) === 252 && b.statEv(1) === 0 && new P(mon(143)).statEv(3) === 0, 'statEv reads the profile; no profile is 0');
  ok(a.maxHpAt(50) === 512, 'maxHpAt(50) with IVs and EVs: 512');
  ok(mk(LOW_ID, 40).maxHp === 24 && new P(mon(40)).maxHp === 22, 'constructor HP: base 40 with 252 HP EVs at L1 is 24, plain 22');
  a.level = b.level = 50; const ph = { id: 'e-phys', dmg: 60, cat: 'physical' };
  ok(near(a.moveFactor(ph) / b.moveFactor(ph), 178 / 115), 'moveFactor: Atk 178 (IV, EV 252, Adamant) vs 115');
  const hit = (p, cat) => { p.maxHp = p.hp = 1e7; p.invuln = 0; const h0 = p.hp; p.hurt(50000, null, false, { factor: 50000, cat }); return h0 - p.hp; };
  ok(near(hit(a, 'physical'), 295.11764705882354) && near(hit(b, 'physical'), 358.14285714285717), 'a physical hit: Def 85 (IV 12, EV 78) vs 70');
  ok(near(hit(a, 'special'), 199.4126984126984), 'a special hit: SpD 126 (no SpD EVs)');
  ok(near(mk(SPE_ID, 143).baseSpd, 100.93899933570495) && near(b.baseSpd, 75.98169257208211), 'movement: 252 Speed EVs take Snorlax from 76.0 to 100.9 px/s');
}

// ===== 8. enemies (no profile) are unchanged =====
{ ok(near(S.attackFactor(110, 65, 50, { dmg: 60, cat: 'physical' }), 3036.0), 'attackFactor with no profile: 3036');
  ok(near(S.applyPlayerDefense(50000, 65, 110, 'physical', 50), 358.14285714285717) && near(S.speedToPx(30), 75.98169257208211) && S.hpForLevel(160, 50) === 440, 'applyPlayerDefense, speedToPx, hpForLevel with no profile: plain');
}

// ===== 9. wiring (text): the kill banks, the run resets, endRun hands over, the screen gives and saves =====
{ const g = TXT.game, e = TXT.enemy, u = TXT.runui;
  ok(/if \(e\.dead\) \{\s*payKill\(e, pl\);/.test(e) && /function payKill\(e, pl\) \{\s*pl\.kills\+\+;[\s\S]{0,400}G\.Game\.evKill\(e\);/.test(e), 'enemy.js: every dead enemy banks its EVs in the kill loop (payKill, Leader AI slice 2)');
  ok(/evKill\(e\) \{\s*const add = G\.Copies\.killEvs\(e\);\s*for \(let k = 0; k < 6; k\+\+\) evBank\[k\] \+= add\[k\];/.test(g), 'game.js: evKill adds killEvs to the six banks');
  ok(/\n    pendingLevels = 0;\n    evBank = \[0, 0, 0, 0, 0, 0\];\n/.test(g), 'game.js: each run starts with empty banks (no fraction carries over)');
  ok(/f\.copyUid = uid \|\| null;/.test(g) && /out\.push\(\{ uid: f\.copyUid, dex: f\.dex, slot: f\.teamSlot \}\)/.test(g), 'game.js: each fighter keeps its copy; evTeam lists the copies');
  ok(/const evs = coop \|\| !keepsEvs \? null : \{ bank: evBank\.slice\(\), team: evTeam\(\) \};/.test(g) && /caught,\n\s*evs,\n/.test(g), 'game.js: endRun hands the banks and the team to the run-over screen; co-op and a quit get none (#103)');
  ok(/function quitRun\(keepsEvs = false\) \{[\s\S]{0,80}endRun\(false, keepsEvs\);/.test(g) && /function endRun\(dead = true, keepsEvs = dead\)/.test(g), 'game.js: a quit gives no EVs, a fall keeps them (#103)');
  ok(/quitRun\(true\); \/\/ a crash/.test(g) && /\(\) => quitRun\(\) \/\/ a click passes its event/.test(g), 'game.js: the crash save keeps the EVs; the old Quit button passes no click event as keepsEvs (#103)');
  ok(/evGive = !!evWhole && evWhole\.some\(\(v\) => v > 0\) && r\.evs\.team\.length > 0/.test(u) && u.includes("'No whole EVs this run'"), 'run-ui.js: a run with no whole EVs shows one line (F10)');
  ok(/learn: \(\) => G\.EvScreen\.show\(r\.evs, onBack\),/.test(u) && /\$\('btn-again'\)\.onclick = evGive && G\.EvScreen\.ready \? \(\) => G\.EvScreen\.show\(r\.evs, onBack\) : onBack;/.test(u), 'run-ui.js: with whole EVs, Learn from the Loss (and the old co-op card) opens the EV screen (#104)');
  ok(!/showEvs|scr-evs/.test(u) && !TXT.ui.includes("'scr-evs'") && !/id="scr-evs"/.test(TXT.dev), 'the old allocation screen is retired from run-ui.js, ui.js and dev.html (#104)');
  ok(TXT.dev.includes('<script defer src="js/ui/ev-screen.js"></script>') && TXT.main.includes("'EvScreen'"), 'the EV screen loads (dev.html) and is required (main.js NEED) (#104)');
  const v = TXT.evscreen;
  ok(/async function learn\(\) \{\s*const left = leftTotal\(\);\s*if \(left > 0\) \{\s*const yes = await G\.UI\.ask\(/.test(v), 'ev-screen.js: Learn asks first, only when EVs are left over (F5)');
  ok(/G\.Copies\.applyEvPlan\(G\.DB\.save, bank\.value, planned\(\)\);\s*G\.DB\.commit\(true\);/.test(v), 'ev-screen.js: Learn gives through applyEvPlan and saves');
  const goHomeBody = (v.match(/async function goHome\(\) \{([\s\S]*?)\n  \}/) || [])[1] || '';
  ok(/^\s*const yes = await G\.UI\.ask\('Discard all EVs and return\?'/.test(goHomeBody) && !/applyEvPlan|DB\.commit/.test(goHomeBody), 'ev-screen.js: Go Home always asks and saves nothing');
  ok(/bankRoom = leftIn\(stat\),\s*statRoom = G\.Copies\.EV_MAX - member\.before\[stat\] - added\(column, stat\),\s*totalRoom = G\.Copies\.EV_TOTAL - member\.beforeTotal - addedTotal\(column\);\s*return Math\.max\(0, Math\.min\(bankRoom, statRoom, totalRoom\)\);/.test(v), 'ev-screen.js: [+] stops at the bank, 252 and 510 (F6)');
  ok(/SHIFT_STEP = 10,\s*REPEAT_DELAY_MS = 350,\s*REPEAT_EVERY_MS = 83;/.test(v) && /const amount = event\.shiftKey \? SHIFT_STEP : 1;/.test(v), 'ev-screen.js: Shift-click gives 10; holding repeats after 0.35 s, about 12 a second (Jess, 2026-11-13)');
  ok(/LEARN_TOAST_MS = 1000;/.test(v) && /G\.Copies\.applyEvPlan\(G\.DB\.save, bank\.value, planned\(\)\);\s*G\.DB\.commit\(true\);\s*G\.Audio\.sfx\('confirm'\);\s*leaving = true;[^\n]*\n\s*stopRepeat\(\);\s*G\.UI\.toast\('Lessons Learned, Returning Home', LEARN_TOAST_MS\);\s*leaveTimer = setTimeout\(leave, LEARN_TOAST_MS\);/.test(v), 'ev-screen.js: Learn saves first, then the shared toast for 1 s, then home (#104c)');
  ok(/isOpen: \(\) => isOpen\(\) && !leaving,/.test(v) && /if \(event\.button !== 0 \|\| leaving\) return;/.test(v), 'ev-screen.js: during the toast the buttons and + / - take no input (#104c)');
}

console.log('pokebox evs harness: ' + (n - fail) + '/' + n + ' passed');
process.exit(fail ? 1 : 0);
