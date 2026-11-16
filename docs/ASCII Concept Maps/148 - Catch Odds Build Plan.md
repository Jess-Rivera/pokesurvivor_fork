# 148 - Catch Odds Build Plan

Issue #148. Status: **built 2026-11-16**, waiting on Jess's feel test. Calls 1, 2 and 4 as picked; call 3: separate rolls plus the honest wobble count (Jess). Opening agreed 2026-11-16 (goal, done, test:
`148 - Catch Odds Slice Opening.md` section 1). Rulings: decision 2026-11-16-148-catch-odds-mainline-shake-formula.
Formula: `pokeball-math-human-made.txt`, step 1 flipped to time used. Coding principles applied (plan check, section 5).

## 1. Shape

```mermaid
flowchart LR
  D["pokedex.js<br/>+ capture rate per species"] --> O
  R["rescue result<br/>time left"] --> S
  W["World Level (HUD's number)<br/>badges this run<br/>species in Pokedex"] --> S["catch session<br/>snapshot at the catch's start"]
  S --> O["G.Catch.odds(session, ball)<br/>one pure function"]
  O --> UI["catch screen band"]
  O --> T["throw: one roll"]
  O --> H["harness 6a"]
```

## 2. The parts

| # | Part | Files | What changes |
|---|---|---|---|
| 1 | Capture rate data | tools/add_base_stats.py, js/data/pokedex.js | The script that already adds base stats and base experience from the local pokeapi CSVs also adds each species' capture rate (pokemon_species.csv), as a short field next to them, plus a header note. Run once; nothing else in pokedex.js changes. |
| 2 | The formula | js/systems/catch.js | The star bands, the BST helper, the base odds function and the 90% ceiling go. In their place: Jess's tables (badge caps, the over-cap penalty, the star multipliers) and named constants (fight length 60, the 255 rate cap, the World Level bonus, the 31-species critical start and the critical steps) in the file's frozen table. One odds function reads a catch's snapshot and a ball and returns the chance one throw catches it, critical catch included (the critical part is a sure catch, the rest must pass three shakes). |
| 3 | The snapshot | js/systems/catch.js | When a catch opens, the session also records the World Level (the same whole number the HUD shows), the run's badge count and the number of species in the Pokedex record. The odds read only the session, so the harness can hand them any case. |
| 4 | Callers | js/ui/catch-ui.js (1 line), tools/smoke-ui.js (1 line) | They pass the session instead of its dex and time. The screen's band is unchanged and still holds the true chance. |
| 5 | The check | docs/proposals/rescue-harness.js part 6a | Rewritten in place to the relations in the slice opening section 4, plus: every rescuable species has a capture rate from 1 to 255. The ball order and Timer Ball checks are marked blocked on #137 (only the Poke Ball exists). 6b, 6c, 6d unchanged. |
| 6 | Docs at close | catch.js header, BALANCE.md (a catch odds line), 136b plan's "Catch rate today" (points here), STATE, DEVLOG, #148 comment | The header states the formula and cites the decision. |

## 3. Calls for Jess

| # | Call | My pick |
|---|---|---|
| 1 | Your file computes in whole numbers scaled by 4096 with integer roots (mainline style). Plain decimals give the same odds to within a tenth of a point and read far simpler. | Decimals (KISS). The txt file stays the reference. |
| 2 | "Species in Dex" for the critical catch = species marked owned in your Pokedex record (save.owned), counted across all runs. | Yes |
| 3 | One roll per throw against the combined chance, or a separate critical roll then three shake rolls? Same odds either way; separate rolls only matter if the screen shows shakes or a "critical!" moment, which nothing draws yet. | One roll now; split when a shake animation is wanted |
| 4 | Badges this run (the gym list resets per run). Your cap table runs to 12 badges; Kanto has 8 gyms, so the 9 to 12 entries wait for the Elite Four. | This run's badges, table kept whole |

## Built differently from the plan

| What | Why |
|---|---|
| js/ui/catch-ui.js grew past one line: the wobble plays once per passed shake (half the wobble strip each, alternating sides, 60 ms frames), none when it breaks out at once, one on a critical, with a "Critical catch!" note | Call 3 (Jess): separate rolls plus the honest wobble count |
| G.Catch.lastThrow ({ critical, shakes, caught }) holds the last roll; throwBall still returns its word | Keeps every caller and the harness's outcome checks unchanged |
| Critical chance = rate x multiplier / 6, out of 256 (mainline) | The txt's step 7 divides two 4096-scaled numbers by 24576 only, which leaves it 4096 times too big (every throw would be critical from 31 species) |
| Harness 6a also checks the early World Level bonus exists and is gone from WL 13 | A mutant that removed the bonus passed "a lower World Level never lowers the odds" |

## 4. Not built (YAGNI)

| Left out | Where it goes |
|---|---|
| Great, Ultra, Timer, Heavy balls and weight data | #137 (the decision records the Timer Ball rule) |
| The other special balls (fishing, night, gender, sleep, level) | A new issue, filed with #137 |
| Shake animation or a critical catch moment on screen | Not filed; ask when the screen wants it |
| A fallback capture rate in code | None: the harness proves every rescuable species has one |

## 5. Plan check (coding principles)

| Part | Reuses | New | Lives in, why | Size |
|---|---|---|---|---|
| 1 | add_base_stats.py's CSV reading and in-place patch | One field and its note | The data script that already owns pokeapi additions | pokedex.js +1 short field per species |
| 2 | catch.js's frozen K table and BALLS table | The cap, penalty and star tables; one odds function | catch.js owns every catch rule | catch.js about 215 to 245 lines |
| 3 | G.Enemies.levelForTime (the HUD's World Level), G.Gym.badges, the Pokedex record | Three session fields | The session already snapshots the catch | small |
| 4 | Existing calls | none | | 2 lines |
| 5 | Part 6a's loop over the rescue pool | Relation checks only | The existing harness, no new one | 6a about the same length |

Touched-code cleanups: none beyond removing the replaced band code. Save: no new save fields (the session is not saved).
