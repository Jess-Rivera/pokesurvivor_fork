# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-12 evening, Quick (work machine). Branch: feature/pause-menu-rework (off feature/gym-leader-ai).

## START HERE (next session, either tool)
1. #91 is CLOSED. #83 BUILT, still owed: Jess runs check.js and smoke-pause-menu, feel test, comment and close #83.
   Then #92. Tooltip top layer (built with #83): re-run smoke-pause-menu and smoke-pause-inventory, feel test.
2. File the acquisition parent issue (TODO "Next" item 10), then decide its slice order. Design only so far.
3. Triage waiting (TODO "Next" item 3), plus new #101 and #102 in needs-triage.

## This session (design only, no js/ touched)
- Types-by-region dashboard: docs/type-region-dashboard.html (static snapshot of pokedex.js + enemy-classes.js).
- Region type maps PARKED: 8 type maps (all 18 types) + 1 Stage 3 map per region. Map: Biomes v2.
- Acquisition rework DECIDED in direction (map: Acquisition v1, rounds 1 to 16):
  gacha and tickets out (payouts become coins); rescue event (4% +4%/min roll, 60 s, UberElite, catch odds =
  star-tier BST ladder x ball x time left, Flee by nature, 6-ball belt restocked with coins); Lost Pokemon
  recruits Stage 1s with an evolution, any region, 20/12/6% by star; evolution only by candy + mainline
  requirements (stones from gyms, Link Cable + trade items in the Shop, in-run flags, Team Menu evolve).
- Day/night cycle filed as #101 (parked). Tooltip issue filed as #102.

## Watch
- Quick has no node or browser: harness runs are sandbox bundles; check.js on the machine is truth.
- GitHub API reaches Quick only partly; TODO.md is the fallback list. TODO has no "Board mirror" section.
- Keep new code within 120 columns, or mutate patterns go STALE.
- Blocked in the acquisition design: Accelgor (no Shelmet sprites), Gholdengo by evolution (no Gimmighoul),
  9 move-gated lines until 8 moves are imported. Kingambit's rule cannot happen as written (elites never repeat).

## Open owner decisions
- Acquisition: Accelgor route, Kingambit rule, Gholdengo source, R1 Shedinja two copies, R4 Alcremie N,
  A1/A3/C2 gacha removal and save migration, ball tiers, UberElite time limit X.
- #86 whole levels; #93 tooltip scope; #99 menu font; #97 upgrade rework (blocks #95); #60 Bait.

Rules: CLAUDE.md. Acquisition: docs/ASCII Concept Maps/Acquisition v1 - Catch, Candy, Legendaries.txt.
