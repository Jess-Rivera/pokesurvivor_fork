/* ============ catch-ui.js: the catch screen (G.CatchUI, #136) ============
 * Opened by G.Game.openCatch when you touch a won rescue's Stage 1 (js/systems/rescue.js), with the run paused. Every rule lives
 * in G.Catch (js/systems/catch.js); this file only draws and routes input. A Black/White popup in the Inventory window's frame
 * (css/bw-inventory.css, css/bw-catch.css). Plan: docs/ASCII Concept Maps/136 - Catch Phase Slice Opening.md.
 *   left    the portrait, name and nature, its star, the catch chance of the selected ball
 *   right   the Flee pips (one per miss allowed), the belt strip (one cell per belt slot), the last throw's result
 *   input   a click or a number key (1 Poke) selects a tier, the best stocked one starts selected; Throw, Enter, or a double
 *           click (double tap) on a ball throws it. A throw plays a short wobble, then the result; nothing else is taken
 *           meanwhile. Let it go, or Esc, asks once (G.UI.ask), then it runs off and the balls stay on the belt.
 */
G.CatchUI = (() => {
  const $ = G.UI.$;
  const WOBBLE_MS = 1000; // the ball's three wobbles before the result
  const RESULT_MS = 900; // the result stays this long before a caught or fled catch closes
  let cur = null; // { session, onClose, ball, note, busy }

  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const pct = (p) => Math.round(p * 100) + '%';

  function open(session, onClose) {
    const best = G.Catch.bestStocked();
    cur = { session, onClose, ball: best ? best.id : G.Catch.BALLS[0].id, note: '', busy: false };
    $('catch-throw').onclick = () => throwNow();
    $('catch-letgo').onclick = () => letGo();
    const face = $('catch-portrait');
    face.dataset.dex = session.dex;
    face.onerror = null;
    face.src = 'assets/pokemon/' + session.dex + '/Portrait.png';
    render();
    G.UI.show('scr-catch');
  }

  function close() {
    const cb = cur && cur.onClose;
    cur = null;
    G.UI.hide('scr-catch');
    if (cb) cb();
  }

  function select(ballId) {
    if (!cur || cur.busy || G.Catch.count(ballId) <= 0) return;
    cur.ball = ballId;
    G.Audio.sfx('select');
    render();
  }

  function throwNow(ballId = cur && cur.ball) {
    if (!cur || cur.busy) return;
    if (G.Catch.count(ballId) <= 0) return;
    cur.ball = ballId;
    const outcome = G.Catch.throwBall(ballId);
    if (outcome === 'none') return;
    const s = cur.session;
    cur.busy = true;
    cur.note = '';
    G.Audio.sfx('confirm');
    render();
    $('catch-stage').classList.add('throwing');
    setTimeout(() => {
      if (!cur) return;
      $('catch-stage').classList.remove('throwing');
      if (outcome === 'caught') {
        cur.note = 'Gotcha! ' + s.name + ' was caught! It joins your Pokebox when the run ends.';
        G.Audio.sfx('shinyGet');
      } else if (outcome === 'fled') {
        cur.note =
          G.Catch.total() > 0 ? s.name + ' broke free and ran off!' : 'Out of Poke Balls! ' + s.name + ' ran off.';
        G.Audio.sfx('back');
      } else {
        cur.note = 'Oh no! It broke free.';
        G.Audio.sfx('hit');
      }
      render();
      if (outcome === 'miss') {
        cur.busy = false;
        const best = G.Catch.count(cur.ball) > 0 ? null : G.Catch.bestStocked();
        if (best) cur.ball = best.id;
        render();
        return;
      }
      setTimeout(() => {
        if (!cur) return;
        G.Spawner.say(outcome === 'caught' ? s.name + ' was caught!' : s.name + ' ran off.', 3, true);
        close();
      }, RESULT_MS);
    }, WOBBLE_MS);
  }

  async function letGo() {
    if (!cur || cur.busy) return;
    cur.busy = true;
    const name = cur.session.name;
    const sure = await G.UI.ask('Let ' + name + ' go? It runs off and your Poke Balls stay on your belt.', {
      title: 'Let it go?',
      ok: 'Let it go',
      cancel: 'Keep trying',
    });
    if (!cur) return;
    cur.busy = false;
    if (!sure) return;
    G.Catch.letGo();
    G.Spawner.say(name + ' ran off.', 3, true);
    G.Audio.sfx('back');
    close();
  }

  function render() {
    if (!cur) return;
    const s = cur.session,
      belt = G.Catch.belt(),
      left = G.Catch.total();
    $('catch-count').textContent = 'Belt ' + left + ' / ' + belt.size;
    $('catch-name').textContent = s.name;
    $('catch-nature').textContent = s.natureName + ' nature';
    $('catch-star').innerHTML = G.Icons.rarity(s.star, 18);
    const ball = G.Catch.BALLS.find((b) => b.id === cur.ball) || G.Catch.BALLS[0];
    $('catch-odds').textContent = pct(G.Catch.odds(s.dex, ball.id, s.timeFraction));
    $('catch-odds-ball').textContent = 'with a ' + ball.name;
    $('catch-time').textContent =
      'Time bonus +' + pct(s.timeFraction) + ' (beaten with ' + pct(s.timeFraction) + ' of the clock left)';
    $('catch-stage-ball').innerHTML = G.Icons.html(ball.icon, 40);
    // Flee: one pip per miss allowed, filled per miss so far
    const pips = $('catch-flee');
    pips.innerHTML = '';
    for (let i = 0; i < s.allowed; i++) {
      const pip = document.createElement('span');
      pip.className = 'catch-pip' + (i < s.misses ? ' on' : '');
      pips.appendChild(pip);
    }
    const missesLeft = s.allowed - s.misses;
    $('catch-flee-text').textContent = !G.Catch.session
      ? '' // caught or ran off: the result line says which
      : missesLeft === 1
        ? 'One more miss and it runs off'
        : missesLeft + ' misses before it runs off';
    // The belt strip: one cell per slot, the balls first (best tier first), then the empty slots
    const strip = $('catch-belt');
    strip.innerHTML = '';
    const balls = [];
    for (const b of [...G.Catch.BALLS].reverse()) for (let i = 0; i < G.Catch.count(b.id); i++) balls.push(b);
    for (let i = 0; i < belt.size; i++) {
      const b = balls[i],
        cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'catch-cell' + (b ? (b.id === cur.ball ? ' on' : '') : ' empty');
      cell.dataset.sfx = 'none';
      if (b) {
        cell.innerHTML = G.Icons.html(b.icon, 32) + '<small>' + (G.Catch.BALLS.indexOf(b) + 1) + '</small>';
        cell.title = b.name + ': click to select, double click to throw';
        cell.onclick = () => select(b.id);
        cell.ondblclick = () => throwNow(b.id);
      } else cell.disabled = true;
      strip.appendChild(cell);
    }
    $('catch-note').innerHTML = cur.note ? esc(cur.note) : '&nbsp;';
    $('catch-throw').disabled = cur.busy || G.Catch.count(cur.ball) <= 0;
    $('catch-letgo').disabled = cur.busy;
  }

  /** Each frame while the screen is open (G.Game routes the keys here). */
  function keys() {
    if (!cur || cur.busy) return; // a throw in the air, or the Let it go dialog (it takes its own Enter and Esc)
    if (G.Input.tap('escape')) return letGo();
    if (G.Input.tap('enter')) return throwNow();
    G.Catch.BALLS.forEach((b, i) => {
      if (G.Input.action('attack_' + (i + 1))) select(b.id);
    });
  }

  return {
    open,
    keys,
    select,
    throwNow,
    letGo,
    get isOpen() {
      return !!cur;
    },
    get busy() {
      return !!cur && cur.busy;
    },
  };
})();
