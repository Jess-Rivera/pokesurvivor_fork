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
- `[Open]` The B/W tokens, HP thresholds, EXP, status, type and gym colours (gym reference: assets/tileset/gyms/gym-colors.json).

## Shapes
- `[Open]` Slants, frames, corners, line widths, transparency.

## Motion
- `[Open]` Slides, flashes, glows, timings.

## Panel sizes at 1080p
- `[Open]` Every panel's size and position, measured from the wireframe.
