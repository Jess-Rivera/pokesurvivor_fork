# Upgrade rework, slice 2 proposal: data-driven mechanic cards

Status: PROPOSAL, nothing applied. Written 2026-10-18. Follows slice 1 (deletion, applied, uncommitted).
Companion: the Move Catalogue Explorer artifact and `docs/move-catalogue-preview.json` (the numbers below come from that export).
Rulings this builds on are in DECISIONS.md, entries "2026-10-18, Upgrade rework (in-run)" and later.

## 0. What this slice delivers, in one paragraph

The Lv 1-5 ladders and the `Nv.` move level go away. A move instance carries `mods = { mechanicId: stacks }`, and a `derive()` recomputes its effective fields from the base definition plus those stacks. The mechanics live in two new data files (`kinds.js`, `mechanics.js`), so a move imported from PokeAPI later only needs a `kind` and the stat keys it actually has to become upgradeable. Level-up cards become: a draw by family, then three steps (card, Pokemon, move), with the auto-advance shown. The six stat cards and the Type/Kind scoped cards ride on the same pipeline.

## 1. Slicing (each slice is playable, nothing is built that cannot be tested)

| Slice | Content | Player-visible change | How it is verified |
|---|---|---|---|
| 2a | `kinds.js`, `mechanics.js`, `mods` + `derive()` on instances, dev assertions. Ladders stay live. | None | Node harness (below) on all 64 moves; dev.html boots with assertions on |
| 2b | Mechanic cards live. Ladders deleted. Card -> Pokemon -> move flow, family draw, HUD/summary text. Fan-spread fix. | Yes, the main change | Your playtest on dev.html?dev plus the harness |
| 2c | Six stat cards (per Pokemon) and Type/Kind scoped cards | Yes | Harness for the stat math, your playtest |

Approve slices one at a time. 2a can be approved and applied without committing to 2b's UI.

## 2. Data layer (slice 2a)

### 2.1 Stat-key vocabulary (fixed, engine-owned)

`dmg, cd, count, pierce, speed, radius, width, arc, size, life, dur, rate, stacks, amount, knock`
Reserved, held out until the engine supports them (`live:false`): `critStage, flinch, ailmentChance, drain, hits, homing, burn, poison, slow`.

### 2.2 `js/data/kinds.js` (NEW)

One entry per delivery kind the engine implements today (15). Shape:

```js
G.Kinds = { projectile: { wkind: 'Projectile', keys: ['dmg','cd','count','pierce','speed','size','life'],
                          nouns: { count: 'Projectile', area: null } }, ... }
```

- `keys`: the stat keys the engine hook for this kind actually reads. This is the single source of truth for "which mechanics can this kind take".
- `nouns`: the card wording per kind (Count = Projectile / Orb / Boomerang / Jump / Mine / Strike / Turret, Area = Reach / Orbit Radius / Length / Blast Radius ..., Recharge = Re-hit Speed for orbit, Puddle Rate for trail, Speed = Spin Speed for orbit).
- The four workbook kinds with no moves yet (Mend, Ward, Control, Field) are NOT added. They are added when the engine gets a hook for them. The explorer shows them as "not in engine yet".
- Dev-time assertion at boot (dev.html only, no cost in the build): every `(kind, key)` pair listed is read by the matching hook in `combat.js`. This is a static table check I would write by hand-mapping the grep of `m.<key>` per function, so it catches drift when someone edits one side.

### 2.3 `js/data/mechanics.js` (NEW)

```js
{ id:'count', label:'Count', key:'count', mode:'add', step:1, class:'DPS',
  requires: m => kindHasKey(m,'count'), ceiling: m => 64 }
```

- `mode`: `add` (base + stacks x step, base defaults to 0 when the kind supports the key, so a cone without a `pierce` field can still take Pierce), `inc` (joins the summed percentage pool for its key), `rate` (see 2.5).
- `class`: DPS, Coverage or Utility (your three value classes).
- `requires`: eligibility predicate. Reads the move's keys, never its id or kind name. This is what makes PokeAPI imports seamless.
- `ceiling`: returns true when another stack would be meaningless (arc already 360 degrees). A capped mechanic is ineligible and shown dimmed, per your ruling.
- `live:false` entries are registered but never offered. Placeholder steps: Increased Effect +10%, Recharge +15%, Count +1, Fire Rate +15%, Pierce +1, Area/Width/Arc/Size/Shot Range/Projectile Speed/Duration +15%, Knockback +20%, Buff Stacks +1.
- Eligible counts across the current 64 moves (verified against the export): Effect 55, Recharge 64, Count 34, Fire Rate 2, Pierce 18, Area 39, Width 7, Arc 11, Size 26, Shot Range 18, Speed 26, Duration 12, Knockback 15, Stacks 5.
- 9 non-buff moves have Power 0 (toxic, string-shot, dragon-rage, night-shade, spikes, toxic-spikes, hail, will-o-wisp, substitute), so Increased Effect is correctly ineligible for them. 47 moves carry at least one not-live field, which is held out, not an error.

### 2.4 Move instances and `derive()`

- `G.Moves.instance(id)` returns `{ ...def, id, def, mods: {}, t: 0 }`. `lvl` and `maxLvl` and `ups` disappear (see touchpoints, section 6).
- `G.Moves.addStack(m, mechId)` increments `m.mods[mechId]` and calls `derive(m)`.
- `derive(m)` rebuilds the effective fields from `m.def` every time (never from the previous effective value), so stacking is order independent and a save/replay is exact.
- Engine code keeps reading `m.count`, `m.cd`, `m.radius` etc. unchanged. No hook in `combat.js` needs to know mechanics exist (the fan-spread fix in 2b is the one exception).
- `norm` and `floor` are NOT touched by `derive()`. They stay frozen at the base count (existing ruling), so added pellets add real damage.

### 2.5 Formulas

- Damage pool (one summed pool, per your ruling): `dmg_eff = base.dmg x (1 + sum(Increased Effect stacks x step) + sum(scoped Type/Kind stacks x step))`.
- Stats (slice 2c) are a separate group that multiplies on top: `(Base + flat) x (1 + sum(stat cards))`.
- Rate mechanics (Recharge, Fire Rate) are additive in rate, so they never reach zero: `period_eff = base_period / (1 + sum(stacks x step))`. Ten Recharge stacks at +15% is 2.5x the cast rate, not -150% cooldown. `pl.cdMul` (meta perks) still multiplies afterward, and the existing `max(0.05, ...)` floor in combat.js stays.
- Orbit re-hit and trail puddle rate use the same Recharge mechanic through their `cd` key (that is why the noun table renames it). Their `norm` stays frozen, so extra re-hits are real extra damage. Intended.

### 2.6 Moves keep the same 64 definitions (in-place migration)

No move row in `moves.js` changes. The only edit to the file: delete `LADDERS`, `EVO`-era leftovers (`ups`, `maxLvl`, `applyMods`, `levelUp`, `nextUpText`), add `mods`/`derive`/`addStack`, and export them. Mechanic eligibility comes from the keys already on each row, plus the kind's key list. That is why the export already reproduces the Tier A table without touching moves.js.

### 2.7 Offline harness (I write it, you do not need to run it)

`docs/proposals/` scratch only, not shipped:
1. For all 64 moves, `derive(instance(id))` equals the current definition field for field.
2. For every mechanic and every eligible move, one stack changes exactly the field the catalogue preview says and nothing else.
3. Ineligible pairs are rejected by `addStack`.
4. Stacking 50 of every eligible mechanic yields finite numbers, `cd >= 0.05`, `arc <= 2 pi`, `count` an integer.
5. The `(kind, key)` assertion table passes.

## 3. Card flow (slice 2b)

### 3.1 Draw by family

1. Roll the family, then a card inside it, so the 14 mechanics cannot swamp the rest. Families: New Move, Stat (2c), Scoped (2c), Mechanic-DPS, Mechanic-Coverage, Mechanic-Utility.
2. Draft weights (tunable in one table, balance later): New Move 10 while a slot is free, Stat 12 (2c), Scoped 8 (2c), Mechanic-DPS 14, Mechanic-Coverage 10, Mechanic-Utility 6.
3. A card is only offered if at least one Pokemon on the team has at least one eligible move for it (a card with no legal target never appears). A family with no legal card is dropped from the roll.
4. Same `offer(pl, n = 3)` entry point and the empty-offer guard from slice 1 stay.

### 3.2 Three steps, with the auto-advance shown

1. Pick a card (existing screen, new card copy from the noun tables, e.g. "+1 Projectile", "+15% Recharge").
2. Pick a Pokemon from the team strip. Pokemon with no eligible move are dimmed. Fainted Pokemon stay eligible (your ruling). If exactly one is eligible, the screen still appears for a beat, highlights that one, and advances.
3. Pick a move on that Pokemon. Ineligible moves are dimmed with the reason ("arc is already 360"). Same auto-advance rule if there is one choice.
4. Rerolls apply to step 1 only, as today.
5. New Move cards skip steps 2 and 3 for the active Pokemon only, as today (learning a move targets the Pokemon on the field). Open question 5 asks if you want New Move to target any Pokemon as well.

### 3.3 Where it lives in code

- `js/systems/levelup.js`: `candidates` builds mechanic cards from `G.Mechanics`; `offer` rolls by family. Cards now carry `needs = { eligible: (pl, m) => bool }` and an `apply(targetPl, targetMove)`.
- `js/ui/run-ui.js`: `showLevelUp` becomes a small state machine (card, Pokemon, move). Reuses the existing card element and the `scr-levelup` screen; the Pokemon step reuses the roster sprites already drawn for the team strip. Needs new markup in `dev.html`/the screen template (propose-and-approve item, shown in the diff).
- `js/game.js` `maybeLevelUp`: unchanged shape, passes `roster` to the flow. The co-op branch is untouched (see 5).

### 3.4 Fan-spread fix (the one engine change)

`fireProjectiles` uses `off = (i/(n-1) - 0.5) x spread x n`. At high counts `spread x n` exceeds 2 pi and the fan wraps over itself. Proposed: `total = min(spread x n, 2 pi x (n-1)/n)` so the fan caps just short of a full circle and projectiles never stack on the same angle. The rule is one line, applied to `fireProjectiles` only (cone uses `arc`, nova is already `i/n`, boomerang `spread` follows the same line). At low counts the result is identical to today.

### 3.5 Display

- HUD move slot: the `Nv` dots (hud.js 465-471) are replaced by a small stack total badge ("+7"), hidden at 0.
- Run-end summary (run-ui.js 119) and bond screen (run-ui.js 194): `Nv.${m.lvl}` becomes `+${total stacks}`.
- The per-Pokemon upgrade history and the yellow hexagon layer are the tabled pause screen, not this slice. `mods` is already the data that screen needs.

## 4. Stat cards and scoped cards (slice 2c)

Per Pokemon, in-run percentage only (flat and tiered values deferred, as ruled).

- Six cards, proposed vitamin names: HP Up (HP), Protein (Atk), Iron (Def), Calcium (Sp.Atk), Zinc (Sp.Def), Carbos (Speed). Step placeholder +5% each.
- Stored per Player as `inc = { hp, atk, def, spa, spd, spe }` (sum of percentages, absent in old state = 0).
- Where they apply, all through existing seams:
  - HP: `gainXp` and `syncLevel` compute `hpForLevel(baseHpStat, level) x (1 + inc.hp) + perksHp`. Taking the card tops up current HP by the gain, like a level-up.
  - Atk / Sp.Atk: `moveFactor(m)` picks `atk` or `spa` by the move's category and multiplies `atkMulAll` by `(1 + inc.x)`. Status moves are unaffected.
  - Def / Sp.Def: `hurt()` already passes base Def/SpD into `applyPlayerDefense`; the stat gets `x (1 + inc.def)` before the ratio.
  - Speed: the `spd` getter multiplies `(1 + inc.spe)`.
- Atk and Sp.Atk cards are drawn with a weight by the Pokemon's move categories (a team of physical movers rarely sees Calcium). Draft: weight x (share of that Pokemon's moves in the category, floored at 0.25).
- Stat cards need only step 1 and step 2 (no move step).
- Scoped cards are mechanics in the same file: `requires` checks `m.type === 'fire'` or `m.kind === 'projectile'`, mode `inc` on `dmg`, so they sum with Increased Effect. They are move-specific (step 3 applies), per your ruling. Offered only when some move on the team matches.

## 5. Save, co-op and compatibility

- Saves: move instances are run-state, not in the save. No save-schema change. Old saves load unchanged.
- Co-op wire (parked): `ghostCast(pl, id, lvl, aim)` and the `m.lvl` slots in `coop.js` (137, 391, 392) and `player.js` 495 keep their shape. In 2b they send the stack TOTAL where `lvl` was. Remote ghosts then replay the base move (no mods), so teammates' attacks look base-level until MP is un-parked and the wire carries `mods`. I would rather say this out loud than leave it ambiguous. The co-op `levelStart` empty-offer guard remains in TODO.
- `tools/export_data.js` reads `maxLvl`: it will export `maxLvl: 0`. The SEO generator is already tracked in TODO for its copy pass.
- `tools/cache/app.js` is a stale generated bundle. Ignored.
- Meta Upgrades menu and Player multipliers (atkMul, cdMul, spdMul, ...) are untouched. They sit in the Base layer and multiply with the in-run pool exactly as the PoE2 model says.

## 6. File touchpoints

| File | Slice | Change |
|---|---|---|
| `js/data/kinds.js` | 2a | NEW |
| `js/data/mechanics.js` | 2a | NEW |
| `js/data/moves.js` | 2a / 2b | add `mods`, `derive`, `addStack`; delete ladders in 2b |
| `dev.html`, `js/main.js` NEED list | 2a | add the two script entries in order (before moves.js consumers) |
| `js/systems/levelup.js` | 2b / 2c | family draw, mechanic and scoped cards |
| `js/ui/run-ui.js` + screen markup | 2b | three-step flow, `+N` text |
| `js/ui/hud.js` | 2b | stack badge replaces `Nv` dots |
| `js/systems/combat.js` | 2b | fan-spread line; `ghostCast` signature note |
| `js/entities/player.js` | 2c | `inc`, HP/atk/def/speed seams |
| `js/net/coop.js` | 2b | send stack total instead of lvl (wire shape unchanged) |
| `js/data/changelog.js`, `DECISIONS.md`, `DEVLOG.md`, `TODO.md`, `GDD.md` | each | free-edit docs, mine to maintain |

## 7. Risks

1. Highest: the three-step UI. It touches the screen markup and the level-up state machine, and level-up is the one screen a run cannot recover from. Mitigation: keep the slice-1 empty-offer guard, add a "no legal target, skip" guard at each step, and test on dev.html with a 6-Pokemon team plus a single-Pokemon team.
2. Unbounded stacking (your intent) will expose perf cliffs: projectile array uses `splice` with no cap. Out of scope here by ruling (endgame perf audit is a TODO), but the harness check 4 keeps the numbers finite so it fails slowly, not weirdly.
3. Balance: 14 mechanics x 64 moves has outliers (Count on a 9-hit nova vs Count on a single beam). The explorer exists so you can spot them; this slice only ships placeholders.
4. A mechanic with no matching engine hook silently does nothing. The (kind, key) assertion exists to prevent exactly this.

## 8. Decisions I need from you

1. Slicing 2a / 2b / 2c as above, applied one at a time? (recommended: yes)
2. Rate mechanics as `period / (1 + sum)` (never reaches zero) instead of the ladder's multiplicative -25%? (recommended: yes)
3. Family weights in 3.1 as the starting draft, tuned later?
4. Fan-spread cap in 3.4 (`min(spread x n, 2 pi x (n-1)/n)`) shipped with 2b?
5. Should New Move cards also get the Pokemon step (teach a benched Pokemon), or stay active-Pokemon-only for now? (recommended: active only for 2b, revisit)
6. HUD stack badge "+N" as the interim replacement for the level dots, until the pause/inspect screen exists?
7. Co-op ghosts replay base moves until MP is un-parked: accepted?
8. Vitamin names for the six stat cards, final, or placeholder?
