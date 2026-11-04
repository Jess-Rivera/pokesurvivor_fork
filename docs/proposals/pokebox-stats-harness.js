// Pokebox step 4 (IVs and natures apply to stats), offline checks (Node only). Usage from the repo root:
//   node docs/proposals/pokebox-stats-harness.js .
// Plan: docs/ASCII Concept Maps/Pokebox 4 - IVs and Natures Apply.txt (D1 to D7). Rules: docs/COMBAT-RULES.md "Stats and HP".
// Loads the REAL js/core/stats.js, types.js, status.js, stages.js, js/entities/player.js, js/data/species-traits.js and
// js/systems/copies.js with stubs (pattern: stat-stage-harness.js), and reads js/game.js as text for the buildFighter wiring.
// Expected numbers are hand-derived from the mainline formula, never read from the code under test:
//   stat = floor((2B + IV) x L / 100) + 5, then x1.1 or x0.9 rounded down;  HP = (floor((2B + IV) x L / 100) + L + 10) x 2 (HP_SCALAR);
//   movement = 107 x g(Spe at L50 / 70), g(r) = exp(w tanh(ln r / w)), w = ln 1.3 above the median, ln(1 / 0.7) below.
// The mutation runner (pokebox-stats-mutate.js) points PS_STATS, PS_PLAYER, PS_COPIES and PS_GAME at altered copies; every
// mutation must make this harness fail.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/core/stats.js': 'PS_STATS', 'js/entities/player.js': 'PS_PLAYER', 'js/systems/copies.js': 'PS_COPIES', 'js/game.js': 'PS_GAME' };
const pathOf = p => process.env[SRC[p]] || R + '/' + p;
const load = p => vm.runInThisContext(fs.readFileSync(pathOf(p), 'utf8'), { filename: p });
const readText = p => fs.readFileSync(pathOf(p), 'utf8');
// @@SETUP
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const DEX_BY = { 143: { dex: 143, name: 'Snorlax', types: ['normal'], stats: [160, 110, 65, 65, 110, 30] },
  40: { dex: 40, name: 'Lowhp', types: ['normal'], stats: [40, 50, 50, 50, 50, 65] } };
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
const GAME_TEXT = readText('js/game.js');
// @@TESTS
const S = G.Stats, C = G.Copies, P = G.Player;
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 80) console.log('FAIL', m); } };
const near = (a, b, e = 1e-9) => typeof a === 'number' && Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const NAT = ['', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
// Snorlax from docs/proposals/pokebox-plan.md "Worked example": Adamant (+Atk -SpA), IVs 28 31 12 5 22 9.
const SNOR_ID = '7f3c2a9e-4b1d-4e8a-9c21-5d0e8f6a1b34', PLAIN_ID = '0b9d6f1e-2c3a-4d5b-8e7f-a1b2c3d4e5f6', LOW_ID = '11111111-2222-4333-8444-555555555555';
const rec = (id, d, n, i) => ({ u: C.shortId(id), d, t: 1793736000, m: 'g', n, i, g: 0, x: 142, y: 97, a: 1 });
const mkSave = () => ({ trainerId: 't', box: [rec(SNOR_ID, 143, 11, '47MFWJ'), rec(PLAIN_ID, 143, 1, 'AAAAAA'), rec(LOW_ID, 40, 1, '777777')], team: [] });
const mon = d => DEX_BY[d];

// ===== 1. neutral is today: no profile, or the neutral one, gives the old numbers =====
{ const T = [[30, 1, 5, 22], [30, 25, 20, 100], [30, 50, 35, 180], [65, 1, 6, 24], [65, 25, 37, 134], [65, 50, 70, 250], [110, 1, 7, 26], [110, 25, 60, 180], [110, 50, 115, 340], [160, 1, 8, 28], [160, 25, 85, 230], [160, 50, 165, 440]];
  for (const [b, L, st, hp] of T) {
    ok(S.statValue(b, L) === st && S.attack(b, L) === st && S.defense(b, L, 0, 0, 1) === st && S.spAtk(b, L) === st && S.spDef(b, L) === st, 'neutral stat base ' + b + ' L' + L + ' = ' + st);
    ok(S.hpForLevel(b, L) === hp && S.hpForLevel(b, L, 0) === hp, 'neutral HP base ' + b + ' L' + L + ' = ' + hp);
  }
  for (const [b, px] of [[30, 75.98169257208211], [65, 107.0], [100, 135.96190693783225], [130, 138.61553964258005]]) ok(near(S.speedToPx(b), px) && near(S.speedToPx(b, 0, 1), px), 'neutral movement base ' + b + ' = ' + px.toFixed(2));
  ok(S.profile(null) === S.NEUTRAL_PROFILE && S.profile({}) === S.NEUTRAL_PROFILE && S.profile({ iv: [1, 2] }) === S.NEUTRAL_PROFILE, 'no copy or a broken one: the neutral profile');
  ok(same(S.NEUTRAL_PROFILE, { iv: [0, 0, 0, 0, 0, 0], nat: [1, 1, 1, 1, 1, 1] }) && Object.isFrozen(S.NEUTRAL_PROFILE.iv), 'the neutral profile is 0 IV, x1, frozen');
}

// ===== 2. all 25 natures (mainline table by name, written out here) =====
{ const UP_DOWN = { hardy: 0, docile: 0, serious: 0, bashful: 0, quirky: 0,
    lonely: [1, 2], brave: [1, 5], adamant: [1, 3], naughty: [1, 4], bold: [2, 1], relaxed: [2, 5], impish: [2, 3], lax: [2, 4],
    timid: [5, 1], hasty: [5, 2], jolly: [5, 3], naive: [5, 4], modest: [3, 1], mild: [3, 2], quiet: [3, 5], rash: [3, 4],
    calm: [4, 1], gentle: [4, 2], sassy: [4, 5], careful: [4, 3] };
  const s = mkSave(); let seen = 0;
  for (let k = 1; k <= 25; k++) {
    s.box[0].n = k; const c = C.read(s.box[0], s), p = S.profile(c), want = UP_DOWN[c.nature];
    if (want === undefined) { ok(false, 'nature id ' + k + ' (' + c.nature + ') is not a mainline name'); continue; }
    seen++;
    const exp = [1, 1, 1, 1, 1, 1]; if (want) { exp[want[0]] = 1.1; exp[want[1]] = 0.9; }
    ok(same(p.nat, exp), c.nature + ': ' + (want ? '+' + NAT[want[0]] + ' -' + NAT[want[1]] : 'neutral') + ', got ' + p.nat.join(' '));
    ok(p.nat[0] === 1, c.nature + ': HP never takes a nature');
  }
  ok(seen === 25, 'all 25 natures checked');
}

// ===== 3. rounding: floor after the +5, then the nature, rounded down =====
{ ok(S.statValue(110, 50, 31, 0, 1.1) === 143, 'Atk 110, IV 31, L50, raised: floor(251 x 50 / 100) + 5 = 130, x1.1 = 143 (nature before the +5 would give 142)');
  ok(S.statValue(65, 50, 5, 0, 0.9) === 64, 'SpA 65, IV 5, L50, lowered: 72 x 0.9 = 64.8 -> 64 (before the +5 would give 65)');
  ok(S.statValue(5, 1, 0, 0, 0.9) === 4, 'a tiny stat: 5 x 0.9 = 4.5 -> 4');
  ok(S.statValue(110, 50, 31, 0, 1) === 130 && S.statValue(110, 50, 31) === 130 && S.statValue(110, 50, 31, 0, null) === 130, 'nature 1, left out, or null: no change');
  ok(S.attack(110, 50, 31, 0, 1.1) === 143 && S.defense(110, 50, 31, 0, 1.1) === 143 && S.spAtk(110, 50, 31, 0, 1.1) === 143 && S.spDef(110, 50, 31, 0, 1.1) === 143, 'the four stat functions pass the nature on');
}

// ===== 4. the Snorlax worked example (IV + nature only, L50) =====
{ const s = mkSave(), c = C.get(s, SNOR_ID), p = S.profile(c), st = mon(143).stats, W = [468, 143, 76, 64, 126, 39];
  ok(same(p.iv, [28, 31, 12, 5, 22, 9]) && same(p.nat, [1, 1.1, 1, 0.9, 1, 1]), 'Snorlax profile: IVs 28 31 12 5 22 9, Adamant +Atk -SpA');
  ok(S.hpForLevel(st[0], 50, p.iv[0]) === W[0], 'Snorlax HP 440 -> ' + W[0]);
  for (let i = 1; i <= 5; i++) ok(S.statValue(st[i], 50, p.iv[i], 0, p.nat[i]) === W[i], 'Snorlax ' + NAT[i] + ' = ' + W[i]);
  ok(near(S.speedToPx(st[5], p.iv[5], p.nat[5]), 76.8629887151295), 'Snorlax movement 76.0 -> 76.9 px/s');
  ok(near(S.speedToPx(65, 31, 1.1), 131.7905263741705) && near(S.speedToPx(65, 0, 0.9), 96.58558988960566), 'base 65 Speed: 31 IV raised 131.8 px/s, 0 IV lowered 96.6 px/s (plan D3)');
}

// ===== 5. a real Player built with a profile: HP, bench sync, movement =====
{ const s = mkSave(), pS = new P(mon(143), {}, false, C.profileOf(s, SNOR_ID, 143)), pN = new P(mon(143), {}, false);
  ok(pN.statProf === S.NEUTRAL_PROFILE && pN.statIv(1) === 0 && pN.statNat(1) === 1, 'no profile: the Player plays neutral');
  ok(pS.statIv(0) === 28 && pS.statNat(1) === 1.1 && pS.statNat(3) === 0.9 && pS.statNat(0) === 1, 'the Player carries the copy profile');
  ok(pS.maxHpAt(50) === 468 && pN.maxHpAt(50) === 440, 'maxHpAt(50): 468 with the IVs, 440 plain');
  const pL = new P(mon(40), {}, false, C.profileOf(s, LOW_ID, 40)), pL0 = new P(mon(40), {}, false);
  ok(pL.maxHp === 24 && pL0.maxHp === 22, 'base 40 HP at L1: IV 31 gives 24, plain 22 (constructor HP)');
  pS.hp = pS.maxHp / 2; pS.syncLevel(50);
  ok(pS.maxHp === 468 && pS.hp === 234, 'bench sync to L50 keeps the HP fraction with the IVs in (468, half = 234)');
  ok(near(pS.baseSpd, 76.8629887151295) && near(pN.baseSpd, 75.98169257208211), 'constructor movement uses the Speed IV (76.9 vs 76.0 px/s)');
}

// ===== 6. moveFactor: Atk for physical, SpA for special, neither for status =====
{ const s = mkSave(), pS = new P(mon(143), {}, false, C.profileOf(s, SNOR_ID, 143)), pN = new P(mon(143), {}, false);
  pS.level = pN.level = 50;
  const ph = { id: 'h-phys', dmg: 60, cat: 'physical' }, sp = { id: 'h-spec', dmg: 60, cat: 'special' }, stt = { id: 'h-stat', dmg: 60, cat: 'status' };
  ok(near(pS.moveFactor(ph) / pN.moveFactor(ph), 143 / 115), 'physical: Atk 143 vs 115');
  ok(near(pS.moveFactor(sp) / pN.moveFactor(sp), 64 / 70), 'special: SpA 64 vs 70');
  ok(near(pS.moveFactor(stt), pN.moveFactor(stt)), 'status: no IV and no nature');
  const pf = S.profile(C.get(s, SNOR_ID));
  ok(near(S.attackFactor(110, 65, 50, ph, 1, pf), 3775.2) && near(S.attackFactor(110, 65, 50, sp, 1, pf), 1689.6), 'attackFactor: (22 x 60 x 143) / 50 = 3775.2, special 1689.6');
  ok(near(S.attackFactor(110, 65, 50, stt, 1, pf), 3036.0), 'attackFactor, status category: neutral Atk 115 (3036)');
}

// ===== 7. hurt(): Def for physical hits, SpD for special =====
{ const s = mkSave(), mk = prof => { const p = new P(mon(143), {}, false, prof); p.level = 50; p.maxHp = p.hp = 1e7; return p; };
  const hit = (p, cat) => { p.invuln = 0; const h0 = p.hp; p.hurt(50000, null, false, { factor: 50000, cat }); return h0 - p.hp; };
  const pS = mk(C.profileOf(s, SNOR_ID, 143)), pN = mk(null), HP = [329.94736842105266, 358.14285714285717], HS = [199.4126984126984, 218.3913043478261];
  ok(near(hit(pS, 'physical'), HP[0]) && near(hit(pN, 'physical'), HP[1]), 'physical hit: (50000 / Def 76 + 2) x 0.5 = ' + HP[0].toFixed(2) + ', plain Def 70 ' + HP[1].toFixed(2));
  ok(near(hit(pS, 'special'), HS[0]) && near(hit(pN, 'special'), HS[1]), 'special hit: SpD 126 vs 115');
}

// ===== 8. enemy calls (no profile) are unchanged =====
{ ok(near(S.attackFactor(110, 65, 50, { dmg: 60, cat: 'physical' }), 3036.0) && near(S.attackFactor(110, 65, 50, { dmg: 60, cat: 'physical' }, 1, null), 3036.0), 'attackFactor with no profile: 3036');
  ok(near(S.applyPlayerDefense(50000, 65, 110, 'physical', 50), [329.94736842105266, 358.14285714285717][1]) && near(S.applyPlayerDefense(50000, 65, 110, 'special', 50, 1, null), [199.4126984126984, 218.3913043478261][1]), 'applyPlayerDefense with no profile: plain Def / SpD');
  ok(near(S.speedToPx(30), 75.98169257208211) && S.hpForLevel(160, 50) === 440, 'speedToPx and hpForLevel with no IV: plain');
}

// ===== 9. copies: profileOf, the D4 fallbacks, two copies of one species, the debug setter, the buildFighter wiring =====
{ const s = mkSave();
  ok(same(C.profileOf(s, SNOR_ID, 143).iv, [28, 31, 12, 5, 22, 9]), 'profileOf reads the copy behind the uid');
  ok(C.profileOf(s, undefined, 143) === S.NEUTRAL_PROFILE && C.profileOf(s, null, 143) === S.NEUTRAL_PROFILE, 'no uid: neutral (D4)');
  ok(C.profileOf(s, '99999999-9999-4999-8999-999999999999', 143) === S.NEUTRAL_PROFILE && C.profileOf(s, 'garbage', 143) === S.NEUTRAL_PROFILE, 'unknown or malformed uid: neutral, no error (D4)');
  ok(C.profileOf(s, SNOR_ID, 25) === S.NEUTRAL_PROFILE, 'a copy of another species: neutral');
  const a = new P(mon(143), {}, false, C.profileOf(s, SNOR_ID, 143)), b = new P(mon(143), {}, false, C.profileOf(s, PLAIN_ID, 143));
  a.level = b.level = 50;
  ok(a.maxHpAt(50) === 468 && b.maxHpAt(50) === 440 && near(a.moveFactor({ dmg: 60, cat: 'physical' }) / b.moveFactor({ dmg: 60, cat: 'physical' }), 143 / 115), 'two copies of one species fight differently');
  const r1 = C.setIvNature(s, PLAIN_ID, 31, 'Jolly');
  ok(r1 && same(r1.iv, [31, 31, 31, 31, 31, 31]) && r1.natureUp === 5 && r1.natureDown === 3 && s.box[1].i === '777777' && s.box[1].n === 16, 'setIvNature: 31 IVs and Jolly (id 16), saved in the compact form');
  const before = JSON.stringify(s.box[1]);
  ok(same(C.setIvNature(s, PLAIN_ID, 0, 'bogus'), { error: 'nature' }) && JSON.stringify(s.box[1]) === before, 'unknown nature: an error and nothing changes');
  ok(C.setIvNature(s, PLAIN_ID, 40).iv[0] === 31 && C.setIvNature(s, PLAIN_ID, -3).iv[0] === 0 && s.box[1].n === 16, 'IVs clamp to 0 to 31; no nature given keeps the nature');
  ok(C.setIvNature(s, '99999999-9999-4999-8999-999999999999', 5) === null, 'a missing copy: null');
  ok(/const f = buildFighter\(G\.DEX_BY\[t\.dex\], [^;]*, t\.uid\);/.test(GAME_TEXT), 'game.js: the roster loop passes the slot uid to buildFighter');
  ok(/function buildFighter\(mon, shiny, uid\)[\s\S]{0,300}new G\.Player\(mon, perks, shiny, G\.Copies\.profileOf\(save, uid, mon\.dex\)\)/.test(GAME_TEXT), 'game.js: buildFighter builds the Player with the copy profile');
}

console.log('pokebox stats harness: ' + (n - fail) + '/' + n + ' passed');
process.exit(fail ? 1 : 0);
