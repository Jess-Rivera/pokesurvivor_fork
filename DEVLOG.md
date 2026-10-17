# DEVLOG

Reverse-chronological log of each working session. Newest entry on top.
Append an entry at the end of every session: what changed, what was decided, what broke, where we stopped.

---

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
