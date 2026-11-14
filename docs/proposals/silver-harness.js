// Move Shop step 2 (Silver, the run's shop currency) offline checks (Node only). Usage from the repo root:
//   node docs/proposals/silver-harness.js .
// Under test: js/systems/silver.js (G.Silver) over the real js/core/stats.js, and the lines that wire it in: the run start
// (js/game.js startRun), the kill loop (js/entities/enemy.js), the end of a run (js/game.js endRun), the HUD (js/ui/hud.js), the
// load order (dev.html, js/main.js NEED) and the coin sheet (assets/items/pickups/silver16.png). Plan: docs/ASCII Concept Maps/
// Move Shop step 2 - Silver.txt sections 2 and 5; spec docs/proposals/move-shop-plan.md "Silver". Expected numbers are hand-derived
// from the spec (a kill pays world level / 10, minimum 1; world level runs linearly from 1 at 0:00 to 50 at 30:00, then holds),
// never read from the code under test.
// The mutation runner (silver-mutate.js) points the SV_* variables (SRC below) at altered copies; every mutation must make this fail.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/systems/silver.js': 'SV_SILVER', 'js/game.js': 'SV_GAME', 'js/entities/enemy.js': 'SV_ENEMY', 'js/ui/hud.js': 'SV_HUD',
  'dev.html': 'SV_DEV', 'js/main.js': 'SV_MAIN' };
const pathOf = p => process.env[SRC[p]] || R + '/' + p;
const read = p => fs.readFileSync(pathOf(p), 'utf8');
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('FAIL ' + m); } };
const near = (a, b) => Math.abs(a - b) < 1e-6;
// The gym offset is stubbed non-zero so a pay that read the gym level instead of the run level would show in the numbers.
global.window = global;
global.G = { U: { clamp: (v, a, b) => Math.max(a, Math.min(b, v)) }, Gyms: { LEVEL_OFFSET: 4 } };
for (const p of ['js/core/stats.js', 'js/systems/silver.js']) vm.runInThisContext(read(p), { filename: p });
const S = G.Silver;
const body = (src, head) => { const i = src.indexOf(head); if (i < 0) return ''; const j = src.indexOf('\n  function ', i + head.length); return src.slice(i, j < 0 ? undefined : j); };
const code = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // comments off, so a note never trips a guard

// 1. a run starts with 100, and a second run starts with 100 again
{ S.reset();
  ok(S.whole === 100 && near(S.amount, 100), 'a run starts with 100 Silver: ' + S.amount);
  S.kill(900); S.kill(1800);
  S.reset();
  ok(S.whole === 100 && near(S.amount, 100), 'a second run starts with 100 again, nothing carries over: ' + S.amount); }

// 2. pay per kill: world level / 10, minimum 1 (world level = 1 + 49 x t / 1800, held at 50 past 30:00)
{ const rows = [
    [0, 1, '0:00, level 1, the minimum'],
    [120, 1, '2:00, level 4.27, the minimum'],
    [300, 1, '5:00, level 9.17, still the minimum'],
    [331, 1.0010556, '5:31, level 10.01, the formula takes over'],
    [600, 1.7333333, '10:00, level 17.33'],
    [900, 2.55, '15:00, level 25.5'],
    [1200, 3.3666667, '20:00, level 33.67'],
    [1800, 5, '30:00, level 50'],
    [2700, 5, '45:00, level held at 50'] ];
  for (const [t, want, why] of rows) ok(near(S.payFor(t), want), 'a kill at ' + why + ' pays ' + want + ': ' + S.payFor(t)); }

// 3. the fraction is kept inside, the count shows whole coins
{ S.set(0); S.kill(900); S.kill(900);
  ok(near(S.amount, 5.1) && S.whole === 5, 'two kills at 15:00 keep 5.1 inside and show 5: ' + S.amount + ' / ' + S.whole);
  S.set(0); for (let i = 0; i < 10; i++) S.kill(900);
  ok(near(S.amount, 25.5) && S.whole === 25, 'ten kills at 15:00 make 25.5, shown 25: ' + S.amount + ' / ' + S.whole);
  S.set(0); S.kill(600);
  ok(S.whole === 1, 'one kill at 10:00 (1.73) shows 1, rounded down: ' + S.whole);
  S.set(0); S.kill(0); S.kill(0); S.kill(0);
  ok(S.whole === 3, 'three early kills pay 1 each: ' + S.whole); }

// 4. spending (for the shop screens, step 4): whole coins only, never below zero
{ S.set(10.9);
  ok(S.spend(11) === false && near(S.amount, 10.9), 'a price above the whole count is refused and nothing is spent');
  ok(S.spend(10) === true && near(S.amount, 0.9) && S.whole === 0, 'paying the whole count leaves the fraction: ' + S.amount);
  ok(S.spend(-1) === false && near(S.amount, 0.9), 'a negative price is refused');
  S.set(-5);
  ok(S.amount === 0, 'the balance never goes below zero'); }

// 4b. #91-2 run totals (DS1, Jess 2026-11-12): earned is kill pay only (not the starting 100, not set()), spent is successful
// spends only, reset() zeroes both. A kill at 15:00 pays 2.55 (section 2).
{ S.reset();
  ok(S.earned === 0 && S.spent === 0, 'a run starts with 0 earned and 0 spent: the starting 100 is not earned');
  S.kill(900); S.kill(900);
  ok(near(S.earned, 5.1) && near(S.amount, 105.1), 'two kills at 15:00: 5.1 earned, 105.1 held: ' + S.earned + ' / ' + S.amount);
  S.set(50);
  ok(near(S.earned, 5.1) && S.spent === 0, 'set() (G.Debug.silver) is neither earned nor spent');
  ok(S.spend(60) === false && S.spent === 0, 'a refused spend counts nothing as spent');
  ok(S.spend(20) === true && S.spend(5) === true && S.spent === 25, 'successful spends add what they took (20 + 5): ' + S.spent);
  S.reset();
  ok(S.earned === 0 && S.spent === 0 && S.whole === 100, 'reset() zeroes both totals'); }

// 5. run-only: the run start resets it, the end of a run and the save never see it
{ const game = read('js/game.js'), silver = code(read('js/systems/silver.js'));
  ok(/G\.Silver\.reset\(\)/.test(body(game, 'function startRun(')), 'game.js: startRun resets Silver');
  const end = body(game, 'function endRun(');
  ok(end.length > 200 && !/silver/i.test(end), 'game.js: endRun never reads Silver, so the PokeCoins earned are the same with 0 or 9,999 Silver');
  ok(!/G\.DB|localStorage|\.save\b|pl\.coins/.test(silver), 'silver.js never touches the save, localStorage or pl.coins'); }

// 6. the kill loop pays every dead enemy once, never a remote enemy or a thief that escapes
{ const e = code(read('js/entities/enemy.js'));
  ok((e.match(/G\.Silver/g) || []).length === 1, 'enemy.js reads Silver in exactly one place');
  // Leader AI slice 2: the pay lives in payKill (a leader's bench faint is paid through it too), called from the dead-enemy branch
  ok(/if \(e\.remote\) continue;\s*if \(e\.dead\) \{\s*payKill\(e, pl\);[^}]*continue;/.test(e) && /function payKill\(e, pl\) \{[^}]*G\.Silver\.kill\(G\.Game\.st\.time\);/.test(e),
    'enemy.js: the pay sits in the dead-enemy branch, after remote enemies are skipped, on the run clock'); }

// 7. the HUD: whole coins, hidden in co-op
{ const h = code(read('js/ui/hud.js')), calls = (h.match(/(?<!function )drawSilver\(/g) || []).length;
  // #62: the canvas counter is the fallback when the HTML overlay is down; the overlay's player panel draws it otherwise
  ok(calls === 1 && /if \(!G\.Coop\.active && !overlayDrawsPlayer\) \{[^}]*drawSilver\(ctx/.test(h), 'hud.js draws Silver once, only outside co-op and only without the overlay (' + calls + ' call(s))');
  const panel = code(read('js/ui/hud-player-panel.js'));
  ok(/silverShown\.value = !G\.Coop\.active;/.test(panel) && /Math\.floor\(silverState\.shown\)/.test(panel), 'hud-player-panel.js: Silver hidden in co-op, whole coins');
  ok(/const target = G\.Silver\.whole|target = G\.Silver\.whole/.test(h), 'hud.js shows the whole count'); }

// 8. loading: the script tag sits after stats.js and before game.js, and the NEED array lists it
{ const html = read('dev.html'), b = html.indexOf('<!-- scripts:begin -->'), e = html.indexOf('<!-- scripts:end -->');
  const at = f => html.indexOf('src="' + f + '"');
  const s = at('js/systems/silver.js');
  ok(s > b && s < e && at('js/core/stats.js') < s && s < at('js/game.js'), 'dev.html loads silver.js inside the build block, after stats.js and before game.js');
  ok(/NEED = \[[^\]]*'Silver'/.test(read('js/main.js')), 'main.js lists Silver in the NEED array'); }

// 9. the coin sheet: 142 x 16 (8 frames of 16 px with a 2 px gap), and pickup-sprites.js points at it
{ const png = R + '/assets/items/pickups/silver16.png';
  const b = fs.existsSync(png) ? fs.readFileSync(png) : null;
  ok(b && b.readUInt32BE(16) === 142 && b.readUInt32BE(20) === 16, 'silver16.png is 142 x 16');
  global.G.PickupSprites = null;
  vm.runInThisContext(fs.readFileSync(R + '/js/data/pickup-sprites.js', 'utf8'), { filename: 'pickup-sprites.js' });
  const sv = G.PickupSprites && G.PickupSprites.silver;
  ok(sv && sv.src === 'assets/items/pickups/silver16.png' && sv.n === 8 && sv.cell === 16 && sv.y === 0, 'pickup-sprites.js has the silver sheet entry'); }

console.log(fail ? 'silver: ' + fail + ' of ' + n + ' checks FAILED' : 'silver: all ' + n + ' checks passed');
process.exitCode = fail ? 1 : 0;
