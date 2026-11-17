/* ============ gacha-ui.js: the Main Menu Shop (G.GachaUI; #149 rework) ============
 * The gacha is gone (#133, acquisition rework); the file keeps its old name. Mockups: assets/excalidraw/Shop-*.svg;
 * plan: docs/ASCII Concept Maps/149 - Shop Rework Opening.md. A window on the menu screens' 1920 x 1080 stage over the
 * dimmed Main Menu (css/bw-shop.css). Every buying rule lives in G.Items and G.Grounds; this file draws and routes input.
 *   rail     four icon tabs down the window's left edge (assets/ui/shop_icons/), top to bottom: Pokeballs (#137 fills
 *            it), Character Upgrades (team item slots, berry slots), Team Items (100k unlocks), TRs (149f fills it).
 *            The chosen tab uses its -selected art and sits half out of the window.
 *   Exit     the team menu's button, bottom right; back to the Main Menu.
 *   input    one selection cursor over the rail and Exit (149a; the panes' Buy buttons join it when 149b and 149c
 *            rebuild them). Arrows move it, hover moves it too; Enter or a click picks a tab or presses Exit; Esc leaves.
 */
G.GachaUI = (() => {
  const $ = G.UI.$;
  const kitOverlay = G.HudOverlay,
    railHost = document.getElementById('shop-rail'),
    stageHost = document.querySelector('#scr-gacha .shop-host');
  if (!kitOverlay || !kitOverlay.ready || !railHost || !stageHost) {
    console.warn('[Shop] the HUD kit did not load: the Shop cannot open');
    return { init() {}, open() {} };
  }
  const { html, signal, hooks, preact, Cursor, TeamButton, REST_RIM, FOCUS_RIM, fitToStage } = kitOverlay.kit;
  const { showTooltip, hideTooltip } = kitOverlay.kit;
  let shopSel = null; // Team Items tab: the item shown in the detail column
  const fmt = (n) => n.toLocaleString('en-US');

  // ---------- tabs (top to bottom on the rail): key, name, icon file; each key's pane is #shop-<key> ----------
  const TABS = [
    { key: 'balls', name: 'Pokeballs', icon: 'pokeball' },
    { key: 'upgrades', name: 'Character Upgrades', icon: 'character-upgrade' },
    { key: 'items', name: 'Team Items', icon: 'team-item' },
    { key: 'trs', name: 'TRs', icon: 'tm-purchase' },
  ];
  const OPENING_TAB = 'items'; // the Shop opens on Team Items, as before the rework
  const ICON_PATH = 'assets/ui/shop_icons/';
  // ---------- sizes and places (stage pixels, inside the window; css/bw-shop.css places the window) ----------
  const WINDOW = { width: 1145, height: 670 },
    RAIL = { left: 8, firstTop: 70, step: 130, cell: 96, selectedShift: 48 }, // icons up to 32 px, drawn 3x (CSS)
    EXIT = { right: 30, bottom: 24, artWidth: 45 }, // the team menu's button: 4 px per art pixel, 18 rows
    TEAM_BUTTON_PIXEL = 4,
    TEAM_BUTTON_HEIGHT = 18 * TEAM_BUTTON_PIXEL;

  // ---------- state ----------
  const tab = signal(OPENING_TAB);
  const focus = signal({ area: 'tab', index: 0 }); // { area: 'tab', index } | { area: 'exit' }
  const tabIndex = (key) => TABS.findIndex((entry) => entry.key === key);

  function init() {
    // PokeCoins changed while the Shop is open (a purchase, a debug command): its buttons follow at once.
    G.DB.onSave(() => {
      if (G.UI.isOpen('scr-gacha')) refresh();
    });
    addEventListener('keydown', onKey);
  }

  function open() {
    G.UI.show('scr-gacha', true);
    fitStage();
    tab.value = OPENING_TAB;
    focus.value = { area: 'tab', index: tabIndex(OPENING_TAB) };
    refresh();
  }

  function close() {
    if (!G.UI.isOpen('scr-gacha')) return;
    hideTooltip();
    G.Audio.sfx('back');
    G.MenuUI.open();
  }

  /** Shows the tab with this key and redraws it. */
  function pickTab(key) {
    focus.value = { area: 'tab', index: tabIndex(key) };
    if (key === tab.value) return;
    tab.value = key;
    G.Audio.sfx('select');
    refresh();
  }

  /** Redraw the current Shop tab. */
  function refresh() {
    for (const { key } of TABS) $('shop-' + key).classList.toggle('hidden', key !== tab.value);
    if (tab.value === 'items') refreshItems();
    else if (tab.value === 'upgrades') refreshUpgrades();
    G.UI.refreshCoins();
  }

  // ---------- keys (the Main Menu screens read the page's keydown, as menu.js does) ----------
  function onKey(event) {
    if (!G.UI.isOpen('scr-gacha') || G.UI.isOpen('scr-ask') || event.target.closest('input, textarea, select')) return;
    const key = event.key;
    if (key === 'Escape') close();
    else if (key === 'Enter') press();
    else if (key === 'ArrowUp' || key === 'ArrowDown') moveCursor(0, key === 'ArrowDown' ? 1 : -1);
    else if (key === 'ArrowLeft' || key === 'ArrowRight') moveCursor(key === 'ArrowRight' ? 1 : -1, 0);
    else return;
    event.preventDefault();
  }

  /** Up and Down walk the rail; Right goes to Exit, Left comes back to the shown tab. */
  function moveCursor(dx, dy) {
    const at = focus.value;
    let next = null;
    if (at.area === 'tab' && dx > 0) next = { area: 'exit' };
    else if (at.area === 'tab' && dy) {
      const index = Math.max(0, Math.min(TABS.length - 1, at.index + dy));
      if (index !== at.index) next = { area: 'tab', index };
    } else if (at.area === 'exit' && dx < 0) next = { area: 'tab', index: tabIndex(tab.value) };
    if (!next) return;
    focus.value = next;
    G.Audio.sfx('hover');
  }

  /** Enter on whatever the cursor is on. */
  function press() {
    const at = focus.value;
    if (at.area === 'exit') close();
    else pickTab(TABS[at.index].key);
  }

  // ---------- drawing the rail and Exit ----------
  const px = (value) => value + 'px';

  function Tab({ entry, index }) {
    const selected = entry.key === tab.value,
      at = focus.value;
    return html`<div
      class=${'shop-tab' + (selected ? ' is-selected' : '')}
      data-tab=${entry.key}
      style=${{
        left: px(RAIL.left - (selected ? RAIL.selectedShift : 0)),
        top: px(RAIL.firstTop + index * RAIL.step),
        width: px(RAIL.cell),
        height: px(RAIL.cell),
      }}
      onMouseEnter=${() => (focus.value = { area: 'tab', index })}
      onClick=${() => pickTab(entry.key)}
    >
      <img src=${ICON_PATH + entry.icon + (selected ? '-selected' : '') + '.png'} alt=${entry.name} />
      ${at.area === 'tab' && at.index === index ? html`<${Cursor} />` : null}
    </div>`;
  }

  function Rail() {
    const at = focus.value,
      exitFocused = at.area === 'exit',
      shownTab = tab.value;
    const rootRef = hooks.useRef(null);
    // the focused tab's name shows in the page's one tooltip layer (keys and hover alike)
    hooks.useLayoutEffect(() => {
      if (at.area !== 'tab' || !G.UI.isOpen('scr-gacha')) return hideTooltip();
      const anchor = rootRef.current && rootRef.current.querySelector('[data-tab="' + TABS[at.index].key + '"]');
      showTooltip(anchor, { name: TABS[at.index].name }, { side: 'rightOf' });
    }, [at, shownTab]);
    return html`<div ref=${rootRef}>
      ${TABS.map((entry, index) => html`<${Tab} key=${entry.key} entry=${entry} index=${index} />`)}
      <div
        class="shop-button shop-exit"
        style=${{
          left: px(WINDOW.width - EXIT.right - EXIT.artWidth * TEAM_BUTTON_PIXEL),
          top: px(WINDOW.height - EXIT.bottom - TEAM_BUTTON_HEIGHT),
          width: px(EXIT.artWidth * TEAM_BUTTON_PIXEL), // the cursor's corners sit on this box
          height: px(TEAM_BUTTON_HEIGHT),
        }}
      >
        <${TeamButton}
          id="shop-exit"
          label="Exit"
          artWidth=${EXIT.artWidth}
          rim=${REST_RIM}
          focusRim=${FOCUS_RIM}
          focused=${exitFocused}
          onEnter=${() => (focus.value = { area: 'exit' })}
          onPress=${close}
        />
        ${exitFocused ? html`<${Cursor} />` : null}
      </div>
    </div>`;
  }

  preact.render(html`<${Rail} />`, railHost);
  const fitStage = fitToStage(stageHost);

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
