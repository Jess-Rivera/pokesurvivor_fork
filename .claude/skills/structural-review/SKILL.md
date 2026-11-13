---
name: structural-review
description: Strict structural review of a branch's changes before it merges to main. Hunts for restructurings that delete complexity without changing behavior, files growing past 1000 lines, and one-off branches bolted onto shared paths. Run only when the user says "structural review", "thermo-nuclear review", "deep code quality audit", or asks for the pre-merge gate on a feature branch.
disable-model-invocation: true
---

<!-- Adapted from the "thermo-nuclear-code-quality-review" skill in cursor/plugins (cursor-team-kit), rewritten in
our own words for this repo on 2026-11-13. Changes: findings are prose with no code (CLAUDE.md edit workflow), every
restructure goes through a plan and Jess's OK, the type-safety rules are replaced with vanilla-JS boundary and
save-data checks, the 1000-line rule gets exemptions for generated data and inherited giants, the async-parallelism
rule is dropped, and this repo's layers are named. Source:
https://github.com/cursor/plugins/tree/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review -->

# Structural review

A demanding review of what a branch changed, aimed at the structure of the code rather than its style. The question
behind every finding: is there a reorganization that keeps behavior identical and makes the change much smaller,
flatter, or more direct? Push for deleting complexity, not moving it around. Correct behavior alone does not pass.

This is review only. It never edits game code. CLAUDE.md wins wherever this file differs.

## Scope
- Review the branch's own changes against main: `git log --oneline main..<branch>` and `git diff main...<branch>`.
  In Claude Code, run them (read-only git is allowed). In Quick, ask Jess for `git diff --stat main...<branch>` and
  read the changed files from the working tree.
- Read the changed code, its immediate callers, and the spec that owns it (CLAUDE.md "Where current rules live").
  Do not tour the repo. Skip what CLAUDE.md "Efficient repository exploration" says to skip.
- Inherited code the branch did not touch is out of scope. A problem spotted there becomes a one-line follow-up
  (an issue draft), never a blocker for this branch, so an approved plan's scope stays intact.
- Deferred cloud and multiplayer code (js/net/) is out of scope.

## What to look for, in priority order
1. Structural regressions: the branch made a module harder to follow, more coupled, or more stateful.
2. A missed big simplification: a reframing that makes whole branches, flags, helpers, or modes disappear. Typical
   here: a move special case in an executor that should be a data axis (docs/MOVE-AXIS-SCHEMA.md); a per-entity stat
   formula that belongs in G.Stats; a chain of checks on species or move id that wants a table in js/data.
3. Spaghetti growth: new one-off conditionals, booleans, or nullable modes inserted into a busy existing flow (the
   main loop in game.js, combat, the enemy update, the HUD draw, the leader AI tick).
4. Boundary and contract problems (this repo's stand-in for type checks):
   - Loose ad-hoc object shapes where a documented shape exists (move data per MOVE-AXIS-SCHEMA, leaders per
     docs/LEADER-AI.md).
   - Silent fallbacks (a default of zero, an empty catch) that hide a broken invariant instead of making the
     boundary explicit. Save-data defaults are the opposite case: they are required.
   - A save load that reads a new field without null-checking and defaulting it (CLAUDE.md "Save-data migration
     safety"). Always a blocker.
   - Simulation logic leaking into presentation or the reverse (docs/SIM-PRESENT-BOUNDARY.md).
   - Feature logic leaking into a shared module (G.UI, util, input, the UI kit).
5. File size: see the rule below.
6. Duplication: copy-pasted logic, or a bespoke helper where the canonical one exists (G.UI.ask, G.Stats, the kit's
   shared components).
7. Legibility: names that do not say what they are for (CLAUDE.md "Coding conventions"), lines over 120 columns,
   an edge case handled in the middle of an already busy function.

Fewer findings with high conviction beat a long cosmetic list. Do not bury structural problems under nits.

## The 1000-line rule (adapted)
- A branch that pushes a game-code file from under 1000 lines to over 1000 is a presumptive blocker. Ask whether the
  new code should become its own module first.
- Files already over 1000 lines before the branch are not blockers by size alone. At 2026-11-13 these were icons.js,
  enemy.js, menu.js, debug.js, game.js, hud.js, player.js, hud-overlay.js, move-sim.js, db.js, tiles.js and
  leader-ai.js. Flag when the branch adds more than about 100 lines to one, and ask whether the addition could live
  in a new file instead.
- Exempt: generated data (sprites-meta.js, pokedex.js), js/data/changelog.js, and data tables whose growth is content
  rather than logic (gyms.js, items.js, species-traits.js entries).
- Every split remedy states its cost: a new script goes in both the dev.html script block and the NEED array in
  js/main.js, in the right load order, and the build must be re-run before publishing.

## Ignore
- Per-frame micro costs (CLAUDE.md "Performance stance"). Flag a hot-path pattern only when it plausibly causes a
  visible framerate drop at high enemy counts.
- Anything `npm run format` handles.
- Inherited Spanish string literals: they are translation keys. New user-facing strings written in Spanish, or new
  lang-en.js entries for our own strings, ARE findings.

## Each finding
Written in prose with NO CODE (no snippet, no diff, not a single line):
- Where: the file and the function or section.
- Problem: what makes it harder to reason about, in one or two sentences.
- Remedy: the restructure in words (what moves where, what disappears).
- Size: small (inside one function), medium (one file), or restructure (several files or a new module).
- Behavior: "preserves behavior" or "changes behavior". A remedy that changes behavior, or sets a new default or
  rule, goes in the decisions list for Jess, never folded into a remedy.
- Test impact: the harnesses, intent scenarios and mutate files it touches. Moving or rewrapping lines can break the
  string matches in docs/proposals/*-mutate.js, so name the ones that would need repointing.

## Report
- Save it table-first as "docs/ASCII Concept Maps/<branch> - Structural Review.txt": the findings table (number,
  where, problem in a few words, size, behavior), then the decisions list, then the verdict. In chat, give the
  verdict and the top three findings only.
- Verdict, one of: Ready to merge (no blocker), Fix first (names the blockers), Discuss (a blocker whose remedy
  needs a decision).
- Presumptive blockers unless the branch justifies them clearly: a file crossing 1000 lines; ad-hoc branching that
  tangles an existing flow; feature checks scattered across shared code; a missing save-field default; a duplicated
  canonical helper or a formula outside G.Stats; an indirection layer that adds nothing; an obvious large
  simplification left on the table.
- Tone: direct and serious. Say plainly when the branch makes the codebase messier. No softening, no rudeness.

## After the review
- Jess picks which findings to act on. Process them with the review-feedback skill.
- Accepted game-code findings become one prose plan for Jess's approval (CLAUDE.md "Edit boundary and workflow").
  Nothing is written before that. Findings in tools/ or the Markdown docs may be fixed directly.
- Follow-ups outside the branch become issue drafts (Quick) or issues (Claude Code, CLAUDE.md "Git and GitHub").
- When to run it: as the gate before a feature branch merges to main (for feature/gym-leader-ai, after #30), or
  whenever Jess asks.
