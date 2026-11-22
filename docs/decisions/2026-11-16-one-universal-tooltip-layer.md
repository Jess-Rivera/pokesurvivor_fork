---
title: "one universal tooltip layer, the topmost thing on the page (Jess)"
date: 2026-11-16
issues: []
area: ui
canonical: "docs/HUD-STYLE.md \"Fonts\" (the tooltip rules) and js/ui/hud-kit-items.js."
---
# 2026-11-16: one universal tooltip layer, the topmost thing on the page (Jess)

- Every hover tooltip on every screen is drawn in ONE layer the HUD kit puts on the page itself: fixed over the whole
  window, the body's last child, z-index 1000, never catching the pointer. Screens no longer mount a layer of their own.
  Replaces "the topmost layer of its screen" (2026-11-12): per-screen layers fought over the kit's one record, and closing
  the catch screen left the pause menu with no tooltips (136b bug 1).
- Nothing else on the page may reach z-index 1000.
- A tooltip is drawn at its screen's scale, follows its anchor every frame and hides when the anchor goes away.
- Why one layer: nested tooltips (Path of Exile style) are wanted later; they need one place above every screen. Not built
  yet; when they are, the tooltip state becomes a stack.
- #102 (tooltips outside the pause menu) now has the layer to move onto; it stays open for the old team sheet's tooltips.

Plan: docs/AI Outputs/Issue-136/136b - Catch Screen Redesign Plan.md, "Bug 1".
Canonical: docs/HUD-STYLE.md "Fonts" (the tooltip rules) and js/ui/hud-kit-items.js.
