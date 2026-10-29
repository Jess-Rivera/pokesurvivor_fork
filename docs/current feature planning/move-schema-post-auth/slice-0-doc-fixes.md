# Slice 0: doc fixes before coding resumes

Back to slice-overview.md. Next: slice-4c-0.md.

## Objective
Make the documents a coding chat reads agree with the owners before 4c starts. Markdown only, no game files. Docs are free-edit under CLAUDE.md, but Jess approves this list first (audit rule: "I approve changes before anyone edits").

## Items (finding ids from ../AUDIT-vs-sources-of-truth.md)

Pointers and status homes:
1. Put a short banner at the top of ../move-schema/slice-overview.md: history from 2026-10-28, live plan in move-schema-post-auth/.
2. Repoint the "Status home" line of docs/MOVE-AXIS-SCHEMA.md, docs/MOVE-INTENT.md, combat-architecture.md and combat-validation-and-handoff.md to this folder's slice-overview.md.
3. STATE.md: replace "The slice files will be reworked on return to that branch" with a pointer to this folder.
4. DECISIONS.md: add one log entry for the branch end (merge after 7b, gym-roster import in a new branch) and the code-gap rule, with Canonical: this folder's slice-overview.md.

Fixes the 4c build needs (HIGH and MEDIUM):
5. F-4C-1: slice-4c.md conflict list gains the aimTrack line (sticky rule, MOVE-INTENT flamethrower).
6. F-4C2-1: repoint "(D2)", "(D3)" in 4c-2 P8 and "(D1, D2)" in 4c-3 P2 to MOVE-INTENT quick-attack and flamethrower.
7. F-4C-ALL-1: add the Startup review citations to each 4c handoff's conflict list, with the owner to read instead.
8. F-ARCH-1: prefix review Checkpoint 1 question numbers as CP1-Qn in architecture, validation, slice-4c and the 4c handoffs.
9. F-HOME-1: add the per-leg pierce reset (R2 or D16) and the seeded-rng location pick (R9 or selectTarget) to architecture section H.
10. F-4C-2, F-4C-3: correct the slice-4c R2 test wording and the Razor Leaf canary note.
11. F-OV-1, F-OV-2: superseded by item 1 (the old overview becomes history).

Drift risk (MEDIUM): F-ARCH-2 to F-ARCH-6, F-VAL-1 to F-VAL-5, F-S5-1 (now carried by slice-5.md here), F-REP-1, F-REP-2 (regenerate both reports with --report; this runs tools, so check.js must stay green).

Cosmetic (LOW), optional in the same pass: F-ARCH-7, F-ARCH-8, F-4C-4, F-4C1-2, F-VAL-6, F-OV-4, F-S6-1, F-S4D-1, F-REP-3.

## Not in this slice
The two owner decisions D-LEAF and D-PSY (audit section 2). The answers land in MOVE-INTENT and architecture H when given, then in this slice's Results.

## Proceed when
Jess has approved the item list, the edits are made, no em-dashes were added, cited paths resolve, and check.js is green.

## Results
- Pass 1 (items 1 to 4), 2026-10-29: banner on ../move-schema/slice-overview.md; Status home repointed in four docs; item 3 already done by the 2026-10-28 STATE rewrite; DECISIONS entry for branch end and code-gap rule.
- Pass 2 (items 5 to 10), 2026-10-29: items 5, 6, 7, 10 already carried by the 4c-n correction lists. Item 8: review numbers in architecture and validation written as move-consistency-review:CP1-Qn (new CLAUDE.md "Cross-document IDs" rule). Item 9: combat-architecture:H22 (per-leg pierce) and H23 (seeded-rng location pick).
- Pass 3 (drift risk), 2026-10-29: F-ARCH-2 to F-ARCH-6 and F-VAL-1 to F-VAL-5 applied (history banners on architecture G and Summary and validation section 3; status lines; C8 self-buff scope; Metal Claw cap pointer; nova 1 px; validator rules in 4c-1; Thunderbolt ratios; six Intended lines removed, resolved Open lines point at owners). F-S5-1 already carried by slice-5.md. F-REP-1 and F-REP-2 deferred by Jess (reports not regenerated).
- Pass 4 (LOW cosmetic): not started.
