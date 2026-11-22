/* ============ debug-run-trace.js: the run pace trace (dev only, with ?dev) ============
 * #124 (docs/AI Outputs/Issue-124/124 - Run Pace Trace Plan.md, Jess 2026-11-15): under ?dev every run keeps a pace row
 * each full minute of run clock, a shop row when a shop pair appears, a visit row when you enter a shop (with what you
 * bought there) and an end row, so the economy pass can set prices from real runs. The last TRACE.runsKept runs are
 * kept. G.Game.runRecorder (run start, every map frame, run end) and G.Shops.recorder (pair placed, shop entered, move
 * bought) call it; without ?dev nothing attaches them and nothing is kept. Not in the NEED array, like the other split
 * debug files (decision 2026-11-14-debug-split-files-stay-out-of-need). Loads after debug-leader-trace.js and before game.js.
 *
 *   G.Debug.runTrace()        print the current or last run, one row per event in time order
 *   G.Debug.runTrace('save')  download the run as JSON (put it in tools/cache/; tools/run-pace-summary.js reads it)
 */
(() => {
  const on = G.Debug.on;
  const TRACE = Object.freeze({ runsKept: 5, digits: 2, minute: 60, revokeMs: 1000 });
  const runs = []; // oldest first: { startedAt, rows, minutesDone, killsAtMinute, earnedAtPair, visit, over }

  const round = (value) => +value.toFixed(TRACE.digits);
  const devOnly = () => console.warn('[Debug] add ?dev to the URL to enable debug tools.');

  /** What the run looks like now: the run-shared counters the pause menu's Run Info reads. */
  function snapshot(time) {
    const player = G.Game.player,
      roster = G.Game.roster || [];
    return {
      t: round(time),
      kills: player ? player.kills : 0,
      earned: round(G.Silver.earned),
      balance: G.Silver.whole,
      worldLevel: round(G.Stats.levelForTime(time)),
      yourLevel: player ? player.level : 0,
      team: roster.length,
      teamUp: roster.filter((member) => !member.dead).length,
    };
  }

  const current = () => {
    const run = runs[runs.length - 1];
    return run && !run.over ? run : null;
  };

  function startRun(time) {
    runs.push({
      startedAt: new Date().toISOString(),
      rows: [],
      minutesDone: 0,
      killsAtMinute: 0,
      earnedAtPair: 0,
      visit: null,
      over: false,
    });
    if (runs.length > TRACE.runsKept) runs.shift();
    current().rows.push(Object.assign({ row: 'start', xpBoost: G.Spawner.xpBoostEnabled !== false }, snapshot(time)));
  }

  /** Every map frame: one pace row for each full run minute passed since the last one. */
  function tick(run, time) {
    while (time >= (run.minutesDone + 1) * TRACE.minute) {
      run.minutesDone++;
      const now = snapshot(time);
      run.rows.push(
        Object.assign({ row: 'pace', minute: run.minutesDone, killsThisMinute: now.kills - run.killsAtMinute }, now)
      );
      run.killsAtMinute = now.kills;
    }
  }

  /** G.Game.runRecorder: 'start' (time), 'tick' (time), 'end' (time, fainted). */
  function gameEvent(kind, time, fainted) {
    if (kind === 'start') return startRun(time);
    const run = current();
    if (!run) return;
    if (kind === 'tick') return tick(run, time);
    if (kind !== 'end') return;
    const pairs = run.rows.filter((row) => row.row === 'shops').length,
      visits = run.rows.filter((row) => row.row === 'visit').length;
    run.rows.push(Object.assign({ row: 'end', fainted: !!fainted, pairs, visits }, snapshot(time)));
    run.over = true;
  }

  /** G.Shops.recorder: 'pair' (time), 'enter' (kind), 'buy' (kind, cost). */
  function shopEvent(kind, detail, cost) {
    const run = current();
    if (!run) return;
    const time = G.Game.st ? G.Game.st.time : 0;
    if (kind === 'pair') {
      const now = snapshot(detail);
      run.rows.push(Object.assign({ row: 'shops', earnedSincePair: round(now.earned - run.earnedAtPair) }, now));
      run.earnedAtPair = now.earned;
    } else if (kind === 'enter') {
      run.visit = Object.assign({ row: 'visit', shop: detail, bought: 0, spent: 0 }, snapshot(time));
      run.rows.push(run.visit);
    } else if (kind === 'buy' && run.visit) {
      run.visit.bought++;
      run.visit.spent += cost;
    }
  }

  /** Downloads the run as JSON; returns the file name. */
  function save(run) {
    const name = 'run-trace-' + run.startedAt.replace(/[:.]/g, '-') + '.json',
      data = { startedAt: run.startedAt, over: run.over, rows: run.rows },
      link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), TRACE.revokeMs);
    return name;
  }

  /** Dev only (#124): prints or saves the current or last run. Returns what it shows. */
  function runTrace(what) {
    if (!on) {
      devOnly();
      return false;
    }
    const run = runs[runs.length - 1];
    if (!run) {
      console.warn('[Debug] no run traced yet: start a run in dev.html?dev');
      return false;
    }
    if (what === 'save') {
      console.log('[RunTrace] saved ' + save(run) + ': put it in tools/cache/');
      return run;
    }
    console.log(
      '[RunTrace] run started ' + run.startedAt + ', ' + run.rows.length + ' rows' + (run.over ? '' : ', still running')
    );
    console.table(run.rows);
    return run;
  }
  runTrace.runs = runs;

  // game.js loads after the debug files, so the recorders attach once every deferred script has run (before any run starts).
  if (on)
    document.addEventListener('DOMContentLoaded', () => {
      G.Game.runRecorder = gameEvent;
      G.Shops.recorder = shopEvent;
    });
  Object.assign(G.Debug, { runTrace });
})();
