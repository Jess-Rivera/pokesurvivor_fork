// Mutation check for entity model slice 8, leader slot choice (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/leader-slots-mutate.js
// Each mutation breaks one file in one deliberate way, writes the copy to a temp folder, and runs leader-slots-harness.js against it
// (LS_<FILE>). The harness must fail every time; a miss is a gap, a stale pattern is reported as STALE.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const LD = 'js/entities/gym-leader.js',
  PL = 'js/entities/player.js',
  BR = 'js/entities/boss-ai.js',
  GY = 'js/data/gyms.js',
  AI = 'js/entities/leader-ai.js';
const ENV = { [LD]: 'LS_LEADER', [PL]: 'LS_PLAYER', [BR]: 'LS_BRAIN', [GY]: 'LS_GYMS', [AI]: 'LS_AI' };
// Leader AI slice 5a (#34): the leader's cast rules moved to G.GymLeader.Caster (LD) and its slot choice to the AI player (AI)
const M = [
  // layout and the hold
  ['all moves live again (one group)', LD, 'e.slots = G.Boss.slotsOf(g.moves);', 'e.slots = [g.moves.map((m) => ({ id: m.id, t: 0, hpBelow: m.hpBelow }))];'],
  ['bonded lines get their own slots', BR, '      if (!m.bond) out.push([s]);', '      if (true) out.push([s]);'],
  ['a leader switch sets no hold', PL, 'for (const i of c.slots()) this.setActive(i);', 'for (const i of c.slots()) this.setActive(i, true);'], // LEADER-AI slice 1: pressed through your takeSlotInput
  ['the hold never ticks on a leader', LD, 'if (this.swapT > 0) this.swapT = Math.max(0, this.swapT - dt);', ''],
  ['the select sound plays for a leader', PL, "this.onSwitchFeel(); // the select sound is yours", "G.Audio.sfx('select'); // the select sound is yours"],
  // only the active slot
  ['an inactive slot fires', LD, '(e.slots[e.active] || [])', 'e.slots.flat()'],
  ['a buff casts from the bench', LD, 'buffs(now) {\n    const e = this.e;\n    for (const s of e.activeGroup()) {', 'buffs(now) {\n    const e = this.e;\n    for (const s of this.pool()) {'],
  // the pick
  ['no heal visit', AI, 'if (h >= 0) return go(h);', ''],
  ['a closed hpBelow slot is pickable', AI, 'g.some((s) => G.Boss.open(e, s) && s.t <= 0', 'g.some((s) => s.t <= 0'],
  ['the stay rule is off', AI, 'return !cur || top.score >= G.Boss.TUNE.SWITCH_MARGIN * cur.score ? go(at) : -1;', 'return go(at);'],
  ['the margin is 1', BR, 'const SWITCH_MARGIN = 1.5;', 'const SWITCH_MARGIN = 1;'],
  ['no buff visit', AI, 'return b >= 0 ? go(b) : -1;', 'return -1;'],
  ['it picks inside a tell', AI, 'if (e.slots.length < 2 || c.tell ||', 'if (e.slots.length < 2 ||'],
  // bonds
  ['a bonded slot fires one member', LD, 'if (c.bond) for (const b of c.bond) this.fireBond(b, c, now);', ''],
  ['the bond tell is the first move only', LD, 'bond.reduce((w, b) => Math.max(w, T.TELL[b.form]), T.TELL[form])', 'T.TELL[form]'],
  ['a bond of one passes', GY, "if (bonded === 1) bad.push(L + ': a bond needs 2 to 4 marked moves');", ''],
  ['a bad bond value passes', GY, "if (m.bond != null && m.bond !== true) bad.push(L + ': ' + m.id + ' bond is true or absent');", ''],
  ['a bond on the wild body passes', GY, 'if (bonded && !g.playerEntity)', 'if (false)'],
  // the cushion and the flinch
  ['the cushion is still off for a leader', PL, 'const close = this.activeGroup().some(', 'const close = !this.isRival && this.activeGroup().some('],
  ['flinch keeps the old D5 rule', LD, 'this.caster.tell = null;\n    G.MoveSim.flinch(this);', 'this.caster.tell = null;\n    this.caster.wait = 1;'], // D5: the tell lost plus a wait, no restart
  ['flinch restarts every slot', LD, 'G.MoveSim.flinch(this);', 'for (const g of this.slots) for (const s of g) s.t = 1;'],
  // sensing
  ['sense reads the gym', BR, 'dist: G.U.dist(self.x, self.y, foe.x, foe.y),', 'dist: G.U.dist(self.x, self.y, foe.x, foe.y) + self.gym.level * 0,'],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'leader-slots-mut-'));
let caught = 0,
  bad = 0;
for (const [name, file, a, b] of M) {
  const s = fs.readFileSync(path.join(root, file), 'utf8');
  if (!s.includes(a)) {
    console.log('STALE mutation (pattern not found): ' + name);
    bad++;
    continue;
  }
  const out = path.join(tmp, path.basename(file));
  fs.writeFileSync(out, s.replace(a, b));
  const env = Object.assign({}, process.env, { [ENV[file]]: out });
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/leader-slots-harness.js')], { env, encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n');
  if (r.status !== 0) {
    caught++;
    console.log('caught  ' + name + '  (' + (lines.find((l) => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 110) + ')');
  } else {
    bad++;
    console.log('MISSED  ' + name);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(caught + '/' + M.length + ' mutations caught');
process.exit(bad ? 1 : 0);
