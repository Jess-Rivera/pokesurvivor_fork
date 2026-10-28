# Phase 3: Proposed Phase 4 migration plan

A plan only. Nothing here has been executed. Every batch edits Markdown documentation only; no game code, js/data/*.js, dev.html, build config or assets are touched, so under CLAUDE.md's edit boundary these are free-edit docs. **However**, batches 3 to 6 change what AI agents read as rules or decisions, so each needs the owner's explicit OK for its scope, not just the general free-edit permission.

## Ground rules for Phase 4
- Owner decision OD-01 (baseline tree) first. Work on a docs branch the owner creates; the assistant never runs repo-changing git (CLAUDE.md). The assistant gives exact commands; the owner runs them.
- One batch per commit, so each can be reverted alone with `git revert <sha>` (owner runs it). Commit messages carry no Co-Authored-By or AI trailer (CLAUDE.md:69; OD-05).
- No file is moved, renamed or deleted in any batch. "Archive" means a status banner, because DECISIONS.md and other docs cite these paths.
- Every batch ends with the validation checks listed for it, plus the common checks:
  - `git diff --stat` shows only the intended .md files (no .js, .html, .json changes).
  - No em-dashes in added lines.
  - STATE.md under 3 KB if touched.
  - Markdown link check (the Phase 2 reference-integrity script approach) shows no new broken links.
- After any batch that changes CLAUDE.md or CONTEXT.md, the owner mirrors the change into the Amazon Quick agent instructions (outside the repo).

## Batch overview

| Batch | Content | Depends on | Risk | Effort |
|---|---|---|---|---|
| 1 | Reference and path fixes | OD-01 | Low | Small |
| 2 | Status-line hygiene (role line plus pointer to status home) | OD-01; OD-07 for "approved" wording | Low to medium | Medium |
| 3 | Agent-instruction precedence and tracker pointer | OD-03 (q3), OD-05 | **High** (changes agent behaviour) | Small |
| 4 | DECISIONS.md supersession annotations | OD-03 (q4), OD-05 | Medium | Small |
| 5 | Design authority (GDD banner, boss/gym spec status, FULL-GAME-STRUCT) | OD-02, OD-03, OD-04 | **High** (changes which design agents follow) | Medium |
| 6 | Move-schema register pointer | OD-06 | **High, time-sensitive** (active slice work) | Small |
| 7 | Upstream docs, parked docs, style | OD-08, OD-09, OD-11 | Low | Medium |

Recommended order: 1, then 6 (time-sensitive, before slice 4c-1 coding), then 3 and 4 together, then 2, then 5, then 7. Batch 1 has no design content and can go first while decisions are pending.

---

## Batch 1. Reference and path fixes (low risk)
- Replace the old `planning/...` prefix with `docs/current feature planning/...` in the 8 reference groups listed in reference-integrity.md.
- Fix moved-path references: docs/move_rework_holding/move-consistency-review.md to its current path; docs/move_kind_rules.xlsx to docs/move_rework_holding/; js/world/rift.js to js/systems/rift.js.
- CLAUDE.md:34 and CONTEXT.md:41 skip lists: `delete/` to `_delete_/` (F-022).
- docs/DEVLOG-archive.md header: describe multiple rotations and oldest-first order (F-023).
- docs/ORIGINAL-OWNER-RULES.md:7 and :27: remove or explain the "Part 1" reference (F-014).
- BOSS-REWORK.md section 1: point its "DECISIONS 2026-10-19 boss rework" citation at docs/DECISIONS-archive.md (F-003). (Batch 4 may add a live DECISIONS pointer too.)
- Validation: rerun the reference check; the previously confirmed defects are gone and no new ones appear.
- Rollback: revert the commit.

## Batch 2. Status-line hygiene (rule R4)
- Replace header status lines with a role line plus "Status: see <status home>" in: docs/MOVE-AXIS-SCHEMA.md:3-4, combat-architecture.md:3, move-consistency-review.md:641 preamble (EC-04), slice-4a.md:3, slice-4b.md header, slice-overview.md:4 (refresh it, since it is the status home), docs/BOSS-AUTHORING.md:1-4, BOSS-REWORK.md section 3 heading.
- Add a one-line historical banner to the 13 applied proposals in docs/proposals/ (F-011), or a single docs/proposals/README-style line if the owner prefers one place (that would be the only new file in the plan; optional).
- Add role lines to the parked docs only if OD-11 says so (otherwise batch 7).
- Depends: OD-07 for wording "approved"; without it, use factual wording ("built in <commit>; owner sign-off recorded in <place>" or "sign-off not recorded").
- Validation: grep for "not yet implemented", "Nothing here is built", "waiting for Jess's playtest", "PROPOSED (not applied)" returns only historical or intentional hits; slice-overview.md slice list agrees with STATE.md.
- Risk: medium-low; a wrong status written into the status home is worse than a stale header, so every status claim must cite a commit or an owner sign-off.

## Batch 3. Agent instructions (high risk)
- CLAUDE.md: add one precedence paragraph (rule R9 in short form: agent rules, design, status, code), one line that third-party skills never override project rules, and change the Reference material line for GDD.md per OD-02 (or leave for batch 5).
- CONTEXT.md: "Active branch tracker" becomes "the tracker named in STATE.md"; add "if this file and CLAUDE.md differ, CLAUDE.md wins".
- STATE.md: next rewrite names the active tracker explicitly.
- Depends: OD-05 (all three parts), OD-03 question 3.
- Validation: read CLAUDE.md and CONTEXT.md end to end and confirm no rule changed other than the intended lines; start a fresh assistant session and ask "catch me up" to confirm it loads the right tracker; owner confirms the Amazon Quick agent instructions were updated.
- Rollback: revert the commit; also revert the Quick agent instruction change.

## Batch 4. DECISIONS.md supersession annotations (rule R3)
- Add a dated owner entry recording the read-only git rule; mark 2026-10-17 "Git execution" and the 2026-10-20 "UNCHANGED ... never runs git" clause as superseded (F-012, OD-05).
- DMG_SCALAR: annotate DECISIONS.md:101 "value retuned to 1.0 on 2026-10-18, see BALANCE.md; the principle stands" (F-009). This is the change slice-7.md:6 already queues; doing it here removes it from slice 7.
- SEO: mark the 2026-10-17 tools/make_seo_pages.py entry as superseded by 2026-10-20 (F-019).
- Difficulty: annotate the Phase 2 part of 2026-10-17 "two-phase difficulty" per the OD-03 answer (NEW-01).
- Boss rework: add a short live entry or pointer for the 2026-10-19 boss-rework ruling now only in the archive (F-003).
- "ISSUES" in the edit-boundary entry: clarify as TODO.md (EC-03).
- Depends: OD-03 question 4, OD-05.
- Validation: every annotated entry names its superseding entry by date and title; no entry text is deleted; DECISIONS.md stays within its "about 10 lines per entry" convention.
- Risk: medium; editing a "settled, do not relitigate" file. Mitigation: annotate, never rewrite.

## Batch 5. Design authority (high risk)
- GDD.md: banner and section notes per OD-02 (recommended: mark boss, rift and Judgment sections superseded by BOSS-REWORK.md, keep the rest as baseline reference).
- GLOSSARY.md: mark entries for removed systems (BOSS-REWORK section 5 already lists this).
- BOSS-REWORK.md: per-section status per OD-03; drop or reword "Read this at session start while the branch is active" if the branch is closed.
- docs/FULL-GAME-STRUCT.md: title, date, status, or fold into BOSS-REWORK.md (OD-04).
- Depends: OD-02, OD-03, OD-04.
- Validation: grep GDD.md, GLOSSARY.md and ONBOARDING.md for "Judgment", "rift", "BOSS_SLOTS", "minute 15" and confirm every remaining hit is marked superseded or historical.
- Risk: high, because these change which design an agent will follow. Do not touch gameplay code; BOSS-REWORK section 5 code cleanup (judgment.js, BOSS_SLOTS) is game work and stays out of Phase 4.

## Batch 6. Move-schema register pointer (high risk, time-sensitive)
- Per OD-06 (recommended option): one-line header on review section 9 freezing it as the register for Checkpoints 1 to 3 and slices 3a to 4b; change slice-overview.md:24 to "decisions: section 9 up to slice 4b, DECISIONS.md from 4c on; merged at slice 7"; repoint combat-validation-and-handoff.md table 3.6 the same way.
- Do not move decision text during active slice work; slice 7 already plans the merge.
- Depends: OD-06.
- Validation: the three 4c handoffs and slice-4c.md cite where their decisions live; a search for "single source" in the planning folder returns only the updated wording.
- Timing: before slice 4c-1 coding begins, or the coding chat will follow the old pointer.

## Batch 7. Upstream docs, parked docs, style (low risk)
- README.md and ONBOARDING.md: correct "run from source" to dev.html; remove or fix the docs/PUBLICAR.md link and GitHub Pages line (F-017, F-018) per OD-08. CONTRIBUTING.md:22 index.html wording per OD-08.
- STATE.md citation of gitignored snapshots per OD-09.
- One-line status headers for FEATURES_GRAB.md and parked design notes per OD-11.
- Em-dash fixes in fork-authored live docs if F-020 scope is confirmed.
- Leave CREDITS.md alone unless OD-10 says otherwise (outside this migration).
- Validation: common checks.

---

## Explicitly out of scope for Phase 4
- Game code cleanup implied by BOSS-REWORK section 5 (judgment.js, BOSS_SLOTS, bossScale) and the elite cadence hook (F-025): game-affecting, needs the normal prose-plan workflow.
- Rewriting GDD.md in full, merging section 9 into DECISIONS.md (slice 7), anything under cloud/MP.
- Running harnesses as proof of "verified" status: recommended separately (`node tools/check.js`), since no harness was executed in Phases 1 to 3.

## Post-migration
- Re-run a light version of the Phase 2 checks (reference integrity, status-line grep, DECISIONS supersession markers).
- Owner decides the fate of temp-audit-outputs/ (delete, or keep one summary under docs/).
