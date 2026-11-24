// Mutation check for #167, the Team menu's roster and list rules (Node only; tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/team-menu-mutate.js
// Each mutation breaks one file in one deliberate way and runs team-menu-harness.js against the copy.
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const DRAFT = 'js/systems/team-draft.js',
  LIST = 'js/systems/team-list.js';
const ENV = { [DRAFT]: 'TM_DRAFT', [LIST]: 'TM_LIST' };
const M = [
  ['revert keeps the edits', DRAFT, '    draft.team = team;\n', ''],
  ['revert puts back a sold copy', DRAFT, 'isShiny, uid: member.uid } : null;', 'isShiny, uid: member.uid } : slotOf(member);'],
  ['revert keeps the old species of an evolved copy', DRAFT, '{ dex: copy.speciesID, shiny: copy.isShiny, uid: member.uid }', 'slotOf(member)'],
  ['revert leaves slot 1 empty', DRAFT, '      team[LEAD] = team[next];\n', ''],
  ['revert with nothing left goes on', DRAFT, 'if (next < 0) return { ok: false, missing };', ''],
  ['the draft is the saved roster itself', DRAFT, '({ team: save.team.map(slotOf) })', '({ team: save.team })'],
  ['the lead may leave for an empty slot', DRAFT, "    if (from === LEAD && !displaced) return refused('lead');\n", ''],
  ['the lead may be freed', DRAFT, "    if (slot === LEAD) return refused('lead');\n", ''],
  ['a swap loses the displaced copy', DRAFT, 'if (from >= 0) draft.team[from] = displaced;', 'if (from >= 0) draft.team[from] = null;'],
  ['a placed copy stays in its old slot', DRAFT, '    if (from >= 0) draft.team[from] = displaced;\n', ''],
  ['commit leaves the old lead', DRAFT, '    save.partner = save.team[LEAD].dex;\n', ''],
  ['an unsaved roster copy may sell', DRAFT, 'slotOfUid(draft, uid) >= 0 || save', 'save'],
  ['a saved team copy may sell', DRAFT, 'slotOfUid(draft, uid) >= 0 || save.team.some((member) => member && member.uid === uid)', 'slotOfUid(draft, uid) >= 0'],
  ['bulk sell takes favorites', DRAFT, "(copy.isFavorite ? 'Bulk sell skips favorites.' : null)", 'null'],
  ['a refused box move reads ok', DRAFT, "result === 'ok' ?", 'result ?'],
  ['favorite filter ignored', LIST, '(filter.favorite && copy.isFavorite) ||', ''],
  ['nickname not searched', LIST, 'shown.found || (!!copy && copy.nickname.toLowerCase().includes(query))', 'shown.found'],
  ['direction ignored', LIST, 'used.direction * compare', 'compare'],
  ['ties keep the box order', LIST, '          a.entry.species.dex - b.entry.species.dex ||\n', ''],
  ['a copy sort runs on the Pokedex tab', LIST, 'pokedexTab && sort.copyOnly ?', 'false ?'],
  ['unowned names are searched', LIST, '(owned && species.name', '(species.name'],
  ['the unowned filter shows all', LIST, "if (filter.own === 'miss' && owned) return false;", ''],
];

require('../../tools/mutate-runner.js')({
  label: 'team-menu-mutate',
  root,
  baseline: true,
  crlf: true,
  harnesses: ['docs/proposals/team-menu-harness.js'],
  args: [root],
  mutants: M.map(([name, file, a, b]) => ({ name, file, edits: [[a, b]], env: { [ENV[file]]: '<out>' } })),
});
