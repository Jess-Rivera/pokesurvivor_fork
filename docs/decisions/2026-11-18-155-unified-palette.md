---
title: "#155 the UI uses 28 non-canon colours: 7 greys and 7 three-tone ramps (Jess)"
date: 2026-11-18
issues: [155]
area: ui
canonical: "this file (no other spec named)"
---
# 2026-11-18: #155 the UI uses 28 non-canon colours: 7 greys and 7 three-tone ramps (Jess)

- Every colour the UI shows that is not canon Pokemon is one of 28: 7 neutrals and the 7 UI colours (red, green, blue,
  yellow, purple, pink, teal), one group. Each colour is a light / base / dark ramp made by the accent ramp rule
  (docs/decisions/2026-11-18-155-accent-ramp-rule.md). Names come later; the board shows placeholders.
- The Shop's pocket and belt rims stay canon (Jess 2026-11-18): they already are the Generation IV bag pocket colours
  (UI-PALETTES "Bag"): the Berry pocket rim is pocketBerries, the Team Item pocket rim pocketItems, the bought ball
  belt pocketPokeBalls. They are not folded into the 7 UI colours.
- Canon stays canon and is not counted: the 54 type colours, the status, stat and effect chips, and the canon colours
  the UI borrows (blue's light and dark are the SpA light and shade; grey mid is the Status attack base).
- Lv and HP middle use the canon Electric ramp (Jess 2026-11-18): #fcd659 / #fac000 / #a37d00, the same ramp as the
  PAR chip (Gen VIII+ paralysis matches the Electric icon). The fill moves 4.0 from today's #f3b200 (CIEDE2000), so it
  looks almost unchanged; the shade #9a6110 and the run item box's corner dark #6d5000 both become #a37d00. The
  cursor's yellow ramp stays for selection, so caution and selected stay apart. HP bands: high green, middle Electric,
  low red.

| Group | Colour | light | base | dark |
| --- | --- | --- | --- | --- |
| Neutrals | grey | | #101010, #181818, #303030, #495151, #828282, #e7e7e7, #ffffff | |
| Colours | red (danger, low HP) | #ff8a90 | #fb3041 | #922030 |
| Colours | green (positive, focus) | #7ee078 | #38d030 (focus rim) | #1f721a |
| Colours | blue (EXP) | #66d8f6 (SpA light, canon) | #00baf3 | #0d7f9d (SpA, canon) |
| Colours | yellow (cursor, bonus) | #fff559 | #fff000 (cursor) | #8c8400 |
| Colours | purple (Epic rarity) | #d9a9ff | #c47bff (Epic) | #6c448c |
| Colours | pink (bond, team) | #ffb3e6 | #ff8ad8 (bond) | #8c4c77 |
| Colours | teal (secondary text) | #b4fffa | #8cfff7 | #4d8c88 |

Bases picked by Jess: yellow from the cursor, green from the focus rim, teal from the card-name text, purple from the
Epic rarity colour (added the same day; #8821db was weighed and set aside: 2.78:1 on the panel grey, too dim as a
foreground colour). Nothing in the 28 sits under 3 delta E from another (ink and panel 3.6, on purpose); against canon
the nearest are blue light 3.7 from the Ice base and slate 4.1 from the sleep chip shade; purple's nearest are Fairy
light 12.5 and Poison dark 13.9.

Visible changes when this reaches the game (#126): HP high goes from #00fb49 to the green base (20.3 apart); the
focus rim's light and dark shift to the rule's tones; bonus and gold values move from #ffd23f to the yellow ramp; the
old teal #29ceff card rims become blue; the pause cap red becomes the red base; the Team Item and Berry pocket rims fold
into pink and green; the pause value blue #b9cbf0 and the belt gold still need a home (rims pass).

Supersedes the five-accent table in the accent ramp rule. Canonical: tools/library.html, Colours 2.0 Unified.

Distances: the figures above are CIE76. From 2026-11-18 the board measures CIEDE2000 (about 1 is the smallest step
the eye notices, over 5 clearly different). Re-measured that way every merge still holds; one pair tightens: blue light
#59d2f7 sat 1.9 from the canon Ice base #3dcef3 (3.7 in CIE76). Resolved the same day: blue light became the canon
SpA light #66d8f6 (3.4 from the Ice base) and grey mid became the canon Status attack base #828282 (1.1 from
#7f7f7f), each one hex fewer. Slate stays #495151 (Jess): the canon Status attack dark #555555 was weighed (4.8
away, one hex fewer) and set aside to keep HUD-STYLE's approved B2 blue tint.

## Leftover folds (Jess 2026-11-18)

A coverage check of every colour on Colours (both tabs) and Colours 2.0 Used in Game found 21 with no home. Each folds
to its nearest Unified colour, with a chip's fill and shade kept on one ramp (distances CIEDE2000):

| Today | Where | Becomes | Change |
| --- | --- | --- | --- |
| #ffd23f / #8c7423 | bonus yellow: bonus and gold values, EV adds, Pinap chip | Electric light / Electric dark | 2.6 / 6.9 |
| #ffd23f at 75% | the stat hex's run band | Electric light at 75% | 2.6 |
| #5fe08a / #347b4c | REG chip | green.light / green.dark | 4.9 / 9.0 |
| #ffb347 / #8c6227 | LAN chip | Fighting light / Fighting dark | 5.3 / 10.2 |
| #f4f8ff (and at 16, 40, 60%) | the pause stat hex lines and now band | grey.white (same alphas) | 3.8 |
| #b9cbf0 | pause stat values, move summaries | Flying light | 6.3 |
| #3d8ee0 | the pause hex edge number | Water base | 5.0 |
| #313a46 | the pause Poke Ball's bottom cap | grey.raised | 7.8 |
| #8fdda5 / #3fae5a / #22703a | Rescue wayfinding arrow (#135, still Proposed) | Berries pocket ramp | 7.4 / 4.8 / 3.0 |

- The Electric ramp now carries Lv, HP middle, PAR and the bonus yellow (bonus fill is Electric light, 7.2 from the
  Lv fill, so the two stay apart).
- Not folded: the Main Menu v2 ink shadow #00213a (bw-menu.css) waits for #127 Main Menu v3.0; #f3f3f3, #c6c6c6 and
  the Kanto note are HUD-STYLE / UI-PALETTES text, not game colours.
- The UI-PALETTES sets the game does not use (Seasons, Regions, Egg Groups, the non-Gen IV pockets, Gen I Special) are
  on Colours 2.0 Reference Not in Game.

## The board (Jess 2026-11-18)

tools/library.html, Tokens, Colours has three tabs: Unified (the scheme), Fold Map (every colour the game uses today,
kit by kit, and where it lands on Unified) and Reference Not in Game (the UI-PALETTES sets the game does not use:
Seasons, Regions, Egg Groups, the non-Gen IV pockets, Gen I Special, read from tools/library/doc-colours.js). The old
Colours page (Game palettes, Style docs) and the Colours 2.0 tabs Used in Game, Other, All Colours and Grey Scale Draft
are retired; Colours 2.0 is renamed Colours. The kits and the grey fold stay in the board's code because the Fold Map
reads them.
