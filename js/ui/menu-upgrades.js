/* ============ menu-upgrades.js: the upgrades screen (B/W look, display only; #97 replaces it) ============
 * Split from menu.js (#154). Opened from the Main Menu or a Team screen slot's Upgrade button. */
G.MenuUpgrades = (() => {
  const $ = G.UI.$;

  // ---------------- upgrades (B/W screen, display only) ----------------
  // The catalog from docs/Economy Balance Ideas.md. Not wired yet: every rank reads 0 and nothing can be
  // bought (the old G.Upgrades shop is being deprecated). A 5-rank upgrade is Pokémon-specific and grows by
  // `step` per rank; a 3-rank one is run-wide and lists its ranks. `soon` waits on the dodge mechanic.
  const UPG_COLS = [
    [
      'Survivability',
      [
        { name: 'Maximum HP', step: 8, unit: '%' },
        { name: 'Defense', step: 5, unit: '%' },
        { name: 'HP Regeneration', step: 0.15, unit: '%/s' },
      ],
    ],
    [
      'Combat',
      [
        { name: 'Damage', step: 5, unit: '%' },
        { name: 'Movement Speed', step: 4, unit: '%' },
        { name: 'Cooldown Reduction', step: -4, unit: '%' },
        { name: 'Critical Chance', step: 2, unit: '%' },
        { name: 'Critical Damage', step: 10, unit: '%' },
        { name: 'Status Chance', step: 5, unit: '%' },
        { name: 'Dodge Cooldown Reduction', step: -5, unit: '%', soon: true },
        { name: 'Dodge Distance', step: 5, unit: '%', soon: true },
      ],
    ],
    [
      'Economy',
      [
        { name: 'EXP Gain', ranks: [10, 25, 45], unit: '%' },
        { name: 'Gold Gain', ranks: [10, 25, 45], unit: '%' },
        { name: 'Pickup Range', ranks: [15, 35, 60], unit: '%' },
        { name: 'Item Drop Chance', ranks: [5, 12, 20], unit: '%' },
      ],
    ],
    [
      'Tactical Utility',
      [
        { name: 'Card Rerolls', ranks: [1, 2, 3], unit: '' },
        { name: 'Shop Rerolls', ranks: [1, 2, 3], unit: '' }, // was Card Banish (Jess 2026-11-05, Move Shop step 4c R1): +1 reroll per shop per rank
        { name: 'Starting Moves', ranks: [1, 2, 3], unit: '' },
        { name: 'Team Swap Cooldown Reduction', step: -10, unit: '%' },
      ],
    ],
  ];
  const UPG_MAX_POINTS = 40;

  let upgDex = null,
    upgBack = () => G.MenuUI.open(),
    upgCur = [0, 0]; // keyboard cursor: [column, box]

  /** The Pokémon the tab cycles through: the Team menu's unsaved team, else the saved one. */
  function upgParty() {
    const roster = G.MenuTeam.roster();
    const t = roster.some(Boolean) ? roster : G.DB.save.team || [];
    return [...new Set(t.filter(Boolean).map((x) => x.dex))];
  }

  /**
   * @param dex   the Pokémon to open on (a Team screen slot's Upgrade button)
   * @param back  where Back goes (default: the main menu)
   */
  function openUpgrades(dex, back = () => G.MenuUI.open()) {
    // A popup: the screen under it (the Team screen) stays drawn, dimmed. Back reopens that screen, which hides this one.
    $('scr-upgrades').classList.remove('hidden');
    upgBack = back;
    $('upg-back').onclick = () => upgBack();
    $('upg-prev').onclick = () => upgStep(-1);
    $('upg-next').onclick = () => upgStep(1);
    if (dex != null) upgDex = dex;
    const party = upgParty();
    if (!party.includes(upgDex)) upgDex = party[0] != null ? party[0] : G.DB.save.partner;
    upgCur = [0, 0];
    renderUpgrades();
  }

  function upgStep(d) {
    const party = upgParty();
    if (party.length < 2) return;
    upgDex = party[(party.indexOf(upgDex) + d + party.length) % party.length];
    G.Audio.sfx('select');
    renderUpgrades();
  }

  const upgNum = (n) => (n > 0 ? '+' : n < 0 ? '-' : '+') + Math.abs(Math.round(n * 100) / 100);

  function renderUpgrades() {
    $('upg-name').textContent = G.DEX_BY[upgDex] ? G.DEX_BY[upgDex].name : '';
    $('upg-points').textContent = `0 / ${UPG_MAX_POINTS}`;
    $('upg-prev').disabled = $('upg-next').disabled = upgParty().length < 2;
    const cols = $('upg-cols');
    cols.innerHTML = '';
    UPG_COLS.forEach(([title, list], c) => {
      const col = document.createElement('div');
      col.className = 'upg-col';
      col.innerHTML = `<h3>${title}</h3>`;
      list.forEach((u, i) => {
        const rank = 0; // not wired yet
        const max = u.ranks ? u.ranks.length : 5;
        const total = rank === 0 ? 0 : u.ranks ? u.ranks[rank - 1] : u.step * rank;
        const per = u.ranks
          ? `${upgNum(u.ranks[0])} / ${u.ranks.slice(1).join(' / ')}${u.unit}`
          : `${upgNum(u.step)}${u.unit} per Rank`;
        const el = document.createElement('div');
        el.className = 'upg-box' + (u.soon ? ' soon' : '');
        el.title = u.soon ? `${u.name}: coming with the dodge mechanic` : u.name;
        el.innerHTML = `<span class="rk">Rank</span>
          <span class="pips r${max}">${Array.from({ length: max }, (_, k) => `<i${k < rank ? ' class="on"' : ''}></i>`).join('')}</span>
          <span class="txt"><span class="nm${u.name.length > 16 ? ' long' : ''}">${u.name}</span><span class="per">${u.soon ? 'Soon' : per}</span></span>
          <span class="tot">${upgNum(total)}${u.unit}</span>`;
        el.addEventListener('pointerenter', () => upgSelect(c, i));
        col.appendChild(el);
      });
      cols.appendChild(col);
    });
    upgSelect(upgCur[0], upgCur[1]);
  }

  function upgSelect(c, i) {
    const cols = $('upg-cols').children;
    c = (c + cols.length) % cols.length;
    const boxes = cols[c].querySelectorAll('.upg-box');
    i = Math.max(0, Math.min(boxes.length - 1, i));
    upgCur = [c, i];
    $('upg-cols')
      .querySelectorAll('.upg-box.sel')
      .forEach((b) => b.classList.remove('sel'));
    boxes[i].classList.add('sel');
    boxes[i].scrollIntoView({ block: 'nearest' });
  }

  /** Arrows move the cursor, Q / E change Pokémon, Esc goes back. */
  function upgKey(e) {
    if (!G.UI.isOpen('scr-upgrades') || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    const [c, i] = upgCur;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') upgSelect(c, i + (e.key === 'ArrowDown' ? 1 : -1));
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') upgSelect(c + (e.key === 'ArrowRight' ? 1 : -1), i);
    else if (e.key === 'q' || e.key === 'Q') return upgStep(-1);
    else if (e.key === 'e' || e.key === 'E') return upgStep(1);
    else if (e.key === 'Escape') {
      G.Audio.sfx('back');
      upgBack();
    } else return;
    if (e.key.startsWith('Arrow')) G.Audio.sfx('hover');
    e.preventDefault();
  }

  /** Its key listener, registered by G.MenuUI.init in the order menu.js always used (after the Team screen's Enter). */
  function init() {
    addEventListener('keydown', upgKey);
  }

  return { init, open: openUpgrades };
})();
