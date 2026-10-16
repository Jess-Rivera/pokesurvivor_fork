# PokeSurvivor, how we work and how we publish

Fixed rules from the project owner. They ALWAYS apply.

## Publishing a version
1. Edit `dev.html` (never `index.html`, which is generated).
2. `node tools/build.js && node tools/export_data.js && python tools/make_seo_pages.py`
   - `build.js` generates `index.html`, `js/app.min.js` and **`version.json`** (the fingerprint of this version).
3. Commit (without "Co-Authored-By" or any AI signature) and `git push origin main` only when the owner asks for it.

## Automatic player updates (mandatory)
When publishing, every player must move to the new version without losing anything
(`js/core/updater.js`, checks `version.json` every 5 min):
- **Outside a game** (menu, including the co-op room): a 5 s notice and the page reloads.
  If the player is in the gacha, the upgrade shop, the settings, or typing in a field, wait until they finish.
- **In a game**: do not touch it. When it ends, the run is saved as always and, on returning to the menu, it reloads.
- Before reloading, anything pending is uploaded to the cloud.
Do not remove `updater.js` or the writing of `version.json` in `tools/build.js`.

## News (changelog)
Every game change or bug fix also goes in `js/data/changelog.js`
(Spanish and English, in `new` / `chg` / `fix` for today's date). Changes to
servers, database or costs do NOT go there.

## Servers
- Firebase: project **pokesurvivor-free** (normal authentication: free accounts with no limit).
  **Never** enable "Identity Platform" or anything that enables it (blocking functions, MFA,
  "Upgrade to enable"): it charges per user. The old pokesurvivor-jpter project was deleted on 2026-10-13 (along with its billing).
- Cloudflare (Worker `cloudflare/turn-worker.js`, $5 plan): must not go over $5 a month (the TURN has a cap).
- Maintenance: `MAINTENANCE` in `js/main.js` (with `?dev` you can get in to test).
