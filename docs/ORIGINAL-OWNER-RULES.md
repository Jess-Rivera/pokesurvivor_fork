# Original owner's rules (historical reference, moved out of CLAUDE.md on 2026-10-20)

Where these conflict with CLAUDE.md or CONTEXT.md, those win. Read this when publishing a version or when the cloud/multiplayer phase begins.

# PART 2, original owner's rules (historical reference, not binding)

Preserved from the upstream project. Useful context, but where it conflicts with CLAUDE.md, CLAUDE.md wins.
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
Changes to servers, database or costs do NOT go there. (Note, per the English-native rule in CLAUDE.md: author new
changelog entries in English.)

## Servers (dormant until cloud phase)
- Firebase: project **pokesurvivor-free** (free accounts, no limit). Never enable "Identity Platform" or
  anything that enables it (blocking functions, MFA, "Upgrade to enable"): it charges per user. The old
  pokesurvivor-jpter project was deleted on 2026-10-13.
- Cloudflare (Worker `cloudflare/turn-worker.js`, $5 plan): must not go over $5 a month (the TURN has a cap).
- Maintenance: `MAINTENANCE` in `js/main.js` (with `?dev` you can get in to test).
