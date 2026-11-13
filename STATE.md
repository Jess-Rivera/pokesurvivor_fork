# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-12 late night, Claude Code (home). Branch: feature/pause-menu-rework (off feature/gym-leader-ai).

## START HERE (next session, either tool)
1. #104 EV screen redesign (spec PAUSE-MENU section 7, mock assets/excalidraw/End Run EV.png): the last child of #82.
   Give the prose plan first. When it closes, close #82 and merge back into feature/gym-leader-ai.
2. File the acquisition parent issue (TODO "Next" item 4), then its slice order. Design only so far.
3. Triage: 7 needs-triage (#93 #75 #97 #99 #100 #101 #102), #29's stale `blocked`, #86 `ready` but carded in Triage.

## Where we are
- Closed today: #83 (Cards Taken), #92 (Run Review), #103 (End Run screen, no EVs on quit). All feel-tested.
- End of run (solo): js/ui/end-run.js shows "EXPEDITION OVER" with Run Review and Learn from the Loss / Return Home.
  Run Review = the pause menu read-only (openReview), Back returns to End Run. Learn opens the OLD EV screen
  (run-ui.js showEvs, scr-evs) until #104. Co-op keeps the old results card and team sheet.
- EVs: a quit (End Run, sign out) gives none; a fall and the crash save keep them (quitRun(keepsEvs), endRun).
- The menu button is the HUD kit's SlotButton (shared by the pause menu and End Run).
- Debug: G.Debug.evbank(hp, atk, def, spa, spd, spe) seeds this run's EVs (save order, not hex order).

## Watch
- smoke-pause-menu "Cards Taken keeps its 400 px box" measures 401 (since #83, fails on the committed code too).
- Quick has no node or browser: harness runs are sandbox bundles; check.js on the machine is truth.
- Quick writing to the device: a bare open().write in Python can silently not land. Use `with open`, read it back.
- Keep new code within 120 columns, or mutate patterns go STALE.
- Acquisition blockers: Accelgor (no Shelmet sprites), Gholdengo (no Gimmighoul), 9 move-gated lines until 8 moves
  are imported; Kingambit's rule cannot happen as written.

## Open owner decisions
- Acquisition: Accelgor route, Kingambit rule, Gholdengo source, R1 Shedinja, R4 Alcremie N, gacha removal and save
  migration, ball tiers, UberElite time limit.
- #86 whole levels; #93 tooltip scope; #99 menu font; #97 upgrade rework (blocks #95); #60 Bait.

Rules: CLAUDE.md. Maps: docs/ASCII Concept Maps/ (Acquisition v1, Biomes v2, 91 series).
