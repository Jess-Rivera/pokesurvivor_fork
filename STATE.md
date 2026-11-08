# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-08, Claude Code (home).
Branch: feature/gym-leader-ai. Branch rules: docs/branch-rules/feature-gym-leader-ai.md (read it now).

## START HERE (next session, either tool)
1. Jess pulls this branch on the other machine.
2. Open #32 (slice 3, ready) in a new chat: agree its goal, done check and test (branch rules "Slice shape"), then the prose plan.
   Its scope additions (dodge lean, gap-closing dodge) are in the #32 comments and LEADER-AI.

## Where we are
- Leader AI (docs/LEADER-AI.md): slices 1 (#22) and 2 (#31) shipped 2026-11-08 (Jess feel-tested slice 2: approved). G.LeaderAI swaps (triggers vs STAY,
  minField 8 s, swapLimit) and dodges (threats from G.LeaderInfo, reflex 0.15 s, seeded bag 6 per 10). Baselines G.LeaderAI.BASE;
  a gym may author `ai` in js/data/gyms.js. Dev: G.Debug.leaderAI({ swaps, dodges }); decision lines in G.Debug.hitbox().
  Test: docs/proposals/leader-ai-harness.js (159), leader-ai-mutate.js (27/27).
- #38 (swap keeps moves in flight, all Player entities) is filed, not started. #37 font swap to Michroma is filed.
- Held-item reveals: #36, blocked on an item rework. Roster UI #35 can read G.GymArena.leaderInfo.rosters().
- Gyms 3 to 8 stay on the old brain. Two leader paths until slice 12.
- Slice 8 DPS report (Q10) still unread: no tempo or power change yet.
- Lint: 0 errors, 72 warnings in inherited code (do not --fix).
- check.js: red only on gym-harness and leader-stats-harness, by design until #30.

## Next
See TODO.md (the handoff, with issue numbers).

## Watch
- Quick cannot run node. After ANY code edit, re-check mutate patterns against the edited files.
- Keep new code within Prettier's 120 columns, or a format pass makes mutation patterns STALE.
- Old leader harnesses (gym-leader, leader-items, -slots, -stats, -team) run with the AI's own decisions off.
- boss-split-mutate "the arena spawns a plain enemy" is STALE (older than slice 1).
- http smokes fail ~1 run in 3 (ERR_NO_BUFFER_SPACE); repeat first.
- Rocky Helmet bugged, rejected on leaders. Bright Powder inert until the AI dodges (it dodges now: recheck).
- File:// font: Chromium blocks Silver-game.ttf (dev.html line 52).
- `move-sim-mutate` "routing filter ignored" is a real MISS (28/29), older than slice 5.

## Open owner decisions
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
