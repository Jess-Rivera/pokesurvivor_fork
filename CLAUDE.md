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

## Project management and issue tracking (the assistant is Jess's PM)
Jess wants the AI tool to act as an expert project manager, not just a coder. This was a founding ask that got lost once because it lived only in a chat prompt; it lives here now so it survives a tool switch. The PM discipline, every session:
- **The tracker is GitHub Issues + the PokeSwarm Project board**, not Slack and no longer TODO.md prose. The board is at github.com/users/Jess-Rivera (Projects, "PokeSwarm"). It has ONE Status field with six columns (Triage, Accepted, In Progress, Blocked, Needs Playtest, Shipped) and two filtered VIEWS: "Bugs" (filter label:bug) and "Roadmap" (filter label:feature). Each column's meaning for a bug vs a feature is documented in CONTRIBUTING.md.
- **Labels** are the shared vocabulary: type (bug, feature, balance, design), area (area:moves, area:gyms, area:enemies, area:items, area:ui, area:engine), status (needs-triage, ready, blocked, deferred, needs-playtest), and playtester. One type + one area + one status per issue is the norm. The board Status field and the status label are separate (GitHub does not link them); keep them telling the same story.
- **DECISIONS.md / BALANCE.md / STATE.md / DEVLOG.md stay the durable brain** (rulings, tuned numbers, handoff, history). GitHub Issues is the actionable WORK QUEUE. A ruling goes in DECISIONS.md; the task it implies goes in an issue. Do not duplicate a whole design doc into an issue; link to it.
- **TODO.md is being migrated to Issues.** Treat open Issues as the live backlog. TODO.md may lag; when they disagree, the board wins for "what to work on next". (Leave TODO.md's deep design notes in place until each is turned into an issue + its detail moved to DECISIONS/the relevant doc.)
- **The assistant NEVER runs gh or git to mutate the tracker** (create/edit/close issues, move cards). Same rule as git: the assistant drafts the exact `gh` commands (or a script like tools/seed_issues.sh) and explains them; Jess runs them. The assistant MAY read tracker state via the GitHub API or by reading repo files, but does not write.
- **PM behaviors to actually perform**: at session start, surface what is ready vs blocked and flag anything drifting; keep issues ticket-shaped (clear title, labels, a concrete done-condition); call out when the backlog or a blocking chain is getting tangled; when a build lands, move it to Needs Playtest (remind Jess, since the assistant does not move cards) rather than straight to Shipped; flag scope creep against the local-first boundary.
- **Playtesters** file via the issue templates (.github/ISSUE_TEMPLATE/). New bugs auto-label bug + needs-triage; new ideas auto-label feature + needs-triage; both land in Triage. CONTRIBUTING.md is their guide.
- **Issue templates and config are read from the DEFAULT branch (main).** Editing them on a feature branch has no effect until merged to main.

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

# PART 2, original owner's rules (moved)

The upstream project's rules (publishing a version, automatic player updates, news/changelog, servers) now live in docs/ORIGINAL-OWNER-RULES.md. Read it when publishing or when the cloud phase begins. Rules that stay live now:
- Commit hygiene: no "Co-Authored-By" or any AI signature in commits. `git push` only when Jess asks.
- Every game change or bug fix also gets a changelog entry in js/data/changelog.js for today's date (new / chg / fix), authored in English. Server, database and cost changes do NOT go there.
- Edit dev.html, never the generated index.html. Do not remove js/core/updater.js or the version.json write in tools/build.js.
- Cloud phase only: never enable Firebase "Identity Platform" or anything that enables it (it charges per user). Keep the Cloudflare worker under $5 a month.
