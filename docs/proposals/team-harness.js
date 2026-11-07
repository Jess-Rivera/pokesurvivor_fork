// G.Team offline checks (Node only), entity model slice 2. Usage from the repo root:  node docs/proposals/team-harness.js
// Under test: js/systems/team.js (members, active member, swap lock, swap and faint rules, shared stores, unspent links, bench
// ticking), the Player.bonds accessor in js/entities/player.js, and as text the wiring in js/game.js, dev.html and js/main.js.
// Plan: docs/proposals/host-model-plan.md slice 2; map: docs/ASCII Concept Maps/Entity Model Slice 2 - Team Module.txt.
// Fighters are plain fakes with only the fields the Team touches. Expected values are worked out by hand from the plan and the
// pre-slice game.js (5 s lock, 0.5 s i-frames, lowest living slot on a faint), never copied from output.
// The real game is covered by tools/smoke-team.js (browser, file://). The mutation runner (team-mutate.js) points the TM_*
// variables (SRC below) at altered copies; every mutation must make this fail.
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const R = path.resolve(__dirname, '..', '..');
const SRC = {
  'js/systems/team.js': 'TM_TEAM',
  'js/entities/player.js': 'TM_PLAYER',
  'js/game.js': 'TM_GAME',
  'dev.html': 'TM_DEV',
  'js/main.js': 'TM_MAIN',
};
const read = (p) => fs.readFileSync(process.env[SRC[p]] || path.join(R, p), 'utf8');
const load = (p) => vm.runInThisContext(read(p), { filename: p });
const noop = new Proxy(function () {}, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global;
global.location = { search: '?dev' };

let storeN = 0;
const base = {
  TeamCards: { store: () => ({ id: ++storeN }) },
  Status: { swapLocked: (h) => !!h.stTrap }, // the real rule (status.js swapLocked): trap on a Player entity locks swaps
};
global.G = new Proxy(base, {
  get: (t, k) => (k in t ? t[k] : noop),
  set: (t, k, v) => {
    t[k] = v;
    return true;
  },
});
for (const p of ['js/systems/team.js', 'js/entities/player.js']) {
  try {
    load(p);
  } catch (e) {
    console.log('FAIL load ' + p + ': ' + e.message);
    process.exit(1);
  }
}

let fail = 0,
  n = 0;
const ok = (c, m) => {
  n++;
  if (!c) {
    fail++;
    console.log('FAIL ' + m);
  }
};
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-9;

// A fake fighter: only what the Team reads or writes. ended counts endDodge calls; ticks records benchUpdate dt.
const mk = (slot, o = {}) =>
  Object.assign(
    {
      teamSlot: slot,
      x: 0,
      y: 0,
      aim: 0,
      invuln: 0,
      dead: false,
      flyT: 0,
      stTrap: null,
      stgTeam: { owner: slot },
      ended: 0,
      ticks: [],
      endDodge() {
        this.ended++;
      },
      benchUpdate(dt) {
        this.ticks.push(dt);
        if (this.dieOnTick) this.dead = true;
      },
    },
    o
  );
const team3 = (carry) => {
  const m = [mk(0), mk(1), mk(2)];
  return { m, t: G.Team.create(m, carry) };
};

// 1. the module and its numbers
ok(G.Team && typeof G.Team.create === 'function' && typeof G.Team.Team === 'function', 'G.Team exposes create and the class');
ok(G.Team.SWAP_LOCK === 5, 'the team swap lock is 5 s (' + G.Team.SWAP_LOCK + ')');
ok(G.Team.SWAP_IFRAME === 0.5, 'the swap i-frames are 0.5 s (' + G.Team.SWAP_IFRAME + ')');

// 2. linking: one store of each kind, on every member, and the lead's stage store is the team's
{
  storeN = 0;
  const { m, t } = team3();
  const lead = m[0].stgTeam;
  const same = (k) => m.every((f) => f[k] === m[0][k]);
  ok(['stgTeam', 'teamCards', 'runItems', 'dodges', 'berries'].every(same), 'every member holds the same five stores');
  ok(m[0].stgTeam === lead && m[0].stgTeam.owner === 0 && t.stages === lead, "team stages are the lead's own store");
  ok(storeN === 1 && t.cards.id === 1, 'one team card store per team (' + storeN + ')');
  ok(Array.isArray(t.runItems) && !t.runItems.length && Array.isArray(t.berries) && !t.berries.length, 'run items and berries start empty');
  ok(JSON.stringify(t.dodges) === '{"cd":[0,0],"gap":0}', 'two ready dodge charges and no gap: ' + JSON.stringify(t.dodges));
  ok(m.every((f) => f.team === t), 'every member knows its team');
  ok(t.activeIdx === 0 && t.active === m[0] && t.lock === 0 && t.bonds === 0, 'slot 1 leads, lock 0, no links');
  const e = G.Team.create([]);
  ok(e.members.length === 0 && e.active === undefined, 'an empty team builds without stores');
}

// 3. canSwap answers, in the old order
{
  const { m, t } = team3();
  ok(t.canSwap(1) === 'ok', 'a free swap is ok');
  ok(t.canSwap(0) === 'no' && t.canSwap(-1) === 'no' && t.canSwap(3) === 'no', 'same slot or out of range: no');
  m[1].dead = true;
  ok(t.canSwap(1) === 'no', 'a fainted target: no');
  m[1].dead = false;
  ok(t.canSwap(1, false) === 'no', 'not playing: no');
  m[0].dead = true;
  ok(t.canSwap(1) === 'no', 'the member on the field fainted: no');
  m[0].dead = false;
  m[0].flyT = 0.3;
  ok(t.canSwap(1) === 'no', 'in the air (Fly): no');
  m[0].flyT = 0;
  m[0].stTrap = { t: 8 };
  ok(t.canSwap(1) === 'trapped', 'trapped: trapped');
  t.lock = 2;
  ok(t.canSwap(1) === 'locked', 'locked AND trapped reports the lock (the Trapped! note only shows once the lock is over)');
  m[0].stTrap = null;
  ok(t.canSwap(1) === 'locked', 'locked: locked');
  m[0].flyT = 1;
  ok(t.canSwap(1) === 'locked', 'locked AND flying reports the lock');
}

// 4. manual swap: position, aim, carry, i-frames, lock, dodge
{
  const carried = [];
  const { m, t } = team3((from, to) => carried.push([from.teamSlot, to.teamSlot]));
  Object.assign(m[0], { x: 120, y: -40, aim: 2.5 });
  m[1].invuln = 0.1;
  const r = t.swap(1);
  ok(r === m[1] && t.active === m[1] && t.activeIdx === 1, 'swap: slot 2 takes the field and is returned');
  ok(m[1].x === 120 && m[1].y === -40 && m[1].aim === 2.5, 'swap: the incoming member takes position and aim');
  ok(near(m[1].invuln, 0.5), 'swap: 0.5 s i-frames (' + m[1].invuln + ')');
  ok(t.lock === 5, 'swap: the lock is 5 s (' + t.lock + ')');
  ok(m[0].ended === 1 && m[1].ended === 0, 'swap: the outgoing body ends its dodge, the incoming one does not');
  ok(carried.length === 1 && carried[0].join() === '0,1', 'swap: the carry runs once, from the outgoing to the incoming member');
  m[2].invuln = 2;
  t.lock = 0;
  t.swap(2);
  ok(m[2].invuln === 2, 'swap: longer i-frames already running are kept (2)');
  ok(m.every((f) => f.dodges === t.dodges), 'swap: the dodge store is not replaced');
}

// 5. the lock counts down
{
  const { t } = team3();
  t.swap(1);
  t.tickLock(1);
  ok(near(t.lock, 4), 'lock: 4 s left after 1 s (' + t.lock + ')');
  t.tickLock(3.75);
  ok(near(t.lock, 0.25), 'lock: 0.25 s left after 4.75 s');
  t.tickLock(1);
  ok(t.lock === 0, 'lock: never below 0');
  t.tickLock(1);
  ok(t.lock === 0, 'lock: stays at 0');
}

// 6. faint: the LOWEST living slot, never the next one; slot gaps; none left
{
  const m = [mk(4), mk(1), mk(3), mk(0)]; // list order differs from slot order
  const t = G.Team.create(m);
  t.activeIdx = 2; // slot 4 (teamSlot 3) on the field
  ok(t.nextOnFaint() === 3, 'faint: teamSlot 0 is chosen, not list order (' + t.nextOnFaint() + ')');
  m[3].dead = true;
  ok(t.nextOnFaint() === 1, 'faint: then teamSlot 1');
  m[1].dead = true;
  ok(t.nextOnFaint() === 0, 'faint: then teamSlot 4, skipping fainted ones');
  m[0].dead = true;
  ok(t.nextOnFaint() === -1, 'faint: -1 when nobody else is standing');
  t.activeIdx = 0;
  m[0].dead = false;
  m[2].dead = false;
  ok(t.nextOnFaint() === 2, 'faint: the member on the field is never chosen');
}

// 7. sendIn (faint swap and Re-Do): clears the lock, i-frames, carry
{
  const carried = [];
  const { m, t } = team3((from, to) => carried.push(to.teamSlot));
  t.swap(2);
  ok(t.lock === 5, 'sendIn setup: locked after a manual swap');
  m[2].dead = true;
  const i = t.nextOnFaint();
  t.sendIn(i);
  ok(t.activeIdx === 0 && t.lock === 0, 'sendIn: slot 1 comes in and the lock clears');
  ok(near(m[0].invuln, 0.5), 'sendIn: 0.5 s i-frames');
  ok(carried.join() === '2,0', 'sendIn: the carry runs as on a swap');
  m[0].invuln = 2; // Re-Do: revive(1) gives 2 s, then it resumes on the same member
  t.sendIn(0);
  ok(t.activeIdx === 0 && m[0].invuln === 2 && t.lock === 0, 'Re-Do resume on the member already on the field keeps its 2 s');
}

// 8. unspent links: one Team count, read and spent through any member (D1, Jess 2026-11-06)
{
  const P = G.Player.prototype;
  const pm = (slot) => Object.assign(Object.create(P), mk(slot));
  const m = [pm(0), pm(1), pm(2)];
  const t = G.Team.create(m);
  m[0].bonds++;
  ok(t.bonds === 1 && m[1].bonds === 1 && m[2].bonds === 1, 'links: +1 on the lead reads +1 on every member');
  m[2].bonds = m[2].bonds + 1;
  ok(t.bonds === 2 && m[0].bonds === 2, 'links: +1 on a benched member reads on the lead');
  t.swap(1);
  ok(m[1].bonds === 2, 'links: a swap keeps the count with no copy');
  m[2].bonds = Math.max(0, m[2].bonds - 1); // fuse() on a benched member
  ok(t.bonds === 1 && m[1].bonds === 1, 'links: a benched member spends the team count');
  m[0].bonds = Math.max(0, m[0].bonds - 1);
  m[0].bonds = Math.max(0, m[0].bonds - 1);
  ok(t.bonds === 0, 'links: spending never goes below 0');
  const solo = Object.create(P);
  solo.bonds = 0;
  solo.bonds++;
  ok(solo.bonds === 1 && t.bonds === 0, 'links: a Player with no Team keeps its own count');
  const fresh = Object.create(P);
  ok(fresh.bonds === 0, 'links: an unset count reads 0');
  ok(!Object.prototype.hasOwnProperty.call(m[0], 'bonds'), 'links: no own copy on a team member');
}

// 9. bench ticking: everyone standing but the active member, once each; a bench faint reports right away
{
  const { m, t } = team3();
  t.benchTick(0.1);
  ok(!m[0].ticks.length && m[1].ticks.join() === '0.1' && m[2].ticks.join() === '0.1', 'bench: only benched members tick, once');
  m[2].dead = true;
  t.benchTick(0.1);
  ok(m[2].ticks.length === 1, 'bench: a fainted member does not tick');
  m[2].dead = false;
  m[1].dieOnTick = true;
  const seen = [];
  t.benchTick(0.2, (f) => seen.push(f.teamSlot + ':' + m[2].ticks.length));
  ok(seen.join() === '1:1', 'bench: onFaint runs right after that member, before the next one ticks (' + seen.join() + ')');
  t.benchTick(0.2, (f) => seen.push(f.teamSlot));
  ok(seen.length === 1, 'bench: a member is reported fainted once');
}

// 10. the wiring (text): game.js uses the Team, dev.html and main.js load it
{
  const g = read('js/game.js');
  const body = (name) => {
    const a = g.indexOf(name);
    return a < 0 ? '' : g.slice(a, g.indexOf('\n  }\n', a));
  };
  ok(/runTeam = G\.Team\.create\(roster, carryRun\);\s*pl = runTeam\.active;/.test(body('function startRun(')), 'startRun builds the Team from the roster');
  ok(!/f\.(stgTeam|teamCards|runItems|dodges|berries) = /.test(body('function startRun(')), 'startRun no longer links the stores by hand');
  const carry = body('function carryRun(');
  ok(['level', 'xp', 'xpNext', 'kills', 'bosses', 'coins', 't1', 't10'].every((k) => carry.includes('to.' + k + ' = from.' + k + ';')), 'carryRun copies the run progress');
  ok(carry.length > 50 && !/bonds/.test(carry.replace(/\/\*[\s\S]*?\*\//g, '')), 'carryRun does not copy links');
  ok(/function takeField\(/.test(g) === false && !/\bswapLock\b|\bactiveIdx\b(?!\s*[:)])|SWAP_LOCK =|SWAP_IFRAME =/.test(g.replace(/runTeam\.activeIdx/g, '')), 'game.js keeps no team state of its own');
  ok(/runTeam\.canSwap\(i, state === 'playing'\)/.test(body('function swapTo(')), 'swapTo asks the Team');
  ok(/if \(why !== 'ok'\) return false;\s*field\(i, 'swap'\);/.test(body('function swapTo(')), 'swapTo swaps through field, only on ok');
  ok(/field\(runTeam\.nextOnFaint\(\), 'in'\)/.test(g), 'a faint sends in the Team choice and clears the lock');
  ok(/const reviveIdx = runTeam\.activeIdx;[\s\S]{0,200}field\(reviveIdx, 'in'\)/.test(g), 'Re-Do resumes on the last to faint');
  ok(/runTeam\.tickLock\(dt\);\s*handleSwap\(\);/.test(g), 'the lock ticks right before the swap keys, as before');
  ok(/pl\.update\(dt\);[\s\S]{0,200}runTeam\.benchTick\(dt, /.test(g), 'the bench ticks right after the active member');
  ok(/fainted on the bench!/.test(g), 'the bench faint toast stays in game.js');
  const fld = body('function field(');
  ok(/pl = runTeam\.active;/.test(fld) && /G\.Sprites\.preload\(\[pl\.dex\]/.test(fld), 'field sets pl from the Team and preloads');
  ok((g.match(/\bpl = runTeam\.active;/g) || []).length === 2, 'pl follows the Team in exactly two places (startRun, field)');
  ok(/get swapMax\(\) \{\s*return G\.Team\.SWAP_LOCK;/.test(g), 'G.Game.swapMax reads the Team lock length');
  ok(/get swapCooldown\(\) \{\s*return runTeam \? runTeam\.lock : 0;/.test(g), 'G.Game.swapCooldown reads the Team lock');
  ok(/get activeIndex\(\) \{\s*return runTeam \? runTeam\.activeIdx : 0;/.test(g), 'G.Game.activeIndex reads the Team');
  const t = read('js/systems/team.js').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  ok(!/G\.(Audio|Camera|FX|UI|Input|Spawner|Sprites)\b|dmgText|toast/.test(t), 'team.js has no sound, camera, text or input');
  const d = read('dev.html'),
    at = (s) => d.indexOf('src="' + s + '"');
  const b = d.indexOf('<!-- scripts:begin -->'),
    e = d.indexOf('<!-- scripts:end -->'),
    s = at('js/systems/team.js');
  ok(s > b && s < e && at('js/systems/status.js') < s && s < at('js/game.js'), 'dev.html loads team.js in the build block, after status.js, before game.js');
  ok(/'Stages',\s*'Team',/.test(read('js/main.js')), 'the NEED array lists Team');
}

console.log(fail ? 'team harness: ' + fail + ' of ' + n + ' checks FAILED' : 'team harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
