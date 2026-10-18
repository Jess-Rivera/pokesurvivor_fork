# DEVLOG

Reverse-chronological log of each working session. Newest entry on top.
Append an entry at the end of every session: what changed, what was decided, what broke, where we stopped.

---

> Older entries (every session before the SESSION CLOSE below) are in docs/DEVLOG-archive.md, newest first, verbatim.
> They are NOT read at session start. Open the archive only when you need the detail behind a past decision.

## 2026-10-17 (evening) dev logger slice 1: APPLIED on feature/upgrades-inrun, not yet playtested or committed
- WHAT: dev-only event log, G.Log (js/systems/log.js). Active only with ?dev. Per-hit damage lines in both
  directions as a waterfall (neutral baseline with defender stat 50, then signed deltas for Def/SpD, STAB, type,
  weather, reduction, melee cushion, crit, floor, summing to FINAL), plus kills with XP dropped, XP collected
  (orb x coop x bonus), card offers and picks, heals, faints and Focus Band saves, and i-frame-blocked hits.
  Console API: G.Log.text(n) / print(n) / pacing() / download() / clear().
- DESIGN: numbers in preallocated typed arrays (newest 8192 records), no allocation or strings at record time.
  Player-facing death-screen view was discussed and DEFERRED by Jess (see TODO backlog).
- FILES: NEW js/systems/log.js. Hooks in dev.html (script tag), js/main.js (NEED 'Log'), js/game.js (clock, reset,
  XP collect), js/entities/player.js (hurt/heal, new 5th param `who`), js/systems/combat.js (hit, enemy shot,
  enemy contact), js/systems/hazards.js, js/entities/enemy.js (atkLvl field, `src: this` on 10 shot/hazard
  sites, kill record), js/systems/levelup.js (offer log + pick wrapper). Exact diffs: docs/proposals/dev-logger-slice1.md.
- VERIFIED: node --check on all 8 touched JS files. Mock test of log.js (waterfalls sum to FINAL, ring wraps).
  Randomized equivalence test, 4000 hits: original hurt() vs new hurt() with log off vs log on give identical
  hp/dead/invuln, and every logged waterfall sums to FINAL within rounding. Damage math is unchanged.
- NOT done: in-browser playtest on dev.html?dev (G.Log.print(30), G.Log.pacing(), confirm FINAL matches the
  on-screen numbers, check framerate at high density with the log on), commit.
- OBSERVATIONS for later (not changed): (1) player->enemy scales the ENEMY's Def/SpD at the PLAYER's level, while
  enemy->player scales the enemy's attack at the enemy's level and the player's Def/SpD at the player's level, so the
  two directions are not symmetric (maybe intended, the logged dStat makes it checkable). (2) Immunity (type x0)
  still deals 1 damage in both directions (floor wins), the opposite of the recommended ruling in the design notes.
- BRANCH NOTE: HEAD is feature/upgrades-inrun, so the logger rides on the upgrade-system branch (it is that
  feature's first measurement tool). Jess's call if he wants it split out before committing.
- ALSO THIS SESSION: trimmed session-start docs (old DEVLOG entries to docs/DEVLOG-archive.md, parked MP notes to
  docs/MP-PARKED-NOTES.md, session-start read now about 41KB). Upgrade-system audit (in-run) recorded in TODO
  backlog: flat HP cards vs the new HP scale, unbounded Potencia stacking, cards not mapped to Atk/SpA/Def/SpD.
- Where we stopped: logger applied and verified on disk. Next: playtest it, use pacing() to measure the first
  5 minutes, then decide upgrade-card identity and the opening target (still open with Jess).

## 2026-10-17 — SESSION CLOSE (read this first)
Big session. Everything below is COMMITTED and PUSHED to `main` (no open branches, working tree clean).
Claude Desktop: `git pull` to get the current tree + all docs. Shipped today, in order:
1. Base-stats feature (branch merged to main --no-ff): Speed->movement, HP (player+enemy), shared
   G.Stats, player->enemy damage sub-slices A+B, enemy->player sub-slice C. The whole combat loop now
   runs on one mainline stat model for WILD enemies.
2. Canonical move-power migration: all 64 moves now carry real mainline base power (in the `dmg`
   field, Approach B), English name + short_effect desc, and annotate-only effect fields (ailment/
   ailmentChance/flinch/statChance — DATA ONLY, not wired). DMG_SCALAR re-centered 2.0 -> 0.47.
3. Pokedex UI redesign (merged): search, region/ownership/sort dropdowns, multi-select type/rarity/BST
   filters, extra-wide layout, BST shown as star tiers.
4. Region-select (merged): Random + 9 gen cards; only the chosen gen AND earlier spawn (wild+bosses);
   G.Enemies.region hook; end-run screen shows "<Region> Run".

KEY TUNABLES (js/core/stats.js): HP_SCALAR 2.0 | DMG_SCALAR 0.47 (player->enemy) | ENEMY_DMG_SCALAR 0.5
(enemy->player; bumped from 0.35 by feel) | ENEMY_POWER 40 (flat PLACEHOLDER). Orthogonal dials: HP vs
damage are independent; power migration only re-solves a DAMAGE scalar, never HP (see DECISIONS).

TOP OPEN ITEMS (next session, see TODO for detail):
- Boss damage slice: bosses still use flat def.dmg (sub-slice C deferred them; atkFactor=null guard).
- Canonical learnsets: give each species its real movepool/power; this RETIRES the flat ENEMY_POWER=40
  placeholder (enemies would draw real move power, same system as the player).
- Canonical move procs: wire the annotate-only move fields into real probabilistic effects; split the
  overloaded fork `slow` flag (speed-drop vs freeze vs paralysis vs weather).
- IV/EV still deferred (in the stat formula, fixed 0, no save storage yet).

WATCH / LOOSE ENDS:
- Enemy damage was tuned by feel to ENEMY_DMG_SCALAR 0.5; may want more playtest at later tiers.
- A few lang-en.js move-name keys went DEAD when move names switched to English (harmless; prunable).
- Co-op deferred hooks: hazard atkFactor/atkCat not serialized over the net; startCoop doesn't run the
  region picker (inherits last solo region). Both fine under local-first.
- Reminder: game CSS lives in css/style.css ONLY (dev.html does not load css/pages.css).

