# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-13 morning, Quick (work). Branch: feature/pause-menu-rework, merging back into
feature/gym-leader-ai (rules: docs/branch-rules/feature-gym-leader-ai.md).

## START HERE (next session, either tool)
1. If not done: merge feature/pause-menu-rework into feature/gym-leader-ai. #82 and #104 are closed; the NEED
   fix for PausePokemon and PauseInventory is built (map "82 - Pause Panels in NEED Plan").
2. Apply the drafted board fixes: comment on #99, close #106 as its duplicate, comment on #102.
3. File the acquisition parent issue, then its slices (TODO Next 3). Design only.
4. Triage (TODO Next 4).

## Where we are
- #82 pause menu rework done and feel-tested. #104 built today: js/ui/ev-screen.js, opened by Learn from the Loss.
  Click 1, Shift-click 10, hold repeats; Learn saves, then a 2 s toast "Lessons Learned, Returning Home", then
  home; Go Home asks and saves nothing. The old scr-evs screen is retired.
- HUD kit: fitToStage, createButtonRow (End Run, EV screen). copies.js: cappedEvs, setEvs; G.Debug.evset.
- Shared toast (G.UI.toast): main menu charcoal, teal rim, Michroma, red rim for bad news; centred pop-in.
- Font rule (HUD-STYLE Fonts): HudText for what is on or about a Pokemon, Michroma for the game's own UI.
  Menu buttons still HudText, open in #99.
- Quick agent follows CLAUDE.md git rules and drafts every commit message (it still cannot run git or gh).

## Watch
- smoke-pause-menu "Cards Taken keeps its 400 px box" reads 401 since #83, likely the smoke's own 1028 scale
  math. Unfiled.
- Quick has no node or browser: its harness runs are sandbox bundles; check.js on the machine is truth.
- Quick writing to the device: use `with open` and read it back.
- Keep new code within 120 columns and run npm run format before the mutate runners, or patterns go STALE.
- GitHub from Quick: api.github.com/search/issues?q=repo:Jess-Rivera/pokesurvivor_fork+is:issue+is:open
  returns far more before truncation than the issues list.
- Acquisition blockers: Accelgor (no Shelmet sprites), Gholdengo (no Gimmighoul), 9 move-gated lines, Kingambit.

## Open owner decisions
- Acquisition: Accelgor route, Kingambit rule, Gholdengo source, R1 Shedinja, R4 Alcremie N, gacha removal and save
  migration, ball tiers, UberElite time limit.
- #86 gym leaders round down?; #93 tooltip scope; #99 menu font (buttons); #97 upgrade rework (blocks #95); #60 Bait.

Rules: CLAUDE.md. Maps: docs/ASCII Concept Maps/ (104, 104b, 104c and 82 today).
