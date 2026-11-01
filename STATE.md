# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-01 end of session (Claude Code, home; Kanto gyms 2 to 8 on feature/gym-roster).

## Where we are
- Branch feature/gym-roster (off main, pushed). Main has the move schema merge, #17 lint/format (ESLint warn-only, Prettier, pre-commit format hook) and #1 gym gate art.
- This branch: gym contact mask baked into js/data/gym-contact.js (fixes the file:// SecurityError; rerun node tools/gym_contact.js after repainting gym-contact.png). Kanto gyms 2 to 8 authored in js/data/gyms.js with badge boosts (DECISIONS 2026-11-01); Brock slots in Gen-1 order. Move sets are PROVISIONAL, catalog moves with a gym form, one melee cone per slot (docs/BOSS-AUTHORING.md).
- Surge's mons use Normal/Steel stand-ins: no Electric move has a gym form (Thunder Shock chains).
- Tests: check.js 30/30 (gym-harness 10b casts every authored move of gyms 2 to 8), both smokes pass, headless probe beat all 8 gyms in order.

## Next (in order)
1. Jess: feel run of gyms 2 to 8 (dev.html?dev, G.Gym.debugOpen() opens the next gate).
2. Fix the ITEM CHOICE SOFT-LOCK (TODO.md; js/game.js offerItem, game code, plan first). Reachable after any gym win with full item slots.
3. Boss casts and riders (Jess's next slice, TODO "Gym follow-ups"): Thunder Shock and Hex for leaders (skip the chain hop for an enemy owner), more gym forms, then ailments, stat drops and flinch onto the player. Then give Surge real Electric moves.
4. Tune gyms 2 to 8 (power, tempo, cards). Redo the two lore moveset maps to the Gen-1 order.

## Open owner decisions
- [Open] loop 2+: do a gym's mons share stat raises. O4: do badge boosts stack again in later loops.
- Bond tax [Proposed]. [Open] stage-manipulation moves, raises on foes, whole-field moves. HUD own-drop gap (proposed). Psychic widening [Open]. Quick Attack priority [Open].

## Docs and code still differ (approved, not built)
- Multi-mon arena (#5): gym-arena.js single bossId, gym.js per-def enrage clock. Gym AI Tier 2. js/net/coop.js calls removed legacy hooks (co-op redesign). Three stale move-sim mutations (TODO Backlog). Regional forms (#9).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime.
Tip for edits: the repo mixes CRLF and LF files, so exact multi-line text matches must normalize line endings first.
