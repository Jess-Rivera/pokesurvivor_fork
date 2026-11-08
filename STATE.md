# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-08, Claude Code (home).
Branch: feature/gym-leader-ai. Branch rules: docs/branch-rules/feature-gym-leader-ai.md (read it now).

## START HERE (next session, either tool)
1. Jess pulls this branch on the other machine (main is already merged in).
2. Leader AI slice 2 is #31 (ready): open it by agreeing its goal, done check and test (branch rules "Slice shape"), then the prose plan.

## Where we are
- Leader AI (docs/LEADER-AI.md): slice 1 (#22) shipped 2026-11-08. G.LeaderAI (js/entities/leader-ai.js) drives each leader team
  through your seven controller calls, still wrapping GymBrain for movement, slots and casts. G.LeaderInfo (js/systems/leader-info.js)
  holds both rosters and your move and bond reveals. Leader voluntary swaps exist (dev and test only: G.Debug.leaderSwap(slot)).
  Test: docs/proposals/leader-ai-harness.js, with parity against docs/proposals/leader-ai-trace.json (re-record only on purpose:
  LA_RECORD=1). Reveal overlay: G.Debug.hitbox() in a fight.
- Held-item reveals: #36, blocked on an item rework. Roster UI #35 can read G.GymArena.leaderInfo.rosters().
- Gyms 3 to 8 stay on the old brain. Two leader paths until slice 12.
- Slice 8 DPS report (Q10) still unread: no tempo or power change yet.
- Lint: 0 errors, 69 warnings in inherited code (do not --fix).
- check.js: red only on gym-harness and leader-stats-harness, by design until #30.

## Next
See TODO.md (the handoff, with issue numbers).

## Watch
- Quick cannot run node. After ANY code edit, re-check mutate patterns against the edited files.
- Keep new code within Prettier's 120 columns, or a format pass makes mutation patterns STALE.
- boss-split-mutate "the arena spawns a plain enemy" is STALE (older than slice 1).
- If gym-leader-harness section 12 FAILs on defense-curl: Brock's Tackle may starve his buff visit (slice 8 rule).
- http smokes fail ~1 run in 3 (ERR_NO_BUFFER_SPACE); repeat first.
- Rocky Helmet bugged, rejected on leaders. Bright Powder inert until the AI dodges.
- File:// font: Chromium blocks Silver-game.ttf (dev.html line 52).
- `move-sim-mutate` "routing filter ignored" is a real MISS (28/29), older than slice 5.

## Open owner decisions
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
