// Mutation check for the text-field keys fix (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/input-keys-mutate.js
// Each mutation breaks js/core/input.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/input-keys-harness.js against it (IK_INPUT). The harness must fail every time; a miss is a gap.
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const REL = 'js/core/input.js';
const M = [
  ['the text-field exemption is dropped (the login Tab bug comes back)', [['if (!typing(e.target) && [', 'if ([']]],
  ['every target counts as a text field (keys scroll the page in a run)', [["return !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '') || !!t.isContentEditable);", 'return true;']]],
  ['a contenteditable is not a text field', [[" || !!t.isContentEditable);", ');']]],
  ['a textarea is not a text field', [['INPUT|TEXTAREA|SELECT', 'INPUT|SELECT']]],
  ['Tab is no longer blocked outside text fields', [["'space', 'tab'].includes(c)", "'space'].includes(c)"]]],
  ['Tab no longer counts for cycle_next', [["cycle_next: ['keye', 'tab'],", "cycle_next: ['keye'],"]]],
];

require('../../tools/mutate-runner.js')({
  label: 'input-keys-mutate',
  root,
  harnesses: ['docs/proposals/input-keys-harness.js'],
  mutants: M.map(([name, edits]) => ({ name, file: REL, edits, env: { IK_INPUT: '<out>' } })),
});
