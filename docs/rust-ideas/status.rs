//! status.rs: the shared status engine. A port of js/systems/status.js (G.Status), feature/gym-leader-ai, 2026-11-14.
//!
//! [Proposed] Idea doc, NOT compiled. It lives in docs/rust-ideas/ to show what the real status.js looks like as a
//! Rust module in the `sim` crate (crates/sim/src/status.rs). Companion to ecs-codebase-map.html and
//! ecs-wild-player-example.html.
//!
//! ONE engine for every host that can carry a status: wild mons, elites, bosses, gym leaders and you. Same rules as
//! status.js (Jess 2026-10-19, slice E1 2026-10-20, slice 6 2026-11-07):
//!   - one major status at a time (burn, poison, toxic, paralysis, sleep, freeze); a new one never overwrites the old
//!   - strong hosts (bosses, elites): freeze, sleep and the trap root last 25% as long, then a 10 s no-reapply window
//!   - Player entities (you, and a gym leader's mon): full timers, Shake off works, trap is a swap lock not a root,
//!     and a 2.5 s grace after any hard CC ends. A leader's freeze/sleep cut and grace are authored per gym (gyms.js)
//!   - wild mons: freeze 2 s then a 4 s window; sleep 2 to 6 s; damage never wakes a sleeper; a Fire hit thaws ice
//!   - a "turn" is 2 s
//!
//! WHAT IS NOT IN HERE (it moved to Godot, the presentation side):
//!   - text(): the "Paralyzed" / "Immune" / "Fizzled" floating words. The sim returns ApplyResult and fizzles() returns
//!     a bool; the calling system turns those into SimEvents and Godot draws the words. See emit_apply_events().
//!   - labels and colors (CONTROL[k].label / .color), TINT and tintOf(), AIL_COLOR and ailColor(): a Godot table keyed
//!     by Ailment. Copied at the bottom of this file for reference.
//!   - h.anim.frozen: Godot stops the sprite when `is_frozen()` is true. The sim never touches an animator.
//!   - G.U.rand / Math.random: every roll goes through the Roll trait, so a seeded run gives the same statuses.
//!   - G.Grounds.berryGuard: passed in as a closure, because berries live on the team store, not on this component.
//!
//! PORT NOTES (behavior kept exactly as today; each one is worth a look, not a silent fix):
//!   1. Paralysis refresh ignores a move's own duration (`secs`): it refreshes to the 10 s table value.
//!   2. Daze, drowsy and your trap (the swap lock) ignore a move's own duration too; confusion and the majors use it.
//!   3. apply()'s `mul` argument (the comment says "only trap uses it") is never read in status.js. Dropped here.
//!   4. Confusion rolls its duration even when it only refreshes, so the roll count matches today.
//!   5. A status immunity shows "Immune" every time, unthrottled; immuneNote() (move-type immunity) is throttled to
//!      once per 0.5 s per host. Same here: Immune comes back as a result, immune_note() keeps the gap.
//!   6. UNIFIED, a real change: today wild mons keep their slice A burn / poison fields (burn, burnMul, poison,
//!      poisonMul, ticked in enemy.js) and only the player uses stDot. Here every host uses one DamageOverTime. Same
//!      table (enemies.js STATUS), but I have not read enemy.js's tick line by line, so check it matches before relying
//!      on this.
//!   7. clear() also drops flinch (stFl) in status.js. Flinch is its own component here, so the faint / swap system
//!      clears both.
//!
//! Tunables are consts below for readability. In the real port they would load from data/status.ron, so a balance
//! pass is a data edit with no recompile.

use std::f32::consts::{PI, TAU};

use glam::Vec2;
use serde::{Deserialize, Serialize};
use shipyard::{Component, IntoIter, UniqueView, UniqueViewMut, View, ViewMut};

use crate::combat::{DamageEvent, DamageQueue};
use crate::components::Health;
use crate::events::{SimEvent, SimEvents};
use crate::rng::Rng;
use crate::time::SimClock;
use crate::types::{PokeType, TypePair};

// ============================================================================================================
// Tunables (status.js CONTROL, STRONG, SHAKE, GRACE, IMMUNE_GAP; enemies.js STATUS for burn / poison / toxic)
// ============================================================================================================

pub mod tune {
    use super::PI;

    pub const TURN_SECONDS: f32 = 2.0;

    pub const PARALYSIS_SECONDS: f32 = 10.0;
    pub const PARALYSIS_SPEED_MUL: f32 = 0.5;
    pub const PARALYSIS_FIZZLE_CHANCE: f32 = 0.25;

    pub const FREEZE_SECONDS: f32 = 2.0;
    pub const FREEZE_REAPPLY_WINDOW: f32 = 4.0;
    /// A Fire hit thaws ice, but never the same instant it froze.
    pub const FREEZE_THAW_MIN_AGE: f32 = 0.2;

    pub const SLEEP_SECONDS: (f32, f32) = (2.0, 6.0);

    pub const CONFUSION_SECONDS: (f32, f32) = (2.0, 8.0);
    pub const CONFUSION_FIZZLE_CHANCE: f32 = 0.5;
    pub const CONFUSION_RETARGET_SECONDS: (f32, f32) = (0.5, 1.1);
    pub const CONFUSION_WANDER_WEIGHT: f32 = 0.75;

    /// Trap on a Player entity: manual team swaps are locked, no damage, no slow.
    pub const TRAP_SWAP_LOCK_SECONDS: f32 = 8.0;
    /// Trap on any other host (move schema slice 4a): a root, movement x0.
    pub const TRAP_ROOT_SECONDS: f32 = 2.0;

    pub const DAZE_SECONDS: f32 = 6.0;
    pub const DAZE_JITTER_RADIANS: f32 = 35.0 * PI / 180.0;
    pub const DAZE_RETARGET_SECONDS: (f32, f32) = (0.2, 0.4);
    pub const DAZE_EASE_RATE: f32 = 10.0;

    pub const DROWSY_SECONDS: f32 = 8.0;
    pub const DROWSY_SLEEP_CHANCE_MUL: f32 = 1.5;

    /// Bosses and elites: freeze, sleep and the trap root are cut to this fraction, then a no-reapply window.
    pub const STRONG_DURATION_CUT: f32 = 0.25;
    pub const STRONG_REAPPLY_WINDOW: f32 = 10.0;

    /// Player entities: seconds after a hard CC ends in which no new hard CC lands.
    pub const PLAYER_HARD_CC_GRACE: f32 = 2.5;

    pub const SHAKE_SECONDS_PER_TAP: f32 = 0.25;
    pub const SHAKE_FLOOR_SECONDS: f32 = 0.5;
    pub const SHAKE_TAPS_PER_SECOND: f32 = 12.0;
    pub const AUTO_SHAKE_TAPS_PER_SECOND: f32 = 3.0;

    pub const IMMUNE_NOTE_GAP: f32 = 0.5;

    pub const DOT_TICK_SECONDS: f32 = 2.0;
    pub const BURN_FRACTION: f32 = 1.0 / 16.0;
    pub const BURN_TURNS: f32 = 4.0;
    pub const POISON_FRACTION: f32 = 1.0 / 8.0;
    pub const POISON_TURNS: f32 = 4.0;
    pub const TOXIC_STEP: f32 = 1.0 / 16.0;
    pub const TOXIC_CAP: u8 = 15;
    pub const TOXIC_TURNS: f32 = 8.0;
}

// ============================================================================================================
// Kinds
// ============================================================================================================

/// The three major statuses that are crowd control (status.js HARD).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum HardKind {
    Paralysis,
    Freeze,
    Sleep,
}

/// The three major statuses that deal damage over time (enemies.js STATUS).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DotKind {
    Burn,
    Poison,
    Toxic,
}

impl DotKind {
    /// Poison and Toxic are one family: poison can upgrade to toxic, and neither blocks the other.
    fn is_same_family(self, other: DotKind) -> bool {
        let poison_family = |kind| matches!(kind, DotKind::Poison | DotKind::Toxic);
        self == other || (poison_family(self) && poison_family(other))
    }

    fn base_turns(self) -> f32 {
        match self {
            DotKind::Burn => tune::BURN_TURNS,
            DotKind::Poison => tune::POISON_TURNS,
            DotKind::Toxic => tune::TOXIC_TURNS,
        }
    }

    fn immune_types(self) -> &'static [PokeType] {
        match self {
            DotKind::Burn => &[PokeType::Fire],
            DotKind::Poison | DotKind::Toxic => &[PokeType::Poison, PokeType::Steel],
        }
    }
}

/// Everything G.Status.apply() accepts (status.js CONTROL keys).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ControlKind {
    Paralysis,
    Freeze,
    Sleep,
    Confusion,
    Trap,
    Daze,
    Drowsy,
}

impl ControlKind {
    pub fn as_hard(self) -> Option<HardKind> {
        match self {
            ControlKind::Paralysis => Some(HardKind::Paralysis),
            ControlKind::Freeze => Some(HardKind::Freeze),
            ControlKind::Sleep => Some(HardKind::Sleep),
            _ => None,
        }
    }

    fn immune_types(self) -> &'static [PokeType] {
        match self {
            ControlKind::Paralysis => &[PokeType::Electric],
            ControlKind::Freeze => &[PokeType::Ice],
            ControlKind::Trap => &[PokeType::Ghost],
            _ => &[],
        }
    }

    fn table_seconds(self) -> TableSeconds {
        match self {
            ControlKind::Paralysis => TableSeconds::Fixed(tune::PARALYSIS_SECONDS),
            ControlKind::Freeze => TableSeconds::Fixed(tune::FREEZE_SECONDS),
            ControlKind::Sleep => TableSeconds::Range(tune::SLEEP_SECONDS),
            ControlKind::Confusion => TableSeconds::Range(tune::CONFUSION_SECONDS),
            ControlKind::Trap => TableSeconds::Fixed(tune::TRAP_SWAP_LOCK_SECONDS),
            ControlKind::Daze => TableSeconds::Fixed(tune::DAZE_SECONDS),
            ControlKind::Drowsy => TableSeconds::Fixed(tune::DROWSY_SECONDS),
        }
    }
}

impl From<HardKind> for ControlKind {
    fn from(kind: HardKind) -> Self {
        match kind {
            HardKind::Paralysis => ControlKind::Paralysis,
            HardKind::Freeze => ControlKind::Freeze,
            HardKind::Sleep => ControlKind::Sleep,
        }
    }
}

/// Any status at all, for events, the berry guard and the HUD.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Ailment {
    Control(ControlKind),
    Dot(DotKind),
}

/// The major status on a host right now (status.js majorKind()).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum MajorKind {
    Hard(HardKind),
    Dot(DotKind),
}

enum TableSeconds {
    Fixed(f32),
    Range((f32, f32)),
}

/// Shake off works on these, most restrictive first (status.js SHAKE.order).
const SHAKE_ORDER: [ControlKind; 6] = [
    ControlKind::Sleep,
    ControlKind::Freeze,
    ControlKind::Paralysis,
    ControlKind::Confusion,
    ControlKind::Trap,
    ControlKind::Daze,
];

// ============================================================================================================
// Components
// ============================================================================================================

/// Which status rules a host gets. Today this is worked out on every call from h.isPlayer, h.boss, h.strongStatus,
/// h.gym, h.leaderStatus, h.statusCut and h.ccWindow. Here it is set once at spawn.
#[derive(Component, Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub enum StatusRules {
    /// A plain wild mon.
    Wild,
    /// Bosses and elites (status.js strong(): h.boss || h.strongStatus || h.gym, and not a leader).
    Strong,
    /// You, or a gym leader's mon (a G.GymLeader is a Player entity). You have no authored values (None, None).
    /// A leader's come from its gym's `restrictions` in gyms.js (Misty: half length, a 5 s gap).
    PlayerEntity { freeze_sleep_cut: Option<f32>, hard_cc_window: Option<f32> },
}

impl StatusRules {
    pub fn is_player_entity(self) -> bool {
        matches!(self, StatusRules::PlayerEntity { .. })
    }

    pub fn is_strong(self) -> bool {
        self == StatusRules::Strong
    }
}

/// Every status timer on one host. Today these are loose fields on the host, all null until used:
/// stMajor, stDot (and burn / poison on enemies), stCnf, stTrap, stDaze, stDrow, stWin, shakeCd, autoShakeT, immCd.
#[derive(Component, Clone, Debug, Default, Serialize, Deserialize)]
pub struct Status {
    /// stMajor + stDot in one slot, so "one major at a time" cannot be broken.
    pub major: Option<Major>,
    pub confusion: Option<Confusion>,
    pub trap: Option<Countdown>,
    pub daze: Option<Daze>,
    pub drowsy: Option<Countdown>,
    pub windows: ReapplyWindows,
    pub shake_cooldown: f32,
    pub auto_shake_timer: f32,
    pub immune_note_cooldown: f32,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub enum Major {
    /// stMajor { k, t, age }
    Hard { kind: HardKind, seconds_left: f32, age: f32 },
    /// stDot { k, left, tick, n, mul }
    Dot(DamageOverTime),
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct DamageOverTime {
    pub kind: DotKind,
    pub turns_left: u8,
    pub next_tick: f32,
    pub toxic_stacks: u8,
    /// The source move's DoT strength (status.js `mul`); a stronger reapply raises it, a weaker one never lowers it.
    pub strength: f32,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Countdown {
    pub seconds_left: f32,
}

/// stCnf { t, wa, wt }
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Confusion {
    pub seconds_left: f32,
    pub wander_angle: f32,
    pub retarget_in: f32,
}

/// stDaze { t, a, ta, wt }
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Daze {
    pub seconds_left: f32,
    pub angle: f32,
    pub target_angle: f32,
    pub retarget_in: f32,
}

/// stWin { freeze, sleep, trap, hard }: seconds during which that CC cannot land again. 0 means open.
#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct ReapplyWindows {
    pub freeze: f32,
    pub sleep: f32,
    pub trap: f32,
    /// Player entities only: the grace after any hard CC.
    pub hard_cc: f32,
}

impl ReapplyWindows {
    fn count_down(&mut self, dt: f32) {
        for window in [&mut self.freeze, &mut self.sleep, &mut self.trap, &mut self.hard_cc] {
            *window = (*window - dt).max(0.0);
        }
    }

    /// Paralysis has no window, so it is always open.
    fn for_hard(&self, kind: HardKind) -> f32 {
        match kind {
            HardKind::Freeze => self.freeze,
            HardKind::Sleep => self.sleep,
            HardKind::Paralysis => 0.0,
        }
    }

    fn set_for_hard(&mut self, kind: HardKind, seconds: f32) {
        match kind {
            HardKind::Freeze => self.freeze = seconds,
            HardKind::Sleep => self.sleep = seconds,
            HardKind::Paralysis => {}
        }
    }
}

// ============================================================================================================
// Inputs and results
// ============================================================================================================

/// The one source of randomness. The sim's seeded Rng implements it; tests pass a fixed one.
pub trait Roll {
    fn range(&mut self, low: f32, high: f32) -> f32;

    fn unit(&mut self) -> f32 {
        self.range(0.0, 1.0)
    }
}

/// What apply needs to know about the host, read from its other components.
#[derive(Clone, Copy)]
pub struct Host<'a> {
    pub rules: StatusRules,
    pub types: &'a TypePair,
    pub fainted: bool,
}

pub struct ApplyCtx<'a> {
    pub roll: &'a mut dyn Roll,
    /// G.Grounds.berryGuard: true when a stored status berry blocks this status (Player entities only, F3a-2).
    pub berry_guard: &'a mut dyn FnMut(Ailment) -> bool,
}

/// status.js returns these as strings: 'ok' | 'refresh' | 'immune' | 'blocked' | 'window' | 'berry' | 'none'.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ApplyResult {
    Applied,
    Refreshed,
    Immune,
    /// Another major status already holds the host.
    Blocked,
    /// A reapply window or the hard CC grace is open.
    InWindow,
    BerryUsed,
    /// The host has fainted.
    Ignored,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct DotTick {
    pub kind: DotKind,
    pub amount: f32,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ShakeTarget {
    pub kind: ControlKind,
    pub seconds_left: f32,
    pub floor: f32,
}

/// One HUD row. Label and color come from the Godot table; `Slowed` comes from stages, not from here.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ActiveStatus {
    pub ailment: Ailment,
    pub seconds_left: f32,
    pub shakeable: bool,
}

fn is_immune(types: &TypePair, immune_types: &[PokeType]) -> bool {
    immune_types.iter().any(|immune_type| types.has(*immune_type))
}

// ============================================================================================================
// The engine
// ============================================================================================================

impl Status {
    // ---------------------------------------------------------------- applying

    /// status.js apply(h, kind, mul, durMul, secs). `move_seconds` is the move effect's own duration, if it has one.
    pub fn apply_control(
        &mut self,
        kind: ControlKind,
        duration_mul: f32,
        move_seconds: Option<f32>,
        host: Host,
        ctx: &mut ApplyCtx,
    ) -> ApplyResult {
        if host.fainted {
            return ApplyResult::Ignored;
        }
        if is_immune(host.types, kind.immune_types()) {
            return ApplyResult::Immune;
        }
        let player = host.rules.is_player_entity();

        // Trap on a non-player: a root. Strong hosts get the cut, no extension, then a window.
        if kind == ControlKind::Trap && !player {
            if self.windows.trap > 0.0 {
                return ApplyResult::InWindow;
            }
            let seconds = base_seconds(kind, move_seconds, host.rules, ctx.roll) * duration_mul;
            if let Some(trap) = &mut self.trap {
                if !host.rules.is_strong() {
                    trap.seconds_left = trap.seconds_left.max(seconds);
                }
                return ApplyResult::Refreshed;
            }
            self.trap = Some(Countdown { seconds_left: seconds });
            return ApplyResult::Applied;
        }

        if let Some(hard) = kind.as_hard() {
            return self.apply_hard(hard, duration_mul, move_seconds, host, ctx);
        }

        match kind {
            ControlKind::Confusion => {
                if self.confusion.is_none() && player && (ctx.berry_guard)(Ailment::Control(kind)) {
                    return ApplyResult::BerryUsed;
                }
                // Rolled even on a refresh, as today (port note 4).
                let seconds = base_seconds(kind, move_seconds, host.rules, ctx.roll) * duration_mul;
                if let Some(confusion) = &mut self.confusion {
                    confusion.seconds_left = confusion.seconds_left.max(seconds);
                    return ApplyResult::Refreshed;
                }
                let (retarget_low, retarget_high) = tune::CONFUSION_RETARGET_SECONDS;
                self.confusion = Some(Confusion {
                    seconds_left: seconds,
                    wander_angle: ctx.roll.range(0.0, TAU),
                    retarget_in: ctx.roll.range(retarget_low, retarget_high),
                });
                ApplyResult::Applied
            }
            ControlKind::Daze => {
                // Ignores move_seconds (port note 2).
                let seconds = tune::DAZE_SECONDS * duration_mul;
                if let Some(daze) = &mut self.daze {
                    daze.seconds_left = daze.seconds_left.max(seconds);
                    return ApplyResult::Refreshed;
                }
                self.daze = Some(Daze { seconds_left: seconds, angle: 0.0, target_angle: 0.0, retarget_in: 0.0 });
                ApplyResult::Applied
            }
            ControlKind::Drowsy => refresh_or_start(&mut self.drowsy, tune::DROWSY_SECONDS * duration_mul),
            // Trap on a Player entity: the swap lock. Ignores move_seconds (port note 2).
            ControlKind::Trap => refresh_or_start(&mut self.trap, tune::TRAP_SWAP_LOCK_SECONDS * duration_mul),
            ControlKind::Paralysis | ControlKind::Freeze | ControlKind::Sleep => unreachable!("handled by apply_hard"),
        }
    }

    fn apply_hard(
        &mut self,
        kind: HardKind,
        duration_mul: f32,
        move_seconds: Option<f32>,
        host: Host,
        ctx: &mut ApplyCtx,
    ) -> ApplyResult {
        let player = host.rules.is_player_entity();
        if player && self.windows.hard_cc > 0.0 {
            return ApplyResult::InWindow;
        }
        match self.major_kind() {
            Some(MajorKind::Hard(current)) if current == kind => {
                // Paralysis refreshes (to the table value, port note 1); freeze and sleep never extend.
                if kind == HardKind::Paralysis {
                    let seconds = base_seconds(kind.into(), None, host.rules, ctx.roll) * duration_mul;
                    if let Some(Major::Hard { seconds_left, .. }) = &mut self.major {
                        *seconds_left = seconds_left.max(seconds);
                    }
                }
                return ApplyResult::Refreshed;
            }
            Some(_) => return ApplyResult::Blocked,
            None => {}
        }
        if self.windows.for_hard(kind) > 0.0 {
            return ApplyResult::InWindow;
        }
        if player && (ctx.berry_guard)(Ailment::Control(kind.into())) {
            return ApplyResult::BerryUsed;
        }
        let seconds = base_seconds(kind.into(), move_seconds, host.rules, ctx.roll) * duration_mul;
        self.major = Some(Major::Hard { kind, seconds_left: seconds, age: 0.0 });
        ApplyResult::Applied
    }

    /// status.js applyDot(h, kind, mul, durMul). Today only the player uses this path (port note 6).
    pub fn apply_dot(
        &mut self,
        kind: DotKind,
        strength: f32,
        duration_mul: f32,
        host: Host,
        ctx: &mut ApplyCtx,
    ) -> ApplyResult {
        if host.fainted {
            return ApplyResult::Ignored;
        }
        if is_immune(host.types, kind.immune_types()) {
            return ApplyResult::Immune;
        }
        let blocked = match self.major_kind() {
            Some(MajorKind::Hard(_)) => true,
            Some(MajorKind::Dot(current)) => !current.is_same_family(kind),
            None => false,
        };
        if blocked {
            return ApplyResult::Blocked;
        }
        let turns = dot_turns(kind, duration_mul);
        if let Some(Major::Dot(dot)) = &mut self.major {
            // Poison upgrades to toxic, never back.
            if kind == DotKind::Toxic && dot.kind != DotKind::Toxic {
                dot.kind = DotKind::Toxic;
                dot.toxic_stacks = 0;
            }
            dot.turns_left = dot.turns_left.max(turns);
            dot.strength = dot.strength.max(strength);
            return ApplyResult::Refreshed;
        }
        if host.rules.is_player_entity() && (ctx.berry_guard)(Ailment::Dot(kind)) {
            return ApplyResult::BerryUsed;
        }
        self.major = Some(Major::Dot(DamageOverTime {
            kind,
            turns_left: turns,
            next_tick: tune::DOT_TICK_SECONDS,
            toxic_stacks: 0,
            strength,
        }));
        ApplyResult::Applied
    }

    // ---------------------------------------------------------------- ticking

    /// status.js tick(h, dt). Once per sim tick for every living host. Returns the DoT damage due this tick, if any;
    /// the calling system queues it (this module never touches Health).
    pub fn tick(&mut self, rules: StatusRules, max_hp: f32, dt: f32, roll: &mut dyn Roll) -> Option<DotTick> {
        self.windows.count_down(dt);

        let mut hard_ended = false;
        if let Some(Major::Hard { seconds_left, age, .. }) = &mut self.major {
            *seconds_left -= dt;
            *age += dt;
            hard_ended = *seconds_left <= 0.0;
        }
        if hard_ended {
            self.end_hard_major(rules);
        }

        self.confusion.take_if(|confusion| {
            confusion.seconds_left -= dt;
            confusion.retarget_in -= dt;
            if confusion.retarget_in <= 0.0 {
                let (low, high) = tune::CONFUSION_RETARGET_SECONDS;
                confusion.retarget_in = roll.range(low, high);
                confusion.wander_angle = roll.range(0.0, TAU);
            }
            confusion.seconds_left <= 0.0
        });

        self.shake_cooldown = (self.shake_cooldown - dt).max(0.0);
        self.immune_note_cooldown = (self.immune_note_cooldown - dt).max(0.0);

        let trap_ended = self.trap.take_if(|trap| tick_down(&mut trap.seconds_left, dt)).is_some();
        if trap_ended && !rules.is_player_entity() && rules.is_strong() {
            self.windows.trap = tune::STRONG_REAPPLY_WINDOW;
        }

        self.daze.take_if(|daze| {
            daze.seconds_left -= dt;
            daze.retarget_in -= dt;
            if daze.retarget_in <= 0.0 {
                let (low, high) = tune::DAZE_RETARGET_SECONDS;
                daze.retarget_in = roll.range(low, high);
                daze.target_angle = roll.range(-1.0, 1.0) * tune::DAZE_JITTER_RADIANS;
            }
            daze.angle += (daze.target_angle - daze.angle) * (dt * tune::DAZE_EASE_RATE).min(1.0);
            daze.seconds_left <= 0.0
        });

        self.drowsy.take_if(|drowsy| tick_down(&mut drowsy.seconds_left, dt));

        self.tick_dot(max_hp, dt)
    }

    fn tick_dot(&mut self, max_hp: f32, dt: f32) -> Option<DotTick> {
        let Some(Major::Dot(dot)) = &mut self.major else { return None };
        dot.next_tick -= dt;
        if dot.next_tick > 0.0 {
            return None;
        }
        dot.next_tick += tune::DOT_TICK_SECONDS;
        let fraction = match dot.kind {
            DotKind::Burn => tune::BURN_FRACTION,
            DotKind::Poison => tune::POISON_FRACTION,
            DotKind::Toxic => {
                dot.toxic_stacks = (dot.toxic_stacks + 1).min(tune::TOXIC_CAP);
                tune::TOXIC_STEP * f32::from(dot.toxic_stacks)
            }
        };
        let due = DotTick { kind: dot.kind, amount: max_hp * fraction * dot.strength };
        dot.turns_left = dot.turns_left.saturating_sub(1);
        if dot.turns_left == 0 {
            self.major = None;
        }
        Some(due)
    }

    /// status.js endMajor(h): clear the hard major and open its reapply window (and the Player-entity grace).
    fn end_hard_major(&mut self, rules: StatusRules) {
        let Some(Major::Hard { kind, .. }) = self.major else { return };
        let window = match kind {
            HardKind::Freeze | HardKind::Sleep if rules.is_strong() => tune::STRONG_REAPPLY_WINDOW,
            HardKind::Freeze => tune::FREEZE_REAPPLY_WINDOW,
            HardKind::Sleep | HardKind::Paralysis => 0.0,
        };
        if window > 0.0 {
            self.windows.set_for_hard(kind, window);
        }
        if let StatusRules::PlayerEntity { hard_cc_window, .. } = rules {
            self.windows.hard_cc = hard_cc_window.unwrap_or(tune::PLAYER_HARD_CC_GRACE);
        }
        self.major = None;
    }

    // ---------------------------------------------------------------- reading (movement, casting, HUD)

    pub fn major_kind(&self) -> Option<MajorKind> {
        match self.major? {
            Major::Hard { kind, .. } => Some(MajorKind::Hard(kind)),
            Major::Dot(dot) => Some(MajorKind::Dot(dot.kind)),
        }
    }

    fn has_hard(&self, kind: HardKind) -> bool {
        matches!(self.major, Some(Major::Hard { kind: current, .. }) if current == kind)
    }

    /// Godot reads this to stop the sprite (today: h.anim.frozen, set inside tick()).
    pub fn is_frozen(&self) -> bool {
        self.has_hard(HardKind::Freeze)
    }

    /// Frozen or asleep: no movement, no attacks, no casts.
    pub fn is_stunned(&self) -> bool {
        self.has_hard(HardKind::Freeze) || self.has_hard(HardKind::Sleep)
    }

    /// Trap on a non-player is a root. A Player entity's trap is a swap lock and never roots.
    pub fn is_rooted(&self, rules: StatusRules) -> bool {
        self.trap.is_some() && !rules.is_player_entity()
    }

    /// True while manual team swaps are locked.
    pub fn is_swap_locked(&self) -> bool {
        self.trap.is_some()
    }

    /// Movement multiplier: a root is x0, paralysis x0.5. Multiplies with slow and the Speed stage elsewhere.
    pub fn speed_mul(&self, rules: StatusRules) -> f32 {
        if self.is_rooted(rules) {
            0.0
        } else if self.has_hard(HardKind::Paralysis) {
            tune::PARALYSIS_SPEED_MUL
        } else {
            1.0
        }
    }

    /// Daze: rotate the heading by the current eased jitter angle.
    pub fn jitter(&self, heading: Vec2) -> Vec2 {
        match &self.daze {
            Some(daze) if daze.angle != 0.0 => Vec2::from_angle(daze.angle).rotate(heading),
            _ => heading,
        }
    }

    /// Confusion: the heading drifts toward a random direction that is re-rolled every ~0.8 s.
    pub fn wander(&self, heading: Vec2) -> Vec2 {
        let Some(confusion) = &self.confusion else { return heading };
        let weight = tune::CONFUSION_WANDER_WEIGHT;
        (heading * (1.0 - weight) + Vec2::from_angle(confusion.wander_angle) * weight).normalize_or_zero()
    }

    /// Chance of a sleep effect landing, given the base chance: drowsy x1.5, capped at 100%.
    pub fn sleep_chance(&self, base_chance: f32) -> f32 {
        let mul = if self.drowsy.is_some() { tune::DROWSY_SLEEP_CHANCE_MUL } else { 1.0 };
        (base_chance * mul).min(1.0)
    }

    /// Does this attack attempt fail? Paralysis 25%, confusion 50%, both 62.5%. The caller emits Fizzled.
    pub fn fizzles(&self, roll: &mut dyn Roll) -> bool {
        let mut success_chance = 1.0;
        if self.has_hard(HardKind::Paralysis) {
            success_chance *= 1.0 - tune::PARALYSIS_FIZZLE_CHANCE;
        }
        if self.confusion.is_some() {
            success_chance *= 1.0 - tune::CONFUSION_FIZZLE_CHANCE;
        }
        success_chance < 1.0 && roll.unit() >= success_chance
    }

    /// A hit of `hit_type` lands: a Fire hit thaws ice, never the same instant it froze.
    pub fn on_hit(&mut self, hit_type: PokeType, rules: StatusRules) {
        let thaws = hit_type == PokeType::Fire
            && matches!(self.major, Some(Major::Hard { kind: HardKind::Freeze, age, .. })
                if age > tune::FREEZE_THAW_MIN_AGE);
        if thaws {
            self.end_hard_major(rules);
        }
    }

    /// The grey Immune note for a move-type immunity, at most once per 0.5 s per host. True when it should show.
    pub fn immune_note(&mut self) -> bool {
        if self.immune_note_cooldown > 0.0 {
            return false;
        }
        self.immune_note_cooldown = tune::IMMUNE_NOTE_GAP;
        true
    }

    /// Faint or swap: drop every status. Like status.js, the Immune note gap survives (port note 7 for flinch).
    pub fn clear(&mut self) {
        let immune_note_cooldown = self.immune_note_cooldown;
        *self = Status { immune_note_cooldown, ..Status::default() };
    }

    /// HUD rows, in today's order. `Slowed` (from stages) is added by the HUD itself.
    pub fn active(&self) -> Vec<ActiveStatus> {
        let mut rows = Vec::new();
        let mut push = |ailment, seconds_left| {
            let shakeable = matches!(ailment, Ailment::Control(kind) if SHAKE_ORDER.contains(&kind));
            rows.push(ActiveStatus { ailment, seconds_left, shakeable });
        };
        match self.major {
            Some(Major::Hard { kind, seconds_left, .. }) => push(Ailment::Control(kind.into()), seconds_left),
            Some(Major::Dot(dot)) => {
                let seconds_left = f32::from(dot.turns_left.saturating_sub(1)) * tune::DOT_TICK_SECONDS + dot.next_tick;
                push(Ailment::Dot(dot.kind), seconds_left.max(0.0));
            }
            None => {}
        }
        if let Some(confusion) = &self.confusion {
            push(Ailment::Control(ControlKind::Confusion), confusion.seconds_left);
        }
        if let Some(daze) = &self.daze {
            push(Ailment::Control(ControlKind::Daze), daze.seconds_left);
        }
        if let Some(trap) = &self.trap {
            push(Ailment::Control(ControlKind::Trap), trap.seconds_left);
        }
        if let Some(drowsy) = &self.drowsy {
            push(Ailment::Control(ControlKind::Drowsy), drowsy.seconds_left);
        }
        rows
    }

    // ---------------------------------------------------------------- Shake off (Player entities only)

    fn shake_seconds(&self, kind: ControlKind) -> Option<f32> {
        match kind {
            ControlKind::Confusion => self.confusion.map(|confusion| confusion.seconds_left),
            ControlKind::Trap => self.trap.map(|trap| trap.seconds_left),
            ControlKind::Daze => self.daze.map(|daze| daze.seconds_left),
            ControlKind::Drowsy => None,
            hard => match self.major {
                Some(Major::Hard { kind: current, seconds_left, .. }) if Some(current) == hard.as_hard() => {
                    Some(seconds_left)
                }
                _ => None,
            },
        }
    }

    fn shake_seconds_mut(&mut self, kind: ControlKind) -> Option<&mut f32> {
        match kind {
            ControlKind::Confusion => self.confusion.as_mut().map(|confusion| &mut confusion.seconds_left),
            ControlKind::Trap => self.trap.as_mut().map(|trap| &mut trap.seconds_left),
            ControlKind::Daze => self.daze.as_mut().map(|daze| &mut daze.seconds_left),
            ControlKind::Drowsy => None,
            hard => match &mut self.major {
                Some(Major::Hard { kind: current, seconds_left, .. }) if Some(*current) == hard.as_hard() => {
                    Some(seconds_left)
                }
                _ => None,
            },
        }
    }

    /// The status the next tap would shorten (the HUD prompt's draining bar). Read only.
    pub fn shake_target(&self) -> Option<ShakeTarget> {
        SHAKE_ORDER.iter().find_map(|&kind| {
            let seconds_left = self.shake_seconds(kind)?;
            (seconds_left > tune::SHAKE_FLOOR_SECONDS + 1e-6).then_some(ShakeTarget {
                kind,
                seconds_left,
                floor: tune::SHAKE_FLOOR_SECONDS,
            })
        })
    }

    /// One Shake off tap: 0.25 s off the most restrictive mashable status, never below 0.5 s, at most 12 taps per
    /// second. True when the tap counted. The caller skips fainted hosts and emits the tap ring for Godot.
    pub fn shake(&mut self, rules: StatusRules) -> bool {
        // 1e-4: float slack so exactly 12 taps per second all count.
        if !rules.is_player_entity() || self.shake_cooldown > 1e-4 {
            return false;
        }
        for kind in SHAKE_ORDER {
            if let Some(seconds_left) = self.shake_seconds_mut(kind) {
                if *seconds_left > tune::SHAKE_FLOOR_SECONDS + 1e-6 {
                    *seconds_left = (*seconds_left - tune::SHAKE_SECONDS_PER_TAP).max(tune::SHAKE_FLOOR_SECONDS);
                    self.shake_cooldown = 1.0 / tune::SHAKE_TAPS_PER_SECOND;
                    return true;
                }
            }
        }
        false
    }

    /// Accessibility auto-shake (slice E2e): taps for you at 3 per second while anything is shakeable.
    pub fn auto_shake(&mut self, rules: StatusRules, dt: f32) -> bool {
        if self.shake_target().is_none() {
            self.auto_shake_timer = 0.0;
            return false;
        }
        self.auto_shake_timer -= dt;
        if self.auto_shake_timer > 0.0 || !self.shake(rules) {
            return false;
        }
        self.auto_shake_timer = 1.0 / tune::AUTO_SHAKE_TAPS_PER_SECOND;
        true
    }
}

// ============================================================================================================
// Helpers
// ============================================================================================================

/// status.js dur(h, kind, secs): the move's own seconds if given, else the table (a trap root is 2 s), then the
/// leader's authored freeze/sleep cut, or the strong-host cut.
fn base_seconds(kind: ControlKind, move_seconds: Option<f32>, rules: StatusRules, roll: &mut dyn Roll) -> f32 {
    let player = rules.is_player_entity();
    let base = match move_seconds {
        Some(seconds) => seconds,
        None if kind == ControlKind::Trap && !player => tune::TRAP_ROOT_SECONDS,
        None => match kind.table_seconds() {
            TableSeconds::Fixed(seconds) => seconds,
            TableSeconds::Range((low, high)) => roll.range(low, high),
        },
    };
    let freeze_or_sleep = matches!(kind, ControlKind::Freeze | ControlKind::Sleep);
    if let StatusRules::PlayerEntity { freeze_sleep_cut: Some(cut), .. } = rules {
        if freeze_or_sleep {
            return base * cut;
        }
    }
    let strong_cut_applies = freeze_or_sleep || (kind == ControlKind::Trap && !player);
    if strong_cut_applies && rules.is_strong() {
        base * tune::STRONG_DURATION_CUT
    } else {
        base
    }
}

fn dot_turns(kind: DotKind, duration_mul: f32) -> u8 {
    (kind.base_turns() * duration_mul).round().max(1.0) as u8
}

/// Count a timer down; true when it has run out.
fn tick_down(seconds_left: &mut f32, dt: f32) -> bool {
    *seconds_left -= dt;
    *seconds_left <= 0.0
}

fn refresh_or_start(slot: &mut Option<Countdown>, seconds: f32) -> ApplyResult {
    match slot {
        Some(countdown) => {
            countdown.seconds_left = countdown.seconds_left.max(seconds);
            ApplyResult::Refreshed
        }
        None => {
            *slot = Some(Countdown { seconds_left: seconds });
            ApplyResult::Applied
        }
    }
}

// ============================================================================================================
// ECS glue: the system and the events
// ============================================================================================================

/// Stage 06 "Resolve" in ecs-codebase-map.html. Ticks every living host and queues DoT damage. A fainted host has
/// already been cleared by the faint system, so it is skipped here like today's `!h.dead`.
pub fn status_tick(
    clock: UniqueView<SimClock>,
    rules: View<StatusRules>,
    health: View<Health>,
    mut statuses: ViewMut<Status>,
    mut damage: UniqueViewMut<DamageQueue>,
    mut rng: UniqueViewMut<Rng>,
) {
    for (entity, (status, host_rules, hp)) in (&mut statuses, &rules, &health).iter().with_id() {
        if hp.hp <= 0.0 {
            continue;
        }
        if let Some(due) = status.tick(*host_rules, hp.max, clock.dt, &mut *rng) {
            // Flat DoT damage: no type, no stages, no crit (today's takeDot).
            damage.0.push(DamageEvent::over_time(entity, due.kind, due.amount));
        }
    }
}

/// What the old text() calls become. Move effects call this after apply_control / apply_dot; Godot draws the word.
pub fn emit_apply_events(entity: shipyard::EntityId, ailment: Ailment, result: ApplyResult, events: &mut SimEvents) {
    match result {
        ApplyResult::Applied => events.push(SimEvent::StatusApplied { entity, ailment }),
        ApplyResult::Immune => events.push(SimEvent::StatusImmune { entity }),
        _ => {}
    }
}

// Presentation table (Godot side, for reference; today in status.js CONTROL, TINT and AIL_COLOR).
// Today no word shows when a DoT lands, only on Immune, so Godot skips StatusApplied for Ailment::Dot.
//   Paralysis  "Paralyzed"       #f5d742   tint #ffd92a 0.75
//   Freeze     "Frozen"          #8fd8f0   tint #4fc3ff 0.85, sprite stops (is_frozen)
//   Sleep      "Asleep"          #b9a3e8   tint #7a70e6 0.75
//   Confusion  "Confused"        #e57fc4
//   Trap       "Trapped"         #b0743a
//   Daze       "Dazed"           #e8b04a
//   Drowsy     "Drowsy"          #9a8fd8   floating zzz
//   Burn       "Burned"          #ff9a4d   tint #ff3a2a 0.75
//   Poison     "Poisoned"        #d47cf0   tint #a64fd6 0.75
//   Toxic      "Badly poisoned"  #b44fd6   tint #a64fd6 0.75
//   Slowed (stages) #8ab4e8, haste #7fe08a, Immune / Fizzled #a3abb8, carrier shot fallback #ff7a9e

// ============================================================================================================
// Tests: cargo test runs these with no Godot, no browser and nothing stubbed
// ============================================================================================================

#[cfg(test)]
mod tests {
    use super::*;

    /// Always rolls the same point in the range: 0.0 is the low end, 1.0 the high end.
    struct FixedRoll(f32);
    impl Roll for FixedRoll {
        fn range(&mut self, low: f32, high: f32) -> f32 {
            low + (high - low) * self.0
        }
    }

    const NO_LEADER_RULES: StatusRules = StatusRules::PlayerEntity { freeze_sleep_cut: None, hard_cc_window: None };

    fn host(rules: StatusRules, types: &TypePair) -> Host<'_> {
        Host { rules, types, fainted: false }
    }

    fn apply(status: &mut Status, kind: ControlKind, rules: StatusRules, types: &TypePair) -> ApplyResult {
        let mut roll = FixedRoll(0.5);
        let mut no_berry = |_: Ailment| false;
        let mut ctx = ApplyCtx { roll: &mut roll, berry_guard: &mut no_berry };
        status.apply_control(kind, 1.0, None, host(rules, types), &mut ctx)
    }

    #[test]
    fn one_major_at_a_time() {
        let water = TypePair::single(PokeType::Water);
        let mut status = Status::default();
        let mut roll = FixedRoll(0.5);
        let mut no_berry = |_: Ailment| false;
        let mut ctx = ApplyCtx { roll: &mut roll, berry_guard: &mut no_berry };
        assert_eq!(status.apply_dot(DotKind::Burn, 1.0, 1.0, host(StatusRules::Wild, &water), &mut ctx), ApplyResult::Applied);
        assert_eq!(apply(&mut status, ControlKind::Paralysis, StatusRules::Wild, &water), ApplyResult::Blocked);
    }

    #[test]
    fn strong_host_freeze_is_cut_then_windowed() {
        let water = TypePair::single(PokeType::Water);
        let mut status = Status::default();
        assert_eq!(apply(&mut status, ControlKind::Freeze, StatusRules::Strong, &water), ApplyResult::Applied);
        // 2 s x 0.25 = 0.5 s
        status.tick(StatusRules::Strong, 100.0, 0.5, &mut FixedRoll(0.5));
        assert_eq!(status.major, None);
        assert_eq!(status.windows.freeze, tune::STRONG_REAPPLY_WINDOW);
        assert_eq!(apply(&mut status, ControlKind::Freeze, StatusRules::Strong, &water), ApplyResult::InWindow);
    }

    #[test]
    fn player_gets_the_hard_cc_grace() {
        let water = TypePair::single(PokeType::Water);
        let mut status = Status::default();
        apply(&mut status, ControlKind::Freeze, NO_LEADER_RULES, &water);
        status.tick(NO_LEADER_RULES, 100.0, tune::FREEZE_SECONDS, &mut FixedRoll(0.5));
        assert_eq!(status.windows.hard_cc, tune::PLAYER_HARD_CC_GRACE);
        assert_eq!(apply(&mut status, ControlKind::Sleep, NO_LEADER_RULES, &water), ApplyResult::InWindow);
    }

    #[test]
    fn toxic_ramps_one_sixteenth_per_tick() {
        let water = TypePair::single(PokeType::Water);
        let mut status = Status::default();
        let mut roll = FixedRoll(0.5);
        let mut no_berry = |_: Ailment| false;
        let mut ctx = ApplyCtx { roll: &mut roll, berry_guard: &mut no_berry };
        status.apply_dot(DotKind::Toxic, 1.0, 1.0, host(StatusRules::Wild, &water), &mut ctx);
        let first = status.tick(StatusRules::Wild, 160.0, tune::DOT_TICK_SECONDS, &mut FixedRoll(0.5));
        let second = status.tick(StatusRules::Wild, 160.0, tune::DOT_TICK_SECONDS, &mut FixedRoll(0.5));
        assert_eq!(first.map(|due| due.amount), Some(10.0));
        assert_eq!(second.map(|due| due.amount), Some(20.0));
    }

    #[test]
    fn shake_takes_a_quarter_second_and_respects_the_tap_rate() {
        let water = TypePair::single(PokeType::Water);
        let mut status = Status::default();
        apply(&mut status, ControlKind::Freeze, NO_LEADER_RULES, &water);
        assert!(status.shake(NO_LEADER_RULES));
        assert_eq!(status.shake_target().map(|target| target.seconds_left), Some(1.75));
        assert!(!status.shake(NO_LEADER_RULES), "a second tap inside 1/12 s does not count");
        assert!(!status.shake(StatusRules::Wild), "wild mons cannot shake off");
    }

    #[test]
    fn fire_thaws_ice_but_not_the_same_instant() {
        let water = TypePair::single(PokeType::Water);
        let mut status = Status::default();
        apply(&mut status, ControlKind::Freeze, StatusRules::Wild, &water);
        status.on_hit(PokeType::Fire, StatusRules::Wild);
        assert!(status.is_frozen(), "age 0 is too soon to thaw");
        status.tick(StatusRules::Wild, 100.0, 0.25, &mut FixedRoll(0.5));
        status.on_hit(PokeType::Fire, StatusRules::Wild);
        assert!(!status.is_frozen());
        assert_eq!(status.windows.freeze, tune::FREEZE_REAPPLY_WINDOW);
    }

    #[test]
    fn electric_types_are_immune_to_paralysis() {
        let electric = TypePair::single(PokeType::Electric);
        let mut status = Status::default();
        assert_eq!(apply(&mut status, ControlKind::Paralysis, StatusRules::Wild, &electric), ApplyResult::Immune);
    }
}
