// Mutation check for entity model slice 3 (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/player-entity-mutate.js
// Each mutation breaks one file in one deliberate way, writes the copy to a temp folder, and runs player-entity-harness.js against
// it (PE3_PLAYER, PE3_GAME, PE3_MAIN, PE3_STATUS, PE3_FX). The harness must fail every time; a miss is a gap.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const ENV = {
  'js/entities/player.js': 'PE3_PLAYER',
  'js/game.js': 'PE3_GAME',
  'js/main.js': 'PE3_MAIN',
  'js/systems/status.js': 'PE3_STATUS',
  'js/systems/move-effects.js': 'PE3_FX',
};
const P = 'js/entities/player.js',
  GM = 'js/game.js',
  MN = 'js/main.js',
  ST = 'js/systems/status.js';
const M = [
  // the split leaks
  ['the base reads the keyboard again', P, '? [0, 0] : this.controller.axis();', '? [0, 0] : G.Input.axis();'],
  ['the dodge ignores the controller', P, '    if (this.controller.dodge()) this.tryDodge(ax, ay);', "    if (G.Input.action('dodge')) this.tryDodge(ax, ay);"],
  ['HumanPlayer stops extending the base', P, 'G.HumanPlayer = class HumanPlayer extends G.PlayerEntity {', 'G.HumanPlayer = class HumanPlayer extends class { constructor(...a) { return new G.PlayerEntity(...a); } } {'],
  ['the camera kick moves to the base', P, '  onHurtFeel() {}\n', '  onHurtFeel() {\n    G.Camera.kick(0.28);\n  }\n'],
  ['the hurt sound moves to the base', P, '  onHurtFeel() {}\n', "  onHurtFeel() {\n    G.Audio.sfx('hurt');\n  }\n"],
  ['a benched human makes the hurt feel', P, '    if (!this.benched) {\n      // a benched Pokemon taking DoT is silent', '    this.onHurtFeel();\n    if (!this.benched) {\n      // a benched Pokemon taking DoT is silent'],
  ['hurt never calls the hook', P, "this.onHurtFeel(); // the human's", "// the human's"],
  ['the base aims at the enemy list', P, '  aimTargets() {\n    return [];\n  }', '  aimTargets() {\n    return G.EnemyMgr.all();\n  }'],
  ['the aim method is named foes again', P, '  aimTargets() {\n    return G.EnemyMgr.all();\n  }', '  aimTargets() {\n    return G.EnemyMgr.all();\n  }\n  foes() {\n    return G.EnemyMgr.all();\n  }'],
  ['aiming ignores aimTargets()', P, '    const all = this.aimTargets();', '    const all = G.EnemyMgr.all();'],
  ['the base falls back to rocks', P, '  aimFallback() {\n    return null;\n  }', '  aimFallback() {\n    return G.World.nearestBreakable(this.x, this.y, 200);\n  }'],
  ['the human has no default keyboard', P, 'G.HumanPlayer.prototype.controller = G.HumanPlayer.KEYBOARD;\n', ''],
  ['the base defaults to the keyboard', P, 'G.PlayerEntity.prototype.controller = G.PlayerEntity.IDLE;', "G.PlayerEntity.prototype.controller = { axis: () => G.Input.axis(), dodge: () => G.Input.action('dodge') };"],
  ['XP is set in the base', P, '    this.level = 1;\n    this.rerolls = 0;', '    this.level = 1;\n    this.xp = 0;\n    this.rerolls = 0;'],
  ['coins are set in the base', P, '    this.regenFlat = perks.regen || 0;\n', '    this.regenFlat = perks.regen || 0;\n    this.coins = 0;\n'],
  ['gainXp is in the base', P, '  onHurtFeel() {}\n', '  onHurtFeel() {}\n  gainXp() {\n    return 0;\n  }\n'],
  ['the human sync drops the XP target', P, '    super.syncLevel(level);\n    this.xpNext = HumanPlayer.xpFor(level);', '    super.syncLevel(level);'],
  ['the human sync skips the base', P, '    super.syncLevel(level);\n', ''],
  ['the human magnet ignores its perk', P, 'this.magnet = 120 * (perks.magnetMul || 1);', 'this.magnet = 120;'],
  ['G.Player names the base', P, 'G.Player = G.HumanPlayer;', 'G.Player = G.PlayerEntity;'],
  ['isPlayer is no longer set', P, '    this.isPlayer = true;\n', ''],
  // the keyboard controller
  ['cycle previous goes forward', P, "if (G.Input.action('cycle_prev')) out.push(-1);", "if (G.Input.action('cycle_prev')) out.push(1);"],
  ['one attack key per frame only', P, "for (let i = 0; i < 4; i++) if (G.Input.action('attack_' + (i + 1))) out.push(i);", "for (let i = 0; i < 4; i++) if (G.Input.action('attack_' + (i + 1))) return [i];"],
  ['the highest swap key wins', P, "for (let n = 0; n < 6; n++) if (G.Input.action('swap_' + (n + 1))) return n;", "for (let n = 5; n >= 0; n--) if (G.Input.action('swap_' + (n + 1))) return n;"],
  ['swap previous wins over next', P, "swapDir: () => (G.Input.action('swap_next') ? 1 : G.Input.action('swap_prev') ? -1 : 0),", "swapDir: () => (G.Input.action('swap_prev') ? -1 : G.Input.action('swap_next') ? 1 : 0),"],
  ['Shake off reads the dodge key', P, "shake: () => G.Input.action('shake_off'),", "shake: () => G.Input.action('dodge'),"],
  // game.js asks the controller
  ['Shake off reads the keyboard', GM, 'if (pl.controller.shake() && G.Status.shake(pl))', "if (G.Input.action('shake_off') && G.Status.shake(pl))"],
  ['the swap direction reads the keyboard', GM, '    const dir = c.swapDir();\n', "    const dir = G.Input.action('swap_next') ? 1 : G.Input.action('swap_prev') ? -1 : 0;\n"],
  ['the direct swap key reads the keyboard', GM, '      n = c.swapSlot();', "      n = [0, 1, 2, 3, 4, 5].findIndex((k) => G.Input.action('swap_' + (k + 1)));"],
  ['an attack key reads the keyboard in play', GM, '    for (const i of c.slots()) pl.setActive(i);', "    for (let i = 0; i < 4; i++) if (G.Input.action('attack_' + (i + 1))) pl.setActive(i);"],
  ['a slot key calls setActive twice', GM, '    for (const i of c.slots()) pl.setActive(i);', '    for (const i of c.slots()) {\n      pl.setActive(i);\n      pl.setActive(i);\n    }'],
  ['the cycle keys are dropped', GM, '    for (const d of c.cycles()) pl.cycle(d);\n', ''],
  ['the menus lose their attack keys', GM, "for (let i = 0; i < 4; i++) if (G.Input.action('attack_' + (i + 1))) G.RunUI.itemKey(i);", 'for (const i of pl.controller.slots()) G.RunUI.itemKey(i);'],
  // loading and the isPlayer sites
  ['NEED does not list PlayerEntity', MN, "    'PlayerEntity',\n", ''],
  ['a status rule stops treating you as a Player entity', ST, "(kind === 'trap' && !h.isPlayer)", "(kind === 'trap')"],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pe3-mut-'));
let caught = 0;
for (const [name, rel, a, b] of M) {
  const s = fs.readFileSync(path.join(root, rel), 'utf8');
  if (!s.includes(a)) {
    console.log('STALE mutation (pattern not found): ' + name);
    process.exitCode = 1;
    continue;
  }
  const f = path.join(tmp, 'mutated.js');
  fs.writeFileSync(f, s.replace(a, b));
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/player-entity-harness.js')], {
    cwd: root,
    env: Object.assign({}, process.env, { [ENV[rel]]: f }),
    encoding: 'utf8',
  });
  const lines = (r.stdout + r.stderr).trim().split('\n'),
    hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name + (hit ? '  (' + (lines.find((l) => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 100) + ')' : ''));
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(caught + '/' + M.length + ' mutations caught');
if (caught < M.length) process.exitCode = 1;
