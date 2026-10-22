/* ============ gacha-ui.js — per-generation banners and pull animation ============
 * The logic (probabilities, pity, shiny, repeats) is in systems/gacha.js.
 * F3d-3: this is the SHOP screen now. Tabs: Pokemon (the gacha, regions down the left) | Team Items (100k unlocks) | Team Upgrades (team item slots).
 */
G.GachaUI = (() => {
  const $ = G.UI.$;
  let busy = false;
  let gen = 1;
  let tab = 'pokemon';          // 'pokemon' | 'items' | 'upgrades'
  let shopSel = null;           // Team Items tab: the item shown in the detail column
  const TABS = [['pokemon', 'Pokemon'], ['items', 'Team Items'], ['upgrades', 'Team Upgrades']];
  const fmt = n => n.toLocaleString('en-US');

  function init() {
    $('pull-1').onclick = () => pull(1);
    $('pull-10').onclick = () => pull(10, 't1');
    $('pull-10b').onclick = () => pull(10, 't10');
    $('pull-close').onclick = close;

    TABS.forEach(([k, n]) => {
      const b = document.createElement('button');
      b.className = 'gen-tab';
      b.dataset.tab = k;
      b.innerHTML = `<b>${n}</b>`;
      b.onclick = () => { tab = k; refresh(); };
      $('shop-tabs').appendChild(b);
    });

    const tabs = $('gacha-gens');
    G.Gacha.BANNERS.forEach(b => {
      const t = document.createElement('button');
      t.className = 'gen-tab';
      t.dataset.gen = b.gen;
      t.innerHTML = `<b>${b.name}</b><small>Gen ${b.gen}</small>`;
      t.onclick = () => { gen = b.gen; refresh(); };
      tabs.appendChild(t);
    });
  }

  function open() {
    tab = 'pokemon';                 // the Shop always opens on the Pokemon tab
    G.UI.show('scr-gacha', true);
    refresh();
  }

  /** Redraw the current Shop tab. */
  function refresh() {
    document.querySelectorAll('#shop-tabs .gen-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
    for (const [k, id] of [['pokemon', 'shop-pokemon'], ['items', 'shop-items'], ['upgrades', 'shop-upgrades']]) $(id).classList.toggle('hidden', k !== tab);
    if (tab === 'pokemon') refreshPokemon(); else if (tab === 'items') refreshItems(); else refreshUpgrades();
    G.UI.refreshCoins();
  }

  // ---------------- Team Items tab ----------------
  function refreshItems() {
    const s = G.DB.save, grid = $('shop-items-grid'), det = $('shop-items-detail');
    const list = G.Items.LIST.filter(i => i.tier === 'run' && !G.Items.unlocked(s, i.id));
    $('shop-items-count').textContent = list.length ? list.length + ' for sale.' : '';
    if (!list.some(i => i.id === shopSel)) shopSel = list.length ? list[0].id : null;
    grid.innerHTML = '';
    if (!list.length) grid.innerHTML = '<div class="sub" style="grid-column:1/-1;padding:12px">You own every team item.</div>';
    for (const it of list) {
      const el = document.createElement('div');
      el.className = 'cell inv-cell' + (shopSel === it.id ? ' on' : '');
      el.innerHTML = `<div class="inv-ico">${G.Icons.html(it.icon || it.id, 36)}</div><b>${it.name}</b>`;
      el.onclick = () => { shopSel = it.id; G.Audio.sfx('click'); refreshItems(); };
      grid.appendChild(el);
    }
    const it = G.Items.BY[shopSel];
    if (!it) { det.innerHTML = '<div class="sub">Nothing to buy.</div>'; return; }
    const price = G.Items.TEAM_ITEM_PRICE;
    det.innerHTML = `<div class="inv-dico">${G.Icons.html(it.icon || it.id, 56)}</div><h3 style="margin:6px 0 4px">${it.name}</h3>
      <div class="ds">${it.desc}</div>
      <div class="shop-price"><span class="coin"></span> ${fmt(price)}</div>
      <div class="inv-act"><button class="btn gold" id="shop-buy"${s.coins >= price ? '' : ' disabled'}>${s.coins >= price ? 'Buy' : 'Not enough PokéCoins'}</button></div>`;
    $('shop-buy').onclick = () => buyItem(it.id);
  }

  async function buyItem(id) {
    const it = G.Items.BY[id], price = G.Items.TEAM_ITEM_PRICE;
    const yes = await G.UI.ask(`Spend ${fmt(price)} PokéCoins on ${it.name}?`,
      { title: 'Buy team item', ok: 'Buy', note: `You will have ${fmt(Math.max(0, G.DB.save.coins - price))} left.` });
    if (!yes) return;
    const r = G.Items.buyTeamItem(G.DB.save, id);
    if (!r.ok) { G.Audio.sfx('error'); G.UI.toast(r.error === 'poor' ? 'Not enough PokéCoins' : 'You cannot buy that'); refresh(); return; }
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    G.UI.toast(`Unlocked ${it.name}! Equip it in Inventory.`);
    refresh();
  }

  // ---------------- Team Upgrades tab: team item slots, bought in order ----------------
  function refreshUpgrades() {
    const s = G.DB.save, have = G.Items.runSlots(s), max = G.Items.RUN_SLOTS_MAX, box = $('shop-upgrades');
    let html = `<p class="sub" style="margin:4px 0 10px">You have <b>${have}</b> of ${max} team item slots. Each slot carries one team item into every run. Slots are bought in order.</p>`;
    for (let k = 2; k <= max; k++) {
      const price = G.Items.slotPrice(k), owned = have >= k, next = k === have + 1, afford = s.coins >= price;
      html += `<div class="panel shop-up${owned ? ' owned' : ''}"><div class="shop-up-t"><b>Team item slot ${k}</b>
        <span class="ds">${owned ? 'Unlocked' : next ? 'Carry one more team item into every run.' : `Buy slot ${k - 1} first.`}</span></div>
        <div class="shop-price"><span class="coin"></span> ${fmt(price)}</div>
        <button class="btn gold shop-up-b" data-slot="${k}"${owned || !next || !afford ? ' disabled' : ''}>${owned ? 'Owned' : !next ? 'Locked' : afford ? 'Buy' : 'Not enough PokéCoins'}</button></div>`;
    }
    box.innerHTML = html;
    box.querySelectorAll('.shop-up-b').forEach(b => { b.onclick = () => buySlot(+b.dataset.slot); });
  }

  async function buySlot(k) {
    const price = G.Items.slotPrice(k);
    const yes = await G.UI.ask(`Spend ${fmt(price)} PokéCoins on team item slot ${k}?`,
      { title: 'Buy team item slot', ok: 'Buy', note: `You will have ${fmt(Math.max(0, G.DB.save.coins - price))} left.` });
    if (!yes) return;
    const r = G.Items.buySlot(G.DB.save);
    if (!r.ok) { G.Audio.sfx('error'); G.UI.toast(r.error === 'poor' ? 'Not enough PokéCoins' : 'You cannot buy that'); refresh(); return; }
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    G.UI.toast(`Team item slot ${r.slots} unlocked!`);
    refresh();
  }

  // ---------------- Pokemon tab (the gacha) ----------------
  function refreshPokemon() {
    const s = G.DB.save;
    const banner = G.Gacha.BANNERS[gen - 1];
    document.querySelectorAll('#gacha-gens .gen-tab').forEach(t => t.classList.toggle('on', +t.dataset.gen === gen));

    const all = G.DEX.filter(p => p.gen === gen);
    const owned = all.filter(p => s.owned[p.dex]).length;
    const shinies = all.filter(p => s.shiny && s.shiny[p.dex]).length;
    const [c1, c2, c3] = banner.color;
    $('banner').style.background =
      `radial-gradient(circle at 80% 30%, rgba(255,210,63,.3), transparent 45%),
       radial-gradient(circle at 15% 80%, rgba(196,123,255,.3), transparent 50%),
       linear-gradient(135deg, ${c1}, ${c2} 55%, ${c3})`;
    $('banner-title').textContent = banner.name + ' Misterioso';
    $('banner-desc').textContent = `Los ${all.length} Pokémon de la generación ${gen}. ¡Los legendarios esperan!`;
    $('gacha-owned').innerHTML = `Tienes ${owned} de ${all.length}` +
      (shinies ? ` · ${G.Icons.html('shiny', 12)} ${shinies} shiny` : '');

    const feat = $('gacha-feat');
    feat.innerHTML = '';
    for (const dex of G.Gacha.featured(gen)) {
      feat.appendChild(G.UI.spriteCanvas(dex, 170, 190, { lively: true, scale: 2, dir: 1 }));
    }

    const pity = (s.pity && s.pity[gen]) || 0;
    $('gacha-pity').textContent = `Tiradas sin legendaria en ${banner.name}: ${pity} / ${G.Gacha.PITY_5}`;

    $('gacha-rates').innerHTML = '<h3>Probabilidades</h3>' + G.Gacha.RATES.slice().reverse().map(([r, w]) => `
      <div><span style="color:${G.Gacha.RARITY_COLOR[r]}">${G.UI.stars(r, 10)} ${G.Gacha.RARITY_NAME[r]}</span>
      <span>${w}% · ${G.Gacha.pool(r, gen).length}</span></div>`).join('') +
      `<div><span>${G.Icons.html('shiny', 12)} Shiny</span><span>1%</span></div>
       <p class="note">· La tirada ×10 garantiza al menos una Épica.<br>
       · A las ${G.Gacha.PITY_5} tiradas sin Legendaria en un banner, la siguiente lo es.<br>
       · Los repetidos dan Pokémonedas. Los shiny no se repiten.<br>
       · Pokeballs are earned by playing: some Pokémon drop them when defeated, and
         bosses and rift legendaries sometimes drop Master Balls.</p>`;

    const t = s.tickets;
    $('cost-1').innerHTML = `${G.Icons.html('ball', 24)} 1`;
    $('cost-10').innerHTML = `${G.Icons.html('ball', 24)} 10`;
    $('cost-10b').innerHTML = `${G.Icons.html('ball4', 24)} 1`;
    $('gacha-tickets').innerHTML = `You have ${G.Icons.html('ball', 24)} <b>${t.t1}</b> Pokeballs and ${G.Icons.html('ball4', 24)} <b>${t.t10}</b> Master Balls`;
    $('pull-1').disabled = !G.Gacha.costOf(s, 1);
    $('pull-10').disabled = !G.Gacha.costOf(s, 10, 't1');
    $('pull-10b').disabled = !G.Gacha.costOf(s, 10, 't10');
    G.UI.refreshCoins();
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));

  async function pull(n, use = 't1') {
    if (busy) return;
    const res = G.Gacha.pull(G.DB.save, n, gen, use);
    if (!res) { G.Audio.sfx('error'); G.UI.toast('Not enough Pokeballs or Master Balls: earn them by playing'); return; }
    G.Progress.checkAch();
    G.DB.commit(true);
    busy = true;

    const best = Math.max(...res.map(r => r.rarity));
    const fx = $('pull-fx'), slot = $('slot'), out = $('pull-results');
    out.innerHTML = '';
    $('pull-close').classList.add('hidden');
    slot.style.display = '';
    fx.classList.remove('hidden');

    // The slot machine (ui/slots.js) and then the cards.
    await G.Slots.play(slot, res);
    G.Audio.sfx('burst', { rarity: best });
    slot.style.display = 'none';

    for (const r of res) {
      const mon = G.DEX_BY[r.dex];
      const c = document.createElement('div');
      c.className = 'pcard r' + r.rarity + (r.shiny ? ' shiny' : '');
      c.style.setProperty('--rc', r.shiny ? '#9ae6ff' : G.Gacha.RARITY_COLOR[r.rarity]);
      c.innerHTML = `<div class="stars">${G.UI.stars(r.rarity, 24)}</div>`;
      c.appendChild(G.UI.spriteCanvas(r.dex, 132, 120, { lively: r.rarity >= 4 || r.shiny, scale: 2, shiny: r.shiny }));
      const tag = r.isNew
        ? `<span class="new">${r.shiny ? '¡SHINY NUEVO!' : '¡NUEVO!'}</span>`
        : `Repetido · <span class="coin"></span> +${r.refund}`;
      c.insertAdjacentHTML('beforeend', `<b>${r.shiny ? G.Icons.html('shiny', 12) + ' ' : ''}${mon.name}</b><div class="tag">${tag}</div>`);
      out.appendChild(c);
      G.Audio.sfx('reveal', { rarity: r.rarity });
      await wait(n === 10 ? 150 : 0);
    }
    $('pull-close').classList.remove('hidden');
    busy = false;
  }

  function close() {
    $('pull-fx').classList.add('hidden');
    refresh();
  }

  return { init, open, get open_() { return !$('pull-fx').classList.contains('hidden'); } };
})();
