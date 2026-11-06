# Handoff for an Opus planning chat: the host model (2026-11-05)

Paste or point the new chat at this file. It is a briefing, not a plan. Your job is to PLAN, in prose, with no code.

## Startup

CONTEXT.md, STATE.md and CLAUDE.md load automatically. Treat CLAUDE.md as binding. The rules that matter most here:
- Game code, js/data/*.js and dev.html changes need a prose plan in chat, no code in it, and Jess's OK before you build. Docs, tools/ and js/data/changelog.js are free-edit.
- You never run git commands that change anything, and you never run `gh`. Give Jess the exact commands. No Co-Authored-By line or AI signature in commit messages.
- No em-dashes anywhere. Use commas or parentheses.
- Keep docs lean (DECISIONS about 10 lines per entry, STATE under 3 KB). Cross-document IDs carry the file name (`COMBAT-RULES:SS13`). Use the tags [Approved], [Legacy behavior], [Proposed], [Open].
- Local-first: no cloud, multiplayer or co-op work; note a deferred hook only.
- After any edit: `npm run format`, then `node tools/check.js`. Headless checks must also load over file://.

## What Jess decided (2026-11-05, recorded in DECISIONS and COMBAT-RULES "Host model")

- Strong Host (follows ALL player rules): Player, Gym Leader (hand-authored restrictions), Uber, World Boss.
- Weak Host (follows the wild enemy rules): Elite (a wild enemy scaled up in size and stats, plus added rules), Wild Enemy.
- A gym leader can do anything a player can; Jess restricts by hand where he wants. Default allow, authored restrictions. This replaces the slice 7a allow-list (12 move forms, no team cards).
- A leader fields a TEAM that swaps like the player's (not all mons at once).
- Tells (wind-ups) stay for now as an authored AI restriction; Jess may remove them later.
- Gym cards are the leader's, per loop, pooled (running sum), authored schedule. Misty loop 1 is authored (13 stacks, Recover at 35% HP). A leader mon casts self heals at most its loop number per fight (a hardcoded rule for now, to be re-homed as a restriction).

## What is done

- Step 0 (docs): COMBAT-RULES "Host model", DECISIONS entries, GLOSSARY term, TODO item.
- Step 1 (audit): docs/proposals/host-model-audit.md. Read it first. It has the gap table (16 rows), five findings, three architecture options, a restriction-model sketch, a slice order and eight open decisions.
- No game code was changed for the host model.

## Findings to start from (details and line anchors in the audit)

1. The leader is an `Enemy` body plus `GymBrain`, not a player-class entity.
2. `Player` reads input in two places only (`G.Input.axis()` line 934, `G.Input.action('dodge')` line 951), so a controller seam is cheap.
3. The team layer (roster, swap, swap lock, faint auto-swap, bench ticking, shared stage and dodge stores, team card store) lives in `G.Game` (js/game.js), not in `Player`. It must be extracted for a leader to own a swapping team.
4. Targeting is one-directional today (player moves hit `EnemyMgr`; enemy owners hit `owner.foes()`).
5. "Strong" in status.js means boss, elite, gym and NOT the player; the host model flips it.
6. The arena fields slot 0 only (`spawnLeader`, gym-arena.js:168). Slice B (#5, "all-at-once") is unbuilt and its premise changes to a swapping team.

## Your deliverable

A prose plan (no code) that Jess can approve or edit, covering:
1. The architecture choice (audit options A, B, C) with your recommendation and the reasons.
2. The restriction schema (where authored, which entries, how validated, how the heal cap and tells move into it).
3. The slice order and, for each slice: files, what changes in words, the tests (harness, mutation runner, smoke-ui), and the risks. Start from the audit's eight-slice sketch and correct it.
4. The balance impact and how Jess feel-tests each slice. Name the harnesses that pin the old model and what happens to them.
5. The questions below, each with a recommendation, asked in one batch.

Ask Jess these first (audit "Open decisions"): architecture; HP model (player formula or the TTK-60 s target); which Elite protections stay as added rules; leader dodge default; contact damage; swap AI (faint-only or voluntary); where a leader's progression is authored.

## Repo state at handoff

Branch `feature/gym-upgrade-authoring`, uncommitted (Jess commits). Changes this session: gym cards per leader per loop (js/data/gyms.js, js/systems/gym.js, BOSS-AUTHORING), self-heal cap (js/entities/boss-ai.js), Misty loop 1 data, harness updates (gym-harness 8b, boss-owner-harness, boss-owner-mutate), tools/move-lab.html, the gyms 2 to 8 sheet (docs/ASCII Concept Maps/Kanto Gyms 2-8 - Mons and Moves.txt), and the docs above. check.js was green (42 of 42 harnesses). boss-owner-mutate reports 5 stale patterns that were already stale at HEAD (melee tell, chain form, nova order, strike spot twice); a cleanup item, not part of this work.

## Useful pointers

- Leader data and rules: js/data/gyms.js header, docs/BOSS-AUTHORING.md, docs/GYM-ROSTERS.md, BOSS-REWORK.md.
- Move runtime and the owner interface: docs/current feature planning/combat-architecture.md (D-ENEMY section), js/systems/move-sim.js header.
- Status and stages: docs/COMBAT-RULES.md (Status effects, SS6 to SS13), js/systems/status.js, js/systems/stages.js.
- Player kit: js/entities/player.js (constructor, hurt, update, tryDodge, setActive, fuse).
- Per-gym move numbers and card pools as built: docs/ASCII Concept Maps/Kanto Gyms 2-8 - Mons and Moves.txt (regenerate with a node script if gyms.js changes; the generator is not committed, it only reads G.Gyms and G.MoveDefs).
