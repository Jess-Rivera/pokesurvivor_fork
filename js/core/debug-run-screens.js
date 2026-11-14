/* ============ debug-run-screens.js: the run screens' dev tools (dev only, with ?dev) ============
 * The HUD overlay, the quiet pause, the pause menu's Run Info panel, Region Best and the end-of-run EVs.
 * Split out of js/core/debug.js on 2026-11-14 (structural review F6, docs/ASCII Concept Maps/F6 - Debug Split
 * Plan.md); the code is unchanged. It adds its commands onto G.Debug, so every caller uses them as before, and
 * reads only G.Debug.on, the ?dev flag. Loads right after debug.js. Not in the NEED array: like debug.js it is
 * dev-only and inert without ?dev (decision 2026-11-14-debug-split-files-stay-out-of-need).
 *
 *   G.Debug.quietPause(on)  Escape (and P, and the pause button) pause and unpause with no pause menu, so the frame stays
 *                      readable; no arg toggles, true/false sets. Session only, not saved (#54).
 *   G.Debug.hudOverlay(show)  hide or show the HTML HUD overlay (#64) to compare the frame rate with Settings > FPS on;
 *                      no arg toggles. Session only.
 *   G.Debug.hudNameSize(px)  the overlay name line's size: no arg flips 20 and 30 px, or 20 / 30 / 40 (#64 feel test).
 *   G.Debug.evbank(hp, atk, def, spa, spd, spe)  set THIS run's six EV banks in EVs (decimals allowed, 3.742) to test the end-of-run
 *                      allocation without an hour run; no args: logs them. Flags the run as tampered (it still allocates).
 *   G.Debug.evset(slot, hp, atk, def, spa, spd, spe)  set the copy in team slot `slot` (0 to 5) to these EVs (save
 *                      order), whole, 252 a stat and 510 in all (later stats cut first), to test the EV screen's
 *                      greyed + (#104). Saved; flags the run as tampered.
 *   G.Debug.runinfo(preset)  fill THIS run's Run Info counters so every row shows (#91-2, map 91c): 'full' (every
 *                      section, tall enough to scroll), 'empty' (a fresh run), 'tie' ('full', two Pokemon tied on Most
 *                      faints); no arg logs the panel's rows. Flags the run. Pause to look.
 *   G.Debug.regionbest(arg)  this region's Region Best on the save: no arg logs it;
 *                      { loop, gyms, time, splits, fightAt } sets it (seconds; fightAt = it died in the next gym's fight, reached then); 'clear' removes it;
 *                      'old' removes the whole save field, as an old save has it. Saved (a guest's only in memory).
 *   G.Debug.recordcheck(write)  the real end-of-run Region Best compare on THIS run, as if it ended now: no arg
 *                      is a dry run (the verdict and why); 'write' keeps a better run even though the run is flagged (T1).
 */
(() => {
  const on = G.Debug.on;

  /** Quiet pause (#54): while on, Escape, P and the pause button freeze the frame without opening the pause menu, so an
   *  overlay stays readable. quietPause() toggles, quietPause(true|false) sets. Session only, not saved. Needs ?dev. */
  let quietPauseOn = false;
  function quietPause(enabled) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    quietPauseOn = enabled == null ? !quietPauseOn : !!enabled;
    console.log('[Debug] quiet pause ' + (quietPauseOn ? 'ON: pausing shows no menu' : 'OFF: the pause menu is back'));
    return quietPauseOn;
  }
  const quietPauseActive = () => on && quietPauseOn;

  /** #64 feel test: the overlay's name line size. hudNameSize() flips 20 and 30 px; hudNameSize(20|30|40) sets it (whole
   *  multiples of the font's 10 px grid, so it stays crisp). Session only. Needs ?dev. */
  let hudNameSizePixels = 20;
  function hudNameSize(pixels) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    if (pixels == null) pixels = hudNameSizePixels === 20 ? 30 : 20;
    if (![20, 30, 40].includes(pixels)) {
      console.warn('[Debug] hudNameSize takes 20, 30 or 40 (the font is crisp only at multiples of 10)');
      return hudNameSizePixels;
    }
    hudNameSizePixels = G.HudOverlay.setNameSize(pixels);
    console.log('[Debug] HUD name line at ' + pixels + ' px');
    return pixels;
  }

  /** #64: hide or show the HTML HUD overlay, to compare the frame rate with and without it (turn on Settings > FPS).
   *  hudOverlay() toggles, hudOverlay(true|false) shows or hides. Session only. Needs ?dev. */
  let hudOverlayHidden = false;
  function hudOverlay(show) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    hudOverlayHidden = show == null ? !hudOverlayHidden : !show;
    G.HudOverlay.setHidden(hudOverlayHidden);
    console.log('[Debug] HUD overlay ' + (hudOverlayHidden ? 'HIDDEN (the canvas HUD still draws)' : 'SHOWN'));
    return !hudOverlayHidden;
  }

  /** Set THIS run's six EV banks, in EVs (decimals allowed: 3.742), to test the end-of-run allocation. No args: logs them. Flags
   *  the run as tampered; it still allocates (pokebox step 5 F3). ?dev only. */
  function evbank(...v) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return null;
    }
    if (!G.Game || !G.Game.player) {
      console.warn('[Debug] no run in progress.');
      return null;
    }
    if (v.length) {
      G.Game.evBank = [0, 1, 2, 3, 4, 5].map((k) => Math.round((+v[k] || 0) * G.Copies.EV_UNIT));
      G.Game.debugMaxed();
    }
    const b = G.Game.evBank.map((x) => x / G.Copies.EV_UNIT);
    console.log('[Debug] EV banks (HP Atk Def SpA SpD Spe): ' + b.map((x) => x.toFixed(3)).join(' '));
    return b;
  }

  /** #104: the copy in team slot `slot` gets these six EVs (save order HP Atk Def SpA SpD Spe) through G.Copies.setEvs:
   *  whole, 252 a stat and 510 in all. Saved; the EV screen shows them as its white numbers. */
  function evset(slot = 0, ...values) {
    if (!on || !G.DB.save) return false;
    const member = G.DB.save.team && G.DB.save.team[slot],
      evs = member && member.uid ? G.Copies.setEvs(G.DB.save, member.uid, values) : null;
    if (!evs) {
      console.warn('[Debug] team slot ' + slot + ' has no copy.');
      return false;
    }
    G.DB.commit(true);
    G.Game.debugMaxed();
    console.log('[Debug] slot ' + slot + ' EVs (HP Atk Def SpA SpD Spe): ' + evs.join(' '));
    return evs;
  }

  // ---------- #91-2: the pause menu's Run Info panel and Region Best (map 91c "Debug tools", T1, T2) ----------
  const RUN_INFO_PRESETS = ['full', 'empty', 'tie'];
  const RUN_INFO_STATUSES = {
    burn: 41,
    poison: 12,
    toxic: 3,
    paralysis: 20,
    sleep: 8,
    freeze: 2,
    confusion: 5,
    trap: 4,
    daze: 1,
    drowsy: 2,
  };

  /** Seed the Run Info counters through the real hooks, so the per-Pokemon parts add up to the team totals. */
  function seedRunInfo(preset) {
    const game = G.Game,
      stats = game.runStats,
      player = game.player;
    const history = player.team && player.team.dpsHistory;
    const roster = (game.roster || []).slice().sort((first, second) => first.teamSlot - second.teamSlot);
    // a clean slate first: the counters, the badges and splits, Silver, EVs, kills and coins (the gym schedule stays)
    Object.assign(stats, G.RunStats.create());
    if (history) Object.assign(history, G.DpsHistory.create(), { time: history.time });
    G.Gym.debugBadges([]);
    G.Silver.reset();
    game.evBank = [0, 0, 0, 0, 0, 0];
    player.kills = 0;
    player.coins = 0;
    if (preset === 'empty') return;
    const now = Math.max(game.st.time, 1203); // 20:03, past the three splits below
    if (game.st.time < now) game.debugTime(now);
    if (history) {
      // field time in turns over the team, so each Run Stats box (#91-3) has its own Field
      const seconds = Math.floor(now),
        turnOf = (second) => roster[Math.floor((second * roster.length) / seconds)].teamSlot;
      history.time = Math.max(history.time, now);
      history.outSlot = Array.from({ length: seconds }, (unused, second) => turnOf(second));
      history.teamDamage = new Array(seconds).fill(0);
      history.lastOutSlot = player.teamSlot;
    }
    G.Gym.debugBadges([
      { badge: 'Boulder Badge', at: 292 },
      { badge: 'Cascade Badge', at: 550 },
      { badge: 'Thunder Badge', at: 860 },
    ]);
    let kills = 0;
    roster.forEach((member, index) => {
      const moveId = member.moves && member.moves[0] ? member.moves[0].id : null;
      member.onDealt(400 + 100 * index, { moveId }); // a plain hit
      member.onDealt(600, { typeMult: 2, moveId }); // a super effective hit
      member.onDealt(900, { dot: true }); // burn and poison ticks
      const elite = index < 3; // the first kill of the first three members is an elite
      for (let kill = 0; kill < 40 + 10 * index; kill++, kills++) G.RunStats.kill(stats, member, kill === 0 && elite);
      G.RunStats.taken(stats, member, 500 + 100 * index);
      G.RunStats.healed(stats, member, 300 + 50 * index);
    });
    const lead = roster[0],
      leadMove = lead.moves && lead.moves[0] ? lead.moves[0].id : null;
    lead.onDealt(2450, { typeMult: 2, moveId: leadMove }); // the biggest hit
    player.kills = kills;
    const faintCounts = preset === 'tie' ? [3, 3] : [3, 1]; // 'full': one Pokemon clearly has the most
    roster.slice(0, 2).forEach((member, index) => {
      for (let faint = 0; faint < faintCounts[index]; faint++) {
        const at = now - 600 + faint * 120 + index * 30;
        G.RunStats.faint(stats, member, at);
        G.RunStats.revive(stats, member, at + 40); // 40 s down each
      }
    });
    Object.keys(RUN_INFO_STATUSES).forEach((kind, index) => {
      const member = roster[index % roster.length];
      for (let count = 0; count < RUN_INFO_STATUSES[kind]; count++) G.RunStats.inflicted(stats, member, kind);
    });
    for (let item = 0; item < 14; item++) G.RunStats.item(stats);
    G.RunStats.shiny(stats);
    G.RunStats.shiny(stats);
    for (let kill = 0; kill < 160; kill++) G.Silver.kill(900); // 2.55 Silver each: 408 earned
    G.Silver.spend(240);
    game.evBank = [2, 11, 4, 0, 1, 6].map((whole) => whole * G.Copies.EV_UNIT);
    player.coins = 312;
  }

  /** Fill THIS run's Run Info counters with a preset ('full', 'empty', 'tie'); no arg logs the panel's rows. Flags the
   *  run. The panel reads when the menu opens: pause to look. ?dev only. */
  function runinfo(preset) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return null;
    }
    const game = G.Game;
    if (!game || !game.player || !game.runStats) {
      console.warn('[Debug] start a run first: the Run Info counters only exist in a run.');
      return null;
    }
    if (preset == null) {
      const shown = G.PauseRunInfo.sections(G.PauseRunInfo.snapshot());
      console.log('[Debug] ' + shown.header.title + '  ' + shown.header.time);
      for (const section of shown.sections) {
        const rows = (section.rows || section.evs || []).concat(section.footer ? [section.footer] : []);
        console.log('[Debug] ' + section.title);
        console.table(rows.map((row) => ({ row: row.label, value: row.value })));
      }
      return shown;
    }
    if (!RUN_INFO_PRESETS.includes(preset)) {
      console.warn("[Debug] runinfo: 'full', 'empty' or 'tie' (no arg logs the panel's rows).");
      return null;
    }
    if (preset === 'tie' && (game.roster || []).length < 2) {
      console.warn("[Debug] runinfo('tie') needs two team members.");
      return null;
    }
    game.debugMaxed(); // like every debug call: this run never sets a record or posts a score
    seedRunInfo(preset);
    console.log("[Debug] Run Info seeded ('" + preset + "'). Pause to see it.");
    return preset;
  }

  /** This region's Region Best on the save: no arg logs it; { loop, gyms, time, splits, fightAt } sets it; 'clear'
   *  removes it; 'old' removes the whole save field, as an old save has it. Saved. ?dev only. */
  function regionbest(arg) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return null;
    }
    const save = G.DB && G.DB.save;
    if (!save) {
      console.warn('[Debug] no save loaded.');
      return null;
    }
    const key = G.Game.regionKey();
    if (arg === 'old') {
      delete save.regionBest;
      G.DB.commit();
      console.log('[Debug] Region Best: the whole save field is gone, as on an old save.');
      return null;
    }
    if (arg === 'clear') {
      if (save.regionBest) delete save.regionBest[key];
      G.DB.commit();
      console.log('[Debug] Region Best (' + key + '): cleared.');
      return null;
    }
    if (arg && typeof arg === 'object') {
      const givenSplits = Array.isArray(arg.splits) ? arg.splits.map(Number) : null;
      const gyms = Math.max(0, arg.gyms != null ? arg.gyms | 0 : givenSplits ? givenSplits.length : 0);
      const time = Math.max(0, +arg.time || 0);
      const evenly = Array.from({ length: gyms }, (unused, index) => Math.round((time * (index + 1)) / (gyms + 1)));
      const entry = G.RunStats.regionEntry({
        loop: Math.max(1, arg.loop | 0),
        splits: givenSplits ? givenSplits.slice(0, gyms) : evenly,
        fightStartedAt: arg.fightAt != null ? +arg.fightAt : null,
        endTime: time,
      });
      if (!save.regionBest || typeof save.regionBest !== 'object') save.regionBest = {};
      save.regionBest[key] = entry;
      G.DB.commit();
    } else if (arg != null) {
      console.warn("[Debug] regionbest: no arg, { loop, gyms, time, splits, fightAt }, 'clear' or 'old'.");
      return null;
    }
    const best = G.Game.regionBest;
    console.log('[Debug] Region Best (' + key + '): ' + (best ? JSON.stringify(best) : 'No record yet'));
    return best;
  }

  /** The real end-of-run Region Best compare on THIS run, as if it ended now (G.Game.regionRecord, the one endRun
   *  calls). No arg: a dry run. 'write': keep a better run even though the run is flagged (T1, a dev bypass). ?dev only. */
  function recordcheck(write) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return null;
    }
    if (!G.Game || !G.Game.player) {
      console.warn('[Debug] start a run first.');
      return null;
    }
    const writing = write === 'write';
    if (write != null && !writing) {
      console.warn("[Debug] recordcheck(): a dry run; recordcheck('write'): keep it when it is better.");
      return null;
    }
    const clean = G.Game.runIsClean;
    if (writing) G.Game.debugMaxed();
    const result = G.Game.regionRecord({ write: writing });
    if (!result) return null;
    if (result.written) G.DB.commit();
    const verdict = result.better ? 'would be a new best' : 'not better';
    const done = writing ? (result.written ? 'written' : 'nothing written') : 'dry run, nothing written';
    console.log('[Debug] Region Best: ' + verdict + ' (' + result.reason + '); ' + done + '.');
    if (!writing && result.better && !clean)
      console.log('[Debug] A normal run end would refuse it: this run is flagged (debug tools used).');
    return result;
  }

  Object.assign(G.Debug, {
    quietPause,
    quietPauseActive,
    hudOverlay,
    hudNameSize,
    evbank,
    evset,
    runinfo,
    regionbest,
    recordcheck,
  });
})();
