# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-14 afternoon, Quick (work). Branch: main, clean and pushed. No branch rules file is live.

## START HERE (next session, either tool)
1. #109 Brock and Misty tuning: open the slice (goal, done-check, test; CLAUDE.md "Slice shape")
   on its own branch off main. Starting notes, not approved: docs/ASCII Concept Maps/39a - Feel Test Retune Plan.html.
2. #49 (utility-AI Decider): close it or keep it as the umbrella. Jess rules.
3. Any time: #121 (move-system dev tools out of debug.js, 1346 lines), #120 (planner verb test gap), #110, #57, #58.
4. #111 host-model slice 12 (gyms 3 to 8) after the tuning, one gym per session, its own branch.

## Where we are
- Merged 2026-11-14: feature/gym-leader-ai (Brock wall, Misty tempo, on the utility-AI Decider; the HUD and pause
  work; the relations test rule). Then the structural review follow-ups: F1 HUD kit split (hud-overlay.js 137 lines
  plus four hud-kit files), F3 planner STEP_BY_VERB table, F6 dev tools into debug-run-screens.js and
  debug-leader.js. F2, F4, F7 landed before the merge; F5 ruled not done.
- check.js all passed on main; full leader-ai-mutate passed; feel tests clean (Jess).
- Rulings: gyms 3 to 8 after the merge; new files count against the 1000-line rule; slice shape repo-wide; non-code
  outputs are Mermaid .md (CLAUDE.md "Output format"); the split debug files stay out of NEED.

## Watch
- Brock 13 and Misty 16 card stacks at level 12, over the 11 a player could hold (#109 checks it).
- GymBrain and the AI player both live on main until slice 12: no features on the old brain.
- smoke-status-fx's frame check failed once on the work machine (28 ms vs 16.7 bare); trust it with a real GPU.
- Merge messages go in tools/cache/merge-msg.txt with -F <file>; git merge -F - does not read stdin.
- Refactor parity: copy the old file to tools/cache first, as tools/planner-step-parity.js does.
- Quick writing to the device: read the file back. Git Bash: noclobber is on (use >|); node output cannot be piped.
- GitHub from Quick: the REST API comes back excerpted; for the board, Jess runs the catch-up gh block into
  tools/cache/catchup.txt.

## Open owner decisions
- #49. #107 (refuse or rebuild the bag); #86; #99; #93; #97 (blocks #95); #60 Bait.
- Acquisition: Accelgor route, Kingambit rule, Gholdengo source, R1 Shedinja, R4 Alcremie N, ball tiers, UberElite
  time limit.

Rules: CLAUDE.md.
