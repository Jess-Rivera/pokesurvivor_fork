# RUN ITEM THINK DOC (F3c brainstorm + spec, 2026-10-21)

Working doc for the RUN tier of the item rework (feature/items, F3c). Run items are team-wide and
run-long: on()/off() apply to EVERY roster member (G.Game.equipRun), they are very rare, and they are
meant to be run-defining, not small stat trims. The full game starts at ONE inventory slot; meta
progression unlocks up to 4 (2x2 grid). Nothing here is built yet. This is design, not a commitment.

Rulings already recorded (DECISIONS 2026-10-20) carry over. This doc gathers everything in one place and
adds the Power Stone set plus a brainstorm so we can pick a tight starter set (1 slot = every item must
earn its place).

Legend: HOOK = where it plugs in (existing field or new). RARITY = rough. OPEN = needs a decision.

---

## Already built (run tier)
- Lucky Egg: +30% experience (xpMul). A new account may start with this or Amulet Coin.
- Amulet Coin: +50% PokeCoins at end of run (coinMul).

---

## 1. Power Stones (per-type set, NEW)

One Stone per type. A Stone makes that type's moves IGNORE the softened type chart's reductions:
resisted (x0.6) and immune (x0.3) matchups floor to at least neutral (x1.0); super-effective (x1.6)
still applies. Mirrors the Lightning Stone ruling (ignore resistance AND immunity for its type).

- HOOK: new team field pl.stoneType (set by on(), cleared by off(), like pl.typeBoost). Read in
  combat.js typeK(): `const k = (pl.stoneType === move.type) ? Math.max(1, mult) : mult`. One conditional,
  handles resistance and immunity together (both are just <1.0 in the softened chart).
- MUTUAL EXCLUSION (Jess, 2026-10-21): you may only ever hold ONE Power Stone in the inventory, of any
  type (not one of each). Implement as a `group: 'stone'` tag on all 18; the Inventory/offer logic
  refuses a second item whose group is already held. Needs F3d Inventory/offer code to enforce (the F1
  framework only has a placeholder "prompt against the last item" today).
- RARITY: rare. One Stone defines a run around a single attacking type.
- NAMING: custom per-type set (mainline "stones" are evolution items and do not cover all 18 types).
  Proposal: "<Type> Stone" with evocative names where the literal type word is awkward. Lightning Stone
  (electric) is Jess's name (mainline Thunder Stone). Draft: Flame/Wave/Lightning/Leaf/Frost/Fist/Venom/
  Earth/Gale/Mind/Bug?/Rock/Spirit/Dragon/Shadow/Steel/Fae/Normal? (BIKESHED, finalize at build).
- OPEN:
  - Does a Stone also override a BOSS's hard immunity once the canonical type chart + boss-immunity rule
    go live? (Today the chart is still softened, nothing is truly x0.) Leaning yes (that is the Stone's
    whole point), but it interacts with the unsettled boss-immunity rule.
  - Normal and the typeless cases: a Normal Stone only matters where Normal is resisted (Rock/Steel) or
    immune (Ghost). Fine, just low-impact.
  - Per-hit floor interaction: combat.js has a Math.max(1, raw) per-hit floor already; confirm the Stone
    floor at x1.0 composes correctly with it (should, since x1.0 >= any floor).

---

## 2. The three custom items (Jess's originals, specced in DECISIONS 2026-10-20)

### Sharp Scissors
- EFFECT: team MOVEMENT SPEED scales linearly from 1.0x at 100% team HP to 2.0x at 1% team HP.
- HOOK: a speed multiplier applied LAST in the speed chain (player.js get spd), reading team HP fraction.
  No damage interaction. Cleanest of the three.
- OPEN: cap (is 2.0x the hard ceiling?), and whether it reads active-Pokemon HP or summed team HP.

### Round Glasses
- EFFECT: crit chance may exceed 100%; a crit on a move whose chance is over 100% re-casts the move
  0.2s later for free with the chance reduced by 100 points (150% -> a 50% repeat). Chains.
- HOOK: lets critChance exceed 1.0 (today isCrit compares to <1.0, fine). On a crit where critOf > 1.0,
  schedule a free re-cast after 0.2s at (chance - 1.0). Needs a small re-cast scheduler (per active move).
- DAMAGE-ADJACENT: touches the crit path. Shares a scheduler with any "echo/second cast" brainstorm item.
- OPEN: exact chain reading (at 250%: one guaranteed repeat then a 50% repeat? or?), whether the re-cast
  itself rolls crit, and interaction with Scope Lens/Razor Claw/Lansat crit sources.

### Power Stones
- See section 1 (Lightning Stone generalized to all 18 types).

---

## 3. Brainstorm: survivor-style run items (NOT yet chosen)

Grouped by the classic survivor-like roles. Each line: name, effect, HOOK, note.

### Economy / scaling
- Hoarder's Charm: +coins and +drop rate, but enemies have slightly more HP (greed tax).
  HOOK: coinMul + G.Grounds.dropRate + enemy maxHp mult. RARITY: mid.
- Snowball Badge: every kill adds a tiny PERMANENT damage stack for the rest of the run (ramps late).
  HOOK: atkMul accrues on kill (G.Progress or die()). The signature survivor power-curve item. RARITY: rare.

### Risk / reward (Brotato-style)
- Glass Cannon Lens: +40% damage, but you take +25% damage.
  HOOK: atkMul up + dmgReduce negative (or an incoming-damage mult). RARITY: mid.
- Berserker's Band: team DAMAGE rises as team HP drops (damage mirror of Sharp Scissors' speed).
  HOOK: atkMul scales inverse to team HP fraction. RARITY: mid. Note: pairs with Sharp Scissors (speed + damage both ramp as HP drops).
- Last Stand: when a Pokemon faints, the team gets a burst of damage + speed for ~10s.
  HOOK: on-faint team timed buff (stgTeam). RARITY: mid.

### Build-defining
- Twin Cast: your active move occasionally fires a second time for free (echo).
  HOOK: a re-cast roll (shares Round Glasses' scheduler). RARITY: rare. Strong, tune the chance low.
- Magnet Core: much bigger pickup/magnet radius + XP (play greedy and mobile).
  HOOK: pl.magnet mult + xpMul. RARITY: mid.
- Glass Orbit: all projectiles pierce +1 but fire slightly slower.
  HOOK: a team pierce add + cd mult at cast. RARITY: mid.

### Defensive / sustain
- Second Wind (adapts Sacred Ash): one team-wide revive per run.
  HOOK: on-death-once, revive the team (game.js reviveTeam exists for gyms). RARITY: rare.
- Ward Stone (adapts Full Heal): team immune to ONE status (picked), or status duration halved.
  HOOK: status-apply guard (status.js), like the berry bag but permanent and single-status. RARITY: mid.
- Thorn Aura (team Rocky Helmet): a contact-damage ring around the active Pokemon, always on.
  HOOK: reuse the rockyhelmet reaction site, run-wide. RARITY: mid.

### Chaos / fun
- Gacha Dice: each level-up offers one EXTRA card choice, but one option is always random junk.
  HOOK: card-offer count +1 with a forced random pick (upgrade offer code). RARITY: mid.
- Type Chaos: your move's type randomizes each cast (may hit super-effective or resisted).
  HOOK: random type per cast at the hit site. RARITY: rare/novelty. Hilarious with a Power Stone.

---

## 4. Recommended tight starter set (for the 1-slot early game)
Every run item should be run-defining since you usually hold ONE. Proposal:
- The 3 customs: Sharp Scissors, Round Glasses, one Power Stone (the whole 18-Stone family counts as the
  "pick your type" option, gated to one by the exclusion rule).
- Snowball Badge (the signature survivor ramp).
- One risk item: Glass Cannon Lens OR Berserker's Band.
- One safety item: Second Wind.
Skip vitamin-style "+5% of a stat" filler: too small to matter at 1 slot. More items matter once meta
progression unlocks slots 2 to 4.

## 5. Build order note
Two of the customs touch the damage/crit path (Power Stones -> typeK; Round Glasses -> crit + re-cast).
Consider centralizing the held-item/run-item damage layer (the Risk 2 refactor) BEFORE building these so
they slot into one pipeline instead of more scattered hit-site conditionals. Sharp Scissors (speed-only)
and the economy/sustain items are independent of that.

## 6. Open design questions (consolidated)
- Power Stone vs boss immunity once the canonical chart lands; Stone naming set.
- Round Glasses chain reading + whether the re-cast crits + crit-source interaction.
- Sharp Scissors cap and team-HP vs active-HP reading.
- How many run items in the first shipped set (recommend the tight set above).
- Whether any run items are offered in-run vs only equipped pre-run from the gacha (F3d Inventory).
