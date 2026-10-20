# CONTEXT, start here (shared rulebook for all AI tools)

This file is the shared source of truth for any AI assistant working on this fork,
whether that is the PokeSurvivor agent in Amazon Quick (work machine) or Claude Desktop (home).
The two tools cannot see each other's memory. This repo is the only shared brain, so
everything that must survive a tool switch lives here as a file.

## Session start (do this first, every session)
1. Read this file and STATE.md (the short current handoff). Nothing else is required.
2. Say where we left off and the top open items. ("Catch me up" means exactly this.)
3. Read TODO.md 'In progress' only if more detail is needed.
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

## Core working rules (full detail in CLAUDE.md)
- **Local-first:** build and perfect the LOCAL single-player game first. All cloud/online and
  multiplayer work (Firebase, Cloudflare TURN, js/net/) is DEFERRED until Jess says he is switching phase.
- **English-native:** author new user-facing strings directly in English. Leave inherited Spanish string
  literals as-is (they are the i18n keys). No lang-en.js entries or Spanish translations for our own new strings.
- **Workflow (standing):** for anything that changes what the game does when you run it (code, js/data/*.js,
  dev.html, build config, assets), the assistant gives a PROSE PLAN in chat (what changes, files, numbers,
  decisions needed, risks). Jess replies with edits or OK. Then the assistant builds, runs the harness and
  headless-browser tests, and writes straight into the repo in one step. No diff files, no separate apply step,
  no code snippets in chat. Jess does not type code.
  - EXCEPTION: `js/data/changelog.js` is free-edit (patch notes). Edit it directly, but verify it still parses as valid JS.
- **Free-edit for project docs:** the Markdown docs (CONTEXT, STATE, DEVLOG, DECISIONS, BALANCE, TODO, ISSUES, CLAUDE, docs/) do not
  affect the game, so edit them directly, no proposal.
- **Git:** the assistant NEVER runs git (not even read-only). It inspects the filesystem or gives Jess the commands
  and strategy; Jess runs all git himself. Commit messages carry no Co-Authored-By or Claude-Session trailer lines.
- **No em-dashes** in any prose. Use commas, parentheses, "since"/"because" instead.
- **Keep docs lean:** DECISIONS entries about 10 lines, DEVLOG entries about 6 lines, STATE.md under 3 KB. Rotate to the archives when a file passes about 40 KB.

## Where things live
- Design reference for the genre: docs/survivor-like-design-reference.md (Vampire Survivors / Brotato / Halls of Torment patterns and numbers). Search it, do not read it whole.
- Canonical Pokemon data: pokeapi-master (full mainline series data), the source of truth when translating mainline mechanics into survivor-style.
- Architecture map, build pipeline, module routing: ONBOARDING.md and CLAUDE.md.
- Active branch tracker: BOSS-REWORK.md (boss rework design, decisions and change log).
- Original owner's rules (publishing, servers, auto-update): docs/ORIGINAL-OWNER-RULES.md. Read it when publishing or when the cloud phase begins.
- One-command checks: `node tools/check.js` (syntax of every file, then every harness).
