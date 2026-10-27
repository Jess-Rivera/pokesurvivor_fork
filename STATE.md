# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-27 (Claude Code, home; slice 3d signed off, slice 4a planned).

## Where we are
- ON BRANCH feature-test/new-move-schema. Slices 1 to 3d BUILT, 3d SIGNED OFF by Jess (overlay, Life Orb, swaps, density all good). Flag off, gameplay is unchanged.
- Quick test: start a run on dev.html?dev&newcombat, then G.Debug.newcombat() in the console (7 routed moves, 24 sleeping dummies, overlay on). G.Debug.hitbox() toggles the overlay.
- Slice 4a (riders: ailment, flinch, knockback, crit, heal from dealt, stat) is PLANNED. Handoff for the coding chat (Opus): docs/current feature planning/move-schema/slice-4a-codehandoff.md, status PROPOSED until Jess says OK. Decisions in slice-4a.md and review 9.8: Metal Claw and Meteor Mash maxStacks 2, Leaf Storm 1; trap on wild enemies is a 2 s root (bosses, elites, gym leaders cut like freeze, then a 10 s window); String Shot double -2 allowed.
- Backlog issues for 3d (idle prop targeting, ranged boss priority) were sent by Jess.
- check.js: 19/19 harnesses, I1 guard ok (5 files). ONE known failure: move_parity self-test "empty override" hard-codes hail (test defect). Browser smoke: node tools/smoke-newcombat.js (Playwright from C:\Users\boric\tools\playwright, outside the repo).

## Next (in order)
1. Jess: read the 4a handoff and say OK (or edit). Then the planning chat marks it APPROVED.
2. Start a fresh coding chat with the prompt at the bottom of slice-4a-codehandoff.md.
3. After 4a: slice 4b (self-casts, specials, chains) or 4c (motion extras), either order, then 4d.
4. Fix as we reach them: move_parity hail self-test, review section 2.4 validator rules, deep-freeze G.MoveDefs (I2), orbit radius lens (4c), Gust per-shot spread (before 4d), six unowned issues (review 9.7).

## Board note
- Treat #2 as OPEN. #4 closing as not relevant. #3 closes once #2 consumes described.json. #11 has its dataset.

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan with no code, Jess OKs, then build; changelog.js + Markdown docs free-edit. Read-only git and `git fetch` OK; never run `gh` or any repo-changing git: draft commands, Jess runs them. New save fields backward compatible. Debug on dev.html?dev.
