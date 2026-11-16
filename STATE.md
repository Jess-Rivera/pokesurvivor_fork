# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-16, Claude Code (home). Branch: feature/128-acquisition (off main, not merged). No branch rules file.

## START HERE (next session, either tool)
1. #148 catch odds BUILT 2026-11-16, Needs Playtest: Jess's shake formula (capture_rate back, faster win = easier,
   critical from 31 species, honest wobble count). Feel test 1 to 4 stars with G.Debug.catch(). Decision
   2026-11-16-148-catch-odds-mainline-shake-formula; plan docs/ASCII Concept Maps/148 - Catch Odds Build Plan.md.
2. Then #137 (Shop balls: restock, Great and Ultra, ends the belt refill; ball tiers and prices are Jess's call), #138, #146.
   Order: docs/ASCII Concept Maps/128 - Acquisition Slices Draft.md. #97 ships with the new save.
3. Small and ready: #145 (pause move tooltip lacks Physical/Special/Status). #147 UI Library waits on Jess's look.

## Landed on feature/128-acquisition (main has #124 and #125)
- Closed: #132 save v4, #133 gacha gone, #134 starter pick, #135 rescue event, #136 catch phase (feel-tested 2026-11-16).
- 136b catch screen redesign (Jess's mockup): type-rimmed Pokemon panel, catch band (30 wide, holds the true chance, one
  shift per catch), flee ring, three belts (2 and 3 locked), owned grid with IV + EV tooltip, team-menu buttons (kit
  TeamButton), the B2 cursor on every control, arrows / Enter / 1-6, throw animation. Text in Silver on its pixel grid
  (27.1429 / 40.7143 px), the first screen of #99. All 17 balls cut: tools/make_ball_sprites.py, js/data/ball-sprites.js.
- One universal tooltip layer (decision 2026-11-16-one-universal-tooltip-layer): fixed, body's last child, z 1000.
- check.js clean (60 harnesses); smoke-ui, smoke-pause-menu (known 401 px), smoke-pause-inventory, smoke-ui-library pass.

## Watch
- smoke-ui: back-to-back runs sometimes fail login/onboarding/region on local-server asset loads (ERR_NO_BUFFER_SPACE).
- Untracked, not ours: assets/screenshots/catch screen.png, assets/excalidraw/PMD style Main Menu.png,
  docs/ASCII Concept Maps/tactics-conversion-uplift.md.
- #148 should be linked as a sub-issue of #136 by Jess (gh api write).

## Open owner decisions
- #148 feel test. #137 ball tiers (Timer Ball ruled: for long fights, 4x cap) and prices. #97 purpose and shape. #131 bonus sizes. #49, #107, #86, #99 (rest of it), #93,
  #60. Exp Candy amounts (#139). R1 Shedinja, R4 Alcremie N. Flee 5/3/1 and the 30 s catch wait (playtest).

Rules: CLAUDE.md.
