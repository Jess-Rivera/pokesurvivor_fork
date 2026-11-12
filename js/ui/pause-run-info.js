/* ============ pause-run-info.js: the pause menu's Run Info panel, left of the ball (#91-2 part D) ============
 * Spec: docs/PAUSE-MENU.md section 6. Maps: docs/ASCII Concept Maps/91c (the mock) and 91-2D (the build).
 * Everything about the run, or team wide / run wide; anything about one Pokemon is the detail panel's (Run Stats box).
 *
 * The game is held still while the menu is open, so read() takes ONE snapshot of the run when the menu opens (called by
 * js/ui/pause-menu.js open()), never per frame. sections(snapshot) is pure: it turns the snapshot into the panel's rows
 * and holds every display rule (what hides, "None yet", "--", the Region Best wording and colours), so an offline
 * harness checks it (docs/proposals/run-info-harness.js). Panel() only draws what sections() returns: a pinned header
 * (run name and time) over the shared ScrollBox, which opens at the top each time.
 * Look: the DPS-Upgrades panel's family (Michroma, slate dividers), at 24 px text on 36 px rows (91c R1). English only.
 */
G.PauseRunInfo = (() => {
  // ---------- the panel's rules (pure; the offline harness loads this part with no HUD kit) ----------
  const STATUS_ORDER = [
    'burn',
    'poison',
    'toxic',
    'paralysis',
    'sleep',
    'freeze',
    'confusion',
    'trap',
    'daze',
    'drowsy',
  ];
  const EV_LABELS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe']; // the run's EV bank order
  const number = (value) => Math.round(value || 0).toLocaleString('en-US');
  const clock = (seconds) => G.U.mmss(Math.max(0, seconds || 0)); // mm:ss, minutes past 59 (82:30)
  const titled = (text) => String(text).charAt(0).toUpperCase() + String(text).slice(1);
  const badgeName = (badge) => String(badge).replace(/ Badge$/, '');
  const percent = (share) => Math.round(share * 100) + '%';

  function progress(snap) {
    const badges = snap.badges.map(badgeName);
    const rows = [
      { label: 'Loop', value: String(snap.loop) },
      { label: 'Badges', value: badges.length ? badges.join(', ') + ' (' + badges.length + ')' : 'None yet' },
    ];
    if (snap.splits.length) {
      const splits = snap.splits.map((time, index) => (badges[index] || 'Gym ' + (index + 1)) + ' ' + clock(time));
      rows.push({ label: 'Gym splits', value: splits.join(', ') });
    }
    return { title: 'Progress', rows };
  }

  function combat(snap) {
    // DD3: a tick is never super effective, so it stays out of the share
    const hitDamage = snap.teamDamage - snap.dotDamage;
    const hit = snap.biggestHit;
    const biggest = hit ? [hit.name, hit.move, number(hit.amount)].filter(Boolean).join(' · ') : '--';
    return {
      title: 'Combat',
      rows: [
        { label: 'Kills', value: number(snap.kills) },
        { label: 'Kills per minute', value: snap.time < 60 ? '--' : number(snap.kills / (snap.time / 60)) }, // DK1
        { label: 'Elites', value: number(snap.elites) },
        { label: 'Biggest hit', value: biggest },
        { label: 'Super effective', value: hitDamage > 0 ? percent(snap.superDamage / hitDamage) : '--' },
        { label: 'Damage taken / healed', value: number(snap.taken) + ' / ' + number(snap.healed) },
      ],
    };
  }

  function faints(snap) {
    const rows = [{ label: 'Faints', value: number(snap.faints) }];
    if (snap.faints > 0) {
      // F3: with no faint the two lines hide
      const most = snap.mostFaints || { name: '--', faints: 0 };
      const times = most.faints === 1 ? ' time' : ' times';
      rows.push({ label: 'Most faints', value: most.name + ' · ' + most.faints + times, indent: true });
      rows.push({ label: 'Time fainted', value: clock(snap.downTime), indent: true });
    }
    return { title: 'Faints', rows };
  }

  /** The kinds landed (S2: count above 0), in the fixed order, an unknown kind last: [{ kind, name, count }]. Shared
   *  with the detail panel's Run Stats box (#91-3), so both list the kinds the same way. */
  function statusList(counts) {
    const kinds = STATUS_ORDER.concat(Object.keys(counts).filter((kind) => !STATUS_ORDER.includes(kind)));
    const landed = kinds.filter((kind) => counts[kind] > 0);
    return landed.map((kind) => ({ kind, name: titled(kind), count: counts[kind] }));
  }

  function statuses(snap) {
    const landed = statusList(snap.statuses);
    const rows = landed.length
      ? landed.map((status) => ({ label: status.name, value: number(status.count) }))
      : [{ label: 'None yet', value: '' }];
    return {
      title: 'Statuses inflicted',
      columns: 2,
      rows,
      footer: { label: 'Damage over time', value: number(snap.dotDamage) },
    };
  }

  function loot(snap) {
    const whole = (coins) => number(Math.floor(coins || 0)); // Silver in whole coins, as the HUD shows it
    const silver = 'spent ' + whole(snap.silverSpent) + ' / earned ' + whole(snap.silverEarned);
    return {
      title: 'Loot',
      rows: [
        { label: 'Coins', value: number(snap.coins) },
        { label: 'Silver', value: silver },
        { label: 'Items picked up', value: number(snap.items) },
        { label: 'Shinies', value: 'seen ' + snap.shiniesSeen + ', caught ' + snap.shiniesCaught },
      ],
    };
  }

  const evs = (snap) => ({
    title: 'EVs earned',
    evs: EV_LABELS.map((label, index) => ({ label, value: String(snap.evs[index] || 0) })),
  });

  const PACE_ROW = {
    onPace: () => ({ label: 'Pace', value: 'On pace', tone: null }),
    ahead: (pace) => ({ label: 'Pace', value: "You're ahead by " + clock(pace.delta), tone: 'ahead' }),
    behind: (pace) => ({ label: 'Pace', value: "You're behind by " + clock(pace.delta), tone: 'behind' }),
    even: () => ({ label: 'Pace', value: 'Even', tone: null }),
    newBest: () => ({ label: 'Pace', value: 'New best pace', tone: 'gold' }),
  };

  /** DR5: the Best row reads how the record run ended; DR1: Next and Pace from G.RunStats.pace. */
  function regionBest(snap) {
    const best = snap.best;
    if (!best) return { title: 'Region best', rows: [{ label: 'Best', value: 'No record yet' }] };
    const loop = best.loop || 1,
      gyms = best.gyms || 0;
    let bestText;
    if (best.fighting)
      bestText = 'Died at Loop ' + loop + ', Gym ' + (gyms + 1) + ', reached it ' + clock(best.reachedAt);
    else if (gyms > 0) bestText = 'Loop ' + loop + ', Gym ' + gyms + ' cleared, lasted ' + clock(best.endTime);
    else bestText = 'Loop ' + loop + ', no gym cleared, lasted ' + clock(best.endTime);
    const rows = [{ label: 'Best', value: bestText }];
    const pace = snap.pace;
    if (pace.next) {
      const next = 'Loop ' + snap.loop + ', Gym ' + pace.next.gym + ' (best got there at ' + clock(pace.next.at) + ')';
      rows.push({ label: 'Next', value: next });
    }
    rows.push((PACE_ROW[pace.kind] || PACE_ROW.onPace)(pace));
    return { title: 'Region best', rows };
  }

  /** The panel's rows from one snapshot (see snapshot() for its fields). Pure. */
  function sections(snap) {
    const run = (snap.regionName || 'All regions').toUpperCase() + ' RUN';
    return {
      header: { title: run, time: clock(snap.time) },
      sections: [progress(snap), combat(snap), faints(snap), statuses(snap), loot(snap), evs(snap), regionBest(snap)],
    };
  }

  /** Everything the panel shows, read once from the run (the menu holds the world still). Null outside a run. */
  function snapshot() {
    const game = G.Game,
      player = game && game.player;
    if (!player) return null;
    const time = game.st.time,
      stats = game.runStats,
      totals = G.RunStats.totals(stats, time);
    const roster = game.roster || [];
    const memberAt = (slot) => roster.find((member) => member.teamSlot === slot) || null;
    const nameAt = (slot) => {
      const member = memberAt(slot);
      return (member && member.mon && member.mon.name) || 'Slot ' + (slot + 1);
    };
    const moveName = (slot, moveId) => {
      if (!moveId) return null;
      const member = memberAt(slot),
        move = member && (member.moves || []).find((each) => each.id === moveId);
      return move ? move.name : titled(String(moveId).replace(/-/g, ' '));
    };
    const big = stats && stats.biggestHit && stats.biggestHit.amount > 0 ? stats.biggestHit : null;
    const most = G.RunStats.mostFaints(stats);
    const best = game.regionBest;
    const region = G.Enemies.region,
      regionNames = G.MenuUI && G.MenuUI.GEN_NAMES;
    return {
      regionName: region && regionNames && regionNames[region - 1] ? G.T(regionNames[region - 1]) : null,
      time,
      loop: G.Gym.loop,
      badges: G.Gym.badges.slice(),
      splits: G.Gym.splits.slice(),
      kills: player.kills || 0,
      elites: stats ? stats.elites : 0,
      biggestHit: big ? { name: nameAt(big.slot), move: moveName(big.slot, big.moveId), amount: big.amount } : null,
      teamDamage: G.DpsHistory.totalDamage(player.team && player.team.dpsHistory),
      superDamage: totals.superDamage,
      dotDamage: totals.dotDamage,
      taken: totals.taken,
      healed: totals.healed,
      faints: totals.faints,
      mostFaints: most ? { name: nameAt(most.slot), faints: most.faints } : null,
      downTime: totals.downTime,
      statuses: totals.statuses,
      coins: player.coins || 0,
      silverSpent: G.Silver.spent,
      silverEarned: G.Silver.earned,
      items: stats ? stats.items : 0,
      shiniesSeen: stats ? stats.shinies : 0,
      shiniesCaught: game.shiniesCaught,
      evs: G.Copies.wholeEvs(game.evBank),
      best,
      pace: G.RunStats.pace(G.Gym.splits, time, best),
    };
  }

  // ---------- the view ----------
  const overlay = G.HudOverlay;
  if (!overlay || !overlay.ready) return { ready: false, sections, snapshot, statusList };
  const { html, signal, ScrollBox, PALETTE } = overlay.kit;
  const PANEL = { width: 635, height: 1028 },
    HEADER_HEIGHT = 56,
    PAD = 20,
    BAR_ROOM = 14; // the scroll bar and a little air
  const BODY = {
    left: PAD,
    top: HEADER_HEIGHT + 8,
    width: PANEL.width - 2 * PAD - BAR_ROOM,
    height: PANEL.height - HEADER_HEIGHT - 8 - PAD,
  };
  const SLATE = { track: PALETTE.frame, thumb: PALETTE.slate, thumbRim: PALETTE.trackLight }; // C1: no type colour
  const view = signal(null),
    readCount = signal(0); // bumped on each read: the body goes back to the top

  /** The menu opened: read the run once. */
  function read() {
    const snap = snapshot();
    view.value = snap ? sections(snap) : null;
    readCount.value = readCount.value + 1;
  }

  const Row = (row, key) =>
    html`<div key=${key} class=${'pm-info-row' + (row.indent ? ' is-indent' : '')}>
      <span class="pm-info-label">${row.label}</span>
      <span class=${'pm-info-value' + (row.tone ? ' is-' + row.tone : '')}>${row.value}</span>
    </div>`;

  function Section(section, index) {
    const rowsClass = section.columns === 2 ? 'pm-info-grid' : '';
    return html`<div key=${section.title} class="pm-info-section">
      ${index ? html`<div class="pm-info-divider"></div>` : null}
      <div class="pm-info-title">${section.title}</div>
      ${
        section.evs
          ? html`<div class="pm-info-evs">
              ${section.evs.map(
                (ev) =>
                  html`<div key=${ev.label} class="pm-info-ev">
                    <span class="pm-info-label">${ev.label}</span><span class="pm-info-value">${ev.value}</span>
                  </div>`
              )}
            </div>`
          : null
      }
      ${section.rows ? html`<div class=${rowsClass}>${section.rows.map(Row)}</div>` : null}
      ${section.footer ? Row(section.footer, 'footer') : null}
    </div>`;
  }

  function Panel() {
    const shown = view.value;
    if (!shown) return null;
    return html`<div class="pm-info">
      <div class="pm-info-header">
        <span class="pm-info-run">${shown.header.title}</span><span class="pm-info-clock">${shown.header.time}</span>
      </div>
      <${ScrollBox} box=${BODY} trackRight=${PAD - 8} colours=${SLATE} resetOn=${[readCount.value]}>
        ${shown.sections.map(Section)}
      </${ScrollBox}>
    </div>`;
  }

  return { ready: true, Panel, read, sections, snapshot, statusList };
})();
