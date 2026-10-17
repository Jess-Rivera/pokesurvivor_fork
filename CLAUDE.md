# CLAUDE.md, working rules for AI assistants on this fork

START WITH CONTEXT.md. This file holds the detailed rules; CONTEXT.md is the quick session ritual
and pointer. Any AI tool (Claude Desktop at home, or the PokeSurvivor agent in Amazon Quick) follows
the rules in the first section below. The original project owner's rules are preserved at the bottom
as historical reference.

---

# PART 1, Jess's workflow rules (this fork, authoritative)

These govern how Jess and his AI tools work on this English fork. Where they conflict with the
original owner's rules in Part 2, these win.

## Two tools, one repo
Jess works partially in Amazon Quick (work machine) and partially in Claude Desktop (home). The two
assistants cannot see each other's memory. This git repo is the only shared brain, so anything that
must survive a tool switch lives here as a file. Commit before switching tools so neither side edits
a divergent tree.

## Session rituals
- Start: read CONTEXT.md, DEVLOG.md, DECISIONS.md, BALANCE.md, TODO.md, then say where we left off
  and the top open items. ("Catch me up" means exactly this.)
- End: append a DEVLOG.md entry, then remind Jess to commit and push.

## Local-first (hard scope boundary)
Build and perfect the LOCAL single-player game first. DEFERRED until Jess explicitly switches phase:
Firebase (auth, Firestore, RTDB, cloud saves), the Cloudflare TURN worker, and the whole
multiplayer/co-op/networking stack (js/net/: social, net, coop, ranking, signups), plus friends,
rooms, and online leaderboards. Do not propose or write cloud/MP changes until then; build the local
side only and note any deferred hook in TODO.md.

## English-native i18n
- Inherited Spanish code: the game was authored in Spanish and translated at runtime by js/core/i18n.js
  via the js/data/lang-en.js dictionary. The Spanish string literals ARE the translation keys, so
  leave them as-is, do not translate them in place.
- New code: author all new user-facing strings directly in English. Do NOT write new strings in
  Spanish, do NOT add lang-en.js entries for our own new English strings, and do NOT add Spanish
  translations for them. New features render English-only, intentionally.
- Player-entered text (nicknames) stays marked translate="no".

## Edit boundary, propose-first vs free-edit
Dividing line: "does this change what the game does when you run it?"
- YES, propose-first (Jess applies by hand): game code, js/data/*.js (it IS game data, the game loads
  it), dev.html, build config, assets.
- NO, edit directly (no proposal needed): the Markdown project docs, CONTEXT/DEVLOG/DECISIONS/BALANCE/
  TODO/ISSUES/CLAUDE. They do not affect the running game.

## Git, hard prohibition
The AI assistant NEVER runs git, under any circumstances. It gives Jess exact commands, explains them,
and advises strategy (branching, staging, commit messages). Jess runs all git himself.

## Performance stance
Vision first, trim fat later. Ignore small per-frame millisecond differences now. BUT treat a visible
framerate collapse (e.g. 60fps to ~22fps at high enemy density) as a FEEL problem to fix immediately,
not a deferred micro-optimization.

## Prose style
No em-dashes, anywhere. Use commas, parentheses, "since"/"because" instead.

## Reference material
- survivor-like-design-reference.md: cited genre design patterns (Vampire Survivors, Brotato, Halls
  of Torment) with concrete numbers. Ground design advice in it. (Attached to the Quick agent; commit
  a copy under docs/ if the home tool needs it.)
- pokeapi-master/: full mainline Pokemon data, the source of truth when translating mainline mechanics
  into survivor-style.
- ONBOARDING.md, GDD.md, GLOSSARY.md: authoritative architecture/design/terminology references.

## Debugging order
1. Load order / registration: "module undefined" or "failed to load" usually means a script is missing
   from the <script> list in dev.html or the NEED array in js/main.js, or is ordered wrong. Check first.
2. MAINTENANCE flag in js/main.js gates the game; ?dev in the URL bypasses it.
3. Debug on dev.html, not built index.html (the published build is an IIFE and does not expose G).

## Save-data migration safety
The save lives in localStorage and features are added continuously. Any new field is ABSENT from old
saves, so write backward-compatible loads: null-check and default every new field. Never require Jess
to clear his save to test a feature unless there is genuinely no backward-compatible path.

---

# PART 2, original owner's rules (historical reference, not binding)

Preserved from the upstream project. Useful context, but where it conflicts with Part 1, Part 1 wins.
The one rule kept fully live from here is commit hygiene: no "Co-Authored-By" or any AI signature in commits.

## Publishing a version
1. Edit `dev.html` (never `index.html`, which is generated).
2. `node tools/build.js && node tools/export_data.js && python tools/make_seo_pages.py`
   - `build.js` generates `index.html`, `js/app.min.js` and **`version.json`** (the fingerprint of this version).
3. Commit (without "Co-Authored-By" or any AI signature) and `git push origin main` only when asked.

## Automatic player updates (mandatory, cloud phase)
When publishing, every player must move to the new version without losing anything
(`js/core/updater.js`, checks `version.json` every 5 min):
- Outside a game (menu, including the co-op room): a 5 s notice and the page reloads. If the player is
  in the gacha, the upgrade shop, the settings, or typing in a field, wait until they finish.
- In a game: do not touch it. When it ends, the run is saved as always and, on returning to the menu, it reloads.
- Before reloading, anything pending is uploaded to the cloud.
Do not remove `updater.js` or the writing of `version.json` in `tools/build.js`.

## News (changelog)
Every game change or bug fix also goes in `js/data/changelog.js` for today's date (new / chg / fix).
Changes to servers, database or costs do NOT go there. (Note, per Part 1 English-native rule: author new
changelog entries in English.)

## Servers (dormant until cloud phase)
- Firebase: project **pokesurvivor-free** (free accounts, no limit). Never enable "Identity Platform" or
  anything that enables it (blocking functions, MFA, "Upgrade to enable"): it charges per user. The old
  pokesurvivor-jpter project was deleted on 2026-10-13.
- Cloudflare (Worker `cloudflare/turn-worker.js`, $5 plan): must not go over $5 a month (the TURN has a cap).
- Maintenance: `MAINTENANCE` in `js/main.js` (with `?dev` you can get in to test).
