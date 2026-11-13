# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-13 evening, Quick (work). Branch: feature/gym-leader-ai (rules:
docs/branch-rules/feature-gym-leader-ai.md).

## START HERE (next session, either tool)
1. #39 personalities (5b): open the slice first (goal, how we know it is done, the test; branch rules "Slice shape"),
   then a plan with the coding-principles plan check. It builds on #53's intelligence, overrides and growth.
2. Then #30 (the two red harnesses), then a structural review of the branch against main, then gym-leader-ai
   merges to main.
3. #49: all four build slices shipped (#50 to #53); its Bait end-goal is blocked on #60. Close it, or keep it on #60.
4. Acquisition parent issue (TODO Next 4). Triage (TODO Next 5).

## Where we are
- #53 built and closed 2026-11-13: one intelligence per leader drives misjudge, reflex, dodgeRead, memoryUse and
  aimError; misjudge 0.1 and aimError 10 px at the default. Maps "53 - Intelligence and Misjudge Build Plan", "53 - Plan
  Check". Rulings: decisions 2026-11-13-53-trigger-sets-refuse-intelligence-keep-reflex-floor and
  2026-11-13-53-judgment-guard-allows-misjudge.
- New agent skills in .claude/skills: coding-principles (every plan and approved change), structural-review (the
  pre-merge gate), writing-check (human-facing prose), review-feedback (acting on review findings).
- Leader AI refresher: docs/gym-leader-ai-map.html, map "Gym Leader AI - Refresher Map".

## Watch
- leader-ai.js is 1086 lines (over 1000 before #53); the structural review flags a branch adding about 100 to it.
- #53's mutant run result was not reported to Quick; if unsure, rerun leader-ai-mutate.js.
- smoke-pause-menu "Cards Taken keeps its 400 px box" reads 401 since #83. Unfiled.
- Quick has no node or browser; check.js on the machine is truth.
- Jess's Git Bash: noclobber is on (use >|), and node output cannot be piped or redirected (winpty).
  For mutate results use MUTATE_JSON=<file>, or Jess reads the summary lines.
- Quick writing to the device: use `with open` and read it back.
- Keep new code within 120 columns and run npm run format before the mutate runners.
- GitHub from Quick: api.github.com/search/issues?q=repo:Jess-Rivera/pokesurvivor_fork+is:issue+is:open.

## Open owner decisions
- Acquisition: Accelgor route, Kingambit rule, Gholdengo source, R1 Shedinja, R4 Alcremie N, ball tiers,
  UberElite time limit. #86; #93; #99 menu font (buttons); #97 (blocks #95); #60 Bait; #107 (refuse or rebuild the
  bag); #49 close or keep.

Rules: CLAUDE.md. Maps today: docs/ASCII Concept Maps/ (53 x4, 104, 104b, 104c, 82, Gym Leader AI).
