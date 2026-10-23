# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-22 evening (Claude Desktop, home).

## Where we are
- Branch rework/gym-progression. UNCOMMITTED (Jess commits): gate escalation, Kanto roster docs, slice A code. The assistant never runs git.
- node tools/check.js: 89 files OK, 18/18 harnesses pass (run 2026-10-22). Not run in a browser.
- Roster DESIGN done: docs/GYM-ROSTERS.md has all 8 Kanto gyms and the Elite Four locked (Mewtwo rejected, E4 may reuse species and use canon-passing non-Gen-1 ones, Alolan forms IN, Lance's second Dratini slot pinned).
- Slice A BUILT, game behavior unchanged: gyms.js stage ladders, stageFor, lineup, stricter validate, Brock's six slots (2 to 6 provisional moves); gym.js makeDef(g, slot), G.Gym.loop / debugLoop / roster; G.SimBus + ui/gym-present.js (gym.js emits events now). See DECISIONS 2026-10-22 and DEVLOG pt.3.

## Next (in order)
1. Jess: commit, then feel-test escalation and Brock on dev.html?dev (G.Debug.gym(), G.Gym.debugEsc(n)).
2. Slice B: all-at-once arena flow (arena size by count, win = SET of boss ids, one shared enrage clock, field G.Gym.roster). Convert enemy.js gymStart/gymCast and rift.js gym toasts to SimBus events as touched.
3. Gym-sprite DISPLAY FIX (the gate still draws the rift prop).
4. Escalation clock harness; author moves and stacks for gyms 2 to 8.
5. Regional-forms plan (Alolan Sandslash, Marowak, maybe Golem): needed before Lorelei and Agatha can be built (TODO).

## Architecture direction: sim/present boundary
The event channel exists (G.SimBus). Convert sim calls to FX/Audio/Spawner into events as you touch them and log it in docs/SIM-PRESENT-BOUNDARY.md. New pure data functions: no clock, no randomness.

## Open questions for Jess
- Bruno's Golem: regular form (stand-in) or Alolan Rock/Electric?
- Escalation uncapped (as built) or capped after play? Gate gauge: add a ring or bar?
- Berry bag slots buyable under Team Upgrades? Run-item acquisition?

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan, Jess OKs, then build; changelog.js and Markdown docs are free-edit. Never run git. New save fields backward compatible. Debug on dev.html?dev.

## Where to look (search, do not read whole)
DECISIONS.md, DEVLOG.md, BALANCE.md, TODO.md, BOSS-REWORK.md, docs/. Archives: docs/*-archive.md. Fast check: node tools/check.js.
