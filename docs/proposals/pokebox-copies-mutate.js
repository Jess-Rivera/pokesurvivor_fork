// Mutation check for the pokebox harnesses (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/pokebox-copies-mutate.js
// Each mutation breaks js/systems/copies.js, js/core/db.js or js/systems/gacha.js in one deliberate way, writes the copy to a temp
// folder, and runs docs/proposals/pokebox-copies-harness.js and docs/proposals/pokebox-sources-harness.js against it (PB_COPIES,
// PB_DB, PB_GACHA env vars). At least one harness must fail every time; a mutation both miss is a gap.
// Not mutated, with the reason: the price tabs and confirm dialog in js/ui/menu.js, the gacha result tags in js/ui/gacha-ui.js, the
// rescue and wild shiny messages in js/game.js, and the debug commands (DOM or one-line callers of G.DB.obtain; feel-tested and probed
// in the browser, the harnesses have no DOM).
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const SRC = { copies: ['js/systems/copies.js', 'PB_COPIES'], db: ['js/core/db.js', 'PB_DB'], gacha: ['js/systems/gacha.js', 'PB_GACHA'] };
const HARNESSES = ['docs/proposals/pokebox-copies-harness.js', 'docs/proposals/pokebox-sources-harness.js'];
const M = [
  // ---- step 3a-1: buying boxes ----
  ['box prices shifted one tier', 'copies', [['const BOX_PRICES = { 3: 10000, 4: 25000, 5: 60000 };', 'const BOX_PRICES = { 3: 25000, 4: 60000, 5: 100000 };']]],
  ['the coin check is gone', 'copies', [["if (!(save.coins >= price)) return { ok: false, error: 'poor' };", '']]],
  ['a sixth box is allowed', 'copies', [["if (n >= BOX_MAX) return { ok: false, error: 'max' };", "if (n > BOX_MAX) return { ok: false, error: 'max' };"]]],
  ['a box is added without charging', 'copies', [['    save.coins -= price;\n    save.boxCount = n + 1;', '    save.boxCount = n + 1;']]],
  ['coins are charged but no box is added', 'copies', [['    save.coins -= price;\n    save.boxCount = n + 1;', '    save.coins -= price;']]],
  ['the price of the box you have is charged', 'copies', [['const price = boxPrice(n + 1);', 'const price = boxPrice(n);']]],
  // ---- step 3a-2: copies at the source ----
  ['fill is back in normalizeTeam (a sold copy returns)', 'db', [['  function normalizeTeam(s) {\n', "  function normalizeTeam(s) {\n    if (G.Copies) for (const k of Object.keys(s.owned || {})) if (G.SpeciesTraits.SPECIES[+k] && !(s.box || []).some((c) => c.d === +k)) G.Copies.add(s, { dex: +k, from: 'other' });\n"]]],
  ['obtain makes no copy on a repeat', 'db', [['    const c = G.Copies.add(s, { dex, shiny: !!shiny, from, at: now });', '    if (!isNew) return { isNew, uid: null, box: null };\n    const c = G.Copies.add(s, { dex, shiny: !!shiny, from, at: now });']]],
  ['obtain also gives a normal copy with a shiny', 'db', [['    const c = G.Copies.add(s, { dex, shiny: !!shiny, from, at: now });', '    if (shiny) G.Copies.add(s, { dex, from, at: now });\n    const c = G.Copies.add(s, { dex, shiny: !!shiny, from, at: now });']]],
  ['obtain writes no Pokedex record', 'db', [['    if (!s.owned[dex]) s.owned[dex] = { at: now, from };\n', '']]],
  ['obtain drops the method (every copy is other)', 'db', [['G.Copies.add(s, { dex, shiny: !!shiny, from, at: now });', 'G.Copies.add(s, { dex, shiny: !!shiny, at: now });']]],
  ['obtain overwrites the first date on a repeat', 'db', [['    if (!s.owned[dex]) s.owned[dex] = { at: now, from };\n', '    s.owned[dex] = { at: s.owned[dex] ? 1 : now, from };\n']]],
  ['the gacha refund is back', 'gacha', [["got = G.DB.obtain(r.dex, r.shiny, 'gacha', save);", "got = G.DB.obtain(r.dex, r.shiny, 'gacha', save);\n      if (!r.isNew) save.coins += REFUND[r.rarity] * (r.shiny ? 3 : 1);"]]],
  ['the repeat shiny re-roll is back', 'gacha', [['const shiny = canShiny && (forceShiny > 0 ? (forceShiny--, true) : Math.random() < SHINY_RATE);', 'let shiny = canShiny && (forceShiny > 0 ? (forceShiny--, true) : Math.random() < SHINY_RATE);\n      if (shiny && save.shiny[mon.dex]) shiny = false;']]],
  ['a pull reports the wrong box', 'gacha', [['uid: got.uid, box: got.box };', 'uid: got.uid, box: 0 };']]],
  ['the gacha writes into the loaded save, not the one it is given', 'gacha', [["G.DB.obtain(r.dex, r.shiny, 'gacha', save);", "G.DB.obtain(r.dex, r.shiny, 'gacha', { owned: {}, shiny: {}, box: [] });"]]],
  // ---- ride-along fix: top bar coins ----
  ['a save write no longer redraws the coins', 'db', [['guests play with a team too\n    redrawCoins();\n', 'guests play with a team too\n']]],
  ['the coins redraw while the top bar is hidden', 'db', [["if (!bar || bar.classList.contains('hidden')) return;", 'if (!bar) return;']]],
  ['a redraw error breaks the save', 'db', [['    try {\n      G.UI.refreshCoins();\n    } catch (e) {\n      /* the bar is not built yet */\n    }', '    G.UI.refreshCoins();']]],
  // ---- 3a-2b: screens redraw on every save write ----
  ['a save write never tells the screens', 'db', [['    redrawCoins();\n    redrawScreens();\n', '    redrawCoins();\n']]],
  ['one failing screen stops the rest', 'db', [['    for (const fn of saveHooks) {\n      try {\n        fn();\n      } catch (e) {\n        /* one screen failing never stops a save or the others */\n      }\n    }', '    try {\n      for (const fn of saveHooks) fn();\n    } catch (e) {\n      /* one screen failing never stops a save or the others */\n    }']]],
  ['guests never tell the screens', 'db', [['    redrawScreens();\n    if (guest || !key || !save) return false;\n', '    if (guest || !key || !save) return false;\n    redrawScreens();\n']]],
  // ---- 3a-3: selling ----
  ['a shiny sells at x1', 'copies', [['const SHINY_SELL = 3;', 'const SHINY_SELL = 1;']]],
  ['the price is one rarity tier off', 'copies', [['return SELL_PRICE[r] * (shiny ? SHINY_SELL : 1);', 'return SELL_PRICE[Math.min(5, r + 1)] * (shiny ? SHINY_SELL : 1);']]],
  ['a copy on the team can be sold', 'copies', [['if ((save.team || []).some((t) => t && t.uid === id) || also.includes(id))', 'if (also.includes(id))']]],
  ['the uncommitted team edits are ignored', 'copies', [['if ((save.team || []).some((t) => t && t.uid === id) || also.includes(id))', 'if ((save.team || []).some((t) => t && t.uid === id))']]],
  ['a locked copy can be sold', 'copies', [["    if (c.l) return { ok: false, error: 'locked' };\n", '']]],
  ['a sale pays but keeps the copy', 'copies', [['    save.box.splice(i, 1);\n', '']]],
  ['a sale removes the copy but pays nothing', 'copies', [['    save.coins = (Math.floor(+save.coins) || 0) + coins;', '    save.coins = Math.floor(+save.coins) || 0;']]],
  // ---- 3a-4: full boxes ----
  ['a new copy overflows into the last box again', 'copies', [['if (inBox(save, b) < BOX_SIZE) return b;\n    return -1;', 'if (inBox(save, b) < BOX_SIZE) return b;\n    return n - 1;']]],
  ['free places miss a box', 'copies', [['    const n = boxCount(save),\n      per = new Array(n).fill(0);', '    const n = boxCount(save) - 1,\n      per = new Array(n).fill(0);']]],
  ['a sale on arrival pays nothing', 'db', [['      s.coins = (Math.floor(+s.coins) || 0) + sold;\n', '']]],
  ['a sale on arrival drops the Pokedex record', 'db', [['      const sold = G.Copies.priceFor(dex, !!shiny);', '      const sold = G.Copies.priceFor(dex, !!shiny);\n      if (isNew) { if (shiny) delete s.shiny[dex]; else delete s.owned[dex]; }']]],
  ['a short pull places in plain pull order', 'gacha', [['if (G.Copies.freePlaces(save) < n) order.sort', 'if (false) order.sort']]],
  ['a shiny is not ranked above rarity', 'gacha', [['(r.shiny ? 10 : 0)', '(r.shiny ? 0 : 0)']]],
  ['results come back in placement order', 'gacha', [['      out[i] = res;', '      out[out.filter(Boolean).length] = res;']]],
  // ---- 3b-1: lock and favorite ----
  ['turning a flag off leaves a 0 in the save', 'copies', [['    else delete c[key];', '    else c[key] = 0;']]],
  ['favorite writes the lock key', 'copies', [["setFlag(save, id, 'f', on)", "setFlag(save, id, 'l', on)"]]],
  ['a locked copy cannot be moved', 'copies', [["if (!c || box < 0 || box >= boxCount(save)) return 'none';", "if (!c || box < 0 || box >= boxCount(save)) return 'none';\n    if (c.l) return 'none';"]]],
  ['the flag setters never turn a flag on', 'copies', [['    if (on) c[key] = 1;', '    if (false) c[key] = 1;']]],
  // ---- 3b-2: nicknames ----
  ['the nickname cap is gone', 'copies', [["out = [...out].slice(0, NICK_MAX).join('');", "out = [...out].join('');"]]],
  ['the nickname cap is back to 12', 'copies', [['NICK_MAX = 16,', 'NICK_MAX = 12,']]],
  ['characters outside the font are kept', 'copies', [['if (!inFont || NICK_DROP.has(c)) continue;', 'if (NICK_DROP.has(c)) continue;']]],
  ['markup characters are kept', 'copies', [['if (!inFont || NICK_DROP.has(c)) continue;', 'if (!inFont) continue;']]],
  ['a cleared name is saved as an empty string', 'copies', [['    if (k) c.k = k;\n    else delete c.k;\n    return k;', '    c.k = k;\n    return k;']]],
  ['spaces are not squeezed', 'copies', [["if (!typing) out = out.replace(/ {2,}/g, ' ').trim();", 'if (!typing) out = out.trim();']]],
  ['a loaded save skips the nickname cleaning', 'copies', [["const nick = typeof c.k === 'string' ? cleanNickname(c.k) : '';", "const nick = typeof c.k === 'string' ? c.k.slice(0, NICK_MAX) : '';"]]],
  // ---- 3b-3: bulk sell ----
  ['bulk sell does not skip favorites', 'copies', [['      if (c.f) {\n        out.skipped.favorite++;\n        continue;\n      }\n', '']]],
  ['bulk sell ignores the uncommitted team edits', 'copies', [['      const r = sell(save, id, also);', '      const r = sell(save, id);']]],
  ['a repeated id is tried twice', 'copies', [['for (const id of new Set(ids || []))', 'for (const id of ids || [])']]],
  ['Select repeats keeps none', 'copies', [['for (const { c } of ranked.slice(1))', 'for (const { c } of ranked)']]],
  ['Select repeats ignores the team rule', 'copies', [['s: [team.has(longId(c.u)) ? 1 : 0, c.l ? 1 : 0,', 's: [0, c.l ? 1 : 0,']]],
  ['Select repeats counts other boxes', 'copies', [['      if ((c.b || 0) !== box) continue;\n      const k = c.d', '      const k = c.d']]],
  ['Select repeats mixes shinies with normals', 'copies', [["const k = c.d + (c.s ? 's' : 'n');", 'const k = c.d;']]],
  ['Sell repeats takes shinies', 'gacha', [['r && !r.isNew && r.uid && !r.shiny && r.rarity <= 3', 'r && !r.isNew && r.uid && r.rarity <= 3']]],
  ['Sell repeats takes 4 stars', 'gacha', [['r && !r.isNew && r.uid && !r.shiny && r.rarity <= 3', 'r && !r.isNew && r.uid && !r.shiny && r.rarity <= 4']]],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pokebox-mut-'));
let caught = 0;
for (const [name, which, edits] of M) {
  const [rel, env] = SRC[which];
  let s = fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
  for (const [a, b] of edits) {
    if (!s.includes(a)) { console.log('STALE mutation (pattern not found): ' + name); process.exitCode = 1; s = null; break; }
    s = s.replace(a, b);
  }
  if (s == null) continue;
  const f = path.join(tmp, path.basename(rel));
  fs.writeFileSync(f, s);
  let hit = false, why = '';
  for (const h of HARNESSES) {
    const r = cp.spawnSync(process.execPath, [path.join(root, h), root], { env: Object.assign({}, process.env, { [env]: f }), encoding: 'utf8' });
    if (r.status !== 0) {
      const lines = (r.stdout + r.stderr).trim().split('\n');
      hit = true; why = path.basename(h) + ': ' + (lines.find(l => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 100);
      break;
    }
  }
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name + (hit ? '  (' + why + ')' : ''));
  fs.unlinkSync(f);
}
console.log(caught + '/' + M.length + ' mutations caught');
if (caught < M.length) process.exitCode = 1;
