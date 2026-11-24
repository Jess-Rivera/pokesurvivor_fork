/* ============ menu.js: the Main Menu (its rows, cursor and keys) and the region select before a run ============
 * Starts the menu screens split out of it (#154): menu-dex-grid.js, menu-pokedex.js, menu-team.js,
 * menu-team-copies.js, menu-upgrades.js. Other modules call only G.MenuUI (init, open, GEN_NAMES, REGION_NAMES). */
G.MenuUI = (() => {
  const $ = G.UI.$;
  const GEN_NAMES = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Teselia', 'Kalos', 'Alola', 'Galar', 'Paldea'];
  // Region select cards (new English text; GEN_NAMES above is the old key list other screens use).
  const REGION_CARDS = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea'];
  // Generations you can pick for now. TODO: unlock the rest by region completion (BOSS-REWORK). Random stays locked
  // because it rolls any generation.
  const REGIONS_OPEN = [1];

  let rows = [],
    menuCur = 0;
  function select(i) {
    menuCur = (i + rows.length) % rows.length;
    rows.forEach((b, k) => b.classList.toggle('sel', k === menuCur));
  }
  /** How far a key moves the row cursor: 1 down, -1 up, 0 for any other key. The arrows and the bound movement keys
   *  both move it, as in the Shop and Inventory (#153, decision 2026-11-17-one-menu-key-set). */
  function rowStepOf(event) {
    const code = (event.code || event.key).toLowerCase();
    if (event.key === 'ArrowDown' || G.Input.bindingsOf('move_down').includes(code)) return 1;
    if (event.key === 'ArrowUp' || G.Input.bindingsOf('move_up').includes(code)) return -1;
    return 0;
  }
  /** The main menu is the top screen: nothing (Settings, a dialog, another screen) open over it. */
  const menuOnTop = () => G.UI.isOpen('scr-menu') && document.querySelectorAll('.scr:not(.hidden)').length === 1;

  function init() {
    // Preload the row art and fonts, so the first hover and the first open never draw half a menu.
    for (const n of ['row', 'row-sel', 'play', 'play-sel']) new Image().src = `assets/ui/menu/${n}.png`;
    for (const n of ['btn', 'btn-sel', 'arrow']) new Image().src = `assets/ui/team/${n}.png`;
    for (const n of ['box', 'box-sel']) new Image().src = `assets/ui/upgrades/${n}.png`;
    if (document.fonts) {
      document.fonts.load('16px PokeBW').catch(() => {});
      document.fonts.load('16px Michroma').catch(() => {});
    }
    rows = [...document.querySelectorAll('#scr-menu [data-go]')];
    rows.forEach((b, i) => {
      b.addEventListener('pointerenter', () => !rgOpen && select(i));
      b.addEventListener('focus', () => !rgOpen && select(i));
    });
    addEventListener('keydown', (e) => {
      if (!menuOnTop() || rgOpen || e.target.closest('input, textarea, select')) return;
      const rowStep = rowStepOf(e);
      if (rowStep) {
        select(menuCur + rowStep);
        G.Audio.sfx('hover');
      } else if (e.key === 'Enter' || e.key === ' ') rows[menuCur].click();
      else return;
      e.preventDefault();
      // A key it handles goes no further: Enter or Space on Play opens the region picker, whose own listener comes next
      // and would read the same key as picking the first card (the run started without showing the picker; #153).
      e.stopImmediatePropagation();
    });
    // The screens' own listeners, in the order menu.js always registered them (a key one handles goes no further).
    G.MenuTeam.init();
    G.MenuUpgrades.init();
    document.querySelectorAll('#scr-menu [data-go]').forEach((b) => {
      b.dataset.sfx = b.dataset.go === 'play' ? 'confirm' : 'click';
      b.onclick = () => {
        const go = b.dataset.go;
        if (go === 'play') {
          if (G.Social.room) G.LobbyUI.open();
          else openRegionPicker();
        } else if (go === 'team') G.MenuTeam.open();
        else if (go === 'inventory') G.InventoryUI.open();
        else if (go === 'dex') G.MenuPokedex.browse();
        else if (go === 'upgrades') G.MenuUpgrades.open();
        else if (go === 'gacha') G.GachaUI.open();
        else if (go === 'goals') G.GoalsUI.open();
        else if (go === 'friends') G.FriendsUI.open();
        else if (go === 'rank') G.RankingUI.open();
        else if (go === 'settings') G.SettingsUI.open();
      };
    });
    document.querySelectorAll('[data-back]').forEach((b) => {
      b.onclick = open;
    });
    initRegionPicker();
    G.Social.on(() => {
      if (G.UI.isOpen('scr-menu')) socialLine();
    });
    $('btn-logout').onclick = async () => {
      if (
        G.DB.guest &&
        !(await G.UI.ask(G.T('Eres invitado: se perderá todo el progreso. ¿Salir?'), {
          title: 'Sign out',
          ok: 'Sign out',
          intent: 'negative',
        }))
      )
        return;
      G.Audio.music(null);
      G.DB.logout().then(() => G.Flow.toLogin());
    };
  }

  // ---------------- main menu ----------------

  function open() {
    const s = G.DB.save;
    closeRegionPicker();
    G.UI.chrome(true);
    G.UI.show('scr-menu');

    const owned = Object.keys(s.owned).filter((d) => G.DEX_BY[d]).length;
    const shinies = Object.keys(s.shiny || {}).length;
    $('menu-dex-count').textContent = `${owned}/${G.DEX.length} - ${shinies} shiny`; // under Team (the separate Pokémon menu entry is gone)

    const st = s.stats;
    $('menu-stats').innerHTML =
      `Runs <b>${st.runs}</b> · Best <b>${G.U.mmss(st.bestTime)}</b> · ` +
      `Lv <b>${st.bestLevel}</b> · KOs <b>${st.totalKills.toLocaleString('en')}</b>`;
    $('guest-note').classList.toggle('hidden', !G.DB.guest);

    socialLine();
    // Mission prizes to claim.
    G.Progress.checkAch();
    const pend = G.Progress.pending();
    $('menu-goals-sub').textContent = pend
      ? pend + (pend === 1 ? ' premio por recoger' : ' premios por recoger')
      : 'Misiones, logros y perfil';
    $('menu-goals-sub').classList.toggle('gold', pend > 0);
    // With a cloud account: friends online, invitations and (once) the nickname.
    if (G.DB.online && !G.Social.started) {
      G.Social.start().then((r) => {
        if (r === 'need-nick' && !G.NickUI.skipped && G.UI.isOpen('scr-menu')) G.NickUI.open();
        socialLine();
      });
    }
    G.InvitePop.refresh();
  }

  /** Text under "Friends" and "Play": who is online, requests, room. */
  function socialLine() {
    const room = G.Social.room;
    const play = document.querySelector('#scr-menu [data-go=play] small');
    if (play)
      play.textContent = room
        ? 'Volver a tu sala (' + room.members.length + '/' + G.Social.MAX_PLAYERS + ')'
        : 'Entra en la mazmorra';
    const fr = G.Social.friends;
    const on = fr.filter((f) => f.status === 'ok' && f.online).length;
    const req = fr.filter((f) => f.status === 'in').length;
    const parts = [];
    if (on) parts.push(on + ' en línea');
    if (req) parts.push(req + (req === 1 ? ' solicitud' : ' solicitudes'));
    $('menu-friends-sub').textContent = parts.length ? parts.join(' · ') : 'Juega en grupo, hasta 4';
    $('menu-friends-sub').classList.toggle('gold', req > 0);
  }

  /** Region select before a solo run: the cards slide out from under the main panel over a dimmed overworld
   *  (css/bw-menu.css .rg). Pick a generation; only it and the earlier ones spawn this run. Per-run, not saved. */
  let rgOpen = false,
    rgCur = 0;
  const rgCards = () => [...document.querySelectorAll('#rg-cards .rg-card')];
  const rgFree = () => rgCards().flatMap((c, i) => (c.classList.contains('locked') ? [] : [i]));

  function initRegionPicker() {
    const box = $('rg-cards');
    const card = (name, sub, gen, i) => {
      const b = document.createElement('button');
      const locked = !REGIONS_OPEN.includes(gen);
      b.className = 'rg-card' + (locked ? ' locked' : '');
      b.style.setProperty('--i', i);
      b.innerHTML = `<b translate="no">${name}</b><small>${sub}</small>`;
      if (locked) {
        b.setAttribute('aria-disabled', 'true');
        b.tabIndex = -1;
      } else {
        b.dataset.sfx = 'confirm';
        b.onclick = () => startRegion(gen);
        b.addEventListener('pointerenter', () => rgSelect(i));
      }
      box.appendChild(b);
    };
    REGION_CARDS.forEach((name, i) => card(name, `Generation ${i + 1}`, i + 1, i));
    card('Random', 'Random Selection', 0, REGION_CARDS.length);
    // Any click that is not on a card (the dim, the panel, the space by the bars) folds the cards back and does nothing else.
    $('scr-menu').addEventListener(
      'click',
      (e) => {
        if (!rgOpen || e.target.closest('.rg-card')) return;
        e.stopPropagation();
        e.preventDefault();
        G.Audio.sfx('back');
        closeRegionPicker();
      },
      true
    );
    addEventListener('keydown', (e) => {
      if (!rgOpen) return;
      const free = rgFree();
      if (e.key === 'Escape') {
        G.Audio.sfx('back');
        closeRegionPicker();
      } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && free.length) {
        const at = Math.max(0, free.indexOf(rgCur));
        rgSelect(free[(at + (e.key === 'ArrowDown' ? 1 : -1) + free.length) % free.length]);
        G.Audio.sfx('hover');
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (free.includes(rgCur)) rgCards()[rgCur].click();
      } else return;
      e.preventDefault();
    });
  }

  function rgSelect(i) {
    rgCur = i;
    rgCards().forEach((c, k) => c.classList.toggle('sel', k === i));
  }

  function openRegionPicker() {
    rgOpen = true;
    rgSelect(rgFree()[0] || 0);
    select(0); // Play stays lit, the other rows dim
    $('rg').classList.add('open');
    $('scr-menu').classList.add('rg-on');
  }

  function closeRegionPicker() {
    rgOpen = false;
    $('rg').classList.remove('open');
    $('scr-menu').classList.remove('rg-on');
  }

  /** Commit the region choice and start the run. */
  function startRegion(gen) {
    closeRegionPicker(); // or its key handler stays live in the run, and Space or Enter starts a new one
    G.Enemies.setRegion(gen);
    G.Flow.play();
  }

  return { init, open, GEN_NAMES, REGION_NAMES: REGION_CARDS };
})();
