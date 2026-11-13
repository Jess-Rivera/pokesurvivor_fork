# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-12 night, Claude Code (home). Branch: feature/pause-menu-rework (off feature/gym-leader-ai).

## START HERE (next session, either tool)
1. End of run, three children of #82 (spec PAUSE-MENU section 7, decided 2026-11-12): #92 Run Review (plan
   given, awaiting go), then #103 End Run screen (+ no EVs on quit), then #104 EV screen. When all close, close #82 and
   merge back into feature/gym-leader-ai.
2. File the acquisition parent issue (TODO "Next" item 4), then its slice order. Design only so far.
3. Triage: 7 needs-triage (#93 #75 #97 #99 #100 #101 #102), #29's stale `blocked`, #86 `ready` but carded in Triage.

## Where we are
- #83 CLOSED (Cards Taken counts, move tooltip "Cards:" line, shared pause menu tooltip layer); checks green in
  Quick, feel test passed. #91 closed earlier today. #82 has only #92 left.
- Every pause menu tooltip draws in one shared layer (kit TooltipLayer, the stage's last child, z-index 100; use
  tooltipHandlers / showTooltip). Detail panel tooltip 558 px, 16 px clear of both side panels. Outside: #102.
- Looked at and dropped (Jess, 2026-11-12): moving the team slots above the ball to free a bottom tooltip zone. It fits
  with about 16 px to spare (cards y 25 to 161, grids about 169 to 269, ball ring top 277), not pursued.
- Acquisition rework decided in direction (map Acquisition v1): gacha out, rescue catch, Lost Pokemon recruits,
  candy evolution. Region type maps parked (Biomes v2). Day/night parked as #101.

## Watch
- Quick has no node or browser: harness runs are sandbox bundles; check.js on the machine is truth.
- Quick writing to the device: a bare open().write in Python can silently not land. Use `with open`, read it back.
- Keep new code within 120 columns, or mutate patterns go STALE.
- Acquisition blockers: Accelgor (no Shelmet sprites), Gholdengo (no Gimmighoul), 9 move-gated lines until 8 moves
  are imported; Kingambit's rule cannot happen as written.

## Open owner decisions
- Acquisition: Accelgor route, Kingambit rule, Gholdengo source, R1 Shedinja, R4 Alcremie N, gacha removal and save
  migration, ball tiers, UberElite time limit.
- #86 whole levels; #93 tooltip scope; #99 menu font; #97 upgrade rework (blocks #95); #60 Bait.

Rules: CLAUDE.md. Maps: docs/ASCII Concept Maps/ (Acquisition v1, Biomes v2, 91 series).
