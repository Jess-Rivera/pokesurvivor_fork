# Slice 2: code handoff (for the CODING chat)

> HISTORY (frozen 2026-10-28, Phase 4 batch B4b). This is the record of an executed slice. Its decisions are absorbed into docs/MOVE-AXIS-SCHEMA.md (grammar), docs/current feature planning/combat-architecture.md section H and D (runtime rules), docs/MOVE-INTENT.md (per-move rulings), docs/COMBAT-RULES.md (combat rules). Where this text and those documents differ, those documents win. Body below unchanged.

Back to slice-overview.md. Plan and decisions: slice-2.md. Status: APPROVED by Jess 2026-10-26. This file is the approved plan, so build it, test it and write it into the repo in one step. No second proposal is needed while the work stays inside the scope below. If the scope must grow, stop and tell Jess in prose.

## Startup for the coding chat
Read CONTEXT.md, STATE.md, CLAUDE.md (auto), slice-overview.md, slice-2.md and this file. Nothing else up front. Do NOT read js/data/moves-generated.js (38 KB) or js/data/moves.js (31 KB) whole, and do not read DECISIONS, DEVLOG or BALANCE whole: search them. The legacy cooldown rule is in js/data/moves.js, search "Cooldown and per-cast normalization" (about 40 lines; the E, norm and floor parts are NOT carried over). Work rules are in CLAUDE.md (no code in chat, no em-dashes, read-only git, no Co-Authored-By in commit messages).

## Scope (nothing the game loads)
None of the new files is added to dev.html, the NEED array in js/main.js or tools/build.js. Slice 2 changes no gameplay. Load order everywhere (node tools and later the game): move-attributes.js, moves-generated.js, move-overrides.js, move-handler.js, move-resolver.js. Node tools follow tools/validate_moves.js (global G, require in order). Proposed globals: G.MoveOverrides, G.MoveHandlers, G.MoveDefs (resolved output); grep first to confirm no collision.

### 1. js/data/move-overrides.js
- One table keyed by move id. Each entry holds only the fields it replaces, plus a one-line reason.
- Seed entries: fire-spin, leaf-storm, gust, flame-wheel. The replaced field is cd (the grammar already has an optional hand-set cd). Copy each value from legacy moves.js (these are the hand-set re-hit or spacing values, not the PP formula).
- Nothing else goes here. A rule change belongs in the resolver, not an override.

### 2. js/data/move-handler.js
- Registry for the 6 specials already tagged in moves-generated.js: berrySteal, fixedDamage, chainDamageFalloff, levelDamage, setWeather, statusBonus.
- Each entry declares: its parameters, WHEN it fires (a value from the grammar's closed trigger list: cast, casterMove, termination, enemyHit, interval), an optional condition (only berrySteal has one, targetHasBerry), and a stub reason. berrySteal stays a stub (no berry system).
- Intended triggers (VERIFY against the six moves' data): enemyHit for all except setWeather, which is cast.
- Declarations only. No execution code.

### 3. js/data/move-resolver.js
- Eager at load. The resolving step is a function that takes move data, overrides and handlers and returns the resolved set; load calls it once. Tools call it directly (the timing line needs this).
- Order: grammar defaults (field d), derived values, overrides, handler attachment.
- Output: new resolved definitions only. No kind, no flat projection in old field names.
- Derived values (only cd):
  - cd = 0.5 x (35 / PP) for damaging moves. Status moves keep the hand cd the data gives them.
  - NO normalization: do not compute dmg, E, a cone cap, norm or a per-hit floor. Jess decided to drop them until a damage simulator shows they are needed. The resolved definition keeps the raw power. Accuracy, flavor_text and all other raw facts pass through untouched (flavor_text is the description; hand-written desc waits for the UI slice).
- The resolver checks only its own inputs: an unknown override field or handler name stops the load with a clear message. Grammar validation stays in tools/validate_moves.js.

### 4. tools/move_parity.js (plus check.js hook)
- Compares cd and power (vs legacy dmg) against legacy for all 63 moves and writes docs/current feature planning/move-parity-report.md next to the coverage report. Leave a blank column where Jess marks any difference intended or regression.
- Expected differences: none. cd matches legacy for all 63 moves (45 by formula, the four orbit/trail moves by override, status moves by hand cd) and power equals legacy dmg for the 51 damaging moves. Any difference is a finding to report, not to hide.
- A report, not a gate: non-zero exit only on a crash or resolver error.
- Timing line: clone the 63 moves up to 1000 synthetic ones (new ids, no mutation of the originals), time the resolve, print the milliseconds. Also print the projected size of moves-generated.js at 1000 moves (38 KB for 63 now). Report line only, not a gate.
- Small assert-based self-test in the style of validate_moves.js (a handful of cases: Tackle cd 0.5, a status move keeps its hand cd, an override applied, an unknown override field rejected, an unknown handler name rejected).
- tools/check.js runs the tool like it runs validate_moves.js. Expected result: all harnesses pass, 17/17 plus the new checks.

## Note for the build
Loading legacy moves.js in node for the parity tool (a browser IIFE using G): if it will not load plainly, use a vm sandbox with a stub G. Only ask Jess if it would force a change to moves.js, which is out of scope. No other questions are open; start building.

## Finish (coding chat)
Verify: node tools/check.js, then the parity report. Update slice-2.md (results, which differences were intended), slice-overview.md (slice 2 status), STATE.md (rewrite, under 3 KB), DEVLOG.md (append about 6 lines). Give Jess the commit commands and remind him to commit and push. Slice 3 is a re-plan in a new planning chat.

## Prompt to start the coding chat
Catch me up, then build slice 2 of the move-schema rewrite. Read CONTEXT.md and STATE.md, then docs/current feature planning/move-schema/slice-overview.md, slice-2.md and slice-2-codehandoff.md, and nothing else until you search for it. The handoff file is the approved plan: follow its scope and rules, including not reading moves-generated.js or moves.js whole. Then build, run node tools/check.js, update the docs listed in the handoff, and give me the commit commands.
