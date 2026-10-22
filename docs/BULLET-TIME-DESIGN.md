# BULLET-TIME DESIGN (feature, NOT built, 2026-10-21)

A speed-reactive world time-dilation so a hugely-buffed fast Pokemon (Regieleki + Agility +6 +
items, which can reach ~3,400 px/s, ~32x median) stays controllable without capping its speed.
Above a threshold, excess speed bleeds into slowing the WHOLE world, so the fast mon moves fast
relative to a slowed world (classic bullet-time). MOVE_MAX stays 3 (we do NOT raise the ceiling;
bullet-time handles the top end instead).

Status: prototyped on refactor/damage-layer, then REVERTED so the refactor branch stays pure. Build
this on its own branch (feature/bullet-time). The code below is the working prototype, ready to re-apply.

## Why this is cheap locally
game.js already has a global time scale: `const dt = Math.min(1/30, real) * speedK`. Every system
multiplies by this dt, and the PLAYER's own movement uses the same dt (`this.x += this.svx * dt`).
So lowering speedK slows everything including the player, but a Mach-9 player still crosses ground
fast while normal-speed enemies/projectiles crawl. speedK currently exists only for debug slow-mo
(G.Game.debugSpeed, video recording).

## The curve (modeled, Jess reviewed)
speedK = clamp(BT_THRESHOLD / playerPx, BT_FLOOR, 1), applied only when playerPx > BT_THRESHOLD.
Recommended: BT_THRESHOLD = 250 px/s, BT_FLOOR = 0.35.
- 245 px/s (base Regieleki): speedK 1.0, NO dilation (picking the fast mon is not punished).
- 490: speedK 0.51, effective 250 (world at half speed).
- 978 (Agility +6): speedK 0.35 floor, effective ~342.
- 3,433 (full stack): speedK 0.35 floor, effective ~1,202 (vs an uncontrollable 3,433 raw).
Threshold 250 chosen over 215 so base Regieleki (245) gets zero dilation; only BUFFED speed dilates.
FLOOR 0.35 caps how slow the world gets (lower = more control at the extreme but a sluggish world).
Both are constants, tune by feel.

## DECISION (Jess, 2026-10-21): the run clock stays REAL-TIME
Bullet-time must NOT lengthen the run. The run clock (`time`) advances by the UNDILATED delta, so
enemy level-for-time, the XP boost window, and elite timers all keep pacing at real speed even while
the world is dilated. Only the simulation dt is scaled, not the clock.

## DECISION (Jess, 2026-10-21): SOLO ONLY
Disabled in co-op. A shared host-authoritative sim cannot slow time for one player without slowing it
for everyone (one clock, many players), and it collides with the density-first MP identity
(DECISIONS: density-first MP). bulletTimeK returns 1 when G.Coop.active.
Async note: bullet-time COULD work in MP only if MP ends up as per-client independent sims with ghost
peers (each client owns its own clock), NOT a host-authoritative lockstep. P2P/NAT flakiness (parked MP
notes) may push toward looser client-authoritative models anyway, so revisit at the MP architecture
decision. Cross-player effects (revive/buff a teammate) would have to resolve at real time, not the
dilated local clock. Parked, not a build target.

## The prototype (game.js), ready to re-apply on feature/bullet-time
Add near the loop state (`let frameDt = 0, speedK = 1;`):
```
  let realDt = 0;                 // undilated delta, for the run clock (bullet-time must not change run length)
  const BT_THRESHOLD = 250, BT_FLOOR = 0.35;
  function bulletTimeK(pl) {
    if (G.Coop.active || !pl || pl.dead) return 1;                 // solo only
    const px = pl.spd;
    if (!(px > BT_THRESHOLD)) return 1;
    return Math.max(BT_FLOOR, BT_THRESHOLD / px);
  }
```
In frame(ts), right after `const real = ...`:
```
    realDt = Math.min(1 / 30, real);                 // undilated, for the run clock
    if (state === 'playing') speedK = bulletTimeK(pl);
    const dt = Math.min(1 / 30, real) * speedK;
```
In update(dt), change the run clock line:
```
    time += realDt;     // was: time += dt
```

## Open / to-do when building
- debugSpeed vs bullet-time: frame() now overwrites speedK each play frame, so the video slow-mo
  debug is clobbered during play. Decide: bullet-time owns speedK during play (debug only matters when
  paused/recording), or gate so a manual debugSpeed override wins. Low priority.
- Visual cue: add a faint screen tint / vignette / time-warp shimmer while dilated, so the slowdown
  reads as a mechanic, not lag. Small FX addition (G.FX).
- Feel-test risk: everything on dt slows, including the player's OWN attack cadence. Physically
  consistent (true bullet-time), but confirm offense does not feel sluggish at heavy dilation.
- Not harness-covered (runtime feel). Verify with node tools/check.js for syntax, then feel-test.
