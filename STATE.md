# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-27 (Claude Code, home; slice 3d built).

## Where we are
- ON BRANCH feature-test/new-move-schema. Slices 1 to 3d BUILT. Flag off, gameplay is unchanged.
- Slice 3d: the new move system loads with the game and runs only with dev.html?dev&newcombat (single-player). The 7 canaries (tackle, ember, water-gun, hydro-pump, heat-wave, mud-shot, flamethrower) go through G.MoveSim; every other move stays legacy. The routed list lives ONLY in js/systems/move-route.js.
- Quick test: start a run on dev.html?dev&newcombat, then G.Debug.newcombat() in the console (7 routed moves in slots, 24 sleeping dummies, overlay on). G.Debug.hitbox() toggles the overlay. Cycle slots to try each move.
- Planning docs: docs/current feature planning/ (combat-architecture.md APPROVED, validation, review section 9). Slice files: move-schema/, start at slice-overview.md. 3d results are in slice-3d.md.
- check.js: 19/19 harnesses, I1 guard ok (5 files). ONE known failure: move_parity self-test "empty override" hard-codes hail (test defect). Browser smoke: node tools/smoke-newcombat.js (Playwright from C:\Users\boric\tools\playwright, outside the repo).

## Next (in order)
1. Jess: one-minute playtest of the 7 canaries with ?dev&newcombat (overlay lines up, HUD ring and flash, Life Orb, swaps, density at G.Debug.skipTo(20) vs flag off). Sign off, or report feel issues as backlog issues.
2. Run the drafted gh commands for the backlog (idle prop targeting, ranged boss priority, Tackle reach if flagged).
3. Slice 4a (riders: ailment, flinch, knockback, crit, heal, stat) in a fresh coding chat.
4. Still undecided from 3a: fix the move_parity hail self-test; review section 2.4 validator rules; deep-freeze G.MoveDefs (I2).
5. Still open: orbit radius lens (4c); maxStacks for Leaf Storm and Metal Claw (before 4a); Gust per-shot spread (before 4d); six unowned issues (review 9.7).

## Board note
- Treat #2 as OPEN. #4 closing as not relevant. #3 closes once #2 consumes described.json. #11 has its dataset.

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan with no code, Jess OKs, then build; changelog.js + Markdown docs free-edit. Read-only git and `git fetch` OK; never run `gh` or any repo-changing git: draft commands, Jess runs them. New save fields backward compatible. Debug on dev.html?dev.
