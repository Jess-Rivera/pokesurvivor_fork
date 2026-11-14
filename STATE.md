# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-14 midday, Quick (work). Branch: main. feature/gym-leader-ai merged 2026-11-14 (--no-ff);
its branch rules file is history. No branch rules file is live.

## START HERE (next session, either tool)
1. #49 (utility-AI Decider): close it or keep it as the umbrella. Jess rules.
2. Brock and Misty tuning (the balance issue) on its own branch off main. Starting notes, not approved:
   docs/ASCII Concept Maps/39a - Feel Test Retune Plan.html. It opens with goal, done-check and test (CLAUDE.md
   "Slice shape").
3. F1 hud-overlay.js split built 2026-11-14 on refactor/hud-kit-split (F1 - HUD Kit Split Plan.md): Jess runs format,
   check.js, the smokes, the run-info mutant, a feel test; then merge to main. F3, F5, F6 any time.
4. Host-model slice 12 (gyms 3 to 8, parent issue) after the tuning, one gym per session, its own branch.

## Where we are
- Merged: the leader AI (Brock wall, Misty tempo, on the utility-AI Decider), the HUD and pause menu work, the
  relations test rule. Pre-merge fixes: leader settings in js/data/leader-ai-settings.js (G.LeaderSettings, aliased
  on G.LeaderAI; leader-ai.js 973 lines), the pause key asks the pause menu once (answerPauseKey).
- check.js all passed, full leader-ai-mutate passed, the moved mutants caught, feel test clean (Jess, 2026-11-14).
- GitHub cleanup 2026-11-14: #30 and #108 closed; balance, test sweep, slice 12 and F1/F3/F5/F6 issues filed.
- Rulings today: gyms 3 to 8 after the merge; new files count against the 1000-line rule; slice shape repo-wide;
  non-code outputs are Mermaid .md in docs/ASCII Concept Maps/ (CLAUDE.md "Output format").

## Watch
- Brock 13 and Misty 16 card stacks at level 12, over the 11 a player could hold (the balance issue checks it).
- GymBrain and the AI player both live on main until slice 12: no features on the old brain.
- A full leader-ai-mutate run takes about 22 min; inside a slice use MUTATE_ONLY.
- Quick writing to the device: read the file back in a separate call.
- Jess's Git Bash: noclobber is on (use >|); node output cannot be piped or redirected (winpty). git and gh can.
- GitHub from Quick: Jess runs the catch-up gh block into tools/cache/catchup.txt and Quick reads it.

## Open owner decisions
- #49. #107 (refuse or rebuild the bag); #86; #99; #93; #97 (blocks #95); #60 Bait.
- Acquisition: Accelgor route, Kingambit rule, Gholdengo source, R1 Shedinja, R4 Alcremie N, ball tiers, UberElite
  time limit.

Rules: CLAUDE.md.
