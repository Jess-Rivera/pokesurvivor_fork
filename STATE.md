# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-23 evening (Quick, work machine).

## Where we are
- ON BRANCH feature/all-moves-import (gym progression PAUSED). NO game code touched this session, docs/design only. check.js not run (nothing in js/ changed).
- THE MOVE SCHEMA is built and optimized in docs/MOVE-AXIS-SCHEMA.md: shape = TWO families (radial radArc+radRadius / linear linLength+linWidth; point = degenerate radial); three axes SPACE/DELIVERY/PAYLOAD + a caster-state group; lifetime is the `endOn` end-condition list ({time:N}, {notActive}, {ownerDeath}, {contact}, {returned}, {offScreen}); enemy-contact owned by pierce. Fields incl. grow, moveSpeed, path (curve/oscillate), turnRate vs aimTrack, orbitRadius, rehit, returnDistance/hopRange, knockback (payload), splash, shield props, multihit+normalize (base scalar = move.norm), emit/spawn (id-or-inline), and a special-handler family (fixedDamage/levelDamage/conditionalDamage/setWeather) + STATE-change (weather) moves. Optimization log holds the disproofs.
- PER-MOVE DECISIONS live in docs/move-decisions.json (durable, in-repo). ~40 of 64 moves locked in the two-family vocab this session; stat-payload blobs all flattened. Tally ~ 15 approved / 30 changed / 19 pending.
- TOOL: docs/move-decisions-dashboard.html, a standalone load/edit/download JSON dashboard (works offline from file://, has a live plain-English schema interpreter). REPLACES the old session-tab reviewer (its export was blocked and stranded edits). Use the LOCAL file (open from Desktop) so download works.

## Next (in order)
1. Jess: commit + push docs/MOVE-AXIS-SCHEMA.md, docs/move-decisions.json, docs/move-decisions-dashboard.html (+ DEVLOG/STATE). The old docs/'move schema review json.txt' is superseded by move-decisions.json.
2. Finish reviewing the 19 PENDING moves in the local dashboard. In the dashboard: filter to "changed" then Approve-all is SAFE (those are reworked+correct); do NOT blanket-approve the 19 pending unreviewed (they may still carry merge bugs like empty payloads / wrong shapes — scrutinize each).
3. Settle open feel-calls: Flamethrower normalize true(90/cast) vs false(270 firehose); Night Shade single-target vs full-circle aura; Psycho Cut crit amount (or none per the D4 no-move-crit lean); Bubble/Mud Shot normalize (done = true).
4. THEN the importer slice (code, prose-plan-then-approve): resolver + the four files (move-data-raw, move-attributes, move-classification, move-overrides) + a 64-move CONVERSION HARNESS proving the current 64 resolve unchanged (the go/no-go gate). Only after it passes: wire the one caster-agnostic executor; then behavior-by-kind; then learnsets; then RESUME gyms.

## Open schema questions
- UNLIMITED hitCap as 0 or a named constant (lean: named constant). splash riders vs damage-only (lean: damage-only). hitCap kept but rarely used (pierce owns directional caps; areas unlimited).

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan, Jess OKs, then build; changelog.js + Markdown docs free-edit. Never run git. New save fields backward compatible. Debug on dev.html?dev.

## Where to look (search, do not read whole)
docs/MOVE-AXIS-SCHEMA.md (the schema + Optimization log + worked examples Ember/Heat Wave/Substitute), docs/move-decisions.json (per-move decisions), docs/move-decisions-dashboard.html (the tool), MOVES-REFACTOR-PLAN.md / MOVES-IMPORT-PLAN.md (the import plan). DECISIONS.md, BALANCE.md, TODO.md. Fast check: node tools/check.js.
