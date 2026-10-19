# FEATURES_GRAB: Controller support + Manual aim (from upstream pokesurvivor-main)

Source: the updated upstream copy at `Downloads\pokesurvivor-main` (paths below are relative to it unless
marked "fork"). Target: this fork. Both features are small and cleanly separated in upstream, so they
port well. Nothing here has been applied to the game code yet. Per CLAUDE.md, every game-code step below is
propose-and-approve (the markdown docs and `js/data/changelog.js` are the only free edits).

## 0. How they fit together

- **Controller** is one new self-contained file, `js/core/gamepad.js` (281 lines), exposed as `G.Pad`, plus
  small hooks in about 7 other places.
- **Manual aim** is a setting (`aimManual`) plus about 60 lines in `player.js`, a 2-line gate in
  `combat.js`, a crosshair draw in `game.js`, and a few mouse helpers in `input.js`. The right stick
  half of it depends on `G.Pad`, so do the controller first. Manual aim also works with mouse alone.
- Keep the two as separate slices. The controller slice is testable without aim, and aim is testable with
  the mouse before the controller exists.

## 1. Fork-specific differences that change how the upstream code must be ported

1. **Do NOT copy upstream `input.js` over the fork's.** The fork's `input.js` (146 lines) has the remappable
   ACTION layer (`action()`, `actionHeld()`, `rebind()`, `keybinds`); upstream's is 54 lines and has none of
   it. Merge the few new members in (section 2.3).
2. **Gameplay keys are actions in the fork, raw keys upstream.** Upstream `gamepad.js` presses `'keyq'`,
   `'keye'`, `'escape'` with `G.Input.virtual(...)`. In the fork, attack cycling is
   `action('cycle_prev'|'cycle_next')` and pause is `action('pause')`. If the player rebinds Q/E, a virtual
   `keyq` would silently stop working. So add `G.Input.virtualAction(name)` and have the pad press actions
   (section 2.3). Menu keys the fork still reads raw (`escape`, `space`, `keyr`, `enter`) keep working with
   plain `virtual()`.
3. **English-native strings.** Upstream strings are Spanish and rely on `lang-en.js`. Per CLAUDE.md, write
   every new user-facing string directly in English and add NO `lang-en.js` entries. Every Spanish string
   in the snippets below is already translated here.
4. **Name clash to be aware of:** the fork's existing `Settings` key `pad` is the *mobile button layout*
   (`pad: { bar, pause, stick }`). The controller setting keys are `gamepad` and `padRumble`, and the module
   is `G.Pad`. They are unrelated, just easy to confuse.
5. **Save safety:** `G.Settings` does `Object.assign(DEF, saved)`, so adding `gamepad`, `padRumble` and
   `aimManual` to `DEF` is backward compatible. Old saves simply get the defaults. No clearing needed.
6. **Local-first:** nothing in either feature touches Firebase, coop or net code. One coop guard is needed
   (`this.remote`, which already exists on the fork's Player).

## 2. CONTROLLER SUPPORT

### 2.1 What upstream does (so you know what you are buying)

Standard-mapping Gamepad API (Xbox, PlayStation, Switch, most USB/Bluetooth pads). `G.Pad.poll(dt)` runs
once per frame before key handling and translates the pad into things the game already understands:

| Context | Input | Result |
|---|---|---|
| In run | Left stick or D-pad | Movement vector (`G.Pad.vector()`), 0.25 deadzone, rescaled |
| In run | LB/RB (and LT/RT) | Previous / next attack |
| In run | Start or Back | Pause |
| In run | A | Skip the Arceus/judgment cinematic (`space`) |
| In run | Right stick | Aim vector (`G.Pad.aim()`), 0.35 threshold, used by manual aim |
| Menus, cards, pause | Stick or D-pad | Moves a gold focus box between clickable things (spatial nav) |
| Menus | A / B / Y | Click focused element / back-close (or Esc) / reroll cards (`keyr`) |
| Menus | Right stick | Scrolls lists |
| Menus | Left/right on a slider | Changes the slider value |
| Anywhere | Damage taken | Rumble (`G.Pad.rumble(k, ms)`), toggle in settings |

"UI mode" is decided by `G.Game.state !== 'playing' || a visible .scr screen`, and the menu navigation
works on anything with `button, a[href], input, select, textarea, label[for], [data-pad]` or a
`cursor:pointer` style, so it needs no per-screen wiring. (`[data-pad]` is supported by the file but
nothing in upstream actually sets it, so ignore it.)

### 2.2 New file to add: `js/core/gamepad.js`

Copy upstream `js/core/gamepad.js` as a starting point, then apply ONLY these edits:

1. Translate the header comment to English (cosmetic).
2. Connect toast: `'Mando conectado'` -> `'Controller connected'`.
3. Name getter: `name || 'Mando'` -> `name || 'Controller'`.
4. In the **in-run** branch of `poll()` (the `else` after `if (uiMode())`), replace the three raw-key
   presses with actions, so remapped keys keep working:
   ```js
   if (hit(BT.LB) || hit(BT.LT)) G.Input.virtualAction('cycle_prev');
   if (hit(BT.RB) || hit(BT.RT)) G.Input.virtualAction('cycle_next');
   if (hit(BT.START) || hit(BT.BACK)) G.Input.virtualAction('pause');
   if (hit(BT.A)) G.Input.virtual('space');   // unchanged, the fork reads tap('space') for the cinematic
   ```
5. In the **UI** branch, Start currently does `G.Input.virtual('escape')`. In the fork, change it to press
   both so it still works if the player rebound pause:
   ```js
   if (hit(BT.START)) { G.Input.virtual('escape'); G.Input.virtualAction('pause'); }
   ```
   and in `back()` the final fallback `G.Input.virtual('escape')` stays as is.
6. Leave `isBack`'s regex `/^(Cerrar|Volver|Close|Back)$/i` alone. It already covers both the inherited
   Spanish labels (which the runtime i18n turns into English in the DOM) and new English labels.
7. Optional fork-only idea (NOT in upstream, your call): the fork has team swap (`swap_prev`/`swap_next`).
   Upstream maps LT/RT to the same attack-cycle as LB/RB. You could instead send LT/RT to
   `virtualAction('swap_prev')` / `virtualAction('swap_next')` so the whole kit is reachable on a pad.

### 2.3 Edits to existing fork files

**`js/core/input.js`** (merge into the existing IIFE, do not replace the file)

```js
// near the other state:
const vActions = new Set();   // actions injected by the controller, cleared every frame
let movedAt = 0;              // last mouse move (used by manual aim)

// change the existing mousemove listener to also stamp the time:
addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; movedAt = performance.now(); });

// in axis(), right after the touch branch and before the keyboard actions:
const g = G.Pad && G.Pad.vector();
if (g && (g[0] || g[1])) return g;

// change action() so injected actions count:
action(name) {
  if (vActions.has(name)) return true;
  const ks = binds[name];
  return !!ks && ks.some(k => pressed.has(k));
},

// new members in the returned object:
/** A press that does not come from the keyboard (the controller): counts as that raw key this frame. */
virtual(c) { pressed.add(c); },
/** Same, but for a remappable action (cycle_prev, pause...). */
virtualAction(name) { vActions.add(name); },
/** When the mouse last moved (performance.now). */
get mouseMovedAt() { return movedAt; },
/** Where the mouse points in the world (the canvas fills the window). */
mouseWorld() { return { x: G.Camera.left() + mx / G.Camera.scale, y: G.Camera.top() + my / G.Camera.scale }; },

// and make endFrame clear both sets:
endFrame() { pressed.clear(); vActions.clear(); }
```

**`js/core/settings.js`**: add to `DEF`: `gamepad: true, padRumble: true, aimManual: false`, and document the
three keys in the header comment.

**`dev.html`**: add `<script defer src="js/core/gamepad.js"></script>` right after the `touch.js` line (fork
line 633). Order matters: `gamepad.js` needs `G.Settings` and `G.Input` at call time (not load time), and
`input.js` calls `G.Pad` lazily, so after `touch.js` is fine. Also add `'Pad'` to the `NEED` array in
`js/main.js` (line 5), because the game now calls `G.Pad` every frame. (Upstream did not add it; it is
safer to.)

**`js/game.js`**
- In `frame()`, call the poll just before `handleKeys()` (fork line 689): `G.Pad.poll(real);`
  Use `real`, not the scaled `dt`, so menu navigation repeat timing is not affected by speed settings.
- Controller needs `G.Game.state`, which the fork already exposes (`get state()`).

**`js/entities/player.js`** (rumble): in `hurt()`, right after `G.Camera.kick(0.28);` (fork line 317) add
`if (!this.remote) G.Pad.rumble(0.25 + Math.min(0.75, d / this.maxHp * 3), 140);`
(`d` is the final damage variable in the fork too.)

**`css/style.css`**: add (the fork already has `.keys`, but not these):
```css
.padkey { display: inline-block; padding: 0 7px; border: 2px solid rgba(244,248,255,.4); border-radius: 9px; font-size: 13px; color: var(--text, #f4f8ff) !important; text-shadow: none; }
/* What the controller has selected (gamepad.js). */
.pad-focus { outline: 3px solid #ffd23f !important; outline-offset: 3px; box-shadow: 0 0 0 6px rgba(255,210,63,.25) !important; }
```

**`js/ui/settings-ui.js`**: in the `ctl` tab (fork line 136), put this block first, before the mobile section.
It is the upstream block with English text (note the upstream tab also showed the PC key list; the fork
already replaced that with its own remap UI, so leave that alone):
```js
const pn = G.Pad.name;
box.innerHTML = section('With a controller', pn
    ? 'Controller connected: <b translate="no">' + esc(pn.replace(/\s*\(.*$/, '')) + '</b>'
    : 'Xbox, PlayStation, Switch and most USB or Bluetooth controllers. Connect it and press any button.')
  + toggle('gamepad', 'Use controller', 'Move, switch attacks and use the menus with a controller.')
  + toggle('padRumble', 'Vibration', 'The controller vibrates when you take damage (if the controller and browser allow it).')
  + `<div class="keys">
       <div><span class="padkey">Left stick</span> or <span class="padkey">D-pad</span></div><span>move · choose in menus</span>
       <div><span class="padkey">LB</span> / <span class="padkey">RB</span></div><span>previous / next attack</span>
       <div><span class="padkey">Start</span></div><span>pause</span>
       <div><span class="padkey">A</span></div><span>press (in menus) · skip the Arceus animation</span>
       <div><span class="padkey">B</span></div><span>back / close</span>
       <div><span class="padkey">Y</span></div><span>reroll cards on level-up</span>
       <div><span class="padkey">Right stick</span></div><span>scroll lists · aim (if Manual aim is on in Accessibility)</span>
     </div>`
  + section('On mobile or tablet') + /* ...existing fork mobile + PC content continues, joined with + ... */
```
The existing block starts `box.innerHTML = section('En móvil o tablet')`, so convert that into a `+` continuation
instead of a second assignment. If you ever add the optional LT/RT swap mapping, add a row for it here.

**`js/data/changelog.js`** (free-edit): add under `new` for today, in English only (CLAUDE.md), something like
"You can now play with a controller (Xbox, PlayStation, Switch and most USB or Bluetooth controllers): move,
switch attacks, pause, pick cards and use every menu, with vibration when you take damage. Set it up in
Settings > Controls." Verify the file still parses after editing.

### 2.4 Mobile settings-tabs CSS (tiny, optional)

Upstream also made the Settings tab row scroll sideways on phones (fork has `#set-tabs { flex-wrap: wrap; }`
but not the mobile rule). Only needed if you add the Accessibility tab and the row gets crowded. Upstream rule,
inside the existing mobile media query next to the `#scr-dex .gen-tabs` rules:
```css
#set-tabs { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
#set-tabs::-webkit-scrollbar { display: none; }
#set-tabs .gen-tab { flex: 0 0 auto; }
```

## 3. MANUAL AIM

### 3.1 Behavior in upstream

Setting `aimManual` (default off), in a new **Accessibility** tab. When on, attacks go toward:
- the right stick direction while it is pushed (> 0.35), else
- the mouse position, but only if the mouse moved *after* the last stick push (not on touch), else
- the normal auto-target. Letting go of the stick without touching the mouse returns to auto-aim.

Details that matter for feel:
- The chain target (`pl.target`) becomes the nearest enemy within a +/-25 degree cone along your aim (up to 520
  range), falling back to the normal auto-target if none.
- Free-aim move kinds fire even with no enemy: `melee, beam, projectile, boomerang, dash, cone`. `chain` and
  `meteor` still wait for a target (they need one to be meaningful).
- A crosshair is drawn at the mouse (and the canvas cursor becomes `crosshair`), or 90 world units in front of
  the player when aiming with the stick.
- Aim is skipped for coop remote players and during cinematics.

### 3.2 Edits to existing fork files

**`js/core/input.js`, `settings.js`**: already covered in 2.3 (`mouseMovedAt`, `mouseWorld`, `aimManual`).
Manual aim needs only those plus `G.Pad.aim()` / `G.Pad.aimAt` (the right-stick part of `gamepad.js`). If you
want mouse-only aim before the controller exists, stub `G.Pad = { aim: () => null, aimAt: 0 }`.

**`js/entities/player.js`**: replace the end of the targeting block (fork lines 472-474):
```js
this.target = tg;
if (tg) this.aim = Math.atan2(tg.y - this.y, tg.x - this.x);
else if (this.walking) this.aim = this.moveAngle;
```
with:
```js
// Manual aim (Settings > Accessibility): toward the mouse or the right stick.
// The target (for chain attacks) is the enemy along that direction; if none, the usual one.
const hand = this.handAim();
this.manualAim = hand != null;
if (hand != null) {
  this.aim = hand;
  this.target = this.enemyAlong(all, hand) || tg;
} else {
  this.target = tg;
  if (tg) this.aim = Math.atan2(tg.y - this.y, tg.x - this.x);
  else if (this.walking) this.aim = this.moveAngle;
}
```
and add these two methods to the Player class (verbatim from upstream, comments translated):
```js
/**
 * Manual-aim angle, or null when it should aim by itself. The last input used wins:
 * the right stick while pushed; otherwise the mouse if it moved after the stick was last used
 * (desktop only). Releasing the stick without touching the mouse = auto-aim.
 */
handAim() {
  if (this.remote || !G.Settings.get('aimManual')) return null;
  const st = G.Pad.aim();
  if (st) return Math.atan2(st[1], st[0]);
  if (G.Touch.active || !G.Input.mouseMovedAt || G.Input.mouseMovedAt < G.Pad.aimAt) return null;
  const w = G.Input.mouseWorld();
  const dx = w.x - this.x, dy = w.y - (this.y - G.LIFT * 0.5);
  return Math.hypot(dx, dy) < 4 ? null : Math.atan2(dy, dx);
}

/** The nearest enemy within +/-25 degrees of direction a (closer than 520). */
enemyAlong(all, a) {
  let best = null, bd = 520 * 520;
  const ca = Math.cos(a), sa = Math.sin(a), cosMax = Math.cos(0.44);
  for (const e of all) {
    if (e.dead) continue;
    const dx = e.x - this.x, dy = e.y - this.y, d2 = dx * dx + dy * dy;
    if (d2 >= bd || d2 < 1) continue;
    if ((dx * ca + dy * sa) / Math.sqrt(d2) < cosMax) continue;
    bd = d2; best = e;
  }
  return best;
}
```
Also initialise `this.manualAim = false;` in the constructor next to `this.aim` (fork line 79) so it is never
undefined. Upstream relied on it being set each tick; the init is just defensive.

**`js/systems/combat.js`**: the gate. Fork currently has (lines 74-75):
```js
const TARGETED = ['melee', 'beam', 'projectile', 'boomerang', 'chain', 'meteor', 'dash', 'cone'];
function needsTarget(m) { return TARGETED.includes(m.kind); }
```
Change to:
```js
// With manual aim these fire where you point even with nobody there (the player decides);
// chain and meteor still wait for a target.
const FREE_AIM = ['melee', 'beam', 'projectile', 'boomerang', 'dash', 'cone'];
function needsTarget(m, pl) { return TARGETED.includes(m.kind) && !(pl && pl.manualAim && FREE_AIM.includes(m.kind)); }
```
and update the single call site in `tickMove` (fork line 41) to `needsTarget(m, pl)`. Note the `reach(m)` check in
that same condition also goes away for free-aim kinds only because the whole `needsTarget(...) && ...` is false;
no other change is needed there.

**`js/game.js`**: add the crosshair function (verbatim, comments translated) next to `drawScene`, and call
`drawAimMark();` in `render()` right after `G.Touch.draw(ctx);` (fork line ~859):
```js
/*
 * Manual aim: a reticle where the mouse is (and a crosshair cursor), or in front of
 * your Pokemon when aiming with the right stick.
 */
function drawAimMark() {
  const on = state === 'playing' && pl && pl.manualAim && !G.Judgment.cinematic;
  const cur = on && !G.Pad.aim() ? 'crosshair' : '';
  if (cv.style.cursor !== cur) cv.style.cursor = cur;
  if (!on) return;
  let x, y;
  if (G.Pad.aim()) {
    const k = G.Camera.scale;
    x = (pl.x - G.Camera.left() + Math.cos(pl.aim) * 90) * k;
    y = (pl.y - G.LIFT * 0.5 - G.Camera.top() + Math.sin(pl.aim) * 90) * k;
  } else ({ x, y } = G.Input.mouse());
  ctx.save();
  ctx.lineCap = 'round';
  for (const [col, lw] of [['rgba(0,0,0,.65)', 4], ['#ffe9a8', 1.6]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.2832); ctx.stroke();
    ctx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(x + dx * 5, y + dy * 5); ctx.lineTo(x + dx * 14, y + dy * 14); }
    ctx.stroke();
  }
  ctx.restore();
}
```
Confirm `cv` (the canvas variable) is the right name in the fork's `game.js` scope before pasting.

**`dev.html` + `js/ui/settings-ui.js`**: add the tab button after Controls (`<button class="gen-tab" data-t="a11y">Accessibility</button>`,
fork line ~245) and a render branch (the tab handler is generic, so no other wiring):
```js
} else if (tab === 'a11y') {
  box.innerHTML = section('Aiming')
    + toggle('aimManual', 'Manual aim', 'Your attacks go toward the mouse (or wherever you push the controller\'s right stick) instead of the nearest enemy. If you release the stick and do not move the mouse, it goes back to aiming by itself. Chain and meteor attacks still look for enemies on their own.');
}
```
The Settings tab label is the only user-visible English there; the tab-button text in the HTML is plain
English, so no `lang-en.js` entry is required.

**changelog**: add an English `new` entry, e.g. "New Accessibility tab in Settings with 'Manual aim': your attacks
go toward the mouse or wherever you push the controller's right stick, instead of the nearest enemy. It is off
by default."

## 4. Things to check because the fork has diverged

- **Fork combat is not identical to upstream** (it has `Kinds`, `Mechanics`, `Stats`, status rework). The
  gate and `pl.aim` usage lined up in my read (every attack reads `pl.aim` and the same `TARGETED` list), but
  verify each `FREE_AIM` kind (`melee, beam, projectile, boomerang, dash, cone`) actually fires with
  `pl.target` possibly pointing at nothing useful. `chain` (`combat.js` ~256) and `meteor` read `pl.target`
  or `reach(m)`, which is why they stay target-gated.
- **Analog movement magnitude:** `G.Pad.vector()` returns values less than 1 for a half-tilted stick, and the
  fork's `player.js:429` takes `G.Input.axis()` directly. Check whether the player's speed uses the vector length
  (smooth analog) or normalizes it (then tilt only changes direction). Either is fine, just know which you get.
- **Pause when paused:** with the pause screen up, `Start` goes through the UI branch. Test that Start both
  pauses and unpauses, including after rebinding Pause to another key (that is why 2.2 step 5 presses both).
- **Level-up cards:** the fork picks cards with `action('attack_1..3')`. The pad picks them by focusing and
  pressing A (a click), which is independent of that. Y sends raw `keyr` (reroll), which the fork's `run-ui.js`
  reads with `tap('keyr')`, so it works.
- **Name collision test:** after porting, make sure the mobile button layout (`Settings.pad`) still loads, since
  it shares the word "pad".
- **Dev vs built:** debug on `dev.html`; `index.html` and `app.min.js` are generated by `tools/build.js` and
  pick up the new script tag only if it is in `dev.html`'s `<script>` list.

## 5. Suggested order (each step is testable on its own)

1. Settings keys + `input.js` additions + CSS (no behavior change yet).
2. `gamepad.js` + `dev.html` script tag + `NEED` + `frame()` poll. Test: pad moves the Pokemon, LB/RB cycle, Start pauses.
3. Menu navigation test on every screen (menu, starters, level cards, pause, settings, dex).
4. Rumble hook in `hurt()`; Controls tab block.
5. Manual aim with mouse only (`handAim`, combat gate, crosshair, Accessibility tab).
6. Right-stick aim (already in `gamepad.js`) and final pass.

## 6. Deliberately NOT grabbed

Everything else in the upstream update (collection search/filters/favorites, run summary in pause, defense
rework, cards lockout, Save button, etc.) is outside these two features and conflicts with the fork's own
direction. The only unrelated bits mentioned above are the optional mobile Settings-tab CSS (2.4) and the
changelog wording. The upstream `app.min.js`, `version.json`, `index.html`, `lang-en.js` and SEO pages are
generated or Spanish-dictionary files and were skipped on purpose.
