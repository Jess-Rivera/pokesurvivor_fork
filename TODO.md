# TODO / ISSUES

The backlog. Canonical and in-repo so both tools see the same list.
Keep it simple: move items between sections as they progress. Add a date when an item is opened or closed.

---

## In progress
Full history of the closed items below: docs/TODO-archive.md (search by keyword). Rulings: DECISIONS.md. Current state and next step: STATE.md.

- Item rework, branch feature/items (design agreed 2026-10-20; F1 framework BUILT 2026-10-20 night, awaiting Jess feel-test; F2 onward not built). Three tiers: ground items (auto-activate on contact), Pokemon items (one per Pokemon, effect only while it is the active one), run items (very rare, custom, 2x2 inventory grid that starts at 1 slot). Order: F1 framework (data-driven hooks, per-holder state, run tier, ground tier, port the 11 items), F2 team sheet reassignment plus HUD, F3 ground-item content, PokeAPI import through an item rules table, then the Inventory screen and gacha. Cures (Full Heal and friends) land here. See DECISIONS 2026-10-20 Item rework.
- Boss rework, branch feature/boss-rework: design agreed; Overworld Elites and the Brock pilot gym are BUILT, committed and merged (2026-10-19). Next: Kanto roster (Misty and Staryu next), other move-kind forms, the Boss damage slice (bosses and gym leaders still use the flat def.dmg path, which is the biggest known balance hole), then the HP and damage scalar retune. Gym 3 needed the player status core, which slice E now provides. Design record: DECISIONS 2026-10-19 and BOSS-REWORK.md. Keep Going is deferred to feature/continue-option.
- Status rework: slices A to E are ALL BUILT and closed (2026-10-20). Offline harnesses pass; Jess feel-tests each change. Open leftovers: status projectile visuals (E2c, parked), cures (item rework), per-Pokemon versus per-move upgrade cards (measure DPS against enemy HP at minutes 10, 20 and 30 first), Ailment Chance step of +10 may need 15 to 20, multi-hit parked for the bulk move import, abilities and held items that touch status ride on the ability and learnset import, co-op hz hook deferred to the MP phase.
- Tileset project (new, not yet tracked here before): atlases for Shady Forest, Crystal Cave and Ash Volcano are baked (assets/tileset/*, tools/make_tileset_*.py, G.TILESETS.*), but nothing in js/ loads them. Next: loader, map generator cleanup of thin wall stubs, the hedge occluder, rift arenas via filters. Open: Crystal deep-water inner piece is a boulder island, Ash Volcano deep-lava NE and NW concave corners have no art, tall and short wall mixing needs generator rules. Specs live in the project docs design/*-tileset-spec.md; log in DEVLOG 2026-10-20.
- Balance pass: all branches DONE and merged (tune/damage closed 2026-10-19). Carry-overs are listed under 'Up next'. Tuning knobs: the tables at the end of js/data/enemies.js; numbers in BALANCE.md. Open logger gap: alive-by-class sample.

## Up next (local single-player)
- LATER (status slice E, roadmap in In progress): Status mechanics on the player (slow, daze, drowsy, haste aura, secondary Status). DEFERRED HOOK for the cloud phase: the co-op `hz` broadcast must carry the hazard's status field (js/net/coop.js), not touched until the MP phase.
- Rift legendaries are not region-gated (rift.js line 92 filters on p.leg only): a Gen 5 Tornadus appeared in a Kanto run at 2:47 and its flat 55 zone hit one-shot a 53.9 HP player. Jess 2026-10-18: LEAVE THE RIFT FIX ALONE (rifts are planned for removal). The flat boss and legendary damage stays in the Boss damage slice below.
- tune/damage CARRY-OVERS (branch CLOSED 2026-10-19, see Done; every item below is OPEN and unscheduled):
  - Boss damage slice is the next obvious one: in the last log (Charizard, 3:39) two Nidoking shots at a flat 17.3 each (no defence step) were 25% of all damage taken and ended the run (30 HP to 12.8 to 0); the first boss spawns at 3:00 and the XP boost ends there. Details in the Boss damage slice item below.
  - Canonical type chart (0.5, 2.0, immune) is ON HOLD: needs the immune-means-zero fix past the per-hit 1-damage floors (floorHit in combat.js, Math.max(1, raw) in Player.hurt), a boss-immunity rule, and optionally an 'Immune' popup. The chart is still the softened one (SOFT 1.6 / 0.6 / 0.3, clamp 0.3 to 2.4).
  - Ranged leftovers, held until a MIX log says they are needed: culling at the cap, pressure on idle ranged, a per-tier share ramp. The band-holder ceiling (BALANCE) is the current answer.
  - Panic is nearly inert at the 0.6 weights (log 4: 0 panicking in all 44 samples) and the panic meter will rarely show; Jess will retune MORALE (fearWeight / painWeight / panicBelow) later if wanted.
  - The XP boost stops at 3:00 (same moment as the first boss); consider fading it. The XP bar rounds up (6.55 shows 7/7).
  - 'Retune HP / damage scalars from logs, last' was NOT done. Revisit after the boss damage slice (a boss one-or-two-shots the player today, so later-run incoming damage cannot be judged).
  - Dash ability: design talk first, own branch. Slot unlock progression and level-up scaling by slots: see Backlog.
  - Co-op was not exercised for any of the new enemy code (band jitter, morale, ceiling, status chasers); remote copies run the same constructor. Check when the multiplayer phase starts.
  - Status class: inactive carriers are plain chasers (melee family); active ones (cap 2) hold the close band (slice E1). Summoners still hold a band.
- Boss damage slice: bosses still use the flat def.dmg path (sub-slice C deferred them). Put bosses on
  the A/D ratio (and decide boss "Power": flat vs a boss-move) when ready. Opened 2026-10-17.
- Swap enemy placeholder Power: ENEMY_POWER=40 (flat) -> canonical move power once enemies draw real
  moves (ties into the canonical-learnset plan). Opened 2026-10-17.
- Canonical learnsets: give each species its real movepool (and move power), the shared system that
  lets both player and enemy "Power" be real. Opened 2026-10-17.
- Canonical move procs slice (folded into status slices C and D, roadmap in In progress): wire the annotate-only ailment/ailmentChance/flinch/statChance fields on
  moves (added 2026-10-17) into real probabilistic effects; split the overloaded fork `slow` flag
  (speed-drop vs freeze vs paralysis vs weather). Opened 2026-10-17.

## Backlog
- Slot unlock progression and level-up scaling by unlocked slots (DEFERRED, Jess's original design, noted 2026-10-19): a new player starts with ONE Pokemon slot and unlocks more through progression. Level-ups (the one-card-per-level, one-Pokemon-one-move pick) will need to change as slots unlock, because a bigger team dilutes upgrades per Pokemon and leaves benched members lagging. Candidate directions from the 2026-10-19 talk: bench share (benched teammates get a smaller automatic copy of each pick, EXP Share style), a bonus pick for every team member every Nth level, or scaling XP cost with slots. Until then all balance playtests are run as a new player with a single Pokemon. Note: levels and HP/stats are already shared across the team (benched members sync to the run level), only the move upgrades are divided.
- SEO copy pass (opened 2026-10-18): tools/make_seo_pages.py still claims move evolutions (about lines 195, 200, 242, 418-428, 465, 471, 504) and renders an empty evolution column (export sends evo: null). Also prune dormant save fields (stats.evolutions, evoMoves), unused Player.addMaxHp, dead lang-en.js keys.
- Engine ceilings + endgame performance audit (opened 2026-10-18): unbounded upgrades are intended and endgame collapse is accepted, but fix inefficiencies that make it arrive early (projectile array splice, no projectile cap, fan spread = spread x n wraps at high counts, meaningless ceilings like arc 360 make a card ineligible). Do after the card pipeline exists.
- Pause menu / team summary sheet (BUILT, committed and merged to main 2026-10-18; open items only). 2d-1: js/ui/sheet.js team summary sheet used by the pause screen and a Team summary view from the end-of-run screen (roster strip, moves grouped by bond with stacks / numbers / one-hit damage, two-layer hexagon white base + 60% yellow card bonus with +X%, held item). 2d-2: level-up choose mode through the sheet (scr-choose; Confirm / double-click / Enter, 1-4 pick a move, Backspace back, ineligible Pokemon dimmed with reason; auto-advance removed; New Move cards still single-step; level-up screen in English). Open: touch untested; co-op uses the same sheet mouse-only. Open / deferred: per-Pokemon kills and damage dealt on the end screen (Jess: later); a rough DPS line (misleading for orbit/aura/trail ticks); hexagon clamps at the outer edge (MAX 200) once a build passes it, numbers stay true (revisit when players optimize); meta-progression perks (flat HP, atk/spd multipliers) and temporary buff stacks are not shown in the hexagon; sheet does not live-update while open in a group game; touch/phone layout only checked in a headless narrow viewport; stale Spanish keys left in lang-en.js on purpose (chunk matching could change other texts); a full Spanish-to-English source sweep is its own slice.
- Bond rework (its own branch). Opened 2026-10-18, decided with Jess: Bond = Slot Compression + Synergy. Slot compression (a bond frees slots, so you carry more
  moves than the 4 slots; max today 7 moves with one group of 4) stays and grows in value as more moves are added. Synergy (bonded moves interact, for example
  cast-triggered cooldown cuts or same-type bonuses) is new and needs designing. The old job, firing several moves at once, goes away: with independent
  cooldowns (swap rule, fix/attack-calc slice 3c) every slotted move recharges on its own. Open: synergy rules, bond count per run, BOND_MAX, whether more
  than one group can grow, HUD, and rebalancing late-game damage (a 4-move bond was ~4x sustained damage).
- Player-facing battle log (for example a last-3-seconds breakdown on the death screen): DEFERRED by Jess
  2026-10-17, dev logger first. Would reuse the same G.Log records. Not designed further.
- Upgrade rework slice 2 follow-ups (2a to 2d are committed and merged to main, 2026-10-18; 2c = six per-Pokemon stat cards + Type/Kind scoped damage cards). Open: vitamin names are placeholders; tune FAMILY_W (Stats 8, new moves ~25% of cards), stat step 5%, scoped step 15%, Protein/Calcium weight floor 0.25; scoped scope is picked uniformly (not by how many moves match); stat gains are shown on the team summary sheet (2d-1) and not on the bond screen; mechanic card art; key labels 'SEMICOLON'/'QUOTE' in the Pokemon step (check: 2d-2 replaced that step with the sheet, may be obsolete); co-op ghosts ignore stat cards and scoped damage; touch not tested. Analysis only (no change wanted): the family-then-card draw over-represents a thin family's lone mechanic (Projectile Speed ~39% of offers for an Ember-only team).
- Upgrade system rework, remainder (the in-run part is DONE, slices 1 to 2d, see Done; rulings in DECISIONS 2026-10-18 upgrade rework). Still open from the design: the first-5-minutes pacing target (check G.Log.pacing() after the next playtest), in-run skip/banish, and meta-progression upgrades on their own branch (flat tiers). The old known issues (flat HP cards, unbounded Potencia stacking, cards not mapped to Atk/SpA/Def/SpD) are fixed by slices 1 and 2c.
- Region-select on Play (local single-player). DESIGNED 2026-10-17, not built. Player picks a region
  (or All) before a run; only that region's Pokemon spawn as wild enemies + bosses. Eligible pool =
  the chosen gen AND all previous gens (so Kanto = gen 1 only, Paldea = full dex). Fallback for sparse
  BST bands is baked into that rule (pool widens backward); gen-1's thin top tier (T5 = exactly 7,
  high boss bands thin) is ACCEPTED as-is, no special case. Implementation sketch: add a `p.gen <=
  selectedGen` predicate to candidates() and the two boss G.DEX.filter lines in js/data/enemies.js;
  store the pick in module scope via a new G.Enemies.setRegion(gen) (null = All) called before
  rollRun(); add a region-picker screen between the menu Play button (menu.js go==='play' ->
  G.Flow.play()) and the run roll (spawner.js rollRun()). Hordes/events inherit the filter for free
  (they call candidates()). Per-run only, NOT persisted -> save-safe. Independent of sub-slice C.
  Open sub-questions (not needed to build the mechanic): (a) can players pick only unlocked regions
  or any region freely? (b) are rifts/legendaries region-gated too? (c) co-op region choice =
  deferred (local-first). At build time, confirm pickN handles "want > available" gracefully (gen-1
  T5 fits exactly at 7).
- More accurate hitboxes (opened 2026-10-19, Jess asked; NOT started, nothing decided). Today every unit is one circle: radius = 22% of the idle frame width, clamped 5 to 26 px, x2 pixel scale x unit scale (G.Sprites.bodyRadius), same for the player. All hit tests are circle-based (melee circle + arc, beam rectangle, projectile segment, cone, chain, contact at 1.3x the radius sum). Options in order of cost: (1) per-species tuned circle radius from the opaque pixels of the idle frame, measured once by an offline script into a data file, no runtime change, but shifts balance for every species, so playtest; first check whether the sheet meta already holds a tight bounding box per frame; (2) per-species ellipse or capsule with an offset for damage tests only (spacing and movement stay circles), touches about a dozen radius sites and the melee/contact reach just fixed; (3) per-frame pixel masks, not recommended (CPU, memory and inconsistent-feeling hits). Plan: do (1) first, then judge (2) only if species like long serpents still feel wrong.

## Deferred, cloud / multiplayer phase (do NOT start until Jess switches phase)
- Co-op levelStart (game.js) has no empty-offer guard (solo maybeLevelUp does since 2026-10-18); add it when MP resumes.
- Firebase layer (auth, Firestore, RTDB, cloud saves)
- Cloudflare TURN worker
- Multiplayer / co-op / networking (js/net/: social, net, coop, ranking, signups)
- Friends, rooms, online leaderboards
- Co-op hazard sync: G.Hazards.add's network broadcast serializes a fixed field set, so the sub-slice C
  atkFactor/atkCat on enemy hazards do NOT cross the wire. Revisit when MP resumes (enemy->player
  damage would need the attacker context synced, or recomputed on each client).
- Co-op region choice: startCoop() does not run the region picker, so a co-op run inherits the last
  solo region (harmless while MP is dormant). Decide region handling for co-op in the MP phase
  (host picks? reset to All?).

- MP connection reliability, hosting-provider research, and FPS/CPU/cost reasoning (parked design notes, 2026-10-17): moved to docs/MP-PARKED-NOTES.md. Not read at session start. Open it when the cloud/MP phase begins.

## Done
Recent entries only; the full list (back to 2026-10-17) is in docs/TODO-archive.md.
- 2026-10-20: Status slices D and E closed (see In progress).
- 2026-10-19: Main menu Team screen BUILT (fullscreen party editor; Commit Team / Back; place by button, double-click or drag; Pokedex is browse-only). Open: Team menu icon reuses the crown, Ability line is a stub, touch layout and drag untested. DECISIONS 2026-10-19 Team screen.
- 2026-10-19: tune/damage CLOSED and merged. Player damage scalar 1.0, 2x opening XP boost until 3:00, opening enemy HP ramp, spawn mix 60/30/10, ranged spacing-band jitter, morale system, 35% band-holder ceiling. Last log: one Charizard survived 3:39 at level 8 with 278 kills. Details: BALANCE 'Run opening' and 'Enemies'.
- 2026-10-18: Upgrade rework slices 1 to 2d-2, xp-curve and attack-calc merged to main.
