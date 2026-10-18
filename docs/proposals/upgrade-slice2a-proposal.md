# Upgrade rework, slice 2a proposal: the data layer (no player-visible change)

Status: PROPOSAL, not applied. 2026-10-18. Spec for the whole slice 2 is `upgrade-slice2-proposal.md` (sections 2.x); this is its first piece.
Diff: `upgrade-slice2a.diff` (dry-run applied to a copy of the current files, results byte-identical to the tested files).
Harness: `upgrade-slice2a-harness.js` (offline, Node only).

## What changes

| File | Change |
|---|---|
| `js/data/kinds.js` | NEW. 15 kinds with the stat keys each engine hook reads, card nouns, payload (damage or buff). `hasKey`, `effectKey`, `noun`. |
| `js/data/mechanics.js` | NEW. 14 mechanics (all `live`), modes add / inc / rate, `check(m, mech)` eligibility, `eligibleFor(m)`, card `text(m, mech)`. Placeholder steps. |
| `js/data/moves.js` | `instance()` also creates `mods: {}`. New `derive(s)`, `addStack(s, id)`, `stackTotal(s)`, exported on `G.Moves`. No move row changes. Ladders untouched. |
| `dev.html` | two `<script>` lines (kinds.js, mechanics.js) before moves.js. `index.html` is generated, not edited. |
| `js/main.js` | `Kinds` and `Mechanics` added to the NEED boot check. |

Nothing calls `addStack` yet, so no card, HUD, combat, save or co-op code path changes. A run plays exactly as it does today.

## Behavior of the pieces

- `derive` always rebuilds from the base definition: `(base + adds) x (1 + sum of inc stacks)`, and for a rate key `/ (1 + sum)`. Order of taking cards cannot matter.
- `arc` is clamped to 360 degrees and Arc becomes ineligible there.
- `norm` and `floor` are never touched (frozen at the base count, per the existing ruling).
- A move that already took a ladder upgrade (lvl > 1) refuses `addStack`. Ladders and mods are mutually exclusive until slice 2b deletes the ladders. Nothing offers `addStack` in 2a, so this only guards tests.
- `kinds.js` throws at load if a key list contains a key outside the vocabulary. It is static data, so this only fires on a typo while editing.

## Verification (run, all pass)

1. For all 64 moves, eligibility and card text match the Move Catalogue export exactly.
2. `derive` with no stacks equals the definition for every numeric field.
3. One stack of every eligible (move, mechanic) pair changes exactly the intended field by exactly the step, and nothing else (about 340 pairs).
4. 564 ineligible pairs are refused.
5. 50 stacks of every eligible mechanic, in two opposite orders, give identical finite results, `cd > 0`, `arc <= 2 pi`, integer `count`, `norm`/`floor` untouched.
6. All 54 non-trivial (kind, key) pairs in `kinds.js` are read by the matching function in `combat.js` (checked against the source text).
7. Mutation check: adding `width` to projectile, or changing a step, makes the harness fail as it should.

Re-run any time: `NEW=. node docs/proposals/upgrade-slice2a-harness.js .` from the repo root (after applying) to catch drift between `kinds.js` and `combat.js`.

## Limits worth knowing

- Check 6 is a text match on `m.<key>` inside the hook functions, not a behavioral test. It catches a key listed for a kind whose code never reads it, not a key read with the wrong meaning.
- Turret, mine, meteor and trail read some keys inside `updateFields`, so those kinds are checked against that function too. A key read there for a different kind would pass. Slice 2b's in-game playtest is the real test.
- `docs/move-catalogue-preview.json` is still generated from the old script (`$HOME/work/cat/build.js` outside the repo). After 2a the same numbers can come from `G.Mechanics` itself. I would switch the generator then; not part of this slice.

## To apply (after your OK)

I apply the diff, re-run the harness on the real files, append DECISIONS/DEVLOG/TODO, and you test by loading dev.html?dev (the game should behave exactly as before; the new boot check will flag a missing script). Commit is yours.
