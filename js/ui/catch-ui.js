/* ============ catch-ui.js: the catch screen (G.CatchUI, #136; redesign 136b; catch.window #128) ============
 * Opened by G.Game.openCatch when you touch a won rescue's Stage 1 (js/systems/rescue.js), with the run paused. Every rule lives
 * in G.Catch (js/systems/catch.js); this file only draws and routes input. Look: catch.window (decisions
 * 2026-11-20-155-catch-window-look, -catch-result-is-a-toast-and-the-window-is-shorter,
 * -catch-let-it-go-ask-opens-on-keep-trying; board tools/library/catch-draft.js), from the UI library's pieces.
 * Plan: docs/ASCII Concept Maps/catch.window Plan.md. On the pause menu's 1920 x 1080 stage, scaled to fit, inside
 * #scr-catch.
 *   window   panel.clean, 980 x 424, centred.
 *   left     the Pokemon: panel.pixel in its types (a two-type rim dithered across the middle) on a plain grey.raised
 *            body; the flee ring (portrait.round's ring, the first type's dark over grey.paper, one step per miss);
 *            "{Nature} {Name}", the catch band (a range that holds the true chance, G.Catch.band) and the ball it is
 *            for, in Silver (font.silver, the Pokemon tier).
 *   middle   three of the kit's ball belts (BallBelt, the Shop's): the belts the save has bought (G.Catch.beltsBought,
 *            #137) hold its balls slot for slot as the save lays them out (G.Catch.slots, arranged in the Shop,
 *            #137b); the rest are locked. The selected ball's well takes the belt's dark inside its light ring; the
 *            numbered belt shows its keys 1 to 6.
 *   right    Pokemon owned: panel.clean, every copy of this species in the Pokebox (best IV + EV total first) as 48 px
 *            faces, its tooltip on focus; then Throw (positive) and Let It Go (negative), button.glitch.
 *   result   a toast (G.UI.toast): caught is news, a miss, a flee and out of balls are bad news.
 *   input    one selection cursor over every control. Arrows (the move keys) move it, hover moves where it goes on
 *            from. With the keys it shows: cursor.ring on a well or a face, a button's own focus. With the mouse no
 *            ring shows (decision 2026-11-17-no-selection-cursor-with-the-mouse) and a button swipes on hover. Enter on
 *            a ball selects it, Enter on the selected ball throws it; Enter on Throw throws the selected ball. 1 to 6
 *            throw that slot of the numbered belt (the belt the cursor was last in; only it shows numbers). Click
 *            selects, double click throws. Esc or Let It Go asks once (G.UI.ask, negative: it opens on Keep trying).
 *            Nothing is taken while a ball is in the air.
 */
G.CatchUI = (() => {
  const overlay = G.HudOverlay,
    screen = document.getElementById('scr-catch'), // absent on pages that load the game's scripts without its screens
    library = G.Lib || {};
  const pieces = [library.Button, library.Cursor, library.Well];
  const piecesReady = pieces.every((piece) => piece && piece.ready);
  if (!overlay || !overlay.ready || !screen || !piecesReady) return { ready: false };
  const { html, signal, hooks, preact, typeColours, Box, ScrollBox, inputMode } = overlay.kit;
  const { fitToStage, showTooltip, hideTooltip, portraitSource, portraitFallback, BallSprite, RoundPortrait } = overlay.kit;
  const { BALL_BELT, BallBelt, BeltBall } = overlay.kit;
  const { GlitchButton } = library.Button,
    { CURSOR_RING, CursorRing, useRingTravel } = library.Cursor,
    { Well } = library.Well;

  // ---------- sizes and places (stage pixels; the window is centred on the 1920 x 1080 stage; the board's) ----------
  const STAGE = { width: 1920, height: 1080 },
    WINDOW = { width: 980, height: 424 }, // only as tall as a belt and its padding
    PAD = 20,
    MON = { left: PAD, top: PAD, width: 340, height: WINDOW.height - 2 * PAD }, // as tall as a belt (384)
    RING = { size: 160, top: 24, stroke: 4 }, // the flee ring: a 132 px face inside the ring's 2 px outline and band
    TEXT = { nameTop: 204, bandTop: 254, ballTop: 308 }, // Silver 30, 40, 30; left and right in bw-catch.css
    BELT = { firstLeft: 372, step: 96, count: 3, slots: BALL_BELT.slots }, // 84 px belts, 12 px apart
    // faces 20 px apart across and 16 down, so a face's cursor ring clears the next face's (decision 2026-11-20)
    OWNED = { left: 676, top: PAD, width: 284, height: 244, inset: 16, columns: 4, face: 48, faceStroke: 2 },
    BUTTON = { left: 678, width: 280, height: 54, tops: [280, 350] }; // Let It Go on the window's bottom padding
  BELT.top = PAD + (WINDOW.height - 2 * PAD - BALL_BELT.height) / 2; // 20
  Object.assign(OWNED, { columnGap: 20, rowGap: 16, visibleRows: 4, trackRight: 3 }); // rows the keys map belts onto
  OWNED.rowPitch = OWNED.face + OWNED.rowGap; // 64
  OWNED.gridWidth = OWNED.columns * OWNED.face + (OWNED.columns - 1) * OWNED.columnGap; // 252
  // the scroll box is a cursor ring's reach bigger all round, so the ring is never clipped
  OWNED.room = CURSOR_RING.reach;
  // the belt's colours (the Poke Balls pocket, kept canon): a holding well's ring, the selected well's ring and inside
  const BELT_RIM = G.Tokens.ramp('color.rim.belt'),
    MON_BODY = G.Tokens.color('color.grey.raised'), // the Pokemon panel's plain body
    RING_TRACK = G.Tokens.color('color.grey.paper'), // the flee ring's empty part: every type's dark reads on it
    SCROLL_COLOURS = {
      track: G.Tokens.color('color.scroll.track'),
      thumb: G.Tokens.color('color.scroll.thumb'),
      thumbRim: G.Tokens.color('color.scroll.thumbRim'),
    };

  // ---------- the throw (ms) ----------
  const FLY_MS = 450, // belt to portrait, spinning
    FLY_ARC = 140, // how high the arc rises above the straight line
    SPIN_FRAME_MS = 40,
    ABSORB_MS = 220, // the ball opens and the portrait shrinks into it
    WOBBLE_FRAME_MS = 60, // each shake is half the wobble strip (six frames, alternating sides), about a third of a second
    RESULT_MS = 900, // a caught or fled catch closes this long after the result
    BREAK_OUT_MS = 260, // a miss: the ball stays open while the portrait comes back
    RESULT_TOAST_MS = 2200, // the result's toast (G.UI.toast's own default)
    BAD_NEWS = 'bad'; // G.UI.toast's tone for bad news (the red edge)

  const BALL_SPRITES = G.BALL_SPRITES;
  const STAT_ORDER = [
    ['HP', 0],
    ['Atk', 1],
    ['Def', 2],
    ['Spe', 5],
    ['SpA', 3],
    ['SpD', 4],
  ]; // the tooltip's two rows (mockup); the save's order is HP, Atk, Def, SpA, SpD, Spe
  const GENDER_MARK = { male: '\u2642', female: '\u2640' };

  // ---------- state ----------
  const shown = signal(null); // { session, owned, types } while open
  const selected = signal({ belt: 0, slot: 0 }); // the slot of the current ball
  const focus = signal({ area: 'slot', belt: 0, slot: 0 }); // { area: 'slot', belt, slot } | 'owned', index | 'button', index
  const numberedBelt = signal(0); // the belt whose slots show 1 to 6 (the one the cursor was last in)
  const busy = signal(false);
  const flight = signal(null); // the ball in the air: { ball, frame, x, y }
  const face = signal('shown'); // the portrait: 'shown', 'absorbed' (inside the ball) or 'fled'
  const beltCount = signal(0); // read on every belt change, so the slots redraw
  const shownMisses = signal(0); // the flee ring's misses: catches up with the session after a throw's break-out (#148b)
  let onClose = null;
  let throwToken = 0; // a throw's timers stop when the screen closes under them

  // ---------- the belts ----------
  const isLocked = (belt) => belt >= G.Catch.beltsBought(); // a belt not bought in the Shop yet (#137)
  /** A slot's place across the belts: belt 1's six, then belt 2's, then belt 3's. */
  const positionOf = (belt, slot) => belt * BELT.slots + slot;
  /** A belt's six slots as the save lays them out (a throw empties its own slot); null is empty. */
  function slotsOf(belt) {
    beltCount.value; // redraw when the belt changes
    if (isLocked(belt)) return Array(BELT.slots).fill(null);
    return G.Catch.slots()
      .slice(positionOf(belt, 0), positionOf(belt + 1, 0))
      .map((id) => G.Catch.BALLS.find((ball) => ball.id === id) || null);
  }
  const stocked = (belt) =>
    slotsOf(belt)
      .map((ball, slot) => (ball ? slot : -1))
      .filter((slot) => slot >= 0);
  const nearestStocked = (belt, slot) => {
    const list = stocked(belt);
    return list.length ? list.reduce((best, s) => (Math.abs(s - slot) < Math.abs(best - slot) ? s : best)) : -1;
  };
  const ballAt = ({ belt, slot }) => slotsOf(belt)[slot] || null;
  const selectedBall = () => ballAt(selected.value) || G.Catch.BALLS[0];
  /** The stocked slot nearest a place: on its belt first, else the first stocked slot of any belt; null when empty. */
  function nearestAnywhere({ belt, slot }) {
    const here = nearestStocked(belt, slot);
    if (here >= 0) return { belt, slot: here };
    for (let other = 0; other < BELT.count; other++)
      if (stocked(other).length) return { belt: other, slot: stocked(other)[0] };
    return null;
  }
  const slotCentre = (belt, slot) => ({
    x: BELT.firstLeft + belt * BELT.step + BALL_BELT.inset + BALL_BELT.well / 2,
    y: BELT.top + BALL_BELT.inset + slot * (BALL_BELT.well + BALL_BELT.gap) + BALL_BELT.well / 2,
  });
  const faceCentre = { x: MON.left + MON.width / 2, y: MON.top + RING.top + RING.size / 2 };

  // ---------- the cursor ----------
  const ownedCount = () => (shown.value ? shown.value.owned.length : 0);
  function focusSlot(belt, slot) {
    focus.value = { area: 'slot', belt, slot };
    numberedBelt.value = belt;
  }
  /** Back to a belt from the right column: the numbered belt, at its stocked slot nearest rowHint (0 to 5). */
  function focusBelt(rowHint) {
    const belt = numberedBelt.value,
      slot = nearestStocked(belt, rowHint);
    if (slot >= 0) focusSlot(belt, slot);
  }
  // The owned grid scrolls; the cursor enters it at the row level with where it came from.
  const scrolledRows = () => {
    const grid = host.querySelector('.catch-owned .hud-scroll-box');
    return grid ? Math.round(grid.scrollTop / OWNED.rowPitch) : 0;
  };
  /** An owned cell's row as seen in the window, 0 to visibleRows - 1. */
  const visibleRow = (index) =>
    Math.max(0, Math.min(OWNED.visibleRows - 1, Math.floor(index / OWNED.columns) - scrolledRows()));
  /** The first cell of a row seen in the window (0 to visibleRows - 1), held to the last row there is. */
  const ownedRowStart = (row) =>
    Math.min(scrolledRows() + row, Math.floor((ownedCount() - 1) / OWNED.columns)) * OWNED.columns;
  const focusOwnedOrThrow = (index) =>
    (focus.value = ownedCount() ? { area: 'owned', index } : { area: 'button', index: 0 });

  function move(dx, dy) {
    const at = focus.value;
    if (at.area === 'slot') {
      if (dy) {
        const list = stocked(at.belt),
          next = dy > 0 ? list.find((s) => s > at.slot) : [...list].reverse().find((s) => s < at.slot);
        if (next != null) focusSlot(at.belt, next);
      } else if (dx > 0) {
        // the next belt with a ball; past the belts, the owned grid (the row level with this slot)
        for (let belt = at.belt + 1; belt < BELT.count; belt++) {
          const slot = nearestStocked(belt, at.slot);
          if (slot >= 0) return focusSlot(belt, slot);
        }
        focusOwnedOrThrow(ownedRowStart(Math.floor((at.slot * OWNED.visibleRows) / BELT.slots)));
      } else if (dx < 0) {
        for (let belt = at.belt - 1; belt >= 0; belt--) {
          const slot = nearestStocked(belt, at.slot);
          if (slot >= 0) return focusSlot(belt, slot);
        }
      }
    } else if (at.area === 'owned') {
      const column = at.index % OWNED.columns,
        count = ownedCount();
      if (dx < 0) {
        if (column > 0) focus.value = { area: 'owned', index: at.index - 1 };
        else focusBelt(Math.round((visibleRow(at.index) * BELT.slots) / OWNED.visibleRows));
      } else if (dx > 0) {
        if (column < OWNED.columns - 1 && at.index + 1 < count) focus.value = { area: 'owned', index: at.index + 1 };
      } else if (dy > 0) {
        focus.value =
          at.index + OWNED.columns < count
            ? { area: 'owned', index: at.index + OWNED.columns }
            : { area: 'button', index: 0 };
      } else if (dy < 0 && at.index >= OWNED.columns) focus.value = { area: 'owned', index: at.index - OWNED.columns };
    } else {
      if (dx < 0) focusBelt(BELT.slots - 1);
      else if (dy > 0 && at.index === 0) focus.value = { area: 'button', index: 1 };
      else if (dy < 0 && at.index === 1) focus.value = { area: 'button', index: 0 };
      else if (dy < 0 && ownedCount()) focus.value = { area: 'owned', index: ownedRowStart(OWNED.visibleRows - 1) };
    }
  }

  // ---------- actions ----------
  const isSelected = (belt, slot) => selected.value.belt === belt && selected.value.slot === slot;
  function select(belt, slot) {
    if (busy.value || !slotsOf(belt)[slot]) return;
    if (!isSelected(belt, slot)) G.Audio.sfx('select');
    selected.value = { belt, slot };
  }

  /** Throw the ball in a slot (the selected one when none is given). */
  async function throwNow(belt = selected.value.belt, slot = selected.value.slot) {
    const view = shown.value;
    const ball = slotsOf(belt)[slot];
    if (!view || busy.value || !ball) return;
    const outcome = G.Catch.throwBall(ball.id, Math.random, positionOf(belt, slot));
    if (outcome === 'none') return;
    const token = ++throwToken,
      name = view.session.name,
      alive = () => token === throwToken && shown.value === view;
    selected.value = { belt, slot };
    busy.value = true;
    hideTooltip();
    beltCount.value++;
    G.Audio.sfx('confirm');
    // out of the slot, in an arc onto the portrait, spinning
    const from = slotCentre(belt, slot);
    await play(FLY_MS, (t, elapsed) => {
      const spin = BALL_SPRITES.animations.spin;
      flight.value = {
        ball: ball.id,
        frame: spin[Math.floor(elapsed / SPIN_FRAME_MS) % spin.length],
        x: from.x + (faceCentre.x - from.x) * t,
        y: from.y + (faceCentre.y - from.y) * t - FLY_ARC * 4 * t * (1 - t),
      };
    });
    if (!alive()) return;
    // it opens and the portrait goes in
    flight.value = { ...flight.value, frame: BALL_SPRITES.animations.open[0], x: faceCentre.x, y: faceCentre.y };
    face.value = 'absorbed';
    await wait(ABSORB_MS);
    if (!alive()) return;
    // #148: one wobble per shake the throw passed (none when it broke out at once; one on a critical catch)
    const wobble = BALL_SPRITES.animations.wobble,
      shakeFrames = wobble.length / 2,
      roll = G.Catch.lastThrow || { shakes: 0, critical: false };
    for (let shake = 0; shake < roll.shakes; shake++) {
      const frames = wobble.slice((shake % 2) * shakeFrames, (shake % 2) * shakeFrames + shakeFrames);
      await play(frames.length * WOBBLE_FRAME_MS, (t, elapsed) => {
        flight.value = {
          ...flight.value,
          frame: frames[Math.min(frames.length - 1, Math.floor(elapsed / WOBBLE_FRAME_MS))],
        };
      });
      if (!alive()) return;
    }
    if (outcome === 'caught') {
      flight.value = { ...flight.value, frame: BALL_SPRITES.animations.front[0], caught: true };
      const caughtLine = (roll.critical ? 'Critical catch! ' : 'Gotcha! ') + name + ' was caught!';
      G.UI.toast(caughtLine + ' It joins your Pokebox when the run ends.', RESULT_TOAST_MS);
      G.Audio.sfx('shinyGet');
      await wait(RESULT_MS);
      if (!alive()) return;
      G.Spawner.say(name + ' was caught!', 3, true);
      return close();
    }
    // broke free: the ball opens, the portrait comes back
    flight.value = { ...flight.value, frame: BALL_SPRITES.animations.open[0] };
    face.value = 'shown';
    await wait(BREAK_OUT_MS);
    if (!alive()) return;
    flight.value = null;
    shownMisses.value = view.session.misses;
    if (outcome === 'fled') {
      face.value = 'fled';
      const fledLine = G.Catch.total() > 0 ? name + ' broke free and ran off!' : 'Out of Poke Balls! ' + name + ' ran off.';
      G.UI.toast(fledLine, RESULT_TOAST_MS, BAD_NEWS);
      G.Audio.sfx('back');
      await wait(RESULT_MS);
      if (!alive()) return;
      G.Spawner.say(name + ' ran off.', 3, true);
      return close();
    }
    G.UI.toast('Oh no! It broke free.', RESULT_TOAST_MS, BAD_NEWS);
    G.Audio.sfx('hit');
    beltCount.value++;
    if (!ballAt(selected.value)) selected.value = nearestAnywhere(selected.value) || selected.value;
    const at = focus.value;
    if (at.area === 'slot' && !slotsOf(at.belt)[at.slot])
      focusSlot(at.belt, Math.max(0, nearestStocked(at.belt, at.slot)));
    busy.value = false;
  }

  async function letGo() {
    const view = shown.value;
    if (!view || busy.value) return;
    busy.value = true;
    hideTooltip();
    const name = view.session.name;
    const sure = await G.UI.ask('Let ' + name + ' go? It runs off and your Poke Balls stay on your belt.', {
      title: 'Let it go?',
      ok: 'Let it go',
      cancel: 'Keep trying',
      intent: 'negative', // a loss you cannot earn back: it opens on Keep trying (decision 2026-11-20)
    });
    if (shown.value !== view) return;
    busy.value = false;
    if (!sure) return;
    G.Catch.letGo();
    G.Spawner.say(name + ' ran off.', 3, true);
    G.Audio.sfx('back');
    close();
  }

  /** Enter on whatever the cursor is on. */
  function press() {
    const at = focus.value;
    if (at.area === 'slot') {
      if (isLocked(at.belt)) return;
      if (isSelected(at.belt, at.slot)) throwNow(at.belt, at.slot);
      else select(at.belt, at.slot);
    } else if (at.area === 'button') {
      if (at.index === 0) throwNow();
      else letGo();
    }
  }

  // ---------- timing ----------
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  /** Calls step(t from 0 to 1, elapsed ms) every animation frame for ms, then resolves. */
  function play(ms, step) {
    return new Promise((resolve) => {
      const start = performance.now();
      const frame = (now) => {
        // the frame's timestamp is when the frame began, which can be a moment before start: never below zero, so the
        // first frame is an animation's first (a negative time picked the spin's frame -1, which does not exist)
        const elapsed = Math.max(0, Math.min(ms, now - start));
        step(elapsed / ms, elapsed);
        if (elapsed >= ms) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  // ---------- drawing ----------
  const px = (value) => value + 'px';
  // the cursor's ids for cursor.ring (useRingTravel): a belt slot and an owned face
  const slotRingId = (belt, slot) => 'slot-' + belt + '-' + slot,
    ownedRingId = (index) => 'owned-' + index;
  /** Where the keys' cursor is, for cursor.ring: a well's or a face's id, or null (a button, or the mouse in use). */
  function ringTarget() {
    const at = focus.value;
    if (inputMode.value !== 'keys') return null;
    if (at.area === 'slot') return slotRingId(at.belt, at.slot);
    if (at.area === 'owned') return ownedRingId(at.index);
    return null;
  }
  /** Whether the keys' cursor shows on a control now (the control then marks itself data-cursor-shown). */
  const keysOn = (matches) => inputMode.value === 'keys' && matches(focus.value);

  function MonPanel({ view }) {
    const { session, types } = view;
    const rim = typeColours(types[0]),
      rimRight = types[1] ? typeColours(types[1]) : null;
    const ball = selectedBall();
    const band = G.Catch.band(G.Catch.odds(session, ball.id), session.bandShift);
    const textAt = (top) => ({ top: px(top) }); // centred across the panel by bw-catch.css
    return html`<${Box}
      left=${MON.left}
      top=${MON.top}
      width=${MON.width}
      height=${MON.height}
      rim=${rim}
      rimRight=${rimRight}
      body=${MON_BODY}
      className="catch-mon"
    >
      <${RoundPortrait}
        className="catch-ring"
        faceClass=${'catch-face is-' + face.value}
        style=${{ left: px((MON.width - RING.size) / 2), top: px(RING.top) }}
        size=${RING.size}
        stroke=${RING.stroke}
        ring=${{ fraction: shownMisses.value / session.allowed, fill: rim.dark, track: RING_TRACK }}
        src=${portraitSource(session.dex, false)}
        dex=${session.dex}
        onError=${portraitFallback}
      />
      <div class="catch-silver catch-silver-30 catch-name" style=${textAt(TEXT.nameTop)}>
        ${session.natureName + ' ' + session.name}
      </div>
      <div class="catch-silver catch-silver-40 catch-band" style=${textAt(TEXT.bandTop)}>
        ${band.low + '-' + band.high + '%'}
      </div>
      <div class="catch-silver catch-silver-30 catch-ball-name" style=${textAt(TEXT.ballTop)}>
        ${'with a ' + ball.name}
      </div>
    </${Box}>`;
  }

  function Belt({ belt, ring }) {
    const locked = isLocked(belt),
      slots = slotsOf(belt),
      numbered = numberedBelt.value === belt && !locked;
    const slot = (index, place) => {
      const ball = slots[index],
        chosen = !locked && isSelected(belt, index),
        id = slotRingId(belt, index),
        cursorHere = keysOn((at) => at.area === 'slot' && at.belt === belt && at.slot === index);
      // the selected ball's well: the belt's dark inside its light ring; a holding well rings in the belt's base
      const ringColour = ball ? (chosen ? BELT_RIM.light : BELT_RIM.base) : null;
      return html`<div
        key=${index}
        class=${'catch-slot' + (ball ? ' is-full' : '') + (chosen ? ' is-selected' : '')}
        data-belt=${belt}
        data-slot=${index}
        data-cursor-shown=${cursorHere ? '' : undefined}
        style=${place}
        onMouseEnter=${() => !busy.value && ball && focusSlot(belt, index)}
        onClick=${() => !locked && select(belt, index)}
        onDblClick=${() => !locked && throwNow(belt, index)}
      >
        <${Well} size=${BALL_BELT.well} ring=${ringColour} fill=${ball && chosen ? BELT_RIM.dark : null}>
          ${ball ? html`<${BeltBall} ball=${ball.id} />` : null}
        </${Well}>
        ${numbered ? html`<span class="catch-silver catch-silver-20 catch-slot-key">${index + 1}</span>` : null}
        ${ring.at === id ? html`<${CursorRing} phase=${ring.phase} />` : null}
      </div>`;
    };
    return html`<${BallBelt}
      left=${BELT.firstLeft + belt * BELT.step}
      top=${BELT.top}
      number=${belt + 1}
      locked=${locked}
      className="catch-belt"
      slot=${slot}
    />`;
  }

  function OwnedGrid({ view, ring }) {
    const room = OWNED.room;
    const cells = view.owned.map((copy, index) => {
      const column = index % OWNED.columns,
        row = Math.floor(index / OWNED.columns),
        cursorHere = keysOn((at) => at.area === 'owned' && at.index === index);
      return html`<div
        key=${copy.pokemonUUID}
        class="catch-owned-cell"
        data-owned-index=${index}
        data-cursor-shown=${cursorHere ? '' : undefined}
        style=${{
          left: px(room + column * (OWNED.face + OWNED.columnGap)),
          top: px(room + row * OWNED.rowPitch),
          width: px(OWNED.face),
          height: px(OWNED.face),
        }}
        onMouseEnter=${() => !busy.value && (focus.value = { area: 'owned', index })}
      >
        <${RoundPortrait}
          className="catch-owned-face"
          size=${OWNED.face}
          stroke=${OWNED.faceStroke}
          src=${portraitSource(copy.speciesID, copy.isShiny)}
          dex=${copy.speciesID}
          onError=${portraitFallback}
        />
        ${ring.at === ownedRingId(index) ? html`<${CursorRing} phase=${ring.phase} />` : null}
      </div>`;
    });
    const rows = Math.ceil(view.owned.length / OWNED.columns);
    return html`<div
      class="catch-owned panel-clean"
      style=${{ left: px(OWNED.left), top: px(OWNED.top), width: px(OWNED.width), height: px(OWNED.height) }}
    >
      <${ScrollBox}
        box=${{
          left: OWNED.inset - room,
          top: OWNED.inset - room,
          width: OWNED.gridWidth + 2 * room,
          height: OWNED.height - 2 * OWNED.inset + 2 * room,
        }}
        trackRight=${OWNED.trackRight}
        colours=${SCROLL_COLOURS}
        resetOn=${[view]}
      >
        <div class="catch-owned-grid" style=${{ height: px(rows * OWNED.rowPitch - OWNED.rowGap + 2 * room) }}>
          ${cells}
        </div>
      </${ScrollBox}>
      ${view.owned.length ? null : html`<div class="catch-silver catch-silver-20 catch-owned-none">None owned yet</div>`}
    </div>`;
  }

  function Buttons() {
    const focusedOn = (index) => keysOn((at) => at.area === 'button' && at.index === index);
    const button = (index, id, label, intent, onPress) =>
      html`<div
        class=${'catch-button' + (index ? ' catch-let-go' : '')}
        data-cursor-shown=${focusedOn(index) ? '' : undefined}
        style=${{
          left: px(BUTTON.left),
          top: px(BUTTON.tops[index]),
          width: px(BUTTON.width),
          height: px(BUTTON.height),
        }}
      >
        <${GlitchButton}
          id=${id}
          label=${label}
          intent=${intent}
          width=${BUTTON.width}
          height=${BUTTON.height}
          focused=${focusedOn(index)}
          onEnter=${() => !busy.value && (focus.value = { area: 'button', index })}
          onPress=${onPress}
        />
      </div>`;
    return html`${button(0, 'throw', 'Throw', 'positive', () => throwNow())}
      ${button(1, 'let-go', 'Let It Go', 'negative', letGo)}`;
  }

  /** The owned tooltip: name, gender and box, then IV + EV per stat. */
  function ownedTooltip(copy) {
    const name = copy.nickname || (G.DEX_BY[copy.speciesID] || {}).name || '?';
    const value = (stat) => copy.iv[stat] + copy.ev[stat];
    const row = (pairs) => pairs.map(([label, stat]) => label + ': ' + value(stat)).join('   ');
    return {
      name: name + ' ' + (GENDER_MARK[copy.gender] || '') + '  Box ' + (copy.box + 1),
      lines: [row(STAT_ORDER.slice(0, 3)), row(STAT_ORDER.slice(3))],
    };
  }

  function Screen() {
    const view = shown.value;
    const rootRef = hooks.useRef(null);
    const at = focus.value;
    const ring = useRingTravel(view ? ringTarget() : null);
    // the owned tooltip follows the cursor (keys and hover alike), and the grid scrolls to keep the cursor in view
    hooks.useLayoutEffect(() => {
      if (!view || at.area !== 'owned' || busy.value) return hideTooltip();
      const cell = rootRef.current && rootRef.current.querySelector('[data-owned-index="' + at.index + '"]');
      if (!cell) return hideTooltip();
      const grid = cell.closest('.hud-scroll-box'); // keep the cursor's row in view, scrolling only the grid
      if (grid) {
        const top = cell.offsetTop - OWNED.room,
          bottom = cell.offsetTop + OWNED.face + OWNED.room;
        if (top < grid.scrollTop) grid.scrollTop = top;
        else if (bottom > grid.scrollTop + grid.clientHeight) grid.scrollTop = bottom - grid.clientHeight;
      }
      showTooltip(cell, ownedTooltip(view.owned[at.index]), { side: 'rightOf', beside: '.catch-window' });
    }, [view, at, busy.value]);
    if (!view) return null;
    const fl = flight.value,
      flightHalf = (BALL_SPRITES.size * BALL_BELT.ballScale) / 2; // the thrown ball at the belt's size (#128)
    return html`<div class="pm-stage catch-stage" ref=${rootRef}>
      <div
        class="catch-window panel-clean"
        style=${{
          left: px((STAGE.width - WINDOW.width) / 2),
          top: px((STAGE.height - WINDOW.height) / 2),
          width: px(WINDOW.width),
          height: px(WINDOW.height),
        }}
      >
        <${MonPanel} view=${view} />
        ${[0, 1, 2].map((belt) => html`<${Belt} key=${belt} belt=${belt} ring=${ring} />`)}
        <${OwnedGrid} view=${view} ring=${ring} />
        <${Buttons} />
        ${
          fl
            ? html`<${BallSprite}
                ball=${fl.ball}
                frame=${fl.frame}
                scale=${BALL_BELT.ballScale}
                className=${'catch-flight' + (fl.caught ? ' is-caught' : '')}
                style=${{ left: px(fl.x - flightHalf), top: px(fl.y - flightHalf) }}
              />`
            : null
        }
      </div>
    </div>`;
  }

  const host = document.createElement('div');
  host.className = 'catch-host';
  host.setAttribute('translate', 'no'); // English-only text
  screen.appendChild(host);
  preact.render(html`<${Screen} />`, host);
  const fitStage = fitToStage(host);

  // ---------- open and close ----------
  function open(session, closeCallback) {
    onClose = closeCallback;
    throwToken++;
    const save = G.DB.save,
      ivEv = (copy) => copy.iv.reduce((sum, v) => sum + v, 0) + copy.evTotal;
    const owned = save ? G.Copies.all(save).filter((copy) => copy.speciesID === session.dex) : [];
    owned.sort((a, b) => ivEv(b) - ivEv(a));
    const mon = G.DEX_BY[session.dex];
    busy.value = false;
    flight.value = null;
    face.value = 'shown';
    shownMisses.value = session.misses;
    beltCount.value++;
    shown.value = { session, owned, types: (mon && mon.types) || ['normal'] };
    const best = Math.max(0, G.Catch.bestSlot()), // the best ball starts selected (spec, R6)
      first = { belt: Math.floor(best / BELT.slots), slot: best % BELT.slots };
    selected.value = first;
    focusSlot(first.belt, first.slot);
    G.UI.show('scr-catch');
    fitStage();
  }

  function close() {
    const callback = onClose;
    onClose = null;
    throwToken++;
    hideTooltip();
    shown.value = null;
    flight.value = null;
    busy.value = false;
    G.UI.hide('scr-catch');
    if (callback) callback();
  }

  /** Each frame while the screen is open (G.Game routes the keys here). */
  function keys() {
    if (!shown.value || busy.value) return; // a ball in the air, or the Let it go dialog (it takes its own Enter and Esc)
    if (G.Input.tap('escape')) return letGo();
    if (G.Input.tap('enter') || G.Input.tap('numpadenter')) return press();
    const dx = (G.Input.action('move_right') ? 1 : 0) - (G.Input.action('move_left') ? 1 : 0),
      dy = (G.Input.action('move_down') ? 1 : 0) - (G.Input.action('move_up') ? 1 : 0);
    if (dx || dy) {
      const before = focus.value;
      move(dx, dy);
      if (focus.value !== before) G.Audio.sfx('hover');
      return;
    }
    const belt = numberedBelt.value;
    for (let n = 1; n <= BELT.slots; n++)
      if ((G.Input.tap('digit' + n) || G.Input.tap('numpad' + n)) && !isLocked(belt) && slotsOf(belt)[n - 1]) {
        focusSlot(belt, n - 1);
        return throwNow(belt, n - 1);
      }
  }

  return {
    ready: true,
    open,
    keys,
    throwNow,
    get isOpen() {
      return !!shown.value;
    },
    get busy() {
      return !!shown.value && busy.value;
    },
  };
})();
