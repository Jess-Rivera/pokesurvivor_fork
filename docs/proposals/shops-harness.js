// Move Shop step 3 (the Move Trainer and TM Mart buildings on the map) offline checks (Node only). Usage from the repo root:
//   node docs/proposals/shops-harness.js .
// Under test: js/systems/shops.js (G.Shops) over the real js/data/shop-contact.js, with stubs for the camera, the ground, the
// arena, co-op and the notice line; and the lines that wire it in (dev.html order, js/main.js NEED, js/game.js startRun /
// update / scene, js/systems/gym.js onReturn, js/ui/hud.js arrows). Plan: docs/ASCII Concept Maps/Move Shop step 3 - Buildings
// and arrows.txt sections 1 to 4 and 7; spec docs/proposals/move-shop-plan.md "Shops on the map". Expected values are
// hand-derived from the plan and spec (2:00, gym return + 90 s, 60 s each, view radius + 140 to + 320, more than 90 degrees
// apart, retry in 2 s, step off to enter again) and from the mask PNGs read by hand, never read from the code under test.
// The mutation runner (shops-mutate.js) points the SH_* variables (SRC below) at altered copies; every mutation must make this fail.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/systems/shops.js': 'SH_SHOPS', 'js/game.js': 'SH_GAME', 'js/systems/gym.js': 'SH_GYM', 'dev.html': 'SH_DEV',
  'js/main.js': 'SH_MAIN', 'js/ui/hud.js': 'SH_HUD' };
const pathOf = p => process.env[SRC[p]] || R + '/' + p;
const read = p => fs.readFileSync(pathOf(p), 'utf8').replace(/\r\n/g, '\n');
const code = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // comments off, so a note never trips a guard
const body = (src, head) => { const i = src.indexOf(head); if (i < 0) return ''; const j = src.indexOf('\n  function ', i + head.length); return src.slice(i, j < 0 ? undefined : j); };
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('FAIL ' + m); } };

// ---- stubs ----
const VIEW_R = 500; // the stubbed view radius (G.Camera.outerRadius)
const said = [];
global.window = global;
global.G = {
  U: { clamp: (v, a, b) => Math.max(a, Math.min(b, v)), dist: (a, b, c, d) => Math.hypot(c - a, d - b) },
  Camera: { outerRadius: () => VIEW_R },
  World: { isFree: () => true },
  GymArena: { inArena: false },
  Coop: { active: false },
  Spawner: { say: (t) => said.push(t) },
  Game: { player: null, st: { time: 0 } },
};
vm.runInThisContext(fs.readFileSync(R + '/js/data/shop-contact.js', 'utf8'), { filename: 'shop-contact.js' });
vm.runInThisContext(read('js/systems/shops.js'), { filename: 'shops.js' });
const S = G.Shops;
// a seeded random, so placement runs are repeatable
let seed = 7;
Math.random = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pl = { x: 1000, y: 1000, dead: false, bodyH: 32 };
const tick = (t, dt = 0.5) => S.update(dt, pl, t);
const fresh = () => { S.reset(); G.World.isFree = () => true; G.GymArena.inArena = false; G.Coop.active = false; pl.x = 1000; pl.y = 1000; said.length = 0; };
const kinds = () => S.list.map(s => s.kind).sort().join(',');
// art pixel (ix, iy) of a building whose door is at (gx, gy), as a world point: art drawn at 1.5x, door at the art's bottom centre
const ART = { trainer: [78, 72], mart: [64, 71] };
const artPt = (k, gx, gy, ix, iy) => ({ x: gx + (ix - ART[k][0] / 2 + 0.5) * 1.5, y: gy + 4 + (iy - ART[k][1] + 0.5) * 1.5 });

// 1. schedule: 2:00, then 90 s after each gym return, never on its own
{ fresh();
  tick(119.5);
  ok(S.list.length === 0, 'nothing before 2:00');
  tick(120);
  ok(S.list.length === 2 && kinds() === 'mart,trainer', 'one Move Trainer and one TM Mart at 2:00: ' + kinds());
  for (let i = 0; i < 120; i++) tick(120.5 + i * 0.5);
  ok(S.list.length === 0, 'the 2:00 pair is gone after 60 s');
  tick(200); tick(300);
  ok(S.list.length === 0, 'no more shops until a gym return (the 2:00 pair does not repeat)');
  S.afterGym(400);
  tick(489.5);
  ok(S.list.length === 0, 'nothing 89.5 s after a gym return');
  tick(490);
  ok(S.list.length === 2 && kinds() === 'mart,trainer', 'both again 90 s after a gym return'); }

// 2. life: 60 s of the clock it is given, fading over the last 1 s
{ fresh(); tick(120);
  ok(S.list.every(s => s.left === 60), 'a new pair has 60 s left');
  ok(S.list.every(s => s.alpha === 0), 'a new pair starts faded in from 0');
  tick(120.5); // t 0.5
  ok(S.list.every(s => s.alpha === 1), 'fully shown after 0.5 s');
  for (let i = 0; i < 118; i++) tick(121 + i * 0.5); // t 59.5
  ok(S.list.length === 2 && S.list.every(s => s.left === 0.5 && s.alpha === 0.5), 'at 59.5 s both are still there, half faded');
  tick(180);
  ok(S.list.length === 0, 'gone at 60 s');
  ok(!/performance\.now|Date\.now/.test(code(read('js/systems/shops.js'))), 'shops.js keeps time only from the run clock it is given');
  // a pause or a menu: no frames for a while, then the run goes on; only the frame's dt ages the shops, not the gap
  fresh(); tick(120); tick(120.5);
  tick(900, 0.5);
  ok(S.list.length === 2 && S.list.every(s => s.left === 59), 'a long pause costs nothing: only the frame time ages them (59 s left)'); }

// 3. placement: off screen, more than 90 degrees apart, on free ground, retry in 2 s
{ let far = 0, apart = 0, box = 0, runs = 0;
  for (let i = 0; i < 200; i++) {
    fresh(); pl.x = (i * 977) % 5000; pl.y = (i * 613) % 5000;
    tick(120);
    const L = S.list;
    if (L.length !== 2) continue;
    runs++;
    const d = L.map(s => Math.hypot(s.x - pl.x, s.y - pl.y));
    if (d.every(v => v > VIEW_R + 140 && v <= VIEW_R + 320 + 1e-9)) far++;
    const b = L.map(s => Math.atan2(s.y - pl.y, s.x - pl.x));
    let sep = Math.abs(b[0] - b[1]) % (2 * Math.PI); if (sep > Math.PI) sep = 2 * Math.PI - sep;
    if (sep > Math.PI / 2) apart++;
    // every corner of the drawn building (1.5x the art) is outside the view circle
    if (L.every(s => { const [w, h] = ART[s.kind].map(v => v * 1.5);
      return [[-w / 2, 4 - h], [w / 2, 4 - h], [-w / 2, 4], [w / 2, 4]].every(([cx, cy]) => Math.hypot(s.x + cx - pl.x, s.y + cy - pl.y) > VIEW_R); })) box++;
  }
  ok(runs === 200, 'every one of 200 placements on free ground places both: ' + runs);
  ok(far === 200, 'every door is beyond the view radius + 140 and within + 320: ' + far + ' / 200');
  ok(apart === 200, 'the two are always more than 90 degrees apart: ' + apart + ' / 200');
  ok(box === 200, 'every building is wholly outside the view circle: ' + box + ' / 200');
  fresh(); G.World.isFree = () => false;
  tick(120);
  ok(S.list.length === 0, 'blocked ground places nothing');
  G.World.isFree = () => true;
  tick(121);
  ok(S.list.length === 0, 'the retry waits 2 s');
  tick(122);
  ok(S.list.length === 2, 'the retry places both once the ground is free'); }

// 4. entering: once per visit, step off before entering again
{ fresh(); tick(120);
  const T = S.list.find(s => s.kind === 'trainer');
  ok(said.length === 0, 'nothing is entered at placement (they spawn far away)');
  Object.assign(pl, artPt('trainer', T.x, T.y, 39, 66)); tick(120.5);
  ok(said.length === 1 && said[0] === 'Move Trainer: opens soon', 'walking onto the Trainer enters it once: ' + said.join(' | '));
  tick(121); tick(121.5);
  ok(said.length === 1, 'standing on it does not enter again');
  Object.assign(pl, artPt('trainer', T.x, T.y, 36, 0)); tick(122);
  ok(said.length === 1, 'the roof (drawn, not solid) does not count');
  Object.assign(pl, artPt('trainer', T.x, T.y, 39, 66)); tick(122.5);
  ok(said.length === 2, 'stepping off and back on enters again');
  const M = S.list.find(s => s.kind === 'mart');
  Object.assign(pl, artPt('mart', M.x, M.y, 32, 65)); tick(123);
  ok(said.length === 3 && said[2] === 'TM Mart: opens soon', 'walking onto the Mart enters it: ' + said[2]);
  pl.dead = true; Object.assign(pl, artPt('trainer', T.x, T.y, 39, 66)); tick(123.5);
  ok(said.length === 3, 'a fainted player enters nothing'); pl.dead = false; }

// 5. the masks, from the PNGs read by hand (move-trainer-contact.png 78 x 72, tm-mart-contact.png 64 x 71)
{ const C = G.ShopContact;
  ok(C && C.trainer.w === 78 && C.trainer.h === 72 && C.mart.w === 64 && C.mart.h === 71, 'mask sizes match the PNGs');
  const on = (k, ix, iy) => { const p = artPt(k, 0, 0, ix, iy); return S.onBuilding(k, 0, 0, p.x, p.y); };
  ok(on('trainer', 39, 66) && on('trainer', 20, 50), 'Trainer: the walls and door are solid');
  ok(!on('trainer', 0, 0) && !on('trainer', 36, 0), 'Trainer: a transparent corner and the roof are not');
  ok(on('mart', 32, 65) && on('mart', 20, 50), 'Mart: the walls and door are solid');
  ok(!on('mart', 0, 0) && !on('mart', 20, 0), 'Mart: a transparent corner and the roof are not'); }

// 6. arena and co-op: hidden and paused in an arena, never in co-op, reset clears
{ fresh(); tick(120); tick(130);
  const left = S.list[0].left;
  G.GymArena.inArena = true;
  ok(S.list.length === 0 && S.drawables().length === 0, 'in an arena the shops are hidden');
  for (let i = 0; i < 20; i++) tick(131 + i * 0.5);
  G.GymArena.inArena = false;
  ok(S.list.length === 2 && S.list[0].left === left, 'their minute stops in an arena and resumes after: ' + S.list[0].left);
  fresh(); G.GymArena.inArena = true; tick(130);
  G.GymArena.inArena = false;
  ok(S.list.length === 0, 'a pair due during an arena does not spawn in it');
  tick(130.5);
  ok(S.list.length === 2, 'it spawns once back on the map');
  fresh(); G.Coop.active = true; tick(120); tick(200);
  G.Coop.active = false;
  ok(S.list.length === 0, 'no shops in co-op');
  fresh(); tick(120); S.reset();
  ok(S.list.length === 0 && S.nextAt === 120, 'reset clears the shops and the next pair is due at 2:00 again'); }

// 7. wiring
{ const html = read('dev.html'), b = html.indexOf('<!-- scripts:begin -->'), e = html.indexOf('<!-- scripts:end -->');
  const at = f => html.indexOf('src="' + f + '"');
  const sc = at('js/data/shop-contact.js'), sh = at('js/systems/shops.js');
  ok(sc > b && sh > b && sh < e && at('js/data/gym-contact.js') < sc && sc < sh, 'dev.html loads shop-contact.js before shops.js, inside the build block');
  ok(at('js/systems/gym.js') < sh && sh < at('js/game.js'), 'dev.html loads shops.js after gym.js and before game.js');
  ok(/NEED = \[[^\]]*'Shops'/.test(read('js/main.js')), 'main.js lists Shops in the NEED array');
  ok(/G\.Shops\.afterGym\(now\(\)\)/.test(code(body(read('js/systems/gym.js'), 'function onReturn('))), 'gym.js: onReturn tells the shops');
  const game = code(read('js/game.js'));
  ok(/G\.Shops\.reset\(\)/.test(body(game, 'function startRun(')), 'game.js: startRun resets the shops');
  ok(/G\.Shops\.update\(dt, pl, time\)/.test(game), 'game.js: the frame updates the shops');
  ok(/for \(const s of G\.Shops\.drawables\(\)\) items\.push/.test(game), 'game.js: the scene draws the buildings, sorted by Y');
  const hud = code(read('js/ui/hud.js'));
  ok(/if \(off\) floatArrow\(ctx, cam, pl, gate\.x, gate\.y, GYM_ARROW/.test(hud), 'hud.js: the gym arrow floats off the character');
  ok(/for \(const s of G\.Shops\.list\)/.test(hud) && /floatArrow\(ctx, cam, pl, s\.x, s\.y, SHOP_ARROW/.test(hud), 'hud.js: each shop gets a red floating arrow'); }

console.log(fail ? 'shops: ' + fail + ' of ' + n + ' checks FAILED' : 'shops: all ' + n + ' checks passed');
process.exitCode = fail ? 1 : 0;
