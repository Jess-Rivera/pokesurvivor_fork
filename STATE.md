# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-27 (Claude Code, home; slice 4a built, not yet committed).

## Where we are
- ON BRANCH feature-test/new-move-schema. Slices 1 to 3d DONE (3d signed off). Slice 4a (riders on hit) BUILT, waiting for Jess's playtest. Flag off, gameplay is unchanged.
- Quick test: start a run on dev.html?dev&newcombat, then G.Debug.newcombat('riders') in the console (the 4a seven: Body Slam, String Shot, Ice Beam, Bite, Psycho Cut, Giga Drain, Bulldoze; 24 awake slow dummies; overlay prints statuses and stages). G.Debug.newcombat() is still the 3d seven with sleeping dummies. 14 moves routed in total.
- 4a scope grew (Jess OK): enemy.js now respects the trap root for leaving units, jumpers, boss dash and boss leap. Details: move-schema/slice-4a.md.
- check.js: 20/20 harnesses, I1 guard ok (5 files). ONE known failure: move_parity self-test "empty override" hard-codes hail (test defect). Riders harness 97 checks; mutation runners 24/24 and 29/29 (run by hand). Smoke: node tools/smoke-newcombat.js all passed.

## Next (in order)
1. Jess: commit and push 4a, then playtest the rider set (feel of the 2 s String Shot root, Flamethrower burn uptime, Metal Claw x2 Attack later). Feel issues become gh issue drafts.
2. Then slice 4b (self-casts, specials, chains) or 4c (motion extras), either order, then 4d.
3. Fix as we reach them: move_parity hail self-test, review 2.4 validator rules, deep-freeze G.MoveDefs (I2), orbit radius lens (4c), Gust per-shot spread (before 4d), six unowned issues (review 9.7), knockback `direction: travel` (4c).
4. DEVLOG.md is past 40 KB: rotate older entries to docs/DEVLOG-archive.md soon.

## Board note
- Treat #2 as OPEN. #4 closing as not relevant. #3 closes once #2 consumes described.json. #11 has its dataset.

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan with no code, Jess OKs, then build; changelog.js + Markdown docs free-edit. Read-only git and `git fetch` OK; never run `gh` or any repo-changing git: draft commands, Jess runs them. New save fields backward compatible. Debug on dev.html?dev.
