# Phase 3A: Owner questionnaire

Fifteen questions, grouped by underlying decision. Each one replaces or merges one or more Phase 3 decisions (mapping in section F). Subject, gap and evidence IDs refer to phase-3a-consolidation-map.md.

Classes:

- `OWNER_DECISION_REQUIRED` genuine design intent or a consequential trade-off is unknown.
- `OWNER_CONFIRMATION_RECOMMENDED` a well-supported recommendation needs your OK.
- `ROUTINE_CONSOLIDATION` evidence-supported, no change to intended behavior (listed in section E for one blanket approval).
- `DEFERRED` low priority or evidence too thin.

How to answer: for confirmations, "yes" or "yes except ...". For decisions, pick an option or write your own. A short answer is enough; the migration records it as a dated DECISIONS.md entry that you commit.

**Answer first (they gate the most work):** QA-00, QA-01, QA-02, QA-07. **Time-sensitive:** QA-05, because slice 4c coding is reading the move-schema decisions now.

---

## A. Documentation model

### QA-00. Which tree is the documentation baseline? (carried over unchanged from OD-01)

- **Class:** OWNER_DECISION_REQUIRED.
- **Decision:** edit documents on a docs branch cut from the move-schema line (where this audit was run) or wait and do it on main after the move-schema branch merges.
- **Competing facts:** the audit ran on e2acd82; main lacks STATE.md, CONTRIBUTING.md and about 69 changed files (Phase 1 Q-01).
- **Recommended:** a docs branch from the move-schema line, merged back into that line between 4c sub-slices.
- **Alternative:** wait for main (cleaner history; agents keep reading conflicting sources through 4c, 4d, 5, 6).
- **If deferred:** nothing can start.

### QA-01. What is DECISIONS.md for?

- **Class:** OWNER_CONFIRMATION_RECOMMENDED.
- **Decision:** keep DECISIONS.md as a register that holds full rule text (Phase 3 model), or turn it into a decision log whose entries say what was decided, why, and point to the spec section that now holds the rule.
- **Competing requirements:** DECISIONS.md:3 "treat it as settled" and :7 "at most about 10 lines (the rule and the why); long detail belongs in the harness or proposal doc"; in practice entries hold full specs (escalation, damage model, move grammar), so the same rule exists in DECISIONS.md and a spec (map section 1.1).
- **Why it matters:** this is the single biggest source of duplicated active requirements. With a register, every spec rule has a twin to keep in sync; with a log, a rule has one home.
- **Recommended:** decision log. Entry format: date, owner tag, one to three lines, `Canonical: <path> <section>`. Project-wide principles with no subsystem (density north star, performance stance, docs portability) keep their full text in DECISIONS.md, unless they are agent rules (those live in CLAUDE.md). Superseded entries move verbatim to the archive with a "current rule in" header.
- **Alternatives:** (b) Phase 3 register with supersession markers (smaller edit now, permanent sync burden and chains of markers); (c) remove DECISIONS.md and keep rationale inside specs (loses the chronological "why" view both tools rely on).
- **If deferred:** batches B3 to B8 can still add canonical content, but cannot remove the DECISIONS.md copies, so duplication grows.

### QA-02. What is GDD.md now? (replaces OD-02)

- **Class:** OWNER_DECISION_REQUIRED.
- **Decision:** (a) the fork's living game-design overview, rewritten so every section either states the current rule briefly or points to the subsystem spec; (b) a frozen upstream baseline with banners on stale sections (close to Phase 3's recommendation).
- **Competing requirements:** GDD.md:3-4 "living ... current state"; CLAUDE.md calls it authoritative; it is stale in boss, rift, Judgment and also enemies (cap 280 vs 64), crowd elite bonus, items (one per run vs three tiers), move families, ticket sources, targeting, and its own Pending list (NE-11, SG-17). The fork's rules for enemies, items and economy exist only in the archive (NE-01).
- **Why it matters:** with (b), enemies, items, economy and meta have no current home at all; their rules stay in the archive or get a new document each. With (a), one existing file covers them.
- **Recommended:** (a). The umbrella covers concept, screen flow, world, enemies summary, items, economy, meta, and points to BOSS-REWORK.md, COMBAT-RULES.md and the move docs. Its old decision log section moves to history. CLAUDE.md's reference line becomes "GDD.md: game overview; subsystem specs listed in it win for their subjects".
- **Alternative (b):** cheaper now; needs new documents later for enemies and items, or leaves them archive-only.
- **If deferred:** S-13, S-14, S-15 cannot be consolidated; agents keep reading stale GDD sections as current.

### QA-03. Create one new document, docs/COMBAT-RULES.md?

- **Class:** OWNER_CONFIRMATION_RECOMMENDED.
- **Decision:** approve one new canonical spec for stats, HP, damage formula and dials, type chart, crit, status effects and stat stages.
- **Competing requirements:** these rules are spread across DECISIONS.md (2026-10-17 entries), the archive (Status Slices C, D, E, crit), BOSS-REWORK 3c, stat-model-design-notes.md, BALANCE.md, BUFF-TABLE.md and combat-architecture D6 to D11 (S-09, S-10). No existing file owns them, and both the legacy combat and the new move system consume them (C-01, C-02, C-05).
- **Recommended:** yes. It is the only new file in the plan. Alternatives considered: putting them in GDD section 3 (makes GDD long and mixes overview with formulas), in combat-architecture (that file is scoped to the new move path and the legacy path also needs these rules), or in BALANCE.md (that is a numbers history, not rules).
- **If deferred:** stat and status rules stay archive-only; the stage and trap chains (SG-01, SG-03) cannot be resolved in one place.

### QA-04. Where do per-move intended behaviors live?

- **Class:** OWNER_CONFIRMATION_RECOMMENDED.
- **Decision:** home for rulings about individual moves (Psychic wedge, Bonemerang pull, Rock Slide one boulder, Substitute timings and similar).
- **Competing sources:** review 9.5, DECISIONS 2026-10-27, slice-4b.md, slice-4c.md, STATE.md (S-07, NE-06).
- **Recommended:** one per-move table in combat-validation-and-handoff.md, which becomes "Move intent and validation" (it already holds intent scenarios and worked moves).
- **Alternatives:** an appendix of MOVE-AXIS-SCHEMA.md (keeps the grammar doc generic only if kept clearly separate); notes inside the move data file (not readable by planning chats without opening a large JSON).
- **If deferred:** per-move rulings keep living in decision lists and slice files.

### QA-05. Move-schema decisions: absorb into the specs now (replaces OD-06)

- **Class:** OWNER_CONFIRMATION_RECOMMENDED. **Time-sensitive.**
- **Decision:** instead of keeping review section 9 and DECISIONS.md as two registers until slice 7 (Phase 3 recommendation), move every current move-schema rule into MOVE-AXIS-SCHEMA.md, combat-architecture.md and the per-move table, and freeze section 9 as history.
- **Competing requirements:** slice-overview.md:24 "section 9 is the single source"; DECISIONS.md:307-320 and slice-4c.md hold the 4c decisions; section 9 still lists as open items later decided (NE-06); the canonical grammar doc still has a superseded rule (NE-04).
- **Recommended:** yes, in two steps. Step 1 now (a one-line pointer fix in slice-overview.md saying where 4c decisions are). Step 2 (batch B3) between two 4c sub-slices, for example after 4c-1 sign-off and before 4c-2 coding, so no coding chat runs during the edit. The 4c handoffs are left as written (they are build instructions) and gain one pointer line each.
- **Alternatives:** Phase 3's freeze-and-merge-at-slice-7 (no disruption now; three registers for the rest of the branch); do it all after slice 7 (largest drift).
- **If deferred:** each new slice adds decisions to a third or fourth place.

### QA-06. BOSS-REWORK.md becomes the progression and encounters spec only

- **Class:** OWNER_CONFIRMATION_RECOMMENDED.
- **Decision:** keep BOSS-REWORK.md (path unchanged, to protect citations) as the spec for run progression, level curve, gyms, elites, Elite Four and region completion; move its change log and code touch points to history; drop "read this at session start while the branch is active"; take the active tracker from STATE.md (F-003).
- **Also confirm:** is feature/boss-rework closed? (BOSS-REWORK.md ends with "FEATURE CLOSED" for elites and the pilot; the rework/gym-progression branch later added escalation.) Is docs/BOSS-AUTHORING.md the implemented authoring format (it says DRAFT but Brock is built from it)?
- **Recommended:** yes to all; BOSS-AUTHORING becomes "authoring format, implemented for Brock; validation enforced by G.Gyms.validate".
- **Alternative:** split into a new spec file plus the old file as history (cleaner name, breaks about a dozen citations).
- **If deferred:** S-11 and S-12 stay half tracker, half spec.

---

## B. Approval provenance

### QA-07. Ratify historical approvals in bulk? (replaces OD-07)

- **Class:** OWNER_DECISION_REQUIRED (only you know what you approved).
- **Decision:** whether consolidated specs may tag these rules `[Approved]`: (1) BOSS-REWORK LOCKED sections and RESOLVED items; (2) the Checkpoint 1 answers Q1 to Q17 as written in combat-architecture.md and review 9.1 (the originals were never committed, EC-01); (3) the 2026-10-26 architecture approval and "PROPOSED items accepted as written"; (4) review 9.2 to 9.9 DECIDED and DEFAULT ACCEPTED items; (5) 3d, 4a, 4b sign-offs; (6) the archive rulings tagged "[Jess decided]" that will be extracted into COMBAT-RULES, GDD and BOSS-REWORK.
- **Why it matters:** consolidation copies these rules into canonical specs. Without ratification they must be tagged `[Proposed]` or "owner-labelled, unverified", which makes most of the move schema and status system look unapproved.
- **Recommended:** ratify all six groups in bulk, listing exceptions. Then adopt Phase 3 R1 going forward (an approval is a dated DECISIONS.md log entry you commit).
- **Alternative:** ratify item by item during each batch (slower, more precise).
- **If deferred:** batches run, but tags stay "unverified".

---

## C. Gameplay and architecture decisions

### QA-08. What happens after 30:00 and after the region is complete? (merges OD-03 question 4 and OD-04)

- **Class:** OWNER_DECISION_REQUIRED.
- **Decision:** one coherent rule set for late-run difficulty and repeat play. Five statements compete:
  1. DECISIONS.md:233-248 (2026-10-17): after beating a 30-minute boss, choose Standard Run (fixed accelerating ramp) or Unlock Safeties (performance-scaled difficulty with boosted rewards).
  2. BOSS-REWORK.md:15, :18 (LOCKED 2026-10-19): the 30-minute boss is removed; L50 clamp from 30:00 until all gyms are beaten, then a slow ramp ("math TBD") and the Elite Four phase.
  3. BOSS-REWORK section 4: Keep Going (deferred): "XP, damage and HP multipliers all go up each loop".
  4. docs/FULL-GAME-STRUCT.md: six loops per region, loop N adds one roster mon, checkpoints per loop, "No difficulty ramp on repeat clears".
  5. docs/GYM-ROSTERS.md rules: gym level rises across loops, so roster mons evolve.
  Code: stats.js:52 clamps at L50 and does not yet use gym completion.
- **Sub-questions:** (a) Is the Standard Run / Unlock Safeties choice dropped, or does it move (for example to Region Complete or Keep Going)? (b) Is "loop" in BOSS-REWORK section 4 the same as FULL-GAME-STRUCT's loop? (c) Does difficulty rise per loop (multipliers), only through the level clock, or not at all? (d) Is FULL-GAME-STRUCT.md approved scope or a draft to fold into BOSS-REWORK.md?
- **Recommended:** no design recommendation. On the documents: whatever you choose, it is written once in BOSS-REWORK sections 1 and 4, FULL-GAME-STRUCT is folded in (or tagged `[Proposed]`), and the 2026-10-17 Phase 2 text moves to the archive with a pointer.
- **If deferred:** the L1 to L50 curve and escalation still consolidate; post-30:00 and loop rules stay `[Open]` in one place (better than today's five).

### QA-09. (merged into QA-08; number kept free so Phase 3 cross-references stay readable)

### QA-10. Trap and Fire Spin on enemies

- **Class:** trap: OWNER_CONFIRMATION_RECOMMENDED; Fire Spin: OWNER_DECISION_REQUIRED.
- **Competing requirements:** trap: Slice C (archive :472) own state with damage and x0.25 movement; E1 (archive :379) "Enemies cannot be trapped any more"; Q5 and 9.8 root for 2 s on wild enemies, 25% plus 10 s window on strong hosts (new path, behind the flag). Fire Spin: Slice C trap; E1 strips beneficial stages and burns at half length; schema treats it as a persistent damage move; review 9.5 and 9.7 item 5 ask whether strip and half burn are dropped on purpose.
- **Why it matters:** after slice 7 only the new path exists; the spec must say which rule is the intended one, and until then which one is live.
- **Recommended (trap):** the Q5 rule is the intended rule; E1 is tagged `[Legacy behavior]` until slice 7.
- **Fire Spin options:** (a) drop strip and half burn (pure persistent damage); (b) keep them as riders on the new path (needs a grammar check: strip is not a listed rider); (c) decide in slice 6 balance.
- **If deferred:** Fire Spin is recorded `[Open]` in the per-move table; trap tags as recommended.

### QA-11. Stat stage rules: confirm the layering

- **Class:** OWNER_CONFIRMATION_RECOMMENDED.
- **Competing requirements:** BOSS-REWORK 3c mainline multiplier table (0.25 to 4.0) and 12 s then 6 s per application; archive D1; archive E2a (one base number B per stat, Speed ladder different, no explicit cap, cd = duration = 8 s for buff moves; states it supersedes D1's Speed rule); schema Q4 (defaults duration 6 s, maxStacks 6) and 9.8 (Metal Claw 2, Meteor Mash 2, Leaf Storm 1, caps per move, add across moves). Code: G.Stages.add takes a maxStacks argument from move riders (move-effects.js:117-119).
- **Recommended:** E2a's ladder is the multiplier rule for every host; per-move maxStacks is a cap on live applications from one move, layered on top; legacy buff moves keep "duration is the cap" until slice 7 replaces them; BOSS-REWORK 3c's table and D1 go to history.
- **If you disagree:** say which layer wins and the spec states that instead.

### QA-12. Type chart: current versus intended

- **Class:** OWNER_CONFIRMATION_RECOMMENDED.
- **Competing requirements:** js/data/types.js:34 and GDD 4.2 (softened chart, implemented); stat-model-design-notes section 4 "Full mainline type chart" under "Locked / agreed"; TODO tune/damage carry-overs and BOSS-REWORK 3d item (4) "canonical type chart ON HOLD" with prerequisites; GDD section 11 lists type effectiveness as pending.
- **Recommended:** COMBAT-RULES states the softened chart as current `[Approved]` and the mainline chart as `[Proposed, on hold]` with its three prerequisites (immunity versus the 1-damage floors, a boss-immunity rule, an optional exception list).
- **If deferred:** the spec says `[Open]`, which is less accurate than the recommendation.

### QA-13. How will gyms and enemies use moves after slice 7?

- **Class:** OWNER_DECISION_REQUIRED (architecture); may be DEFERRED to slice 7 planning.
- **Competing requirements:** BOSS-REWORK 3a (boss forms keyed by move kind; catalog is js/data/moves.js; gym casts use per-cast normalization); js/data/gyms.js:3 and :146, enemy.js:797 (code reads G.Moves and `kind`); DECISIONS 2026-10-25/26 (kind removed, no normalization on the new path); slice-7.md:5 ("Enemy and gym-leader use of the new definitions is not covered by any earlier slice").
- **Why it matters:** slice 7 deletes the legacy path the gym AI depends on. Without a rule, the next coding chat invents one.
- **Options:** (a) boss forms map from schema axes (space plus delivery) instead of kind; gym casts use the new definitions with no normalization (a balance change for gyms); (b) keep a small legacy-shaped catalog for enemies only (a bridge the move-schema rules forbid for player moves; would need an explicit exception); (c) decide during slice 7 planning.
- **Recommended:** (c), but record the question now as `[Open]` in BOSS-REWORK 3a and slice-7.md so it cannot be missed.

### QA-14. Audit enemies, upgrades and items content before consolidating them?

- **Class:** DEFERRED (evidence insufficient).
- **Facts:** fork rules for enemies, upgrades and items are in archive entries and applied proposals that no audit phase read in full; GDD says 7 enemies per tier, the archived ruling heading says 9 (NE-16).
- **Recommended:** approve a bounded content read of those archive entries as part of batch B6, with findings brought back to you only where they conflict with code.

---

## D. Agent rules

### QA-15. Agent rules live only in CLAUDE.md (merges OD-05 and parts of OD-11)

- **Class:** OWNER_CONFIRMATION_RECOMMENDED.
- **Confirm each:**
  1. The read-only git and `git fetch` allowance (CLAUDE.md, first appearing in 598211b, 2026-10-25) is your rule; the 2026-10-17 "never runs git, ever" entry and the 2026-10-20 "UNCHANGED ... never runs git" clause are superseded (F-012).
  2. "No Co-Authored-By or AI signature" governs over any tool's default (F-013).
  3. CLAUDE.md is the only full statement of agent rules. CONTEXT.md keeps the startup and end ritual (CLAUDE.md "Session rituals" becomes a pointer) and pointers, with no rule reminders; STATE.md drops its "Standing rules" section; slice-overview.md coding rules 2 and 5 point to CLAUDE.md for the workflow and git parts; DECISIONS.md workflow entries become log lines.
  4. Coding conventions now only in DECISIONS.md move into a short CLAUDE.md section: use G.UI.ask, never native dialogs; new combat-stat formulas only in G.Stats; client stays JavaScript in the browser (SG-26).
  5. One CLAUDE.md line: third-party skills (ponytail/skills/) never override project rules.
- **Why it matters:** these files change agent behavior. CONTEXT.md is what the Amazon Quick agent reads first; if its instructions do not also load CLAUDE.md, removing the reminders from CONTEXT.md would hide the rules from it.
- **Recommended:** yes to 1, 2, 4, 5. For 3, yes if the Quick agent loads CLAUDE.md; if not, keep a pointer block in CONTEXT.md listing rule names (no rule text) with "full text: CLAUDE.md".
- **If deferred:** the six copies remain; F-012 stays a live contradiction in DECISIONS.md.

---

## E. Routine consolidation (one blanket approval requested)

These follow from the evidence and change no intended behavior. Approve as a group ("yes to section E") or strike items.

| ID | Action | Basis |
| --- | --- | --- |
| R-01 | Path and reference fixes from Phase 3 batch 1, plus removal or repointing of citations to deleted MOVES-IMPORT-PLAN.md and MOVES-REFACTOR-PLAN.md | reference-integrity.md, F-022, F-023, NE-12 |
| R-02 | Remove the legacy-bridge line from MOVE-AXIS-SCHEMA.md:8 | NE-04, SG-05 |
| R-03 | State "accuracy folds into basePower" once; log line on the 2026-10-26 entry | NE-03, SG-04 (tag subject to QA-07) |
| R-04 | Collapse the three normalization entries to one rule plus log | SG-06 |
| R-05 | Replace the three DMG_SCALAR 2.0 statements with "dial, value in stats.js, history in BALANCE" | NE-02, F-009, SG-10 |
| R-06 | Absorb review 9 items that later decisions settled (Aura Sphere, Rock Slide, Bonemerang, Psychic, String Shot, Substitute, F5) | NE-06, SG-09 |
| R-07 | Absorb gym escalation into BOSS-REWORK section 3 | NE-13, SG-13 |
| R-08 | Resolve BOSS-REWORK internal open/resolved duplicates and stale section headings | NE-14, F-002, SG-14 |
| R-09 | GYM-ROSTERS "Rules that apply to every roster" becomes a pointer plus roster-only conventions | S-12 duplication |
| R-10 | Extract archive rulings into their canonical specs before calling the archive history; archive header rewritten | NE-01, SG-16 |
| R-11 | stat-model-design-notes.md and review sections 1 to 9 get history headers after their content is absorbed | SG-19, S-08 |
| R-12 | SIM-PRESENT-BOUNDARY.md stays the active architecture-direction doc (corrects Phase 3 G31) | NE-15 |
| R-13 | Build and run instructions consolidated in ONBOARDING section 3; source checkout uses dev.html | F-017 (publish text stays DEFERRED, OD-08) |
| R-14 | Spec header (Role, Owns, Does not own, Status home, Last reconciled) and requirement tags on every canonical spec | map 3.2 |
| R-15 | Applied proposals get a one-line history banner (no move) | F-011 |
| R-16 | Name the canonical move database path in MOVE-AXIS-SCHEMA file roles and as an explicit exception in the CLAUDE.md skip list | SG-22 |

## Deferred (no answer needed now)

| ID | Item | Basis |
| --- | --- | --- |
| D-01 | Upstream-derived docs: publish and SEO text in README, ONBOARDING, ORIGINAL-OWNER-RULES (OD-08) | F-017 to F-019 |
| D-02 | Board snapshots and TODO.md mirror (OD-09); TODO long-form design notes triaged into issues | F-015 |
| D-03 | CREDITS.md contact data (OD-10), outside documentation authority | F-021 |
| D-04 | Role headers on parked docs (OD-11 remainder) | F-024, S-17 |
| D-05 | Em-dash scope: new fork prose only; archives and upstream exempt (F-020) | F-020 |
| D-06 | Elite cadence placeholder: is the gym-cycle hook queued, and under which issue? | F-025 |
| D-07 | x10 ticket sources after boss removal: documented from code during B6 (research, not design) | NE-11 |

---

## F. Mapping from Phase 3 decisions

| Phase 3 | Phase 3A | Change |
| --- | --- | --- |
| OD-01 | QA-00 | unchanged |
| OD-02 | QA-02 | recommendation reversed: living umbrella instead of banners |
| OD-03 | QA-06 (spec role, branch, BOSS-AUTHORING), QA-08 (post-30:00) | split by underlying question |
| OD-04 | QA-08 | merged with OD-03 q4 |
| OD-05 | QA-15 | widened to the full agent-rule consolidation |
| OD-06 | QA-05 | recommendation changed: absorb into specs instead of two frozen registers |
| OD-07 | QA-07 | widened to archive rulings being extracted |
| OD-08 | D-01 (publish text), R-13 (run instructions) | split |
| OD-09 | D-02 | unchanged |
| OD-10 | D-03 | unchanged |
| OD-11 | D-04, QA-15 item 5 | split |
| (new) | QA-01, QA-03, QA-04, QA-10, QA-11, QA-12, QA-13, QA-14 | subjects Phase 3 did not cover |
