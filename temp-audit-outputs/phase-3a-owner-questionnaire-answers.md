# Phase 3A: Owner Answers to Questionnaire

These are my hand written decisions on all questions from Phase 3A Questionnaire.

---

## A. Documentation Model

### QA-00. Which tree is the documentation baseline? (carried over unchanged from OD-01)

As of writing this answer, I am on a branch `chore/documentation-authority-audit` cut from `feature-test/new-move-schema`. My plan is to complete the entire audit/consolidation and then merge back into `feature-test/new-move-schema` prior to continuing any work on the actual project.
This means we will conduct the entire plan for the temp-audit-output prior to doing any code.

### QA-01. What is DECISIONS.md for?

I like the recommended path and have a suggested exampled format below. This is purely example and does not reflect actual status of anything.

#### Decision Name

- **Status:** [Approved|Proposed]
- **Date**: DDMMMYYYY
- **Decision:** [One sentence description of the decision]
- **Rationale:** [One sentence reason for decision]
- **Canonical:** `<path>:<section>:<linenumber>`
- **History:** [One to three sentences for context.]

### QA-02. What is GDD.md now? (replaces OD-02)

I agree with the recommended.

### QA-03. Create one new document, docs/COMBAT-RULES.md?

I agreed with the recommendation of the new document `docs/COMBAT-RULES.md`.

### QA-04. Where do per-move intended behaviors live?

I agree we need a per-move table, but combat-validation-and-handoff.md is
already 299 lines / 32kb, and the table grows with every new ruling. I'd
rather create `docs/MOVE-INTENT.md` than enlarge and rename that file.

Conditions:

- Scope: only moves that need specific disambiguation, keyed by move ID. Examples (not all inclusive since some decisions are made elsewhere) are the current moves in `docs/current feature planning/combat-validation-and-handoff.md`:Section2.5 that you referenced, that are migrated to the new doc.
- Moves that don't need specific disambiguation can remain solely in the json data file to be generated into the js file.
- A specific move ruling in `docs/MOVE-INTENT.md` overrides general rules.
- State whether the existing intent scenarios in the handoff doc migrate
  or stay and are linked.
- State precedence against COMBAT-RULES.md (move-specific ruling vs.
  general rule).

### QA-05. Move-schema decisions: absorb into the specs now (replaces OD-06)

Why would we not just fix everything now, then follow up with updating the slice md's? As in QA-00, I want to complete the consolidation first, even if that requires updating slice-n.md's and slice-*-handoffs.md's.

### QA-06. BOSS-REWORK.md becomes the progression and encounters spec only

I agree with the recommendation. BOSS-REWORK.md looks like it was a planning document that parts of it have gone stale. `BOSS-REWORK.md` was my planning phase, `docs/BOSS-AUTHORING.md` was my template set-up, and `docs/GYM-ROSTERS.md` was the culmination to get region 1 established.

I do want to eventually (at a later date and separate organization branch) organize further by changing `docs/GYM-ROSTERS.md` to specific `BOSS-REWORK-GYM-ROSTERS-KANTO.md` so that it doesn't grow too long as I add the other regions. Rename `docs/BOSS-AUTHORING.md` to `docs/BOSS-REWORK-AUTHORING.md`. Then move `BOSS-REWORK.md` into docs/ so that they all live together. This will allow all Boss Rework information to follow the plan document and the template document.

---

## B. Approval provenance

### QA-07. Ratify historical approvals in bulk? (replaces OD-07)

Tag consolidated groups specs as [Approved].

---

## C. Gameplay and architecture decisions

### QA-08. What happens after 30:00 and after the region is complete? (merges OD-03 question 4 and OD-04)

Those five are all part of the "same idea" family. Here is the full loop as it stands in my head:

1. Game begins at Loop[1].
2. Enemy level scales by time. L1 at t[0:00] advancing in level every 37secs.
    a. Gyms appearing modify this growth.
3. Elite enemies spawn at t[+2:00] from the last <eliteTrigger>.
    a. <eliteTrigger> is defined as game start or Gym Spawn.
4. Gyms spawn at t[+4:00] from the last <gymTrigger>.
    a. <gymTrigger> is defined as game start or last Gym Spawn.
    b. An Escalation period activates at t[+0:37] from Gym Spawn.
        1. This Escalation raises both the wild spawn level and the gym leader's locked level by +1, uncapped.
        2. Escalation Level Bump are temporary. Once a gym is beaten, the Escalation Level Bump is removed and wild enemies return to L(n) set by game time.
    c. Gyms will use a number of hand-authored boss pokemon from the `docs/GYM-ROSTERS.md`.
        1. A gym will spawn pokemon from the leader's roster equal to Loop[N] such that on Loop[N] a gym will spawn pokemon from Slots[1] to Slot[Loop[N]]. (e.g. on loop 1, the gym will spawn the first pokemon in the roster and on loop 3 it will spawn the first 3 pokemon in the roster and on loop 6 it will spawn all 6 pokemon in the roster)
5. Once all 8 Gyms are defeated, a "boss" arena dependent on the region will take the Gyms place. e.g. In Kanto region, after defeating the 8th gym, the first of the Elite Four will spawn at the normal next Gym Spawn time, otherwise following all rules from Gym Spawns.
    a. This will continue until the 4th Elite Four is defeated.
6. Upon defeating the fourth Elite Four, the player will be given the option ["Return Home"|"Next Region"|"Unlock Safeties"].
    a. Return Home returns the player to the main menu with a completion bonus to their rewards.
    b. Next Region will take the player to the next region map. That region map will have its game time set to the end time of the previous region and the player will be able to continue playing with their team and all its upgrades.
    c. Unlock Safeties will keep the player on the same region map and continue the game timer. This will set the Loop to Loop[N+1]. They will then go through the Gym Spawn/Post Gym Boss run as above.
        1. At the end of each loop after Loop[1], the player will be presented with ["Return Home"|"Keep Going"].
            a. Return Home will operate as above, with an escalating bonus per loop completion.
            b. Keep Going will follow the "Unlock Safeties" as above.
        2. Once a player has beaten the final Post Gym Boss on Loop[6] AND they have completed all previous Loop[N] during this same run, they will be presented with a choice of a "Legendary Boss".
            a. This will take the player to a unique arena to fight a Legendary Pokemon of the region. If they beat the boss, the Legendary Pokemon is added to the player's pokedex as an available selection for future runs on their team.
            b. If the player fails to beat the Legendary Boss, they are returned to the Main Menu with a Loop[6] completion bonus.
    d. Subsequent runs in the region will allow a player to choose a Loop[N] value, with the game time starting at t[0:00] regardless of Loop[N] chosen.
        a. NOTE: The Legendary Boss fight is only present if the player completes Loop[1] through Loop[6] in a single playthrough. No return to main menu's.
7. Upon Defeating all Legendary Bosses in each Region, the player will be informed that "Arceus awaits."
    a. This unlocks a new feature called "The Climb".
        1. The Climb is a playthrough in which you fight through each region through all 6 Loops. This must be done on a single team.
            a. Once a team is selected for "The Climb" they are locked in. Changing any team member for "The Climb" erases all progress.
            b. The Climb aquires a completion point when a player completes a Loop[1] through Loop[6] run in a region. Once the final (9th) completion point is obtained, the player is teleported to the Arceus arena where they fight a unique hand-authored encounter.
            c. Upon beating Arceus the player is awarded the ability to have a "Descendant Mutation"
                1. A "Descendant Mutation" allows a single pokemon on the team to add the moves it currently knows to a pokemon not on the team. That unique copy of the descendant pokemon will have all moves added to it's move pool for subsequent runs.

### QA-09. (merged into QA-08; number kept free so Phase 3 cross-references stay readable)

### QA-10. Trap and Fire Spin on enemies

**Fire Spin**: I'm not sure how Fire Spin ended up where it is. But mainline Fire Spin says "Fire Spin inflicts damage on the first turn then traps the opponent, causing them to lose 1⁄8 of their maximum HP after each turn, for 4-5 turns. If the user holds a Grip Claw, the after-effects last for 7 turns. If a Binding Band is held, the damage is 1⁄6 of the target's maximum HP."
Fire Spin will apply Burn and Trap (per the newest decision on the status). It doesn't strip.
**Trap**: Agree with the recommended (Q5: 2 s on wild enemies, 25% plus 10 s window on strong hosts ). This is a status not a move though, so it will need to go into an appropriate file.

### QA-11. Stat stage rules: confirm the layering

I agree with the recommended, I believe. Just to clarify though:

Base Layer: The Stat Stage Ladder as the multiplier rule for every host. It defines how stat stages work and what happens at each stage. The maximum Stat Stage value can never exceed 6 for any single attribute.
Operational Layer: Each move has its per-move maxStacks as a way to cap a single move from taking a player or enemy to +6 or -6 too quickly. This is a balancing aspect.
Upgrade Layer: As a self-buff move duration and cooldown is upgraded, the maxStacks for that move is also such that `maxStacks = min(rounddown(duration / cooldown),6)`.

This applies to all Stat Stages. Yes, this is a change to current stat stage mechanics. All moves will have a default maxStacks of 1 unless that move specifies otherwise.

### QA-12. Type chart: current versus intended

I agree with the recommended.

### QA-13. How will gyms and enemies use moves after slice 7?

Option (a) pending import of supporting moves for the pokemon listed in `docs/GYM-ROSTERS.md`. This will be it's own branch. We will complete `chore/document-authority-audit`, merge to `feature-test//new-move-schema`. Once all 63 original game moves are udpated to the new move schema, we will merge `feature-test//new-move-schema` to `main` and create a new branch (name to be determined) to imoprt all new moves required by the pokemon in `docs/GYM-ROSTERS.md` for Region 1 Kanto.
Under the new Gym system, the boss pokemon will be hand authored with their move sets and appropriate upgrades just like a player has moves and upgrades.

### QA-14. Audit enemies, upgrades and items content before consolidating them?

Agree with the recommendation. I have just been on this move-schema feature and importing and testing branch for so long. I feel like we're nearly done and can go back to gameplay soon.

---

## D. Agent rules

### QA-15. Agent rules live only in CLAUDE.md (merges OD-05 and parts of OD-11)

I confirm all 5 rules as proposed. Quick can be told to load CLAUDE.md so no need for the pointer.

---

## E. Routine consolidation (one blanket approval requested)

Yes to Section E.
