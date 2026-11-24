// The mosaic background offline checks (#168). Node only: node docs/proposals/mosaic-harness.js .
// The real js/ui/lib/primitives/mosaic/mosaic.js with a made-up page (clock, canvas, graphics). Every check is a relation.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
global.window = global;
global.G = {};
for (const p of ['js/ui/lib/tokens/tokens.js', 'js/ui/lib/primitives/mosaic/mosaic.js']) vm.runInThisContext(fs.readFileSync((p.includes('mosaic') && process.env.MOSAIC_FILE) || R + '/' + p, 'utf8'), { filename: p });
const Mosaic = G.Lib.Mosaic;
let fail = 0; const bad = m => { fail++; console.log('FAIL', m); };

/** A made-up page: step(ms) runs one animation frame. Counts draws, live contexts and waiting frames. */
function makePage({ webgl = true, reduced = false } = {}) {
  const page = { now: 0, draws: 0, contexts: 0, waiting: new Map(), next: 1, listeners: 0, sent: {}, ages: null };
  const makeGl = () => new Proxy({}, { get: (_, key) => {
    if (key === 'getExtension') return () => ({ loseContext: () => page.contexts-- });
    if (key === 'drawArrays') return () => page.draws++;
    if (key === 'getUniformLocation') return (_program, name) => name;
    if (key === 'uniform1f') return (name, value) => (page.sent[name] = value);
    if (key === 'uniform1fv') return (name, value) => { if (name === 'burstAge') page.ages = value.slice(); };
    return () => 1;
  } });
  Object.assign(page, {
    devicePixelRatio: 1,
    performance: { now: () => page.now },
    matchMedia: () => ({ matches: reduced }),
    requestAnimationFrame: fn => { page.waiting.set(page.next, fn); return page.next++; },
    cancelAnimationFrame: id => page.waiting.delete(id),
    addEventListener: () => page.listeners++,
    removeEventListener: () => {},
    document: { createElement: () => {
      const canvas = { clientWidth: 320, clientHeight: 180, width: 0, height: 0, isConnected: false, hidden: false, remove() { this.isConnected = false; page.canvases--; },
        getContext: () => { if (!webgl) return null; page.contexts++; return makeGl(); } };
      return canvas;
    } },
    canvases: 0,
    host: { style: {}, appendChild: canvas => { canvas.isConnected = true; page.canvases++; page.canvas = canvas; } },
    step(ms = 40) { page.now += ms; const run = [...page.waiting.values()]; page.waiting.clear(); for (const fn of run) fn(page.now); },
  });
  return page;
}
const start = (page, options) => Mosaic.start(page.host, options, page);

// 1. it starts when asked, and stopping ends the loop and frees the context
{ const page = makePage(), mosaic = start(page);
  for (let i = 0; i < 5; i++) page.step();
  if (!mosaic.running() || page.draws < 2 || page.contexts !== 1) bad('it does not run after starting');
  mosaic.stop(); const draws = page.draws;
  for (let i = 0; i < 5; i++) page.step();
  if (page.draws !== draws || page.contexts || page.waiting.size || page.canvases || mosaic.running()) bad('stopping left a loop, a context or a canvas');
  mosaic.stop(); if (page.contexts) bad('a second stop freed the context again');
  console.log('1 starts, stops, frees its context'); }

// 2. opening and closing 20 times leaves at most one running; a screen closed another way stops it by itself
{ const page = makePage(); let last = null;
  for (let i = 0; i < 20; i++) { if (last) last.stop(); last = start(page); page.step(); }
  if (page.contexts !== 1 || page.waiting.size !== 1 || page.canvases !== 1) bad('20 openings left ' + page.contexts + ' contexts');
  const other = makePage(); let wanted = true; start(other, { isWanted: () => wanted }); other.step(); wanted = false; other.step(); other.step();
  if (other.contexts || other.waiting.size) bad('an unwanted mosaic kept running');
  console.log('2 at most one runs'); }

// 3. without WebGL the base colour still shows
{ const page = makePage({ webgl: false }), mosaic = start(page);
  if (mosaic.running() || page.waiting.size || page.host.style.background !== G.Tokens.color(Mosaic.DEFAULTS.base) || !page.canvas.hidden) bad('no WebGL: the base colour does not show');
  mosaic.burst('fire'); mosaic.stop();
  console.log('3 no WebGL: the base colour'); }

// 4. one level up is one burst; a finished burst leaves the mosaic as it was; the starburst setting off starts none
{ const page = makePage(), mosaic = start(page); page.step();
  const level = page.ages.join();
  mosaic.burst('fire'); page.step();
  if (mosaic.bursts() !== 1 || page.ages.filter(age => age >= 0).length !== 1 || !mosaic.waterMoving()) bad('one level up did not start exactly one burst');
  for (let i = 0; i < 4000 && (mosaic.bursts() || mosaic.waterMoving()); i++) page.step(100);
  if (mosaic.bursts() || mosaic.waterMoving() || page.ages.join() !== level) bad('a finished burst did not leave the mosaic as it was');
  const off = makePage(), quiet = start(off, { starburst: false }); off.step(); quiet.burst('fire'); off.step();
  if (quiet.bursts()) bad('the starburst setting off still starts a burst');
  console.log('4 one burst a level up, none with the setting off'); }

// 5. the static setting, or a computer asking for reduced motion, draws one frame and runs no loop
for (const [why, page, options] of [['static', makePage(), { still: true }], ['reduced motion', makePage({ reduced: true }), {}]]) {
  const mosaic = start(page, options);
  for (let i = 0; i < 5; i++) page.step();
  mosaic.burst('fire');
  if (page.draws !== 1 || page.waiting.size || mosaic.bursts()) bad(why + ': not one still frame');
  mosaic.stop(); if (page.contexts) bad(why + ': the context was not freed');
}
console.log('5 static is one still frame');

// 6. it never draws faster than its cap, and its tiles do not grow with the screen
{ const page = makePage(); start(page); for (let i = 0; i < 100; i++) page.step(5);
  const slow = makePage(); start(slow); for (let i = 0; i < 100; i++) slow.step(40);
  if (page.draws * 2 > 100 || slow.draws < 90) bad('the frame cap does not hold');
  const tile = page.sent.tileSize; page.canvas.clientWidth *= 2; page.canvas.clientHeight *= 2; page.step(40);
  if (page.sent.tileSize !== tile) bad('the tiles scaled with the screen');
  console.log('6 capped, tiles keep their size'); }

console.log(fail ? 'mosaic harness: ' + fail + ' FAIL' : 'mosaic harness: all passed');
process.exit(fail ? 1 : 0);
