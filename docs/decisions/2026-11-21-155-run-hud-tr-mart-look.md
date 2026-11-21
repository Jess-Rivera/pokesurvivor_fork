# 2026-11-21: #155 run.hud.trMart: the Move Trainer mirrored top to bottom; approved (Jess)

- Every aspect of run.hud.moveMart (2026-11-21-155-run-hud-move-mart-look), the halves swapped: the four TR cards on
  top, the team rows below. Replaces the 2026-11-20 left/right mirror.
- TR cards: card.vertical on panel.shopCard (the Team Items card), the placeholder TM disc as the picture, the name and
  line, the Silver coin and number in the button's place, no button. The picked TR's disc carries cursor.ring
  (cursor.bar at the card's full height looked wrong).
- Team rows: the Move Trainer's (teamSlot's pixel box 6 art rows taller, portrait.round, name, chip.type chips), with
  the status at the right end in Silver 30: root can learn it, equals knows it, multiplication sign every slot is a
  bond, nothing cannot learn it. A dimmed status dims the row, not the symbol. Picking a Pokemon that can learn it buys.
- Reroll Positive, Leave Neutral. The window matches the Move Trainer's.
- Settles the TR price placement (STATE.md open decision): on the card, as the Move Trainer.
- Board: tools/library/run-shops-draft.js. Applied at #126.

Canonical: this file until #126 applies it; then docs/HUD-STYLE.md "Move Shop".
