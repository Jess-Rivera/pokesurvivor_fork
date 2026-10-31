# Slice 5 build handoff (5a trackers, then 5b team cards)

Back to slice-5.md. Written 2026-10-30 (home, Claude Code) for a fresh build chat. Model: Opus (new runtime).
Workflow: CLAUDE.md "Edit boundary" (prose plan in chat, no code, Jess OKs, then build, run `node tools/check.js` and the harnesses, write to the repo). Jess runs all git.

## Read first (and only these)
- Rules: docs/COMBAT-RULES.md "Stat stages" SS1 to SS13 (SS8 now includes the active-group and swap-in rules), combat-architecture:H26.
- 5a map: docs/ASCII Concept Maps/Slice 5a - Stat Stage Trackers.txt (sections 2 to 8 are the build).
- 5b map: docs/ASCII Concept Maps/Slice 5b - Cards From Fields.txt (section 3 is the card list).
- Rulings: slice-5.md "Plan rulings".

## 5a: code facts found 2026-10-30
- js/systems/stages.js: per-host timed lists `h.stg[stat] = [{ n, t, src }]` (add, tick), and the team store `stgTeam` (teamAdd, teamTick, teamSum, TEAM_GRACE, TEAM_LIVE). stgTeam also carries non-stage keys (Aqua Ring `regen`, `crit`, berry `pct_def` / `pct_spd`; player.js `regen` getter and `incOf`). Keep the legacy store working: put trackers in their own store and add them into `stage()`.
- Still writing the legacy lists until 7b: enemy procMove drops on the player, procSelf, SLOW and HASTE carriers, Flamethrower's quiet caster slow (`add(..., quiet)`).
- js/systems/move-effects.js `stat()` (about line 132): foe src is the move id only today; it becomes move@caster (srcOf). Self changes roll once per cast on the cast's FIRST enemy hit (SS2), self drops included. Payload order is damage then stat.
- js/systems/move-sim.js tick (about line 360): only the active group casts; slots with `def.cd == null` are skipped, so pure buffs need a new cast-on-Gate branch, active group only. Swap-in: find where "the swapped-in move fires at once" lives (player.js SWAP_LOCK / setActive) and make a pure buff fire only with no Gate running.
- Stat moves and resolved cds: swords-dance, agility, harden, dragon-dance (cd 8, removed in pass 2); metal-claw 0.5 (10%), meteor-mash 1.75 (20%), leaf-storm persistent; foe drops ice-beam, shadow-ball, flash-cannon, psychic, mud-shot, bulldoze, string-shot, bug-buzz, bubble-beam.
- Pass 2 (after the harness is green): remove `maxStacks` and stat `duration` from docs/move_rework_holding/move-conversions-described.json, move-attributes.js, move-resolver.js, the 4 buff cds in move-overrides.js; validator rejection in tools/validate_moves.js; readers in tools/move_parity.js and tools/move_report.js; Jess re-runs tools/export_moves.js (regenerates moves-generated.js).

## 5b: code facts found 2026-10-30
- Today's cards: js/data/mechanics.js (catalogue, modes add / inc / rate, SCOPED type and kind cards, STATS), js/data/kinds.js (per-kind keys and nouns), js/systems/levelup.js (family draw, FAMILY_W, 2-buff limit on `kind === 'buff'`), js/ui/run-ui.js (choose sheet steps, about lines 79 to 142), js/ui/sheet.js (preview through G.Moves.derive, about line 132), js/data/moves.js addStack / derive.
- New path reads `G.MoveDefs[id]` in move-sim.js (4 places) and move-render.js (2): these read the folded team def.
- Stat cards today: player.js `inc` (per Pokemon) and `addStat`; `badge` is already a run-long bonus for every member, bench included: Vitamins can use that path.
- Bench loop: game.js about line 838 (`benchUpdate`): HP Regen goes there (bench only).
- No mid-run save exists (pause only): the team store is run state, no save migration.
- Gym leaders apply per-move stacks through G.Moves.addStack (gyms.js, gym.js): unchanged until 7a.
- Flag: `G.MoveRoute.on` (?dev&newcombat). Team cards only under the flag; the legacy flow keeps per-move cards until 7b.
- Eligibility counts today (resolved defs): Count Up 17 moves, Pierce Up 16, Time Up 8, Chain Up 3, Delay Down 1 (rock-slide), Recoil Down 1 (substitute).

## Ask Jess at the start of the 5b plan
- Thin cards: build Delay Down and Recoil Down now, or defer like Splash?
- Working names OK for the build (Area Up, Speed Up, ...)?
- Count Up and Pierce Up caps: placeholder numbers in the build, tuned in slice 6.

## Not in slice 5
Bond tax (Bond branch), gym Harden (7a), SLOW/HASTE (7b), Dodge Cooldown card (dodge branch), the New Move cards rework, the run identity question.
