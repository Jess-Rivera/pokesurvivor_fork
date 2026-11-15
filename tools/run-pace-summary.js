// tools/run-pace-summary.js: average saved run pace traces (#124, dev only).
// Plan: docs/ASCII Concept Maps/124 - Run Pace Trace Plan.md.
//
//   node tools/run-pace-summary.js [trace.json ...]
//
// A trace is what G.Debug.runTrace('save') downloads (put it in tools/cache/). With no arguments every
// tools/cache/run-trace-*.json is read. Prints, averaged over the runs that reached each row:
//   by minute: kills that minute, total kills, Silver earned, world level and your level;
//   by shop pair (1st, 2nd, ...): when it appeared, Silver earned since the previous pair, balance, team size;
//   per run: how long it lasted, how it ended, pairs seen and shops entered, moves bought.
'use strict';
const fs = require('fs');
const path = require('path');

const CACHE = path.join(__dirname, 'cache');

function traceFiles(args) {
  if (args.length) return args;
  if (!fs.existsSync(CACHE)) return [];
  return fs
    .readdirSync(CACHE)
    .filter((name) => /^run-trace-.*\.json$/.test(name))
    .map((name) => path.join(CACHE, name));
}

const average = (values) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null);
const shown = (value) => (value == null ? '' : +value.toFixed(1));

/** One table row per index, averaging `fields` over every run that has a row there. */
function averagedRows(lists, label, fields) {
  const longest = Math.max(0, ...lists.map((list) => list.length));
  const rows = [];
  for (let index = 0; index < longest; index++) {
    const present = lists.map((list) => list[index]).filter(Boolean);
    const row = { [label]: index + 1, runs: present.length };
    for (const field of fields) row[field] = shown(average(present.map((entry) => entry[field])));
    rows.push(row);
  }
  return rows;
}

function main() {
  const files = traceFiles(process.argv.slice(2));
  if (!files.length) {
    console.log("run-pace-summary: no traces. Save one with G.Debug.runTrace('save') and put it in tools/cache/.");
    return;
  }
  const runs = files.map((file) => ({
    file: path.basename(file),
    rows: JSON.parse(fs.readFileSync(file, 'utf8')).rows,
  }));
  const of = (kind) => runs.map((run) => run.rows.filter((row) => row.row === kind));

  console.log('run-pace-summary: ' + runs.length + ' run(s)\n\nBy minute');
  console.table(averagedRows(of('pace'), 'minute', ['killsThisMinute', 'kills', 'earned', 'worldLevel', 'yourLevel']));

  console.log('By shop pair (what you could spend there)');
  console.table(
    averagedRows(of('shops'), 'pair', ['t', 'earnedSincePair', 'earned', 'balance', 'worldLevel', 'yourLevel', 'team'])
  );

  console.log('Per run');
  console.table(
    runs.map((run) => {
      const end = run.rows.find((row) => row.row === 'end'),
        last = run.rows[run.rows.length - 1] || {},
        visits = run.rows.filter((row) => row.row === 'visit');
      return {
        file: run.file,
        minutes: shown((end || last).t / 60),
        ended: end ? (end.fainted ? 'fainted' : 'quit') : 'not saved at end',
        kills: (end || last).kills,
        pairs: run.rows.filter((row) => row.row === 'shops').length,
        entered: visits.length,
        bought: visits.reduce((sum, visit) => sum + visit.bought, 0),
      };
    })
  );
}

main();
