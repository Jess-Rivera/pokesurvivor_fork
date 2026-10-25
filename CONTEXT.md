# CONTEXT, start here (shared rulebook for all AI tools)

This file is the shared source of truth for any AI assistant working on this fork,
whether that is the PokeSurvivor agent in Amazon Quick (work machine) or Claude Desktop (home).
The two tools cannot see each other's memory. This repo is the only shared brain, so
everything that must survive a tool switch lives here as a file.

## Session start (do this first, every session)
1. Read this file and STATE.md (the short current handoff). Nothing else is required.
2. Say where we left off and the top open items. ("Catch me up" means exactly this.)
3. Read TODO.md 'In progress' only if more detail is needed.
4. Tell Jess how to bring THIS machine's repo up to date (the assistant never runs git commands that change the repo; Jess runs these, the assistant lists them and what to check; the assistant may run read-only git to inspect):
   - The remote is https://github.com/Jess-Rivera/pokesurvivor_fork.git. Work happens on a feature branch (STATE.md names the current one, e.g. feature/items), not on main.
   - `git status` (must be clean; if not, commit or stash first, never edit on a dirty tree after a tool switch).
   - `git fetch origin`, then `git checkout <branch>` (use `git checkout -b <branch> origin/<branch>` if it does not exist locally), then `git pull --ff-only`. If ff-only fails, the two machines diverged: stop and tell the assistant.
   - Compare with main: `git log --oneline main..<branch>` (what the branch adds) and `git log --oneline <branch>..origin/main` (what main gained, so the branch may need a merge of main).
   - Sanity check after the pull: `node tools/check.js` must end with all harnesses passed, then open dev.html?dev.
   - Before leaving a machine: commit and push, so the other side starts from the same tree.
Do NOT read DECISIONS.md, DEVLOG.md or BALANCE.md whole (they are large). Search them by keyword when a topic comes up.
Archives (search only): docs/DECISIONS-archive.md, docs/DEVLOG-archive.md, docs/TODO-archive.md, docs/MP-PARKED-NOTES.md.

## Session end (do this before stopping or switching machines)
1. Rewrite STATE.md (keep it under 3 KB; replace, do not append).
2. Append a short DEVLOG.md entry at the end (about 6 lines: what changed, what was decided, what broke, where we stopped).
3. Remind Jess to commit and push, so the other tool pulls a current tree.
Both tools follow this symmetric discipline. If STATE.md looks stale after a git pull, suspect the other tool skipped it.

## The two tools, one repo
- Jess works partially here (Amazon Quick, work machine) and partially at home (Claude Desktop).
- The git repo bridges them. Commit before switching tools so neither side edits a divergent tree.

## Core working rules (one-line reminders, full detail in CLAUDE.md)
- **Local-first:** local single-player first; all cloud/MP (Firebase, Cloudflare TURN, js/net/) DEFERRED until Jess switches phase.
- **English-native:** new strings authored in English; leave inherited Spanish literals as-is (they are the i18n keys); no lang-en.js entries for our own strings.
- **Workflow (standing):** game-affecting change (code, js/data/*.js, dev.html, build, assets) = prose plan (words only, NO code, not even a snippet or one line, describe files/locations/numbers/risks), then Jess OKs, then assistant builds/tests/writes in one step. Code appears only when written to the repo, never in chat. Jess never types code. EXCEPTION: js/data/changelog.js is free-edit (verify valid JS).
- **Free-edit for project docs:** the Markdown docs (CONTEXT, STATE, DEVLOG, DECISIONS, BALANCE, TODO, CLAUDE, docs/) edit directly, no proposal.
- **Git:** assistant MAY run read-only git (status, diff, log, show, blame, ls-files) and `git fetch` (only updates remote-tracking refs, so it can report ahead/behind). assistant NEVER runs any git command that changes the repo (add, commit, push, pull, merge, rebase, reset, checkout, switch, restore, stash, tag, clean, rm, mv, config set, and the like); gives Jess those commands. Full list: CLAUDE.md. No Co-Authored-By / AI trailer in commit messages.
- **PM / tracker:** assistant is Jess's PM; work queue is GitHub Issues + the "PokeSwarm" board (board wins for "what's next"). Assistant NEVER runs `gh` or any repo-changing git to mutate the tracker, drafts commands for Jess. Detail: docs/PM-WORKFLOW.md. Playtester guide: CONTRIBUTING.md.
- **No em-dashes** in any prose. Use commas, parentheses, "since"/"because".
- **Keep docs lean:** DECISIONS ~10 lines/entry, DEVLOG ~6 lines/entry, STATE.md under 3 KB. Rotate to archives past ~40 KB.
- **Efficient repo exploration:** CONTEXT.md, STATE.md, and CLAUDE.md are the complete automatic startup context. After that baseline, search before opening files. Read only task-relevant matches and their immediate dependencies. Skip assets/, pokeapi-master/, delete/, node_modules/, archives, generated bulk data, and large staged datasets unless the task specifically requires them.

## Where things live
- Design reference for the genre: docs/survivor-like-design-reference.md (Vampire Survivors / Brotato / Halls of Torment patterns and numbers). Search it, do not read it whole.
- Canonical Pokemon data: pokeapi-master (full mainline series data), the source of truth when translating mainline mechanics into survivor-style.
- Architecture map, build pipeline, module routing: ONBOARDING.md and CLAUDE.md.
- Active branch tracker: BOSS-REWORK.md (boss rework design, decisions and change log).
- Original owner's rules (publishing, servers, auto-update): docs/ORIGINAL-OWNER-RULES.md. Read it when publishing or when the cloud phase begins.
- One-command checks: `node tools/check.js` (syntax of every file, then every harness).
