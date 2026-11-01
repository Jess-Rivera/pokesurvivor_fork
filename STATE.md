# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-01 end of session (Claude Code, home; boss casts slice part 1 on feature/gym-roster).

## Where we are
- Branch feature/gym-roster (off main, pushed). Kanto gyms 2 to 8 authored with badge boosts; Jess feel-tested them: good, no changes.
- This session (3 commits): item choice soft-lock fixed. Gym forms: chain hops and homing search the CASTER'S FOES (owner.foes(), so co-op players can take a hop later), new nova, strike (Thunderbolt, spot locked at the tell) and homing forms. Utility move picker for leaders (score = freshness x fit, POINT_BLANK 0.5; rule in docs/BOSS-AUTHORING.md "THE PICK"; ?dev G.Debug.hitbox(true) shows scores).
- Tests: check.js 30/30, boss-owner harness 131, mutations 40/40, smokes pass (each flaked once).

## Next (in order)
1. RIDERS ONTO THE PLAYER (approved by Jess 2026-11-01, build next; game code in js/systems/move-effects.js hitPlayer, js/entities/player.js, the sim cast step): ailments through G.Status; foe stat drops on the player's own tracker (strong-host Gate); the leader's own on-hit raises (Metal Claw) and drain heal (Giga Drain); Hex x2 vs a major ailment; CRITS ON for leader hits (Jess). FLINCH ON THE PLAYER (Jess): every move in the active group restarts its full cooldown (a bonded group is hit together), then those cooldowns hold 0.3 s before counting; plus the boss recoil (moving: back half its body at 2x speed, then still 0.2 to 0.3 s; standing: still only), buffs keep casting, shapes already out continue, no flinch while asleep or frozen, 0.5 s roll gap, "Flinched" popup. Add a COMBAT-RULES rule for it. Add the picker's OPPORTUNITY factor in the same commit (Hex up vs an ailing player, ailment moves down when one is already on you, drop moves up when that drop is absent). Balance warning: Sludge, Poison Sting, Body Slam, Lick, Bite riders start landing in gyms 2 to 8.
2. Ask Jess: fold TODO "Gym follow-ups" (e) Psychic reach (cast from 420 px, flies about 166 px) into the riders slice or keep separate.
3. Surge's real Electric sets (Thunder Shock, Thunderbolt; no Electric melee in the catalog, keep a Normal/Steel contact move).
4. Tune gyms 2 to 8. Redo the two lore moveset maps to the Gen-1 order.

## Open owner decisions
- [Open] loop 2+: do a gym's mons share stat raises. O4: do badge boosts stack again in later loops.
- Bond tax [Proposed]. [Open] stage-manipulation moves, raises on foes, whole-field moves. HUD own-drop gap (proposed). Psychic widening [Open]. Quick Attack priority [Open].

## Docs and code still differ (approved, not built)
- Multi-mon arena (#5), gym AI Tier 2 (movement scoring), js/net/coop.js legacy hooks, three stale move-sim mutations (TODO Backlog), regional forms (#9).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime.
Tip for edits: the repo mixes CRLF and LF files, so exact multi-line text matches must normalize line endings first.
