# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-13 afternoon, Quick (work). Branch: feature/gym-leader-ai (rules:
docs/branch-rules/feature-gym-leader-ai.md). feature/pause-menu-rework merged into it 2026-11-13 (78d69120).

## START HERE (next session, either tool)
1. #53 leader intelligence: designed, NOT approved. Read the top of map "53 - Intelligence and Misjudge Build
   Plan" (decided / open / first). Ask Jess what he wanted to change, confirm R2 (aimError 10 px at the default),
   get approval, then build. Rules: decision 2026-11-13-53-leader-intelligence-one-score-with-overrides.
2. Then #39 (personalities), then #30 (the two red harnesses), then gym-leader-ai merges to main.
3. Acquisition parent issue (TODO Next 3). Triage (TODO Next 4).

## Where we are
- Leader AI refresher: docs/gym-leader-ai-map.html (interactive), map "Gym Leader AI - Refresher Map".
- #53 design: one `intelligence` (base + growth 0..0.2 per loop) drives misjudge, reflex, dodgeRead, memoryUse,
  aimError through two-line curves meeting at the default; nothing perfect at the top; overrides allowed.
- #56 closed on a 0-STALE scan (63 retargeted, 1 removed); the 13 scripts were not re-run after.
- #82 and #104 closed; pause menu rework merged.

## Watch
- smoke-pause-menu "Cards Taken keeps its 400 px box" reads 401 since #83. Unfiled.
- Quick has no node or browser; check.js on the machine is truth.
- Jess's Git Bash: noclobber is on (use >|), and node output cannot be piped or redirected (winpty).
  For mutate results use MUTATE_JSON=<file>, or Jess reads the summary lines.
- Quick writing to the device: use `with open` and read it back.
- Keep new code within 120 columns and run npm run format before the mutate runners.
- GitHub from Quick: api.github.com/search/issues?q=repo:Jess-Rivera/pokesurvivor_fork+is:issue+is:open.

## Open owner decisions
- #53: R2 and the unnamed change (above).
- Acquisition: Accelgor route, Kingambit rule, Gholdengo source, R1 Shedinja, R4 Alcremie N, ball tiers,
  UberElite time limit. #86; #93; #99 menu font (buttons); #97 (blocks #95); #60 Bait.

Rules: CLAUDE.md. Maps today: docs/ASCII Concept Maps/ (104, 104b, 104c, 82, Gym Leader AI, 53 x3).
