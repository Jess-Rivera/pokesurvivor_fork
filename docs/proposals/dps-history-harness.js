// DPS history (#66) offline checks (Node only). Usage from the repo root:  node docs/proposals/dps-history-harness.js
// Loads the real js/systems/dps-history.js (or DPS_HISTORY, for a mutation copy). Expected values are hand-derived from the
// #66 rulings (Jess, 2026-11-10): one bucket per second for the whole run, the team's damage and each member's own, the
// slot on the field each second, a 5 s average over finished seconds, the sparkline's last 30 s. Never copied from code output.
const fs = require('fs'),
  vm = require('vm');
const file = process.env.DPS_HISTORY || 'js/systems/dps-history.js';
global.G = {};
vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
const D = G.DpsHistory;
let fail = 0,
  n = 0;
const ok = (condition, message) => {
  n++;
  if (!condition) {
    fail++;
    console.log('FAIL ' + message);
  }
};
const near = (a, b) => Math.abs(a - b) < 1e-9;
const member = (teamSlot) => ({ teamSlot });
const first = member(0),
  second = member(2); // slot 3 on the keys: slots need not be contiguous

// 1. a fresh record: nothing finished, no DPS
let history = D.create();
ok(D.finishedSeconds(history) === 0, 'fresh: no finished seconds');
ok(D.averageDps(history) === 0, 'fresh: 0 DPS');
ok(D.recent(history, 30).teamDamage.length === 0, 'fresh: the sparkline is empty');
ok(D.AVERAGE_SECONDS === 5, 'the average window is 5 s');

// 2. known hits in, known DPS out. Ten frames of 0.1 s make one second; 100 damage in second 0, 300 in second 1.
history = D.create();
for (let frame = 0; frame < 5; frame++) D.advance(history, 0.1, first);
D.record(history, first, 60);
D.record(history, first, 40);
for (let frame = 0; frame < 5; frame++) D.advance(history, 0.1, first);
// floating point: 10 x 0.1 may land a hair under 1, so step a hair past it
D.advance(history, 1e-6, first);
ok(D.finishedSeconds(history) === 1, 'one second finished after 1 s of frames');
ok(near(D.averageDps(history), 100), 'second 0: 100 damage is 100 DPS (' + D.averageDps(history) + ')');
D.record(history, first, 300);
ok(near(D.averageDps(history), 100), 'the second still filling is not in the average');
D.advance(history, 1, first);
ok(near(D.averageDps(history), 200), 'two finished seconds, 100 and 300: 200 DPS (' + D.averageDps(history) + ')');

// 3. the 5 s window: seconds 0..6 deal 100, 300, 0, 0, 0, 0, 500; the last five finished are 0, 0, 0, 0, 500
D.advance(history, 4, first); // seconds 2 to 5 pass with no hits
D.record(history, first, 500);
D.advance(history, 1, first);
ok(D.finishedSeconds(history) === 7, 'seven seconds finished');
ok(near(D.averageDps(history), 100), 'last 5 s: 500 over 5 s is 100 DPS (' + D.averageDps(history) + ')');
ok(near(D.averageDps(history, 7), 900 / 7), 'a 7 s window counts every second (' + D.averageDps(history, 7) + ')');

// 4. swaps: the slot each second began with; damage credited to the member that dealt it, not the one on the field
history = D.create();
D.advance(history, 0.5, first);
D.record(history, first, 10);
D.advance(history, 0.5, first); // second 0 done, slot 0 out
D.advance(history, 0.25, second); // swapped in at 1.0 s
D.record(history, second, 20);
D.record(history, first, 5); // a move the first Pokemon cast before the swap lands now
D.advance(history, 0.75, second); // second 1 done, slot 2 out
D.advance(history, 1, first); // swapped back: second 2 is slot 0's, no damage
let spark = D.recent(history, 30);
ok(spark.outSlot.join(',') === '0,2,0', 'who was out: slots 0, 2, 0 (' + spark.outSlot.join(',') + ')');
ok(spark.teamDamage.join(',') === '10,25,0', 'team damage per second: 10, 25, 0 (' + spark.teamDamage.join(',') + ')');
ok(near(D.averageDps(history, 5, 0), 15 / 3), "slot 0's own: 10 + 5 over 3 s");
ok(near(D.averageDps(history, 5, 2), 20 / 3), "slot 2's own: 20 over 3 s");
ok(near(D.averageDps(history, 5, 4), 0), 'a slot that never hit: 0');
ok(near(D.averageDps(history), 35 / 3), 'the team: 35 over 3 s');

// 5. the whole run is kept; the sparkline shows the last 30 s, oldest first
history = D.create();
for (let secondIndex = 0; secondIndex < 100; secondIndex++) {
  D.record(history, first, secondIndex + 1); // second k deals k + 1
  D.advance(history, 1, first);
}
ok(history.teamDamage.length >= 100, 'all 100 seconds are kept');
spark = D.recent(history, 30);
ok(spark.teamDamage.length === 30, 'the sparkline holds 30 points');
ok(spark.teamDamage[0] === 71 && spark.teamDamage[29] === 100, 'the last 30 s: seconds 70 to 99 (71 to 100 damage)');
ok(history.teamDamage[0] === 1, 'second 0 is still there after 100 s');

// 6. guards: no record (leader teams), zero or negative damage, a hit before the first frame
D.record(null, first, 50);
D.advance(null, 1, first);
ok(D.averageDps(null) === 0 && D.finishedSeconds(null) === 0, 'no record: reads are 0, writes do nothing');
history = D.create();
D.record(history, first, 0);
D.record(history, first, -4);
D.record(history, second, 40); // before any advance: lands in second 0
D.advance(history, 1, first);
ok(D.recent(history, 30).teamDamage.join(',') === '40', 'zero and negative hits are skipped; an early hit lands in second 0');

// 9. #91-2: totalDamage, everything the record holds (the current second too), for the team or one member; holes read 0
history = D.create();
D.record(history, first, 30);
D.advance(history, 1, first);
D.advance(history, 1, first); // second 1 passes with no damage: a hole
D.record(history, second, 50);
D.record(history, first, 20); // second 2, still filling
ok(D.totalDamage(history) === 100, 'totalDamage: the team, 30 + 50 + 20, the current second included');
ok(D.totalDamage(history, 0) === 50 && D.totalDamage(history, 2) === 50, 'totalDamage per member: slot 0 has 50, slot 2 has 50');
ok(D.totalDamage(history, 4) === 0 && D.totalDamage(null) === 0, 'totalDamage: an empty slot and no record read 0');

// 10. #91-3: fieldSeconds, the finished seconds a slot ended on the field (the Run Stats box's Field)
history = D.create();
D.advance(history, 1, first);
D.advance(history, 1, first);
D.advance(history, 1, second); // a swap
D.advance(history, 0.5, second); // second 3 is still running: not counted
ok(D.fieldSeconds(history, 0) === 2 && D.fieldSeconds(history, 2) === 1, 'fieldSeconds: slot 0 had 2 s, slot 2 had 1 s');
ok(D.fieldSeconds(history, 4) === 0 && D.fieldSeconds(null, 0) === 0, 'fieldSeconds: a slot never on the field and no record read 0');

console.log(fail ? 'dps-history-harness: ' + fail + ' of ' + n + ' FAILED' : 'dps-history-harness: all ' + n + ' passed');
process.exit(fail ? 1 : 0);
