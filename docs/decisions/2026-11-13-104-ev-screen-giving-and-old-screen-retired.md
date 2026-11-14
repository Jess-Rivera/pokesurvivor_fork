## 2026-11-13, #104 EV screen: click 1, Shift-click 10, hold to repeat; the old allocation screen retired; shared dialog for now (Jess)
New rule: on the EV screen a click on + or - moves 1 EV, Shift-click moves 10 (cut to what fits), and holding either repeats after 0.35 s at about 12 a second (until now one click was one EV, up to 252 clicks).
The old allocation screen (scr-evs, run-ui.js showEvs) is retired, not kept for co-op: co-op runs carry no EVs (deferred).
Learn's and Go Home's asks use the shared G.UI.ask dialog. Restyling that dialog to the pause menu's look is a later problem (an issue to file).
Defaults taken with the plan: "x / 510" counts this screen's additions live; - only takes back this screen's additions; Learn has the focus first; Esc does nothing.
Plan: docs/ASCII Concept Maps/104 - EV Screen Build Plan.txt.
Canonical: docs/PAUSE-MENU.md section 7.
