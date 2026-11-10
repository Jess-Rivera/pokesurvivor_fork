/* ============ game.js — game flow and main loop ============
 *
 *   login ──> personality test ──> menu ──> run ──> summary ──> menu
 *                (first time only)        │
 *                                          ├─ Pokemon (collection)
 *                                          ├─ Upgrades
 *                                          └─ Gacha
 *
 * Loop states: 'ui' (menus, with the world in the background), 'playing',
 * 'levelup', 'paused', 'over'.
 *
 * Co-op (G.Coop.active): the host runs enemies, items and
 * experience; each one their own Pokemon. Pausing does not stop the game, the
 * level-up cards wait for everyone to pick and a downed teammate is lifted if another
 * stays next to them. See net/coop.js.
 */
G.Game = (() => {
  let cv,
    ctx,
    dpr = 1,
    w = 0,
    h = 0;
  let state = 'ui';
  let time = 0,
    last = 0,
    pendingLevels = 0,
    cardsDueAt = null; // run time the level-up cards open at (#62: after the HUD's Lv rattle settles), null while none wait
  let evBank = [0, 0, 0, 0, 0, 0]; // pokebox step 5: this run's six EV banks in thousandths (G.Copies.killEvs), reset each run
  let pl = null;
  // ---- team (Phase A) ----
  let roster = []; // up to 6 fighter Players (the Team's members); pl === runTeam.active
  let runTeam = null; // G.Team (entity model slice 2): who is on the field, the 5 s swap lock, the shared stores
  const BOMB_QUIET = 3; // s with no wild spawns after a Bomb pickup (Jeremy playtest, 2026-11-01)
  let caught = []; // shinies obtained in this run
  let biome = -1;

  const st = {
    get time() {
      return time;
    },
  };

  // ---------------- boot ----------------

  function init() {
    cv = document.getElementById('game');
    ctx = cv.getContext('2d');
    resize();
    addEventListener('resize', resize);
    G.Touch.init(cv);
    // On mobile: switching apps or turning it portrait pauses the game.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) autoPause();
    });
    G.RunUI.wirePause(() => {
      state = 'playing';
      G.UI.hideAll();
    }, quitRun);
    Backdrop.init();
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function resize() {
    // Internal resolution x1.5 at most: on x2 screens drawing double the
    // pixels was one of the most expensive things, and with pixel art you do not notice.
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    w = cv.clientWidth;
    h = cv.clientHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    G.Camera.resize(w, h, dpr);
    checkOrientation();
  }

  /** Mobile in portrait: a notice to rotate it (and pause). */
  function checkOrientation() {
    const portrait = G.Touch.active && innerHeight > innerWidth;
    const el = document.getElementById('rotate');
    if (!el) return;
    if (portrait && !document.getElementById('rotate-ico').innerHTML)
      document.getElementById('rotate-ico').innerHTML = G.Icons.html('phone', 48);
    el.classList.toggle('hidden', !portrait);
    if (portrait) autoPause();
  }

  /** Auto-pause (solo only: in a group the others continue). */
  function autoPause() {
    G.Touch.reset();
    if (state === 'playing' && !G.Coop.active) {
      state = 'paused';
      G.RunUI.showPause();
    }
  }

  /** Pause/continue (Esc or P key, or the mobile pause button). */
  let holdBy = []; // group: who is choosing a fusion (everything paused)

  function togglePause() {
    // In a group, pausing does not stop the game (the others keep playing).
    if (G.Coop.active) {
      if (state !== 'playing') return;
      if (G.UI.isOpen('scr-pause')) G.UI.hide('scr-pause');
      else {
        G.RunUI.showPause(true);
        G.Audio.sfx('pause');
      }
      return;
    }
    if (state === 'playing') {
      state = 'paused';
      if (!G.Debug.quietPauseActive()) G.RunUI.showPause(); // ?dev quiet pause (#54): freeze the frame, no menu
      G.Audio.sfx('pause');
    } else if (state === 'paused') {
      state = 'playing';
      G.UI.hideAll();
    }
  }

  // ---------------- run ----------------

  /** @param coop  { seed, host, members } for a group game */
  function startRun(coop = null) {
    G.Log.clear();
    G.Log.t = 0;
    holdBy = [];
    awayBy = null;
    openItem = null; // an item choice or queued items left by the last run never carry over
    laterItems.length = 0;
    redoUsed = false; // Re-Do available again this run
    if (G.Items.resetRun) G.Items.resetRun(); // reset the Snowball Badge counter
    const save = G.DB.save;

    G.UI.hideAll();
    G.UI.chrome(false);
    G.FX.clear();
    G.Projectiles.clear();
    G.MoveRoute.reset(); // slice 7a: gym leaders cast through G.MoveSim on both flags, so it is cleared on both
    G.EnemyMgr.clear();
    G.Pickups.clear();
    G.Spawner.reset();
    G.GymArena.reset();
    G.LeaderMemory.start(); // Leader AI slice 4: every leader starts the run knowing nothing of you (after the arena books its fight)
    G.Gym.reset();
    G.Shops.reset(); // Move Shop step 3: the first pair is due at 2:00 again
    G.Events.reset();
    G.Weather.reset();
    G.Path.clear();
    G.Hazards.clear();
    G.Silver.reset(); // Move Shop step 2: every run starts with 100 Silver, nothing carries over
    G.World.reset(coop ? coop.seed : Math.floor(Math.random() * 1e6));
    G.World.setBiome(0, true);
    biome = 0;
    time = 0;
    pendingLevels = 0;
    evBank = [0, 0, 0, 0, 0, 0];
    cardsDueAt = null;
    runReal = performance.now();
    tampered = debugDirty;

    // Build the team roster from the 6 fixed slots of save.team ({ dex, shiny } or
    // null). Empty slots are skipped, but each fighter remembers the slot it came
    // from (teamSlot, 0-5): the swap keys and the faint order work by slot number.
    G.DB.normalizeTeam(save);
    roster = [];
    save.team.forEach((t, slot) => {
      if (!t || !G.DEX_BY[t.dex]) return;
      const f = buildFighter(G.DEX_BY[t.dex], !!t.shiny && G.DB.ownsShiny(t.dex), t.uid);
      f.teamSlot = slot;
      roster.push(f);
    });
    // The Team (js/systems/team.js) links ONE store of each kind to every member, never reassigned: team stages (a buff cast by
    // one Pokemon stays on whoever is on the field until its timer runs out; only the active member runs Player.update(), so the
    // shared timers tick once per frame), team cards (slice 5b, run state only), run-tier items, dodge charges (a swap never hands
    // you fresh ones), the berry bag, and the unspent links. Slot 1 leads with the lock at 0.
    runTeam = G.Team.create(roster, carryRun);
    pl = runTeam.active;
    // F3d-2 pre-run loadout (Inventory screen): equip the team items you chose, in slot order, through the same path as a pickup.
    for (const id of G.Items.cleanLoadout(save)) if (id) equipRun(id);
    banked = { t1: 0, t10: 0 };
    caught = [];

    if (coop) {
      G.Coop.begin(coop, pl, coopApi);
      G.Social.setPlaying(true);
    }
    G.Camera.x = pl.x;
    G.Camera.y = pl.y;
    G.Camera.shake = 0;
    // Local sprite sheets: the companion and the first enemies.
    G.Sprites.preload([pl.dex], 8000, pl.shiny);
    G.Audio.music(G.BIOME_MUSIC[0]);
    // For the ranking: the server records when the game starts (anti-cheat).
    if (!coop || G.Coop.isHost) G.Ranking.runStarted(coop ? 'g' : 's');
    deathT = 0;

    state = 'playing';
  }

  function quitRun() {
    if (G.Coop.active) G.Coop.leave();
    endRun(false);
  }

  /** Build one team member (a Player) with its moves and binds applied. uid: the team slot's copy, whose IVs and
   *  nature set its stats (pokebox step 4); a missing copy plays neutral. Saved bans (save.pban) are no longer read: the Ban
   *  upgrade is retired (Move Shop step 4c R5, Jess 2026-11-05); db.js still cleans the field, so old saves load as before. */
  function buildFighter(mon, shiny, uid) {
    const perks = G.Upgrades.perks(G.DB.upgradesOf(mon.dex));
    const save = G.DB.save;
    const f = new G.Player(mon, perks, shiny, G.Copies.profileOf(save, uid, mon.dex));
    f.copyUid = uid || null; // pokebox step 5: whose copy this is, for the end-of-run EV allocation (pl.uid is co-op's)
    ((save.pbind && save.pbind[mon.dex]) || []).forEach((id, i) => {
      if (id) f.bind[id] = i;
    });
    f.addMove(G.startMoveOf(mon.dex));
    if (perks.startMoves >= 2) {
      const pool = G.Moves.poolFor(mon).filter((id) => !f.hasMove(id) && !G.MoveInfo.isBuff(id));
      if (pool.length) f.addMove(G.U.pick(pool));
      f.setActive(0);
    }
    return f;
  }

  /** The run's team copies for the EV allocation (pokebox step 5): one entry per copy, fainted members included. */
  function evTeam() {
    const seen = new Set(),
      out = [];
    for (const f of roster)
      if (f.copyUid && !seen.has(f.copyUid)) {
        seen.add(f.copyUid);
        out.push({ uid: f.copyUid, dex: f.dex, slot: f.teamSlot });
      }
    return out;
  }

  /** Living (not fainted) team members. */
  function livingRoster() {
    return roster.filter((f) => !f.dead);
  }

  /**
   * The run-shared progress the incoming member takes from the outgoing one (level/XP, kills, bosses, coins, tickets). The Team calls
   * it on every manual swap, faint swap and Re-Do. Unspent links are not copied: they are one Team store (slice 2, Jess 2026-11-06).
   */
  function carryRun(from, to) {
    to.level = from.level;
    to.xp = from.xp;
    to.xpNext = from.xpNext;
    to.kills = from.kills;
    to.bosses = from.bosses;
    to.coins = from.coins;
    to.t1 = from.t1;
    to.t10 = from.t10;
  }

  /**
   * Put roster member i on the field: 'swap' (manual, locks swapping) or 'in' (faint swap or Re-Do, clears the lock). The Team moves
   * the body (position, aim, dodge end, i-frames, carry); pl follows it here, the only place a swap changes pl.
   */
  function field(i, how) {
    if (how === 'swap') runTeam.swap(i);
    else runTeam.sendIn(i);
    pl = runTeam.active;
    G.Sprites.preload([pl.dex], 4000, pl.shiny);
  }

  /**
   * Manual swap to roster slot i. Instant, and locks swapping for a few seconds.
   */
  let swapNoteT = 0;
  function swapTo(i) {
    const why = runTeam ? runTeam.canSwap(i, state === 'playing') : 'no'; // 'ok', 'locked', 'trapped' or 'no' (G.Team)
    if (why === 'trapped') {
      // trapped (slice E1): no manual swaps until it wears off
      if (!swapNoteT || time - swapNoteT > 0.8) {
        swapNoteT = time;
        G.FX.dmgText(pl.x, pl.y - 40, 'Trapped!', G.Status.CONTROL.trap.color);
        G.Audio.sfx('hurt');
      }
    }
    if (why !== 'ok') return false;
    field(i, 'swap');
    G.Camera.shake = 0;
    G.FX.ring(pl.x, pl.y, 6, 70, '#9fe8ff', 0.4, 4);
    G.Audio.sfx('confirm');
    return true;
  }

  /** Keyboard swap: cycle prev/next (skipping fainted) and direct-to-slot. */
  function handleSwap() {
    if (roster.length < 2 || runTeam.lock > 0 || state !== 'playing' || pl.dead) return;
    // The swap input comes from the member's controller (slice 3; yours reads the keyboard), read by the Team (G.Team.requested),
    // the same for a leader's AI player.
    const j = runTeam.requested(pl.controller);
    if (j >= 0) swapTo(j);
  }

  /** All players in the game (you first). */
  function everyone() {
    return G.Coop.active ? G.Coop.players() : [pl];
  }

  /** Experience needed for the next level (locked chests). */
  function levelXp() {
    if (!pl) return 20;
    const k = (G.Coop.active ? G.Coop.xpFactor() : 1) * (pl.xpMul || 1);
    return Math.ceil((pl.xpNext - pl.xp + 1) / k);
  }

  // Full-screen flash (travel to the gym arena).
  let flashT = 0,
    flashDur = 1,
    flashCol = '#fff';
  function flash(col, dur) {
    flashCol = col;
    flashDur = dur;
    flashT = dur;
  }

  function teamState() {
    return {
      time,
      level: pl.level,
      xp: pl.xp,
      xpNext: pl.xpNext,
      kills: pl.kills,
      bosses: pl.bosses,
      coins: pl.coins,
      t1: pl.t1,
      t10: pl.t10,
    };
  }
  function summary() {
    return { t: time, ki: pl.kills, bo: pl.bosses, co: pl.coins, lv: pl.level, t1: pl.t1, t10: pl.t10 };
  }

  /** What co-op needs from the game. */
  /**
   * Collected tickets are saved as soon as you pick them up (like the shinies):
   * before, only on finishing, and if the tab closed abruptly they were lost.
   * `banked` = the ones from this game already in the saved game.
   */
  let banked = { t1: 0, t10: 0 };
  function bankTickets(save_ = true) {
    const sv = G.DB.save;
    if (!sv || !pl) return;
    sv.tickets = sv.tickets || { t1: 0, t10: 0 };
    const d1 = Math.max(0, pl.t1 - banked.t1),
      d10 = Math.max(0, pl.t10 - banked.t10);
    if (!d1 && !d10) return;
    sv.tickets.t1 += d1;
    sv.tickets.t10 += d10;
    banked = { t1: pl.t1, t10: pl.t10 };
    if (save_) G.DB.commit('run');
  }

  const coopApi = {
    team: teamState,
    summary,
    // Guest: the host sends the clock and the team's data.
    syncTeam(t) {
      if (Math.abs(t.time - time) > 0.4) time = t.time;
      if (t.level > pl.level) G.Audio.sfx('xp');
      pl.level = t.level;
      pl.xp = t.xp;
      pl.xpNext = t.xpNext;
      pl.kills = t.kills;
      pl.bosses = t.bosses;
      pl.coins = t.coins;
      if (t.t1 > pl.t1 || t.t10 > pl.t10) G.Audio.sfx('shiny');
      pl.t1 = t.t1 || 0;
      pl.t10 = t.t10 || 0;
      bankTickets();
    },
    levelStart(level) {
      // (If you had the item choice open, it returns on finishing: afterLevelUp.)
      if (state === 'choice' && openItem && G.Coop.active) G.Coop.holdEnd();
      state = 'levelup';
      G.UI.hide('scr-pause');
      G.Audio.sfx('levelup');
      G.RunUI.showLevelUp(
        level,
        G.LevelUp.offer(pl, 3, roster),
        (card, t) => {
          G.Audio.sfx('confirm');
          card.apply(pl, t && t.pl, t && t.move);
          G.Coop.localPicked();
        },
        true
      );
    },
    waiting(names) {
      G.RunUI.setWaiting(names);
    },
    resume() {
      G.RunUI.closeLevelUp();
      if (state === 'levelup') {
        state = holdBy.length ? 'held' : 'playing';
        afterLevelUp();
      }
    },
    /** Are you choosing something that stops the game (item or link)? */
    choosing() {
      return state === 'choice';
    },
    inLevelUp() {
      return state === 'levelup';
    },
    shiny(dex) {
      G.onShinyCaught({ dex, name: (G.DEX_BY[dex] || {}).name || '' });
    },
    over(d) {
      if (d)
        Object.assign(pl, {
          kills: d.ki,
          bosses: d.bo,
          coins: d.co,
          level: Math.max(pl.level, d.lv || 1),
          t1: d.t1 || pl.t1,
          t10: d.t10 || pl.t10,
        });
      if (d && d.t) time = d.t;
      if (d && d.why === 'host') G.UI.toast('El anfitrión ha terminado la partida', 3200);
      endRun(!(d && d.why === 'host'));
    },
    lost(msg) {
      G.UI.toast(msg, 3600);
      endRun(false);
    },
    item(id) {
      offerItem(id);
    },
    mateLeft() {},
    /** Group: who is choosing a fusion. While anyone is, everything is paused. */
    hold(names) {
      holdBy = names || [];
      const mine = G.UI.isOpen('scr-bond');
      if (holdBy.length) {
        if (state === 'playing') state = 'held';
        if (pl && pl.bonds > 0) offerBond(true); // if you also have a link, you choose at the same time
        const others = holdBy.filter((n) => n !== (G.Social.me && G.Social.me.name) && n !== 'Tú');
        if (!mine && others.length)
          G.Spawner.say(
            'Pausa: ' + others.join(', ') + ' ' + (others.length > 1 ? 'están eligiendo…' : 'está eligiendo…'),
            999,
            true
          );
        else if (!others.length) G.Spawner.say(awayBy ? awayText() : '', awayBy ? 999 : 0, true); // only you: no old notice
      } else {
        if (state === 'held' && !awayBy) state = 'playing';
        G.Spawner.say(awayBy ? awayText() : '', awayBy ? 999 : 0, true);
      }
    },
    /** Group (guest): the host left the tab or is not responding: everything paused. */
    away(name) {
      awayBy = name || null;
      if (awayBy) {
        if (state === 'playing') state = 'held';
        G.Spawner.say(awayText(), 999, true);
      } else if (!holdBy.length) {
        if (state === 'held') state = 'playing';
        G.Spawner.say('', 0, true);
      }
    },
  };
  let awayBy = null;
  const awayText = () => 'Pausa: esperando a ' + awayBy + ' (anfitrión)…';

  /** You took a lost Pokemon home and it joins you (events.js). */
  G.onRescue = (dex, name) => {
    if (!G.DB.save || !pl) return;
    // Always a new copy, a repeat too (pokebox 3a-2); a repeat no longer pays +150 coins. Full boxes: sold on arrival (3a-4).
    const got = G.DB.obtain(dex, false, 'rescue');
    G.DB.commit(true);
    G.Spawner.say(
      got.sold
        ? fullBoxLine(name, got.sold)
        : got.isNew
          ? '¡' + name + ' se une a tu equipo!'
          : name + ' joined your box!',
      4
    );
    G.Audio.sfx('shinyGet');
  };

  /** A wild shiny goes down: you keep it, as one shiny copy (a repeat too; it no longer pays +300 coins). */
  G.onShinyCaught = (e) => {
    if (!G.DB.save || !pl) return;
    if (G.Coop.isHost) G.Coop.shinyCaught(e);
    const got = G.DB.obtain(e.dex, true, 'wild');
    G.DB.save.stats.shinies++;
    G.DB.commit(true);
    caught.push({ dex: e.dex, isNew: got.isNew });
    G.Spawner.say(
      got.sold
        ? fullBoxLine('shiny ' + e.name, got.sold)
        : got.isNew
          ? '¡Has conseguido a ' + e.name + ' shiny!'
          : 'Another shiny ' + e.name + '! Added to your box.',
      4
    );
    G.Audio.sfx('shinyGet');
  };

  /** The run banner when every box is full (pokebox 3a-4, D3): the coins already went to the saved PokeCoins. */
  const fullBoxLine = (name, coins) =>
    `Your boxes are full: ${name} was sold for ${coins.toLocaleString('en-US')} PokéCoins.`;

  function endRun(dead = true) {
    if (state === 'over' || !pl) return;
    const coop = !!pl.uid; // only group games give it a uid
    const wasHost = !!pl.coopHost;
    const team = coop ? G.Coop.members.slice() : [];
    if (G.Coop.active) G.Coop.end();
    if (coop) G.Social.setPlaying(false);
    state = 'over';
    G.LeaderMemory.end(); // Leader AI slice 4: what the leaders remembered of you dies with the run, never saved
    G.Audio.music(null);
    G.Audio.sfx(dead ? 'gameover' : 'back');
    const save = G.DB.save;
    const mul = pl.coinMul;
    const parts = {
      tiempo: Math.floor(time / 5),
      derrotados: Math.floor(pl.kills * 0.25),
      jefes: pl.bosses * 80,
      recogidas: pl.coins,
    };
    const coins = Math.round((parts.tiempo + parts.derrotados + parts.jefes + parts.recogidas) * mul);
    const record = time > save.stats.bestTime;

    save.coins += coins;
    bankTickets(false);
    save.stats.runs++;
    save.stats.totalKills += pl.kills;
    save.stats.bestTime = Math.max(save.stats.bestTime, Math.floor(time));
    if (coop) save.stats.bestGroupTime = Math.max(save.stats.bestGroupTime || 0, Math.floor(time));
    save.stats.bestLevel = Math.max(save.stats.bestLevel, pl.level);
    save.stats.coinsEarned += coins;
    G.Progress.event('runEnd', { time, level: pl.level, coins: pl.coins, types: pl.mon.types, group: coop });
    G.Progress.checkAch();
    // To the cloud on finishing the game (at most every 30 min); if the record enters
    // a top (today, week or month), right away (below, after submitting it to the ranking).
    G.DB.commit('run');
    if (G.Social.me) G.Social.publishProfile();

    // Ranking: solo everyone their own; in a group the host submits it.
    const mark = { t: Math.floor(time), lv: pl.level, kills: pl.kills };
    // If the game was tampered with (see clean()), it does not go to the ranking (silently); everything else does.
    const ok = clean();
    const sent =
      ok && !coop
        ? G.Ranking.submitSolo(Object.assign(mark, { dex: pl.dex, shiny: pl.shiny }))
        : ok && wasHost
          ? G.Ranking.submitGroup(Object.assign(mark, { members: team }))
          : null;
    if (sent)
      sent
        .then((b) => {
          if (b && b.some((p) => p !== 'a')) G.DB.commit(true);
        })
        .catch(() => {});

    // Pokebox step 5: the run's EV banks and the team's copies, for the allocation screen. Co-op allocates nothing (deferred).
    const evs = coop ? null : { bank: evBank.slice(), team: evTeam() };
    G.RunUI.showOver(
      {
        dead,
        time,
        level: pl.level,
        kills: pl.kills,
        bosses: pl.bosses,
        coins,
        record,
        t1: pl.t1,
        t10: pl.t10,
        moves: pl.moves,
        roster,
        caught,
        evs,
        breakdown:
          Object.entries(parts)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k} ${v}`)
            .join(' · ') + (mul > 1 ? ` · ×${mul.toFixed(2)} Fortuna` : ''),
      },
      () => {
        pl = null;
        G.Flow.afterRun();
      }
    );
  }

  /*
   * Clean game? Only things no legal player can do, with
   * huge margins (the 10-10 system gave false positives):
   *   - the game clock runs faster than real time (speed cheats)
   *   - your Pokemon's functions replaced (that is how you make yourself invincible)
   *   - health, attack, speed or cooldown far above what is possible
   *   - the test functions were used (skip the clock...)
   * If anything trips, that game does not go to the ranking (silently) and nothing more.
   */
  let runReal = 0,
    tampered = false,
    debugDirty = false;
  function clean() {
    if (tampered) return false;
    if (time > (performance.now() - runReal) / 1000 + 10) return false;
    for (const k of ['hurt', 'update', 'heal', 'gainXp']) if (Object.prototype.hasOwnProperty.call(pl, k)) return false;
    if (!isFinite(pl.hp) || !isFinite(pl.maxHp) || pl.hp > pl.maxHp + 1 || pl.maxHp > 50000) return false;
    if (pl.atkMul > 2000 || pl.spdMul > 25 || pl.cdMul < 0.03 || pl.level > 20 + time / 3) return false;
    return true;
  }

  // ---------------- level up ----------------

  // #62 (Jess, 2026-11-10): a gained level first rattles the Lv number on the HUD while you keep playing; the cards open
  // once it settles (the 0.6 s rattle in css/hud-overlay.css, then half a second). Run time, so a pause holds the wait.
  // Levels still queued after a pick open straight on.
  const LEVEL_CARDS_DELAY = 1.1;

  function maybeLevelUp() {
    if (pendingLevels <= 0 || state !== 'playing') return;
    if (G.Coop.active) {
      // In a group, the cards appear at once for everyone and it waits for them to pick.
      if (G.Coop.players().every((p) => p.dead)) return;
      pendingLevels--;
      G.Coop.levelStart(pl.level);
      return;
    }
    // Never open cards with the Pokemon down (dying and picking up XP in the same frame).
    if (pl.dead) return;
    if (cardsDueAt === null) cardsDueAt = time + LEVEL_CARDS_DELAY;
    if (time < cardsDueAt) return;
    const cards = G.LevelUp.offer(pl, 3, roster);
    pendingLevels--;
    cardsDueAt = pendingLevels > 0 ? time : null; // a queued level opens next, with no second wait
    // Nothing left to offer (every move maxed, slots full): skip the screen so the run cannot soft-lock.
    if (!cards.length) return;
    state = 'levelup';
    G.Audio.sfx('levelup');
    G.RunUI.showLevelUp(pl.level, cards, (card) => {
      G.Audio.sfx('confirm');
      card.apply(pl);
      state = 'playing';
    });
    // confetti from the popup's top corners; it fades out over 1 s once the screen closes (js/ui/confetti.js)
    if (G.Confetti) G.Confetti.burstFrom('scr-levelup');
  }

  // ---------------- links ----------------

  /**
   * A gym win's link: you choose which moves fuse.
   * If it cannot happen now (there are not two free), it is held until you learn
   * another move. It is checked every frame: if another screen covers it (group
   * level cards, pause), it shows again on closing it.
   * @param quiet  do not warn if it still cannot happen
   */
  function offerBond(quiet = false) {
    if (!pl || pl.bonds <= 0 || pl.dead || (state !== 'playing' && state !== 'held') || G.GymArena.inArena) return;
    if (['scr-bond', 'scr-pause', 'scr-item', 'scr-levelup', 'scr-shop'].some(G.UI.isOpen)) return; // a shop holds it back until you leave
    // The link belongs to the team: any living member that can bond now may take it (picked on the screen).
    const choices = roster.filter((f) => !f.dead).map((f) => ({ f, opt: f.bondOptions() }));
    if (!choices.some((c) => c.opt)) {
      if (!quiet) G.Spawner.say('Guardas el vínculo: aprende otro movimiento para usarlo', 3, true);
      return;
    }
    // The game stops; in a group, for everyone until each one picks (G.Coop.holdStart).
    state = 'choice';
    if (G.Coop.active) G.Coop.holdStart();
    G.Audio.sfx('levelup');
    G.RunUI.showBond(choices, (f, opt, picked) => {
      const left = Math.max(0, pl.bonds - 1);
      const group = f.fuse(picked, opt.group);
      pl.bonds = left; // fuse() spends the chosen member's copy; the live count is the one on the field
      G.Audio.sfx('legend');
      G.FX.ring(pl.x, pl.y, 8, 130, '#ff8ad8', 0.8, 6);
      G.FX.burst(pl.x, pl.y - pl.bodyH * 0.5, '#ffb3e6', 40, 240);
      G.Spawner.say('¡Vínculo! ' + group.length + ' movimientos a la vez', 2.6, true);
      if (state === 'choice') state = holdBy.length ? 'held' : 'playing';
      if (G.Coop.active) G.Coop.holdEnd();
    });
  }

  // ---------------- Move Shop (step 4) ----------------

  /**
   * Walking into a shop (js/systems/shops.js) opens its screen (js/ui/shop-ui.js) and pauses the run, like the bond screen.
   * It never opens over another screen: false, so the visit is not used up and it tries again next frame. On Leave the run
   * goes on; a held bond that a purchase made usable opens on the next frame (offerBond, as today).
   */
  function openShop(shop) {
    if (!pl || pl.dead || state !== 'playing' || G.Coop.active) return false;
    if (['scr-bond', 'scr-pause', 'scr-item', 'scr-levelup', 'scr-shop'].some(G.UI.isOpen)) return false;
    state = 'choice';
    G.Audio.sfx('confirm');
    G.ShopUI.open(shop, () => {
      if (state === 'choice') state = 'playing';
    });
    return true;
  }

  // ---------------- pickup ----------------

  const PICK_SFX = {
    xp: 'xp',
    xpBig: 'xp',
    coin: 'coin',
    heal: 'heal',
    bomb: 'break',
    magnet: 'confirm',
    ticket: 'shiny',
    ticket10: 'legend',
    item: 'legend',
    ground: 'heal',
  };

  /*
   * Co-op: the item choice and the level cards cannot cover each other.
   * If an item arrives with the cards open, it waits for you to pick a card; and if
   * the cards arrive with the item choice open, it shows again on
   * finishing. (Before, one closed the other, no one could finish choosing and the
   * game stayed stuck for everyone.)
   */
  let openItem = null; // { held, next, take, run, lock } unfinished item choice
  const laterItems = []; // items picked up while the level cards or another item choice were open, offered one at a time
  function afterLevelUp() {
    if (state !== 'playing' && state !== 'held') return;
    if (openItem && !G.UI.isOpen('scr-item')) {
      const o = openItem;
      if (o.mine) {
        state = 'choice';
        if (G.Coop.active) G.Coop.holdStart();
      }
      G.RunUI.showItemChoice(o.next, o.held, o.take, o.run, o.lock);
      return;
    }
    if (laterItems.length) offerItem(laterItems.shift());
  }

  /**
   * Run tier: put `id` on the whole team (on() for EVERY roster member), optionally replacing `replace` first.
   * Pokemon-tier items never come through here (they live on one Pokemon, pl.equip).
   */
  function equipRun(id, replace) {
    const list = pl.runItems;
    if (replace) {
      const i = list.indexOf(replace);
      if (i >= 0) {
        for (const f of roster) G.Items.BY[replace].off(f);
        list.splice(i, 1);
      }
    }
    // Group exclusion (F3c Power Stones, group 'stone'): only one item of a group may be held at once.
    // Equipping another of the same group removes the one already carried.
    const grp = G.Items.BY[id].group;
    if (grp) {
      for (let i = list.length - 1; i >= 0; i--) {
        const held = G.Items.BY[list[i]];
        if (held && held.group === grp) {
          for (const f of roster) held.off(f);
          list.splice(i, 1);
        }
      }
    }
    for (const f of roster) G.Items.BY[id].on(f);
    list.push(id);
    if (G.Log.on) G.Log.item(id, list.length);
  }

  /**
   * You picked up an item. Pokemon tier: it goes to the ACTIVE Pokemon, and if that Pokemon already holds one you choose.
   * Run tier: it takes a free run slot; with the grid full (or a same-group clash, e.g. a second Stone) the chooser asks which held item it replaces,
   * or Leave it. Ground-tier items never come through here.
   */
  function offerItem(id) {
    const def = pl && G.Items.BY[id];
    if (!def) return;
    // An item choice already open also queues: a second one would overwrite it and leave the game paused with no screen.
    if (state === 'levelup' || G.UI.isOpen('scr-levelup') || openItem || G.UI.isOpen('scr-item')) {
      laterItems.push(id);
      return;
    }
    const run = def.tier === 'run';
    // F3d-2: finding a team item unlocks it for good (pre-run loadout), even if you then choose Leave it.
    if (run && G.Items.unlock(G.DB.save, id)) {
      G.DB.commit();
      G.Spawner.say('Team item unlocked: ' + def.name, 3, true);
    }
    const owned = run ? pl.runItems : [pl.item];
    if (owned.includes(id)) {
      G.Spawner.say('You already hold ' + def.name, 2, true);
      return;
    }
    // What the new item could replace. Run tier: nothing while a slot is free, except a same-group item (a second Stone),
    // which can ONLY replace the one already held (lock). Pokemon tier: the Pokemon's current item.
    let held,
      lock = null;
    if (run) {
      const clash = def.group ? pl.runItems.find((r) => G.Items.BY[r] && G.Items.BY[r].group === def.group) : null;
      const full = pl.runItems.length >= G.Items.runSlots(G.DB.save);
      if (clash) {
        held = pl.runItems.slice();
        lock = clash;
      } else if (full) held = pl.runItems.slice();
      else held = [];
    } else held = pl.item ? [pl.item] : [];
    let mine = false; // this choice is the one that stopped the game
    // replace: the id being swapped out (null = Leave it). With a free slot it is undefined and the item is simply taken.
    const take = (replace) => {
      openItem = null;
      if (replace !== null) {
        if (run) equipRun(id, replace);
        else pl.equip(id);
        G.Spawner.say(run ? 'Picked up ' + def.name + '!' : pl.mon.name + ' got ' + def.name + '!', 2.6, true);
        G.Progress.event('item', { id });
      }
      if (!mine) {
        afterLevelUp();
        return;
      }
      if (state === 'choice') state = holdBy.length ? 'held' : 'playing';
      if (G.Coop.active) G.Coop.holdEnd();
      afterLevelUp();
    };
    if (!held.length) {
      take(undefined);
      return;
    }
    // The game stops while you choose; in a group, for everyone (as with the
    // fusions). Before, in a group it continued and you got hit while choosing.
    if (state === 'playing' || state === 'held') {
      mine = true;
      state = 'choice';
      if (G.Coop.active) G.Coop.holdStart();
    }
    openItem = {
      held,
      next: id,
      take,
      run,
      lock,
      get mine() {
        return mine;
      },
    };
    G.RunUI.showItemChoice(id, held, take, run, lock);
  }

  /** @param who  who picked it up (in co-op it can be a teammate) */
  function onCollect(p, who = pl) {
    const mine = who === pl;
    if (G.Coop.active && !G.Coop.isHost) {
      // Copy of a host's item: the host decides the effect.
      if (mine) G.Audio.sfx(PICK_SFX[p.kind]);
      return;
    }
    if (G.Coop.active) G.Coop.collected(p, who);
    if (mine || p.kind === 'bomb') G.Audio.sfx(PICK_SFX[p.kind]);
    if (p.kind === 'xp' || p.kind === 'xpBig') {
      const before = pl.level;
      const coopK = G.Coop.active ? G.Coop.xpFactor() : 1;
      pendingLevels += pl.gainXp(p.value * coopK);
      if (G.Log.on) G.Log.xp(p.value, coopK, pl.xpMul, before, pl.level, pl.xp, pl.xpNext);
      // Keep benched teammates' level/maxHp in sync with the shared run level, so a
      // swap-in isn't carrying a stale level-1 maxHp (the active fighter already
      // recomputed inside gainXp). Preserves each teammate's current-hp fraction.
      if (pl.level !== before) for (const f of roster) if (f !== pl) f.syncLevel(pl.level);
      return;
    }
    if (p.kind === 'coin') {
      pl.coins += p.value;
      G.FX.dmgText(who.x, who.y - who.bodyH - 6, '+' + p.value, '#ffd23f');
      return;
    }
    if (p.kind === 'item') {
      if (mine) offerItem(p.value);
      return;
    }
    if (p.kind === 'ground') {
      // Ground item: applied to the team at once (the active Pokemon touched it); nothing is stored. Co-op copies are the host's call, as with heal.
      if (mine) G.Grounds.apply(pl, p.value);
      return;
    }
    if (p.kind === 'ticket' || p.kind === 'ticket10') {
      if (p.kind === 'ticket') pl.t1++;
      else pl.t10++;
      bankTickets();
      G.FX.dmgText(
        who.x,
        who.y - who.bodyH - 8,
        p.kind === 'ticket' ? '+1 Pokeball' : 'Master Ball!',
        p.kind === 'ticket' ? '#ffd23f' : '#d9a6ff',
        true
      );
      G.FX.ring(who.x, who.y, 6, 50, p.kind === 'ticket' ? '#ffd23f' : '#c47bff', 0.4, 3);
      return;
    }
    if (p.kind === 'heal') {
      if (mine) pl.heal(pl.maxHp * 0.3);
      G.FX.ring(who.x, who.y, 6, 60, '#5fe08a', 0.4, 3);
      return;
    }
    if (p.kind === 'magnet') {
      G.Pickups.pullAll();
      G.FX.ring(who.x, who.y, 10, 420, '#ff9ed8', 0.6, 4);
      return;
    }
    if (p.kind === 'bomb') {
      if (G.U.dist2(who.x, who.y, pl.x, pl.y) < 500 * 500) G.Camera.kick(0.8);
      const R = G.Camera.outerRadius();
      G.FX.ring(who.x, who.y, 20, R, '#ff7b3d', 0.5, 6);
      // A screen clear: every wild enemy in view falls (shield and all); bosses, gym leaders and elites only take the old blast.
      for (const e of G.EnemyMgr.all()) {
        if (mine ? !G.Camera.sees(e.x, e.y, 0) : G.U.dist2(e.x, e.y, who.x, who.y) > R * R) continue;
        const tough = e.boss || e.gym || e.elite;
        e.takeFlat(tough ? 60 + pl.level * 14 : e.hp + (e.shield || 0) + 1, '#ff7b3d', e.x - who.x, e.y - who.y, 160);
      }
      G.Spawner.quiet(BOMB_QUIET);
    }
  }

  // ---------------- keyboard ----------------

  function handleKeys() {
    if (G.SettingsUI.isOpen) {
      if (G.Input.tap('escape')) G.SettingsUI.close();
      return;
    }
    if (state === 'levelup') {
      G.RunUI.levelKeys();
      return;
    }
    if (G.UI.isOpen('scr-shop')) {
      G.ShopUI.keys();
      return;
    }
    if (G.UI.isOpen('scr-bond')) {
      // Pokemon step: the team keys (1 to 6); move steps: the attack keys.
      const mon = G.RunUI.bondPickingMon();
      for (let i = 0; i < (mon ? 6 : 4); i++) {
        if (G.Input.action((mon ? 'swap_' : 'attack_') + (i + 1))) G.RunUI.pickBond(i);
      }
      return;
    }
    if (G.UI.isOpen('scr-item')) {
      for (let i = 0; i < 4; i++) if (G.Input.action('attack_' + (i + 1))) G.RunUI.itemKey(i);
      if (G.Input.tap('enter')) G.RunUI.itemConfirm();
      return;
    }
    if (state === 'ui') {
      // Esc on a menu subscreen returns to the menu. (Upgrades handles its own Esc: it goes back to the Team screen.)
      if (
        G.Input.tap('escape') &&
        !G.UI.isOpen('scr-profile') &&
        ['scr-dex', 'scr-inventory', 'scr-gacha', 'scr-friends', 'scr-rank', 'scr-goals'].some(G.UI.isOpen) &&
        document.getElementById('pull-fx').classList.contains('hidden')
      )
        G.MenuUI.open();
      return;
    }
    if (G.Input.action('pause')) {
      togglePause();
      return;
    }
    if (state === 'paused' || state === 'over') {
      G.RunUI.pauseKeys();
      return;
    } // the summary sheet's keys (solo pause, end-of-run team view)
    if (state !== 'playing' || !pl) return;
    // Move slots (slice 3, D4): the member's controller lists the slot keys and cycle keys that went down this frame, in key order.
    pl.takeSlotInput();
  }

  // ---------------- loop ----------------

  let deathT = 0;
  let redoUsed = false; // Re-Do run item: spent once per run (reset in startRun)

  let frameDt = 0,
    speedK = 1;
  let fpsShown = 60,
    fpsAcc = 0,
    fpsN = 0;
  // The next frame is requested BEFORE anything else: if something fails midway, the
  // game continues (before it would freeze forever and you had to reload;
  // that is how a huge game was lost once).
  // If it fails frame after frame (the game no longer advances or renders), the
  // game is considered over at ~3 s and is saved: time, defeated,
  // records and ranking. Better that than a black screen and losing everything.
  let loopErrs = 0,
    errRun = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    try {
      frame(ts);
      errRun = 0;
    } catch (e) {
      if (loopErrs++ < 5) console.error('[Game] frame failure:', e);
      G.Input.endFrame();
      if (++errRun === 180 && pl && state !== 'ui' && state !== 'over') {
        try {
          G.UI.hideAll();
          quitRun();
          G.UI.toast('El juego ha fallado: tu partida se ha guardado hasta aquí', 5000);
        } catch (e2) {
          console.error('[Game] could not close the game:', e2);
        }
      }
    }
  }

  function frame(ts) {
    const real = (ts - last) / 1000 || 0;
    const dt = Math.min(1 / 30, real) * speedK; // the 1/30 cap: move-effects.js SLIDE (pull clamp) assumes it
    last = ts;
    if (state === 'playing') G.Settings.sample(real);
    fpsAcc += real;
    fpsN++;
    if (fpsAcc >= 0.5) {
      fpsShown = Math.round(fpsN / fpsAcc);
      fpsAcc = 0;
      fpsN = 0;
    }
    frameDt = state === 'playing' ? dt : 0;

    handleKeys();

    if (state === 'playing') update(dt);
    else if (pl && state !== 'ui') {
      G.FX.update(dt * 0.25);
      pl.anim.update(dt * 0.25);
    }
    // The network is always serviced (even with the level cards open).
    if (G.Coop.active && pl && state !== 'ui' && state !== 'over') G.Coop.tick(dt);

    if (pl && state !== 'ui') render();
    else Backdrop.render(ctx, w, h, dpr, dt);
    G.HudOverlay.sync(!!pl && state !== 'ui'); // #64: the HTML HUD reads the frame just drawn
    G.UI.tick(dt);

    G.Input.endFrame();
  }

  function update(dt) {
    const coop = G.Coop.active;
    if (flashT > 0) flashT -= dt;
    // After going down, let the Faint animation play before the summary.
    if (pl.dead && !coop) {
      // Team: if another member is still up, bench the fainted one and swap in the
      // living member with the LOWEST slot number (slot 1 first, then 2, and so on).
      const alive = roster.filter((f) => !f.dead && f !== pl);
      if (alive.length) {
        if (G.Log.on) G.Log.redo(pl.runItems.includes('redo'), redoUsed, roster.length, alive.length, 0);
        field(runTeam.nextOnFaint(), 'in'); // clears the swap lock
        deathT = 0;
        G.FX.ring(pl.x, pl.y, 8, 90, '#ff8a96', 0.5, 5);
        G.Audio.sfx('shiny');
        G.Spawner.say(pl.mon.name + ' enters the fight!', 2, true);
        return;
      }
      // Re-Do (F3c run item): on the final faint, revive the WHOLE team to full HP, once per run.
      if (pl.runItems.includes('redo') && !redoUsed) {
        redoUsed = true;
        if (G.Log.on) G.Log.redo(true, false, roster.length, 0, 1);
        const reviveIdx = runTeam.activeIdx; // the Pokemon that just fainted (the final faint); resume on it, not slot 1
        for (const f of roster) {
          f.revive(1);
        } // revive(frac): 1 = full HP
        field(reviveIdx, 'in'); // clears the swap lock
        deathT = 0;
        G.FX.ring(pl.x, pl.y, 10, 120, '#ffe08a', 0.7, 6);
        G.Audio.sfx('shiny');
        G.Spawner.say('Re-Do! The team is revived!', 2.4, true);
        return;
      }
      // Whole team down: play the faint beat, then end the run.
      if (G.Log.on && deathT === 0) G.Log.redo(pl.runItems.includes('redo'), redoUsed, roster.length, 0, 2);
      deathT += dt;
      pl.update(dt);
      G.EnemyMgr.update(dt * 0.3, pl);
      G.FX.update(dt);
      G.Camera.follow(pl.x, pl.y, dt);
      if (deathT > 1.3) {
        deathT = 0;
        endRun(true);
      }
      return;
    }
    time += dt;
    G.Log.t = time;
    if (G.Log.on) G.Log.sample();
    runTeam.tickLock(dt);
    handleSwap();
    pl.shakeStep(dt); // Shake off (slice E1), or the accessibility auto shake (E2e): one path for every Player entity (#43)

    const b = Math.floor(time / 240);
    if (b !== biome && !G.GymArena.inArena) {
      biome = b;
      G.World.setBiome(b);
      G.Audio.sfx('biome');
      G.Spawner.say('— ' + G.World.biomeName() + ' —', 3);
      G.FX.ring(pl.x, pl.y, 10, G.Camera.outerRadius(), '#ffffff', 0.7, 6);
    }

    pl.frozen = coop && (G.UI.isOpen('scr-pause') || G.UI.isOpen('scr-item'));
    pl.update(dt);
    // Benched teammates (slice E2b): statuses, DoT and stage drops keep ticking, so a poisoned or burning one can faint on the bench.
    runTeam.benchTick(dt, (f) => {
      G.UI.toast(f.mon.name + ' fainted on the bench!', 3200, 'bad');
      G.Audio.sfx('faint');
    });
    if (coop) {
      for (const p of G.Coop.puppets()) p.netUpdate(dt);
      if (pl.dead) reviveTick(dt);
    }
    G.Camera.follow(pl.x, pl.y, dt);
    G.World.update(dt, G.Camera);

    const all = everyone();
    if (!coop || G.Coop.isHost) {
      G.Path.update(dt, all);
      G.Spawner.update(dt, all, time);
    } else G.Spawner.tickBanner(dt);
    G.EnemyMgr.update(dt, all);
    G.EnemyMgr.rebuildGrid();
    pl.tickSlotLock(dt); // the slot hold, after the body and before your sim pass (a leader's runs at the same point of its frame, #43)
    G.MoveRoute.tick(dt, pl, time); // the player's moves and gym leaders' casts run in G.MoveSim (slice 7b flip)
    G.Projectiles.update(dt, pl, G.EnemyMgr.all());
    G.Combat.resolve(dt, pl, time);
    G.Pickups.update(dt, all, onCollect);
    G.Hazards.update(dt);
    G.Interact.update(dt, pl);
    G.GymArena.update(dt, pl, time);
    G.Shops.update(dt, pl, time); // Move Shop step 3: the buildings on the map
    if (!coop || G.Coop.isHost) G.Gym.update(dt, pl, time);
    G.Events.update(dt, all, time);
    G.Weather.update(dt, time, pl);
    G.FX.update(dt);

    G.Audio.music(
      G.GymArena.inArena ? 'gym' : G.EnemyMgr.bossAlive() ? 'boss' : G.BIOME_MUSIC[biome % G.BIOME_MUSIC.length]
    );
    if (!coop || G.Coop.isHost) maybeLevelUp();
    if (pl.bonds > 0) offerBond(true);
    if (G.Coop.isHost) checkAllDown(dt);
  }

  /** Down in a group: a teammate next to you lifts you back up. */
  function reviveTick(dt) {
    const helper = G.Coop.puppets().some((p) => !p.dead && G.U.dist2(p.x, p.y, pl.x, pl.y) < 56 * 56);
    pl.reviveT = helper ? (pl.reviveT || 0) + dt : Math.max(0, (pl.reviveT || 0) - dt * 0.5);
    if (pl.reviveT >= G.Player.REVIVE_TIME) pl.revive(0.5);
  }

  /** Host: if you all go down, it ends (after seeing the last one fall). */
  function checkAllDown(dt) {
    if (G.GymArena.inArena || !G.Coop.players().every((p) => p.dead)) {
      deathT = 0;
      return;
    }
    deathT += dt;
    if (deathT > 1.6) {
      deathT = 0;
      G.Coop.over(summary());
      endRun(true);
    }
  }

  // ---------------- drawing ----------------

  function drawScene(cam, extra) {
    const t = performance.now() / 1000;
    G.World.drawGround(ctx, cam);
    G.World.drawLiquid(ctx, cam, t);
    G.Hazards.draw(ctx);
    G.MoveRender.drawGround(ctx); // slice 7a: on both flags (gym leaders' shapes)
    G.Pickups.draw(ctx);

    // Everything with "feet" is sorted by Y: objects, enemies, player.
    const items = [];
    // The flat ones (springs, traps) always below everything else.
    for (const p of G.World.visibleProps(cam)) items.push({ y: p.flat ? p.y - 4000 : p.y, prop: p });
    for (const e of G.EnemyMgr.drawables(cam)) items.push({ y: e.y, ent: e });
    for (const e of extra) items.push({ y: e.y, ent: e });
    const gate = G.GymArena.drawable();
    if (gate) items.push({ y: gate.y, ent: gate });
    for (const s of G.Shops.drawables()) items.push({ y: s.y, ent: s });
    if (pl && state !== 'ui') for (const d of G.Events.drawables()) items.push({ y: d.y, ent: d });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.prop) G.World.drawProp(ctx, it.prop, t);
      else it.ent.draw(ctx);
    }
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    ctx.scale(G.Camera.scale, G.Camera.scale);
    G.Camera.apply(ctx);
    drawScene(G.Camera, G.Coop.active ? [pl, ...G.Coop.puppets()] : [pl]);
    G.Projectiles.draw(ctx);
    G.MoveRender.drawAir(ctx);
    G.FX.draw(ctx);
    ctx.restore();

    G.Weather.draw(ctx, w, h, frameDt);
    G.World.drawVignette(ctx, w, h);
    // Fog: the vignette closes in a bit (without covering the center).
    const fog = G.Weather.vignette;
    if (fog > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.62);
      g.addColorStop(0, 'rgba(200,205,220,0)');
      g.addColorStop(1, `rgba(200,205,220,${0.45 * fog})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    G.HUD.draw(ctx, w, h, pl, st);
    G.Touch.draw(ctx);
    if (G.Settings.get('fps')) {
      ctx.save();
      ctx.font = '700 11px GameFont, monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = fpsShown >= 50 ? '#5fe08a' : fpsShown >= 30 ? '#ffd23f' : '#ff5f6d';
      ctx.fillText(fpsShown + ' FPS', w - 10, h - 8);
      ctx.restore();
    }
    if (flashT > 0) {
      ctx.save();
      // "Less flashing": the screen flash stays at a third.
      ctx.globalAlpha = Math.min(1, (flashT / flashDur) * 1.4) * (G.Settings.get('calm') ? 0.3 : 1);
      ctx.fillStyle = flashCol;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  // ---------------- menu background ----------------

  /**
   * The real world, with wild Pokemon strolling and the camera drifting.
   * This way the menu shows from the first second what the game looks like.
   */
  const Backdrop = (() => {
    let wanderers = [],
      t = 0,
      ready = false,
      biomeT = 0,
      bi = 0;
    const CAST = [1, 4, 7, 25, 133, 52, 39, 35, 16, 43, 60, 69, 74, 92, 129, 147, 113, 143, 54, 79];

    function init() {
      G.World.reset(4242);
      G.World.setBiome(0, true);
      G.Camera.x = 0;
      G.Camera.y = 0;
      wanderers = CAST.map((dex) => spawn(dex, true));
      ready = true;
    }

    function spawn(dex, anywhere) {
      const a = new G.Sprites.Animator(dex, 1);
      const r = G.Sprites.bodyRadius(dex);
      let x = 0,
        y = 0;
      for (let i = 0; i < 20; i++) {
        x = G.Camera.x + G.U.rand(-1, 1) * (anywhere ? G.Camera.w * 0.6 : G.Camera.w * 0.7);
        y = G.Camera.y + G.U.rand(-1, 1) * (anywhere ? G.Camera.h * 0.6 : G.Camera.h * 0.7);
        if (G.World.isFree(x, y, r)) break;
      }
      return {
        dex,
        anim: a,
        x,
        y,
        r,
        vx: 0,
        vy: 0,
        t: 0,
        draw(ctx) {
          G.Sprites.drawShadow(ctx, this.dex, this.x, this.y);
          this.anim.draw(ctx, this.x, this.y);
        },
      };
    }

    function step(dt) {
      t += dt;
      G.World.update(dt, G.Camera);
      // Slow camera drift.
      G.Camera.x += Math.cos(t * 0.05) * 14 * dt;
      G.Camera.y += Math.sin(t * 0.037) * 10 * dt;
      G.Camera.follow(G.Camera.x, G.Camera.y, dt);

      biomeT += dt;
      if (biomeT > 30) {
        biomeT = 0;
        bi = (bi + 1) % 3;
        G.World.setBiome(bi);
      }

      for (const wd of wanderers) {
        wd.t -= dt;
        if (wd.t <= 0) {
          // Strolls, stops or "attacks" the air now and then.
          wd.t = G.U.rand(1, 3.5);
          const r = Math.random();
          if (r < 0.55) {
            const a = Math.random() * 6.2832,
              s = G.U.rand(25, 55);
            wd.vx = Math.cos(a) * s;
            wd.vy = Math.sin(a) * s;
          } else {
            wd.vx = wd.vy = 0;
            if (r > 0.85) wd.anim.play(G.U.pick(['Attack', 'Shoot', 'Charge']));
          }
        }
        wd.x += wd.vx * dt;
        wd.y += wd.vy * dt;
        G.World.collide(wd);
        const moving = Math.abs(wd.vx) + Math.abs(wd.vy) > 1;
        if (moving) wd.anim.dir = G.Sprites.dirFromAngle(Math.atan2(wd.vy, wd.vx));
        wd.anim.loop(moving ? 'Walk' : 'Idle');
        wd.anim.update(dt);
        // If it ends up off-camera, it reappears inside.
        if (!G.Camera.sees(wd.x, wd.y, 120)) Object.assign(wd, spawn(wd.dex, false));
      }
    }

    function render(ctx, w, h, dpr, dt) {
      if (!ready) return;
      step(dt);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      ctx.scale(G.Camera.scale, G.Camera.scale);
      G.Camera.apply(ctx);
      drawScene(G.Camera, wanderers);
      ctx.restore();
      G.World.drawVignette(ctx, w, h);
    }

    /** On returning from a run, it restores the menu world. */
    function restore() {
      G.World.reset(4242);
      G.World.setBiome(bi, true);
      G.FX.clear();
      G.Projectiles.clear();
      G.EnemyMgr.clear();
      G.Pickups.clear();
      G.MoveRoute.reset();
      wanderers = CAST.map((dex) => spawn(dex, true));
    }

    return { init, render, restore };
  })();

  return {
    init,
    startRun,
    everyone,
    levelXp,
    flash,
    offerBond,
    openShop,
    /** Pokebox step 5: a defeated enemy adds its EV yield to the run's banks (enemy.js, the dead-enemy loop). */
    evKill(e) {
      const add = G.Copies.killEvs(e);
      for (let k = 0; k < 6; k++) evBank[k] += add[k];
    },
    /** The run's six EV banks, in thousandths (a copy). G.Debug.evbank sets them. */
    get evBank() {
      return evBank.slice();
    },
    set evBank(v) {
      if (Array.isArray(v) && v.length === 6) evBank = v.map((x) => Math.max(0, Math.round(+x) || 0));
    },
    /** Badge package: queue n guaranteed level-ups (not a debug call, so the run is NOT flagged). */
    grantLevels(n = 1) {
      for (let i = 0; i < n; i++) {
        const before = pl.level;
        pendingLevels += pl.gainXp((pl.xpNext - pl.xp + 0.001) / (pl.xpMul || 1));
        if (pl.level !== before) for (const f of roster) if (f !== pl) f.syncLevel(pl.level);
      }
    },
    /** Badge package: a run-long +pct on a stat for EVERY team member, benched ones included. */
    badgeBoost(stat, pct) {
      for (const f of roster) f.addBadgeBoost(stat, pct);
    },
    /** Badge package: every team member back to 100% HP, fainted ones included. */
    reviveTeam() {
      for (const f of roster) {
        if (f.dead) f.revive(1);
        else {
          f.hp = f.maxHp;
          f.clearEffects();
        }
      } // full revive: 100% HP and a clean slate (slice E2b)
    },
    /** For testing: skip the run clock. */
    debugTime(t) {
      tampered = true;
      time = t;
    },
    /** For recording videos: slow motion (0.5 = half speed). */
    debugSpeed(k) {
      if (k > 1) tampered = true;
      speedK = k;
    },
    togglePause,
    /** Abandons the game in progress (e.g. on signing out from Settings). */
    quit() {
      if (state !== 'ui' && state !== 'over') quitRun();
    },
    /** For recording videos: opens the level-up cards. */
    debugLevelUp() {
      tampered = true;
      pl.level++;
      pendingLevels++;
    },
    /** Debug sandbox (G.Debug.maxAll): permanently flag this session's runs out of the ranking. */
    debugMaxed() {
      debugDirty = true;
      tampered = true;
    },
    toUI() {
      state = 'ui';
      Backdrop.restore();
    },
    get state() {
      return state;
    },
    get player() {
      return pl;
    },
    st,
    // team (Phase A)
    get roster() {
      return roster;
    },
    /** Equip a run-tier item on the whole team (debug / future inventory). Honors the group-exclusion rule. */
    equipRun(id, replace) {
      equipRun(id, replace);
    },
    /** Give an item through the real pickup path (free slot = equipped, otherwise the chooser). Used by G.Debug.item / runitem. */
    offerItem(id) {
      offerItem(id);
    },
    get activeIndex() {
      return runTeam ? runTeam.activeIdx : 0;
    },
    get swapCooldown() {
      return runTeam ? runTeam.lock : 0;
    },
    get swapMax() {
      return G.Team.SWAP_LOCK;
    },
    swap(i) {
      return swapTo(i);
    },
  };
})();

/* ============ Flow — transitions between screens ============ */
G.Flow = {
  boot() {
    G.UI.initChrome();
    G.LoginUI.init();
    G.TestUI.init();
    G.MenuUI.init();
    G.GachaUI.init();
    G.SocialUI.init();
    G.RankingUI.init();
    G.ModUI.init();
    G.GoalsUI.init();
    G.ProfileUI.init();
    G.SettingsUI.init();
    G.SupportUI.init();
    G.NewsUI.init();
    G.Updater.init();
    // Your name at the top right opens your profile.
    document.getElementById('user-pill').onclick = () => G.GoalsUI.open('profile');
    G.Audio.music('village'); // plays after the first click (the browser requires it)
    G.Game.init();
    // The database (cloud or local) restores the previous session.
    G.DB.ready().then((restored) => {
      document.getElementById('boot').classList.add('hidden');
      // In another task: creating the sound to check it costs ~60 ms and must not block loading.
      setTimeout(
        () =>
          this.tapToStart(() => {
            if (restored) this.afterLogin();
            else this.toLogin();
          }),
        0
      );
    });
  },
  /**
   * "Press to start": browsers do not let a page play sound until
   * something is touched. With this screen the music starts as soon as you enter.
   * (If the browser already allows sound, it does not show.)
   */
  tapToStart(then) {
    G.Audio.unlock();
    if (G.Audio.canPlay()) {
      then();
      return;
    }
    const el = document.getElementById('tap-start');
    el.classList.remove('hidden');
    const go = (e) => {
      if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      G.Audio.unlock();
      el.classList.add('hidden');
      el.removeEventListener('click', go);
      removeEventListener('keydown', go, true);
      then();
    };
    el.addEventListener('click', go);
    addEventListener('keydown', go, true);
  },
  toLogin() {
    G.Audio.music('village');
    G.LoginUI.open();
  },
  async afterLogin() {
    G.Audio.music('village');
    if (G.DB.takeResetNotice())
      await G.UI.ask('This update changes how every Pokemon is stored, so your save starts fresh.', {
        title: 'New save needed',
        ok: 'OK',
        note: 'Your old save is kept in this browser as a backup.',
        noCancel: true,
      });
    if (!G.DB.save.partner) G.TestUI.start();
    else this.goMenu();
  },
  goMenu() {
    if (G.Game.state !== 'ui') G.Game.toUI();
    G.Audio.music('village');
    G.MenuUI.open();
    G.LoginUI.offerRecovery();
  },
  /** On closing the summary: to the room if you are still in one, otherwise to the menu. */
  afterRun() {
    if (G.Social.room) {
      if (G.Game.state !== 'ui') G.Game.toUI();
      G.Audio.music('village');
      if (G.Social.room.isHost) G.Social.setOpen(true);
      G.LobbyUI.open();
    } else this.goMenu();
  },
  play() {
    G.Game.startRun();
  },
  /** Starts the group game (the host sends it to everyone). */
  startCoop(cfg) {
    if (G.Game.state !== 'ui' || !G.Social.room) return;
    G.LobbyUI.close();
    G.Game.startRun(cfg);
  },
};
