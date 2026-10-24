# CLAUDE.md, working rules for AI assistants on this fork

START WITH CONTEXT.md. This file holds the detailed rules; CONTEXT.md is the quick session ritual
and pointer. Any AI tool (Claude Desktop at home, or the PokeSurvivor agent in Amazon Quick) follows
these rules. The original owner's publish/servers/auto-update rules are archived at
docs/ORIGINAL-OWNER-RULES.md (read only when publishing or when the cloud phase begins).

These rules govern how Jess and his AI tools work on this English fork.

## Two tools, one repo
Jess works partially in Amazon Quick (work machine) and partially in Claude Desktop (home). The two
assistants cannot see each other's memory. This git repo is the only shared brain, so anything that
must survive a tool switch lives here as a file. Commit before switching tools so neither side edits
a divergent tree.

## Session rituals
- Start ("catch me up"): read CONTEXT.md and STATE.md only, then say where we left off and the top open items. Read TODO.md 'In progress' if more detail is needed. Do NOT read DECISIONS.md, DEVLOG.md or BALANCE.md whole (large); search them by keyword. Archives: docs/DECISIONS-archive.md, docs/DEVLOG-archive.md, docs/TODO-archive.md.
- End: rewrite STATE.md (under 3 KB), append a short DEVLOG.md entry (about 6 lines) at the end, then remind Jess to commit and push.

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

## Edit boundary and workflow
Dividing line: "does this change what the game does when you run it?"
- YES (game code, js/data/*.js, dev.html, build config, assets): the assistant gives a prose plan in chat (what changes, which files, numbers, decisions needed, risks) and waits for Jess's edits or OK. Then it builds, runs the harness and headless-browser tests, and writes straight into the repo in one step. No diff files, no separate apply step, no code snippets in chat. Jess does not type code. Risky changes are flagged in the plan; proceed assuming yes unless he denies or edits. A plan approves only the scope it describes.
  - EXCEPTION: `js/data/changelog.js` is free-edit (patch notes, purely informational). Edit it directly without approval, but verify it still parses as valid JS (a syntax error there breaks the bundle). It is the only js/data/*.js file that is free-edit.
- NO (edit directly, no proposal): the Markdown project docs (CONTEXT, STATE, DEVLOG, DECISIONS, BALANCE, TODO, ISSUES, CLAUDE, docs/).

## Git, hard prohibition
The AI assistant NEVER runs git, under any circumstances. It gives Jess exact commands, explains them,
and advises strategy (branching, staging, commit messages). Jess runs all git himself.
Commit messages carry no "Co-Authored-By" line and no AI signature of any kind.

## Project management and issue tracking (the assistant is Jess's PM)
The assistant acts as Jess's expert PM, not just a coder. The tracker is GitHub Issues + the
"PokeSwarm" Project board (the board wins for "what's next"; TODO.md is being migrated to it).
The assistant NEVER runs git or `gh` to mutate the tracker: it drafts the exact commands and Jess
runs them (same weight as the git rule). Full detail, label taxonomy, board columns, PM behaviors
and the playtester/template rules: **docs/PM-WORKFLOW.md**.

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
