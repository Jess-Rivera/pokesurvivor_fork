// tools/library/hud-health-draft.js: the HP numbers shared by the HUD's bar set run.hud.playerActive.bar
// (hud-exp-draft.js). A plain script sharing the board's globals; index.html loads the board's files in order, board.js
// first and start.js last. Its own page (run.hud.playerActive.healthBar) folded into run.hud.playerActive.bar (Jess
// 2026-11-19: the HP and EXP bars are one bar).
'use strict';
// ---------- the active Pokemon's HP numbers, right of its bar (js/ui/hud-player-panel.js HP_TEXT) ----------
// Silver 20 px, the Pokemon tier (decision 2026-11-18-155-font-scheme-three-tiers: names, Lv, HP), white with the ink
// outline. A board copy: nothing here reads the game's panel.
const HEALTH_SET = {
  max: 120, // a sample Pokemon's max HP
  hp: 87,
  hit: 22, // a hit in the demo: full, 98, 76, then 54 crosses into yellow (under half)
  textGap: 8, // px from the bar's right edge to the numbers (HP_TEXT.x 218 less LIFE.x -252 less the bar's 462)
  textWidth: 110, // px kept for "120 / 120" in the box
};
const HEALTH_FONT = { family: 'Silver 10px', size: 20, today: 'HudText' }; // font.silver; today font.hudText (retiring)
// The numbers hold still as HP drops (Jess 2026-11-19): the current HP sits in a box as wide as the max's digits,
// right-aligned, so going from 120 / 120 to 98 / 120 moves neither the slash nor the max. Silver's digits are all one
// width, so the box is the max's digit count in ch. Only a new max (a level-up) can move them.
const hpCurrent = (hp) => String(Math.ceil(Math.max(0, hp)));
const hpLine = (hp, max) => {
  const digits = String(Math.round(max)).length;
  return `<span class="lib-hb-current" data-hb-current-hp style="min-width:${digits}ch">${hpCurrent(hp)}</span> / ${Math.round(max)}`;
};
