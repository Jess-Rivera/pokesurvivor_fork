// Mutation check for entity model slice 2 (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/team-mutate.js
// Each mutation breaks one file in one deliberate way, writes the copy to a temp folder, and runs team-harness.js against it
// (TM_TEAM, TM_PLAYER, TM_GAME, TM_DEV, TM_MAIN). The harness must fail every time; a miss is a gap.
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const ENV = {
  'js/systems/team.js': 'TM_TEAM',
  'js/entities/player.js': 'TM_PLAYER',
  'js/game.js': 'TM_GAME',
  'dev.html': 'TM_DEV',
  'js/main.js': 'TM_MAIN',
};
const T = 'js/systems/team.js',
  P = 'js/entities/player.js',
  GM = 'js/game.js',
  D = 'dev.html',
  MN = 'js/main.js';
const M = [
  // the plan's six (map, tests section)
  ['the lock is 0 s', T, 'const SWAP_LOCK = 5,', 'const SWAP_LOCK = 0,'],
  ['no swap i-frames', T, 'next.invuln = Math.max(next.invuln || 0, SWAP_IFRAME);', ''],
  ['a faint brings the HIGHEST slot', T, '(b.teamSlot < a.teamSlot ? b : a)', '(b.teamSlot > a.teamSlot ? b : a)'],
  ['a faint keeps the lock', T, 'const next = this.takeField(i);\n      this.lock = 0;', 'const next = this.takeField(i);'],
  ['a swap is allowed while trapped', T, "if (G.Status.swapLocked(pl)) return 'trapped';", ''],
  ['a swap refills the dodges', T, '      next.aim = pl.aim;\n', "      next.aim = pl.aim;\n      next.dodges = { cd: [0, 0], gap: 0 };\n"],
  ['links are kept per member', P, 'return this.team ? this.team.bonds : this._bonds || 0;', 'return this._bonds || 0;'],
  // the rest of the module
  ['the lock is 4 s', T, 'const SWAP_LOCK = 5,', 'const SWAP_LOCK = 4,'],
  ['the i-frames are 1 s', T, 'SWAP_IFRAME = 0.5;', 'SWAP_IFRAME = 1;'],
  ['a manual swap does not lock', T, 'const next = this.takeField(i);\n      this.lock = SWAP_LOCK;', 'const next = this.takeField(i);'],
  ['longer i-frames are cut', T, 'Math.max(next.invuln || 0, SWAP_IFRAME)', 'SWAP_IFRAME'],
  ['the lock goes negative', T, 'Math.max(0, this.lock - dt)', 'this.lock - dt'],
  ['the lock never counts down', T, 'if (this.lock > 0) this.lock = Math.max(0, this.lock - dt);', ''],
  ['the outgoing dodge does not end', T, 'pl.endDodge();', ''],
  ['the aim is not carried', T, 'next.aim = pl.aim;', ''],
  ['the position is not carried', T, 'next.x = pl.x;', ''],
  ['the run progress is not carried', T, 'if (this.carry) this.carry(pl, next);', ''],
  ['the field index is not moved', T, 'this.activeIdx = i;\n      return next;', 'return next;'],
  ['a swap to a fainted member is allowed', T, "if (!next || next.dead) return 'no';", "if (!next) return 'no';"],
  ['a swap in the air is allowed', T, "if (pl.flyT > 0) return 'no';", ''],
  ['the trap is reported before the lock', T, "if (this.lock > 0) return 'locked';", ''],
  ['a swap while not playing is allowed', T, "if (!playing || pl.dead) return 'no';", ''],
  ['the faint choice can pick the member on the field', T, '!f.dead && f !== pl);\n      if (!alive.length) return -1;', '!f.dead);\n      if (!alive.length) return -1;'],
  ['the faint choice uses list order', T, 'const next = alive.reduce((a, b) => (b.teamSlot < a.teamSlot ? b : a));', 'const next = alive[0];'],
  ['each member gets its own card store', T, 'f.teamCards = this.cards;', 'f.teamCards = G.TeamCards.store();'],
  ['each member keeps its own stage store', T, 'f.stgTeam = this.stages;', ''],
  ['each member keeps its own run items', T, 'f.runItems = this.runItems;', 'f.runItems = [];'],
  ['each member keeps its own berries', T, 'f.berries = this.berries;', 'f.berries = [];'],
  ['the members do not know their team', T, 'f.team = this;', ''],
  ['the active member ticks on the bench', T, 'if (f === pl || f.dead) continue;', 'if (f.dead) continue;'],
  ['a fainted member keeps ticking', T, 'if (f === pl || f.dead) continue;', 'if (f === pl) continue;'],
  ['a bench faint is not reported', T, 'if (f.dead && onFaint) onFaint(f);', ''],
  ['the module makes a sound', T, '      next.invuln = Math.max(', "      G.Audio.sfx('confirm');\n      next.invuln = Math.max("],
  ['a Player with no Team loses its count', P, 'else this._bonds = v;', ''],
  // the wiring
  ['game.js links the stores by hand again', GM, '    runTeam = G.Team.create(roster, carryRun);', '    roster.forEach((f) => { f.dodges = { cd: [0, 0], gap: 0 }; });\n    runTeam = G.Team.create(roster, carryRun);'],
  ['carryRun copies the links again', GM, '    to.t10 = from.t10;\n', '    to.t10 = from.t10;\n    to.bonds = from.bonds;\n'],
  ['carryRun drops the coins', GM, '    to.coins = from.coins;\n', ''],
  ['swapTo skips the Team check', GM, "    if (why !== 'ok') return false;\n", ''],
  ['a faint swap locks', GM, "field(runTeam.nextOnFaint(), 'in');", "field(runTeam.nextOnFaint(), 'swap');"],
  ['Re-Do resumes on slot 1', GM, "field(reviveIdx, 'in');", "field(0, 'in');"],
  ['the lock ticks after the swap keys', GM, '    runTeam.tickLock(dt);\n    handleSwap();', '    handleSwap();\n    runTeam.tickLock(dt);'],
  ['field does not move pl', GM, '    else runTeam.sendIn(i);\n    pl = runTeam.active;', '    else runTeam.sendIn(i);'],
  ['the HUD lock length is 0', GM, 'return G.Team.SWAP_LOCK;', 'return 0;'],
  ['the HUD lock reads 0', GM, 'return runTeam ? runTeam.lock : 0;', 'return 0;'],
  ['dev.html does not load team.js', D, '    <script defer src="js/systems/team.js"></script>\n', ''],
  ['NEED does not list Team', MN, "    'Team',\n", ''],
];

require('../../tools/mutate-runner.js')({
  label: 'team-mutate',
  root,
  harnesses: ['docs/proposals/team-harness.js'],
  mutants: M.map(([name, file, a, b]) => ({ name, file, edits: [[a, b]], env: { [ENV[file]]: '<out>' } })),
});
