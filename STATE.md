# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-12 wrap-up, Quick (work machine). Branch: feature/pause-menu-rework (off feature/gym-leader-ai).

## START HERE (next session, either tool)
1. #83 BUILT, uncommitted until Jess commits. Owed: check.js, smoke-pause-menu, smoke-pause-inventory (both smokes
   rewritten to read the shared tooltip layer), feel test, then edit #83's done-condition, comment and close.
2. Then #92 (end-of-run Team screen on the new panels; it also retires the team sheet's old Run Cards totals and
   is the natural home for #102's sheet tooltips). Merge back into feature/gym-leader-ai when #82 is done.
3. File the acquisition parent issue (TODO "Next" item 10), then its slice order. Design only so far.
4. Triage waiting (TODO "Next" item 3), plus #101 and #102 in needs-triage.

## Where we are
- Cards Taken (#83): count list of the cards that touch this Pokemon (G.TeamCards.takenBy); team-only cards show real
  numbers on hover. Move tooltip "Cards:" line, before and after with (max) (G.TeamCards.changes).
- Every pause menu tooltip draws in one shared layer (kit TooltipLayer, the stage's last child, z-index 100; use
  tooltipHandlers / showTooltip). Detail panel tooltip 558 px, 16 px clear of both side panels. Outside: #102.
- Acquisition rework decided in direction (map Acquisition v1): gacha out, rescue catch, Lost Pokemon recruits,
  candy evolution. Region type maps parked (Biomes v2). Day/night parked as #101.
- team-cards harness 183/183 in Quick's sandbox bundle; nothing run on the machine yet this session.

## Watch
- Quick has no node or browser: harness runs are sandbox bundles; check.js on the machine is truth.
- Quick writing to the device: a bare open().write in Python can silently not land. Use `with open`, read it back.
- GitHub API reaches Quick only partly (empty at wrap-up); TODO.md is the fallback. TODO has no "Board mirror".
- Keep new code within 120 columns, or mutate patterns go STALE.
- Acquisition blockers: Accelgor (no Shelmet sprites), Gholdengo (no Gimmighoul), 9 move-gated lines until 8 moves
  are imported; Kingambit's rule cannot happen as written.

## Open owner decisions
- Acquisition: Accelgor route, Kingambit rule, Gholdengo source, R1 Shedinja, R4 Alcremie N, gacha removal and save
  migration, ball tiers, UberElite time limit.
- #86 whole levels; #93 tooltip scope; #99 menu font; #97 upgrade rework (blocks #95); #60 Bait.

Rules: CLAUDE.md. Maps: docs/ASCII Concept Maps/ (Acquisition v1, Biomes v2, 91 series).
