# ONBOARDING, developer architecture guide

A practical map of the PokeSurvivor codebase for an English-speaking developer who
wants to fork it and add features. Pair this with GLOSSARY.md (Spanish to English
terms) and GDD.md (game design). Written from reading the source.

Open this reference only when a task needs architecture, module routing, load-order,
or build-pipeline information. Do not include it in routine chat startup context.
CONTEXT.md, STATE.md, and CLAUDE.md are the startup sources of truth.

## 1. What this is

A Vampire-Survivors-style bullet-heaven / horde-survival roguelite, as a Pokemon
fan game. The player is a Pokemon that auto-attacks; you dodge, pick level-up
cards, fight bosses, open rifts against legendaries, and collect Pokemon via a
per-region gacha.

- **Pure front end:** vanilla HTML + CSS + JavaScript on Canvas 2D. No framework,
  no build step to run it, no runtime dependencies. Opening `index.html` works.
- **Everything local:** sprites, data, font, music and save all ship with the game.
  The game makes no internet request to play.
- **Deferred cloud:** Firebase, Cloudflare, accounts, cloud saves, friends, co-op,
  and leaderboards remain in the repository but are out of scope until Jess explicitly
  starts the cloud phase. The active project scope is the local single-player game.

## 2. How the code is wired (the `G` namespace)

Every module hangs off a single global object `G` (created in `js/core/util.js`
as `window.G = window.G || {}`). Modules register themselves on it, e.g.
`G.Combat`, `G.Player`, `G.Gacha`. There are no ES modules or imports; load order
is defined by the `<script>` tags in `dev.html`.

`js/main.js` is the entry point. It:
- lists every expected module in `NEED` and shows a "failed to load" screen if any
  is missing (helps on flaky mobile connections),
- has a `MAINTENANCE` flag (set `false` normally; `?dev` in the URL bypasses it),
- starts i18n DOM translation, waits for the pixel font, then calls `G.Flow.boot()`.

## 3. Build and publish pipeline

You develop against `dev.html`, NOT `index.html`. `dev.html` loads ~60 scripts
separately (readable, debuggable). `index.html` is generated for publishing.

```
node tools/build.js            # dev.html -> index.html + js/app.min.js + version.json
node tools/export_data.js      # exports game data for the SEO pages
python tools/make_seo_pages.py # builds the Spanish + English SEO pages, en/index.html, sitemap
```

Key facts about `tools/build.js`:
- It reads the script list between `<!-- scripts:begin -->` and `<!-- scripts:end -->`
  in `dev.html`, concatenates those files, and runs them through terser (minify) and
  javascript-obfuscator.
- In the published build the whole game is wrapped in an IIFE so `G` is NOT exposed
  on `window`. This is deliberate anti-cheat: it removes the console shortcuts for
  invincibility, skipping the clock, etc. `dev.html` stays un-wrapped for development.
- `--expose` builds un-wrapped/un-obfuscated (used for automated tests).
- It writes `version.json` (a short sha1 fingerprint). Do NOT remove this: the
  auto-updater depends on it.

CLAUDE.md holds the active fork rules and overrides this guide if they conflict.

## 4. The i18n system (why you do NOT translate strings)

`js/core/i18n.js` + `js/data/lang-en.js` make the game bilingual at RUNTIME. The
game is authored in Spanish; English is applied live:
- a `MutationObserver` walks the DOM and translates text nodes and attributes
  (placeholder, title, alt, aria-label),
- `CanvasRenderingContext2D.fillText/strokeText` are wrapped so canvas text (HUD,
  damage numbers) is translated too,
- `confirm()`/`alert()` are wrapped.

`lang-en.js` is a dictionary (~500+ entries) keyed on the exact Spanish string, with
three match levels: exact phrase, pattern with `{x}` holes, and whole-word fragments
inside longer text. Player-entered text (nicknames) is marked `translate="no"`.

Language is chosen by: saved setting (`ps.lang` in localStorage) > `/en/` in the URL
path > browser language (Spanish if the browser is Spanish, English otherwise).

**Implication for you:** inherited Spanish string literals in the code are i18n KEYS,
so leave them in Spanish. New fork-authored user-facing strings are written directly
in English. Do not add those new English strings to `lang-en.js`.

## 5. Module map

### `js/core/` (engine services)
- `util.js` creates `G`, shared helpers.
- `db.js` the save layer (localStorage, salted SHA-256 passwords; also the merge logic).
- `audio.js` Web Audio synthesizer + sound effects (scores live in `js/data/music.js`).
- `input.js` keyboard/mouse, `touch.js` mobile joystick + touch controls.
- `sprites.js` the PMD sprite animator (8 directions, per-animation frame sizes,
  ground-anchor alignment).
- `camera.js` camera/viewport.
- `settings.js` user settings (sound, graphics quality, controls).
- `i18n.js` runtime translation (see section 4).
- `firebase-config.js` Firebase keys (null = local-only mode).
- `updater.js` polls `version.json` every 5 min and reloads players onto new builds
  without data loss (see CLAUDE.md for the exact behavior rules).

### `js/data/` (static game data; some generated)
- `pokedex.js` the 966 Pokemon (stats, names, types; `leg` = legendary flag). Generated.
- `sprites-meta.js` sprite sheet metadata (`hv` hover flag, `sa` shiny-alt geometry). Generated, large, skip when reading.
- `moves.js` the move definitions (families, levels, types).
- `enemies.js` enemy roster and tiers. `starters.js` the 29 starters + personality test.
- `upgrades.js` permanent upgrades. `items.js` equippable run items.
- `achievements.js`, `missions.js` quests/achievements. `changelog.js` news (bilingual).
- `types.js` the type chart. `music.js` the song scores. `lang-en.js` the i18n dictionary.
- `funding.js` support/funding config.

### `js/entities/`
- `player.js`, `enemy.js` (plus the `EnemyMgr` manager), `projectile.js`,
  `pickup.js`, `fx.js` and `vfx.js` (the 23 pixel-art attack shapes).

### `js/systems/` (gameplay rules)
- `combat.js` damage/targeting, `spawner.js` enemy spawning/waves, `levelup.js` the
  card draft, `gacha.js` pulls/rarity/pity, `rift.js` the legendary arenas,
  `weather.js`, `events.js` (mid-run events), `hazards.js` (traps/altars/springs),
  `interact.js`, `pathing.js` (BFS distance-field pathfinding), `progress.js`
  (coins/tickets/profile), `judgment.js` (anti-cheat validation).

### `js/net/` (online, all optional)
- `social.js` nicknames/friends, `net.js` WebRTC + relay + TURN handshake,
  `coop.js` the group-game authority model (host runs the sim), `ranking.js`
  leaderboards, `signups.js` account creation flows.

### `js/world/`
- `tiles.js` pixel-art terrain painted in code, `world.js` terrain generation,
  objects and collisions (16x16 tile chunks baked to ImageData).

### `js/ui/`
- `icons.js` pixel-art icons drawn in code, then `ui.js`, `hud.js`, `login.js`,
  `menu.js`, `test.js` (personality test), and the per-screen UIs: `gacha-ui.js`,
  `run-ui.js`, `social-ui.js`, `ranking-ui.js`, `settings-ui.js`, `goals-ui.js`,
  `layout-ui.js`, `mod-ui.js`, `news-ui.js`, `slots.js` (gacha slot machine),
  `support-ui.js`.

### Top level
- `game.js` the main flow and game loop (`G.Game` / `G.Flow`).
- `functions/` Firebase Cloud Functions. `cloudflare/turn-worker.js` the TURN +
  online-counter Worker. `sw.js` the PWA service worker.
- `tools/` the generators and build scripts (build.js, export_data.js,
  make_seo_pages.py, fetch_*.py, make_font.py).

## 6. Deferred server/ops facts

This material is reference-only until Jess explicitly starts the cloud phase. Do not
propose or implement cloud or multiplayer work during the local-first phase.

- Firebase project is **pokesurvivor-free**. **Never enable "Identity Platform"**
  (or MFA / blocking functions / "Upgrade to enable"): it bills per user. The free
  tier is a hard design constraint, and the code is tuned to minimize reads/writes
  (see docs/FIREBASE.md for the measured budget).
- Cloudflare TURN worker is capped at **$5/month** (see docs/TURN.md).
- `MAINTENANCE` flag lives in `js/main.js`; `?dev` lets you in to test during maintenance.

## 7. Where do I add a new feature?

- **New move:** add it to `js/data/moves.js` (family, type, levels). Its visual
  comes from an existing shape in `js/entities/vfx.js`. If user-facing text is new,
  add the English to `js/data/lang-en.js`. Combat behavior lives in `js/systems/combat.js`.
- **New enemy / personality:** `js/data/enemies.js` for the roster/tiers; enemy
  behavior and personalities in `js/entities/enemy.js` (and spawn logic in
  `js/systems/spawner.js`).
- **New achievement or quest:** `js/data/achievements.js` / `js/data/missions.js`,
  surfaced through `js/ui/goals-ui.js` and tracked in `js/systems/progress.js`.
- **New upgrade:** `js/data/upgrades.js`, applied in `js/entities/player.js` / combat.
- **New UI screen:** add a `*-ui.js` under `js/ui/`, register it on `G`, add its
  `<script>` to `dev.html`, and wire it into the flow in `js/game.js`. Draw any
  icons in `js/ui/icons.js`. Remember to add it to the `NEED` list in `js/main.js`.
- **New rift / arena / weather:** `js/systems/rift.js`, `js/systems/weather.js`,
  terrain in `js/world/`.
- **Anything with new on-screen text:** author it directly in English. Leave inherited
  Spanish literals unchanged because they are translation keys.

Always add new scripts to BOTH the `dev.html` script block and the `NEED` array in
`js/main.js`, then rebuild with `node tools/build.js` before publishing.
