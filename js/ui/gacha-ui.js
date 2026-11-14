/* ============ gacha-ui.js — per-generation banners and pull animation ============
 * The logic (probabilities, pity, shiny, repeats) is in systems/gacha.js.
 * F3d-3: this is the SHOP screen now. Tabs: Pokemon (the gacha, regions down the left) | Team Items (100k unlocks) | Team Upgrades (team item slots, berry slots).
 */
G.GachaUI = (() => {
  const $ = G.UI.$;
  let busy = false;
  let cards = []; // the open results: { r, c (card), b (its Sell button or null), sold } (3b-3)
  let gen = 1;
  let tab = 'pokemon'; // 'pokemon' | 'items' | 'upgrades'
  let shopSel = null; // Team Items tab: the item shown in the detail column
  const TABS = [
    ['pokemon', 'Pokemon'],
    ['items', 'Team Items'],
    ['upgrades', 'Team Upgrades'],
  ];
  const fmt = (n) => n.toLocaleString('en-US');

  function init() {
    $('pull-1').onclick = () => pull(1);
    $('pull-10').onclick = () => pull(10, 't1');
    $('pull-10b').onclick = () => pull(10, 't10');
    $('pull-close').onclick = close;
    // "Sell repeats" on the results (3b-3 D11): beside Continue, only while there is something to sell.
    const sellAll = document.createElement('button');
    sellAll.id = 'pull-sellall';
    sellAll.type = 'button';
    sellAll.className = 'btn hidden';
    sellAll.dataset.sfx = 'click';
    sellAll.onclick = sellRepeats;
    $('pull-close').before(sellAll);
    // PokeCoins or Pokeballs changed while the Shop is open (a purchase, a debug command): its buttons follow at once.
    // Not during the pull animation; closing it redraws anyway.
    G.DB.onSave(() => {
      if (G.UI.isOpen('scr-gacha') && !busy && $('pull-fx').classList.contains('hidden')) refresh();
    });

    TABS.forEach(([k, n]) => {
      const b = document.createElement('button');
      b.className = 'gen-tab';
      b.dataset.tab = k;
      b.innerHTML = `<b>${n}</b>`;
      b.onclick = () => {
        tab = k;
        refresh();
      };
      $('shop-tabs').appendChild(b);
    });

    const tabs = $('gacha-gens');
    G.Gacha.BANNERS.forEach((b) => {
      const t = document.createElement('button');
      t.className = 'gen-tab';
      t.dataset.gen = b.gen;
      t.innerHTML = `<b>${b.name}</b><small>Gen ${b.gen}</small>`;
      t.onclick = () => {
        gen = b.gen;
        refresh();
      };
      tabs.appendChild(t);
    });
  }

  function open() {
    tab = 'pokemon'; // the Shop always opens on the Pokemon tab
    G.UI.show('scr-gacha', true);
    refresh();
  }

  /** Redraw the current Shop tab. */
  function refresh() {
    document.querySelectorAll('#shop-tabs .gen-tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === tab));
    for (const [k, id] of [
      ['pokemon', 'shop-pokemon'],
      ['items', 'shop-items'],
      ['upgrades', 'shop-upgrades'],
    ])
      $(id).classList.toggle('hidden', k !== tab);
    if (tab === 'pokemon') refreshPokemon();
    else if (tab === 'items') refreshItems();
    else refreshUpgrades();
    G.UI.refreshCoins();
  }

  // ---------------- Team Items tab ----------------
  function refreshItems() {
    const s = G.DB.save,
      grid = $('shop-items-grid'),
      det = $('shop-items-detail');
    const list = G.Items.LIST.filter((i) => i.tier === 'run' && !G.Items.unlocked(s, i.id));
    $('shop-items-count').textContent = list.length ? list.length + ' for sale.' : '';
    if (!list.some((i) => i.id === shopSel)) shopSel = list.length ? list[0].id : null;
    grid.innerHTML = '';
    if (!list.length)
      grid.innerHTML = '<div class="sub" style="grid-column:1/-1;padding:12px">You own every team item.</div>';
    for (const it of list) {
      const el = document.createElement('div');
      el.className = 'cell inv-cell' + (shopSel === it.id ? ' on' : '');
      el.innerHTML = `<div class="inv-ico">${G.Icons.html(it.icon || it.id, 36)}</div><b>${it.name}</b>`;
      el.onclick = () => {
        shopSel = it.id;
        G.Audio.sfx('click');
        refreshItems();
      };
      grid.appendChild(el);
    }
    const it = G.Items.BY[shopSel];
    if (!it) {
      det.innerHTML = '<div class="sub">Nothing to buy.</div>';
      return;
    }
    const price = G.Items.TEAM_ITEM_PRICE;
    det.innerHTML = `<div class="inv-dico">${G.Icons.html(it.icon || it.id, 56)}</div><h3 style="margin:6px 0 4px">${it.name}</h3>
      <div class="ds">${it.desc}</div>
      <div class="shop-price"><span class="coin"></span> ${fmt(price)}</div>
      <div class="inv-act"><button class="btn gold" id="shop-buy"${s.coins >= price ? '' : ' disabled'}>${s.coins >= price ? 'Buy' : 'Not enough PokéCoins'}</button></div>`;
    $('shop-buy').onclick = () => buyItem(it.id);
  }

  async function buyItem(id) {
    const it = G.Items.BY[id],
      price = G.Items.TEAM_ITEM_PRICE;
    const yes = await G.UI.ask(`Spend ${fmt(price)} PokéCoins on ${it.name}?`, {
      title: 'Buy team item',
      ok: 'Buy',
      note: `You will have ${fmt(Math.max(0, G.DB.save.coins - price))} left.`,
    });
    if (!yes) return;
    const r = G.Items.buyTeamItem(G.DB.save, id);
    if (!r.ok) {
      G.Audio.sfx('error');
      G.UI.toast(r.error === 'poor' ? 'Not enough PokéCoins' : 'You cannot buy that');
      refresh();
      return;
    }
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    G.UI.toast(`Unlocked ${it.name}! Equip it in Inventory.`);
    refresh();
  }

  // ---------------- Team Upgrades tab: team item slots, bought in order ----------------
  function refreshUpgrades() {
    const s = G.DB.save,
      have = G.Items.runSlots(s),
      max = G.Items.RUN_SLOTS_MAX,
      box = $('shop-upgrades');
    let html = `<p class="sub" style="margin:4px 0 10px">You have <b>${have}</b> of ${max} team item slots. Each slot carries one team item into every run. Slots are bought in order.</p>`;
    for (let k = 2; k <= max; k++) {
      const price = G.Items.slotPrice(k),
        owned = have >= k,
        next = k === have + 1,
        afford = s.coins >= price;
      html += `<div class="panel shop-up${owned ? ' owned' : ''}"><div class="shop-up-t"><b>Team item slot ${k}</b>
        <span class="ds">${owned ? 'Unlocked' : next ? 'Carry one more team item into every run.' : `Buy slot ${k - 1} first.`}</span></div>
        <div class="shop-price"><span class="coin"></span> ${fmt(price)}</div>
        <button class="btn gold shop-up-b" data-slot="${k}"${owned || !next || !afford ? ' disabled' : ''}>${owned ? 'Owned' : !next ? 'Locked' : afford ? 'Buy' : 'Not enough PokéCoins'}</button></div>`;
    }
    // Berry slots (#96, temporary): bought in order at the team item slot prices, cap 4.
    const berriesOwned = G.Grounds.berrySlots(s),
      berryMax = G.Grounds.BERRY_SLOTS_MAX;
    html += `<p class="sub" style="margin:16px 0 10px">You have <b>${berriesOwned}</b> of ${berryMax} berry slots. Each slot holds one status berry in the team berry bag during a run. Slots are bought in order.</p>`;
    for (let slotNumber = 2; slotNumber <= berryMax; slotNumber++) {
      const price = G.Grounds.berrySlotPrice(slotNumber),
        owned = berriesOwned >= slotNumber,
        next = slotNumber === berriesOwned + 1,
        afford = s.coins >= price;
      html += `<div class="panel shop-up${owned ? ' owned' : ''}"><div class="shop-up-t"><b>Berry slot ${slotNumber}</b>
        <span class="ds">${owned ? 'Unlocked' : next ? 'Carry one more berry in every run.' : `Buy berry slot ${slotNumber - 1} first.`}</span></div>
        <div class="shop-price"><span class="coin"></span> ${fmt(price)}</div>
        <button class="btn gold shop-berry-b" data-slot="${slotNumber}"${owned || !next || !afford ? ' disabled' : ''}>${owned ? 'Owned' : !next ? 'Locked' : afford ? 'Buy' : 'Not enough PokéCoins'}</button></div>`;
    }
    box.innerHTML = html;
    box.querySelectorAll('.shop-up-b').forEach((b) => {
      b.onclick = () => buySlot(+b.dataset.slot);
    });
    box.querySelectorAll('.shop-berry-b').forEach((button) => {
      button.onclick = () => buyBerrySlot(+button.dataset.slot);
    });
  }

  async function buyBerrySlot(slotNumber) {
    const price = G.Grounds.berrySlotPrice(slotNumber);
    const yes = await G.UI.ask(`Spend ${fmt(price)} PokéCoins on berry slot ${slotNumber}?`, {
      title: 'Buy berry slot',
      ok: 'Buy',
      note: `You will have ${fmt(Math.max(0, G.DB.save.coins - price))} left.`,
    });
    if (!yes) return;
    const result = G.Grounds.buyBerrySlot(G.DB.save);
    if (!result.ok) {
      G.Audio.sfx('error');
      G.UI.toast(result.error === 'poor' ? 'Not enough PokéCoins' : 'You cannot buy that');
      refresh();
      return;
    }
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    G.UI.toast(`Berry slot ${result.slots} unlocked!`);
    refresh();
  }

  async function buySlot(k) {
    const price = G.Items.slotPrice(k);
    const yes = await G.UI.ask(`Spend ${fmt(price)} PokéCoins on team item slot ${k}?`, {
      title: 'Buy team item slot',
      ok: 'Buy',
      note: `You will have ${fmt(Math.max(0, G.DB.save.coins - price))} left.`,
    });
    if (!yes) return;
    const r = G.Items.buySlot(G.DB.save);
    if (!r.ok) {
      G.Audio.sfx('error');
      G.UI.toast(r.error === 'poor' ? 'Not enough PokéCoins' : 'You cannot buy that');
      refresh();
      return;
    }
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    G.UI.toast(`Team item slot ${r.slots} unlocked!`);
    refresh();
  }

  // ---------------- Pokemon tab (the gacha) ----------------
  function refreshPokemon() {
    const s = G.DB.save;
    const banner = G.Gacha.BANNERS[gen - 1];
    document.querySelectorAll('#gacha-gens .gen-tab').forEach((t) => t.classList.toggle('on', +t.dataset.gen === gen));

    const all = G.DEX.filter((p) => p.gen === gen);
    const owned = all.filter((p) => s.owned[p.dex]).length;
    const shinies = all.filter((p) => s.shiny && s.shiny[p.dex]).length;
    const [c1, c2, c3] = banner.color;
    $('banner').style.background = `radial-gradient(circle at 80% 30%, rgba(255,210,63,.3), transparent 45%),
       radial-gradient(circle at 15% 80%, rgba(196,123,255,.3), transparent 50%),
       linear-gradient(135deg, ${c1}, ${c2} 55%, ${c3})`;
    $('banner-title').textContent = banner.name + ' Misterioso';
    $('banner-desc').textContent = `Los ${all.length} Pokémon de la generación ${gen}. ¡Los legendarios esperan!`;
    $('gacha-owned').innerHTML =
      `Tienes ${owned} de ${all.length}` + (shinies ? ` · ${G.Icons.html('shiny', 12)} ${shinies} shiny` : '');

    const feat = $('gacha-feat');
    feat.innerHTML = '';
    for (const dex of G.Gacha.featured(gen)) {
      feat.appendChild(G.UI.spriteCanvas(dex, 170, 190, { lively: true, scale: 2, dir: 1 }));
    }

    const pity = (s.pity && s.pity[gen]) || 0;
    $('gacha-pity').textContent = `Tiradas sin legendaria en ${banner.name}: ${pity} / ${G.Gacha.PITY_5}`;

    $('gacha-rates').innerHTML =
      '<h3>Probabilidades</h3>' +
      G.Gacha.RATES.slice()
        .reverse()
        .map(
          ([r, w]) => `
      <div><span style="color:${G.Gacha.RARITY_COLOR[r]}">${G.UI.stars(r, 10)} ${G.Gacha.RARITY_NAME[r]}</span>
      <span>${w}% · ${G.Gacha.pool(r, gen).length}</span></div>`
        )
        .join('') +
      `<div><span>${G.Icons.html('shiny', 12)} Shiny</span><span>1%</span></div>
       <p class="note">· La tirada ×10 garantiza al menos una Épica.<br>
       · A las ${G.Gacha.PITY_5} tiradas sin Legendaria en un banner, la siguiente lo es.<br>
       · Los repetidos dan Pokémonedas. Los shiny no se repiten.<br>
       · Pokeballs are earned by playing: some Pokémon drop them when defeated.</p>`;

    const t = s.tickets;
    $('cost-1').innerHTML = `${G.Icons.html('ball', 24)} 1`;
    $('cost-10').innerHTML = `${G.Icons.html('ball', 24)} 10`;
    $('cost-10b').innerHTML = `${G.Icons.html('ball4', 24)} 1`;
    $('gacha-tickets').innerHTML =
      `You have ${G.Icons.html('ball', 24)} <b>${t.t1}</b> Pokeballs and ${G.Icons.html('ball4', 24)} <b>${t.t10}</b> Master Balls`;
    $('pull-1').disabled = !G.Gacha.costOf(s, 1);
    $('pull-10').disabled = !G.Gacha.costOf(s, 10, 't1');
    $('pull-10b').disabled = !G.Gacha.costOf(s, 10, 't10');
    G.UI.refreshCoins();
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function pull(n, use = 't1') {
    if (busy) return;
    // Too little room: warn first (pokebox 3a-4). The pull is never blocked; whatever does not fit is sold on arrival.
    const s = G.DB.save;
    if (G.Gacha.costOf(s, n, use)) {
      const free = G.Copies.freePlaces(s);
      if (free < n) {
        const yes = await G.UI.ask(
          "You don't have enough space. Any pokemon pulled that can't be placed in a slot will be automatically sold.",
          {
            title: 'Not enough space',
            ok: 'Pull anyway',
            note: `${fmt(free)} free place${free === 1 ? '' : 's'}, ${n} Pokémon.`,
          }
        );
        if (!yes || busy) return;
      }
    }
    const res = G.Gacha.pull(G.DB.save, n, gen, use);
    if (!res) {
      G.Audio.sfx('error');
      G.UI.toast('Not enough Pokeballs or Master Balls: earn them by playing');
      return;
    }
    G.Progress.checkAch();
    G.DB.commit(true);
    busy = true;

    const best = Math.max(...res.map((r) => r.rarity));
    const fx = $('pull-fx'),
      slot = $('slot'),
      out = $('pull-results');
    out.innerHTML = '';
    cards = [];
    $('pull-close').classList.add('hidden');
    $('pull-sellall').classList.add('hidden');
    slot.style.display = '';
    fx.classList.remove('hidden');

    // The slot machine (ui/slots.js) and then the cards.
    await G.Slots.play(slot, res);
    G.Audio.sfx('burst', { rarity: best });
    slot.style.display = 'none';

    for (const r of res) {
      const mon = G.DEX_BY[r.dex];
      const c = document.createElement('div');
      c.className = 'pcard r' + r.rarity + (r.shiny ? ' shiny' : '') + (r.sold ? ' sold' : '');
      c.style.setProperty('--rc', r.shiny ? '#9ae6ff' : G.Gacha.RARITY_COLOR[r.rarity]);
      c.innerHTML = `<div class="stars">${G.UI.stars(r.rarity, 24)}</div>`;
      c.appendChild(G.UI.spriteCanvas(r.dex, 132, 120, { lively: r.rarity >= 4 || r.shiny, scale: 2, shiny: r.shiny }));
      const newTag = `<span class="new">${r.shiny ? '¡SHINY NUEVO!' : '¡NUEVO!'}</span>`;
      const tag = r.sold
        ? `${r.isNew ? newTag + ' ' : ''}Box full · sold <span class="coin"></span> +${fmt(r.sold)}`
        : r.isNew
          ? newTag
          : r.box != null
            ? `To Box ${r.box + 1}`
            : '';
      c.insertAdjacentHTML(
        'beforeend',
        `<b>${r.shiny ? G.Icons.html('shiny', 12) + ' ' : ''}${mon.name}</b><div class="tag">${tag}</div>`
      );
      // A repeat can be sold straight from its card; a new one is sold from the box (fewer misclicks).
      const price = !r.isNew && r.uid ? G.Copies.sellPrice(G.DB.save, r.uid) : null;
      const k = { r, c, b: null, sold: false };
      cards.push(k);
      if (price != null) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn gold small pcard-sell';
        b.dataset.sfx = 'click';
        b.innerHTML = `<span class="coin"></span> Sell +${fmt(price)}`;
        b.onclick = () => sellCard(k);
        c.appendChild(b);
        k.b = b;
      }
      out.appendChild(c);
      G.Audio.sfx('reveal', { rarity: r.rarity });
      await wait(n === 10 ? 150 : 0);
    }
    $('pull-close').classList.remove('hidden');
    refreshSellAll();
    busy = false;
  }

  /** Sell a repeat from its result card: one click for 1 to 3 stars, a confirm first for 4 and 5 stars and any shiny. No undo. */
  async function sellCard(k) {
    const r = k.r,
      s = G.DB.save,
      price = G.Copies.sellPrice(s, r.uid);
    if (price == null) {
      if (k.b) k.b.remove();
      return;
    }
    if (r.rarity >= 4 || r.shiny) {
      const name = (r.shiny ? 'shiny ' : '') + G.DEX_BY[r.dex].name;
      const yes = await G.UI.ask(`Sell ${name} for ${fmt(price)} PokéCoins?`, { title: 'Sell Pokémon', ok: 'Sell' });
      if (!yes) return;
    }
    const res = G.Copies.sell(s, r.uid);
    if (!res.ok) {
      G.Audio.sfx('error');
      G.UI.toast(res.error === 'team' ? 'Remove it from your team first.' : 'That Pokémon is gone.');
      if (k.b) k.b.remove();
      refreshSellAll();
      return;
    }
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    markSold(k, res.coins);
    refreshSellAll();
  }

  /** A result card after its sale: dimmed, no button, "Sold +N". */
  function markSold(k, coins) {
    k.sold = true;
    if (k.b) k.b.remove();
    k.c.classList.add('sold');
    const tag = k.c.querySelector('.tag');
    if (tag) tag.innerHTML = `Sold <span class="coin"></span> +${fmt(coins)}`;
  }

  /** The cards "Sell repeats" would sell now: G.Gacha.bulkSellable, still unsold, still in the box. */
  function bulkCards() {
    const ok = new Set(G.Gacha.bulkSellable(cards.map((k) => k.r)).map((r) => r.uid));
    return cards.filter((k) => !k.sold && ok.has(k.r.uid) && G.Copies.sellPrice(G.DB.save, k.r.uid) != null);
  }

  function refreshSellAll() {
    const b = $('pull-sellall');
    if (!b) return;
    const list = bulkCards();
    let coins = 0;
    for (const k of list) coins += G.Copies.sellPrice(G.DB.save, k.r.uid);
    b.classList.toggle('hidden', !list.length);
    b.innerHTML = `<span class="coin"></span> Sell repeats +${fmt(coins)}`;
    b.title = 'Sells the 1 to 3 star repeats that are not shiny. 4 and 5 stars and shinies sell one by one.';
  }

  /** Sell every 1 to 3 star normal repeat of this pull in one click, no confirm (3b D11). */
  function sellRepeats() {
    const list = bulkCards();
    if (!list.length) return;
    const price = new Map(list.map((k) => [k.r.uid, G.Copies.sellPrice(G.DB.save, k.r.uid)]));
    const res = G.Copies.sellMany(
      G.DB.save,
      list.map((k) => k.r.uid)
    );
    if (res.sold) {
      G.Audio.sfx('confirm');
      G.DB.commit(true);
      const gone = new Set(res.ids);
      for (const k of list) if (gone.has(k.r.uid)) markSold(k, price.get(k.r.uid));
    } else G.Audio.sfx('error');
    refreshSellAll();
  }

  function close() {
    $('pull-fx').classList.add('hidden');
    $('pull-sellall').classList.add('hidden');
    refresh();
  }

  return {
    init,
    open,
    get open_() {
      return !$('pull-fx').classList.contains('hidden');
    },
  };
})();
