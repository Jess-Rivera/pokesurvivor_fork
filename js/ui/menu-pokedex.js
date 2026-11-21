/* ============ menu-pokedex.js: the Pokedex screen (browse every species, the detail card) ============
 * Split from menu.js (#154). Filter bar and grid: menu-dex-grid.js. */
G.MenuPokedex = (() => {
  const $ = G.UI.$;
  const GEN_NAMES = G.MenuUI.GEN_NAMES;
  const { newCtrl, buildControls, renderGrid } = G.MenuDexGrid;
  let dexSel = null;
  const dexCtrl = newCtrl();
  const dexView = {
    pre: 'dex-',
    ctrl: dexCtrl,
    team: () => G.DB.save.team,
    sel: () => dexSel,
    pick: (dex) => {
      dexSel = dex;
      showDetail(dex);
    },
    compact: true, // icon-only filter chips, same as the Team screen
  };

  /** Pokédex from the menu button: browse only, nothing to pick. */
  function browseDex() {
    showDetail.last = null; // re-read the shiny variant from the team
    openDex();
  }

  function openDex() {
    G.UI.show('scr-dex', true);
    const s = G.DB.save;
    if (dexSel == null) dexSel = s.partner;
    const owned = Object.keys(s.owned).filter((d) => G.DEX_BY[d]).length;
    $('dex-total').textContent = `${owned} / ${G.DEX.length}`;
    buildControls(dexView);
    renderGrid(dexView);
    showDetail(dexSel);
  }

  // Variant currently shown on the card (normal or shiny).
  let viewShiny = false;

  function showDetail(dex) {
    const s = G.DB.save;
    const p = G.DEX_BY[dex];
    const own = !!s.owned[dex];
    const hasSh = G.DB.ownsShiny(dex);
    const slotOf = s.team.findIndex((t) => t && t.dex === dex); // roster slot of this Pokémon, or -1
    if (!hasSh) viewShiny = false;
    else if (slotOf >= 0 && dex !== showDetail.last) viewShiny = !!s.team[slotOf].shiny;
    showDetail.last = dex;

    const max = { hp: 183, atk: 1.55, spd: 137 };
    const bar = (label, v, m, txt) =>
      `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${Math.min(100, (v / m) * 100)}%"></i></div><span>${txt}</span></div>`;

    const box = $('dex-detail');
    box.innerHTML = `
      <canvas id="dex-big" class="stage" width="220" height="190"></canvas>
      ${
        hasSh
          ? `<div class="seg">
          <button class="${viewShiny ? '' : 'on'}" data-v="0">Normal</button>
          <button class="${viewShiny ? 'on' : ''}" data-v="1">${G.Icons.html('shiny', 12)} Shiny</button></div>`
          : ''
      }
      <div class="center">
        <div style="color:var(--muted);font-size:13px">Nº ${String(p.dex).padStart(3, '0')} · ${GEN_NAMES[p.gen - 1]}</div>
        <h3>${own ? p.name : '???'}</h3>
        <div class="rarity-line" style="color:${G.Copies.RARITY_COLOR[p.rarity]}">${G.UI.stars(p.rarity, 24)}<span>${G.Copies.RARITY_NAME[p.rarity]}</span>${own ? G.Icons.bstStars(p.bst) : ''}</div>
        <div style="margin:6px 0">${own ? G.UI.typeChips(p.types) : ''}</div>
      </div>
      ${
        own
          ? `
        ${bar('Vida', p.hp, max.hp, p.hp)}
        ${bar('Ataque', p.atk, max.atk, '×' + p.atk.toFixed(2))}
        ${bar('Velocidad', p.spd, max.spd, p.spd)}
        ${p.stats ? '<div id="dex-hex" class="hex-wrap"></div>' : ''}
        <p style="font-size:14px;margin:10px 0 4px">Empieza con <b class="gold">${G.MoveInfo.name(G.startMoveOf(dex))}</b></p>
        <p class="move-icons" title="Movimientos que puede aprender">
          ${G.Moves.poolFor(p)
            .map((id) => `<span title="${G.MoveInfo.name(id)}">${G.Icons.html('move:' + id, 16)}</span>`)
            .join('')}</p>
        ${slotOf >= 0 ? `<p class="roster-note">On your roster · Slot ${slotOf + 1}${slotOf === 0 ? ' (lead)' : ''}</p>` : ''}
      `
          : `<p class="center" style="color:var(--muted)">Aún no lo tienes.<br>Consíguelo en el banner de <b class="gold">${GEN_NAMES[p.gen - 1]}</b>
            o derrotándolo cuando salga shiny.</p>`
      }
    `;
    $('dex-big').style.setProperty('--stage-c', !own ? '#5b83d6' : viewShiny ? '#9ae6ff' : G.U.TYPE_COLOR[p.types[0]]);
    $('dex-big').classList.toggle('shiny', own && viewShiny);
    // Base stats as a hexagon, like the main games (only for Pokémon you have).
    const hex = $('dex-hex');
    if (hex) hex.appendChild(G.StatChart.make(p.stats, viewShiny ? '#9ae6ff' : G.U.TYPE_COLOR[p.types[0]]));
    G.UI.sprite($('dex-big'), dex, {
      lively: own,
      spin: own,
      silhouette: !own,
      scale: 3,
      hero: true,
      shiny: own && viewShiny,
    });
    box.querySelectorAll('.seg button').forEach((b) => {
      b.onclick = () => {
        viewShiny = b.dataset.v === '1';
        showDetail(dex);
      };
    });
  }

  return { browse: browseDex };
})();
