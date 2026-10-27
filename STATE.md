# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-27 (Claude Code, home; slice 4b built, waiting for Jess's playtest).

## Where we are
- ON BRANCH feature-test/new-move-schema. Last commit 91b6c39; slice 4b plus the earlier 4b planning docs are UNCOMMITTED.
- Slices 1 to 3d and 4a DONE and signed off. 4b BUILT: 21 routed moves (7 new: Swords Dance, Dragon Dance, Aqua Ring, Substitute, Dragon Rage, Hex, Thunderbolt) plus Flamethrower's new commitment (slowed and cooldown freeze for its 1.0 s cone). Flag off, gameplay is unchanged.
- New decision S15 (Jess, during the build): chains go to enemies they have not hit yet first, then may revisit (never the enemy just hit).
- Quick test: dev.html?dev&newcombat, then G.Debug.newcombat('selfcasts') or ('specials'); ('riders') and newcombat() still work.
- check.js all green: 21/21 harnesses, I1 guard ok, move data ok (hail self-test fixed). Selfcast harness 83 checks; mutations 35/35, 24/24, 29/29 (by hand). Smoke: all passed.

## Next (in order)
1. Jess playtests 4b (feel: Flamethrower slowed with about 46% uptime, Substitute strength, Aqua Ring, chain bolts). Then commit and push.
2. Slice 4c (motion extras; Night Shade arrives there), then 4d. Fix as we reach them: review 2.4 validator rules, deep-freeze G.MoveDefs (I2), orbit radius lens (4c), Gust per-shot spread (before 4d), knockback `direction: travel` (4c), String Shot shot spacing, remaining unowned items (review 9.7).
3. Hail toggle item (parked design questions in slice-4b.md S2).
4. Balance pass for all routed moves (new tracker issue, after the slices).

## Board note (snapshot 2026-10-27, docs/issues-snapshot.* and board-snapshot.json, uncommitted)
- 14 items. Shipped #7, #4. In Progress #2. Blocked #3, #8, #11. Accepted #1, #5, #6, #9, #10, #12, #13, #14. String Shot feel issue not filed yet (would be #15).
- Label vs board drift still to fix (#3, #8, #5, #9, #10, #4, #12, #13, #14, #7; #6 title garbled).

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan with no code, Jess OKs, then build; changelog.js + Markdown docs free-edit. Read-only git and `git fetch` OK; never run `gh` or any repo-changing git: draft commands, Jess runs them. New save fields backward compatible. Debug on dev.html?dev.
