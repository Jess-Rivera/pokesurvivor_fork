---
name: diagnosing-bugs
description: 'Diagnosis loop for hard bugs and performance regressions: build a red-capable feedback loop, minimise, hypothesise, probe, fix with a regression test. Run only when the user says "diagnose" or "debug this".'
disable-model-invocation: true
---

<!-- Adapted from mattpocock/skills (landing-skills/diagnosing-bugs, the untouched original). Changes: loop options
rewritten for this repo's harnesses, edit-boundary and cleanup rules added, HITL script and openai.yaml dropped,
user-invoked only. -->

# Diagnosing Bugs

A discipline for hard bugs. Skip phases only when explicitly justified. Run it when Jess says "diagnose" or "debug this"; an obvious failure (a check pointing at the line) goes straight to a fix plan instead.

Read GLOSSARY.md and the spec that owns the area (MOVE-INTENT, COMBAT-RULES, BOSS-REWORK, GYM-ROSTERS, combat-architecture) before theorising. Never show secrets (none are expected in this local game; if one appears, write `<REDACTED>`).

**Edit boundary (CLAUDE.md "Edit boundary and workflow").** Phases 1 to 4 must not edit shipped game files. Loops and probes live in tools/ (free-edit) or are injected into the page by the headless script. A temporary debug line in game code needs a heads-up in chat first. The fix (Phase 5) is a game-code change: give Jess a prose plan with NO code and wait for the OK.

## Phase 0: Startup checklist

Check CLAUDE.md "Debugging order" before anything else: a script missing or misordered in the dev.html `<script>` list or the `NEED` array in js/main.js (load order, "module undefined"), the `MAINTENANCE` flag in js/main.js (`?dev` bypasses it), and debug on dev.html, not the built index.html. If one of these explains it, stop here.

## Phase 1: Build a feedback loop

**This is the skill.** If you have a **tight** pass/fail signal that goes red on _this_ bug, you will find the cause; everything after just consumes it. Without one, staring at code will not save you. Spend disproportionate effort here.

### Ways to construct one, in roughly this order

1. **The harness that owns the area.** A scenario in docs/proposals/move-intent-harness.js, the gym-leader harness, or another harness that `node tools/check.js` runs. Add a failing scenario for the symptom.
2. **Headless browser script** that loads `dev.html?dev` and asserts on DOM, console or game state. Click `#tap-start` first or the first keypress opens Login. Load over **file://** as well as http: Jess runs from disk and some failures only appear there.
3. **Node sim loop**, if the simulation can run without the browser (see docs/SIM-PRESENT-BOUNDARY.md).
4. **Replay a captured save or state.** Save the localStorage snapshot that shows the bug and load it in isolation.
5. **Property or fuzz loop.** If the bug is "sometimes wrong", run many random inputs and look for the failure mode.
6. **Bisection.** If the bug appeared between two commits, give Jess the exact `git bisect` commands to run (they change the working tree, which is Jess-only); a script of your own decides good or bad.
7. **Differential loop.** Run the same input through two versions or configs and diff the output.

### Tighten the loop

Faster (skip unrelated init, narrow the scope), sharper (assert the specific symptom, not "didn't crash"), more deterministic (pin time, seed randomness, isolate state). A 2-second deterministic loop is a debugging superpower; a 30-second flaky one is barely better than none.

### Repo gotchas

- The http smokes fail about 1 run in 3 with `ERR_NO_BUFFER_SPACE`. A repeat run that passes is meaningful; repeat before blaming the game.
- Skip `tools/smoke-newcombat.js` until its flake is fixed.
- A hung page: pause it through CDP (`Debugger.pause`) to print the stack of the infinite loop.
- Quick (the work machine) cannot run node. Say so and give Jess the commands instead.
- Scripts you write for these loops follow the editing gotchas (mixed CRLF and LF, no heredocs for backslash or non-ASCII content): write them with the Write tool.

### Non-deterministic bugs

The goal is a higher reproduction rate, not a clean repro. Loop the trigger many times, narrow timing windows, add stress. A 50% flake is debuggable; 1% is not.

### Feel bugs and when you cannot build a loop

Some bugs only show by feel (animation sync, movement that feels wrong). If no loop can be built after **3 failed attempts**, stop. List what you tried and ask Jess for: the exact steps and game state, a recording or log of the failure, or permission to add a temporary debug line. Do not hypothesise without a loop.

### Completion criterion: a tight loop that goes red

Phase 1 is done when you can name **one command** that you have **already run at least once** (show the invocation and its output), and that is:

- [ ] **Red-capable**: it drives the actual bug path and asserts the user's exact symptom, so it can go red on this bug and green once fixed.
- [ ] **Deterministic**: the same verdict every run (flaky bugs: a pinned, high reproduction rate).
- [ ] **Fast**: seconds, not minutes.
- [ ] **Agent-runnable**: you can run it unattended.

If you catch yourself reading code to build a theory before this command exists, stop. No red-capable command, no Phase 2.

## Phase 2: Reproduce and minimise

Run the loop and watch it go red. Confirm it shows the failure **Jess described**, not a different one nearby, that it reproduces across runs, and that you captured the exact symptom (message, wrong output, timing) so the fix can be verified.

Then shrink the repro to the smallest scenario that still goes red: cut inputs, callers, config and steps one at a time, re-running after each cut. Done when every remaining element is load-bearing. Do not proceed until you have reproduced and minimised.

## Phase 3: Hypothesise

Generate **3 to 5 ranked, falsifiable hypotheses** before testing any. Each states its prediction: "If X is the cause, then changing Y will make the bug disappear, or changing Z will make it worse." A hypothesis with no prediction is a vibe; sharpen or discard it.

**Show the ranked list in chat as prose, with no code.** Keep going if the probes are cheap and need no game-file edit and no feel test from Jess. Wait for Jess when they do. Jess often re-ranks them instantly from domain knowledge.

## Phase 4: Instrument

Each probe maps to a specific prediction. Change one variable at a time. Prefer a debugger or REPL inspection (one breakpoint beats ten logs), then targeted logs at the boundaries that separate hypotheses. Never "log everything and grep".

**Tag every debug line** with a unique prefix such as `[DEBUG-a4f2]` so cleanup is one grep. Prefer injecting probes through the headless script or tools/ over editing game files (see the edit boundary above).

**Performance bugs:** logs are usually wrong. Take a baseline measurement (`performance.now()`, the profiler, a timing harness), then bisect. Measure first, fix second. A visible framerate collapse is a feel problem to fix now (CLAUDE.md "Performance stance"), not a micro-optimisation to defer.

## Phase 5: Fix and regression test

Write the regression test **before the fix**, but only at a **correct seam**: one where the test exercises the real bug pattern as it occurs at the call site. A test at a too-shallow seam gives false confidence. If no correct seam exists, that is itself a finding; note it.

Where the test goes: a scenario in the harness that owns the area, else a new probe in tools/. Then:

1. Turn the minimised repro into a failing test. Watch it fail. If you forced the red by mutating code or a fixture, `diff` against a pristine copy to prove the mutation landed.
2. Give Jess the prose fix plan (no code) and wait for the OK.
3. Apply the fix. Watch the test pass.
4. Re-run the Phase 1 loop against the original, un-minimised scenario.
5. Re-check the mutation patterns against the edited files, and keep new code within Prettier's 120 columns.

## Phase 6: Cleanup

Required before declaring done:

- [ ] The original repro no longer reproduces (re-run the Phase 1 loop)
- [ ] The regression test passes, or the missing seam is documented
- [ ] All `[DEBUG-...]` instrumentation removed (`grep` the prefix)
- [ ] Throwaway prototypes deleted, or moved to a clearly marked place under tools/
- [ ] `npm run format` and `node tools/check.js` are clean
- [ ] Commit with the winning hypothesis in the message (no Co-Authored-By line)
- [ ] Comment on the issue with what was found and fixed, and move its card to Needs Playtest (never straight to Shipped)
- [ ] Add a short DEVLOG.md entry (about 6 lines)
