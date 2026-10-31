// G.Debug.movechecker offline checks (slice 6 tool; plan: docs/ASCII Concept Maps/Debug - movechecker Plan.txt). Node only.
// Usage from the repo root:  node docs/proposals/debug-movechecker-harness.js
// Loads the REAL js/core/debug.js and js/systems/move-render.js against small stubs (game, player, spawner, enemy manager, enemy class,
// team cards) and a recording canvas, then checks: (a) spawning stops and the live enemies are cleared, exactly one dummy added;
// (b) the dummy sits at the chosen distance, cannot move, slide or touch, keeps running its own update, never runs out of HP, is awake;
// (c) one slot per move, up to 6; (d) the range rings: every 50 px out to 600, centred on the player, following the player, none with
// the flag off; (e) the console shows the FOLDED def (team cards in), Infinity as text, and the override row; (f) unknown and unrouted
// ids change nothing; (g) the off call; (h) newcombat still builds its slots through the shared helper.
// The mutation runner (docs/proposals/debug-movechecker-mutate.js) points MC_DEBUG_SRC / MC_RENDER_SRC at altered copies.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '../..');
const SRC = { debug: process.env.MC_DEBUG_SRC || path.join(root, 'js/core/debug.js'), render: process.env.MC_RENDER_SRC || path.join(root, 'js/systems/move-render.js') };
// @@LOAD-BEGIN (the sandbox bundler replaces this block)
const load = f => vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
// @@LOAD-END
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 40) console.log('FAIL', m); } };

// ---- console capture: the tool's own lines go to `said`, never to the harness output ----
const real = { log: console.log, warn: console.warn };
let said = [];
function quiet(fn) {
  said = [];
  console.log = (...a) => said.push({ k: 'log', s: a.map(String).join(' ') });
  console.warn = (...a) => said.push({ k: 'warn', s: a.map(String).join(' ') });
  try { return fn(); } finally { console.log = real.log; console.warn = real.warn; }
}
const warned = () => said.some(x => x.k === 'warn');
const text = () => said.map(x => x.s).join('\n');

// ---- stubs ----
global.window = global; global.location = { search: '?dev&newcombat' }; global.addEventListener = () => {};
global.G = {};
const ROUTED = new Set(['ember', 'gust', 'tackle', 'bubble-beam', 'hyper-voice', 'string-shot', 'psychic', 'flamethrower']);
const BASE = {};
for (const id of [...ROUTED, 'old-move']) BASE[id] = { id, type: 'normal', cd: 0.7, space: { shape: 'radial', radRadius: 40, pierce: Infinity } };
let rate = null, enemies = [], clears = 0, simClears = 0;
G.Spawner = { debugRate: k => (rate = k) };
G.Game = { time: 600, debugMaxed() {}, player: null };
G.MoveRoute = { on: true, routed: id => ROUTED.has(id) };
G.Moves = { BY_ID: BASE, instance: id => ({ id, t: 0 }) };
G.MoveDefs = BASE;
G.MoveOverrides = { ember: { cd: 0.7, why: 'override-row-marker' } };
G.MoveSim = { clear() { simClears++; }, list: () => [] };
G.Projectiles = { clearOrbs() {} };
G.EnemyMgr = { add(e) { enemies.push(e); }, clear() { enemies = []; clears++; }, all: () => enemies };
G.Enemies = { defForDex: dex => ({ dex, behavior: 'ranged', name: 'Rattata' }), scale: t => ({ t }) };
G.Enemy = class {     // a walker that always moves and takes knockback, so the pin is what keeps the dummy still
  constructor(def, x, y) { Object.assign(this, { def, behavior: def.behavior, x, y, spd: 55, hp: 300, maxHp: 300, touchCd: 0, kx: 0, ky: 0, ran: 0 }); }
  update(dt, p) { this.ran++; const d = Math.hypot(p.x - this.x, p.y - this.y) || 1; this.x += (p.x - this.x) / d * 60 * dt + 40; this.y += 12; this.kx = 90; this.ky = -30; }
};
G.TeamCards = { defOf: (o, id) => (o && o.teamCards && o.teamCards.n ? Object.assign({}, BASE[id], { cd: 0.35, folded: 'yes' }) : BASE[id]) };
G.SimBus = { on() {} };
G.Camera = { sees: () => true, kick() {} };
G.U = { TYPE_COLOR: {} };
const pl = { x: 1000, y: 500, aim: 0, r: 12, slots: [[{ id: 'tackle', t: 0 }]], moves: [], active: 2, teamCards: { n: 1 } };
G.Game.player = pl;
quiet(() => { load(SRC.debug); load(SRC.render); });

// ---- recording canvas ----
function mkCtx() {
  const t = { arcs: [], texts: [] };
  return new Proxy(t, {
    get(o, k) {
      if (k === 'arcs' || k === 'texts') return o[k];
      if (k === 'arc') return (x, y, r) => o.arcs.push({ x, y, r });
      if (k === 'fillText') return (s, x, y) => o.texts.push({ s: String(s), x, y });
      if (k in o) return o[k];
      return () => {};
    },
    set(o, k, v) { o[k] = v; return true; }
  });
}
const ringsNow = () => { const c = mkCtx(); G.MoveRender.drawGround(c); return c; };
const WANT_R = Array.from({ length: 12 }, (_, i) => 50 * (i + 1));
const idsOf = () => pl.slots.map(g => g.map(s => s.id).join('+'));

// ---- a. spawning stops, enemies cleared, one dummy ----
enemies = [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }]; rate = null;
let r = quiet(() => G.Debug.movechecker('ember'));
ok(rate === 0, 'a: spawn rate set to 0 (got ' + rate + ')');
ok(enemies.length === 1 && !enemies.some(e => e.id === 'w1'), 'a: live enemies cleared and exactly one dummy added (got ' + enemies.length + ')');
ok(r === 1, 'a: returns the number of moves loaded (got ' + r + ')');
ok(G.MoveRender.overlay === true && G.MoveRender.rings === true, 'a: hitbox overlay and range rings on');
ok(simClears >= 1, 'a: the old slots are cleared through G.MoveSim.clear');

// ---- b. the dummy ----
let e = enemies[0];
ok(e && e.x === pl.x + 150 && e.y === pl.y, 'b: default dummy 150 px to the right (got ' + (e && e.x - pl.x) + ', ' + (e && e.y - pl.y) + ')');
ok(e && e.spd === 0, 'b: dummy speed 0');
ok(e && e.touchCd === Infinity, 'b: dummy has no contact damage');
ok(e && e.hp >= 1e9 && e.maxHp >= 1e9, 'b: dummy HP never runs out');
ok(e && !e.stMajor && e.behavior === 'chase', 'b: dummy is awake (no major status) and not a ranged attacker');
if (e) {
  const x0 = e.x, y0 = e.y;
  for (let k = 0; k < 30; k++) e.update(1 / 60, pl);
  ok(e.x === x0 && e.y === y0, 'b: dummy pinned after 30 updates (moved ' + (e.x - x0) + ', ' + (e.y - y0) + ')');
  ok(e.kx === 0 && e.ky === 0, 'b: dummy keeps no knockback slide');
  ok(e.ran === 30, 'b: the pinned dummy still runs its own update (statuses tick) (ran ' + e.ran + ')');
}
quiet(() => G.Debug.movechecker('ember', 300));
ok(enemies.length === 1 && enemies[0].x === pl.x + 300, 'b: a number argument sets the distance (300)');
quiet(() => G.Debug.movechecker(220, 'gust'));
ok(enemies.length === 1 && enemies[0].x === pl.x + 220, 'b: the number may come first (220)');

// ---- c. slots ----
quiet(() => G.Debug.movechecker('ember'));
ok(JSON.stringify(idsOf()) === '["ember"]' && pl.active === 0, 'c: one slot holding the move, slot 0 active (got ' + idsOf() + ')');
const SIX = ['ember', 'gust', 'tackle', 'bubble-beam', 'hyper-voice', 'string-shot'];
r = quiet(() => G.Debug.movechecker(...SIX));
ok(JSON.stringify(idsOf()) === JSON.stringify(SIX) && r === 6 && !warned(), 'c: six moves, one per slot, in order (got ' + idsOf() + ')');
r = quiet(() => G.Debug.movechecker(...SIX, 'psychic'));
ok(JSON.stringify(idsOf()) === JSON.stringify(SIX) && r === 6 && warned(), 'c: a seventh move is dropped with a warning (got ' + idsOf() + ')');
r = quiet(() => G.Debug.movechecker('ember', 'nope', 'gust'));
ok(JSON.stringify(idsOf()) === '["ember","gust"]' && warned(), 'c: a bad id in a list is skipped with a warning, the rest load');

// ---- d. range rings ----
quiet(() => G.Debug.movechecker('ember'));
let c = ringsNow();
ok(JSON.stringify(c.arcs.map(a => a.r)) === JSON.stringify(WANT_R), 'd: rings every 50 px out to 600 (got ' + c.arcs.map(a => a.r).join(',') + ')');
ok(c.arcs.every(a => a.x === pl.x && a.y === pl.y), 'd: rings centred on the player');
ok(JSON.stringify(c.texts.map(t => t.s)) === JSON.stringify(WANT_R.map(String)), 'd: each ring labelled in px');
pl.x += 333; pl.y -= 77;
c = ringsNow();
ok(c.arcs.length === 12 && c.arcs.every(a => a.x === pl.x && a.y === pl.y), 'd: rings follow the player');
pl.x -= 333; pl.y += 77;
G.MoveRender.rings = false;
ok(ringsNow().arcs.length === 0, 'd: nothing drawn with the rings flag off');
G.MoveRender.rings = true;

// ---- e. console ----
quiet(() => G.Debug.movechecker('ember', 'gust'));
const t = text();
ok(/"folded": "yes"/.test(t) && /"cd": 0\.35/.test(t), 'e: the console shows the folded def (team cards in)');
ok(/"pierce": "Infinity"/.test(t), 'e: Infinity is printed as text, not null');
ok(t.includes('override-row-marker'), 'e: the override row is printed when one exists');
ok(/gust: no override row/.test(t), 'e: a move with no override row says so');
pl.teamCards = null;
quiet(() => G.Debug.movechecker('ember'));
ok(/"cd": 0\.7/.test(text()) && !/"folded"/.test(text()), 'e: with no card store the base def prints');
pl.teamCards = { n: 1 };

// ---- f. unknown and unrouted ids change nothing ----
for (const bad of ['nope', 'old-move']) {
  const before = pl.slots, en0 = enemies, k0 = clears; rate = 'untouched';
  r = quiet(() => G.Debug.movechecker(bad));
  ok(warned() && r === 0, 'f: ' + bad + ' warns and returns 0');
  ok(pl.slots === before && enemies === en0 && clears === k0 && rate === 'untouched', 'f: ' + bad + ' leaves slots, enemies and spawning as they were');
}

// ---- g. off ----
quiet(() => G.Debug.movechecker('ember'));
r = quiet(() => G.Debug.movechecker());
ok(G.MoveRender.rings === false, 'g: off turns the rings off');
ok(enemies.length === 0, 'g: off removes the dummy');
ok(rate === 1, 'g: off turns spawning back on (rate ' + rate + ')');
ok(ringsNow().arcs.length === 0, 'g: no rings drawn after off');

// ---- h. newcombat through the shared helper ----
const s0 = simClears;
r = quiet(() => G.Debug.newcombat('ember', 'gust'));
ok(JSON.stringify(idsOf()) === '["ember","gust"]' && pl.active === 0, 'h: newcombat still loads one slot per move (got ' + idsOf() + ')');
ok(simClears === s0 + 1 && r === 24, 'h: newcombat clears the old slots once and places its 24 dummies (got ' + r + ')');
ok(G.MoveRender.rings === false, 'h: newcombat does not turn the range rings on');

console.log('debug-movechecker harness: ' + (n - fail) + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
