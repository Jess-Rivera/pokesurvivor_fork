# Phase 3: Decisions for the project owner

Eleven decisions, ordered by how much they block migration. "Blocks" means Phase 4 batches that cannot start without the answer (batch numbers refer to phase-3-migration-plan.md). Recommendations are offered only where the evidence supports one; gameplay and design choices are left to the owner.

A short list of minor confirmations that do not block anything is at the end.

---

## OD-01. Which tree is the documentation baseline?
- **Question:** Should Phase 4 edit documents on the move-schema line (feature-test/new-move-schema, e2acd82, where this audit branch was cut) or on main (bb7d685)?
- **Competing claims:** The audit was run on e2acd82. main differs in 69 files and lacks STATE.md, CONTRIBUTING.md, .github templates and ponytail/ (Q-01).
- **Implications:** Documentation fixes made on main would miss most of the files audited; fixes made on the feature line reach main only when that branch merges.
- **Recommended:** edit on a docs branch cut from the move-schema line (the audited tree), and merge it into the feature branch before slice 4c coding starts, so coding chats read corrected headers.
- **Alternatives:** wait until the move-schema branch merges into main, then do one docs pass on main (cleaner history, but agents keep reading stale headers through 4c, 4d and beyond).
- **If deferred:** Phase 4 cannot start.
- **Blocks:** all batches.

## OD-02. What is GDD.md now? (F-001, Q-05)
- **Question:** Is GDD.md (a) a living fork document to be updated, (b) a frozen upstream baseline with a banner, or (c) a baseline whose boss, rift and Judgment sections are marked superseded?
- **Competing claims:** GDD.md:3-4 says it reflects the current game; CLAUDE.md calls it authoritative; BOSS-REWORK.md section 1 (LOCKED) removes rifts, timed bosses and the 30:00 Judgment; code disables them (judgment.js:34, rift.js:27); BOSS-REWORK section 5 lists "update GDD" as deferred cleanup.
- **Recommended:** (c). It is the smallest change that stops agents planning the old boss design, and keeps GDD useful for areas no fork spec covers. Also change the CLAUDE.md reference line from "authoritative" to "baseline reference; fork specs and DECISIONS.md win".
- **Alternatives:** (a) costs a substantial rewrite and makes GDD a second boss spec to keep in sync with BOSS-REWORK; (b) is cheapest but leaves no pointer to what replaced the old sections.
- **If deferred:** agents that follow CLAUDE.md's reference list keep treating removed systems as current (P1 risk).
- **Blocks:** batch 5.

## OD-03. Is BOSS-REWORK.md the canonical boss/gym spec, and what superseded the 30-minute boss? (F-002, F-003, NEW-01, Q-06)
- **Questions:**
  1. Is BOSS-REWORK.md the approved spec for bosses, gyms, elites and the level curve?
  2. Which of its sections are locked today (section 3 heading says DRAFT while 3a and 3e say LOCKED)? Is BOSS-AUTHORING.md a draft or the implemented schema?
  3. Is the feature/boss-rework branch closed, and should CONTEXT.md stop naming BOSS-REWORK.md as the active tracker?
  4. **NEW-01:** DECISIONS.md 2026-10-17 says difficulty Phase 2 starts after the 30-minute boss, with a Standard Run / Unlock Safeties choice. BOSS-REWORK.md:15 and :18 remove that boss and put an L50 clamp then a slow ramp after the gym list. Is the 2026-10-17 Phase 2 design superseded, moved (for example to after Gym 8 or the Elite Four), or still wanted?
- **Evidence:** in-document labels only ("LOCKED 2026-10-22, Jess"); code follows BOSS-REWORK (stats.js:52 clamps at L50, gymsDone unused); the boss-rework ruling cited by BOSS-REWORK exists only in docs/DECISIONS-archive.md:503.
- **Recommended:** confirm (1); answer (2) per section; for (3), let STATE.md name the active tracker. (4) is a design decision with no recommendation from the audit.
- **Alternatives:** split BOSS-REWORK.md into a spec and a separate change log (more files, cleaner roles). Not recommended unless the change log keeps growing.
- **If deferred:** two documents in the register (GDD, DECISIONS 2026-10-17) still describe a 30-minute boss as current, and the startup context points to an inactive tracker.
- **Blocks:** batches 3 and 4 (tracker pointer, DECISIONS annotations), batch 5.

## OD-04. What is a "loop", and does difficulty rise per loop? (F-004, Q-07)
- **Question:** Does "loop" in BOSS-REWORK section 4 ("multipliers go up each loop", Keep Going, DEFERRED) mean the same as the six loops per region in docs/FULL-GAME-STRUCT.md ("no difficulty ramp on repeat clears")? And is FULL-GAME-STRUCT.md approved scope, a draft, or a chat paste?
- **Evidence:** FULL-GAME-STRUCT.md is untitled and undated (one commit, 3dfeb23); GYM-ROSTERS.md cites it; gym.js:21 loop counter is dev-set; nothing is built.
- **Recommended:** none on the design. On the document: give FULL-GAME-STRUCT.md a title, date and status, or fold its rules into BOSS-REWORK.md, whichever the owner prefers.
- **If deferred:** low present risk (unbuilt); risk of building the wrong progression later.
- **Blocks:** the FULL-GAME-STRUCT part of batch 5 only.

## OD-05. Agent rules: precedence, read-only git, commit trailers (F-012, F-013, F-014, Q-03, Q-14)
- **Questions:**
  1. Did you approve the 2026-10-25 change allowing read-only git and `git fetch`? If yes, should DECISIONS.md record it and mark "never runs git, ever" (2026-10-17) and the 2026-10-20 "UNCHANGED" clause as superseded?
  2. Confirm that CLAUDE.md wins over CONTEXT.md when they differ.
  3. Confirm that the project rule "no Co-Authored-By or AI signature" governs over any tool's default.
- **Evidence:** first appearance in 598211b "Updating markdowns" (2026-10-25); CLAUDE.md:59-61 and CONTEXT.md agree; no DECISIONS entry.
- **Recommended:** yes to all three if they match your intent; they reflect current files.
- **Alternative for (1):** revert to "never runs git" (the stricter, safe reading).
- **If deferred:** DECISIONS.md says something different from the startup files; an agent that reads DECISIONS.md is stricter than intended, which is safe but inconsistent.
- **Note:** the Amazon Quick agent's instructions are outside the repo; check them for the same wording.
- **Blocks:** batch 3.

## OD-06. Which register holds move-schema decisions? (F-007, Q-04, EC-05)
- **Question:** Before slice 7, where do move-schema decisions live: DECISIONS.md, move-consistency-review.md section 9, or both with a split?
- **Evidence:** section 9 holds Checkpoints 1 to 3 and slices 3a to 4b; DECISIONS.md holds slices 1 and 2 (2026-10-25/26) and 4c planning (2026-10-27); slice-overview.md:24 still says section 9 is the single source; slice-7.md:6 already plans to move Checkpoint 1 to 3 decisions into DECISIONS.md.
- **Recommended:** DECISIONS.md is the single register from now on. Freeze section 9 with a one-line header ("register for Checkpoints 1 to 3 and slices 3a to 4b; new decisions go to DECISIONS.md; merged at slice 7"), and change slice-overview.md:24 to say the same. This matches what the 4c session already did and the slice-7 plan, and avoids a mid-branch bulk move.
- **Alternatives:** (b) section 9 stays the move-schema register and the 4c entries are copied into it (keeps a domain register, but contradicts PM-WORKFLOW's "a ruling goes in DECISIONS.md" and doubles the 4c entries); (c) merge everything into DECISIONS.md now (cleanest, but a large edit during active slice work).
- **If deferred:** the next coding chat follows slice-overview.md to section 9 and misses the 4c decisions it is about to implement.
- **Blocks:** batch 6. **Time-sensitive:** before slice 4c-1 coding starts.

## OD-07. How are approvals recorded, and do you ratify the historical labels? (F-002, F-005, F-006, F-010, EC-01)
- **Questions:**
  1. Adopt rule R1 (an approval is a dated, owner-tagged DECISIONS.md entry written in the session and committed by you) and R4 (status lives in one status home per effort, not in headers)?
  2. Ratify, in bulk, the existing labels: BOSS-REWORK LOCKED sections, the Checkpoint 1 answers Q1 to Q17 as written in combat-architecture.md, the architecture approval of 2026-10-26, and sign-off of slices 3d, 4a and 4b?
- **Evidence:** the Q1 to Q17 answers were never committed in their original form (git a68a366, EC-01); all other approvals are AI-written prose; commits are yours, which is the strongest available evidence.
- **Recommended:** adopt R1 and R4; ratify in bulk with exceptions listed, rather than item by item.
- **Alternatives:** leave history unratified and apply R1 only going forward (cheaper, but the move-schema foundation stays "owner-labelled, unverified" in audit terms).
- **If deferred:** status-header cleanup (batch 2) can still run on facts (code and commits), but documents cannot be marked "approved" with confidence.
- **Blocks:** the "approved" wording in batch 2.

## OD-08. Are the upstream-derived documents maintained? (F-017, F-018, F-019, Q-08, Q-16)
- **Question:** For README.md, ONBOARDING.md, GLOSSARY.md, docs/ORIGINAL-OWNER-RULES.md and CONTRIBUTING.md: maintain (fix run, build and SEO lines now), banner as upstream text, or defer to the publish phase? Where do the SEO generators live now (deleted in f853071; DECISIONS 2026-10-20 says _delete_/, which is empty)?
- **Evidence:** README.md:7 and ONBOARDING.md:19 say open index.html, which the source tree no longer contains; README.md:90 links a missing file and a hosting route DECISIONS rejects.
- **Recommended:** fix the "how to run from a source checkout" lines now (they mislead new tools and playtesters); defer publish and SEO text to the publish phase.
- **If deferred:** a new tool or playtester following README cannot run the game.
- **Blocks:** batch 7.

## OD-09. Where does work status live in the repo? (F-015, Q-02, Q-17)
- **Question:** The board wins for "what next" (already declared). Should board snapshots be tracked so both tools can read them, or should STATE.md stop citing gitignored files? Should TODO.md keep its status mirror at all?
- **Recommended:** stop citing gitignored snapshots in STATE.md; keep STATE.md's own short board note as the in-repo summary. Whether to keep TODO.md's mirror is your preference.
- **If deferred:** low risk; the other tool reads a three-day-older mirror.
- **Blocks:** nothing critical (batch 7).

## OD-10. CREDITS.md contact data (F-021, Q-18)
- **Question:** Is CREDITS.md exempt from the .gitignore policy that third-party contacts never go in the public repo? Were the upstream contacts published with consent?
- **Evidence:** about 10 email-like strings in a tracked, public file inherited from upstream.
- **Recommended:** none from the audit; this is a privacy and courtesy question. Note that editing the file does not remove the strings from history.
- **If deferred:** status quo; no documentation-authority effect.
- **Blocks:** nothing (kept out of migration).

## OD-11. Parked, unreferenced and third-party documents (F-024, Q-09 to Q-12)
- **Question:** For FEATURES_GRAB.md, the four parked design notes (RUN-ITEM-THINK-DOC, SPEED-IVEV-SLICE, BULLET-TIME-DESIGN, PERF-HOTPATH-NOTES), the four ASCII maps, the generated move reports (hand-filled column in a "do not edit" file), and ponytail/skills/: add a one-line status header, leave as is, or turn backlog items into issues?
- **Recommended:** one-line status headers only where a file could be mistaken for a requirement (FEATURES_GRAB, the parked designs); add one CLAUDE.md line saying third-party skills never override project rules.
- **If deferred:** low risk.
- **Blocks:** nothing critical (batch 7).

---

## Minor confirmations (no blocking effect)

- **F-020 em-dash scope:** recommend the rule applies to newly written fork prose; archives (verbatim) and upstream text exempt. Fix the fork-authored hits in DECISIONS.md, BALANCE.md, BOSS-REWORK.md, CONTRIBUTING.md opportunistically.
- **F-025 elite cadence:** is the gym-cycle hook for elites queued? If yes, which board item.
- **F-016 STATE git lines:** keep as is (expected), or phrase as "uncommitted at time of writing".
- **temp-audit-outputs/:** after Phase 4, delete the folder or keep one summary under docs/.
