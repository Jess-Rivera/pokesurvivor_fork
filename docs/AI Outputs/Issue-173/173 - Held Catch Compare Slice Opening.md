# 173 - Held Catch Compare Slice Opening (child of #128, follow-up to #146, 2026-11-27, PROPOSED)

Branch feature/138-146-lost-and-full-box. Rulings: decision 2026-11-27-173-held-catch-fully-rolled-and-owned-box.
Opening only: goal, done, test, and the open decisions. The prose build plan follows once these are agreed.

## What the code does today vs the slice

```mermaid
flowchart LR
  C["Caught, or a Lost Pokemon recruited"] --> H["G.Catch.hold<br/>keeps dex, name, nature only"]
  H --> S["Run end: G.Catch.settle"]
  S -- today --> R["G.DB.obtain rolls a NEW copy<br/>(UUID, IVs, ability, gender, size)"]
  H -. "after #173" .-> F["hold rolls the whole copy now<br/>(G.Copies' own roll)"]
  F --> P["Placing keeps that exact copy"]
  F --> L["Keep-or-sell list: the catch's own stats,<br/>and an owned box for its species"]
```

| Part | Today | After #173 |
|---|---|---|
| Held catch | dex, name, nature | a full compact copy (the save's box shape) |
| Placing | rolls everything but the nature | places the held copy as it is |
| Keep-or-sell row | portrait, nature and name, rarity stars, price | the same, plus its own tooltip (open decision 2) |
| Comparison | none | an owned box beside the list for the selected row's species, a tooltip per copy |
| Old saves | | a held catch saved before #173 has no roll: it rolls when placed, as today |

## Goal
Before choosing Keep or Sell, the player can see a held catch's own rolls and compare them with the copies of that
species they already own.

## Done when
- A held catch carries its whole roll from the moment it is held (catch and Lost recruit alike); placing it keeps the
  same UUID, nature, ability, IVs, gender, height and weight.
- The keep-or-sell list shows a small owned box for the selected row's species (every copy you own of it); it follows
  the selection, and shows an empty state when you own none.
- Hovering (and, per decision 4, focusing) a copy in the box shows its stats, nature and ability.
- An old save's held catches still place and sell; the #146 harness and smoke still pass; check.js clean; Jess feel-tests.

## End-goal test (written first)
Harness (extends docs/proposals/keep-sell-harness.js), relations only:
- a held catch has every field a box copy has, and its IVs, nature, ability, gender and scales are in range;
- after Keep, the placed copy equals the held one field for field (same UUID); after Sell, no copy with that UUID exists;
- two held catches of one species roll independently of each other (their UUIDs differ);
- a held catch without a roll (an old save) still places, with a fresh roll, and still sells;
- a Lost Pokemon recruit is held with a full roll, same as a catch.
Smoke (extends tools/smoke-keep-sell.js): fill the boxes with copies of one species, end a run holding that species
and another; the owned box lists exactly the owned copies of the selected row's species and changes when the
selection moves; hovering a copy shows a tooltip naming its nature and ability.

## Open decisions
1. When is the roll made: when the ball catches it, or when the catch window opens (the catch screen could then show
   the wild Pokemon's own rolls before you throw; one that flees takes its roll with it)?
2. The held catch's own rolls in the list: a tooltip on its row (same look as the owned copies'), or a stats line in
   the row itself?
3. Tooltip contents: the catch screen's owned tooltip shows name, gender, box, then IV + EV per stat. Add nature,
   ability (hidden marked), height and weight to it on both screens, or only on the keep-or-sell list?
4. Keys: can the selection cursor move into the owned box (as on the catch screen), or does the box follow the
   selected row with its faces hoverable by mouse only?
5. Look: sketch it on the UI library board first (as #146 was), or build from the catch screen's existing owned panel?
