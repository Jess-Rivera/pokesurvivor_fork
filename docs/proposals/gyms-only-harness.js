// Gyms-only offline checks (slice 7a-0, commit A; Node only). Usage from the repo root:  node docs/proposals/gyms-only-harness.js .
// Real util, stats, pokedex, sprite meta, moves, enemies, gyms, enemy, elites, spawner, events, weather, gym-arena, gym, gym-present,
// achievements, missions, progress and goals-ui files, with stubbed engine globals and a stub DOM. Checks: the removed modules are gone
// and G.GymArena is in; a search guard over js/ and dev.html for the removed boss modes; spawner, events and weather pause inside the gym
// arena (with a control run outside it); no removed achievement or mission id; an old save holding those ids loads, keeps its fields,
// and the goals screen and a public profile render; legendaries never reach the wild cast, the boss slots, an elite or the lost-Pokemon
// event; a gym win still pays the level, revive, badge and Bond. The mutation runner (gyms-only-mutate.js) points GYMSONLY_<FILE> at
// altered copies. The live game, the HUD and the arena visuals are NOT covered (no browser).
const fs = require('fs'), vm = require('vm'), path = require('path');
const R = process.argv[2] || '.';
const SRC = { 'js/systems/gym-arena.js': 'GYMSONLY_ARENA', 'js/systems/spawner.js': 'GYMSONLY_SPAWNER', 'js/data/enemies.js': 'GYMSONLY_ENEMIES',
  'js/data/achievements.js': 'GYMSONLY_ACH', 'js/ui/goals-ui.js': 'GYMSONLY_GOALS' };
const load = p => { const f = (SRC[p] && process.env[SRC[p]]) || R + '/' + p; vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: p }); };
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global; global.location = { search: '?dev' };
// a stub DOM: enough for goals-ui.js and the progress toast
const made = [], els = {};
const mkEl = tag => { const e = { tag, children: [], className: '', dataset: {}, style: {}, innerHTML: '', textContent: '', title: '', onclick: null,
  classList: { add() { }, remove() { }, toggle() { }, contains: () => false },
  appendChild(c) { this.children.push(c); return c; }, prepend(c) { this.children.unshift(c); }, insertAdjacentHTML() { } }; made.push(e); return e; };
global.document = { querySelectorAll: () => [], createElement: mkEl, getElementById: id => els[id] || (els[id] = mkEl('div')), body: mkEl('body'), addEventListener() { } };
let clock = 300;
const log = { levels: 0, revives: 0, boosts: [], bondOffers: 0, preloads: 0, bossChecks: 0 };
const pl = { x: 50, y: 50, r: 10, level: 8, bonds: 0, dead: false, hp: 40, maxHp: 80, bodyH: 20, mon: { name: 'Butterfree', types: ['bug'] }, myTypes: ['bug'], revive() { this.dead = false; } };
const base = { U: null, Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, preload() { log.preloads++; }, animMeta: () => ({ ay: 40 }), PX: 2, dirFromAngle: () => 0 },
  Camera: { sees: () => true, outerRadius: () => 400, kick() { } }, Tiles: { T: 16, arenaBiome: () => 0, ARENA_THEMES: { rock: {} } },
  World: { isFree: () => true, biome: 1, setArena() { }, setBiome() { } }, Coop: { active: false, isHost: false, scaleRate: () => 1, scaleHp: () => 1 }, LIFT: 0,
  Game: { player: pl, st: { get time() { return clock; } }, everyone: () => [pl], grantLevels: n => { log.levels += n; }, reviveTeam: () => { log.revives++; }, badgeBoost: (st, pc) => log.boosts.push(st + ':' + pc), offerBond: () => { log.bondOffers++; }, flash() { } },
  Pickups: { drop() { }, dropXp() { }, pullAll() { } }, Items: { roll: () => 'x', rollFor: () => 'x' }, Log: { on: false },
  UI: { $: id => document.getElementById(id), show() { }, spriteCanvas: () => mkEl('canvas'), toast() { }, isOpen: () => false },
  Icons: { html: () => '' }, Ranking: { periodIds: () => ({ d: 'd-2026-10-31', w: 'w-2026-44' }) },
  Social: { me: null, profileData: () => ({ name: 'Tester', best: {}, medals: [] }) }, DB: { save: null, online: false, commit() { } } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
try { load('js/core/util.js'); } catch (e) { }
if (!G.U || !G.U.TYPE_NAME) { console.log('util did not load'); process.exit(1); }
['js/core/stats.js', 'js/core/simbus.js', 'js/data/pokedex.js', 'js/data/sprites-meta.js', 'js/data/kinds.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/data/enemy-classes.js',
 'js/data/enemies.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js',
 'js/data/gyms.js', 'js/systems/stages.js', 'js/systems/team-cards.js', 'js/entities/enemy.js', 'js/entities/boss-ai.js', 'js/systems/elites.js', 'js/systems/spawner.js', 'js/systems/events.js', 'js/systems/weather.js',
 'js/systems/gym-arena.js', 'js/systems/gym.js', 'js/ui/gym-present.js', 'js/data/achievements.js', 'js/data/missions.js', 'js/systems/progress.js', 'js/ui/goals-ui.js'].forEach(p => {
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 40) console.log('FAIL', m); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));

// 1. the removed modules are gone, G.GymArena is in and loads before gym.js
{ const own = k => Object.prototype.hasOwnProperty.call(base, k);
  ok(!own('Rift') && !own('Judgment'), 'G.Rift and G.Judgment must not be registered');
  ok(own('GymArena') && ['reset', 'update', 'drawable', 'openGate', 'enterRequest', 'onEvent'].every(k => typeof G.GymArena[k] === 'function'), 'G.GymArena API');
  ok(!fs.existsSync(R + '/js/systems/rift.js') && !fs.existsSync(R + '/js/systems/judgment.js'), 'rift.js and judgment.js are deleted');
  const main = fs.readFileSync(R + '/js/main.js', 'utf8'); ok(/'GymArena'/.test(main) && !/'Rift'|'Judgment'/.test(main), 'main.js NEED lists GymArena only');
  const html = fs.readFileSync(R + '/dev.html', 'utf8'), ia = html.indexOf('js/systems/gym-arena.js'), ig = html.indexOf('js/systems/gym.js');
  ok(ia > 0 && ig > ia, 'dev.html loads gym-arena.js, before gym.js');
  console.log('1 modules: G.GymArena in, the portal and minute-30 modules out, load order ok'); }

// 2. search guard over js/ and dev.html (allowed: js/net/ deferred, lang-en dead keys, changelog history, the generated pokedex and sprite
//    meta, the gacha's legendary rarity (D1), the old save field names in core/db.js, and lines about the pokedex leg exclusion)
{ const SKIP = /^js\/(net\/|app\.min\.js$|data\/(lang-en|changelog|pokedex|sprites-meta)\.js$)/;
  const LEG_OK_FILES = new Set(['js/systems/gacha.js', 'js/ui/gacha-ui.js', 'js/ui/slots.js', 'js/ui/icons.js']);
  const SAVE_FIELDS = /\b(legends|arenas|riftWins|judged|judgeTime|judgeBosses)\b/;
  const BAN = [/(^|[^a-z])rift/i, /grieta/i, /judg|arceus/i, /\.legend\b|\bleg_|LEGEND_T10|BOSS_T10/];
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]));
  const files = walk(R + '/js').filter(f => f.endsWith('.js')).map(f => path.relative(R, f).replace(/\\/g, '/')).filter(f => !SKIP.test(f));
  const hits = [];
  for (const f of files.concat(['dev.html'])) fs.readFileSync(R + '/' + f, 'utf8').split('\n').forEach((l, i) => {
    if (f === 'js/core/db.js' && SAVE_FIELDS.test(l)) return;
    const leg = /legendar/i.test(l) && !LEG_OK_FILES.has(f) && !/\b(no|non)[- ]legendar|leg flag|pseudo-legendar/i.test(l);
    if (leg || BAN.some(b => b.test(l))) hits.push(f + ':' + (i + 1) + ' ' + l.trim().slice(0, 90));
  });
  ok(files.length > 50, 'the guard walked js/ (' + files.length + ' files)');
  ok(!hits.length, 'search guard: ' + hits.length + ' line(s): ' + hits.slice(0, 6).join(' | '));
  const db = fs.readFileSync(R + '/js/core/db.js', 'utf8');
  ok(['legends: {}', 'arenas: {}', 'riftWins: 0'].every(k => db.includes(k)) && /\['legends', 'arenas'/.test(db), 'core/db.js still defaults and merges the old save fields');
  console.log('2 guard: ' + files.length + ' js files plus dev.html, no portal, minute-30 or legendary-fight reference left'); }

// 3. achievement and mission lists
{ const A = G.AchDefs.LIST, M = G.MissionDefs.daily.concat(G.MissionDefs.weekly);
  const badA = A.filter(a => /^(rift|leg|judge)/.test(a.id) || a.id === 'arenas' || a.dex || ['grietas', 'legendarios'].includes(a.cat));
  ok(!badA.length, 'removed achievements back: ' + badA.map(a => a.id));
  ok(!G.AchDefs.CATS.some(c => ['grietas', 'legendarios'].includes(c[0])), 'removed achievement categories back');
  ok(!M.some(m => m.id === 'wrift' || ['rift', 'judge', 'judgeEnd'].includes(m.ev)) && !G.MissionDefs.BY.wrift, 'removed mission back');
  ok(A.length > 30 && G.MissionDefs.weekly.length === 4, 'the other lists are intact (' + A.length + ' achievements, ' + G.MissionDefs.weekly.length + ' weeklies)');
  console.log('3 lists: ' + A.length + ' achievements in ' + G.AchDefs.CATS.length + ' categories, ' + M.length + ' missions, none from the removed modes'); }

// 4. an old save holding the removed ids and fields
{ const ids = G.Ranking.periodIds();
  const save = { created: 1, coins: 0, tickets: { t1: 0, t10: 0 }, owned: { 1: 1 }, shiny: {}, legends: { 150: 1, 249: 2 }, arenas: { rock: 1 },
    stats: { runs: 3, bestTime: 400, bestLevel: 12, totalKills: 900, pulls: 0, coinsEarned: 0, shinies: 0, bossesTotal: 2, riftWins: 7, judged: 1, judgeTime: 40, judgeBosses: 2, evolutions: 0, missionsDone: 0, groupRuns: 0 },
    ach: { own1: 1, rift1: 1, rift10: 1, arenas: 1, leg10: 1, leg_150: 1, legAll: 1, judge: 1, judge60: 1 },
    missions: { day: ids.d, rerolled: false, daily: [], week: ids.w, weekly: [{ id: 'wrift', goal: 1, param: null, prog: 1, claimed: false, told: true }, { id: 'wkill', goal: 4000, param: null, prog: 10, claimed: false, told: false }] },
    profile: { favs: [], title: 'Valiente' } };
  base.DB.save = save;
  let err = null, chips = 0;
  try {
    G.Progress.ensure(save);
    G.Progress.event('kill', { types: ['rock'], boss: true });
    G.Progress.checkAch();
    G.GoalsUI.open('missions');
    G.GoalsUI.open('ach');
    const cs = made.filter(e => /\bchip\b/.test(e.className) && e.onclick); chips = cs.length;
    for (const c of cs) c.onclick();
    G.GoalsUI.open('profile');
    G.ProfileUI.showData({ name: 'Old', best: { legends: 3, bosses: 2 }, favs: [], medals: Object.keys(save.ach) });
  } catch (e) { err = e; }
  ok(!err, 'old save: the goals screen and a public profile render (' + (err ? err.message : '') + ')');
  ok(chips === G.AchDefs.CATS.length, 'one chip per category: ' + chips);
  ok(!save.missions.weekly.some(m => m.id === 'wrift') && save.missions.weekly.length === 2, 'the old weekly portal mission is dropped and topped up: ' + JSON.stringify(save.missions.weekly.map(m => m.id)));
  ok(save.legends[150] === 1 && Object.keys(save.legends).length === 2 && save.arenas.rock === 1 && save.stats.riftWins === 7 && save.stats.judged === 1 && save.ach.rift1 === 1,
    'old save fields are kept and never written: ' + JSON.stringify({ legends: save.legends, riftWins: save.stats.riftWins }));
  ok(!G.Progress.titles().includes('Valiente'), 'a title from a removed medal is not offered');
  console.log('4 old save: loads, the portal mission dropped, old fields kept, goals (' + chips + ' category tabs) and profile render'); }

// 5. legendaries never reach the wild cast, the boss slots, an elite or the lost-Pokemon event
{ const leg = d => !!(G.DEX_BY[d] && G.DEX_BY[d].leg);
  let castLeg = 0, bossLeg = 0, eliteLeg = 0, draws = 0;
  for (const reg of [null, 1, 4]) {
    G.Enemies.setRegion(reg);
    for (let k = 0; k < 40; k++) {
      const run = G.Enemies.rollRun();
      for (const tier of run.cast) for (const d of tier.list) if (leg(d.dex)) castLeg++;
      for (const b of run.bosses) { draws++; if (leg(b.dex)) bossLeg++; }
    }
    const used = new Set();
    for (const t of [0, 300, 600, 900, 1200, 1500, 1800, 2400, 3000, 3600]) { const d = G.Enemies.eliteDef(t, used); if (d) { used.add(d.dex); draws++; if (leg(d.dex)) eliteLeg++; } }
  }
  G.Enemies.setRegion(null); G.Enemies.rollRun();
  ok(!castLeg && !bossLeg && !eliteLeg, 'legendaries drawn: cast ' + castLeg + ', boss slots ' + bossLeg + ', elites ' + eliteLeg);
  const ev = fs.readFileSync(R + '/js/systems/events.js', 'utf8');
  ok(/G\.DEX\.filter\(p => p\.rarity <= 3 && !p\.leg/.test(ev), 'the lost-Pokemon event pool still excludes legendaries');
  console.log('5 pools: ' + draws + ' boss and elite draws over 3 regions, no legendary; the lost-Pokemon pool keeps its leg filter'); }

// 6. spawner, events and weather pause inside the gym arena (a control run outside it first, so the checks are not vacuous)
const mgr = G.EnemyMgr, alive0 = mgr.bossAlive;
mgr.bossAlive = function () { log.bossChecks++; return alive0.apply(this, arguments); };
const runSpawner = () => { G.Spawner.reset(); const p0 = log.preloads; try { G.Spawner.update(11, pl, 400); } catch (e) { } return log.preloads - p0; };
const runEvents = () => { G.Events.reset(); const b0 = log.bossChecks; try { G.Events.update(400, [pl], 400); } catch (e) { } return log.bossChecks - b0; };
const runWeather = () => { G.Weather.reset(); G.Weather.clear(); const r0 = Math.random; Math.random = () => 0;
  try { G.Weather.update(61, 500, pl); G.Weather.update(1, 501, pl); } catch (e) { } Math.random = r0; const on = !!G.Weather.current; G.Weather.clear(); return on; };
{ G.GymArena.reset(); G.Gym.reset(); G.Elites.reset();
  const out = { spawner: runSpawner(), events: runEvents(), weather: runWeather() };
  ok(out.spawner > 0 && out.events > 0 && out.weather, 'control run outside the arena: ' + JSON.stringify(out));
  clock = 240; G.Gym.update(0.1, pl, 240); const gate = G.GymArena.gate;
  ok(gate && gate.gym && gate.gym === G.Gym.gate && gate.gym.leader === 'Brock', 'the gym gate opens at 4:00');
  for (let i = 0; i < 50; i++) G.GymArena.update(5, pl, 240 + i * 5);
  ok(G.GymArena.gate === gate && !G.GymArena.inArena, 'the gate never times out');
  pl.x = gate.x; pl.y = gate.y - 10; G.GymArena.update(0.05, pl, 500);
  ok(G.GymArena.inArena && !G.GymArena.gate && G.GymArena.arena.gym === gate.gym, 'walking into the gate enters the gym arena');
  const inA = { spawner: runSpawner(), events: runEvents(), weather: runWeather() };
  ok(inA.spawner === 0, 'the spawner pauses in the gym arena'); ok(inA.events === 0, 'events pause in the gym arena'); ok(!inA.weather, 'no random weather in the gym arena');
  console.log('6 arena pause: outside ' + JSON.stringify(out) + ', inside ' + JSON.stringify(inA)); }

// 7. a gym win still pays the level, revive, badge and Bond, then the return to the map
{ const leader = G.EnemyMgr.all().find(e => e.gym); ok(leader && leader.boss, 'the leader spawned as a boss');
  if (leader) {
    clock = 520; leader.hurt(50); G.GymArena.update(0.05, pl, 520); ok(G.GymArena.inArena && !log.levels, 'still fighting while the leader stands');
    leader.hurt(1e9); G.GymArena.update(0.05, pl, 540);
    ok(log.levels === 1 && log.revives === 1 && pl.bonds === 1 && G.Gym.badges.join() === 'Boulder Badge' && log.boosts.join() === 'atk:0.1',
      'win package: ' + JSON.stringify({ levels: log.levels, revives: log.revives, bonds: pl.bonds, badges: G.Gym.badges, boosts: log.boosts }));
    G.GymArena.update(5.1, pl, 546);
    ok(!G.GymArena.inArena && G.Gym.beaten === 1 && log.bondOffers === 1, 'back on the map, gym counted, the Bond offered');
  }
  console.log('7 gym win: level ' + log.levels + ', revive ' + log.revives + ', Bond ' + pl.bonds + ', badges ' + G.Gym.badges.join() + ', back on the map'); }

console.log(fail ? fail + ' FAILED' : 'ALL OK (' + n + ' checks)');
process.exit(fail ? 1 : 0);
