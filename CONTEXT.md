# CONTEXT, start here (shared rulebook for all AI tools)

This file is the shared source of truth for any AI assistant working on this fork,
whether that is the PokeSurvivor agent in Amazon Quick (work machine) or Claude Desktop (home).
The two tools cannot see each other's memory. This repo is the only shared brain, so
everything that must survive a tool switch lives here as a file.

## Session start (do this first, every session)
Read these, then state where we left off and the top open items:
1. CONTEXT.md (this file)
2. DEVLOG.md (what happened last session)
3. DECISIONS.md (standing rulings, do not relitigate)
4. BALANCE.md (tuned numbers)
5. TODO.md (the backlog)

When Jess says "catch me up," do exactly the above.

## Session end (do this before stopping or switching machines)
1. Append a DEVLOG.md entry: what changed, what was decided, what broke, where we stopped.
2. Remind Jess to commit and push, so the other tool pulls a current tree.
Both tools follow this symmetric discipline. If the DEVLOG looks stale after a git pull,
suspect the other tool skipped it.

## The two tools, one repo
- Jess works partially here (Amazon Quick, work machine) and partially at home (Claude Desktop).
- The git repo bridges them. Commit before switching tools so neither side edits a divergent tree.

## Core working rules (full detail in CLAUDE.md)
- **Local-first:** build and perfect the LOCAL single-player game first. All cloud/online and
  multiplayer work (Firebase, Cloudflare TURN, js/net/) is DEFERRED. Do not touch it until Jess
  says he is switching to that phase.
- **English-native:** Jess develops in English. Author new user-facing strings directly in English.
  Leave inherited Spanish string literals as-is (they are the i18n keys). Do not add lang-en.js
  entries or Spanish translations for our own new strings.
- **Propose-and-approve for game code:** anything that changes what the game does when you run it
  (code, js/data/*.js, dev.html, build config, assets) is PROPOSED as a diff with the rationale.
  Jess approves or denies; on approval the assistant applies the edit itself. Jess does NOT type
  code in by hand, and the assistant does NOT apply game-code changes before approval.
  - EXCEPTION: `js/data/changelog.js` is free-edit (patch notes, purely informational, does not
    affect mechanics). The assistant edits it directly WITHOUT approval, but MUST verify it still
    parses as valid JS (balanced quotes/brackets/commas) after editing, since a syntax error there
    would break the bundle. This is the ONLY js/data/*.js file that is free-edit.
- **Free-edit for project docs:** the Markdown project docs (this file, DEVLOG, DECISIONS,
  BALANCE, TODO/ISSUES) do NOT affect the game, so an assistant edits them directly, no proposal.
  Dividing line: "does this change what the game does when you run it?" No = edit freely. Yes = propose.
- **Git:** the assistant NEVER runs git (not even to answer a merge-readiness question). It inspects
  the filesystem directly or gives Jess the commands and strategy; Jess runs all git himself.
- **No em-dashes** in any prose. Use commas, parentheses, "since"/"because" instead.

## Where things live
- Design reference for the genre: the Quick agent has a cited survivor-like design reference
  (Vampire Survivors / Brotato / Halls of Torment patterns + numbers). If working at home, ask
  for it or see any copy committed under docs/.
- Canonical Pokemon data: pokesurvivor_fork/pokeapi-master (full mainline series data), the source
  of truth when translating mainline mechanics into survivor-style.
- Architecture map, build pipeline, module routing: ONBOARDING.md and CLAUDE.md.
- Active branch tracker: BOSS-REWORK.md (design, decisions and change log for feature/boss-rework). Read it at session start while that branch is active.
- Archives (NOT read at session start): docs/DEVLOG-archive.md (older session entries) and docs/MP-PARKED-NOTES.md (parked multiplayer and hosting notes).
