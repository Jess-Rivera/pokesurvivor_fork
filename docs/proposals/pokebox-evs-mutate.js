// Mutation check for pokebox step 5, EVs (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/pokebox-evs-mutate.js
// Each mutation breaks stats.js, player.js, copies.js, game.js, enemy.js, run-ui.js or ev-screen.js in one deliberate way, writes the copy to a
// temp folder and runs docs/proposals/pokebox-evs-harness.js against it (PE_<FILE> env vars). The harness must fail every time; a
// mutation it misses is a gap. A mutation whose text is not found is STALE (the code moved: update the text here).
// Not mutated, with the reason: the EV screen's markup, the [-] button, the hold timer and the kit's button row (DOM, feel-tested and
// probed in tools/smoke-pause-menu.js; the harness has no DOM); the Team screen EVs row and the sell note in menu.js (display text); debug.js evbank and the
// fighter EV column (console tools); the species-traits generator (tools/check.js runs species_traits.js --check, and section 2
// checks the yields it wrote). Select repeats keeping most EVs is mutated in pokebox-copies-mutate.js (its harness owns repeatsIn).
const path = require('path');
const root = path.resolve(__dirname, '../..');
const SRC = { stats: ['js/core/stats.js', 'PE_STATS'], player: ['js/entities/player.js', 'PE_PLAYER'], copies: ['js/systems/copies.js', 'PE_COPIES'],
  game: ['js/game.js', 'PE_GAME'], enemy: ['js/entities/enemy.js', 'PE_ENEMY'], runui: ['js/ui/run-ui.js', 'PE_RUNUI'],
  evscreen: ['js/ui/ev-screen.js', 'PE_EVSCREEN'] };
// [name, file key, [[text to find, replacement], ...]]
const M = [
  ["the profile drops the EVs", "stats", [["(Array.isArray(copy.ev) ? clampInt(copy.ev[k], 252) : 0)", "0"]]],
  ["floor(EV / 4) dropped", "stats", [["(2 * base + iv + Math.floor(ev / 4))", "(2 * base + iv + ev)"]]],
  ["the yield is not divided (x1 instead of 1/1000)", "copies", [["const EV_RATE = { wild: 1, elite: 2, gym: 1000 };", "const EV_RATE = { wild: 1000, elite: 1000, gym: 1000 };"]]],
  ["elites at the wild rate", "copies", [["const EV_RATE = { wild: 1, elite: 2, gym: 1000 };", "const EV_RATE = { wild: 1, elite: 1, gym: 1000 };"]]],
  ["gyms at the wild rate", "copies", [["const EV_RATE = { wild: 1, elite: 2, gym: 1000 };", "const EV_RATE = { wild: 1, elite: 2, gym: 1 };"]]],
  ["a shiny is not doubled", "copies", [["const SHINY_EV = 2;", "const SHINY_EV = 1;"]]],
  ["a shiny is doubled twice", "copies", [["(e && e.shiny ? SHINY_EV : 1)", "(e && e.shiny ? SHINY_EV * SHINY_EV : 1)"]]],
  ["an elite counts as a gym", "copies", [["(e && e.gym ? 'gym' : e && e.elite ? 'elite' : 'wild')", "(e && (e.gym || e.elite) ? 'gym' : 'wild')"]]],
  ["a bank credits the wrong stat", "copies", [["return y.map((v) => v * r);", "return y.map((v, k) => y[(k + 1) % 6] * r);"]]],
  ["the banks are summed into one", "copies", [["return y.map((v) => v * r);", "return y.map(() => y.reduce((a, v) => a + v, 0) * r);"]]],
  ["withdrawing rounds up", "copies", [["Math.floor(Math.max(0, v) / EV_UNIT)", "Math.ceil(Math.max(0, v) / EV_UNIT)"]]],
  ["fractions carry to the next run", "game", [["    pendingLevels = 0;\n    evBank = [0, 0, 0, 0, 0, 0];\n", "    pendingLevels = 0;\n"]]],
  ["allocation passes the bank", "copies", [["Math.min(Math.floor(+p.n) || 0, left[k])", "Math.floor(+p.n) || 0"]]],
  ["the 252 cap is ignored", "copies", [["Math.min(Math.floor(+n) || 0, EV_MAX - e[k], EV_TOTAL - total)", "Math.min(Math.floor(+n) || 0, EV_TOTAL - total)"]]],
  ["the 510 cap is ignored", "copies", [["Math.min(Math.floor(+n) || 0, EV_MAX - e[k], EV_TOTAL - total)", "Math.min(Math.floor(+n) || 0, EV_MAX - e[k])"]]],
  ["the EV cap lets EVs pass 510 (clean, setEvs)", "copies", [["const v = Math.min(left, wholeUpTo(Array.isArray(six) ? six[k] : 0, EV_MAX));", "const v = wholeUpTo(Array.isArray(six) ? six[k] : 0, EV_MAX);"]]],
  ["the EV cap ignores 252 (clean, setEvs)", "copies", [["wholeUpTo(Array.isArray(six) ? six[k] : 0, EV_MAX)", "wholeUpTo(Array.isArray(six) ? six[k] : 0, Infinity)"]]],
  ["setEvs skips the cap", "copies", [["    const e = cappedEvs(six);", "    const e = six.slice();"]]],
  ["setEvs keeps an all-zero field", "copies", [["    if (e.some((v) => v > 0)) c.e = e;\n    else delete c.e;", "    c.e = e;"]]],
  ["a kill is not banked", "enemy", [["      G.Game.evKill(e); // pokebox step 5: the run's EV banks\n", ""]]],
  ["evKill ignores the kill", "game", [["for (let k = 0; k < 6; k++) evBank[k] += add[k];", "for (let k = 0; k < 6; k++) evBank[k] += 0;"]]],
  ["co-op allocates", "game", [["const evs = coop || !keepsEvs ? null : { bank", "const evs = !keepsEvs ? null : { bank"]]],
  ["a quit gives EVs", "game", [["function quitRun(keepsEvs = false)", "function quitRun(keepsEvs = true)"]]],
  ["a crash loses the EVs", "game", [["quitRun(true); // a crash", "quitRun(false); // a crash"]]],
  ["buildFighter drops the copy", "game", [["    f.copyUid = uid || null;", "    f.copyUid = null;"]]],
  ["constructor HP ignores EVs", "player", [["G.Stats.hpForLevel(this.baseHpStat, 1, this.statIv(0), this.statEv(0))", "G.Stats.hpForLevel(this.baseHpStat, 1, this.statIv(0))"]]],
  ["maxHpAt ignores EVs", "player", [["G.Stats.hpForLevel(this.baseHpStat, level, this.statIv(0), this.statEv(0))", "G.Stats.hpForLevel(this.baseHpStat, level, this.statIv(0))"]]],
  ["movement ignores EVs", "player", [["this.statNat(5), this.statEv(5))", "this.statNat(5))"]]],
  ["damage dealt ignores EVs", "stats", [[": attack(atkBase, level, p.iv[1], p.ev[1], p.nat[1]);", ": attack(atkBase, level, p.iv[1], 0, p.nat[1]);"]]],
  ["damage taken ignores EVs", "stats", [[": defense(playerDefBase, playerLevel, p.iv[2], p.ev[2], p.nat[2]);", ": defense(playerDefBase, playerLevel, p.iv[2], 0, p.nat[2]);"]]],
  ["an empty run opens the screen", "runui", [["evGive = !!evWhole && evWhole.some((v) => v > 0) && r.evs.team.length > 0", "evGive = !!evWhole"]]],
  ["Learn from the Loss opens nothing", "runui", [["learn: () => G.EvScreen.show(r.evs, onBack),", "learn: onBack,"]]],
  ["leftover EVs do not ask", "evscreen", [["    if (left > 0) {", "    if (left < 0) {"]]],
  ["Learn does not save", "evscreen", [["G.Copies.applyEvPlan(G.DB.save, bank.value, planned());\n    G.DB.commit(true);", "G.Copies.applyEvPlan(G.DB.save, bank.value, planned());"]]],
  ["Go Home saves", "evscreen", [["    if (yes) leave(); // saves nothing", "    if (yes) G.Copies.applyEvPlan(G.DB.save, bank.value, planned()), leave(); // saves nothing"]]],
  ["Go Home does not ask", "evscreen", [["const yes = await G.UI.ask('Discard all EVs and return?'", "const yes = true || await G.UI.ask('Discard all EVs and return?'"]]],
  ["[+] ignores the bank", "evscreen", [["Math.min(bankRoom, statRoom, totalRoom)", "Math.min(statRoom, totalRoom)"]]],
  ["[+] ignores the 252 cap", "evscreen", [["Math.min(bankRoom, statRoom, totalRoom)", "Math.min(bankRoom, totalRoom)"]]],
  ["[+] ignores the 510 cap", "evscreen", [["Math.min(bankRoom, statRoom, totalRoom)", "Math.min(bankRoom, statRoom)"]]],
  ["Shift-click gives 1", "evscreen", [["SHIFT_STEP = 10,", "SHIFT_STEP = 1,"]]],
  ["Learn goes home at once (no wait)", "evscreen", [["    leaveTimer = setTimeout(leave, LEARN_TOAST_MS);", "    leave();"]]],
  ["Learn shows no toast", "evscreen", [["    G.UI.toast('Lessons Learned, Returning Home', LEARN_TOAST_MS);\n", ""]]],
  ["Learn saves after the wait", "evscreen", [["    G.Copies.applyEvPlan(G.DB.save, bank.value, planned());\n    G.DB.commit(true);\n    G.Audio.sfx('confirm');\n", "    G.Audio.sfx('confirm');\n    setTimeout(() => (G.Copies.applyEvPlan(G.DB.save, bank.value, planned()), G.DB.commit(true)), 1000);\n"]]],
  ["the toast lasts 0 s", "evscreen", [["const LEARN_TOAST_MS = 1000;", "const LEARN_TOAST_MS = 0;"]]],
  ["+ works during the toast", "evscreen", [["if (event.button !== 0 || leaving) return;", "if (event.button !== 0) return;"]]],
  ["the buttons work during the toast", "evscreen", [["isOpen: () => isOpen() && !leaving,", "isOpen: () => isOpen(),"]]],
];

require('../../tools/mutate-runner.js')({
  label: 'pokebox-evs-mutate',
  root,
  harnesses: ['docs/proposals/pokebox-evs-harness.js'],
  args: [root],
  crlf: true,
  baseline: true,
  failed: (r) => r.status !== 0 || /FAIL/.test(r.stdout || ''),
  mutants: M.map(([name, which, edits]) => ({ name, file: SRC[which][0], edits, env: { [SRC[which][1]]: '<out>' } })),
});
