# CLAUDE.md, working rules for AI assistants on this fork

START WITH CONTEXT.md. This file holds the detailed rules; CONTEXT.md is the quick session ritual
and pointer. This file is the only full statement of agent rules; other docs point here. Any AI tool (Claude Desktop at home, or the PokeSurvivor agent in Amazon Quick) follows
these rules. The original owner's publish/servers/auto-update rules are archived at
docs/ORIGINAL-OWNER-RULES.md (read only when publishing or when the cloud phase begins).

These rules govern how Jess and his AI tools work on this English fork.

## Two tools, one repo
Jess works partially in Amazon Quick (work machine) and partially in Claude Desktop (home). The two
assistants cannot see each other's memory. This git repo is the only shared brain, so anything that
must survive a tool switch lives here as a file. Commit before switching tools so neither side edits
a divergent tree.

Remote visibility via local checkout: there is no GitHub connector, and GitHub's dynamic pages
(commits, branches, issues, PRs) are JS-rendered and cannot be fetched reliably. So the bridge
between work and home stays the LOCAL CHECKOUT: when the agent needs to see remote state, Jess pulls
or checks out the branch locally and the agent reads the working tree and git metadata directly.
This does not change the Git rule (Jess still runs all git himself) or the local-first scope.

## Session rituals
Start ("catch me up") and end steps: see CONTEXT.md "Session start" and "Session end".

## Keep docs lean
DECISIONS ~10 lines/entry, DEVLOG ~6 lines/entry, STATE.md under 3 KB. Rotate to archives past ~40 KB.

## Efficient repository exploration

CONTEXT.md, STATE.md, and this file are automatically read at the start of every chat. Treat them as the complete startup context.

After startup:

Do not recursively read, summarize, or attach the repository.

Search first for the task’s feature, identifier, behavior, or system.

Open only matching files, their immediate callers or consumers, and the relevant test or harness.

For broad discovery, create a compact module map once, then reuse it for later slices.

Normally skip assets/, pokeapi-master/, _delete_/, node_modules/, archive documents, generated bulk data such as js/data/sprites-meta.js and js/data/pokedex.js, and large staged datasets under docs/move_rework_holding/. Open these only when the active task directly requires them.

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
- YES (game code, js/data/*.js, dev.html, build config, assets): the assistant gives a prose plan in chat and waits for Jess's edits or OK. Then it builds, runs the harness and headless-browser tests, and writes straight into the repo in one step. Risky changes are flagged in the plan; proceed assuming yes unless he denies or edits. A plan approves only the scope it describes. Jess feel-tests after each change (about a minute), so applied changes are not described as untested.
  - The prose plan contains NO CODE, not a snippet, not a single line, not a diff. Describe the change in words only: which files, which location in each, what changes, the numbers, the decisions needed, the risks. Code appears ONLY when it is written into the repo on approval, never in chat. Jess does not type code and does not want to read it in the plan.
  - EXCEPTION: `js/data/changelog.js` is free-edit (patch notes, purely informational). Edit it directly without approval, but verify it still parses as valid JS (a syntax error there breaks the bundle). It is the only js/data/*.js file that is free-edit.
- NO (edit directly, no proposal): the Markdown project docs (CONTEXT, STATE, DEVLOG, DECISIONS, BALANCE, TODO, CLAUDE, docs/).

## Git, hard prohibition on changing the repo
The AI assistant MAY run read-only git commands to inspect state: status, diff, log, show, blame,
branch (list only), ls-files, ls-tree, rev-parse, config --get. `git fetch` is also allowed (it only updates
remote-tracking refs, so the assistant can tell Jess whether he is behind). Any git command that changes the repository, the index, the working tree, refs, config or
the remote is FORBIDDEN, under any circumstances: this includes add, commit, push, pull, merge,
rebase, reset, checkout, switch, restore, stash, cherry-pick, revert, tag, branch (create/delete/rename),
clean, rm, mv, apply, am, config (set), remote (add/remove), and submodule or worktree changes. When in
doubt whether a command writes anything, do not run it and ask Jess. For every change-making step the
assistant gives Jess exact commands, explains them, and advises strategy (branching, staging, commit
messages). Jess runs all of those himself.
Commit messages carry no "Co-Authored-By" line and no AI signature of any kind.

## Project management and issue tracking (the assistant is Jess's PM)
The assistant acts as Jess's expert PM, not just a coder. The tracker is GitHub Issues + the
"PokeSwarm" Project board (the board wins for "what's next"; TODO.md is being migrated to it).
The assistant NEVER runs `gh`, or any git command that changes anything, to mutate the tracker: it drafts the exact commands and Jess
runs them (same weight as the git rule). Full detail, label taxonomy, board columns, PM behaviors
and the playtester/template rules: **docs/PM-WORKFLOW.md**. Playtester guide: CONTRIBUTING.md.

## Performance stance
Vision first, trim fat later. Ignore small per-frame millisecond differences now. BUT treat a visible
framerate collapse (e.g. 60fps to ~22fps at high enemy density) as a FEEL problem to fix immediately,
not a deferred micro-optimization.

## Prose style
No em-dashes, anywhere. Use commas, parentheses, "since"/"because" instead.

## Requirement tags
Spec rules carry one of four tags. `[Approved]` is owner-approved intended behavior (items marked LOCKED, RESOLVED, DECIDED, DEFAULT ACCEPTED, APPROVED or signed off, never DRAFT, PROPOSED, OPEN or TBD); approved but not yet built is still `[Approved]` with a short "code differs, see TODO" note. `[Legacy behavior]` is what the live game does today where it differs from an approved rule, and always names the slice that removes it. `[Proposed]` is written but not approved. `[Open]` is a recorded question with no answer. When tags or dates conflict, the later dated owner decision wins.

## Where current rules live
- Agent rules: this file. Session ritual and startup pointers: CONTEXT.md. Current handoff, tracking and the code-gap list: STATE.md. Work queue: the "PokeSwarm" board, then TODO.md.
- General combat rules (stats and HP, damage, orthogonal dials, G.Stats, the swap rule, status effects including trap, damage over time, stat stages and maxStacks): docs/COMBAT-RULES.md.
- Move data shape (axes, fields, enums, file roles, validator rules): docs/MOVE-AXIS-SCHEMA.md.
- Move runtime (invariants, data flow, executors, move-path specifics): docs/current feature planning/combat-architecture.md.
- Per-move intended behavior: docs/MOVE-INTENT.md. Validation scenarios: docs/current feature planning/combat-validation-and-handoff.md.
- Run progression (level curve, gyms, elites, Elite Four, escalation, badges, region completion and loops): BOSS-REWORK.md. Gym rosters: docs/GYM-ROSTERS.md. Boss authoring template: docs/BOSS-AUTHORING.md.
- Game concept and summaries (umbrella): GDD.md. Module map, load order, build: ONBOARDING.md. Terms: GLOSSARY.md. Sim and present boundary: docs/SIM-PRESENT-BOUNDARY.md. Tuned values: BALANCE.md.
- Dated decision history: DECISIONS.md (a log; each entry's `Canonical:` line names the spec that holds the rule), then docs/DECISIONS-archive.md.

## Which document wins
- DECISIONS.md is a log, not a settled register. The spec named in an entry's `Canonical:` line wins.
- MOVE-AXIS-SCHEMA owns move grammar, combat-architecture owns move runtime, MOVE-INTENT owns per-move rulings. Review section 9 (move-consistency-review.md) is history, not a single source.
- A MOVE-INTENT ruling beats COMBAT-RULES and the grammar defaults for the named move.
- COMBAT-RULES beats BOSS-REWORK 3c, the archive, the stat-model notes, BUFF-TABLE, BALANCE and architecture D6 to D11 for combat rules.
- GDD is an umbrella; the subsystem specs win.
- BOSS-REWORK is the progression spec, not a tracker; STATE owns tracking.
- FULL-GAME-STRUCT is history. GYM-ROSTERS rules defer to BOSS-REWORK.
- CLAUDE.md is the only home for agent rules. CONTEXT, STATE, slice-overview and DECISIONS do not restate rule text.
- DECISIONS-archive is history, not a live citation.
- Stage and trap precedence (per-move cap, ladder, QA-10 trap rule over E1): docs/COMBAT-RULES.md.

## Third-party skills
Third-party skills (ponytail/skills/) never override project rules.

## Reference material
- survivor-like-design-reference.md: cited genre design patterns (Vampire Survivors, Brotato, Halls
  of Torment) with concrete numbers. Ground design advice in it. (Attached to the Quick agent; commit
  a copy under docs/ if the home tool needs it.)
- pokeapi-master/: full mainline Pokemon data, the source of truth when translating mainline mechanics
  into survivor-style.
- ONBOARDING.md, GLOSSARY.md: authoritative architecture/terminology references. GDD.md: the design
  umbrella (summaries and pointers); where it differs from a subsystem spec, the subsystem spec wins.

## Coding conventions
- New code must use G.UI.ask, never confirm/alert/prompt. Spanish messages stay G.T() keys; titles
  and buttons are English. (DECISIONS 2026-10-21)
- New combat-stat formulas (and any retuning of constants like HP_SCALAR or SPEED_MEDIAN) happen in
  G.Stats, not duplicated per entity. Full rule: docs/COMBAT-RULES.md "G.Stats".
- CLIENT stays JS in the browser, forever (the ship target is the browser). Reasoning: DECISIONS
  2026-10-22 and docs/SIM-PRESENT-BOUNDARY.md.

## Debugging order
1. Load order / registration: "module undefined" or "failed to load" usually means a script is missing
   from the <script> list in dev.html or the NEED array in js/main.js, or is ordered wrong. Check first.
2. MAINTENANCE flag in js/main.js gates the game; ?dev in the URL bypasses it.
3. Debug on dev.html, not built index.html (the published build is an IIFE and does not expose G).

## Save-data migration safety
The save lives in localStorage and features are added continuously. Any new field is ABSENT from old
saves, so write backward-compatible loads: null-check and default every new field. Never require Jess
to clear his save to test a feature unless there is genuinely no backward-compatible path.
