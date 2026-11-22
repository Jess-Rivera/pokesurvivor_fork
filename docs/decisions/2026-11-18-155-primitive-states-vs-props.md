---
title: "#155 a primitive's states are what it shows on its own; everything a screen sets is a prop (Jess)"
date: 2026-11-18
issues: [155]
area: ui
canonical: "the story files' headers (tools/library/stories/\\*.story.js, moved from js/ui/lib/primitives/ 2026-11-19). Plan and as-built: docs/ASCII Concept"
---
# 2026-11-18: #155 a primitive's states are what it shows on its own; everything a screen sets is a prop (Jess)

- A state is a condition the piece itself shows: at rest, focused, refused, disabled, dimmed, fainted, filled, empty,
  an HP band. The board draws each state as a tile, named the piece's name plus the state (`portrait.round.fainted`).
- A prop is how a screen sets the piece up: size, stroke, rim and body colours, text, content, a ring. The board lists
  each piece's props in a table (name, values, what it does) under its tiles, and never draws a prop as a tile.
- A setup a screen uses (a leader circle, a roster face, the weather timer, a dual-type panel) is a place name on the
  piece and, when it earns a page, a composite under Composites. It is not a state and not a separate primitive.
- Free props stay free: a piece takes the screen's numbers (the portrait's size and stroke stay props, 116 / 48 / 44 px
  and 4 / 2 px), with no preset sizes, so nothing in the game changes look.
- tools/smoke-ui-library.js holds the list of each piece's states and fails when the board draws one more or one fewer,
  or when a piece has no props table.

Applied 2026-11-18 to every primitive page: portrait.round 7 tiles to 3 (rest, active, fainted), button.slanted 5 to 3
(rest, focusPositive, focusNegative, the rounded button's intent names), and the panels, bars and dialog trimmed the
same way (34 tiles in all). The game is unchanged: only the story files, tools/library.html and the smoke changed.

Canonical: the story files' headers (tools/library/stories/\*.story.js, moved from js/ui/lib/primitives/ 2026-11-19). Plan and as-built: docs/ASCII Concept
Maps/155c-6 - Primitive States and Props Plan.md.
