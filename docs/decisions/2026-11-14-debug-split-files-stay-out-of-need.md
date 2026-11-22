---
title: "the split debug files stay out of NEED (Jess)"
date: 2026-11-14
issues: []
area: engine
canonical: "ONBOARDING.md, the NEED rule and its exception."
---
# 2026-11-14, the split debug files stay out of NEED (Jess)

Structural review F6 moves the dev commands feature/gym-leader-ai added to debug.js into js/core/debug-run-screens.js
and js/core/debug-leader.js, grouped by subject; each adds its commands onto G.Debug. Like debug.js they are not in
the NEED array: they are dev-only and inert without ?dev, so a missing one must never block the game.
docs/proposals/debug-registry-harness.js checks the wiring instead (every documented command present, no overwrites,
no game reads without ?dev). An exception to the add-every-script-to-NEED rule (ONBOARDING). debug.js stays at about
1346 lines, inherited; moving the move-system tools out is its own issue.

Canonical: ONBOARDING.md, the NEED rule and its exception.
