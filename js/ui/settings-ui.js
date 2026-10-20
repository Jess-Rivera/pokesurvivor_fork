/* ============ settings-ui.js — Settings screen (PC and mobile) ============
 * It opens over whatever is there (menu or pause) and on closing returns there.
 * Tabs: Sound · Graphics · Controls · Account · About.
 * The settings belong to this device (G.Settings / G.Audio in the browser).
 */
G.SettingsUI = (() => {
  const $ = G.UI.$;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const VERSION = '1.2 · 2026-10-09';
  let tab = 'sound';

  function init() {
    document.querySelectorAll('#set-tabs .gen-tab').forEach(b => { b.onclick = () => { tab = b.dataset.t; render(); }; });
    $('set-close').onclick = close;
    $('btn-settings').innerHTML = G.Icons.html('gear', 20);
    $('btn-settings').onclick = () => open();
    $('btn-pause-settings').onclick = () => open('sound');
    // Fullscreen (if the browser allows it; on iPhone, how to get it).
    if (canFull() || iosTip()) {
      $('btn-full').classList.remove('hidden');
      $('btn-full').innerHTML = G.Icons.html('full', 20);
      $('btn-full').onclick = toggleFull;
    }
  }

  function open(t) {
    if (t) tab = t;
    $('scr-settings').classList.remove('hidden');
    render();
  }
  function close() { $('scr-settings').classList.add('hidden'); }
  const isOpen = () => !$('scr-settings').classList.contains('hidden');

  // ---------------- pantalla completa ----------------
  function canFull() { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled); }
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  // iPhone: Safari does not allow putting a site in fullscreen (that is why sometimes
  // the option did not show). It can be done by opening it from the home screen.
  const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => !!navigator.standalone || (window.matchMedia && matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches);
  function iosTip() { return IOS && !canFull() && !standalone(); }
  const IOS_TIP = 'En iPhone, Safari no deja poner las webs a pantalla completa. Pulsa Compartir y luego "Añadir a pantalla de inicio": abriendo el juego desde ese icono se juega a pantalla completa.';
  function toggleFull() {
    if (!canFull()) { if (iosTip()) G.UI.toast(IOS_TIP, 9000); return; }
    if (isFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else {
      const el = document.documentElement;
      const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      // On mobile, it also tries to lock the screen to landscape.
      if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* nada */ } }).catch(() => {});
    }
    setTimeout(() => { if (isOpen()) render(); }, 300);
  }

  // ---------------- piezas ----------------
  function section(title, sub) { return `<h3 class="set-h">${esc(title)}</h3>${sub ? `<p class="sub">${sub}</p>` : ''}`; }
  function toggle(key, label, desc) {
    const on = !!G.Settings.get(key);
    return `<div class="set-row"><div class="grow"><b>${esc(label)}</b><small>${esc(desc)}</small></div>
      <button class="btn small switch ${on ? 'gold' : ''}" data-k="${key}">${on ? 'Sí' : 'No'}</button></div>`;
  }
  function choice(key, opts) {
    const cur = G.Settings.get(key);
    return `<div class="chips set-chips">${opts.map(([v, l]) => `<button class="chip ${v === cur ? 'on' : ''}" data-k="${key}" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;
  }

  // --- key remapping (Controls tab) ---
  const ACTION_LABEL = {
    move_up: 'Up', move_down: 'Down', move_left: 'Left', move_right: 'Right',
    attack_1: 'Attack 1', attack_2: 'Attack 2', attack_3: 'Attack 3', attack_4: 'Attack 4',
    cycle_prev: 'Previous attack', cycle_next: 'Next attack', pause: 'Pause',
    swap_prev: 'Swap to previous', swap_next: 'Swap to next',
    swap_1: 'Swap to slot 1', swap_2: 'Swap to slot 2', swap_3: 'Swap to slot 3',
    swap_4: 'Swap to slot 4', swap_5: 'Swap to slot 5', swap_6: 'Swap to slot 6',
    shake_off: 'Shake off (tap fast)'
  };
  // Pretty-print a key code (e.g. 'keyw' -> 'W', 'arrowup' -> '↑').
  function keyName(code) {
    if (!code) return '—';
    const MAP = { arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→',
      space: 'Space', escape: 'Esc', tab: 'Tab', enter: 'Enter', numpadadd: 'Num+' };
    if (MAP[code]) return MAP[code];
    let m;
    if ((m = /^key([a-z])$/.exec(code))) return m[1].toUpperCase();
    if ((m = /^digit(\d)$/.exec(code))) return m[1];
    if ((m = /^numpad(\d)$/.exec(code))) return 'Num' + m[1];
    return code;
  }
  let capturing = null;   // action name currently waiting for a keypress, or null
  /** A warning line when two actions share a key. */
  function keyConflicts() {
    const c = G.Input.conflicts();
    if (!c.length) return '';
    return `<p class="note" style="color:#f08a8a">Shared keys: ${c.map(x => esc(keyName(x.key)) + ' (' + x.actions.map(a => esc(ACTION_LABEL[a] || a)).join(', ') + ')').join('; ')}. Use a layout button or rebind one.</p>`;
  }
  function keymapRows() {
    return `<div class="set-keys" style="max-height:46vh;overflow-y:auto">` + G.Input.actionList.map(a => {
      const keys = G.Input.bindingsOf(a).map(keyName).join(' / ') || '—';
      const live = capturing === a;
      return `<div class="set-row"><div class="grow"><b>${esc(ACTION_LABEL[a] || a)}</b></div>
        <button class="btn small ${live ? 'gold' : ''}" data-rebind="${a}">${live ? 'Press a key…' : esc(keys)}</button></div>`;
    }).join('') + `</div>`;
  }
  function startCapture(action) {
    capturing = action;
    render();
    const onKey = e => {
      e.preventDefault();
      e.stopPropagation();
      const code = (e.code || e.key).toLowerCase();
      removeEventListener('keydown', onKey, true);
      capturing = null;
      if (code === 'escape') { render(); return; }       // cancel
      if (G.Input.isReserved(code)) { G.UI.toast('That key cannot be used', 2000); render(); return; }
      G.Input.rebind(action, code);
      render();
    };
    addEventListener('keydown', onKey, true);
  }

  function render() {
    document.querySelectorAll('#set-tabs .gen-tab').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    const box = $('set-body');
    box.scrollTop = 0;
    if (tab === 'sound') {
      box.innerHTML = section('Sonido') + '<div id="set-sound" class="sound-inline"></div>';
      G.UI.soundControls($('set-sound'));
    } else if (tab === 'gfx') {
      const auto = ['baja', 'media', 'alta'][G.Settings.autoLevel];
      box.innerHTML = section('Idioma', 'El juego se recarga al cambiarlo.')
        + `<div class="chips set-chips" translate="no">${[['es', 'Español'], ['en', 'English']].map(([v, l]) =>
             `<button class="chip ${G.I18n.lang === v ? 'on' : ''}" data-lang="${v}">${l}</button>`).join('')}</div>`
        + section('Calidad', 'Cuántos efectos y partículas se dibujan. <b>Auto</b> la baja sola si el juego va a tirones (ahora: ' + auto + ').')
        + choice('quality', [['auto', 'Auto'], ['high', 'Alta'], ['mid', 'Media'], ['low', 'Baja']])
        + section('Pantalla')
        + toggle('dmgNumbers', 'Números de daño', 'Los números que salen al golpear y al recibir daño.')
        + toggle('calm', 'Menos sacudidas y destellos', 'La cámara tiembla menos y los fogonazos son suaves.')
        + toggle('fps', 'Mostrar FPS', 'Fotogramas por segundo, en la esquina de abajo.')
        + (canFull() ? `<div class="set-row"><div class="grow"><b>Pantalla completa</b><small>Sin barras del navegador.</small></div>
             <button class="btn small" id="set-full">${isFull() ? 'Salir' : 'Activar'}</button></div>`
           : iosTip() ? `<div class="set-row"><div class="grow"><b>Pantalla completa</b><small>${esc(IOS_TIP)}</small></div></div>` : '');
    } else if (tab === 'ctl') {
      box.innerHTML = section('En móvil o tablet')
        + `<p class="sub">Pon el dedo en cualquier parte y arrastra para moverte: el joystick aparece donde tocas. Toca un ataque de abajo para cambiarlo y el botón de arriba a la derecha para pausar. Se juega en horizontal.</p>`
        + `<div class="set-row"><div class="grow"><b>Tamaño del joystick</b><small>Cuánto hay que arrastrar el dedo.</small></div></div>`
        + choice('stick', [[0.8, 'Pequeño'], [1, 'Normal'], [1.25, 'Grande']])
        + `<div class="set-row"><div class="grow"><b>Colocar los botones</b><small>Pon los ataques, la pausa y el joystick (fijo, si quieres) donde quieras de la pantalla.</small></div>
             <button class="btn small" id="set-layout">Colocar</button></div>`
        + section('Accessibility')
        + toggle('autoShake', 'Auto shake off', 'Shakes off sleep, freeze, paralysis, confusion, trap and daze for you, 3 taps per second. No button mashing.')
        + section('En PC')
        + `<p class="sub">Click a control to change its key. Press Esc to cancel.</p>`
        + keymapRows()
        + keyConflicts()
        + `<div class="row wrap" style="margin-top:10px;gap:8px"><button class="btn small" id="set-keys-compact">Compact layout</button>
             <button class="btn small" id="set-keys-full">Full keyboard layout</button>
             <button class="btn small" id="set-keys-reset">Reset keys</button></div>
           <p class="sub">Compact (default): WASD move, I J K L skills, 1-6 team slot, Z / C team, H shake off. Full keyboard: WASD move, Num1-4 skills, 1-6 team slot, Z / C team, Num+ shake off. Space is kept for the dash.</p>`
        + `<div class="keys" style="margin-top:12px">
             <div>${esc(['attack_1', 'attack_2', 'attack_3', 'attack_4'].map(a => G.Input.keyLabel(a) || '—').join(' '))} or click the icon</div><span>choose attack</span>
             <div><kbd>1</kbd>–<kbd>3</kbd></div><span>choose level-up card</span>
           </div>`;
    } else if (tab === 'acc') {
      renderAccount(box);
    } else {
      box.innerHTML = `<div class="about-logo">PokéSurvivor</div><p class="sub center">Versión ${esc(VERSION)}</p>`
        + `<p class="sub">Juego de fans <b>gratuito y sin ánimo de lucro</b>: sin anuncios ni compras. Pokémon y sus personajes son propiedad de Nintendo, Creatures y GAME FREAK; este proyecto no está afiliado a ellos.</p>`
        + section('Créditos')
        + `<ul class="credits">
             <li><b>Sprites:</b> PMD SpriteCollab y sus artistas (CC BY-NC 4.0).</li>
             <li><b>Datos de los Pokémon:</b> PokéAPI.</li>
             <li><b>Música y sonidos:</b> originales, generados por el propio juego.</li>
             <li><b>Fuente:</b> Pixelify Sans (OFL).</li>
           </ul>`
        + `<div class="row wrap" style="justify-content:center;gap:8px">
             <button class="btn small" data-legal>Aviso legal y privacidad</button>
           </div>`;
    }
    wire(box);
  }

  function renderAccount(box) {
    const st = G.DB.guest ? 'guest' : G.DB.syncState;
    const SYNC = { ok: 'Guardado en la nube', syncing: 'Guardando…', pending: 'Pendiente de subir (se sube al salir del juego)',
                   offline: 'Sin conexión: se subirá al volver', local: 'Guardado sólo en este navegador', guest: 'Invitado: no se guarda' };
    if (G.DB.guest) {
      box.innerHTML = section('Cuenta', 'Estás jugando como <b>invitado</b>: tu progreso no se guarda al salir.')
        + `<button class="btn gold" id="set-login">Crear cuenta o entrar</button>`;
      return;
    }
    const nick = G.Social.me ? G.Social.me.name : (G.DB.user || '');
    const kind = G.DB.mode === 'local' ? 'Cuenta de este navegador' : G.DB.nameAccount ? 'Nombre y contraseña' : 'Google';
    box.innerHTML = section('Cuenta')
      + `<div class="set-row"><div class="grow"><b>Apodo</b><small>Es único y no se puede cambiar.</small></div><span class="gold" translate="no">${esc(nick)}</span></div>`
      + `<div class="set-row"><div class="grow"><b>Tipo de cuenta</b></div><span>${esc(kind)}</span></div>`
      + `<div class="set-row"><div class="grow"><b>Partida</b></div><span>${esc(SYNC[st] || st)}</span></div>`
      + `<div class="row wrap" style="gap:8px;margin-top:12px">
           <button class="btn" id="set-logout">Cerrar sesión</button>
           <button class="btn danger" id="set-delete">Borrar cuenta</button>
         </div><p class="note" id="set-msg"></p>`;
  }

  function wire(box) {
    box.querySelectorAll('.switch[data-k]').forEach(b => { b.onclick = () => { G.Settings.set(b.dataset.k, !G.Settings.get(b.dataset.k)); render(); }; });
    box.querySelectorAll('.chip[data-k]').forEach(b => {
      b.onclick = () => { const v = b.dataset.v; G.Settings.set(b.dataset.k, isNaN(+v) ? v : +v); render(); };
    });
    const full = $('set-full'); if (full) full.onclick = toggleFull;
    const lay = $('set-layout'); if (lay) lay.onclick = () => G.LayoutUI.open();
    box.querySelectorAll('[data-rebind]').forEach(b => { b.onclick = () => startCapture(b.dataset.rebind); });
    const kr = $('set-keys-reset'); if (kr) kr.onclick = () => { G.Input.resetBindings(); render(); };
    const kc = $('set-keys-compact'); if (kc) kc.onclick = () => { G.Input.applyPreset('compact'); render(); };
    const kf = $('set-keys-full'); if (kf) kf.onclick = () => { G.Input.applyPreset('full'); render(); };
    box.querySelectorAll('[data-lang]').forEach(b => { b.onclick = () => { if (b.dataset.lang !== G.I18n.lang) G.I18n.set(b.dataset.lang); }; });
    const lo = $('set-login'); if (lo) lo.onclick = () => { close(); leave(); };
    const out = $('set-logout'); if (out) out.onclick = () => { close(); leave(); };
    const del = $('set-delete');
    if (del) del.onclick = async () => {
      const ok = await G.UI.confirmDelete();
      if (!ok) return;
      del.disabled = true;
      const r = await G.DB.deleteAccount(ok.pass);
      if (!r.ok) { $('set-msg').textContent = r.error; del.disabled = false; return; }
      close();
      G.UI.toast('Cuenta borrada');
      G.Audio.music(null);
      G.Flow.toLogin();
    };
  }

  /** Sign out (if you are in a game, it is abandoned). */
  function leave() {
    if (G.DB.guest && !confirm('Eres invitado: se perderá todo el progreso. ¿Salir?')) return;
    if (G.Game.state !== 'ui') G.Game.quit && G.Game.quit();
    G.Audio.music(null);
    G.DB.logout().then(() => G.Flow.toLogin());
  }

  return { init, open, close, get isOpen() { return isOpen(); } };
})();
