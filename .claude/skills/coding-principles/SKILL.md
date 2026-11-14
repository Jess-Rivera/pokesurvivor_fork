---
name: coding-principles
description: Coding principles (YAGNI, KISS, DRY, separation of concerns, SOLID, Law of Demeter, small cleanups, conventions) mapped to this repo. Apply every time you write a change plan for game code or tools, and every time you write approved code, before handing either to Jess. Also use when Jess says "good coding practices", "reuse where you can" or "only build what is needed".
---

<!-- Adapted from JordanCoin/codingskills (MIT license): kiss, dry, yagni, solid, separation-of-concerns,
law-of-demeter, boy-scout-rule and convention-over-configuration, folded into one file and rewritten in our own
words for this repo on 2026-11-13. Changes: tied to this codebase's G modules, data tables and specs; the boy-scout
rule is limited by the plan-approves-its-scope rule; detect-stack is dropped (ONBOARDING.md and CLAUDE.md already
describe the stack); a plan check and a code check are added. Source: https://github.com/JordanCoin/codingskills -->

# Coding principles

Jess wants these applied without being asked. They shape the plan first (what to build, what to reuse) and the code
second. CLAUDE.md wins wherever this file differs.

## The order when principles pull against each other
1. Correct and safe first. Save-field defaults, input validation in gyms.js validate(), the fairness floors and the
   harness checks are correctness, never "complexity" to cut.
2. Then KISS: the version a reader follows in 30 seconds.
3. Then YAGNI: only what this slice needs.
4. Then DRY: one home for each rule, but only once the pattern is real.
When unsure between two of them, pick the one with fewer moving parts and say why in the plan.

## YAGNI: build only what is needed
- Solve the slice in front of you. One use case gets code for one use case.
- No setting, parameter, flag or option that nothing reads yet. A parameter only ever passed its default goes.
- No registry, plugin hook or "generic" layer for one user. Extension points need two real users today.
- Cheap flexibility is fine (a lookup table instead of a chain of ifs costs nothing). Costly speculation is not.
- Deferred work (cloud, multiplayer, a later slice) gets a one-line note and an issue draft, never stub code.
- Every plan says what it deliberately does not build.

## KISS: keep it simple to read
- Write for the reader. A few clear lines beat a clever one-liner.
- At most three levels of nesting. Flatten with early returns and guard clauses.
- One function, one job. If its description needs "and", split it.
- No clever tricks: no bit hacks, chained ternaries or regex parsing where plain code reads better.
- Explicit over implicit. No magic numbers in logic: a tuning number lives in the module's frozen table (BASE, TUNE,
  CONF and the like) with a name, and goes in BALANCE.md when it is a tuned value.
- Names say what the thing is for on their own (CLAUDE.md "Coding conventions"). No one-letter names in new or
  touched code.

## DRY: one home for each piece of knowledge
- Reuse before writing. Search for an existing helper first and name it in the plan. The usual homes: G.U (util),
  G.Stats (every combat-stat formula), G.UI.ask (every confirm), the UI kit's shared components, G.Gyms.perLoop (a
  value keyed by loop), G.LeaderPlanner.seeded (a seeded source), G.LeaderAI.Bag (an exact-rate bag), the validator
  helpers in gyms.js, and the patterns next to the change (a dev warning like teamItemWarn).
- DRY is about knowledge, not look-alike code. Two blocks that look the same but mean different things stay apart.
- Extract on the third real repeat, not the first. A wrong shared helper is worse than two copies.
- A helper that needs several boolean flags to serve every caller means the copies were simpler. Keep the copies.
- Data over branching: behavior that varies by move, species or leader belongs in a js/data table or a schema axis
  (docs/MOVE-AXIS-SCHEMA.md), not in checks on ids inside code.
- One source of truth for rules: the spec CLAUDE.md "Where current rules live" names. Code follows it; it does not
  restate it in a second place.

## Separation of concerns
- Keep each layer to its job: data in js/data, rules and formulas in the system that owns them, drawing in js/ui and
  the overlays. Simulation never reads presentation and the reverse (docs/SIM-PRESENT-BOUNDARY.md).
- The leader AI's four roles stay blind to each other's jobs: Decider, Controller, Body, SimPass (LEADER-AI "FRAME").
- Validate at the boundary (gyms.js validate(), the save load). Inside, trust the shape and do not re-check it.
- A coordinating function stays thin: it calls the steps, it does not also hold their logic.
- Do not over-layer. A short function does not need three layers.

## SOLID, as it applies to vanilla JS modules on G
- Single responsibility: a module or function has one reason to change. A G module that starts doing a second job is
  a split candidate (and a new file costs a dev.html entry, a NEED entry and a rebuild; say so).
- Open to extension through data: a new move, leader or item is a new entry in a table, not a new branch in code.
- Substitutable: a Player-entity leader is your frame plus authored differences (the branch rule's bar). It should
  work wherever your player's code path expects a Player.
- Small surfaces: a module exposes what its callers use, nothing more.
- Depend on the snapshot, not the world: the planner reads only Belief's snapshot; pure functions take what they need
  as arguments, so the harness can hand-derive outcomes.
- These are heuristics. A tiny script or a dev tool does not need them.

## Law of Demeter: talk to neighbors
- Do not reach through several objects to get one value across a module boundary. Ask the owner for it, or pass the
  value in.
- A function takes the fields it needs, not the whole object, when the object is from another module.
- Plain data (a snapshot, a gyms.js entry, a move def) is exempt: reading its fields is what it is for.
- Inside one tightly coupled module, a direct chain is often clearer. Apply it at module boundaries.

## Small cleanups (limited by the plan's scope)
- In the lines a change already touches: fix a misleading name, remove dead code you have proven dead, add a missing
  save-field default. List these in the plan as "touched-code cleanups" so the approval covers them.
- Anything bigger (more than about 20 lines, or a second module) is its own issue draft, never folded in.
- Do not "fix" what you do not understand. What looks dead may be a fallback; check callers and the spec first.

## Conventions
- Follow the patterns already in the file: its comment style, its frozen tables, its naming, how it registers on G.
- New strings in English, never new Spanish strings or lang-en.js entries for our own text (CLAUDE.md i18n).
- New code within 120 columns, then npm run format (the mutate files match exact line text).

## The plan check (before a plan goes to Jess)
For each part of the plan, state:
- Reuses: the existing helpers, tables and patterns it builds on.
- New: each new function, setting, constant or file, and why nothing existing fits.
- Not built: what it deliberately leaves out (YAGNI), with the issue draft for anything deferred.
- Where it lives: the module and layer, and why that is the owner.
- Size: which files grow, and any file that crosses 1000 lines (structural-review's rule).
- Touched-code cleanups, if any.
A new default or rule that changes game behavior is a standalone decision for Jess, never a line inside a part.

## The code check (before reporting a change written)
- Nothing was added that the approved plan did not name (no extra settings, helpers or options).
- Every new helper has a real caller; nothing duplicates an existing helper.
- No new magic numbers in logic; nesting at most three; each new function has one job and a descriptive name.
- No feature checks bolted into a shared path; varying behavior lives in data where a table exists.
- Save fields null-checked and defaulted; lines within 120 columns.
- If the code had to differ from the plan, stop and say how before going further.
