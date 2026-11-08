# TEST-FIRST, how a slice is built test-first (say "tdd")

Adapted from the ideas in mattpocock/skills (tdd). Applies to sim and data logic: combat, moves, stats, gyms, items, shops, saves. UI and feel changes are NOT test-first: use the headless smokes (file:// and http) plus Jess's feel test.

## Where tests live
- Harnesses: docs/proposals/*-harness.js (node; tools/check.js finds them by name and fails on a nonzero exit or any FAIL line).
- Mutation checks: docs/proposals/*-mutate.js (manual, `node docs/proposals/<area>-mutate.js`; check.js does not run them).
- Harness and mutate files never ship, so they are free-edit like tools/. The game-code change they cover still needs the prose plan and Jess's OK (CLAUDE.md "Edit boundary and workflow").
- Quick can write them but cannot run node; it hands Jess the commands.

## The cycle
1. **Seams, in the prose plan.** The plan (no code) has a "Seams" section: each seam under test (the G.* surface you observe from outside), with one line on what it catches and what it misses. Jess's OK on the plan confirms them. No test at an unconfirmed seam.
2. **Vertical slices.** One scenario, then the minimal code to pass it, then repeat. Never write all the scenarios first. Show the red run, then the green run. Write only enough code to pass the test, nothing speculative.
3. **Independent expected values.** Take them from MOVE-INTENT, COMBAT-RULES (for example the Damage formula worked by hand), the D-table, the data file, or a worked example. Never recompute them the way the code does and never copy code output. A scenario that depends on an open owner decision is marked blocked, never guessed.
4. **Mutation checks.** Always for a new mechanic or slice. For a bug fix, only when the harness missed the bug. Add or refresh entries in the area's *-mutate.js and run it: a miss is a gap, a STALE pattern means the quoted code moved (refresh it). Keep new code within Prettier's 120 columns or patterns go stale.
5. **Refactor after green only.** Behavior-neutral, with the harness green before and after. At the end of the slice, offer the built-in `/simplify` (reuse and simplification) and `/code-review` (correctness); run them only on Jess's yes.
6. **Spec check, before the final commit.** Compare the diff with what was approved: the slice's plan (concept map or proposal), the MOVE-INTENT entries, and the issue's done condition. List anything missing, anything extra (scope creep), and anything implemented but wrong, quoting the spec line for each. Only `[Approved]` items count as requirements; `[Proposed]` and `[Open]` never do.
7. **Done.** `node tools/check.js` and `npm run format` are clean, and Jess feel-tests the change.

## Mocking
Load the real modules. Stub only what the browser provides (world, camera, FX, the gym clock; the harnesses use a Proxy no-op). Time and randomness are the boundary: pin them. Never mock your own modules or internal collaborators, and assert through the G.* surface, not by reaching into private state. Mutation copies use the existing `<PREFIX>_<FILE>` environment overrides.

## Tests that do not count
- **Implementation-coupled**: breaks on a refactor with no behavior change.
- **Tautological**: the expectation is computed the way the code computes it, so it passes by construction.
- **Horizontal**: all scenarios written first, then all the code. They verify imagined behavior.
