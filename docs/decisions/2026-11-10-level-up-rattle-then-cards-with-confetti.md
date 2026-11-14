## 2026-11-10, Level up: the number rattles while you play, then the cards open with confetti (Jess)
A gained level first rattles the HUD's Lv number (pivoting on its base like a sign on a stick, about 0.6 s) while the run keeps playing; it does not freeze.
Once it settles (1.1 s of run time after the level, `LEVEL_CARDS_DELAY` in js/game.js) the upgrade cards pop up and pause the game as before. Levels still queued after a pick open straight on.
As the cards pop up, confetti bursts from the popup's two top corners and showers down the screen while the game is paused; after a pick, what is left fades out over 1 s.
Canonical: docs/HUD-STYLE.md, Motion, "Character info panel (#62)" (level-up order and confetti).
