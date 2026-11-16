# 136b, Catch screen redesign plan (follow-up to #136)

Source: `assets/excalidraw/Catch Pokemon Popup.svg` (Jess, 16 Nov) plus two playtest notes: double click does not throw,
and the arrow keys should move a visible selection cursor. Status: **built 2026-11-16, waiting on Jess's feel test**
(#136, Needs Playtest). Q1 to Q8 answered by Jess on 2026-11-16. "Changes made during the build" below lists what moved
from the plan.

## Slice opening (agree before the build)

| Item | Proposal |
|---|---|
| Goal | The catch screen matches the mockup, double click throws, and the arrow keys plus the B2 cursor drive every control. |
| Done | Jess opens a catch with `G.Debug.catch()`, plays it by mouse only and by keyboard only, and it looks like the mockup. |
| End-goal test | `tools/smoke-ui.js` catch flow grows (no new harness): a real double click on a belt ball throws it; the arrow keys move the cursor across belt, owned grid and buttons, and the cursor sits on what Enter acts on; Enter on Throw throws the current ball; Esc still asks before letting go; the shown band always contains the true chance and is 30 points wide; the flee ring's filled share equals misses over misses allowed. Relations only, no copied numbers. |

## Why double click fails today

A single click selects the ball, and selecting redraws the whole belt strip. The second click of the pair lands on a
brand-new button, so the browser never pairs the two clicks into a double click. Fix: selecting moves the highlight on
the existing cells instead of rebuilding them, and the double click is caught once on the belt container (it survives
any redraw).

## Layout (the mockup, left to right; in the right column the owned grid is on top, the buttons under it)

```mermaid
flowchart LR
  P["Pokemon panel<br/>portrait circle + flee ring<br/>{Nature} {Name}, wraps<br/>NN to NN% band<br/>with {current ball}<br/>border = type colours"]
  B1["Belt 1<br/>6 slots<br/>free"]
  B2["Belt 2<br/>6 slots<br/>locked, greyed"]
  B3["Belt 3<br/>6 slots<br/>locked, greyed"]
  subgraph R["right column"]
    direction TB
    O["1. Pokemon owned<br/>4 x 4 portraits, same species<br/>scrolls past 16<br/>hover: Name, Gender, Box + 6 stats"]
    T["2. Throw"]
    L["3. Let It Go"]
    O ~~~ T ~~~ L
  end
  P --- B1 --- B2 --- B3 --- R
```

Every colour below is an existing token; nothing new is invented.

| Part | Look (from the mockup notes) | Source token |
|---|---|---|
| Containers | Same border shape as the IV, Moves, Cards Taken and Run Stats boxes in the pause menu's Pokemon detail | `css/pause-menu.css` detail boxes, reused |
| Pokemon panel border | Left border primary type, right border secondary type, top and bottom a gradient between them; one type = one colour | `TYPE_COLOR` (`js/core/util.js`, HUD-STYLE type table) |
| Belts | #DBB26E, #C88820, #825815 | UI-PALETTES Bag, "Poke Balls pocket" (also on `tools/ui-library.html`) |
| Pokemon owned | #C1C2C1, #9FA19F, #676967 | Normal type Light / Base / Dark (HUD-STYLE, `TYPE_COLOR.normal`) |
| Flee ring | Primary type's Dark shade | `TYPE_COLOR_DARK` |
| Ball icons | Front face (top row) of `assets/icons/pokeball/in-run-pokeballs.png` | cut by a tool, see "Ball sprites" |
| Buttons | Team / inventory / settings button shape, no X or U icons, #ffffff rim, #181818 body | existing `.bw-btn` family |
| Throw unfocused / focused | White text / #38d030 rim | mockup |
| Let It Go unfocused / focused | White at 45% / white text, #ff8a90, #e8202a, #7c1016 rim, #7c1016 body | mockup |
| Background | Same as the Run Info panel | `css/pause-menu.css` Run Info |

The ui-library page (#147) lists the catch screen's pieces under their jobs once built.

## Rules from Jess's answers

| Topic | Rule [Approved 2026-11-16 unless marked] |
|---|---|
| Catch band (Q1) | The panel shows a range 30 points wide (bandAccuracy 15 = plus or minus 15) that always contains the true chance, shifted at random so the true chance is anywhere inside it. Example: 47% can show 32 to 62, 25 to 55 or 40 to 70. bandAccuracy starts at 15; its upgrade is #97. |
| Belts (Q2) | Three belt columns drawn now; belt 1 holds today's 6 balls; belts 2 and 3 locked and greyed. Unlocking is a meta upgrade (#97 / #137). |
| Flee (Q3) | No pips. A ring around the portrait circle, like the exp ring around the run screen portrait, fills 1/n per miss (n = misses allowed). Colour: primary type Dark. |
| Owned grid (Q4) | 4 x 4 visible, a scroll bar past 16, sorted by highest IV + EV total first. |
| Old elements | Rarity star, belt count and time bonus line go. The result ("Gotcha!", "It broke free") shows inside the Pokemon panel. [Proposed] |
| Ball sheet (Q5) | Stays at `assets/icons/pokeball/in-run-pokeballs.png`, committed with this slice; the deleted BW Poke Balls sheet has no code references (checked). |

## Ball sprites (Q5, my call)

A small tool under `tools/` cuts the sheet once: the teal background keyed out, one strip per ball (Poke, Great, Ultra,
Master, so #137 needs nothing more), and a JSON file beside it naming the frame rows (front face, spin, open, wobble).
The catch screen reads the JSON, never pixel offsets. Generated output is committed, like `js/data/stage-one.js`.

## Keyboard and cursor

One focus index covers every control. The B2 selection cursor (the four yellow corner brackets from `js/ui/hud-kit.js`,
already on the HUD move slots, roster and pause menu) sits on the focused control. Mouse hover moves the same focus, so
mouse and keys never disagree.

```mermaid
flowchart LR
  subgraph Belts["Belt grid: Up/Down within a belt, Left/Right across belts"]
    b1["Belt 1 slots"] <--> b2["Belt 2 slots"] <--> b3["Belt 3 slots"]
  end
  b3 <-->|Right / Left| own["Owned grid 4x4<br/>focus shows its tooltip<br/>Up/Down scrolls past row 4"]
  own <-->|Down from bottom row / Up| thr["Throw"]
  thr <-->|Down / Up| let["Let It Go"]
```

| Key | Does |
|---|---|
| Arrows (and WASD, the same move actions) | Move the cursor. Empty and locked slots are skipped. |
| Enter on a ball | Selects it (the band updates); Enter again throws it |
| Enter on Throw | Throws the current ball |
| Enter on Let It Go, or Esc | The existing "Let it go?" ask |
| 1 to 3 | Pick a ball tier, as today (Great and Ultra arrive with #137) |
| Mouse | Click selects, double click throws, hover moves the cursor |

## Throw animation (mockup note)

```mermaid
sequenceDiagram
  participant Belt as Belt slot
  participant Ball
  participant Face as Portrait
  Belt->>Ball: pops up and out of its slot
  Ball->>Face: flies in an arc onto the portrait (spin frames)
  Face->>Face: portrait shrinks into the ball
  Ball->>Ball: wobble side to side, three times (wobble frames)
  alt caught
    Ball->>Ball: click, "Gotcha!" in the panel
  else miss
    Ball->>Face: opens, portrait returns, flee ring fills one step
  end
```

Timing stays on today's clock (about 1 s of wobble, then the result), so the rules in `G.Catch` do not change.

## Files touched

| File | Change |
|---|---|
| `js/ui/catch-ui.js` | Rebuilt layout, one focus index, arrow keys, the cursor, the double click fix, owned grid with tooltips and scroll, flee ring, throw animation |
| `css/bw-catch.css` | The mockup's containers, buttons, belt columns, owned grid, ring, all from the tokens above |
| `dev.html` catch markup | New panel structure |
| `js/systems/catch.js` | The band: one random shift rolled per catch, and the band read for the screen |
| new `tools/` sprite cutter + `assets/icons/pokeball/` strips and JSON | Ball frames |
| `tools/smoke-ui.js` | The end-goal checks above, in the existing catch flow |
| `tools/ui-library.html` | The catch screen pieces under their jobs |

Risks: the owned grid reads the Pokebox and sorts it each open (small, the box is local); the type-gradient border needs
the species' types (already in the dex data). No save change.

## Changes made during the build

| Change | Why |
|---|---|
| The frame map is `js/data/ball-sprites.js` (generated), not JSON | A page opened from disk (file://) cannot fetch a JSON file. Tool: `tools/make_ball_sprites.py` (Python, Pillow; not in check.js since the work machine may lack Python). All 17 balls cut. |
| Flee ring empty part is `#e7e7e7` (the kit's paper), not the EXP ring grey | Normal's and Rock's Dark nearly matched the grey. Every type's Dark reads on the paper white, and the mockup draws a white ring. |
| The owned tooltip opens right of the window | The mockup places it there; "above" covered the grid. The kit's tooltip gained a `rightOf` side. |
| Number keys 1 to 6 throw that slot of the numbered belt; only the cursor's belt shows numbers | Jess, 2026-11-16 (replaces "1 to 3 pick a tier"). On the owned grid or buttons the numbers stay on the last belt. |
| A thrown ball leaves its own slot empty for the rest of that catch | The belt is a count; without this the last slot emptied instead. |
| `Box` moved from the pause menu's detail panel into the HUD kit (with a second rim for dual types) | Two screens use it now. The pause menu draws the same. |

## Answered (2026-11-16)

| # | Question | Answer |
|---|---|---|
| Q6 (agreed) | The band near the ends: a true chance of 8% or 88% (the ceiling is 90%) would push a 30-wide band under 0 or over 100. | Keep it 30 wide and slide it inside 0 to 100, so 8% might read 0 to 30. |
| Q7 (agreed) | One random shift per catch shared by every ball, or a fresh shift per ball tier? | One per catch, shared: switching balls then moves the band by the true difference, so a better ball always reads better. Fresh per ball could make a Great Ball look worse than a Poke Ball. |
| Q8 (agreed) | The owned tooltip's six numbers: IV + EV per stat (matches the sort), or IVs only? | IV + EV per stat, so the tooltip explains the sort order. |
