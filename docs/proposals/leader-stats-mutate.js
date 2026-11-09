// Mutation check for entity model slice 6 (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/leader-stats-mutate.js
// Each mutation breaks one file in one deliberate way, writes the copy to a temp folder, and runs leader-stats-harness.js against it
// (LS_<FILE>). The harness must fail every time; a miss is a gap, a stale pattern is reported as STALE.
// Plan: docs/ASCII Concept Maps/Entity Model Slice 6 - Leader Stats and Cards.txt.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const LD = 'js/entities/gym-leader.js',
  BR = 'js/entities/boss-ai.js',
  ST = 'js/systems/status.js',
  GY = 'js/data/gyms.js',
  GM = 'js/systems/gym.js';
const ENV = { [LD]: 'LS_LEADER', [BR]: 'LS_BRAIN', [ST]: 'LS_STATUS', [GY]: 'LS_GYMS', [GM]: 'LS_GYM' };
const M = [
  // D1: your attack formula
  ['the brain factor is put back on the leader', BR, '      // A G.GymLeader inherits these four', '      e.moveFactor = (m) => this.factor(m);\n      // A G.GymLeader inherits these four'],
  // finding C: the order
  ['max HP is set before the cards', LD, '    this.becomeSimOwner(); // first (slice 6, finding C): its card store holds the Vitamins that max HP reads\n    this.maxHp = this.maxHpAt(this.level);\n    this.hp = this.maxHp;\n', '    this.maxHp = this.maxHpAt(this.level);\n    this.hp = this.maxHp;\n    this.becomeSimOwner();\n'], // #41 retarget
  ['the items go on before the sim owner setup', LD, '    this.becomeSimOwner(); // first', '    this.arm();\n    this.becomeSimOwner(); // first'], // #41 retarget
  // D3: the profile
  ['the profile is not passed', LD, 'def.gym.profile ? G.Stats.profile(def.gym.profile) : null', 'null'],
  ['profileFor drops the nature', GY, 'natureUp: N ? N[1] : 0,\n      natureDown: N ? N[2] : 0,', 'natureUp: 0,\n      natureDown: 0,'],
  ['the build does not carry forward', GY, '      if (k <= loop) at = m[k];\n    return at;\n  }\n  /** A switched slot', '      if (k === loop) at = m[k];\n    return at;\n  }\n  /** A switched slot'],
  // D2, N1, N2: cards
  ['team cards stay banned on a switched gym', GY, 'else if (c.team && !g.playerEntity)', 'else if (c.team)'],
  ['Regen is allowed', GY, "else if (c.id === 'regen' && Math.min(Number(k), roster.length) < 2)", 'else if (false)'], // slice 7b retarget
  ['a bare Vitamins card passes', GY, "else if (c.id === 'vitamins' && vit == null)", 'else if (false)'],
  ['team cards must fit a move', GY, 'else if (!c.team && !moves.some((m) =>', 'else if (!moves.some((m) =>'],
  // Q4, N6: items
  ['the held item is not equipped', LD, 'if (this.gym.item) this.equip(this.gym.item);', ''],
  ['run items are not put on', LD, '      G.Items.BY[id].on(this);\n', ''],
  ['the item reject list is empty', GY, '  const LEADER_ITEM_BAN = {', '  const LEADER_ITEM_BAN = {}, BAN_UNUSED = {'],
  ['Rocky Helmet is allowed', GY, "    rockyhelmet: 'Rocky Helmet is bugged: it fires on body touch only, see TODO',\n", ''],
  ['the item tier is not checked', GY, "if (it.tier !== tier) return", 'if (false) return'],
  ['one stone is not enforced', GY, "else if (grp && groups[grp]) bad.push(", 'else if (false) bad.push('],
  ['the run item cap is gone', GY, 'if (held.length > RUN_ITEM_MAX)', 'if (false)'],
  ['the def drops the held item', GM, "        item: G.Gyms.perLoop(sig.item, loop) || null,", '        item: null,'],
  ['the def drops the run items', GM, '        runItems: G.Gyms.runItemsFor(entry, loop),', '        runItems: [],'],
  ['the brain skips the Life Orb cost', BR, '          this.orbCost(this.def(c.id));\n', ''],
  ['Life Orb has no floor', BR, 'e.hp = Math.max(1, e.hp - Math.max(1, e.maxHp * 0.01));', 'e.hp = e.hp - Math.max(1, e.maxHp * 0.01);'],
  ['Life Orb costs with no Life Orb', BR, "if (e.isPlayer && e.hasItem('lifeorb') &&", 'if (e.isPlayer &&'],
  // Q3, N3: restrictions
  ['the status cut defaults to half', LD, '    return v != null ? v : 1;', '    return v != null ? v : 0.5;'],
  ['the hard CC gap defaults to 5 s', LD, '    return v != null ? v : G.Status.GRACE;', '    return v != null ? v : 5;'],
  ['hit i-frames default to none', LD, '    return v != null ? v : super.hitIframes;', '    return v != null ? v : 0;'],
  ['auto shake is off by default', LD, "if (this.rule('autoShake') !== false)", "if (this.rule('autoShake') === true)"],
  ['status ignores the authored cut', ST, "if (h.statusCut != null && (kind === 'freeze' || kind === 'sleep')) return base * h.statusCut;", ''],
  ['status ignores the authored gap', ST, 'h.ccWindow != null ? h.ccWindow : GRACE', 'GRACE'],
  ['restriction values are not checked', GY, "rules.statusCut != null &&\n        !(typeof rules.statusCut === 'number'", "false &&\n        !(typeof rules.statusCut === 'number'"],
  // Q1, Q2: enrage and power
  ['enrage is always on', GM, 'return !!x && (!x.playerEntity || !!(x.restrictions && x.restrictions.enrage));', 'return !!x;'],
  ['enrage never reaches her factor', LD, 'return super.moveFactor(m) * G.Gym.enrageMul(this);', 'return super.moveFactor(m);'],
  ['power is allowed on a switched gym', GY, 'if (g.playerEntity && s.power != null && s.power !== 1)', 'if (false)'],
  // D3 validator
  ['IVs above 31 pass', GY, "else if (key === 'ivs' && !six(31))", "else if (key === 'ivs' && !six(99))"],
  ['the EV total is not checked', GY, 'v.reduce((a, b) => a + b, 0) > 510)', 'v.reduce((a, b) => a + b, 0) > 9999)'],
  ['any nature passes', GY, "key === 'nature' &&\n            !(typeof v === 'string' && G.SpeciesTraits && G.SpeciesTraits.NATURES.some((x) => x[0] === v))", 'false'],
  ['a build on the wild body passes', GY, "        if (!g.playerEntity) {\n          bad.push(who + ': ' + key + ' needs playerEntity", "        if (false) {\n          bad.push(who + ': ' + key + ' needs playerEntity"],
  // Q5, N5: the budget
  ['the budget never warns', GY, 'return n > level - 1\n', 'return false\n'],
  ['makeDef never warns', GM, "    if (warn) console.warn('[Gym] ' + warn);\n", ''],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'leader-stats-mut-'));
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
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/leader-stats-harness.js')], { env, encoding: 'utf8' });
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
