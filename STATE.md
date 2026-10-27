# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-26 (Claude Desktop, coding chat; slice files rewritten).

## Where we are
- ON BRANCH feature-test/new-move-schema. Slices 1, 2 and 3a BUILT. None change gameplay; the game still loads none of the new move files.
- Planning docs (all in docs/current feature planning/): combat-architecture.md (APPROVED), combat-validation-and-handoff.md, move-consistency-review.md. Section 9 of the review is the single source for every decision and open item; read it before any slice.
- Slice 3a built: grammar gained persistent, delivery.delay, delivery.range, delivery.locationPick, stat defaults (duration 6, maxStacks 6); casterState.delay retired. Resolver: persistent flag replaces the endOn guess for cd, derives basePower (power x accuracy / 100), fills range (TUNING.RANGE 420) and locationPick (enemy), TUNING.INSTANCE_CAP 8 (unused until 4d).
- Data: Quick Attack returnHits out, Karate Chop fighting, Meteor Mash emit count 1, Toxic Spikes interval emitter (0.25), six novas start 1 with grow.max = old radius, Rock Slide delay on the instance, persistent on fire-spin, leaf-storm, bug-buzz, night-shade, toxic, flame-wheel, ranges Razor Leaf 210 and Bonemerang 230, stat chances restored (Metal Claw 10, Flash Cannon 10, Shadow Ball 20).
- check.js: 17/17 harnesses, export current, 63/63 valid, resolved 63/63 valid. ONE known failure: move_parity self-test "empty override" hard-codes hail (test defect, fix not yet done).

## Next (in order)
1. Jess: commit + push (grammar, resolver, tools, described.json, generated file, reports, docs).
2. Decide: fix the move_parity hail self-test; add the review section 2.4 validator rules; deep-freeze G.MoveDefs (architecture I2). All three were left out of 3a.
3. Slice files 3a to 7 and stage-0.md are rewritten (docs/current feature planning/move-schema/, start at slice-overview.md). Slice 3b (G.MoveGeom) is next, in a fresh coding chat.
4. Still open: maxStacks for Leaf Storm and Metal Claw (before 4a), Gust per-shot spread (before 4d), six unowned issues (review 9.7). Set locationPick per move if wanted (Rock Slide, Spikes, Toxic Spikes, Will-O-Wisp use the enemy default).

## Board note
- Treat #2 as OPEN. #4 closing as not relevant. #3 closes once #2 consumes described.json. #11 has its dataset.

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan with no code, Jess OKs, then build; changelog.js + Markdown docs free-edit. Read-only git and `git fetch` OK; never run `gh` or any repo-changing git: draft commands, Jess runs them. New save fields backward compatible. Debug on dev.html?dev.
