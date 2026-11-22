---
title: "#155 bar.life keeps the B2 background and takes run.hud.playerActive.bar's HP part (Jess)"
date: 2026-11-19
issues: [155]
area: ui
canonical: "this file until #126 applies it; then js/ui/lib/primitives/bar/ and docs/HUD-STYLE.md."
---
# 2026-11-19: #155 bar.life keeps the B2 background and takes run.hud.playerActive.bar's HP part (Jess)

- The Primitives, Bars tab was stale next to run.hud.playerActive.bar. bar.life is now that bar's HP part (the HP tab with
  3 x 5 pixel letters on an ink plate, the 5-row track) without the EXP tab.
- The background is the original B2 shape (outline, checker, body row, drop shadow), not the EXP holder's wings. It grows
  two rows (14 in all) for the thicker track; 231 art pixels wide, so the track is 207.
- Applied at #126. Board: tools/library/bars-draft.js (lifeRows, lifeBarHtml), reading the letters from hud-exp-draft.js.

Canonical: this file until #126 applies it; then js/ui/lib/primitives/bar/ and docs/HUD-STYLE.md.
