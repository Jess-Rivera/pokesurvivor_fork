## 2026-11-09, #42 item 13: one swap clock and one swap point, in your order (Jess)
The leader's slot-swap lock ticks in its own update before its frame, yours in game.js after everyone moves; and the leader's mon swap lands after its body and sim pass, one frame later than yours. Neither is authored, so both are bugs: every Player entity gets one shared lock tick and one swap point, in your order. Folded into #43 (it reorders the frame), with the leader's autoShake moved onto your shake path.
Canonical: docs/LEADER-AI.md (FRAME)
