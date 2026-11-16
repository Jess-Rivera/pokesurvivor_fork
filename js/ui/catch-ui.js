/* ============ catch-ui.js: the catch screen (G.CatchUI, #136; redesign 136b) ============
 * Opened by G.Game.openCatch when you touch a won rescue's Stage 1 (js/systems/rescue.js), with the run paused. Every rule lives
 * in G.Catch (js/systems/catch.js); this file only draws and routes input. Mockup: assets/excalidraw/Catch Pokemon Popup.svg;
 * plan: docs/ASCII Concept Maps/136b - Catch Screen Redesign Plan.md. Built from the HUD kit (G.HudOverlay.kit) on the pause
 * menu's 1920 x 1080 stage, scaled to fit, inside the #scr-catch screen.
 *   left     the Pokemon: the portrait in a ring that fills one step per miss (flee), "{Nature} {Name}", the catch band (a
 *            range that holds the true chance, G.Catch.band) and the ball it is for. Rimmed in its type colours.
 *   middle   three belts of six slots; belt 1 is the save's belt, belts 2 and 3 are locked (a meta upgrade, later).
 *   right    Pokemon owned: every copy of this species in the Pokebox (best IV + EV total first), its tooltip on focus;
 *            then Throw and Let It Go.
 *   input    one selection cursor over every control. Arrows (the move keys) move it, hover moves it too. Enter on a ball
 *            selects it, Enter on the selected ball throws it; Enter on Throw throws the selected ball. 1 to 6 throw that
 *            slot of the numbered belt (the belt the cursor was last in; only it shows numbers). Click selects, double
 *            click throws. Esc or Let It Go asks once (G.UI.ask). Nothing is taken while a ball is in the air.
 */
G.CatchUI = (() => {
  const overlay = G.HudOverlay,
    screen = document.getElementById('scr-catch'); // absent on pages that load the game's scripts without its screens
  if (!overlay || !overlay.ready || !screen) return { ready: false };
  const { html, signal, hooks, preact, PALETTE, FAINTED_RIM, typeColours, Box, ScrollBox, Cursor, SlotButton } =
    overlay.kit;
  const { REST_RIM, fitToStage, TooltipLayer, showTooltip, hideTooltip, portraitSource, portraitFallback } =
    overlay.kit;

  // ---------- sizes and places (stage pixels; the window is centred on the 1920 x 1080 stage) ----------
  const WINDOW = { width: 980, height: 500 },
    PAD = 20,
    MON = { left: PAD, top: PAD, width: 340, height: 460 },
    RING = { size: 192, top: 24, band: 12 }, // a 40 px portrait drawn 4x inside a 4 px outline inside the ring band
    BELT = { firstLeft: 380, step: 96, width: 84, height: 460, count: 3, slots: 6 },
    SLOT = { size: 64, gap: 8, left: 10, top: 18 }, // a ball frame (32 px) drawn 2x fills a slot
    OWNED = { left: 676, top: PAD, width: 284, height: 280, columns: 4, cell: 56, gap: 4, inset: 16 },
    BUTTON_ART_WIDTH = 94, // 282 x 66 px: the kit's menu button
    BUTTON_TOP = [320, 404];
  // Poke Balls pocket (UI-PALETTES "Bag", tools/ui-library.html) for the belts; Normal's type ramp for Pokemon owned.
  const POCKET_RIM = { light: '#DBB26E', base: '#C88820', dark: '#825815' },
    OWNED_RIM = typeColours('normal');
  // Let It Go: white text at 45% at rest; focused, the pause menu's End red with its dark as the body (mockup).
  const LET_GO_RIM = { light: '#ff8a90', base: '#e8202a', dark: '#7c1016' };
  // The flee ring's empty part: the kit's paper white (the mockup's white ring). Every type's Dark reads on it; on the EXP
  // ring's grey, Normal's and Rock's Dark nearly vanished.
  const RING_EMPTY = PALETTE.paper;

  // ---------- the throw (ms) ----------
  const FLY_MS = 450, // belt to portrait, spinning
    FLY_ARC = 140, // how high the arc rises above the straight line
    SPIN_FRAME_MS = 40,
    ABSORB_MS = 220, // the ball opens and the portrait shrinks into it
    WOBBLE_FRAME_MS = 85, // twelve wobble frames: three shakes, about a second
    RESULT_MS = 900, // the result stays this long before a caught or fled catch closes
    BREAK_OUT_MS = 260; // a miss: the ball stays open while the portrait comes back

  const BALL_SPRITES = G.BALL_SPRITES;
  const STAT_ORDER = [
    ['HP', 0],
    ['Atk', 1],
    ['Def', 2],
    ['Spe', 5],
    ['SpA', 3],
    ['SpD', 4],
  ]; // the tooltip's two rows (mockup); the save's order is HP, Atk, Def, SpA, SpD, Spe
  const GENDER_MARK = { male: '♂', female: '♀' };

  // ---------- state ----------
  const shown = signal(null); // { session, owned, types } while open
  const selectedSlot = signal(0); // the slot of the current ball on belt 1
  const focus = signal({ area: 'slot', belt: 0, slot: 0 }); // { area: 'slot', belt, slot } | 'owned', index | 'button', index
  const numberedBelt = signal(0); // the belt whose slots show 1 to 6 (the one the cursor was last in)
  const note = signal('');
  const busy = signal(false);
  const flight = signal(null); // the ball in the air: { ball, frame, x, y }
  const face = signal('shown'); // the portrait: 'shown', 'absorbed' (inside the ball) or 'fled'
  const beltCount = signal(0); // read on every belt change, so the slots redraw
  let thrownSlots = new Set(); // belt 1 slots emptied by a throw this catch: a thrown ball leaves its own slot empty
  let onClose = null;
  let throwToken = 0; // a throw's timers stop when the screen closes under them

  // ---------- the belts ----------
  const isLocked = (belt) => belt > 0; // belts 2 and 3: a meta upgrade, later (Jess, 2026-11-16)
  /** A belt's six slots: belt 1's balls, best tier first, in the slots no throw has emptied this catch; null is empty. */
  function slotsOf(belt) {
    beltCount.value; // redraw when the belt changes
    const slots = Array(BELT.slots).fill(null);
    if (isLocked(belt)) return slots;
    const balls = [];
    for (const ball of [...G.Catch.BALLS].reverse()) for (let i = 0; i < G.Catch.count(ball.id); i++) balls.push(ball);
    for (let slot = 0; slot < BELT.slots && balls.length; slot++)
      if (!thrownSlots.has(slot)) slots[slot] = balls.shift();
    return slots;
  }
  const stocked = (belt) =>
    slotsOf(belt)
      .map((ball, slot) => (ball ? slot : -1))
      .filter((slot) => slot >= 0);
  const nearestStocked = (belt, slot) => {
    const list = stocked(belt);
    return list.length ? list.reduce((best, s) => (Math.abs(s - slot) < Math.abs(best - slot) ? s : best)) : -1;
  };
  const selectedBall = () => slotsOf(0)[selectedSlot.value] || G.Catch.BALLS[0];
  const slotCentre = (belt, slot) => ({
    x: BELT.firstLeft + belt * BELT.step + SLOT.left + SLOT.size / 2,
    y: PAD + SLOT.top + slot * (SLOT.size + SLOT.gap) + SLOT.size / 2,
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
  // The owned grid shows four rows and scrolls; the cursor enters it at the row level with where it came from.
  const scrolledRows = () => {
    const grid = host.querySelector('.catch-owned .hud-scroll-box');
    return grid ? Math.round(grid.scrollTop / (OWNED.cell + OWNED.gap)) : 0;
  };
  /** An owned cell's row as seen in the window, 0 to 3. */
  const visibleRow = (index) =>
    Math.max(0, Math.min(OWNED.columns - 1, Math.floor(index / OWNED.columns) - scrolledRows()));
  /** The first cell of a row seen in the window (0 to 3), held to the last row there is. */
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
        focusOwnedOrThrow(ownedRowStart(Math.floor((at.slot * OWNED.columns) / BELT.slots)));
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
        else focusBelt(Math.round((visibleRow(at.index) * BELT.slots) / OWNED.columns));
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
      else if (dy < 0 && ownedCount()) focus.value = { area: 'owned', index: ownedRowStart(OWNED.columns - 1) };
    }
  }

  // ---------- actions ----------
  function select(slot) {
    if (busy.value || !slotsOf(0)[slot]) return;
    if (slot !== selectedSlot.value) G.Audio.sfx('select');
    selectedSlot.value = slot;
  }

  /** Throw the ball in a slot of belt 1 (the selected one when none is given). */
  async function throwNow(slot = selectedSlot.value) {
    const view = shown.value;
    const ball = slotsOf(0)[slot];
    if (!view || busy.value || !ball) return;
    const outcome = G.Catch.throwBall(ball.id);
    if (outcome === 'none') return;
    const token = ++throwToken,
      name = view.session.name,
      alive = () => token === throwToken && shown.value === view;
    selectedSlot.value = slot;
    thrownSlots.add(slot);
    busy.value = true;
    note.value = '';
    hideTooltip();
    beltCount.value++;
    G.Audio.sfx('confirm');
    // out of the slot, in an arc onto the portrait, spinning
    const from = slotCentre(0, slot);
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
    const wobble = BALL_SPRITES.animations.wobble;
    await play(wobble.length * WOBBLE_FRAME_MS, (t, elapsed) => {
      flight.value = {
        ...flight.value,
        frame: wobble[Math.min(wobble.length - 1, Math.floor(elapsed / WOBBLE_FRAME_MS))],
      };
    });
    if (!alive()) return;
    if (outcome === 'caught') {
      flight.value = { ...flight.value, frame: BALL_SPRITES.animations.front[0], caught: true };
      note.value = 'Gotcha! ' + name + ' was caught! It joins your Pokebox when the run ends.';
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
    if (outcome === 'fled') {
      face.value = 'fled';
      note.value = G.Catch.total() > 0 ? name + ' broke free and ran off!' : 'Out of Poke Balls! ' + name + ' ran off.';
      G.Audio.sfx('back');
      await wait(RESULT_MS);
      if (!alive()) return;
      G.Spawner.say(name + ' ran off.', 3, true);
      return close();
    }
    note.value = 'Oh no! It broke free.';
    G.Audio.sfx('hit');
    beltCount.value++;
    if (!slotsOf(0)[selectedSlot.value]) selectedSlot.value = Math.max(0, nearestStocked(0, selectedSlot.value));
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
      if (at.slot === selectedSlot.value) throwNow(at.slot);
      else select(at.slot);
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
        const elapsed = Math.min(ms, now - start);
        step(elapsed / ms, elapsed);
        if (elapsed >= ms) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  // ---------- drawing ----------
  const px = (value) => value + 'px';
  /** One ball frame from its strip, drawn at `scale` (whole numbers keep the pixel art crisp). */
  function BallSprite({ ball, frame, scale = 2, className, style }) {
    const size = BALL_SPRITES.size * scale;
    return html`<div
      class=${'catch-ball' + (className ? ' ' + className : '')}
      style=${{
        ...style,
        width: px(size),
        height: px(size),
        backgroundImage: 'url(' + BALL_SPRITES.path(ball) + ')',
        backgroundSize: px(size * BALL_SPRITES.frames) + ' ' + px(size),
        backgroundPosition: px(-frame * size) + ' 0',
      }}
    ></div>`;
  }

  function MonPanel({ view }) {
    const { session, types } = view;
    const rim = typeColours(types[0]),
      rimRight = types[1] ? typeColours(types[1]) : null;
    const ball = selectedBall();
    const band = G.Catch.band(G.Catch.odds(session.dex, ball.id, session.timeFraction), session.bandShift);
    const fled = (session.misses / session.allowed) * 360;
    return html`<${Box} left=${MON.left} top=${MON.top} width=${MON.width} height=${MON.height} rim=${rim} rimRight=${rimRight}
      className="catch-mon">
      <div
        class="catch-ring"
        style=${{
          left: px((MON.width - RING.size) / 2),
          top: px(RING.top),
          width: px(RING.size),
          height: px(RING.size),
          '--flee': fled + 'deg', // the share of misses allowed so far, as the EXP ring's --exp
          '--flee-fill': rim.dark,
          '--flee-empty': RING_EMPTY,
        }}
      >
        <div class=${'catch-face is-' + face.value} style=${{ inset: px(RING.band) }}>
          <img src=${portraitSource(session.dex, false)} data-dex=${session.dex} alt="" onError=${portraitFallback} />
        </div>
      </div>
      <div class="hud-text hud-text-30 catch-name">${session.natureName + ' ' + session.name}</div>
      <div class="catch-band">${band.low + '-' + band.high + '%'}</div>
      <div class="hud-text catch-ball-name">${'with a ' + ball.name}</div>
      <div class="hud-text catch-note">${note.value}</div>
    </${Box}>`;
  }

  function Belt({ belt }) {
    const locked = isLocked(belt),
      slots = slotsOf(belt),
      numbered = numberedBelt.value === belt && !locked,
      at = focus.value;
    return html`<${Box}
      left=${BELT.firstLeft + belt * BELT.step}
      top=${PAD}
      width=${BELT.width}
      height=${BELT.height}
      rim=${locked ? FAINTED_RIM : POCKET_RIM}
      className=${'catch-belt' + (locked ? ' is-locked' : '')}
    >
      ${slots.map((ball, slot) => {
        const cursorHere = at.area === 'slot' && at.belt === belt && at.slot === slot;
        return html`<div
          key=${slot}
          class=${'catch-slot' + (ball ? ' is-full' : '') + (!locked && slot === selectedSlot.value ? ' is-selected' : '')}
          data-belt=${belt}
          data-slot=${slot}
          style=${{ left: px(SLOT.left), top: px(SLOT.top + slot * (SLOT.size + SLOT.gap)) }}
          onMouseEnter=${() => !busy.value && ball && focusSlot(belt, slot)}
          onClick=${() => !locked && select(slot)}
          onDblClick=${() => !locked && throwNow(slot)}
        >
          ${ball ? html`<${BallSprite} ball=${ball.id} frame=${BALL_SPRITES.animations.front[0]} />` : null}
          ${numbered ? html`<span class="hud-text catch-slot-key">${slot + 1}</span>` : null}
          ${cursorHere ? html`<${Cursor} />` : null}
        </div>`;
      })}
    </${Box}>`;
  }

  function OwnedGrid({ view }) {
    const at = focus.value,
      width = OWNED.columns * OWNED.cell + (OWNED.columns - 1) * OWNED.gap;
    const cells = view.owned.map((copy, index) => {
      const column = index % OWNED.columns,
        row = Math.floor(index / OWNED.columns);
      return html`<div
        key=${copy.pokemonUUID}
        class="catch-owned-cell"
        data-owned-index=${index}
        style=${{ left: px(column * (OWNED.cell + OWNED.gap)), top: px(row * (OWNED.cell + OWNED.gap)) }}
        onMouseEnter=${() => !busy.value && (focus.value = { area: 'owned', index })}
      >
        <div class="catch-owned-face">
          <img
            src=${portraitSource(copy.speciesID, copy.isShiny)}
            data-dex=${copy.speciesID}
            alt=""
            onError=${portraitFallback}
          />
        </div>
        ${at.area === 'owned' && at.index === index ? html`<${Cursor} />` : null}
      </div>`;
    });
    const rows = Math.ceil(view.owned.length / OWNED.columns);
    return html`<${Box} left=${OWNED.left} top=${OWNED.top} width=${OWNED.width} height=${OWNED.height} rim=${OWNED_RIM}
      className="catch-owned">
      <${ScrollBox}
        box=${{ left: OWNED.inset, top: OWNED.inset + 6, width, height: OWNED.columns * (OWNED.cell + OWNED.gap) - OWNED.gap }}
        trackRight=${OWNED.inset}
        colours=${{ track: OWNED_RIM.dark, thumb: OWNED_RIM.base, thumbRim: OWNED_RIM.light }}
        resetOn=${[view]}
      >
        <div class="catch-owned-grid" style=${{ height: px(rows * (OWNED.cell + OWNED.gap) - OWNED.gap) }}>${cells}</div>
      </${ScrollBox}>
      ${view.owned.length ? null : html`<div class="hud-text catch-owned-none">None owned yet</div>`}
    </${Box}>`;
  }

  function Buttons() {
    const at = focus.value;
    const throwFocused = at.area === 'button' && at.index === 0,
      letGoFocused = at.area === 'button' && at.index === 1;
    const place = (index) => ({ left: px(OWNED.left + 1), top: px(BUTTON_TOP[index]) });
    return html`<div class="catch-button" style=${place(0)}>
        <${SlotButton}
          id="throw"
          label="Throw"
          artWidth=${BUTTON_ART_WIDTH}
          focused=${throwFocused}
          onEnter=${() => !busy.value && (focus.value = { area: 'button', index: 0 })}
          onPress=${() => throwNow()}
        />
        ${throwFocused ? html`<${Cursor} />` : null}
      </div>
      <div class=${'catch-button catch-let-go' + (letGoFocused ? ' is-focused' : '')} style=${place(1)}>
        <${SlotButton}
          id="let-go"
          label="Let It Go"
          artWidth=${BUTTON_ART_WIDTH}
          rim=${REST_RIM}
          focusRim=${LET_GO_RIM}
          focusBody=${LET_GO_RIM.dark}
          focused=${letGoFocused}
          onEnter=${() => !busy.value && (focus.value = { area: 'button', index: 1 })}
          onPress=${letGo}
        />
        ${letGoFocused ? html`<${Cursor} />` : null}
      </div>`;
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
    // the owned tooltip follows the cursor (keys and hover alike), and the grid scrolls to keep the cursor in view
    hooks.useLayoutEffect(() => {
      if (!view || at.area !== 'owned' || busy.value) return hideTooltip();
      const cell = rootRef.current && rootRef.current.querySelector('[data-owned-index="' + at.index + '"]');
      if (!cell) return hideTooltip();
      const grid = cell.closest('.hud-scroll-box'); // keep the cursor's row in view, scrolling only the grid
      if (grid) {
        const top = cell.offsetTop,
          bottom = top + OWNED.cell;
        if (top < grid.scrollTop) grid.scrollTop = top;
        else if (bottom > grid.scrollTop + grid.clientHeight) grid.scrollTop = bottom - grid.clientHeight;
      }
      showTooltip(cell, ownedTooltip(view.owned[at.index]), { side: 'rightOf', beside: '.catch-window' });
    }, [view, at, busy.value]);
    if (!view) return null;
    const fl = flight.value;
    return html`<div class="pm-stage catch-stage" ref=${rootRef}>
      <div
        class="catch-window"
        style=${{
          left: px((1920 - WINDOW.width) / 2),
          top: px((1080 - WINDOW.height) / 2),
          width: px(WINDOW.width),
          height: px(WINDOW.height),
        }}
      >
        <${MonPanel} view=${view} />
        ${[0, 1, 2].map((belt) => html`<${Belt} key=${belt} belt=${belt} />`)}
        <${OwnedGrid} view=${view} />
        <${Buttons} />
        ${
          fl
            ? html`<${BallSprite}
                ball=${fl.ball}
                frame=${fl.frame}
                className=${'catch-flight' + (fl.caught ? ' is-caught' : '')}
                style=${{ left: px(fl.x - BALL_SPRITES.size), top: px(fl.y - BALL_SPRITES.size) }}
              />`
            : null
        }
      </div>
      <${TooltipLayer} />
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
    note.value = '';
    busy.value = false;
    flight.value = null;
    face.value = 'shown';
    thrownSlots = new Set();
    beltCount.value++;
    shown.value = { session, owned, types: (mon && mon.types) || ['normal'] };
    const first = Math.max(0, nearestStocked(0, 0));
    selectedSlot.value = first;
    focusSlot(0, first);
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
        return throwNow(n - 1);
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
