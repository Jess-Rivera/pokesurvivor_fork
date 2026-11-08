# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-08, Claude Code (home), slice 4 shipped.
Branch: feature/gym-leader-ai. Branch rules: docs/branch-rules/feature-gym-leader-ai.md (read it now).

## START HERE (next session, either tool)
1. Jess pulls this branch on the other machine.
2. Open #34 (slice 5, personalities, ready) in a new chat: agree its goal, done check and test (branch rules "Slice shape").

## Where we are
- Slice 4 (#33) shipped 2026-11-08 (feel test approved): G.LeaderMemory (run store), stale reveals, swap tags, the usual-lead
  read (learnRate 3, Misty 2; predictCap 7 in 10). Dev seed: G.Debug.leaderLead(leader, slot, n); rematches dev-only until #24.
- Leader AI (docs/LEADER-AI.md): slices 1 (#22), 2 (#31) and 3 (#32) shipped 2026-11-08 (Jess feel-tested slice 3: approved):
  confidence, pacing (push, breather), dodge lean, gap-closing dodge, triggers and lines. Misty aggression 0.68, Brock 0.35.
  Baselines G.LeaderAI.BASE, CONF, PACE; a gym authors `ai` (settings, triggers, lines) in js/data/gyms.js.
  Dev: G.Debug.leaderAI({ swaps, dodges, confidence, pacing, triggers }).
  Test: docs/proposals/leader-ai-harness.js (449), leader-ai-mutate.js (89/89).
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
