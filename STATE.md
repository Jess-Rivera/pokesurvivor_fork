# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-12, Quick (work machine). Branch: feature/pause-menu-rework (off feature/gym-leader-ai).

## START HERE (next session, either tool)
1. If not done: run node tools/check.js plus run-stats-mutate, team-cards-mutate and gym-leader-mutate, then commit 91-1.
2. Next slice: 91-2, the Run Info panel. Design settled in docs/ASCII Concept Maps/91c; build order in 91e.
   Then 91-3 (Run Stats box, map 91d), then #83, then #92. Merge back into feature/gym-leader-ai when #82 is done.
3. Triage still waiting (TODO.md "Next" item 3).

## Where we are
- Built today (Quick): Vignette setting (Graphics, default off, cached when on); pause menu holds the world still
  while fully open (HUD hidden, no per-frame reads, one redraw on resize or a setting change); fix: the shared grid
  patterns (.hud-defs) stay visible under the hidden HUD; team panel has no frame behind the cards.
- 91-1 built: js/systems/run-stats.js (G.RunStats on runTeam.runStats, beside the DPS record). Burn and poison ticks
  now credit their inflicter (damage, DPS, kill). Counters verified live by Jess in the console.
- #91 rules, all [Approved] in docs/PAUSE-MENU.md sections 4 and 6: kill credit, DoT credit, faints, down time,
  statuses inflicted, Taken / Healed, Region Best (new save field, debug-flagged runs never set it), debug tools.
- Firefox laptop profile: Preact was 1.3%; the HUD's paint (37%) and the vignette fill (18%) were the costs.

## Watch
- Quick has no node: harnesses ran bundled in its sandbox, not real node. Treat check.js on the machine as truth.
- Never edit one file with two parallel edits: one was lost this session (the harness caught it).
- Anything that hides .hud-overlay must leave .hud-defs visible (SVG patterns inherit visibility from their defs).
- Keep new code within 120 columns (Prettier), or mutate patterns go STALE.
- GitHub API returns empty most of the time from Quick; TODO.md is the fallback list.
- Headless: file:// blocks fonts; click #tap-start first; frame-rate checks need GPU flags.

## Open owner decisions
- FPS counter freezes behind the pause menu (file an issue: TODO.md item 6). F3 HUD paint diet only if needed.
- #86 whole levels; #93 tooltip scope; #99 menu font; #97 upgrade rework scope; #60 Bait.
- Bench recharge; boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path).
