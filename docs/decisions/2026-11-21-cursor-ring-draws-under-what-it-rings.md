# 2026-11-21: cursor.ring draws under the piece it rings, so its CRT passes behind it (Jess)

- cursor.ring sits under what it rings. On a well it goes between the well's inside and what the well holds: its CRT
  line and dot show on the well's inside and outside the rim, behind the ball. On a round face it goes under the
  portrait. The steady ring looks the same (it sits outside the rim).
- Found at the catch screen's feel test: the flattened ring crossed over the ball.
- Built: js/ui/lib/primitives/well/well.js (a cursor layer), well.css, cursor.css, css/bw-catch.css (the owned faces).

Canonical: js/ui/lib/primitives/well/well.js and cursor/cursor.css headers.
