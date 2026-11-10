# HUD-STYLE, the in-run screen's look (#61)

Status: DRAFT, sections lock one at a time with Jess. Builds #62 to #67 follow it once every section is `[Approved]`.
Layout lives in the wireframe (assets/excalidraw/run_screen_mockup.png); this file owns the look. The wireframe's fonts are an
Excalidraw limitation, not choices. Other mainline palettes for future use: docs/UI-PALETTES.md. Rulings: 2026-11-10-hud-fixed-sizes-from-the-1080p-mockup,
2026-11-10-hud-on-preact-and-pngs-as-design-basis.

## Rendering
- `[Approved]` The screen-fixed HUD is an HTML/CSS overlay above the game canvas, built with Preact, htm and Preact Signals,
  vendored into the repo (file:// cannot fetch packages) and loaded as plain scripts (no compile step).
- `[Approved]` Things tied to world positions stay on the canvas: floating arrows, damage numbers, debug overlays.
- `[Approved]` Sizes are fixed CSS pixels, the wireframe measured at 1080p by its width (1920 px); never scaled with the window.
  Existing fit guards for small windows stay.
- `[Approved]` Per-frame values (HP, timers, cooldowns) update through Signals, so only the changed text or style is touched.

## Performance
- `[Approved]` Keep every design effect; build each the cheapest way that looks the same (pre-made layers moved and faded
  through transform and opacity, not live animated filters).
- `[Approved]` A fallback quality tier only where no cheap equivalent exists (for example a live blur behind a panel over the
  moving canvas); the full design is always the default.
- `[Approved]` Measured on the work laptop during a heavy run, with and without the HUD, starting with the pilot (#64).

## Assets
- `[Approved]` PNGs (mockups, rips in assets/ui/BW Pokedex rip, existing frames) are the design basis; HUD pieces are drawn in
  CSS at native resolution from them, not shipped as upscaled PNGs.
- `[Open]` Which sprite art the portraits use (the PMD idle frames the HUD crops today, or another source).

## Fonts
- `[Approved]` Sizes are whole pixels only, at whole multiples of each font's pixel grid, so every font renders crisp.
- `[Approved]` Text face: **Truth And Ideals 10px** (assets/fonts/Truth-And-Ideals-10px.ttf), the Black/White DS font,
  re-gridded by tools/make_hud_font.py from Truth-And-Ideals.ttf (left untouched): 10 font pixels per em, so crisp at 20, 30
  and 40 px; a middle dot added; every digit 5 font pixels wide, so numbers do not twitch as they change. Used for 100% of
  HUD text (names, labels, prompts, tags, counters): 20 px body, 30 px headers, 40 px emphasis.
- `[Approved]` Large display numbers (World Level, Lv NN): **BoldPixels** (16 px grid, fixed-width digits) at 32 or 48 px.
- `[Approved]` PokeBW is not used in the HUD: it has 81 characters (no plus, minus, accented capitals, female or male signs).
- `[Open]` Text outline (white text, black stroke): one font pixel wide (2 px at 20, 3 px at 30); method picked in the pilot.
- Licences: BoldPixels is CC-BY-SA 4.0 (credit line needed). Truth And Ideals is a rip of the DS game font with no licence
  text, the same standing as the Pokemon sprites; no credit line possible.

## Colour palette
B/W colours come in pairs (a bright fill over a dark shade); keep the pairs together.

- `[Approved]` **Type colours: the Bulbapedia Scarlet/Violet palette is canonical for the HUD and all UI** (Jess, 2026-11-10).
  Base fills, dark for shades and outlines, light for highlights. The game-wide move off `G.U.TYPE_COLOR` is #68.

  | Type | Light | Base | Dark |
  |---|---|---|---|
  | Normal | `#C1C2C1` | `#9FA19F` | `#676967` |
  | Fire | `#EF7374` | `#E62829` | `#961A1B` |
  | Water | `#74ACF5` | `#2980EF` | `#1B539B` |
  | Grass | `#82C274` | `#3FA129` | `#29691B` |
  | Electric | `#FCD659` | `#FAC000` | `#A37D00` |
  | Ice | `#81DFF7` | `#3DCEF3` | `#28869E` |
  | Fighting | `#FFAC59` | `#FF8000` | `#A65300` |
  | Poison | `#B884DD` | `#9141CB` | `#5E2A84` |
  | Ground | `#B88E6F` | `#915121` | `#5E3515` |
  | Flying | `#ADD2F5` | `#81B9EF` | `#54789B` |
  | Psychic | `#F584A8` | `#EF4179` | `#9B2A4F` |
  | Bug | `#B8C26A` | `#91A119` | `#5E6910` |
  | Rock | `#CBC7AD` | `#AFA981` | `#726E54` |
  | Ghost | `#A284A2` | `#704170` | `#492A49` |
  | Dragon | `#8D98EC` | `#5060E1` | `#343E92` |
  | Dark | `#998B8C` | `#624D4E` | `#403233` |
  | Steel | `#98C2D1` | `#60A1B8` | `#3E6978` |
  | Fairy | `#F5A2F5` | `#EF70EF` | `#9B499B` |

- `[Approved]` How a type shows (from assets/ui/BW Pokedex rip, the B2 lower-screen battle rip): an angled rim in the type's
  colour around a `#393939` / `#292929` checker body with a `#000000` outline.
- `[Approved]` Colours with no mainline set (gym colours, new statuses) that need more steps are ramped as the B2 buttons are:
  100%, about 55%, 45% and 33% of the bright tone.
- `[Approved]` Gym colours (the active leader circle's ring) are the gym's type colour, once the gym art is recoloured to the
  SV palette (#69); assets/tileset/gyms/gym-colors.json is the reference.
- `[Approved]` The wireframe's colours are an Excalidraw limitation, not choices: every HUD colour comes from our palettes
  (this section, or a set adopted from docs/UI-PALETTES.md).
- `[Approved]` Life meters (yours and the enemy Player entity's) use the B/W thresholds: green above 50%, yellow from 50% down
  to 20%, red below 20%. Colours in the Bars table.
- `[Approved]` Frames are Black 2 (dark charcoal), not White 2.

The tables below are `[Proposed]`, sampled from the B2/W2 HP bar rip (assets/ui/BW Pokedex rip) and the menus' CSS, for Jess
to review; each locks when marked `[Approved]`.

`[Proposed]` Panels and lines

| Role | Colour | Source |
|---|---|---|
| Panel body | `#181818` | B2 bar frame, menus `--bw-charcoal` |
| Frame | `#212121` | B2 bar frame |
| Checker (body texture, with the panel colour) | `#303030` | B2 bar frame |
| Slate | `#495151` | B2 bar frame |
| Light grey | `#adadad` | B2 bar track shade |
| Light grey, lighter | `#c6c6c6` | B2 rip |
| Off-white track | `#f3f3f3` | B2 bar track |
| Accent line | `#29ceff` | menus `--bw-line` |
| Secondary text | `#8cfff7` | menus `--bw-sub` |
| Title | `#fff000` | menus `--bw-title` |
| Title shade | `#8f8500` | menus `--bw-title-shade` |
| Ink shadow | `#00213a` | menus `--bw-ink-shadow` |

`[Proposed]` Text

| Role | Colour |
|---|---|
| Text | `#ffffff` |
| Text outline | `#101010` |
| Dim text (Region, Map, Kills) | `#ffffff` at about 45% opacity |

`[Proposed]` Bars (fill over shade)

| Bar | Fill | Shade |
|---|---|---|
| HP above 50% | `#00fb49` | `#008a28` |
| HP 50% to 20% | `#f3b200` | `#9a6110` |
| HP below 20% | `#fb3041` | `#922030` |
| Empty track | `#f3f3f3` | `#adadad` |
| EXP (the portrait ring) | `#00baf3` | `#00799a` |
| Lv label | `#f3b200` | `#9a6110` |
| Male sign | `#00baf3` | `#00799a` |
| Female sign | `#fb3041` | `#922030` |

`[Proposed]` Status chips (fill over shade); statuses the B/W games lack get a pair ramped from their type colour.

| Status | Fill | Shade |
|---|---|---|
| SLP | `#848484` | `#4a4a4a` |
| PSN | `#d631de` | `#6b2942` |
| Bad PSN | `#d631de` | `#391042` |
| BRN | `#e75a4a` | `#b50000` |
| FRZ | `#218cf7` | `#005a8c` |
| PAR | `#efad00` | `#ad6b00` |

`[Open]` Shake Off prompt (flashing): pick a pair from our palettes.

| Option | Fill | Shade | Light (flash) | Source |
|---|---|---|---|---|
| A, Lv gold | `#f3b200` | `#9a6110` | `#ffffff` | B2/W2 Lv label |
| B, Orange | `#FF7F00` | `#A65300` | `#FFAC59` | UI-PALETTES Regions "Orange" (same as SV Fighting) |
| C, Physical | `#EB5628` | `#99381A` | `#F29173` | UI-PALETTES Attacks "Physical" |

## Shapes
- `[Open]` Slants, frames, corners, line widths, transparency.

## Motion
- `[Open]` Slides, flashes, glows, timings.

## Panel sizes at 1080p
- `[Open]` Every panel's size and position, measured from the wireframe.
