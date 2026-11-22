# 2026-11-17: #137b each ball keeps its own slot; the player arranges them in the Shop (Jess)

- The save keeps the belt slot by slot (save.belt.slots), not counts per tier. Old saves convert on load, best tier
  first (the order they always showed), so no save needs clearing.
- A bought ball goes into the first empty slot (belt 1 top to bottom, then belts 2 and 3); nothing already placed moves.
- Arranging, on the Shop's Pokeballs tab only: click to pick up and click to put down, or drag; by keys Enter or Space
  picks up and puts down. Onto an empty slot it moves, onto a ball the two swap; Esc or anywhere else puts it back.
- A throw empties its own slot in the save until a buy fills it. The catch screen shows the saved layout and starts on
  the best ball's first slot.

Canonical: js/systems/catch.js header (belt) and js/ui/shop-balls.js header (arrange). Plan: docs/AI Outputs/Issue-137/137b - Belt Slots and Rearranging Plan.md.
