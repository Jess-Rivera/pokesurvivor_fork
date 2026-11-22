// tools/catchup.js offline checks (Node only). Usage from the repo root:  node docs/proposals/catchup-harness.js .
// Relations, not values: every issue number in the real STATE.md decisions block must appear in the report with its
// title, and a missing gh must leave the local sections intact and the GitHub sections marked unavailable.
const fs = require('fs'), path = require('path');
const R = path.resolve(process.argv[2] || '.');
const catchup = require(path.join(R, 'tools/catchup.js'));
let fail = 0;
const bad = (m) => { fail++; console.log('FAIL', m); };
const readFile = (p) => fs.readFileSync(path.join(R, p), 'utf8');

const fakeIssues = [];
const stateText = readFile('STATE.md');
const decisionBlock = catchup.findSection(catchup.parseSections(stateText), 'Open owner decisions').join('\n');
const decisionNumbers = [...new Set(catchup.issueNumbersIn(decisionBlock))];
for (const n of catchup.issueNumbersIn(stateText + readFile('TODO.md'))) {
  if (!fakeIssues.some((i) => i.number === n)) fakeIssues.push({ number: n, title: 'Title of ' + n, state: 'OPEN', labels: [], body: '', updatedAt: '2026-11-22T00:00:00Z' });
}
const fakeRun = (command, args) => {
  if (command === 'gh' && args[0] === 'issue') return JSON.stringify(fakeIssues);
  if (command === 'gh' && args[0] === 'project') return JSON.stringify({ items: [] });
  return 'main\n';
};
const when = new Date(2026, 10, 22, 9, 5);

// Every decision-block issue number appears in the full report, annotated with its title.
{
  const report = catchup.buildReport({ run: fakeRun, readFile, now: when });
  if (!report.startsWith('Catch-up run: 2026-11-22 09:05')) bad('first line carries the run date and time');
  for (const n of decisionNumbers) if (!report.includes('#' + n + ' [Title of ' + n + ']')) bad('decision issue #' + n + ' missing or without its title');
  for (const s of ['## 1.', '## 2.', '## 3.', '## 4.', '## 5.', '## 6.']) if (!report.includes(s)) bad('section ' + s + ' missing');
}
// gh missing: local sections stay, GitHub sections say unavailable, nothing throws.
{
  const noGh = (command, args) => { if (command === 'gh') throw new Error('gh not runnable'); return fakeRun(command, args); };
  const report = catchup.buildReport({ run: noGh, readFile, now: when });
  if (!report.includes('unavailable')) bad('missing gh is reported as unavailable');
  if (!report.includes('## 1. Branch and tree') || !report.includes('Open owner decisions')) bad('local sections survive a missing gh');
  if (!report.includes('From TODO.md "Next"')) bad('TODO Next still prints without gh');
}
// A stale blocked label is found only when every named blocker is closed.
{
  const open = new Set([5]);
  if (!catchup.blockersAllClosed('blocked by #3 and #4', open)) bad('all blockers closed is stale');
  if (catchup.blockersAllClosed('blocked by #3, #5', open)) bad('one open blocker is not stale');
  if (catchup.blockersAllClosed('no blockers named', open)) bad('no named blocker is not judged stale');
}
console.log(fail ? fail + ' FAILED' : 'catchup harness: all passed');
process.exit(fail ? 1 : 0);
