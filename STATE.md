# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-14 late morning, Quick (work). Branch: feature/gym-leader-ai (rules:
docs/branch-rules/feature-gym-leader-ai.md). Tree clean, level with origin, 212 commits ahead of main, main gained none.

## START HERE (next session, either tool)
1. #49 (utility-AI Decider): close it (its four build slices and #39 shipped) or keep it as the umbrella. Jess rules.
   Board, by hand if not done yet: #86 Triage to Accepted; #29 out of Blocked unless the CP1 sign-off blocks it;
   #95 "Blocked by" #97 in Relationships; a type label on #79; the new balance and test sweep cards out of Triage.
2. Gyms 3 to 8 ruled: merge first, slice 12 on its own branch after the Brock and Misty tuning
   (decision 2026-11-14-gyms-3-to-8-migrate-after-merge). File its parent issue.
3. Review ruled: F2 and F4 per docs/ASCII Concept Maps/feature-gym-leader-ai - Pre-Merge Fixes Plan.md (awaiting OK),
   F7 done (Jess untracks the file), then the merge. F1, F3, F5, F6 filed as issues. Mutate run passed.
4. Brock and Misty tuning (the balance issue); starting notes: 39a - Feel Test Retune Plan.html (not approved).

## Where we are
- GitHub cleanup done 2026-11-14: #30 closed (both harnesses green), #108 closed not planned, the Brock and Misty
  balance issue and the relations test sweep issue filed, the #60 Bait findings recorded. Branch rules updated:
  check.js must pass, no expected reds.
- 39a built and closed: goal weights and tag multipliers authorable; Brock a wall, Misty tempo; feel test: distinct,
  overtuned. Bait parked in code (decision 2026-11-14-bait-parked-in-code; it won 97 to 98% of think ticks).
- Tests check relations, not values (docs/TEST-FIRST.md step 3, decision 2026-11-14-tests-check-relations-not-values).
  Mechanics harnesses fight test leaders (tools/test-leaders.js). 16e counter-play, learning and sharpness duels retired.
- Tools: MUTATE_ONLY=word,word in tools/mutate-runner.js; harnesses print only failures.
- Non-code outputs are Mermaid .md in docs/ASCII Concept Maps/ (CLAUDE.md "Output format").

## Watch
- Brock 13 and Misty 16 card stacks at level 12, over the 11 a player could hold; now in the balance issue's done-condition.
- leader-ai.js 1090 lines, gyms.js about 1254: the structural review flags both.
- A full leader-ai-mutate run takes about 22 min; inside a slice use MUTATE_ONLY.
- Quick writing to the device: read the file back in a separate call (a write once failed to land).
- Jess's Git Bash: noclobber is on (use >|); node output cannot be piped or redirected (winpty). gh output can.
- GitHub from Quick: Jess runs the catch-up gh block into tools/cache/catchup.txt and Quick reads it.

## Open owner decisions
- #49 close or keep. #107 (refuse or rebuild the bag); #86; #99; #93; #97 (blocks #95); #60 Bait.
- Acquisition: Accelgor route, Kingambit rule, Gholdengo source, R1 Shedinja, R4 Alcremie N, ball tiers, UberElite
  time limit.

Rules: CLAUDE.md.
