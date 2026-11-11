## 2026-11-11, #76: timed effects join the status chips in a good band and a bad band (Jess)
The character info panel's chip area grows to four lines: a bad band (2 lines next to the life meter: major, minors, stat drops) and a good band above it (2 lines: stat raises, regen, berries, altar power). The bands sit at fixed heights, and each fills its lower line first. Shake Off moves above the stack.
Stat changes now get chips as well as their on-sprite effect (reverses that part of #78). A stat's chip is its net stage, in the band its sign puts it in.
Tags are 3 letters, with no icon and no stage digit (the on-sprite effect shows the size). Berries use their berry names; there is one chip per type guard, in its type colour. A band past 12 chips shows "+N" in its last slot. The pause menu holds the detail.
Max count: bad 10 (one major, four minors, five drops), good 11 plus guards.
Canonical: docs/HUD-STYLE.md "Effect chips: good and bad bands (#76)".
