# HUD-STYLE

The in-run screen's look. Tracked on #61.

> **Status:** DRAFT. Sections lock one at a time with Jess.
> #61 is a soft dependency for #62 to #67 (Jess, 2026-11-10): each panel build locks its own shapes, motion and sizes
> here as it goes, rather than waiting for every section.

**What this file owns:** the look (rendering, fonts, colours, shapes, motion, sizes).

**What it does not own:** the layout. That lives in the wireframe, `assets/excalidraw/run_screen_mockup.png`.
The wireframe's fonts and colours are Excalidraw limitations, not choices.

**Related:**

- Other mainline palettes for future use: [docs/UI-PALETTES.md](UI-PALETTES.md)
- Rulings: `2026-11-10-hud-fixed-sizes-from-the-1080p-mockup`, `2026-11-10-hud-on-preact-and-pngs-as-design-basis`,
  `2026-11-10-sv-type-palette-canonical-for-ui`

**Contents**

1. [Rendering](#rendering)
2. [Performance](#performance)
3. [Assets](#assets)
4. [Fonts](#fonts)
5. [Colour palette](#colour-palette)
6. [Shapes](#shapes)
7. [Motion](#motion)
8. [Panel sizes at 1080p](#panel-sizes-at-1080p)

---

## Rendering

- `[Approved]` **HTML overlay.** The screen-fixed HUD is an HTML/CSS overlay above the game canvas.
  - Built with Preact, htm and Preact Signals.
  - Vendored into the repo (file:// cannot fetch packages) and loaded as plain scripts (no compile step).

- `[Approved]` **World things stay on the canvas.** Anything tied to a world position: floating arrows, damage numbers,
  debug overlays.

- `[Approved]` **Fixed pixel sizes.** Sizes are fixed CSS pixels, the wireframe measured at 1080p by its width (1920 px).
  - Never scaled with the window.
  - Existing fit guards for small windows stay.

- `[Approved]` **Signals for live values.** Per-frame values (HP, timers, cooldowns) update through Signals, so only the
  changed text or style is touched.

---

## Performance

- `[Approved]` **Keep every effect, build it cheap.** Keep every design effect; build each the cheapest way that looks
  the same.
  - Pre-made layers moved and faded through transform and opacity, not live animated filters.

- `[Approved]` **Fallback tier only when needed.** A fallback quality tier only where no cheap equivalent exists.
  - Example: a live blur behind a panel over the moving canvas.
  - The full design is always the default.

- `[Approved]` **Measured on the work laptop.** During a heavy run, with and without the HUD, starting with the pilot (#64).

---

## Assets

- `[Approved]` **PNGs are the design basis.** Mockups, rips in `assets/ui/BW Pokedex rip`, and existing frames.
  - HUD pieces are drawn in CSS at native resolution from them.
  - Not shipped as upscaled PNGs.

- `[Approved]` **Portrait art: SpriteCollab portraits, the Normal face only** (Jess, 2026-11-10).
  - 40x40 px, from the same SpriteCollab project and licence as the field sprites. No emotions.
  - Same folder rule as the sprites (`tools/fetch_sprites.py`); every other numbered folder is an alternate form
    (Mega, Gigantamax, Altcolor, costumes, female), named in SpriteCollab's `tracker.json`, and is not used.
  - Coverage: all 966 species with sprites have a normal portrait; 965 have a shiny one (#958 falls back to its normal
    face).
  - Local checkout: `C:\dev\SpriteCollab`. Copied into `assets/pokemon/<dex>/Portrait.png` and `s/Portrait.png` by `tools/copy_portraits.js` (rerun it after a
    SpriteCollab update).

  | Use    | Path in SpriteCollab                  |
  | ------ | ------------------------------------- |
  | Normal | `portrait/<dex>/Normal.png`           |
  | Shiny  | `portrait/<dex>/0000/0001/Normal.png` |

---

## Fonts

- `[Approved]` **Crisp sizes only.** Whole pixels only, at whole multiples of each font's pixel grid, so every font
  renders crisp.

- `[Approved]` **Text face: Truth And Ideals 10px** (`assets/fonts/Truth-And-Ideals-10px.ttf`), the Black/White DS font.
  - Re-gridded by `tools/make_hud_font.py` from `Truth-And-Ideals.ttf` (left untouched).
  - 10 font pixels per em, so crisp at 20, 30 and 40 px.
  - A middle dot added.
  - Every digit is 5 font pixels wide, so numbers do not twitch as they change.
  - Used for 100% of HUD text (names, labels, prompts, tags, counters).

  | Use      | Size  |
  | -------- | ----- |
  | Body     | 20 px |
  | Headers  | 30 px |
  | Emphasis | 40 px |
  - `[Approved]` **Lean on 2x** (Jess, 2026-11-10): 3x read too big and pixelated in the pilot. Text defaults to 20 px;
    30 and 40 px are used only where a piece is approved at that size.

- `[Approved]` **Display numbers: BoldPixels** (16 px grid, fixed-width digits) at 32 or 48 px.
  - For large numbers: World Level, Lv NN.

- `[Approved]` **No PokeBW in the HUD.** It has only 81 characters (no plus, minus, accented capitals, female or male
  signs).

- `[Approved]` **Text outline** (white text, black stroke).
  - One font pixel wide: 2 px at 20, 3 px at 30.
  - `[Approved]` Eight hard text shadows one font pixel out, in `#101010` (built in the pilot, #64; kept after Jess's feel
    test, 2026-11-10).

**Licences**

- BoldPixels is CC-BY-SA 4.0 (credit line needed).
- Truth And Ideals is a rip of the DS game font with no licence text, the same standing as the Pokemon sprites; no credit
  line possible.

---

## Colour palette

`[Approved]` **A working palette, not a frozen one** (Jess, 2026-11-10). It is the one consistent set the HUD pulls from,
and every colour is labelled with its job. Colours can be added, relabelled or retired as the HUD is built; a colour stays
until we know it is unused.

B/W colours come in pairs (a bright fill over a dark shade). Keep the pairs together.

### Sources

- `[Approved]` **Every HUD colour comes from our palettes:** this section, or a set adopted from
  [docs/UI-PALETTES.md](UI-PALETTES.md). The wireframe's colours are an Excalidraw limitation, not choices.
- UI-PALETTES holds every set in `assets/ui/palettes_rough.txt` (Time, Seasons, Regions, Attacks, Bag pockets, Pokemon
  Stats, Egg Groups) as light, base and dark tables.
- A set is used here only once this section adopts it.

### Type colours

- `[Approved]` **The Bulbapedia Scarlet/Violet palette is canonical for the HUD and all UI** (Jess, 2026-11-10).
  - Base for fills, Dark for shades and outlines, Light for highlights.
  - The game-wide move off `G.U.TYPE_COLOR` is #68.

| Type     | Light     | Base      | Dark      |
| -------- | --------- | --------- | --------- |
| Normal   | `#C1C2C1` | `#9FA19F` | `#676967` |
| Fire     | `#EF7374` | `#E62829` | `#961A1B` |
| Water    | `#74ACF5` | `#2980EF` | `#1B539B` |
| Grass    | `#82C274` | `#3FA129` | `#29691B` |
| Electric | `#FCD659` | `#FAC000` | `#A37D00` |
| Ice      | `#81DFF7` | `#3DCEF3` | `#28869E` |
| Fighting | `#FFAC59` | `#FF8000` | `#A65300` |
| Poison   | `#B884DD` | `#9141CB` | `#5E2A84` |
| Ground   | `#B88E6F` | `#915121` | `#5E3515` |
| Flying   | `#ADD2F5` | `#81B9EF` | `#54789B` |
| Psychic  | `#F584A8` | `#EF4179` | `#9B2A4F` |
| Bug      | `#B8C26A` | `#91A119` | `#5E6910` |
| Rock     | `#CBC7AD` | `#AFA981` | `#726E54` |
| Ghost    | `#A284A2` | `#704170` | `#492A49` |
| Dragon   | `#8D98EC` | `#5060E1` | `#343E92` |
| Dark     | `#998B8C` | `#624D4E` | `#403233` |
| Steel    | `#98C2D1` | `#60A1B8` | `#3E6978` |
| Fairy    | `#F5A2F5` | `#EF70EF` | `#9B499B` |

- `[Approved]` **How a type shows** (from `assets/ui/BW Pokedex rip`, the B2 lower-screen battle rip):
  - An angled rim in the type's colour,
  - around a `#393939` / `#292929` checker body,
  - with a `#000000` outline.

### Ramps for new colours

- `[Approved]` Colours with no mainline set (gym colours, new statuses) that need more steps are ramped as the B2 buttons
  are: **100%, about 55%, 45% and 33%** of the bright tone.

### Gym colours

- `[Approved]` The active leader circle's ring is the gym's type colour, once the gym art is recoloured to the SV palette
  (#69).
- Reference: `assets/tileset/gyms/gym-colors.json`.

### Life meters

- `[Approved]` Life meters (yours and the enemy Player entity's) use the B/W thresholds. Colours are in the Bars table
  below.

| HP left         | Colour |
| --------------- | ------ |
| Above 50%       | Green  |
| 50% down to 20% | Yellow |
| Below 20%       | Red    |

### Frames

- `[Approved]` Frames are Black 2 (dark charcoal), not White 2.

---

### Working colours

Sampled from the B2/W2 HP bar rip (`assets/ui/BW Pokedex rip`) and the existing menu stylesheets.

#### `[Approved]` Panels and lines

| Role                                          | Colour    | Source                              |
| --------------------------------------------- | --------- | ----------------------------------- |
| Panel body                                    | `#181818` | B2 bar frame, menus `--bw-charcoal` |
| Frame                                         | `#212121` | B2 bar frame                        |
| Checker (body texture, with the panel colour) | `#303030` | B2 bar frame                        |
| Slate (dividers, empty slots)                 | `#495151` | B2 bar frame                        |
| Light grey                                    | `#adadad` | B2 bar track shade                  |
| Light grey, lighter (disabled text and icons) | `#c6c6c6` | B2 rip                              |
| Off-white track                               | `#f3f3f3` | B2 bar track                        |
| Accent line                                   | `#29ceff` | menus `--bw-line`                   |
| Secondary text                                | `#8cfff7` | menus `--bw-sub`                    |
| Title                                         | `#fff000` | menus `--bw-title`                  |
| Title shade                                   | `#8f8500` | menus `--bw-title-shade`            |
| Ink shadow                                    | `#00213a` | menus `--bw-ink-shadow`             |

#### `[Approved]` Text

| Role                          | Colour                         |
| ----------------------------- | ------------------------------ |
| Text                          | `#ffffff`                      |
| Text outline                  | `#101010`                      |
| Dim text (Region, Map, Kills) | `#ffffff` at about 45% opacity |

#### `[Approved]` Bars (fill over shade)

| Bar                     | Fill      | Shade     |
| ----------------------- | --------- | --------- |
| HP above 50%            | `#00fb49` | `#008a28` |
| HP 50% to 20%           | `#f3b200` | `#9a6110` |
| HP below 20%            | `#fb3041` | `#922030` |
| Empty track             | `#f3f3f3` | `#adadad` |
| Empty track (dark bar)  | `#7f7f7f` | `#464646` |
| EXP (the portrait ring) | `#00baf3` | `#00799a` |
| Lv label                | `#f3b200` | `#9a6110` |
| Male sign               | `#00baf3` | `#00799a` |
| Female sign             | `#fb3041` | `#922030` |

#### `[Approved]` Status chips (fill over shade)

Chips cover the major statuses only, as in mainline. Confusion, trap, daze, drowsy, slow and haste get no HUD chip: they
show as their effect animating on the Pokemon (ducks circling for confusion, bouncing question marks for daze, pulsing
green rings for trap), drawn on the canvas with the art's own colours.

| Status  | Fill      | Shade     |
| ------- | --------- | --------- |
| SLP     | `#848484` | `#4a4a4a` |
| PSN     | `#d631de` | `#6b2942` |
| Bad PSN | `#d631de` | `#391042` |
| BRN     | `#e75a4a` | `#b50000` |
| FRZ     | `#218cf7` | `#005a8c` |
| PAR     | `#efad00` | `#ad6b00` |

#### `[Approved]` Shake Off prompt (flashing)

| Role          | Colour    | Source         |
| ------------- | --------- | -------------- |
| Fill          | `#f3b200` | B2/W2 Lv label |
| Shade         | `#9a6110` | B2/W2 Lv label |
| Light (flash) | `#ffffff` |                |

Chosen over orange (the same as SV Fighting) and Physical (close to SV Fire).

---

## Shapes

Shapes are borrowed from the B/W rips, chosen per element (the same shape family can differ by where it sits). Cells are
named on the gridded copies in `assets/ui/BW Pokedex rip/_grid/` (its README maps short names to files), as
`<short name> <column><row>`. The rip gives the shape only: frame and fill colours come from the palette, and the shape is
redrawn in CSS at the HUD's size, never scaled up from the art.

- `[Open]` Slants, frames, corners, line widths, transparency for the elements not yet settled.

### Shape references

| Reference               | What it is                                                                            | Candidate use             |
| ----------------------- | ------------------------------------------------------------------------------------- | ------------------------- |
| `b2-upper` A1 to L3     | B2 dark HP bar, no EXP: slanted left end, clipped right end, drop shadow              | Enemy name bar (approved) |
| `b2-upper` A4 to L6     | The same bar with EXP; its EXP track's right edge (L6) sets the HP fill's end         | Enemy name bar            |
| `b2-hpbars` C31 to AD35 | Name, gender and Lv above the bar (Charizard, Noibat examples)                        | Enemy name bar layout     |
| `b2-upper` AD5 to AJ6   | B2 party circles: red healthy, orange statused, grey fainted, black empty             | Leader portrait circles   |
| `b2-lower` V4 to W4     | Lozenge: flat black body, thin grey rim, point on the left, slant on the right        | Empty move slot (#62)     |
| `b2-lower` Z19 to AA19  | Lozenge: points on both ends, checker body, grey rim with a white glint on each point | To place                  |
| `b2-lower` F15 to J16   | B2 fight menu: four move buttons in a 2x2 grid; type rims at V5 to W21                | Move slots (#62)          |
| `b2-lower` Z2 to AC3    | B2 selection cursor: corner brackets                                                  | Active move slot (#62)    |
| `b2-lower` B12 to D12   | The "FIGHT!" badge: solid lozenge, pointed ends                                       | Shake Off prompt (#62)    |
| `b2-lower` Y4 to AB5    | Bag buttons: checker body, chamfered corners, coloured rim                            | Held item square (#62)    |
| `b2-hpbars` Q16 to AD16 | Status tags: small rectangles, fill inside a 1-pixel shade frame                      | Status chips (#62)        |
| `b2-lower` Y17 to Z17   | Capsule buttons: stepped cut corners, coloured rim, outline                           | Status chip outline (#62) |
| `b2-lower` Y15 to AA16  | Long box: stepped corners with a bump above each, grid body, coloured rim             | Roster rows (#63)         |
| `b2-lower` Y16 to Z16   | Small bar: an italic pixel "HP" label on its plate, a thin framed track                | Roster HP bar (#63)       |
| `b2-lower` AD4 to AG5   | Item box: slanted ends, corner bumps, a white slanted patch in the lower left         | Run items (#63)           |

### Enemy name bar (pilot, #64)

- `[Approved]` **Shape:** the B2 dark HP bar, `b2-upper` A1 to L3 (Jess, 2026-11-10).
- `[Approved]` **Name above the bar**, as B2 does it (`b2-hpbars` C31 to AD35); the bar holds only the HP label and the
  fill (Jess, 2026-11-10).
  - Name, left-aligned: the leader's possessive and the active Pokemon, for example "Brock's Onix".
  - Lv, right-aligned: the active Pokemon's level, for example "Lv. 14".
  - No gender sign.
  - Length check: the longest case is a 12-letter Pokemon name after a long leader name ("Lt. Surge's "), about 24
    characters, roughly 340 px at 20 px text. That fits the bar's roughly 700 px width with the Lv on the right.
- `[Approved]` **The HP label is italic text**, not the rip's art (Jess, 2026-11-10): "HP" in the HUD font at 20 px, solid
  white with its 2 px outline (the rip's grey shading read muddy). The font has no italic face, so the browser slants it
  the way Word fakes italics; this label is the one place the overlay allows a browser-made style. A pixel-stepped italic
  face was tried and read badly at 7-pixel letters. The label is narrower than the rip's, so the fill starts right after
  it, about 24 px further left.
- `[Approved]` **A longer HP fill:** the HP label moves further left on the shape, to just before the bottom edge starts to
  rise into the slanted left end. The fill starts right after the label and runs further right, ending where the EXP
  track ends on the EXP version of the bar (`b2-upper` L6).

### Leader portrait circles (pilot, #64)

- `[Approved]` **One circle per filled team slot**, below the enemy name bar; an empty slot shows no circle. Each holds
  that Pokemon's portrait (see Assets).
- `[Approved]` **A 4 px stroke, not a thick rim** (plainer than the B2 party circles at `b2-upper` AD5 to AJ6) (Jess,
  2026-11-10).
- `[Approved]` **Stroke colour:** the active Pokemon's circle takes the gym's type colour (see Gym colours); every other
  circle has a plain black stroke. No status colours on the ring.
- `[Approved]` **Fainted:** the circle is darkly dimmed (from the wireframe).
- `[Approved]` **The circle crops the portrait**, centred, with no fill behind it: every portrait is an opaque 40x40
  square (all 966 checked), so the circle shows only the portrait (Jess, 2026-11-10).
- `[Approved]` **Size:** the portrait at exactly 1x (40 px), so it stays crisp; a 4 px stroke outside it makes the circle
  48 px across (Jess, 2026-11-10: 2 px read too thin in the pilot).

### Character info panel (#62)

Jess approved these shapes on 2026-11-10 (bonded rim option a, active slot option a). Everything is redrawn at 2 px per
B2 art pixel, half the enemy bar's scale.

- `[Approved]` **Move slots: the B2 fight-menu move button** (`b2-lower` F15 to J16), its profile copied row for row
  at half the rip's 44 rows (Jess, 2026-11-10: the first build's long 45 degree slants read too pointed). Left end: a
  short 45 degree run down to a flat point (art rows 6 to 8), then a steep run back, one pixel across per two rows. The
  right end is the same profile turned 180 degrees. Flat top and bottom.
  - The slanted ends: outline, Light, Base, outline (one art pixel each). Top and bottom: outline, Dark.
  - The body is the B2 grid with its dark squares 50% larger (Jess, 2026-11-10): 3x3 art-pixel `#292929` squares on
    1-pixel `#393939` lines, repeating every 4 art pixels (8 px on screen).
  - Four 36 px wells per slot, always drawn (dark `#181818` circles with a 2 px `#101010` ring), filled left to right:
    one move fills the first, a bond fills one well per move.
  - `[Approved]` **A move's well** (Jess, 2026-11-10): filled with its SV type colour (Base), the white type glyph
    (`assets/icons/types/<Type>_icon.png`, 64 px art) at exactly half size (32 px), and the move's family badge (7 art
    px, as in the corner of the old move icon) at 2x on the well's bottom right. The 20x20 type icons stay everywhere
    else in the game.
  - The slot's key at 20 px on its left point.
- `[Approved]` **Rim colour:** a single move takes its SV type colours; a bonded slot takes the bond pink (option a); an
  empty slot is the B2 disabled button (`b2-lower` V4): flat `#181818` body, `#212121` rim.
- `[Approved]` **Active slot: the B2 selection cursor** (`b2-lower` Z2 to AC3, option a): four corner brackets in Title
  yellow `#fff000` with a `#101010` outline, just outside the slot's corners. Each bracket is one continuous yellow L
  inside one unbroken outline (fixed 2026-11-10: the corner pixel was outline, which split it into two bars).
- `[Approved]` **Status chips: the B2 status tags** (`b2-hpbars` Q16 to AD16) for colour and label, in the outline of
  the B2 capsule buttons (`b2-lower` Y17 to Z17; Jess, 2026-11-10, #62 playtest): stepped cut corners over the rip's 12
  art rows (each side in by 2, 2, 1, 1, 0, 0, 0, 0, 1, 1, 2, 2 art pixels), drawn as pixels at 2x. The fill sits inside a
  4 px (2 art pixel) shade rim; the thicker shade rim stands in for the rip's dark outline, so no outline is drawn. The
  3-letter mainline label (SLP, PSN, BRN, FRZ, PAR; bad poison is PSN on the dark shade). A 2 px white timer bar along
  the lowest fill row, inside the corners; the glow is clipped to the fill.
- `[Approved]` **Shake Off prompt: the B2 "FIGHT!" badge** (`b2-lower` B12 to D12): pointed ends, an outline, a shade
  rim, the Lv yellow fill with a 3-row shade band at the bottom. Its width follows the text.
- `[Approved]` **Held item: the B2 bag button** (`b2-lower` Y4 to AB5): a 40 px square with chamfered corners, the bar
  checker body, a slate rim when empty and the Lv yellow rim while holding an item. The item icon at 1x (32 px), its name
  below at 20 px, left-aligned to the square. It sits right of the move slots (Jess, 2026-11-10: swapped with Lv).
- `[Approved]` **Life meter:** the enemy bar's shape (B2 dark HP bar) at 2x, with "current / max" as 20 px text right
  after its end (Jess, 2026-11-10: "for now"; B2 itself prints the numbers inside the bar, `b2-hpbars` C32 to P35).
- `[Approved]` **Portrait and EXP ring:** the 40 px portrait at exactly 2x (80 px), cropped by a circle with a 4 px
  `#101010` stroke, inside a 12 px EXP ring with a 2 px outline: 116 px across. The ring is one flat band (Jess,
  2026-11-10: no darker blue shade): the EXP blue `#00baf3` for progress, clockwise from the top, and `#7f7f7f` for the
  rest.
- `[Approved]` **Lv:** "Lv." at 20 px in the Lv yellow, the number below in BoldPixels at 48 px, both right-aligned left
  of the portrait, 12 px clear of its ring (Jess, 2026-11-10: swapped with the held item).
- `[Proposed]` **Bond count** (no place in the wireframe): the bond icon at 2x (24 px) with "×N" under the Lv number,
  only while you have bonds to spend.
- `[Proposed]` **Run timer:** 20 px dim text (45% opacity, as the wireframe's grey), centred under the slots.
- `[Open]` Psychic's rim (`#EF4179`) and the bond pink (`#ff8ad8`) read close at 2x. Seen in the first screenshot; Jess to
  judge in the feel test.

---

### Roster, berry bag and run items (#63)

Jess set these on 2026-11-10 (the #63 plan review). Everything is drawn at 2 px per B2 art pixel.

- `[Approved]` **Roster rows: the B2 long box** (`b2-lower` Y15 to AA16). The rip's corners are copied pixel for pixel
  (8 rows each, with the bump rising above the top edge); the straight sides are cut down so a row is 32 art rows. Left
  rim, outside in: outline, Base, outline, two Light, outline; top and bottom edges: outline, Base, outline. The body is
  the move slots' larger grid. The rim takes the Pokemon's first type's SV colours (Light, Base, Dark).
- `[Approved]` **In the row:** the portrait in a 44 px circle on the left (40 px at 1x inside a 2 px stroke); the name
  left-aligned just right of it, a little below the middle of the space above the bar; the slot's key on the top left
  corner.
- `[Approved]` **Roster HP bar: the B2 small bar** (`b2-lower` Y16 to Z16) inside the box along the bottom, right of the
  portrait and almost to the right rim: the rip's italic pixel "HP" label (copied pixel for pixel) and a framed track.
  The fill is two art rows, the HP band's fill over its shade, using the life meter thresholds.
- `[Approved]` **Benched status chips:** a benched Pokemon's chips (the #62 chips) sit inside its box, top right. Benched
  statuses keep ticking. The active Pokemon's row shows none, since the bottom panel has them. `[Open]` two chips cover a
  short name (seen 2026-11-10 with Pikachu, PAR and BRN); the row is sized for the longest name and one chip.
- `[Approved]` **Held item square:** the #62 square at 48 px, right of each row, with no name under it.
- `[Approved]` **Rows shown:** only filled slots, stacked with no gaps, each keeping its own key. A team of one shows no
  roster.
- `[Approved]` **Active row:** the B2 selection cursor, as the active move slot. **Fainted:** the portrait darkly dimmed
  (as the leader circles), the name at half opacity, an empty bar, and the rim in the panel greys (`#7f7f7f`, `#495151`,
  `#303030` as Light, Base, Dark).
- `[Approved]` **Berry bag:** the #62 held item square at 40 px with the berry's name under it, 2x2, only the purchased
  slots; an empty slot is the square with a slate rim and no name.
- `[Approved]` **Run items: the B2 item box** (`b2-lower` AD4 to AG5), 32 art rows: slanted ends (flat for 6 rows in the
  middle, then one pixel in for every three rows out), corner bumps, the same rim order as the roster rows, in the Lv
  yellow ramp (`#f3b200` Light, `#9a6110` Base, `#6d5000` corner shade). The white patch (`#e7e7e7`, its top and right
  edges `#848484`) runs from the box's flat middle down to its bottom outline, and holds the item's icon at 1x.
  - The item's name sits above the box, left-aligned, at 30 px.
  - Right of the patch: the live tracker in the EXP blue when the item has one, otherwise its short description in
    white, at most two lines with an ellipsis.
  - Only unlocked slots show, slot 1 at the bottom. An empty slot shows the box with an empty patch and no name.

## Motion

- `[Open]` Slides, flashes, glows, timings for the elements not yet settled.

### Enemy name bar (pilot, #64)

- `[Approved]` **Cut and fall: lost HP drops off the bar** (Jess, 2026-11-10). Each hit plays four phases:
  1. **Cut.** The fill drops to the new value at once. A copy of the lost segment (same colour, size and place) appears
     exactly where the fill was cut, so the loss reads as a piece, not an empty gap.
  2. **Hold.** The piece stays still for about 1 s, so the player can see how much was lost.
  3. **Fall and fade.** The piece then falls away below the bar, speeding up as if under gravity, while it fades from
     solid to clear.
  4. **Remove.** At zero opacity the piece is deleted, so nothing piles up.
  - Each hit makes its own piece; rapid hits leave pieces side by side, each on its own clock.
  - Built the cheap way (Performance): the piece only moves and fades (transform and opacity).
- `[Approved]` Fall and fade: about 0.4 s, falling about 40 px with gravity-style easing (slow start, fast finish).
- `[Approved]` **Heals grow the fill** to the new value over about 0.3 s, with no piece (Jess, 2026-11-10).

### Leader portrait circles (pilot, #64)

- `[Approved]` **Swap** (Jess, 2026-11-10):
  - The Pokemon leaving the field: its ring turns black.
  - The incoming Pokemon: its ring takes the gym colour and pulses for as long as its swap-in i-frames last (0.5 s today,
    COMBAT-RULES "LEADER TEAM"), then stays solid. The pulse reads the live i-frame timer, so it follows any change to it.
- `[Approved]` Pulse: the whole circle (portrait and stroke) flickers between 45% and full opacity about 9 times a second,
  as the Pokemon's sprite does during i-frames; the stroke stays the gym colour (Jess, 2026-11-10: a stroke-only blink
  was barely noticeable).
- `[Approved]` Faint: the circle fades to its dimmed look over 0.3 s.

### Character info panel (#62)

- `[Approved]` **Life meter:** the enemy bar's cut and fall and its growing heals, unchanged.
- `[Approved]` **Status chips:** a light band slides across each chip about every 1.6 s (moved by transform only); the
  timer bar shrinks with the status's time left (against the most time seen since it appeared).
- `[Approved]` **Shake Off prompt:** flashes between the Lv yellow and white 3 times a second, the usual
  photosensitivity limit (Jess, 2026-11-10). Text 30 px; "Shaking off..." while auto-shake is on.
- `[Approved]` **Move wells:** the cooldown is a clock wipe (Jess, 2026-11-10): a 60% `#101010` shade covers the part
  still recharging and shrinks clockwise from the top. A cast flashes the well white, fading over 0.18 s (as the old
  canvas bar).
- `[Approved]` **Level up: the Lv number rattles** (Jess, 2026-11-10), as if held up on a stick and shaken: it pivots on
  its bottom (so the top swings further than the bottom), rises a few pixels, grows to 1.3x and tilts each way by up to
  9 degrees with a little sideways shake, settling over 0.6 s. A pause never replays it.
- `[Approved]` **Level-up order** (Jess, 2026-11-10): the number rattles while you keep playing; once it settles (1.1 s
  of run time after the level: the 0.6 s rattle and half a second) the upgrade cards pop up and pause the game as before.
  Levels still queued after a pick open straight on. The wait is `LEVEL_CARDS_DELAY` in `js/game.js`.
- `[Approved]` **Level-up confetti** (Jess, 2026-11-10; `js/ui/confetti.js`): as the cards pop up, confetti bursts up and
  out of the popup's two top corners and showers down the whole screen, still falling while the game is paused under the
  cards. Pixel art: 2 px blocks on a 2 px grid in the palette's Lv yellow, EXP blue, HP green, bond pink and white, each
  piece tumbling (its width flips) and swaying as it falls. About 45 pieces per corner (fewer on low graphics). If you
  pick before it reaches the bottom, what is left fades out over 1 s.
- `[Approved]` **Silver:** the coin spins on the run clock; the count rolls up to a gain within 0.25 s and pops (up to
  1.5x, settling in 0.18 s) from its bottom right; a spend or a new run shows the new value at once (as the old counter; the pop grew from 1.3x to 1.5x, Jess 2026-11-10).

### Roster (#63)

- `[Approved]` **Swap cooldown:** a 60% `#101010` shade over the whole box of every living benched row, clipped to the
  box's outline. Its right edge moves left as the cooldown runs out (Jess, 2026-11-10).
- `[Approved]` **Benched chips:** the #62 chip motion (sliding glow, timer bar).

---

## Panel sizes at 1080p

Measured from the wireframe: its game rectangle is 4845 px wide, scaled to 1920 (x 0.396). Positions are from the top left
of the screen, rounded to whole pixels.

- `[Open]` Every other panel's size and position.

### Enemy name bar and leader circles (pilot, #64)

`[Approved]` The Proposed column below (Jess, 2026-11-10).

| Element          | Wireframe (at 1080p)                          | Proposed                                                                             |
| ---------------- | --------------------------------------------- | ------------------------------------------------------------------------------------ |
| Bar width        | 695 px, x 613 to 1308, centred on the screen  | 696 px, centred                                                                      |
| Bar top          | y 43                                          | Name line at y 43; bar right below it                                                |
| Bar height       | 36 px (the wireframe put the name in the bar) | 33 px: the B2 bar's 11 art rows at 3 px each                                         |
| HP fill height   | (none)                                        | 9 px: the B2 fill's 3 art rows at 3 px each                                          |
| Name and Lv line | (none, the name sat in the bar)               | 20 px text (body size), name left on the bar's left edge, Lv right on its right edge |
| Circle size      | about 46 px across                            | 48 px (40 px portrait at 1x plus the 4 px stroke)                                    |
| Circle spacing   | 51 px apart (5 px gap)                        | 54 px apart (6 px gap)                                                               |
| First circle     | left edge on the bar's left edge              | Same                                                                                 |
| Circles top      | 4 px below the bar                            | Same                                                                                 |

`[Approved]` The bar is drawn at 3 px per B2 art pixel so its height lands on the wireframe's (33 px against 36). The
name above it is 20 px text (2 px font pixel): 30 px read too pixelated in the pilot (Jess, 2026-11-10).

### Character info panel (#62)

The wireframe's game area is 1920 x 1121 at this scale (not 16:9), so this panel is placed from the screen's bottom
edge, not the top. x is from the screen's centre line (960 at 1080p), y from the bottom edge to the piece's bottom.

`[Approved]` from the #62 plan (Jess, 2026-11-10), except the rows marked `[Proposed]`, where the build moved a number off
the plan; those wait on the feel test.

| Element               | Wireframe (at 1080p)              | Built                                                                        |
| --------------------- | --------------------------------- | ---------------------------------------------------------------------------- |
| Portrait and EXP ring | 118 px across, centre x -281      | 116 px, centre x -281, y 36 (`[Proposed]`: plan said 42)                     |
| Held item square      | about 40 px, left of the portrait | 40 px at x +222 (right of the slots, swapped), y 74; name below at y 48      |
| Life meter            | 460 x 22, x -251 to +210          | 462 px wide (231 art), 24 px with its shadow, x -252, y 140                  |
| HP text               | (none)                            | x +218, y 147, 20 px                                                         |
| Status chips          | 70 x 19, 6 px apart               | 70 x 24, 6 px apart, from x -244, y 172 (`[Proposed]`: 24 high for the text) |
| Shake Off prompt      | 304 x 48, centred on the bar      | 48 high, width from its text, centred on x -21, y 208                        |
| Move slots            | 206 x 44, 2x2, gaps 5 and 3       | 210 x 44 (105 x 22 art), gaps 6 and 4, from x -216, y 36                     |
| Wells                 | about 42 px                       | 36 px, centres 47 px from each end, evenly spread                            |
| Lv                    | right of the slots                | right edge x -351 (left of the portrait, swapped): "Lv." y 116, number y 60  |
| Bond count            | (none)                            | right edge x -351, y 36 (`[Proposed]`)                                       |
| Silver                | above-left of the portrait        | coin 32 px, right edge x -260, y 160; count 6 px left of it at 30 px         |
| Run timer             | centred under the slots           | centre x -3, y 10                                                            |

The slots are back to the wireframe's 44 px since the B2 profile (2026-11-10) uses two-row top and bottom edges, which
leaves 36 px inside for a well. Silver sits 12 px below the chips' line (Jess, 2026-11-10: "can come down a bit"),
about as low as it goes before the coin meets the portrait ring.

### Roster, berry bag and run items (#63)

Placed from the screen's bottom edge, as the character info panel: the roster and berries from the left edge, the run
items from the right edge.

`[Proposed]` from the build (2026-11-10), waiting on Jess's feel test.

| Element           | Wireframe (at 1080p)            | Built                                                                          |
| ----------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| Roster row        | 206 x 40, x 16, 51 px apart     | 278 x 64 (139 x 32 art), x 16, 68 px apart; the lowest row 42 px up            |
| Row width         | (none)                          | the widest species name in the HUD font (116 px, measured) and one chip        |
| Portrait circle   | about 30 px                     | 44 px, 14 px in from the row's left edge                                       |
| Name              | inside the row                  | 20 px, x 66 in the row, top 17                                                 |
| HP bar            | (red line under the name)       | 7 art rows from art column 33, top at art row 19; fill 83 art pixels           |
| Held item square  | about 32 px, right of the row   | 48 px (24 art), 8 px right of the row, centred on it                           |
| Berry bag         | 2x2, 40 px squares              | 40 px squares, columns 128 px apart, rows 72 px apart, 12 px above the roster  |
| Run item box      | 142 x 48, 39 px from the right  | 280 x 64 (140 x 32 art), 24 px from the right, slot 1 42 px up                 |
| Run item name     | inside the box                  | 30 px, above the box, 2 px gap; slots 104 px apart                             |
| Run item patch    | (none)                          | 22 art wide, from art row 13 to the bottom outline; icon 32 px                 |
