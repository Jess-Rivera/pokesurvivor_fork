# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-27 evening (Claude Code, home; slice 4c planned, no game code changed).

## Where we are
- Active work: Documentation consolidation (Phase 4, branch chore/documentation-authority-audit). Coding is paused per QA-00 until the consolidation closes (CP7).
- Branch feature-test/new-move-schema, matches origin at 997018f (slice 4b built, playtested by Jess: feels good). Slices 1 to 3d, 4a, 4b DONE.
- This session was planning only. Uncommitted: DECISIONS.md, slice-4c.md and the three new handoffs (slice-4c-1, 4c-2, 4c-3 codehandoff.md), STATE.md, DEVLOG.md. opencode.json is untracked and not ours.
- 4c is split into three sub-slices, each signed off before the next. Decisions are in slice-4c.md and DECISIONS.md: Psychic stays a growing wedge; Bonemerang return pull toward the caster, clamped at the caster's edge; Aura Sphere reach fine; Rock Slide one boulder; orbit radius takes the lens; Razor Leaf joins 4c-2; landing point is the enemy centre; i-frames cover the whole dash plus 0.3 s; the dash holds walking via mvRoot; aimTrack is now implemented (changes Flamethrower), sticky target; Rock Slide telegraph is a low-opacity ring.
- Scout finding: aimTrack, location targeting, delay and falls were never implemented in the sim (grammar only).

## Next (in order)
1. Jess reviews the three handoffs, then starts a coding chat per sub-slice: 4c-1 (deep-freeze G.MoveDefs, ten validator rules, persistent upkeep, orbits, Fire Spin, Leaf Storm, Night Shade), then 4c-2 (leg-keyed hits, returns, repositions, knockback travel, Razor Leaf, Bonemerang, Quick Attack, Aerial Ace), then 4c-3 (aimTrack, location, delay, falls, Rock Slide, Psychic, Confusion, Bubble Beam, Aura Sphere). Routed count goes 21, 24, 28, 33.
2. After 4c: slice 4d (emitters). Fix before 4d: Gust per-shot spread (open), String Shot shot spacing (feel issue, would be #15), remaining review 9.7 low items.
3. Hail toggle item (parked, slice-4b.md S2). Balance pass for all routed moves (new tracker issue, after the slices).

## Board note (snapshot 2026-10-27, docs/issues-snapshot.* and board-snapshot.json)
- 14 items. Shipped #7, #4. In Progress #2. Blocked #3, #8, #11. Accepted #1, #5, #6, #9, #10, #12, #13, #14. Label vs board drift still to fix (#3, #8, #5, #9, #10, #4, #12, #13, #14, #7; #6 title garbled).

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan with no code, Jess OKs, then build; changelog.js + Markdown docs free-edit. Read-only git and `git fetch` OK; never run `gh` or any repo-changing git: draft commands, Jess runs them. New save fields backward compatible. Debug on dev.html?dev.
