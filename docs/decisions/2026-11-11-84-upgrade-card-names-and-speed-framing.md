## 2026-11-11, #84: upgrade card renames, speed framing for the dividing cards, All Damage Up (Jess)
Gate Reduction, Cooldown Down and Delay Down keep their dividing maths and are named as speeds, so "+X%" is exactly true:
Stat Climb Speed Up (+10%), Attack Speed Up (+15%), Impact Speed Up (+15%). Recoil Down becomes Recoil Reduction, its description shows the real share of base recoil now and after the pick.
Renames: Duration Increase to Stat Change Duration Up, HP Regen to Bench Regeneration Up, Vitamins to Pick a Vitamin (3 choices kept), Count Up to Projectile Count Up, Chain Up to Chain Hops Up, Reach Up to Range Up, Velocity Up to Projectile Speed Up, Time Up to Lifetime Up. Pierce, Knockback, Ailment Chance, Heal and Shield keep their names.
Capped cards say so: "Can be taken 3 times per run" (Count), 4 (Pierce).
Damage Up retires; All Damage Up at +5% replaces it, sharing the pool with the type Damage cards (they add, as now). Normal Damage already exists as a type card.
Heal Up covers every move heal (drain and heal over time), never Bench Regeneration or berries.
Area Up becomes Size Up (maths unchanged, +15% covered area), Presence Up becomes Width Up; the tooltips tell them apart: Size Up "The whole attack grows (+15% area)", Width Up "Attacks get wider, never longer: cones open, beams thicken".
Canonical: docs/UPGRADE-CARDS.md (names, hints and per-pick tables); steps in js/systems/team-cards.js.
