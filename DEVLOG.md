# DEVLOG

Reverse-chronological log of each working session. Newest entry on top.
Append an entry at the end of every session: what changed, what was decided, what broke, where we stopped.

---

## 2026-10-17 (Pokedex UI redesign, APPLIED on feature/pokedex-ui, not yet playtested/committed)
- LAYOUT TWEAK (same session, after first visual check): (1) widened the dex screen, scoped so other
  screens keep their cap: `#scr-dex .box.wide { width: min(1600px, 98vw) }` (extra-wide, Jess's pick).
  (2) Put Search + Region + Ownership + Sort on ONE level, equal width: added class `ctrl-row` to the
  first control .row in dev.html, and `.dex-controls .ctrl-row { flex-wrap: nowrap }` with
  `.ctrl-row .field { flex: 1 1 0; width: auto; min-width: 0 }` (overrides the global .field width:100%
  that was stacking them into four full-width bars); dir + Clear stay `flex: 0 0 auto`. Chips remain on
  the level below. Added a max-width:760px media query to wrap gracefully on a narrow window.
  Files: css/pages.css (dex-controls block replaced), dev.html (one class added). No logic change.
- CSS FILE GOTCHA (caught when a hard reload showed no change): I had been appending ALL the Pokedex
  CSS to css/pages.css, but the GAME (dev.html) only links css/style.css. pages.css is the ORIGINAL
  owner's stylesheet for the standalone TEXT pages (guia/, pokedex/, 404.html, the crawlable SEO
  pages), not the game, so every rule I added today was inert. The earlier redesign only looked
  styled because it reused classes already in style.css. FIX: moved all .dex-controls / .ctrl-row /
  #scr-dex .box.wide / chip rules into css/style.css, and reverted css/pages.css to the owner's
  original (my edits removed). LESSON: the game loads ONLY css/style.css; never put game CSS in
  pages.css. Earlier changelog/DEVLOG lines saying "css/pages.css" should read "css/style.css".
- NEW BRANCH: feature/pokedex-ui, branched off main (NOT off feature/base-stats). The damage work
  (sub-slices A+B) lives on feature/base-stats, committed + pushed, not yet merged to main. So this
  Pokedex branch does NOT contain the base-stats work; it is an independent UI change. Merge order is
  Jess's call later (both branch off main independently).
- WHAT: redesigned the Pokedex screen (opened from the menu "Pokemon" button and from roster cards)
  from gen-tabs + filter-chips into a real control bar. Replaced #dex-gens and #dex-filters with:
  a name-or-number search box, Region dropdown (All + 9 gens w/ have/total), Ownership dropdown
  (all/own/miss), Sort-by dropdown (Dex#/Name/BST/HP/Atk/Def/SpA/SpD/Spe) + asc/desc toggle, and
  multi-select chip rows for Type (18, OR match), Rarity (1-5), and BST bands (<=300/301-400/401-500/
  501-600/600+). Added a "N shown" count line and a Clear button.
- Grid is now MULTI-GEN (was gen-locked): renders the filtered+sorted list across all regions, so
  search/sort/type actually span the whole dex. Region default = All.
- Sort tweak Jess chose: stat/BST sorts SINK UNOWNED mon to the bottom (owned-first, then stat within
  each group); Dex#/Name sorts are not sunk. Name search matches owned mon only (unowned are "???");
  number search matches all.
- Perf: render-all (no cap, no lazy-render), per Jess. The dex screen is static (no game loop), so a
  one-time full-dex build cost is acceptable; revisit with lazy-render (IntersectionObserver) ONLY if
  opening All-regions visibly hitches.
- FILES: js/ui/menu.js (state obj dexCtrl replaces dexFilter/dexGen; new buildControls/toggle/
  filterSortDex; openDex + renderGrid rewritten; dead dexGen line removed from pickDex), dev.html
  (#scr-dex markup), css/pages.css (.dex-controls etc.), js/data/changelog.js (new entry, English).
  Old .gen-tabs/.gen-tab/.filters CSS left in place, now unused, harmless.
- VERIFIED: menu.js + pages.css + changelog.js balance-check clean (node --check blocked in sandbox).
  Zero remaining dexGen/dexFilter references. All $('dex-*') IDs the control code touches exist in
  dev.html; the 4 not in markup (dex-big/dex-commit/dex-hex/dex-remove) are built dynamically inside
  showDetail's innerHTML, same as before (not a regression).
- Reused existing helpers (did NOT reinvent): G.UI.spriteCanvas, G.UI.stars, G.Icons.rarity,
  G.Gacha.RARITY_NAME, G.U.TYPE_COLOR/TYPE_NAME. BST bands chosen to read naturally; the detail card's
  G.Icons.bstStars (bst/50 -> 7-star) is unchanged.
- No save-schema change: fully save-safe, no migration, no hard reload needed beyond the normal one to
  pick up new JS/CSS.
- NOT done: in-browser playtest; commit. Jess runs git.
- Where we stopped: Pokedex redesign fully applied + verified on disk on feature/pokedex-ui, awaiting
  Jess's in-browser check. Next after that: commit, then back to the damage track (the "fix before
  enemy->player" was this Pokedex task; sub-slice C still pending the enemy-attack-category decision).

## 2026-10-17 (Team Roster merged)
- Merged the Team Roster feature into main via --no-ff ("Merge Team Roster feature") and pushed.
- Went source-only: gitignored the generated build output (index.html, js/app.min.js, version.json;
  tools/cache/ already ignored) and untracked the committed copies with `git rm --cached`. Build is
  regenerated locally at publish time, not version-controlled. GitHub Pages is not used.
- Deleted the merged feature/team branch (local + origin). git branch -a now shows only main.
- SEO/publishing pipeline (export_data.js, make_seo_pages.py) confirmed inherited and dormant; Jess
  only runs `node tools/build.js`.
- Where we stopped: main is clean with Team Roster in. Ready to branch for the next feature.

## 2026-10-17 (later)
- Reviewed the Team Roster feature (changelog-dated 2026-10-16) for merge readiness.
  Spans game.js (roster runtime: 6 slots, manual swap with 5s lockout + 0.5s i-frame,
  faint auto-swap to lowest living slot, run ends only when the whole team is down,
  shared team buffs), menu.js (roster cards + Pokedex picker, commit/remove, lead-slot
  invariant), db.js (normalizeTeam, backward-compatible with old saves), input.js
  (8 rebindable swap binds).
- Verdict: correct and complete, no functional blocker. Save-migration safety honored.
- One i18n fix found: the faint swap-in line in game.js (~L718) was authored in Spanish
  ("entra en combate") with no lang-en.js key, so it is new feature code that broke the
  English-native rule. Fix is to write it in English directly: "<name> enters the fight!".
  All other Spanish strings in the feature are inherited (they have lang-en.js keys) and
  correctly left as-is.
- Where we stopped: i18n diff proposed for Jess to apply; pending that, feature is
  merge-ready pending a git diff against main (Jess runs git).

## 2026-10-17
- Set up the PokeSurvivor AI collaborator agent (in Amazon Quick) and the shared cross-tool
  working model.
- Established the project-docs scaffold in-repo for portability between Amazon Quick (work) and
  Claude Desktop (home): CONTEXT.md, DEVLOG.md, DECISIONS.md, BALANCE.md, TODO.md.
- Rewrote CLAUDE.md to separate Jess's workflow rules (this fork) from the original owner's rules
  (kept as historical reference).
- No game code touched this session. Local-first phase: single-player first, cloud/MP deferred.
- Where we stopped: scaffolding complete, ready to start actual local game work next session.
