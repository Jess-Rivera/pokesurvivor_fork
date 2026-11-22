# F1: Split hud-overlay.js (Slice Opening and Plan)

Structural review F1 (decision 2026-11-14-structural-review-new-files-count), the first issue after the merge.
Branch: refactor/hud-kit-split off main. Behavior-neutral: nothing on screen changes.

**Built 2026-11-14 (approved: D1a, D2 drop).** Awaiting Jess's format, check.js, smokes, mutant and feel test.

| File | Lines |
|---|---|
| js/ui/hud-overlay.js | 1233 to 139 |
| js/ui/hud-kit.js (new) | 263 |
| js/ui/hud-kit-items.js (new) | 289 |
| js/ui/hud-kit-hp-bars.js (new) | 367 |
| js/ui/hud-kit-chips.js (new) | 280 |

Differences from the plan: the kit had 48 names, not 47 (hooks was missed), so 39 stay after D2. The dead TYPE_CHECKER
constant was removed, since D2 left it with no reader at all. A tenth unread kit name turned up, FOCUS_RIM (only a
comment in pause-menu.js names it); Jess ruled it dropped too, so 38 names stay. It is still used inside hud-kit.js.

## Opening (CLAUDE.md "Slice shape")

```mermaid
flowchart LR
  G["GOAL<br/>hud-overlay.js becomes a core plus four kit files,<br/>cut on the section seams it already marks,<br/>so a UI slice edits only the piece it changes"]
  D["DONE WHEN<br/>1. no file of the split over 1000 lines<br/>2. no reader file edited: every name it takes<br/>from the kit is still there<br/>3. check.js all passed, the smokes below pass<br/>4. your feel test finds no change"]
  T["TEST<br/>a new wiring check in smoke-hud-overlay:<br/>every name a reader takes from the kit exists,<br/>and no two kit files give the same name"]
  G --> D --> T
```

## Today and after

```mermaid
flowchart TB
  subgraph NOW["Today: js/ui/hud-overlay.js, 1233 lines"]
    ALL["palette, shapes, buttons, stage, cursor, portraits<br/>tooltip layer, scroll box, item squares and grid<br/>roster card, dark HP bar<br/>status chips, effect chips<br/>mount, per-frame read"]
  end
  subgraph AFTER["After: five files, same kit"]
    K["hud-kit.js, G.HudKit, about 280<br/>library check, palette, pixel shapes,<br/>move and menu buttons, stage fit, button row,<br/>cursor, portraits"]
    I["hud-kit-items.js, G.HudKitItems, about 300<br/>tooltip layer, scroll box,<br/>bag button, item square, item grid"]
    H["hud-kit-hp-bars.js, G.HudKitHpBars, about 375<br/>roster card, dark HP bar"]
    C["hud-kit-chips.js, G.HudKitChips, about 290<br/>status chips, effect chips"]
    O["hud-overlay.js, G.HudOverlay, about 120<br/>mount, panel list, per-frame read, dev switches;<br/>its kit is the four kit files merged"]
    K --> I
    K --> H
    K --> C
    K --> O
    I --> O
    H --> O
    C --> O
  end
  NOW --> AFTER
```

Measured on the file: the three later kit files read only from hud-kit.js, never from each other. Item squares
need the tooltip, so both sit in hud-kit-items.js. The roster card and the dark HP bar are the two HP displays.

## Load order

```mermaid
flowchart LR
  V["js/vendor<br/>Preact, htm, Signals"] --> S["status-fx.js"] --> K["hud-kit.js"] --> I["hud-kit-items.js"]
  I --> H["hud-kit-hp-bars.js"] --> C["hud-kit-chips.js"] --> O["hud-overlay.js"] --> P["the six HUD panels,<br/>pause screens, End Run, EV screen"]
```

| Item | Detail |
|---|---|
| dev.html | Four new script lines just before hud-overlay.js |
| NEED (js/main.js) | HudKit, HudKitItems, HudKitHpBars, HudKitChips, before HudOverlay |
| No libraries | hud-kit.js does the one library check. Each kit file returns a not-ready stub, and G.HudOverlay keeps its stub with no kit, so the canvas HUD draws its old pieces as today |
| Readers | Unchanged. All 13 take their names from G.HudOverlay.kit, which holds the same names |
| Core | Keeps its own reference to Signals' batch for the per-frame read (no new kit name) |
| Build | build.js picks the new scripts up from the dev.html block; rebuild before publishing |
| CSS | css/hud-overlay.css unchanged |

## Plan check (coding principles)

| | |
|---|---|
| Reuses | The kit object every reader already destructures; the file's own section headers as the cut lines |
| New | Four files and four G names. One file per seam the review named; nothing existing fits since the pieces are the file |
| Not built | No reader edits, no renamed piece, no new kit name, no CSS split, no change to the panel registry |
| Size | Largest new file about 375; hud-overlay.js 1233 to about 120 |
| Touched-code cleanups | Only decision D2 below |

## Tests

| File | Change | Why |
|---|---|---|
| tools/smoke-hud-overlay.js | NEW CHECK: reads each js/ui file's names taken from the kit, then in the page checks each is defined on G.HudOverlay.kit; also that no two of the four kit modules give the same name. Prints only on failure | A dropped name or a missing kit file would only show as one broken screen. This is a relation check, no pinned list |
| docs/proposals/run-info-harness.js | Its ScrollBox drag check (section 8) and its override map point at hud-kit-items.js | The scroll box moves there |
| docs/proposals/run-info-mutate.js | The "scroll thumb cannot be dragged" mutant targets hud-kit-items.js | Same move; its text is unchanged |
| tools/check.js | No change | It syntax-checks every js/ file already, so the new ones are covered |
| New harness or mutate runner | None | The split changes no behavior, and the smokes already render every kit piece in a headless browser |
| Intent scenarios, debug sets | None | No moves touched; the feel test uses the screens as they are |

You run: npm run format, node tools/check.js, the smokes (smoke-hud-overlay plain and with --built,
smoke-pause-menu, smoke-pause-inventory, smoke-status-fx, smoke-berry-slots), then the run-info mutant with
MUTATE_ONLY=scroll.

Feel test, about a minute on dev.html?dev with a hard reload: the run HUD (roster, player panel, boss bar, map,
DPS panel, run items), the pause menu's three tabs with a tooltip and a scroll drag, End Run, the EV screen.

## Docs

HUD-STYLE.md's two file pointers (TooltipLayer to hud-kit-items.js, createEffectChipReader to hud-kit-chips.js);
an ONBOARDING module map line per new file; the hud-overlay.js header lists the four kit files. No changelog line,
since nothing a player sees changes.

## Risks

| Risk | Caught by |
|---|---|
| A kit file loads out of order or is missing | NEED shows the failed-to-load screen |
| A name falls out of the kit | The new wiring check |
| The built bundle behaves differently | smoke-hud-overlay --built |
| A moved line breaks a mutant | run-info-mutate (the only mutant on this file) |

## Decisions

```mermaid
flowchart TB
  D1{"D1: how kit files join the kit"}
  D1 -->|"a, recommended"| A1["Each is its own G module in NEED;<br/>a missing file is loud"]
  D1 -->|"b"| B1["Three files add onto G.HudKit;<br/>one NEED entry, a missing file is silent"]
  D2{"D2: nine kit names nobody reads"}
  D2 -->|"drop, recommended"| A2["HP_COLOURS, TYPE_COLOURS, BAR_CHECKER,<br/>TYPE_CHECKER, BAR_ART_ROWS, bagButtonRow,<br/>STAGE, showTooltip, CHIP_STYLES leave the kit;<br/>they stay inside their own files"]
  D2 -->|"keep"| B2["The kit keeps all 47 names"]
```

D2 was checked against every js/, tools/ and docs/proposals/ file: none reads those nine from the kit.
