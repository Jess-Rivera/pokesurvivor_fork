# SPEED IV/EV INVESTMENT SLICE (design, NOT built, 2026-10-21)

Goal (Jess): investing in Speed should be worthwhile, but Speed must stay level-independent and
runtime-independent (Speed is a fixed species identity, DECISIONS 2026-10-17 Speed-Identity). So
IV/EV should move a Pokemon's movement speed, while level and run time never do.

Status: BLOCKED on IV/EV storage, which is deferred (DECISIONS: IV/EV in the formula but fixed at 0,
own storage later). This is a two-part feature; only the formula part is trivial, the storage part is
its own slice. Do NOT add the formula plumbing alone: every caller would pass 0, leaving dead code
that looks implemented. Build both parts together.

## Part A: the decoupled formula (trivial, do it WITH part B)
Today: `speedToPx(baseSpe)` = `BASE_PX * moveTransfer(statValue(baseSpe, 50) / statValue(65, 50))`.
It passes NO iv/ev, so investment does nothing. The fix is to include iv/ev in the NUMERATOR only,
both sides still at the fixed reference level 50 so level/runtime never enter:
```
function speedToPx(baseSpe, iv = 0, ev = 0) {
  const r = statValue(baseSpe, 50, iv, ev) / statValue(SPEED_MEDIAN, 50);
  return BASE_PX * moveTransfer(r);
}
```
statValue already takes iv/ev: floor((2*base + iv + floor(ev/4)) * level/100) + 5. Keeping level at 50
on both sides is what makes Speed level-independent while letting investment shift r up the curve.
player.js would pass the mon's stored Speed iv/ev: `G.Stats.speedToPx(mon.stats[5], spe_iv, spe_ev)`.

## Part B: IV/EV storage (the actual work)
- A per-Pokemon place to store Speed IV/EV (and eventually all six), save-persisted, backward
  compatible with old saves (absent -> 0, same pattern as runSlots/berrySlots).
- A way for the player to INVEST (the EV source: training, items, a screen, TBD, a design question).
- Wire part A to read it. Decide the investment scale (mainline caps: 31 IV, 252 EV, EV/4; or a custom
  scale). Note this is separate from the in-run stat CARDS (incOf), which are a multiplier layer on top.

## Reference numbers (modeled at MOVE_MAX=3, Shuckle base 5 / Regieleki base 200, median 65 -> 107 px/s)
Using the Part A formula. Investment = IV (0 or 31) + EV (0 or 252).

Shuckle (base 5, the floor):
  0 IV / 0 EV      -> r 0.143  53.8 px/s  (0.50x median)
  31 IV / 0 EV     -> r 0.357  57.2 px/s  (0.53x)
  0 IV / 252 EV    -> r 0.586  68.3 px/s  (0.64x)
  31 IV / 252 EV   -> r 0.814  87.6 px/s  (0.82x)   full investment +63%

Regieleki (base 200, the ceiling):
  0 IV / 0 EV      -> r 2.929  244.5 px/s (2.29x median)
  31 IV / 0 EV     -> r 3.143  251.8 px/s (2.35x)
  0 IV / 252 EV    -> r 3.371  258.5 px/s (2.42x)
  31 IV / 252 EV   -> r 3.600  264.3 px/s (2.47x)   full investment +8%

## Known behavior: investment has INVERSE-scaling returns
Because moveTransfer saturates toward MOVE_MAX=3, investment is huge for slow mons (+63% Shuckle) and
small for fast mons already near the ceiling (+8% Regieleki). Median gets ~+61%. This compresses the
field (slow mons can invest to catch up; fast mons are already maxed). Jess reviewed the tuning variants
(raise MOVE_MAX, or a post-curve flat bonus) and chose NEITHER, keep the plain curve as the reference.
If fast-mon investment should matter more later, the levers are a higher MOVE_MAX (also raises baselines)
or a flat post-curve px/s bonus (same absolute gain for everyone). Not wanted now.

## Interaction with bullet-time
Speed investment raising a fast mon's px/s feeds straight into bullet-time (BULLET-TIME-DESIGN.md): more
Speed -> more dilation above the 250 threshold. The two features compose cleanly (investment changes the
input px/s; bullet-time reacts to it). No special handling needed.
