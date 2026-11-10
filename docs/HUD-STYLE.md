# HUD-STYLE, the in-run screen's look (#61)

Status: DRAFT, sections lock one at a time with Jess. Builds #62 to #67 follow it once every section is `[Approved]`.
Layout lives in the wireframe (assets/excalidraw/run_screen_mockup.png); this file owns the look. The wireframe's fonts are an
Excalidraw limitation, not choices. Rulings: 2026-11-10-hud-fixed-sizes-from-the-1080p-mockup,
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
- `[Proposed]` Panels and lines: panel `#181818`, frame `#212121`, checker `#303030`, slate `#495151`, light greys `#adadad`
  and `#c6c6c6`, off-white track `#f3f3f3`; the menus' accent line `#29ceff`, secondary text `#8cfff7`, title `#fff000` over
  `#8f8500`, ink shadow `#00213a`.
- `[Proposed]` Text: white `#ffffff` with a `#101010` outline; dim text (Region, Map, Kills) white at about 45% opacity.
- `[Proposed]` Bars (B2/W2 rip, fill over shade): HP `#00fb49` / `#008a28`, `#f3b200` / `#9a6110`, `#fb3041` / `#922030`;
  empty track `#f3f3f3` / `#adadad`; EXP `#00baf3` / `#00799a`; Lv label `#f3b200` / `#9a6110`; male `#00baf3`, female `#fb3041`.
- `[Proposed]` Status chips (B2/W2 rip, fill over shade): SLP `#848484` / `#4a4a4a`, PSN `#d631de` / `#6b2942`, bad PSN
  `#d631de` / `#391042`, BRN `#e75a4a` / `#b50000`, FRZ `#218cf7` / `#005a8c`, PAR `#efad00` / `#ad6b00`; statuses the B/W
  games lack get a pair ramped from their type colour.
- `[Open]` Life meter: B/W thresholds (green above 50%, yellow to 20%, red below) or always red as the wireframe shows.
- `[Open]` Frames: Black 2 (dark) or White 2 (light).
- `[Open]` Shake Off prompt: Lv gold flashing to white, or a dedicated alert orange.

## Shapes
- `[Open]` Slants, frames, corners, line widths, transparency.

## Motion
- `[Open]` Slides, flashes, glows, timings.

## Panel sizes at 1080p
- `[Open]` Every panel's size and position, measured from the wireframe.
