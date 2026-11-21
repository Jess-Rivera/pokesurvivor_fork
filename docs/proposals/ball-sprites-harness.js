// Ball sprites (#128 S6) offline checks (Node only). Usage from the repo root:  node docs/proposals/ball-sprites-harness.js
// Shape checks on the GENERATED js/data/ball-sprites.js (tools/make_ball_sprites.py), so a bad regeneration fails here
// instead of drawing balls off-centre: every ball has a centreShift for every frame, each a whole number of art pixels
// that moves the ball less than half a frame, and the table names exactly the strips' balls; every animation names
// frames the strips have. Whether the shifts really centre the art is measured from the pixels by tools/smoke-ui.js
// (the Pokeballs tab), never from this table.
const fs = require('fs'),
  vm = require('vm');
global.G = {};
const FILE = 'js/data/ball-sprites.js';
vm.runInThisContext(fs.readFileSync(FILE, 'utf8'), { filename: FILE });
let fail = 0,
  n = 0;
const ok = (condition, message) => {
  n++;
  if (!condition) {
    fail++;
    console.log('FAIL ' + message);
  }
};
const sprites = G.BALL_SPRITES || {},
  balls = sprites.balls || [],
  shifts = sprites.centreShift || {};

ok(Number.isInteger(sprites.size) && sprites.size > 0, 'the frame size is a whole number of pixels');
ok(Number.isInteger(sprites.frames) && sprites.frames > 0, 'the frame count is a whole number');
ok(balls.length > 0, 'the strips name their balls');
ok(
  Object.keys(shifts).sort().join() === [...balls].sort().join(),
  'centreShift names exactly the strips\' balls (' + Object.keys(shifts).length + ' of ' + balls.length + ')'
);
for (const ball of balls) {
  const frames = shifts[ball] || [];
  ok(frames.length === sprites.frames, ball + ': a shift for each of its ' + sprites.frames + ' frames (got ' + frames.length + ')');
  frames.forEach((shift, frame) => {
    const whole = Array.isArray(shift) && shift.length === 2 && shift.every(Number.isInteger);
    ok(whole, ball + ' frame ' + frame + ': the shift is [x, y] in whole art pixels (got ' + JSON.stringify(shift) + ')');
    ok(
      whole && shift.every((value) => Math.abs(value) < sprites.size / 2),
      ball + ' frame ' + frame + ': the shift moves the ball less than half a frame (' + JSON.stringify(shift) + ')'
    );
  });
}
for (const [name, frames] of Object.entries(sprites.animations || {}))
  ok(
    frames.length > 0 && frames.every((frame) => Number.isInteger(frame) && frame >= 0 && frame < sprites.frames),
    'animation ' + name + ' names only frames the strips have'
  );

console.log(fail ? 'ball-sprites harness: ' + fail + ' FAILED of ' + n : 'ball-sprites harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
