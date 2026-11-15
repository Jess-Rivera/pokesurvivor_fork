/* ============ gacha-ui.js: the SHOP screen ============
 * Tabs: Team Items (100k unlocks) | Team Upgrades (team item slots, berry slots). The gacha is gone (#133, acquisition
 * rework); the file keeps its old name. The freed Pokemon tab is for the ball Shop (#137).
 */
G.GachaUI = (() => {
  const $ = G.UI.$;
  let tab = 'items'; // 'items' | 'upgrades'
  let shopSel = null; // Team Items tab: the item shown in the detail column
  const TABS = [
    ['items', 'Team Items'],
    ['upgrades', 'Team Upgrades'],
  ];
  const fmt = (n) => n.toLocaleString('en-US');

  function init() {
    // PokeCoins changed while the Shop is open (a purchase, a debug command): its buttons follow at once.
    G.DB.onSave(() => {
      if (G.UI.isOpen('scr-gacha')) refresh();
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
  }

  function open() {
    tab = 'items'; // the Shop always opens on the Team Items tab
    G.UI.show('scr-gacha', true);
    refresh();
  }

  /** Redraw the current Shop tab. */
  function refresh() {
    document.querySelectorAll('#shop-tabs .gen-tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === tab));
    for (const [k, id] of [
      ['items', 'shop-items'],
      ['upgrades', 'shop-upgrades'],
    ])
      $(id).classList.toggle('hidden', k !== tab);
    if (tab === 'items') refreshItems();
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

  return { init, open };
})();
