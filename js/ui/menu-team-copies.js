/* ============ menu-team-copies.js: the Team screen's copy actions (nicknames, selling one, bulk sell) ============
 * Split from menu.js (#154). Works on the Team screen's state (menu-team.js) and redraws it. */
G.MenuTeamCopies = (() => {
  const $ = G.UI.$;
  const { markGrid, renderGrid } = G.MenuDexGrid;
  const { ros, rosView, rosCoins, rosRenderAll, rosRenderTabs, rosRefreshList } = G.MenuTeam;

  // ---------------- nicknames (step 3b-2) ----------------

  /**
   * Rename a box copy in place: the header name becomes a text field. Enter saves, Esc or clicking away cancels, an empty
   * name goes back to the species name. Every key is cleaned as you type (G.Copies.cleanNickname), and again on save.
   * Storage, like a box move: it saves at once and pending team edits stay pending.
   */
  function rosRename(uid) {
    const s = G.DB.save,
      c = G.Copies.get(s, uid),
      dn = document.querySelector('#ros-detail .ros-dn');
    if (!c || !dn) return;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'field ros-nick-field';
    inp.maxLength = G.Copies.NICK_MAX;
    inp.setAttribute('translate', 'no');
    inp.setAttribute('autocomplete', 'off');
    inp.spellcheck = false;
    inp.placeholder = G.DEX_BY[c.speciesID].name;
    inp.value = c.nickname;
    dn.innerHTML = '';
    dn.appendChild(inp);
    inp.focus();
    inp.select();
    let done = false;
    const finish = (keep) => {
      if (done) return;
      done = true;
      if (keep && G.Copies.setNickname(s, uid, inp.value) != null) {
        G.Audio.sfx('confirm');
        G.DB.commit(true);
      }
      rosRenderAll();
      rosRefreshList([c.speciesID]);
      markGrid(rosView);
    };
    inp.oninput = () => {
      const clean = G.Copies.cleanNickname(inp.value, true);
      if (clean === inp.value) return;
      const at = Math.max(0, (inp.selectionStart || 0) - (inp.value.length - clean.length));
      inp.value = clean;
      inp.setSelectionRange(at, at);
    };
    inp.onkeydown = (e) => {
      e.stopPropagation(); // the Team screen's Enter (place in slot) must not see this
      if (e.key === 'Enter') {
        e.preventDefault();
        finish(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
      }
    };
    inp.onblur = () => finish(false);
  }

  // ---------------- selling a copy (step 3a-3) ----------------

  /** On the saved team, or in the uncommitted team edits: either way it cannot be sold. */
  function rosOnTeam(uid) {
    const has = (list) => (list || []).some((t) => t && t.uid === uid);
    return has(G.DB.save.team) || has(ros.team);
  }

  /** Sell, Lock and Favorite under Moves for a copy; Sell is disabled with the reason when it cannot be sold. */
  function rosSellHtml(copy) {
    const price = G.Copies.sellPrice(G.DB.save, copy.pokemonUUID);
    if (price == null) return '';
    const why = rosOnTeam(copy.pokemonUUID)
      ? 'Remove it from your team first.'
      : copy.isLocked
        ? 'Unlock it first.'
        : '';
    const lock = `<button type="button" class="btn ghost small" id="ros-lock" data-sfx="click" title="${copy.isLocked ? 'It can be sold again' : 'A locked Pokémon is never sold'}">${G.Icons.html('lock', 14)} ${copy.isLocked ? 'Unlock' : 'Lock'}</button>`;
    const fav = `<button type="button" class="btn ghost small" id="ros-fav" data-sfx="click" title="${copy.isFavorite ? 'Remove the mark' : 'Bulk sell skips favorites'}">${G.Icons.html('heart', 14)} ${copy.isFavorite ? 'Unfavorite' : 'Favorite'}</button>`;
    return `<div class="ros-sell"><button type="button" class="btn gold small" id="ros-sell"${why ? ' disabled' : ' data-sfx="click"'}><span class="coin"></span> Sell for ${rosCoins(price)}</button>${lock}${fav}${why ? `<span class="sub">${why}</span>` : ''}</div>`;
  }

  /** Lock / unlock or favorite / unfavorite a box copy (3b-1). Storage, like a box move: it saves at once, pending team edits stay pending. */
  function rosToggle(uid, which) {
    const s = G.DB.save,
      c = G.Copies.get(s, uid);
    if (!c) return;
    const ok = which === 'lock' ? G.Copies.setLocked(s, uid, !c.isLocked) : G.Copies.setFavorite(s, uid, !c.isFavorite);
    if (!ok) return;
    G.DB.commit(true);
    rosRenderAll();
    rosRefreshList([c.speciesID]);
    markGrid(rosView);
  }

  /** Sell copy uid from the box: always a confirm first. Storage, like a box move: it saves at once and pending team edits stay pending. */
  async function rosSell(uid) {
    const s = G.DB.save,
      c = G.Copies.get(s, uid);
    if (!c) return;
    const p = G.DEX_BY[c.speciesID],
      price = G.Copies.sellPrice(s, uid),
      name = (c.isShiny ? 'shiny ' : '') + p.name,
      last = G.Copies.all(s).filter((x) => x.speciesID === c.speciesID).length === 1;
    const yes = await G.UI.ask(`Sell ${name} for ${rosCoins(price)} PokéCoins?`, {
      title: 'Sell Pokémon',
      ok: 'Sell',
      note:
        (c.isFavorite ? `${p.name} is a favorite. ` : '') +
        (c.evTotal ? `It has ${c.evTotal} EVs. They are lost. ` : '') +
        (c.tmsLearned.length ? `Its ${c.tmsLearned.length} learned TMs go with it. ` : '') +
        (last
          ? `This is your last ${p.name}. The Pokédex keeps it.`
          : `You will have ${rosCoins((s.coins || 0) + price)} PokéCoins.`),
    });
    if (!yes) return;
    const r = G.Copies.sell(s, uid, rosPending());
    if (!r.ok) {
      G.Audio.sfx('error');
      G.UI.toast(
        r.error === 'team'
          ? 'Remove it from your team first.'
          : r.error === 'locked'
            ? 'Unlock it first.'
            : 'That Pokémon is gone.'
      );
      rosRenderAll();
      return;
    }
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    G.UI.toast(`Sold ${name} for ${rosCoins(r.coins)} PokéCoins`);
    if (ros.uid === uid) ros.uid = null; // the species view, never the next copy (no second sale by accident)
    rosRenderTabs();
    renderGrid(rosView);
    markGrid(rosView);
    rosRenderAll();
  }

  // ---------------- bulk sell (step 3b-3) ----------------

  /** The uncommitted team edits' copies: none of them can be sold. */
  function rosPending() {
    return ros.team.filter((t) => t && t.uid).map((t) => t.uid);
  }

  /** Can this copy go in a batch? Never one on the team (saved or pending), locked, or a favorite (3b D2). */
  function rosCanBulk(c) {
    return !rosOnTeam(c.pokemonUUID) && !c.isLocked && !c.isFavorite;
  }

  /** A cell's look in select mode: ticked, or dimmed when it cannot be ticked. */
  function rosTickClass(cell, c) {
    cell.classList.toggle('tick', ros.ticked.has(c.pokemonUUID));
    cell.classList.toggle('notick', !rosCanBulk(c));
    if (!cell.querySelector('.tick-box')) cell.insertAdjacentHTML('beforeend', '<span class="tick-box"></span>');
    cell.title = rosCanBulk(c) ? '' : rosOnTeam(c.pokemonUUID) ? 'On your team' : c.isLocked ? 'Locked' : 'Favorite';
  }

  /** The shown-count line, with Select, or in select mode: Select repeats, Clear, Sell N for X, Cancel (3b D9, D12). */
  function rosBulkBar() {
    const b = ros.bulk;
    if (!b) return;
    const s = G.DB.save,
      bar = $(b.v.pre + 'shown');
    bar.innerHTML = '';
    bar.appendChild(document.createTextNode(`${b.shown} shown · ${b.total} / ${G.Copies.BOX_SIZE} in this box`));
    if (!b.total) {
      ros.select = false;
      ros.ticked.clear();
      return;
    }
    const wrap = document.createElement('span');
    wrap.className = 'ros-bulk';
    const btn = (label, cls, fn, off) => {
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'btn small ' + cls;
      x.innerHTML = label;
      x.disabled = !!off;
      if (!off) x.dataset.sfx = 'click';
      x.onclick = fn;
      wrap.appendChild(x);
    };
    const redraw = () => {
      renderGrid(b.v);
      markGrid(b.v);
    };
    if (!ros.select) {
      btn('Select', 'ghost', () => {
        ros.select = true;
        ros.ticked.clear();
        redraw();
      });
    } else {
      for (const id of [...ros.ticked]) if (!b.ids.has(id) || !G.Copies.get(s, id)) ros.ticked.delete(id); // only what is shown
      let coins = 0;
      for (const id of ros.ticked) coins += G.Copies.sellPrice(s, id) || 0;
      const n = ros.ticked.size;
      btn('Select repeats', 'ghost', rosSelectRepeats);
      btn(
        'Clear',
        'ghost',
        () => {
          ros.ticked.clear();
          redraw();
        },
        !n
      );
      btn(`<span class="coin"></span> Sell ${n} for ${rosCoins(coins)}`, 'gold', rosSellTicked, !n);
      btn('Cancel', 'ghost', () => {
        ros.select = false;
        ros.ticked.clear();
        redraw();
      });
    }
    bar.appendChild(wrap);
  }

  /** Tick every repeat in this box beyond the one kept (G.Copies.repeatsIn, 3b D10), among the copies the filters show. */
  function rosSelectRepeats() {
    const b = ros.bulk;
    if (!b || typeof ros.tab !== 'number') return;
    const pick = G.Copies.repeatsIn(G.DB.save, ros.tab, rosPending()).filter((id) => b.ids.has(id));
    if (!pick.length) {
      G.UI.toast('No repeats to select in this box');
      return;
    }
    ros.ticked = new Set(pick);
    renderGrid(b.v);
    markGrid(b.v);
  }

  /** Sell every ticked copy after one confirm with the count and total (3b D12). Storage: it saves at once, pending team edits stay pending. */
  async function rosSellTicked() {
    const s = G.DB.save,
      ids = [...ros.ticked];
    if (!ids.length) return;
    let coins = 0;
    for (const id of ids) coins += G.Copies.sellPrice(s, id) || 0;
    const yes = await G.UI.ask(`Sell ${ids.length} Pokémon for ${rosCoins(coins)} PokéCoins?`, {
      title: 'Sell Pokémon',
      ok: 'Sell',
      note:
        'Team, locked and favorite Pokémon are never part of a batch.' +
        (ids.some((id) => (G.Copies.get(s, id) || { tmsLearned: [] }).tmsLearned.length)
          ? ' Learned TMs go with the Pokémon sold.'
          : ''),
    });
    if (!yes) return;
    const r = G.Copies.sellMany(s, ids, rosPending());
    ros.ticked.clear();
    if (r.sold) {
      G.Audio.sfx('confirm');
      G.DB.commit(true);
      G.UI.toast(`Sold ${r.sold} Pokémon for ${rosCoins(r.coins)} PokéCoins`);
    } else {
      G.Audio.sfx('error');
      G.UI.toast('Nothing was sold');
    }
    if (ros.uid && !G.Copies.get(s, ros.uid)) ros.uid = null; // the species view, as after a single sale
    rosRenderTabs();
    renderGrid(rosView);
    markGrid(rosView);
    rosRenderAll();
  }

  return { rosRename, rosSellHtml, rosToggle, rosSell, rosCanBulk, rosTickClass, rosBulkBar };
})();
