## 2026-11-13, #53: the gyms-only search guard allows `misjudge` (Jess)
The guard in docs/proposals/gyms-only-harness.js (decision 2026-10-31-gyms-only-rifts-legendary-fights-and-the-judgment-are)
bans `judg` across js/ and dev.html, which also matched #53's leader-AI setting `misjudge`. The ban now skips a match right
after "mis": Judgment, judged, judgeTime and arceus are still caught, and a self-check in the harness fails if the
exemption widens. Chosen over renaming the setting, which would change the code, the harness, the mutants, the #53
decision and LEADER-AI.
Canonical: docs/proposals/gyms-only-harness.js section 2 (the search guard).
