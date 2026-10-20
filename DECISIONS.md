# DECISIONS

Standing design and workflow rulings. Once something is here, treat it as settled, do not relitigate it.

ARCHIVE: older and superseded entries (mostly 2026-10-17 and 2026-10-18 build records) were moved VERBATIM to docs/DECISIONS-archive.md on 2026-10-20.
Search it by keyword (grep) before assuming a topic was never decided. If an archived entry conflicts with an entry here, this file wins.
Convention: new entries stay at most about 10 lines (the rule and the why); long detail belongs in the harness or proposal doc.

Archived entries (heading only):
- 2026-10-18, Opening pacing: XP boost and elite gate
- 2026-10-18, Slice 1c design answered: shots, support crowd-seeking, contact gap, flanker
- 2026-10-18, Logger additions and slice 1b approved and applied
- 2026-10-18, Slice 1 playtest results and two rulings
- 2026-10-18, Slice 1 approved and applied; charger gets a warning line
- 2026-10-18, ranged and support spacing bands
- 2026-10-18, Status support class, secondary Status, and Jess's hand tuning
- 2026-10-17, Cast composition rule (9 per tier) and the profile fallback
- 2026-10-17, Enemy taxonomy: top-down families, then class, then body modifiers
- 2026-10-17, Enemy behavior becomes stat-derived (replaces the dex-hash classes)
- 2026-10-17, Balance pass: order and intent (Jess's rulings)
- 2026-10-17, Dev logger: dev-facing, full-granularity, numeric ring buffer (built 2026-10-17)
- 2026-10-17, Likely MP shape: ONE deliberate high-density room (not multi-room matchmaking)
- 2026-10-17, Region-select scope + sparse-band fallback (DESIGNED, not built)
- 2026-10-17, Enemy attacks are behavior-driven, NOT move-catalog (finding, affects sub-slice C)
- 2026-10-18, XP curve (feature/xp-curve), Jess's rulings
- 2026-10-18, fix/attack-calc: design talk (NO code yet), Jess's rulings and the agreed scope
- 2026-10-18 — fix/attack-calc slice 1 APPLIED
- 2026-10-18 — fix/attack-calc decisions (BETA, aura/trail, slicing)
- 2026-10-18 — fix/attack-calc slice 2 APPLIED
- 2026-10-18 — fix/attack-calc slices 3a+3b APPLIED
- 2026-10-18 — fix/attack-calc slice 3c APPLIED (swap rule)
- 2026-10-18, Upgrade rework slice 1 APPLIED (deletion)
- 2026-10-18, Upgrade rework slice 2a APPLIED (data layer)
- 2026-10-18, Upgrade rework slice 2b APPLIED (mechanic cards live)
- 2026-10-18, Upgrade rework slice 2c APPLIED (stat cards + scoped cards)
- 2026-10-18, Slice 2d-1 APPLIED (team summary sheet: pause screen + end-of-run team view)
- 2026-10-18, Slice 2d-2 APPLIED (level-up choose mode through the team summary)

## 2026-10-20, Workflow update: prose plan, then build (standing; supersedes the 'propose a diff' step of the 2026-10-17 Edit boundary entry) [Jess, standing since 2026-10-18]
- Claude gives a prose plan in chat (what changes, which files, numbers, decisions needed). Jess replies with edits or OK. Claude then builds, runs the harness and headless-browser tests, writes straight into the repo in one step, updates DECISIONS/DEVLOG/TODO/STATE and gives commit commands. No diff files, no separate apply step, no code snippets in chat (describe the change in prose and bullets).
- Risky changes are flagged in the plan prose with why; proceed assuming yes unless Jess denies or edits. Jess feel-tests after each change (about a minute), so applied changes are not described as untested.
- UNCHANGED: the dividing line (does it change what the game does when you run it?), the free-edit exception for js/data/changelog.js, free-edit for the Markdown docs, and the hard rule that the assistant never runs git. Commit messages carry no Co-Authored-By or Claude-Session trailer lines.

## 2026-10-20, Status Slice E2b, E2d, E2e and close of slice E [Jess decided, branch feature/sliceE]
- SLICE E IS CLOSED (E1, E2a, E2b, E2d, E2e built; the E2c status-projectile visuals were PARKED by Jess, nothing changes for them). Offline harnesses pass; NOT run in a browser.
- SELF-CAST STAT EFFECTS (E2b): a move may carry `self: { stat, n }`, rolled on hit by G.Stages.procSelf with the move's statChance, one roll per move per 0.5 s, each application 6 s. A RAISE is team-wide (Metal Claw +1 Atk 10%, Meteor Mash +1 Atk 20%: each success adds a team application, so chance moves stack toward the +6 clamp). A DROP is per Pokemon (Leaf Storm -2 Sp. Atk, 100%): ONE application per move, renewed while it keeps hitting, so it holds at exactly -2 (an orbit hits every 0.26 s and would otherwise stack -6 in 1.5 s). My call, not Jess's: the 100% drop is single and renewed, chance moves stack.
- BENCH (E2b): game.js calls Player.benchUpdate for every standing non-active member each frame: G.Status.tick and G.Stages.tick (statuses, DoT, own drops). Skill cooldown is the only thing that does not tick. DoT can faint a benched Pokemon; that is SILENT on screen (Player.hurt skips the camera kick, sound, numbers and burst while `benched`, so nothing happens at its stale position) and game.js shows a RED toast ("<name> fainted on the bench!", G.UI.toast tone 'bad'). Regen and Bell heal still only run on the active member.
- FAINT AND REVIVE (E2b): fainting and revive() both call Player.clearEffects (G.Status.clear + G.Stages.clear): every status, DoT and own drop. The badge full revive (reviveTeam) also clears the living. The shared TEAM raises stay (they belong to the team, not to the Pokemon). A revive sets HP to maxHp * frac (the badge passes 1 = 100%; co-op revive keeps its 0.5 default).
- FREEZE AND SLEEP DROP THE PLAYER'S ORBS AND PULSES (E2d; Jess: 'freeze drops all orbs and status'): while G.Status.stunned(pl) the active orbit move clears its orbs every frame (they would otherwise keep hitting and rolling ailments) and orbit() respawns them the frame the stun ends. Interpretation of 'status': the damage-and-ailment tickers the player leaves behind, so trail patches (kind 'patch') stop pulsing and turrets stop firing while the owner is stunned (their life still runs out). Mines and meteors already placed are one-shots and still go off. If Jess meant something narrower, it is one line each in combat.js (tickMove orbit branch, updateFields turret and patch branches).
- AUTO-SHAKE (E2e): setting `autoShake` (default off, Settings > Controls > Accessibility). G.Status.autoShake(h, dt) taps Shake off at SHAKE.auto = 3 taps per second while anything is shakeable (a person can tap up to 12/s); each tap has the normal effect. The HUD prompt reads 'SHAKING OFF...' instead of 'TAP H' while it is on. Frame-rate independent (tested at 30, 60 and 144 fps).
- NOT DONE ON PURPOSE: cures (item rework), co-op hz hook (cloud phase), status projectile visuals (parked; the image-backed Ember orb in vfx.js is a one-line tryout, see DEVLOG), per-Pokemon vs per-move upgrade cards (open, measure DPS vs enemy HP at minutes 10, 20, 30 first).
- BALANCE NOTE: stages are WHOLE numbers only (the stage is the sum of live whole-number applications, no fractional stages). Simulated hour of nonstop hits: Metal Claw (10% per 0.5 s) sits at team Attack +0 about 52% of the time, +1 37%, +2 10%, +3 2%, never above +4 (time average +0.6); Meteor Mash (20%, rolled every 1.4 s because its cooldown is 1.4 s and both meteors count as one roll) +0 39%, +1 41%, +2 16%, +3 4%, highest +5 (average +0.9). The +6 clamp is a ceiling that is practically never reached. Levers if they feel weak: roll chance, stage per success, the 6 s duration. Leaf Storm's -2 Sp. Atk is x0.5 on its own damage while it hits. Watch both in play.

## 2026-10-20, Status Slice E2a: team stage buffs [Jess decided, branch feature/sliceE]
- Slice E2 plan (Jess 2026-10-20): E2a = the player's buff moves become stages (this entry, BUILT). E2b = self-cast stat effects (Leaf Storm, Metal Claw, Meteor Mash) plus benched statuses ticking and faint / revive handling. E2c = orbit and hazard freeze gaps. E2d = accessibility auto-shake (rate still open: about 3 taps/s reads as an aid, about 8 as a free skip). Cures belong to the item rework. The co-op `hz` hook stays deferred.
- SCOPE OF A STAGE: every + stage effect (anything that raises a stat, from a buff move or a self-cast bonus) is TEAM-WIDE. Every - stage effect (enemy-cast or self-cast) is PER POKEMON, on the one that took it (G.Stages on pl, as the E1 slow). The stage of a stat on the player = team raises + own drops, clamped to +-6.
- STORE: one shared object `stgTeam` on every roster member (set in game.js, never reassigned), ticked once per frame by the active member's update (the benched do not update, same as the old shared buffs). Entries { n, t, dur, src } per stat; Aqua Ring's regen lives in the same store under `regen` (n = HP/s per application).
- STAGE LADDERS (Jess 2026-10-20, supersedes the D1 'Speed -6 = x0.25' ruling): each stat has ONE base number B in G.Stages.BASE. A raise of s stages multiplies by (B + s) / B, a drop by B / (B + |s|), the same ladder for raises and drops, on every host (player, wild, elite, boss, gym leader). Attack, Defense, Sp. Atk and Sp. Def start at the mainline B = 2 (+2 x2, +6 x4, -2 x0.5, -6 x0.25). SPEED starts at B = 4: -6 x0.40, -5 x0.44, -4 x0.50, -3 x0.57, -2 x0.67, -1 x0.80, +1 x1.25, +2 x1.50, +3 x1.75, +4 x2.00, +5 x2.25, +6 x2.50 (Jess found +2 Speed at x2 let nothing catch him; he starts Agility at B = 4 and tunes by feel; reaching x2.0 movement takes +4). Consequences: enemy Slow at -2 is x0.67, the -6 crowd pin (Mud Shot, Bulldoze) is x0.40, enemy Haste at +2 is x1.5. Each stat's B is tuned separately as he feels it in testing. DASH DISTANCE (planned dash, not built): Agility scales it on the MAINLINE ladder, B = 2 (+1 x1.5, +2 x2, +6 x4, -1 x0.67, -2 x0.5, -6 x0.25).
- NO EXPLICIT CAP: duration / cooldown is the cap. Every cast is its own application on its own timer. At BASE every buff move has cooldown = duration = 8 s, so exactly one application is live and the stage equals what one cast gives: Swords Dance +2 Attack, Agility +2 Speed, Harden +1 Defense, Dragon Dance +1 Attack and +1 Speed each. Recharge (period / (1 + 0.15 n)) and Duration (x (1 + 0.15 n)) each multiply duration / cooldown, so the sustained stage is about per-cast x (1 + 0.15 r) x (1 + 0.15 d), flickering between the floor and ceiling when the ratio is not whole. The +-6 clamp is the only hard limit (Attack +6 = x4, Speed +6 = x2.5 on its B = 4 ladder). Safety only: 8 live applications per move.
- RETIRED for stage buffs (move field fixed): the Buff Stacks card and Increased Effect (no more flat potency). Aqua Ring keeps Increased Effect (its regen per application, 1.6 HP/s base) but not Buff Stacks. Duration and Recharge stay for all five.
- GRACE: an application stays 0.1 s past its end, and a recast of the same move inside that last 0.1 s renews it instead of stacking, so cooldown = duration holds the stage with no one-frame dip or double.
- WHERE IT IS READ: Attack stage multiplies the attacker factor of PHYSICAL moves only, Sp. Atk stage special moves only, status moves neither (Sp. Atk raisers wait for the move import); Speed stage multiplies final movement speed (no species bounds, as for enemies); Defense / Sp. Defense stage multiplies the player's Def / SpD in the enemy hit ratio (Iron / Zinc multiply with it). The old flat buff reads (atk x, spd x, flat reduction) are deleted.
- BROCK: Harden is the player's stage version now (Jess: the earlier 'leave Brock' ruling waited on this). His authoring is Duration x2 only (Buff Stacks no longer exists for the move): +1 Defense per cast, 10.4 s each, no stage cap below the +-6 clamp. A leader's recovery after a buff cast stays 0.85 s (the move's 8 s cooldown is the player's recast timer; leaders pick moves by weight). Tune by feel if his Harden climbs too far.
- Only the ACTIVE slot group casts (combat.js), so a buff must be selected or bonded to be recast; a benched Pokemon's moves do not tick. A swapped-in buffer casts at once if ready.
- RULINGS FOR E2b (decided here, BUILT in the E2b entry above): everything per-Pokemon (statuses, stages, DoT, drops) KEEPS TICKING on the bench; the only thing that does not tick is skill cooldown. A benched Pokemon can die to poison or burn. A revive (badge full revive, and fainting itself) clears all statuses and effects and sets HP to 100%. A benched death shows a red toast. Self-cast drops (Leaf Storm) are per Pokemon; Metal Claw and Meteor Mash raises are team-wide.
- Balance warning for the feel test: mainline stage numbers are much stronger than the old flat buffs (Swords Dance +2 = x2.0 physical damage for the team at about 100% uptime; the old maximum was +65%). Jess's first test: Agility at +2 / x2.0 movement was 'nuts' (nothing could catch him), hence the Speed ladder above. Jess wants the game harder and build-defining, so it ships as is. Knobs: stage ladders (stages.js BASE, one B per stat), per-move cd / dur / stageN (moves.js, tabled in docs/BUFF-TABLE.md).
- Offline: docs/proposals/status-sliceE2a-harness.js (real Combat.tick casts, both frame orders, jittery frames). Harnesses 2b (buff moves skipped, covered by E2a) and gym (Brock's Harden) updated. upgrade-slice2a-harness.js already crashed before this slice (stale stub, no TYPE_COLOR). NOT run in a browser.

## 2026-10-20, Status Slice E1: statuses on the player [Jess decided, branch feature/sliceE]
- Slice E is split: E1 = enemy-inflicted statuses on the player (this entry); E2 = everything else (player buff moves to stages, self-targeting stat moves, cures, accessibility auto-shake, orbit/hazard freeze gaps, co-op hz hook).
- STATUS CLASS = one status per species, hand-authored by Jess in the Status Roster artifact (63 species: 47 primary + 16 secondary): paralysis 15, slow 11, poison 10, haste 8, confusion 7, sleep 5, daze 4, trap 2, freeze 1. Table = G.Enemies.CARRIER_OF (data/enemies.js).
- Primary carrier: only 2 are ACTIVE at a time (like flankers; haste exempt). Active = behavior 'carrier': holds the close, dodgeable band (BANDS.carrier 0.30/0.40) and fires a status shot every 3.2 s (damage x0.5); inactive ones stay plain chasers. Secondary carrier: keeps its class; its shots and touches carry the status at HALF the duration, at most one per 4 s.
- Sleep species cast drowsy or sleep by weight 2:1 (drowsy:sleep). A sleep shot puts you to sleep with chance 0.6 (stand-in for the move accuracy); DROWSY (zzz marker, 8 s) multiplies every sleep-effect chance by 1.5, capped at 100%.
- New statuses: DAZE = movement heading jitters up to +-35 degrees, re-rolled every 0.2 to 0.4 s and eased, 6 s, no fizzle. SLOW = Speed -1 stage for 6 s (G.Stages on the player; carriers stop at -2). HASTE = a nova (170 px, every 5 s) that gives allies Speed +1 for 6 s, stacking to 2; the caster is excluded, bosses and gym leaders skipped.
- TRAP on the player = no damage, no slow: manual team swaps are locked for 8 s (faint auto-swap still works). Enemies cannot be trapped any more (apply returns 'none').
- FIRE SPIN reworked: strips every beneficial stat stage from the target and burns it for half the normal length (2 turns). Fire types are immune to the burn, not to the strip. Move fields strip, burnHalf.
- HARD CC ON THE PLAYER: every timer is FULL (no 25% cut; bosses, elites and gym leaders keep the 25% cut and 10 s window). After a hard CC (sleep, freeze, paralysis) ends there is a 2.5 s grace with no new hard CC (assumption, TUNE). Major statuses still compete (one at a time).
- SHAKE OFF: each tap takes 0.25 s off the most restrictive mashable status, floor 0.5 s remaining, at most 12 taps per second. Mashable: sleep, freeze, paralysis, confusion, trap, daze. Not mashable: burn, poison, toxic, drowsy, slow, stat drops. Time left falls at 1 + 0.25 x taps/s: paralysis 10 s -> 3.6 s at 8 taps/s, 2.9 s at 12; sleep 4 s -> 1.6 / 1.4; freeze 2 s -> 1.0 / 0.9.
- HUD: statuses sit in the lower-left stack with the buffs (red border, timer bar); a pulsing "TAP H TO SHAKE OFF" chip (tappable on touch) shows while a tap can help. Ring under the feet and a floating zzz while drowsy or asleep.
- CONTROLS: COMPACT default = WASD move, 1-6 team slot, Z / C previous / next team, I J K L skills, H shake off. FULL KEYBOARD preset = WASD, 1-6, Z / C, NUM1-4 skills, NUM+ shake off. Space is reserved for the planned dash (unbound). Settings > Controls has both preset buttons, a conflict warning and Reset (= compact). A saved key set made before E1 keeps its keys; shake_off takes its default only if no saved action uses it, so press "Reset keys" once.
- Offline: docs/proposals/status-sliceE1-harness.js. Harnesses A, B, C, 2c updated for the new trap, Fire Spin and player rules. NOT run in a browser.

## 2026-10-20, Status Slice D CLOSED: D4 dropped / parked [Jess decided, branch feature/status-sliceD]
- Crit stage (move-based crit tiers 12.5% / 50% / 100%) is DROPPED. Jess: the Critical Hit upgrade cards are already a very good card for runs; move-based tiers would devalue the card or stack into guaranteed-crit builds. Mainline crit stages exist because the games have no cards. The crit rules stay as they are (no base chance, +3% per card level, x1.5).
- Multi-hit (rolled pellet count 2 to 5, total = 3.1 x per-hit power, Count card refused via the `fixed` field) is PARKED for the bulk PokeAPI move import: only Bonemerang has a hit count today (the boomerang already hits twice), and the moves it is for (Double Slap, Fury Attack, Pin Missile, Bullet Seed, Rock Blast) arrive with the import. Open questions kept for then: each pellet rolls its own flinch / ailment / stat-drop chance (strong status appliers).
- Slice D = D1 stat stages, D2 flinch, D3 drain. Jess ran browser tests on all of it 2026-10-20. Next in the status roadmap: slice E (status and stages on the player).

## 2026-10-19, Status Slice D3: drain (Giga Drain) [Jess decided, branch feature/status-sliceD]
- Giga Drain is now ONE projectile (kind projectile, heart-shaped shot) instead of an aura. Power stays at the API-based 75 (Jess: "we're leaving that"). It heals 50% of the damage it ACTUALLY takes off the enemy (overkill past the enemy's HP excluded, shield absorbed counts), UNCAPPED (Jess 2026-10-19: "leave uncapped and we'll see if it's broke"; watch the logs for sustain; the engine still honours an optional `drainCap` fraction of max HP per hit if a move sets one). The old flat cap of 6 and the aura per-enemy heal are removed. Not applied to a teammate's ghost shot.
- Move field `fixed: ['count', 'pierce']`: keys listed can never take upgrade cards (mechanics.js check()); Giga Drain is always one shot and never pierces. Power, Recharge, Size, Range and Speed cards still apply. Reusable for other single-shot moves.
- Jess: saves are not a concern (every run is fresh and no starter has Giga Drain). Move fields: `drain` (fraction of damage dealt), optional `drainCap` (fraction of max HP per hit, unused for now). Mega Drain, Absorb, Leech Life, Drain Punch, Horn Leech, Dream Eater come with the bulk move import.
- Offline: docs/proposals/status-sliceD3-harness.js. NOT run in a browser.

## 2026-10-19, Action bar without boxes + move search [Jess decided, branch feature/status-sliceD]
- Action bar: a single move is the bare icon at 54 px (3x native, no distortion); cooldown shade and cast flash are masked to the icon pixels; the active move gets a yellow silhouette outline (plus the existing raise and name). Empty slots and BONDED groups keep the box (bond = pink border, 2x2 icons).
- Pokedex/Team search also matches moves: a word of the move name starts with the query (min 3 chars) -> every Pokemon whose type pools contain it; Normal-type moves (learnable by all) match only on the full name. Union with name/# matches; unowned Pokemon included for move matches. Ranked: moves whose NAME starts with the query (and name/# hits) first, word-only matches (e.g. Bug Bite for "bit") below.
- Team/Pokedex grids use align-content: start so few results keep their natural cell height.

## 2026-10-19, Player melee reach matches wild contact reach [Jess reported, branch feature/status-sliceD]
- Bug: wild melee hits at CONTACT.hit (1.3) x (e.r + pl.r) centre-to-centre, but the player's melee cast only started when the target centre was within m.radius + 30 (no body radii), and the hit circle was m.radius + e.r (no player radius). Big enemies could hit you before you could cast or reach them.
- Fix (combat.js): the melee hit circle is m.radius + pl.r x CONTACT.hit (the enemy's body is already added by queryCircle), and the cast trigger for melee is that same reach with the target's radius. Holds for any m.radius >= 0.3 x (e.r + pl.r) (all authored melee moves, radius 44+). Other kinds untouched.

## 2026-10-19, Status Slice D2: flinch [Jess decided, branch feature/status-sliceD]
- Flinch from the PokeAPI chance already on the move (Rock Slide 30, Bite 30, Dark Pulse 20; the bulk import will add more). One roll per move per target per 0.5 s (the same gap as ailments and stat drops), so a multi-pellet cast or a tick-kind move is one roll.
- EVERYONE is unrestricted (Jess): wild units, elites, bosses and gym leaders can all flinch, with no window and no lockout. My earlier boss exemption and 3 s limit are dropped (Jess had already declined blanket boss immunity). Frozen or asleep units cannot flinch (they have no action to lose). Co-op copies are skipped (deferred).
- Lost action: a boss or gym cast in progress is cancelled and its next-attack timer restarts as after a normal cast (gym: gymCd and gymRestore); a boss between casts has its timer restarted; a charger's aim or dash is cancelled; a ranged unit's shot timer restarts at its full period; the contact-hit timer restarts (0.55 s). Zones already on the ground are NOT cancelled (the same parked gap as freeze).
- Recoil (Jess's addition): if the unit was moving, it goes BACK (opposite its heading) half its sprite radius at 2.0x its plain speed, then has zero move speed for 0.2 to 0.3 s (random). A unit that was NOT moving gets no recoil but freezes the same 0.2 to 0.3 s (Jess: yes, they freeze too). The contact-hit timer restarts at 0.55 s and does not start counting down until the flinch (recoil and freeze) is over (Jess). Speed used is the plain movement speed (after stages, slow and paralysis) at the moment before the flinch, not a dash or charge speed.
- Ranged shot timers (distance-keepers' special shot and the support weak shot) now ALSO wait out the flinch (Jess 2026-10-20, "Yes. I agree"). Not changed: boss and gym attack timers and the healer's heal timer keep running (a boss or gym cast in progress is cancelled and restarts anyway).
- A wild melee unit's lost action is small (the contact timer is only 0.55 s), so for them the felt effect is the recoil, the freeze and the contact timer starting only after it (about 0.75 to 0.85 s without a contact hit in total); the big effect is on casters, ranged units and gym leaders.

## 2026-10-19, Status Slice D1: stat stages [Jess decided, branch feature/status-sliceD]
- Mainline stat STAGES (-6 to +6, multipliers x0.25 .. x4) for Attack, Defense, Sp. Atk, Sp. Def and Speed, on wild enemies, elites, bosses and gym leaders (G.Stages, js/systems/stages.js). Accuracy and evasion are skipped. Each application lasts 6 s on its own timer (Jess: 'Let's do 6'; the 12 s in BOSS-REWORK 3c was an inherited placeholder, longer than every other effect). The stage is the sum of the live applications, clamped to +-6. No separate floor for bosses and gym leaders (the -3 idea is dropped, 6 s makes it redundant).
- Wired stat drops: Bubble, Bubble Beam, Mud Shot, Bulldoze lower Speed by 1; Psychic, Bug Buzz, Shadow Ball, Flash Cannon lower Sp. Def by 1 (move field `stage: { stat, n }` plus the PokeAPI statChance already in the catalogue). One roll per move per target per 0.5 s (the ailment roll gap); every success is a new application, with NO lockout (Jess: the only lockouts are the freeze and sleep windows; my 2 s per-move lockout was an invention and is removed). Result: 100% moves (Mud Shot, Bulldoze) reach the -6 cap in about 3 s of contact and hold it; 10% moves hold about -1.2 on average, Shadow Ball (20%) about -2.4.
- Where a stage is read: the defender's Def or SpD in the player's damage ratio (applyDamage takes a defMul; status-category moves ignore it), the attacker's Atk or SpA in a gym leader's move factor, and enemy movement (the Speed stage multiplies the FINAL movement speed, x0.25 at -6 to x4 at +6, for every species; it is not bound by the 0.5x to 3.0x species-identity shaping and multiplies with paralysis and trap).
- Not in D1 (deferred to Slice E with the player-stage decision): moves that change the USER's own stats (Leaf Storm, Metal Claw, Meteor Mash have the data but no effect), and the player's own buff moves (Harden, Swords Dance, Agility stay on pl.buffs: auto-cast Harden as stages would reach +6 in about 5 s).
- Gym leaders' buff casts are stages now: +stageN per cast (default 1; Swords Dance and Agility carry stageN 2) on the move's stat (the player's 'spd' buff is Speed), each application lasting the move's dur, stage cap = the move's stacks (max 6). The old flat 7%-per-stack cut (Enemy.defCut, addBuff, buffTick) is deleted. JESS RULED 2026-10-19: leave Brock's Geodude and his Harden as is, no stage cap ('he's fine'; the simulated figures are worst case, since the real Geodude picks Harden by weight among Tackle and Rock Throw). Figures for the record: in the offline 60 s fight Brock's Harden sits at +1 for 28 s, +2 for 9 s, +3 for 3 s and +4 for 5 s (average damage taken x0.68, peaks x0.5 to x0.33) versus the old flat -42% maximum; a stage cap on the authored move stays available as a knob if a feel test says otherwise.
- RULING (Jess 2026-10-19, after Claude had mixed the species Speed shaping into stages): Speed stages are a buff and debuff on the final movement speed, independent of the species-identity bounds. If a unit gets to -6, that is x0.25 (and trap or paralysis multiply on top); no combined floor. Consequence to watch: Mud Shot and Bulldoze pin a crowd at x0.25 within about 3 s of contact, and Sp. Def drops are now stronger (-1 is damage x1.5, -2 is x2; Psychic-type 10% moves hold about -1.2, Shadow Ball about -2.4).
- PROPOSED, not built (D2 to D4, as discussed 2026-10-19): flinch cancels a wild enemy's wind-up or delays its next action about 0.6 s (bosses, elites and gym leaders ignore it); drain heals 50% of damage dealt, capped per cast at a percent of max HP; crit stage maps to 12.5% / 50% / 100% on top of the crit card (no 1/24 base); multi-hit is a rolled pellet count (2 to 5, mainline weights) with total damage fixed at per-hit Power x 3.1.

## 2026-10-19, Team screen: fullscreen party editor on the home menu [Jess decided]
- The six roster cards on the home screen are gone. A `Team` item sits right under Play and opens a fullscreen screen (scr-roster, no topbar): the six slots on the left, the Pokedex filters and grid in the middle, the selected Pokemon on the right (stat hexagon, an Ability line stubbed as 'Coming soon', its moves as a scrollable two-column list). Bottom bar: Back and Commit Team. No held item, no All Boxes or Search.
- It edits a COPY of the team. Nothing is saved until Commit Team (which sets team, partner and partnerShiny like the old commit did); Back discards, and asks first only when there are unsaved edits.
- Three ways to place a Pokemon in the highlighted slot (Jess: allow all three): the 'Put in Slot N' button on the detail card, a double-click on the list cell, or dragging the cell onto any slot. Dragging a team card onto another slot swaps them. Rules kept from before: a Pokemon already on the team swaps with the target slot, Slot 1 can never be empty, only owned Pokemon can be placed, non-lead slots get 'Remove from team'.
- The Pokedex (menu item Pokemon) is now strictly browse-only: pick mode, the pick banner, Commit to Roster and Remove from Roster there are deleted. The Team screen has its own filter state, separate from the Pokedex's. Shared code: the filter bar and grid in menu.js take a view (element-id prefix, filter state, team, selection).
- Touch: HTML5 drag and drop does not fire on touch screens, so the button is the touch path (touch layout stacks the three columns, not tested on a device).

## 2026-10-19, Status Slice C: control statuses on one shared engine [Jess decided]
- One status engine (G.Status) for enemies, elites, bosses, gym leaders and the player; the player is a host in Slice C, so no separate boss or player status system.
- Only one major status at a time: burn, poison (toxic), paralysis, sleep, freeze. Confusion and trap are not major and stack on top.
- Bosses, elites, gym leaders AND the player: freeze and sleep last 25% as long, then a 10 s no-reapply window (prevents infinite stun-lock). Paralysis, slow, trap and confusion work at full strength.
- Freeze 2 s (wild: then a 4 s refreeze window; Fire hit thaws it, never the same instant; Ice immune). Sleep 2-6 s, damage never wakes. Paralysis 10 s, x0.5 movement, 25% of attacks fizzle, Electric immune. Confusion 2-8 s, wander + 50% fizzle. Trap: own state, 1/16 max HP per 2 s turn for 4 turns, x0.25 movement, Ghost immune. A turn is 2 s.
- Trapped and paralysed enemies still attack. Frozen and sleeping ones do not move or attack.
- Fire Spin is a trap (no longer rides on burn); Lick paralyzes for real; the Ailment Chance card works on every wired ailment.
- Slice E keeps: player status sources, cures, the Status support class, drowsy, daze, haste aura, HUD icons beyond the minimal chips, co-op sync.
Add a dated entry whenever a durable decision is made.

---

## 2026-10-19, Brock pilot gym BUILT [Jess, branch feature/boss-rework]
- First gym end to end: gate at 4:00 (level = run-time level then + 4, locked at spawn, shown on the gate), rock arena (the rift arena reused), Geodude with Tackle / Rock Throw / Harden from js/data/gyms.js, badge package on a win. New files js/data/gyms.js, js/systems/gym.js.
- Jess's calls: the badge run boost is a STUB for now (item, level, Bond and full team revive are real); the pilot fight targets about 60 s of focused fire (HP from the elite reference model with TTK 60, not yet feel-tested).
- A team wipe in a gym ends the run (game.js: the arena no longer throws you back for gyms). No arena timer; the enrage starts 120 s after the first hit (damage x1.0 to x2.0 over 30 s). Fury stays off for gyms.
- Random legendary rifts are OFF (RANDOM_RIFTS = false in rift.js). The next elite comes 2:00 after returning from a gate (Elites.afterGate), none while one is alive.
- Gym leaders use the PLAYER's version of each move (Jess, 2026-10-19): Tackle has the player's radius and arc and the same slash visual; Rock Throw has the player's speed, size, life, spread, pierce and projectile visuals; Harden is the player's Harden (7% damage cut per stack, 5 stacks, 7 s shared timer). Only the damage is different: the enemy ratio path with the catalog Power and category (stats.js enemyAttackFactor takes power and cat). A 0.3 to 0.45 s wind-up (Charge animation plus a ring) telegraphs every move, with the aim locked at its start.
- GYM MOVES CARRY UPGRADE STACKS (Jess's call, 2026-10-19): a leader's move is a player move plus authored upgrade-card stacks (`stacks: { mechanicId: n }` on the move line in js/data/gyms.js), applied through the same G.Moves.addStack rules as the player's cards, so Effect adds Power, Count adds projectiles, Recharge shortens the cooldown, Area/Arc/Size/Speed/Duration/Buff Stacks work as they do for the player. The leader's moves also get STAB on its own types. Without stacks a leader was only a stat level-up and felt harmless. The validator rejects a stack the real rules would refuse.
- Gym tuning knobs (2026-10-19): each signature may carry power (damage multiplier) and tempo (attack-rate multiplier), default 1, valid in (0, 5]. They are the answer to 'a lone leader is not a threat' without changing the player's move stats. Brock starts at power 2, tempo 1.4 (TUNE).
- Stat stages are NOT built (they were dropped for the pilot because Harden stays the player's version); they stay in BOSS-REWORK 3c for Slice D.
- Boss forms built: melee = the player's cone swing, projectile (and any kind without a form yet) = the player's projectile, buff = the player's buff cast. The rest of the kinds come with the roster slice.

## 2026-10-19, Overworld Elites BUILT (first slice of the boss rework) [Jess approved the three defaults, branch feature/boss-rework]
- Built to the locked design in BOSS-REWORK.md section 2. An elite is a regular (non-boss) wild Enemy with an `elite` descriptor on a copy of the def, so it reuses wild AI and the ratio damage path. New file js/systems/elites.js (G.Elites).
- Temporary cadence until gyms exist: first elite at 2:00, then every 6:00, one alive at a time. Arceus's Judgment is unhooked (ENABLED = false in judgment.js, nothing else removed yet). Enrage: damage x1.0 to x2.0 over 30 s, starting 60 s after the first hit; no speed bonus.
- BOSS_SLOTS no longer spawns anything (the data stays until the cleanup list). The 25% boss-fight spawn rule is gone; the wild cap and rate are 50% for 60 s after an elite spawns, then ramp back over 30 s.
- Density Bonus replaces the crowd bump: XP only, x1.6 while 54 or more are alive, from 180 s. The XP boost, its banner and the opening HP discount share G.Stats.XP_BOOST_END = 180.
- levelForTime now takes an optional gym-complete argument; it still clamps at L50 past 30:00 (the post-gym ramp is TBD).
- Elite kills still count as boss kills for missions and achievements (progress.js), so those do not go dead while gyms are unbuilt.

## 2026-10-19, Boss rework design: gyms, elites, region completion [Jess + Claude, DESIGN ONLY, branch feature/boss-rework, nothing built]
- Flow: the three old boss systems are replaced. (1) Rifts with legendaries are replaced by GYM fights: a gate on the map leads to a type-matched arena, against that gym leader's signature Pokemon, in the mainline order of the chosen region (Kanto: Brock rock / Geodude, Misty water / Staryu, Lt. Surge electric / Voltorb, and so on). (2) The five BOSS_SLOTS bosses are replaced by overworld ELITES (level offset +1 or +2, sized up). (3) The Arceus fight (judgment.js) is removed entirely.
- Region Complete = finishing the region's main story, as an ORDERED ENCOUNTER LIST stored per region (not a hardcoded 8 + 4, since Alola has no gyms and Galar has no Elite Four). Kanto: 8 gyms then the Elite Four (Champion not decided, adding one later is just another list entry). Target: all 8 gyms done by the 30:00 mark; the Elite Four come after it and are the endgame.
- Gym level = run-time level at the fight + 4, sized up. Species do NOT carry the threat, the +4 offset and the tier table do. Signature Pokemon use HAND-AUTHORED REAL MOVES (real power, type, category, damage via the A/D ratio), not the wild AI and not the old slam / dash / leap + type-picked ranged template.
- Elites: while an elite is alive, wild spawn is halved (replaces the old boss-fight 25% rule). Elites and gym tier values live in one TIER TABLE (level offset, size, HP multiplier, move power rules).
- Badges (gym win): a run-long boost, a guaranteed item, a guaranteed level, a Bond, and a full team revive to 100% HP (fainted members included).
- Death commits EVs and progress (unchanged). Return Home on Region Complete pays a completion bonus. Keep Going (restart the gym roster; each gym fields its first two signatures at once; a bonus per loop) is DEFERRED to its own branch feature/continue-option.
- Level beyond L50 at 30:00 (linear to exponential ramp) stays DEFERRED. Until then the level clamps at L50 and the Elite Four sit on the clamp plus their offset.
- Legendaries return as something else, to be designed later. Do NOT delete the legendary flags, data or rift code in the cleanup; unhook rift spawning only.
- SUPERSEDED: the 'PHASE 2' post-30-minute-boss spec in the 2026-10-17 difficulty entry (Standard Run / Unlock Safeties choice after the Arceus fight). Arceus is gone, so the Region Complete choice replaces it. The linear-to-L50 phase 1 stands.
- OPEN (not decided): gate schedule and elite cadence; arena visuals per type; badge boost definitions (mainline-accurate per region or uniform stat bumps); what a 'Bond' badge reward means until the Bond rework decides; Elite Four rewards; the authored-moves data format; how move Kinds (projectile / zone / beam) translate into telegraphed boss attacks; stat-stage and status moves on bosses (wait for status slices C and D); how multiple casting bosses avoid stacked telegraphs (continue-option).
- Build order: (1) tier table plus elites on the wild ratio path plus the halved spawn; (2) boss HP and size; (3) ONE pilot gym end to end (gate, arena, Brock with authored moves, badge package); (4) Kanto roster; (5) Region Complete and Return Home; (6) cleanup of Arceus and rift spawning.

## 2026-10-19 (late morning, addendum) [Jess, design only]
- A gym's level locks when its gate spawns and is shown on the gate. Elites continue through the Elite Four phase (one elite 2:00 after each return from any gate, none while one is alive). Elite Four give the badge package without the guaranteed full revive.

## 2026-10-19 (midday, gym rules) [Jess]
- Pilot gym is Brock with Geodude only (Tackle, Rock Throw, Harden). Gym failure = the run ends (death is death, commits EVs and progress); the original rift 'spit out at 35% health' is not used. No arena timer; the gym boss enrages 120 s after engagement (TUNE). Type chart untouched for now.

## 2026-10-19 (midday, addendum) [Jess]
- Mainline stat STAGES adopted (-6 to +6, mainline multiplier table, fixed duration per application, TUNE). Boss fury phase is OFF for now.
- Fact: Harden's cooldown is hand-tuned (0.85 s), not PP-derived. Only damaging moves use cd = 0.5 x 35 / PP. Status move cooldowns under stages are a Slice D question.

## 2026-10-19 (midday), Status phasing and DoT on base HP [Jess, design only, tracker: BOSS-REWORK.md 3c]
- Boss status phasing approved: the pilot gym uses damage moves and Harden only; a minimal player status core comes before Gym 3; control statuses and the rest wait for Slice C, which is promoted to right after the pilot.
- DoT percentages (burn, poison, Toxic) apply to the target's base HP, before the tier HP multiplier. Bosses are NOT given blanket status immunity; hard CC and paralysis on bosses and elites are decided in Slice C.
- Stat stages (mainline table, -6 to +6) proposed for all stat buffs and debuffs; awaiting Jess's confirmation.

## 2026-10-19 (late morning), Run flow, Elite Four phase, Return Home, Density Bonus [Jess, design only, tracker: BOSS-REWORK.md sections 1, 2 and 4]
- Run flow: under 30:00 enemy level is linear L1 to L50; from 30:00 it is clamped at L50 until all gyms are beaten; then the slow ramp starts (linear into exponential, math TBD) and the Elite Four phase begins.
- Elite Four phase: all four gates open at once when the player returns from Gym 8, spread out and off screen from each other; gate and direction arrow show the level. Elite Four levels are hard-set per encounter, not time-based, so the player picks the order by difficulty.
- Region Complete = all 8 gym leaders and all 4 Elite Four. Return Home bonus multiplier rises for a total time under 60 min and falls over 90 min. Keep Going (deferred): XP, damage and HP multipliers all go up.
- Density Bonus (the renamed crowd bump) is XP only (x1.6 at 54+ alive, from 180 s). The damage half is dropped. The XP boost, its banner and the opening HP discount read a shared run-time constant (180 s).

## 2026-10-19 (end of morning), Enemy level curve, Density Bonus, run-time constant [Jess, design only, tracker: BOSS-REWORK.md]
- Enemy level: linear L1 to L50 over 0 to 30:00, then clamped at L50 until the region's gym list is complete, then a slow ramp (DEFERRED numbers). levelForTime must take the gym-list completion time as an input, not just the clock. This corrects my earlier note that the post-30 ramp was load-bearing: it only starts after Gym 8, so it affects the Elite Four phase and Keep Going, not the main run. The 'Phase 2' wording in the 2026-10-17 entry stays superseded.
- The crowd bump is KEPT after all, renamed DENSITY BONUS (reverses the 'removed entirely' line above). Open: XP only (recommended) or XP and damage.
- The 3:00 XP boost, its banner and the opening enemy HP discount read a shared run-time constant (XP_BOOST_END = 180 s) instead of BOSS_SLOTS[0].at. No behavior change.

## 2026-10-19 (later still), Gym timing, elite XP and the crowd bump [Jess, design only, tracker: BOSS-REWORK.md]
- Gym timing: Option A. Gym 1 at 4:00, each later gym 4:00 after the previous one is beaten and the player is back on the map. The 'all 8 gyms by 30:00' target is dropped (Gym 8 lands at about 39 to 46 min). The post-30 level ramp stays deferred but becomes the next load-bearing item, since enemy level sits on the L50 clamp afterwards.
- Elite XP = wild yield x the elite's HP multiplier x 1.2.
- The crowd bump (x1.25 damage, x1.6 XP at 54+ alive; DECISIONS 2026-10-18 'elite gate') is REMOVED ENTIRELY, no rename. Supersedes that entry. Needs a constant for the 180 s XP boost and opening HP discount window (both currently read BOSS_SLOTS[0].at).

## 2026-10-19 (later), Overworld Elites LOCKED [Jess, design only, tracker: BOSS-REWORK.md section 2]
- Elites have NO level offset (+1/+2 levels is only +14% stats at L10, +6% at L30). Species region accurate, one BST tier above the highest active wild tier, sized up (0.5 steps, 1.5x to 2x), with an HP multiplier and a power multiplier. HP multiplier is set by a 20 to 30 s focused-fire time-to-kill, not hand-typed. This lifts the 2026-10-18 note that an elite should not be an HP multiplier (that note was about the crowd bump).
- Engagement (first player hit) starts a 60 s timer, then the elite ENRAGES (damage multiplier ramps, maybe move speed).
- On spawn: wild cap 50% (32 of 64) and wild spawn rate halved for 60 s, then ramps back to normal; time-based from the spawn so the swarm cannot be held down by leaving an elite alive. Excess wild units walk off screen and are deleted.
- Cadence: first elite at 2:00, then 2:00 after each return from a gym. Reward: XP, a chance at an item, a guaranteed Berry.
- Gyms: Gym 1 spawns at 4:00, each later gym 4:00 after the previous one is beaten and the player is back on the map. FLAGGED: this puts Gym 8 at 32:00 at the very earliest and about 39 to 46 min in practice, so 'all 8 by 30:00' does not hold. Needs a ruling (BOSS-REWORK.md section 7).
- The crowd bump (x1.25 damage, x1.6 XP at 54+ alive) is renamed SWARM BONUS.

## 2026-10-17, Massive density is a FEATURE, not a thing to budget down (design north star)
Jess's explicit goal: the game should deliver "holy f*** I've got 200 mon after me / ME TOO / SHIT
ONLY 200?!" chaos. Absurd on-screen density IS the identity, not a problem to tame. So wherever earlier
notes say "co-op entity budget" / "cap the horde to keep it cheap/sane", reinterpret: entity count is a
FIXED REQUIREMENT to design AROUND, not a knob to shrink. Do NOT nerf the horde to fit a cheap server
or to hit a frame target by subtraction. Instead preserve the carnage and pay for it / engineer for it:
  - Keep density maximal; solve performance with the levers that DON'T reduce monster count:
    (1) server tick 30Hz + client interpolation (halves server CPU, horde unchanged, looks 60fps);
    (2) interest management / culling (server simulates the full horde but only SYNCS each client what's
        near them — keeps bandwidth sane without thinning the swarm);
    (3) spatial-grid / object-pool / draw-batching optimization on the hot path;
    (4) stronger hardware (dedicated-Ryzen VPS) and/or fewer rooms per core — buy capacity, don't cut mobs.
  - Consequence for MP sizing: a maximal-density room has a HIGHER T (sim ms/tick), so expect maybe 1-2
    rooms per dedicated-Ryzen core at 60Hz rather than 5 — and that is a GOOD trade (1-2 rooms of true
    carnage at ~€3-6/mo). Scale by adding cores, not by shrinking hordes.
  - The ONE exception where reducing entities is still legit: a genuine FEEL failure (unreadable screen,
    framerate COLLAPSE e.g. 60->22fps) per the existing performance-stance ruling. Even then, prefer
    readability fixes (culling, visual clarity) over simply spawning fewer enemies.
This supersedes any earlier phrasing that implied trimming entity counts for tidiness/cost as the
default. Default = keep the horde huge; optimize and pay around it.

## 2026-10-17, HP scalars and damage scalars are ORTHOGONAL dials (move-power migration note)
Mental model to avoid re-tuning the wrong thing. There are three independent scalars:
  (1) HP_SCALAR = 2.0  -> multiplies the HP formula. SHARED by player AND enemy HP (G.Stats.hpForLevel).
      Its job is HP consistency (a base-65 player and base-65 enemy have identical HP). Nothing to do
      with damage.
  (2) DMG_SCALAR = 2.0 -> multiplies player->enemy DAMAGE (the A/D ratio, sub-slice B). A damage dial.
  (3) (future) an enemy->player damage scalar when sub-slice C lands (may reuse DMG_SCALAR or get its own).
RULE: move "Power" (m.dmg) is a DAMAGE-side term. Changing it (e.g. the planned migration to canonical
mainline move powers) touches ONLY the damage dial, never HP. So:
  - Migrating move power does NOT require re-solving enemy HP (or player HP, or HP_SCALAR). HP is a
    separate formula; power never enters it. Jess's instinct confirmed, but the reason is "power is a
    damage term, HP is its own formula" -- NOT "player and enemy share the HP scalar" (that shared
    scalar is about HP consistency, unrelated to power).
  - What DOES need re-solving after a power migration: the PLAYER DMG_SCALAR, re-centered once so the
    naked baseline still lands in the target hits-to-kill band (~3-4 early, playtest-confirmed) against
    the UNCHANGED enemy HP curve. Think: Power = relative balance BETWEEN moves; DMG_SCALAR = overall
    damage LEVEL. Orthogonal.
  - When sub-slice C lands, its enemy-damage scalar is solved against PLAYER HP (also unchanged). Same
    mirror logic: HP untouched, tune the damage dial.
Canonical-power migration consequence for C: if enemies also draw canonical move power (the planned
full-learnset system), the enemy-"Power" question (flat vs per-behavior vs signature) largely dissolves
-- both sides use real move powers. So do NOT hand-tune throwaway per-behavior enemy Power constants for
C; either build C AFTER the canonical-power migration, or use an explicitly-temporary flat placeholder.
Also at migration time: review the global `m.dmg = Math.round(m.dmg * 1.2)` baseline bump and the fork's
current ~13-18 power scale vs canonical ~40-150 (median 80) -- it is a scale change, re-solve DMG_SCALAR
once, do not mix the two scales.

## 2026-10-17, Local-first scope
Build and perfect the LOCAL single-player game before any cloud/online work. Deferred until Jess
explicitly switches phase: Firebase (auth, Firestore, RTDB, cloud saves), Cloudflare TURN worker,
and the entire multiplayer/co-op/networking stack (js/net/: social, net, coop, ranking, signups),
plus friends, rooms, online leaderboards. Multiplayer is tied to the cloud work and deferred with it.

## 2026-10-17, English-native development
Jess develops in English, not Spanish. Author all new user-facing strings directly in English.
Inherited Spanish string literals stay as-is (they are the runtime i18n keys via lang-en.js). Do
NOT add lang-en.js entries or Spanish translations for our own new strings. New features render
English-only, and that is intended. Jess is not maintaining the Spanish side.

## 2026-10-17, Edit boundary (propose-first vs free-edit)
Dividing line: "does this change what the game does when you run it?"
- Yes (game code, js/data/*.js, dev.html, build config, assets): PROPOSE-first; on Jess's approval the assistant applies the edit itself (CLAUDE.md governs; Jess does not hand-edit code).
- No (Markdown project docs: CONTEXT/DEVLOG/DECISIONS/BALANCE/TODO/ISSUES): assistant edits directly.
Note: js/data/*.js looks like docs but IS game data (the game loads it), so it is propose-first.

## 2026-10-17, Git execution
The AI assistant never runs git, ever. It provides commands and strategy only; Jess runs all git himself.

## 2026-10-17, Docs portability
All project docs live in-repo (not in a tool's private memory) so git pull carries them to Claude
Desktop at home. The repo is the single shared source of truth between the two tools.

## 2026-10-17, Remote visibility via local checkout (not a GitHub connector)
There is no GitHub connector available, and GitHub's dynamic pages (commits, branches, issues, PRs)
are JS-rendered and cannot be fetched reliably even though the repo (Jess-Rivera/pokesurvivor_fork)
is public (only the static landing page / README fetches). So the bridge between work and home stays
the LOCAL CHECKOUT: when the agent needs to see remote state, Jess pulls or checks out the branch
locally and the agent reads the working tree and git metadata directly. This does not change the Git
rule (Jess still runs all git himself) or the local-first scope.

## 2026-10-17, Source-only repo: gitignore the build output (Option A)
Decision: do NOT version-control generated build output. Jess runs the game locally via dev.html and
only builds (`node tools/build.js`) when he is ready to publish to a host (chosen later). GitHub Pages
is explicitly NOT used ("i dont want Pages"). So the three generated files are now gitignored:
index.html, js/app.min.js, version.json (tools/cache/ was already ignored). They are regenerated at
publish time, not tracked. To stop tracking the already-committed copies, Jess runs (git is his):
  git rm --cached index.html js/app.min.js version.json
This removes them from tracking but keeps them on disk. Rationale: generated artifacts cause pointless
merge conflicts (minified/obfuscated output cannot be meaningfully merged); keeping source-only is the
cleaner practice and ends that friction. If Jess later hosts somewhere that needs committed build
output (e.g. GitHub Pages serving files directly), revisit, the better path then is a CI build step.

## 2026-10-17, SEO/publishing pipeline is inherited and dormant
tools/export_data.js and tools/make_seo_pages.py are the ORIGINAL owner's SEO/publishing pipeline
(generate text pages from game data so a canvas game is crawlable; hardcoded to pokesurvivor.com and
the original repo JPTER78/pokesurvivor). Jess has never run them and only runs `node tools/build.js`.
They stay dormant and untouched until Jess picks a host and decides on public discoverability, at which
point the hardcoded URLs would need rewriting. Their output (tools/cache/gamedata.json and the es/en
SEO page folders) is not maintained by us.

## 2026-10-17, Base-stats model: Speed is identity (fixed), the other five scale with run level
Core rule for the base-stats implementation (see docs/stat-model-design-notes.md for the full analysis):
- The other five stats (HP, Atk, Def, SpA, SpD) scale with the player's IN-RUN LEVEL via the mainline
  formula (level plays the role of the Pokemon's level), so you get stronger as a run progresses. That
  IS the survivor-like power-fantasy ramp.
- SPEED is the deliberate exception: movement reflects the species' Speed IDENTITY and is constant
  within a run (the identity ratio r = Speed/Speed_median cancels level). It changes ONLY via items or
  upgrades (spdMul, Agility-type buffs, liquid/weather), never from leveling up mid-run. Rationale:
  movement that climbs with level would wreck control feel and readability and blur each mon's Speed
  identity.
- Consequence: Speed is also the one stat SHAPED by the transfer function g(r) (bounds 0.25x-2.0x) from
  day one; the other five start raw (single fallback bounding point at the damage site if raw feels bad).
- First coding slice: Speed stat -> movement px/s. 1.0x movement = ~107 px/s (median species; verified
  median base Speed = 65, see below). IV/EV are in the mainline formula but FIXED AT 0 this slice and
  NOT stored (deferred, see the IV/EV ruling below). No save change in slice 1.

## 2026-10-17, Performance stance
Vision first, trim fat later. Ignore small per-frame millisecond differences at this stage. BUT a
visible framerate collapse (e.g. 60fps to ~22fps at high enemy density) is a FEEL problem and is
addressed immediately, not deferred.

## 2026-10-17, Damage model: mainline formula + a single survivor scalar
Player->enemy damage uses the real mainline damage formula, tuned toward survivor feel by ONE scalar:
    base = ((2*L/5 + 2) * Power * (Atk/Def)) / 50 + 2, then * STAB(1.5) * type * crit * SCALAR
    SCALAR = 2.0 (locked).
- L = attacker level (player's in-run level). Atk/Def are the real base stats scaled to level via the
  mainline statValue formula: physical moves use Atk(stats[1]) vs enemy Def(stats[2]); special moves use
  SpA(stats[3]) vs enemy SpD(stats[4]). Category comes from move.cat (sub-slice A) via G.Stats.moveCat.
- STAB = 1.5x when the move type matches one of the active fighter's species types.
- Player Atk/SpA scale with in-run level (like HP); this is required for the ratio to stay proportional.
- Implementation is split (attacker half at cast, defender half at impact) but is mathematically identical
  to the single formula; the +2 stays after the division and before the STAB/type/crit/scalar multipliers.

## 2026-10-17, The naked base-stat layer is intentionally upgrade-dependent (do not "fix" the ramp)
With base stats only (no upgrades), hits-to-kill a common enemy RAMPS over a run (~3 hits early -> ~12 by
30 min at scalar 2.0). This is BY DESIGN, not a balance bug. Root cause is structural and known: enemy HP
grows ~10.4x over a run while mainline damage grows ~2.6x, so the naked line cannot keep pace on its own.
In a survivor-like it is not supposed to: the power fantasy comes from the upgrade stack (level-up draft,
move upgrades, crit, items), which multiplies damage on top of this baseline and fills the headroom. If a
future session sees the naked ramp and is tempted to rebalance base stats to flatten it, DON'T, that would
leave no room for upgrades to matter. The base layer's only job is a sane early hit-count (~2-4) with a
moderate ramp. Tune the upgrade systems to fill the gap, not the base stats to erase it.

## 2026-10-17, changelog.js is a free-edit exception
js/data/changelog.js is the ONE js/data/*.js file exempt from propose-and-approve: it is purely
informational patch notes and does not affect mechanics, so the agent edits it directly without
approval (like the Markdown project docs). Caveat: it IS parsed as JS, so the agent must verify it
still parses after editing (balanced quotes/brackets/commas), since a syntax error there breaks the
bundle. Every other js/data/*.js stays propose-and-approve.

## 2026-10-17, Enemy HP model: mainline formula, two-phase difficulty
Enemy HP uses the SAME mainline formula + 2.0x scalar as the player (HP = (floor(2*baseHP*L/100)
+ L + 10) * 2.0), from the enemy's REAL base HP (stats[0]). This retires the old enemy HP model
(tier.hp flat templates, the baseHp() reverse-derivation `(p.hp-70)/0.45`, and scale(t).hp). The
tier SYSTEM stays for spawn variety/pacing/behaviors/cast selection; only the HP computation moves
to the formula. Levels may exceed mainline 100 (survivor-like); the formula still holds.

Difficulty is two-phase, gated by the planned 30-minute boss:
- PHASE 1 (0-30 min), BUILD NOW: enemy level grows LINEARLY from L1 (0:00) to L50 (30:00). i.e.
  level(t) = 1 + 49 * clamp(t/1800, 0, 1). HP follows via the formula. (Base-65 enemy: ~24 HP at
  start, ~124 HP at 30 min.)
- PHASE 2 (post-30-min), SPEC ONLY until the 30-min boss exists: beating the 30-min boss presents a
  choice:
    * [Standard Run]: a FIXED accelerating ramp (the level-growth slope steepens on a schedule, e.g.
      every 15 min). Predictable, never reactive. Pure skill race.
    * [Unlock Safeties]: "safeties off" (like a safety catch released, NOT a safety net) - enemies
      scale UP to the player's performance (DDA), with boosted rewards (exp, gold, tickets, items) as
      the risk payoff. Opt-in + rewarded, so it does NOT violate the power-fantasy (the player CHOSE
      the danger for loot; genre-legit like VS Curse / Brotato Danger).
      DDA signal: a BLEND (to be finalized when built) of player level-vs-expected, kill rate, and
      HP comfort margin. Composite with tunable weights.
  Phase 2 depends on the 30-min boss (planned, not built) and a reward-multiplier system (not built),
  so it is captured here as design and built when the boss lands.

## 2026-10-17, IV/EV deferred pending a persistent-storage design
Slice 1 (Speed -> movement) does NOT read or store IV/EV. They are part of the mainline stat formula
(statValue takes iv/ev params) but are fixed at 0 for now. Reason: IV/EV need a proper per-species
persistent-storage design (how they are earned/trained, how they are keyed and saved, likely alongside
pbind/pban/pupg which key by dex), and that deserves its own slice rather than bolting an all-zero map
onto the save now. No save-schema change was made for IV/EV this slice, so slice 1 is fully save-safe.
When training/EV is designed, that slice adds the storage + migration.

## 2026-10-17, Stat formulas centralized in G.Stats (js/core/stats.js)
All base-stats formulas live in ONE module, G.Stats (js/core/stats.js): the mainline statValue, HP
(hpForLevel), Speed identity (speedToPx/moveTransfer), the enemy levelForTime curve, the tunable
constants, and scaffold stubs for Attack/Defense/SpA/SpD. Both the player and enemies call G.Stats.*;
neither keeps its own copy. Rule going forward: new combat-stat formulas (and any retuning of
constants like HP_SCALAR or SPEED_MEDIAN) happen in G.Stats, not duplicated per entity. stats.js must
load after core/util.js (listed right after util in dev.html and as 'Stats' in main.js NEED).

## 2026-10-17, Enemy Speed = fixed species identity (matches the player)
Enemy speed now uses the same Speed-identity model as the player (G.Stats.speedToPx from the enemy's
real base Speed stat[5]), fixed per species, same px/s scale as the player, with NO in-run time ramp
(the old sc.spd = 1 + t/1400 enemy speed-up is removed). Supersedes the pre-identity enemy speed
(tier.spd x spdK reverse-derivation). Difficulty comes from HP/damage/density, not creeping enemy
speed. Exceptions kept: bosses retain their own spd path (out of scope); the 'runner' behavior keeps
its x1.6 (it is a behavior archetype, not a base-stat multiplier).

## 2026-10-18 — Swap rule decided (Jess)
- Every slotted move runs its own independent cooldown, active or not. Only the active group fires. The 35% incoming-wait cap in setActive is removed (it was the swap exploit).
- A short hold after swapping stops instant back-and-forth swapping (swap-in fires immediately); length is a constant (proposed 0.4 s hold after swapping before you may swap again; the new move fires at once). Built as fix/attack-calc slice 3c.
- Bond is reworked in its own branch: Slot Compression + Synergy (TODO Backlog). The old "fire several moves at once" role is gone once cooldowns are independent.

## 2026-10-18, Upgrade rework (in-run): Jess's rulings so far (design talk, NO code yet)
- Move Evolutions are REMOVED entirely. Touches: moves.js (EVO, EVO_MODS, evoInfo, evolve, NEED_NAME), levelup.js (evo card, guaranteed slot), run-ui.js and hud.js (gold styling), combat.js ghostCast flag, achievements (evo1, evo25, evoAll), missions (evolve, wevolve), progress.js 'evolve' event, SEO text. Old save fields (db.js evoMoves, stats.evolutions) stay dormant; null-check wherever unlocked achievement ids are read. Coop `evolved` wire field untouched (MP deferred).
- The old in-run stat cards are REMOVED entirely (Jess: "all the old stat upgrade cards"): Vigor, Potencia (Power), Carrera (Sprint), Reflejos (Reflexes), Coraza (Armor), Sintesis (Synthesis), Iman (Magnet), Aprendizaje (Learning), Baya Zidra (Sitrus Berry). OPEN: confirm the utility ones (cooldown, regen, pickup radius, XP, heal) are gone for good and where those concepts live afterward.
- Model (PoE2 style), three pools: (1) STAT = (Base + flat), where flat is IV + EV (+ meta-progression later); the stat formula's ev slot already exists, 0 today. (2) The six stat cards are their own INCREASE group on top of that stat, additive within the group. (3) Type / move-Kind INCREASE group: "Fire moves +x% damage", "Projectile moves +x%", also stat-scoped by Pokemon type ("Grass Pokemon +x% HP"). Groups multiply each other. "More" multipliers already exist as separate factors (move ladder steps, STAB, crit, type chart).
- In-run upgrades are PERCENTAGE ONLY for now. Jess may add an in-run FLAT increase later in the run (note: a flat added to the base term is multiplied by every increase group, so it is worth more than its face value).
- Card unit is a percent of the final stat (not EV-style points), because mainline EV math scales with level/100 and would be worthless in the first minutes. Additive stacking within a group keeps the worst case linear (about +390% if all ~49 picks went into one stat), so no hard cap at first; check G.Log.pacing() and cap only if needed.
- Slice order: (1) delete evolutions + old stat cards, (2) the pipeline + six stat cards + scoped cards (needs more design talk), (3) the pause/inspect screen (TABLED behind this; its yellow layer becomes literal once cards are real stat increases).
- Deferred: meta-progression upgrades (separate later branch). Flat meta layer (EV) is about +30% on a base-100 stat at any level, larger for low-base stats.
- 2026-10-18 (later), Jess's rulings on the open questions: (1) picks are PER-POKEMON (benched lag handled later). (2) ALL "increased damage" sources are SUMMED in one additive pool (Type, Kind and any other damage % together). (3) Scoped cards are offered only when they apply (you own a matching move, or the Pokemon has the type). (4) Tiers: a flat-valued card with meta-progression unlocking extra tiers is the likely direction; DEFERRED until the base pool works. (5) Card draw is BY FAMILY (pick the family, then the card within it), so catalogue size does not skew odds. (6) The utility cards (cooldown, regen, pickup radius, XP, heal; the original author's) are gone for good.
- 2026-10-18 (later), new direction: MOVE MECHANIC cards replace the fixed per-kind ladders and the utility cards. A mechanic card (cooldown, projectile +1, projectile speed, range, arc width, etc.) applies to a move that actually has that mechanic. Open: targeted (choose the move) vs broadcast, how the card shows its target, per-move damage, value pricing across mechanics, stack caps. See the next DECISIONS entry once settled.
- 2026-10-18 (later still), Jess's rulings on mechanic cards: (a) Targeting is THREE STEPS: pick the card, then the POKEMON (any team member, not only the active one; Pokemon with no eligible target are dimmed), then the MOVE (ineligible moves dimmed). This amends "picks are per-pokemon (active only)": picks go to a chosen Pokemon, which also removes the benched-lag problem. (b) There is a generic "+X% Increased Effect" mechanic: damage moves gain damage, heal moves gain healing, etc. (keyed on the move's Payload axis in docs/move_kind_rules.xlsx). (c) Three value classes (DPS, coverage, utility) accepted. (d) Rate mechanics (recharge, fire rate, speeds) are ADDITIVE "increased rate": rate = base x (1 + sum). (e) Moves have NO level; they hold any number of upgrades ("Ember: +45 projectiles, +150% damage, +200% splash, ..." is intended). (f) Balance is NOT a goal for every pick: "+1 projectile" may simply be the best choice. (g) The upgrade system is designed around the target move system in docs/move_kind_rules.xlsx (19 kinds; the "Allowed flags" column is each kind's mechanic menu).
- 2026-10-18 (clarifications, Jess): (1) docs/move_kind_rules.xlsx is a WIP, not all-encompassing, so the mechanic catalogue must be a flexible data table, not hard-wired to it. (2) Mechanic cards are MOVE-SPECIFIC: Card -> eligible Pokemon -> eligible move. FAINTED team members stay eligible (a revive mechanic is deferred). Any step with exactly one choice AUTO-ADVANCES but is still SHOWN: the Pokemon-select screen pops up, flashes a highlight on the only eligible Pokemon, then moves on to the move step. (3) Unlimited upgrades is the point. Framerate collapse at END GAME from a stacked build is INTENDED; collapse in a normal-length game is not. Engineering limits get a separate look later. Meaningless ceilings (arc already 360, etc.) make a card INELIGIBLE (dimmed and flagged), same as no-target.
- 2026-10-18 (Jess): ALL upgrade cards that touch moves are MOVE-SPECIFIC, including the Type and Kind scoped ones ("Fire moves +x%" means: a card whose eligibility is Fire moves, applied to ONE chosen move). The broadcast reading (apply to every matching move of that Pokemon) is NOT used for now; revisit if per-move feels bad. First catalogue is scoped from the moves currently in the game (text, weights, tiers after slice 1).

## 2026-10-18, Status rework slice A APPLIED (burn + poison on enemies) [Jess approved the plan, branch feature/status-dot]
- Source of truth, checked in pokeapi-master: PokeAPI holds each move's ailment, ailment_chance and min/max turns (our moves already carry the chances), plus prose that corroborates some fractions (Poison Heal heals 1/8 in place of poison damage including bad poison; Wrap 1/16 for 2-5 turns; Leech Seed 1/8; Toxic min/max turns 15, the escalation cap; Toxic Spikes: a second layer badly poisons). It has NO battle-engine table: burn 1/16, poison 1/8, Toxic N/16 and the type immunities are mainline game knowledge, not read from the repo. Its prose is not flawless (Black Sludge says 1/8 and 1/16).
- DoT is a fraction of the enemy's MAX HP per turn. ONE state per status, a re-hit only refreshes the duration (and never resets the tick timer). Stacks are gone: Jess caught that a cap of 8 balanced nothing (8 poison stacks x 1/8 = 100% per turn). Poison level 2 = badly poisoned (Toxic, Toxic Spikes, the poison trap).
- Turn length starts at 2 s per status (a table row each, G.Enemies.STATUS). Faithful anchor 0.5 s (Tackle, PP 35); 2 s is a 4x discount because DoT hits a crowd with no aiming. Duration counted in ticks: burn 4, poison 4, Toxic 8 (a Toxic row of 4 would never kill; at 8 it kills at tick 6).
- Type immunities in (Jess): Fire vs burn, Poison and Steel vs poison and Toxic. Fire Spin (ailment trap) rides on the burn flag and bypasses the Fire immunity until slice C gives trap its own state.
- Chance: rolled at the two applyBurn/applyPoison call sites in combat.js (procAilments). Status-category moves always apply. Jess agreed tick-kind moves roll at most once per 0.5 s per target; built as a general rule (any move, any target, 0.5 s), which also makes a 7-pellet cast ONE roll instead of seven.
- Bosses and rift legendaries: no special case (the boss rework owns them). Co-op: the roll happens before the call, so the wire is unchanged (remote copies still send 'b' and 'p', now with 1 or 2). MP stays deferred.
- Data changes: Toxic poison 1 -> 2 (moves.js), poison trap applyPoison(5) -> applyPoison(2) (interact.js). Logger: DOT lines show % of max HP (record field F[o+6]). Dev helper G.Debug.ignite(kind, radius) (flags the run as tampered).
- Verified: docs/proposals/status-sliceA-harness.js passes against the real stats, enemies, moves, enemy and combat files (tick math for all three states, refresh, immunities, 40,000-trial chance rolls, throttle, Fire Spin bypass, logger line). NOT run in a browser; the live game loop and drawing are untested.

## 2026-10-18, Status rework slice B APPLIED (Ailment Chance card, DoT follows the damage pool, sheet line) [Jess approved the plan]
- Rulings (Jess): the card step is +10 POINTS per stack ("what do you mean by points": percentage points added flat to the chance; Ember 10% > 20% > ... > 100% in 9 stacks); DoT follows the damage pool (yes); no Duration or Potency cards in this slice (DoT strength already rides the damage pool, tick count stays a STATUS table knob until a playtest shows a need).
- New mechanic 'ailchance' (DPS family, mode add, step 10, key `ailmentChance`, clamped to 100 in derive). Eligible only on non-status moves with a live burn or poison flag and a chance of 1 to 99 (6 moves: Ember, Flamethrower, Heat Wave, Flame Wheel, Sludge, Poison Sting). Dimmed with a reason otherwise: Always applies (Will-O-Wisp, Toxic, Toxic Spikes), Chance is already 100% (Fire Spin), Ailment not in the game yet (the 9 paralysis, freeze and confusion moves), Has no ailment (everything else, buffs included). Card text "+10 points Burn Chance" / "+10 points Poison Chance"; preview "10% to 20%".
- `ailmentChance` is now a key in G.Kinds (pushed onto every damage kind, since procAilments rolls on every hit of every damage kind) and in the key vocabulary. procAilments already read `m.ailmentChance` from the live move, so the engine needed nothing else.
- DoT multiplier = G.Moves.dotMul(m) = current Power / base Power of the source move (status moves and unknown sources 1.0). combat.js procAilments passes it to applyBurn(lv, ignoreImmune, mul) and applyPoison(lv, mul); an enemy keeps the strongest multiplier while its state lasts (burnMul, poisonMul), a fresh state takes its own. Co-op wire unchanged (remote copies send the status without the multiplier; MP deferred).
- Sheet: every move with a live ailment shows one line (G.Mechanics.ailmentText, built from the live move), for example "Burn chance 10% per hit: 6.3% max HP every 2 s, 4 times" (wording from Jess: STATUS chance XX% per hit); in Apply mode the line shows the after-state of the selected move. Status moves read "chance always" and Toxic and Toxic Spikes "Bad poison chance always: 6.3% max HP, rising by 6.3% every 2 s, up to 8 times". CSS `.sh-move .ail`.
- Verified: docs/proposals/status-sliceB-harness.js passes against the real files (eligibility for all 64 moves with reasons, 9 and 7 stack caps, clamp, texts and previews, independence from the damage cards and order independence, 40,000-trial rolls with stacks, DoT multiplier through the real Enemy ticks including the strongest-source rule, sheet text); the slice 2b, 2c and A harnesses still pass. The slice 2a harness cannot load any more, because its stub G has no G.U.TYPE_COLOR (needed by the scoped cards since 2c); that predates slice B and was left alone. NOT run in a browser: the sheet screen (layout, the new line) and the level-up card are untested live.

## 2026-10-19, Badge boosts and the gym reward (feature/boss-rework) [Jess decided]
- Each gym badge carries a run-long team stat boost; Boulder Badge = +10% Attack for the whole team (all roster members). Stored in Player.badge, separate from stat cards, read through incOf().
- The gym leader drops no XP. The win is a toast plus an automatic level bump (guaranteed level, normal level-up cards still open). Item, coins, Bond and full revive unchanged.
- Gym leaders move at their species speed with no modifiers (Jess, 2026-10-19): no 1.1x chase bonus, no 0.55x circling (boss code kept for non-gym bosses); standing still while casting stays.

## 2026-10-20, Item rework: three-tier model (feature/items) [Jess decided in the design talk; build NOT started]
- Supersedes the earlier "one held item per run" model and the same-day consumable-slot idea. Three tiers, split by where the item lives and how it reaches the player.
- GROUND ITEMS: activate automatically on contact (like today's heal berry pickup). Mostly heal berries and battle items from PokeAPI. Never stored, no inventory.
- POKEMON ITEMS: each Pokemon holds ONE. Passive (Choice Band, Choice Scarf, Eviolite, Expert Belt, Iron Ball and so on) or triggered, and a triggered item may be consumable (used up, slot empties) or not.
- INVENTORY ITEMS (run items): very rare, custom items that change a whole run. Sources: rare boss drops, or meta progression and the gacha. Held in a 2x2 grid (4 slots total). The full game starts at ONE slot and meta progression unlocks more.
- Run item examples (Jess): a Stone per type (Lightning Stone: Electric attacks ignore resistance to Electric); Sharp Scissors (movement speed rises the less total team HP is left); Round Glasses (crit chance can exceed 100%; a crit on a move whose chance is over 100% re-casts it 0.2 s later for free with the chance reduced by 100 points, so 150% becomes a 50% repeat).
- Data note (checked in pokeapi-master): 175 items are flagged holdable and 141 holdable-active; the holdable-passive flag has ZERO rows, so passive versus triggered must come from our own rules table (like move_kind_rules), not from PokeAPI. Category ids give the families (berries, held-items, type-enhancement, plates, choice, stat-boosts, status-cures, healing).
- OPEN (asked of Jess): exact reading of Round Glasses' repeat chain; Stone behaviour against immunity (not only resistance) and its dependence on the still-softened type chart; Sharp Scissors curve and cap; how a Pokemon item reaches a holder (active Pokemon default?); whether held effects run while benched; where Lucky Egg and Amulet Coin land; drop table per source; whether gacha-owned run items are equipped before a run or only found in-run; pickup behaviour when a Pokemon already holds something.

- RULINGS 2026-10-20 (later, Jess answered the open questions): (1) a found Pokemon item goes to the ACTIVE Pokemon; reassignment happens on the team sheet; a swap prompt appears if the holder already carries one. (2) Held effects work ONLY while the holder is the active Pokemon (no benched effects). (3) Lucky Egg and Amulet Coin move to the INVENTORY tier (very rare); a new account may get one or the other for free at start. (4) Drop tiers agreed: ground items from common drops and chests; Pokemon items from chests, elites (the 50% roll) and the gym guaranteed item; run items from a rare gym or boss chance plus the gacha. (5) Gacha run items are managed on an Inventory screen (pre-run loadout), a LATER slice, not part of the framework slice.
- STILL OPEN: Stone vs immunity and the chart dependency, Sharp Scissors curve and cap, Round Glasses repeat-chain reading, TypeScript check experiment (offered, not answered).
