# TODO / ISSUES

The backlog. Canonical and in-repo so both tools see the same list.
Keep it simple: move items between sections as they progress. Add a date when an item is opened or closed.

---

## In progress
- Pokedex UI redesign (feature/pokedex-ui): APPLIED + verified, awaiting in-browser playtest + commit.
  Opened 2026-10-17.

## Up next (local single-player)
- Damage sub-slice C: enemy -> player damage. BLOCKED on a design decision: enemies attack from
  behavior, not the move catalog, so they have no physical/special category or base Attack stat yet.
  Options scoped (player-defense-only via a type->category map, vs full both-sides mainline). Opened
  2026-10-17.
- Merge feature/base-stats (damage A+B) to main when ready. Merge feature/pokedex-ui to main when
  playtested. Independent branches off main.

## Backlog
(ideas not yet scheduled)

## Deferred, cloud / multiplayer phase (do NOT start until Jess switches phase)
- Firebase layer (auth, Firestore, RTDB, cloud saves)
- Cloudflare TURN worker
- Multiplayer / co-op / networking (js/net/: social, net, coop, ranking, signups)
- Friends, rooms, online leaderboards

## Done
- 2026-10-17: Damage sub-slice B (player->enemy on the mainline A/D ratio, STAB, scalar 2.0) applied,
  verified, committed + pushed on feature/base-stats.
- 2026-10-17: Set up AI collaborator agent + in-repo project-docs scaffold (CONTEXT, DEVLOG,
  DECISIONS, BALANCE, TODO) + CLAUDE.md rewrite for the two-tool workflow.
- 2026-10-17: Team Roster feature reviewed, i18n fix applied (English swap-in line), merged to
  main (--no-ff) and pushed; feature/team branch deleted. Repo went source-only (build output
  gitignored).
