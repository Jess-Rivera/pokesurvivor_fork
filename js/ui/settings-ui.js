/* ============ settings-ui.js — Settings screen (PC and mobile) ============
 * A full-screen Black/White screen (css/bw-settings.css): the five categories on the left, the options of the
 * chosen one in slim rows, and a hint box with the description of the row under the cursor.
 * It opens over whatever is there (menu or pause) and on closing returns there.
 * Categories: Graphics · Controls · Sound · Account · About.
 * The settings belong to this device (G.Settings / G.Audio in the browser) and apply the moment you change them.
 */
G.SettingsUI = (() => {
  const $ = G.UI.$;
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const VERSION = '1.2 · 2026-10-09';
  const HINT_DEFAULT = 'Point at an option to read what it does.';
  let tab = 'gfx';

  function init() {
    document.querySelectorAll('#set-tabs .st-cat').forEach((b) => {
      b.onclick = () => {
        if (tab === b.dataset.t) return;
        tab = b.dataset.t;
        render();
      };
    });
    $('set-close').onclick = () => {
      G.Audio.sfx('back');
      close();
    };
    $('btn-settings').innerHTML = G.Icons.html('gear', 20);
    $('btn-settings').onclick = () => open();
    $('btn-pause-settings').onclick = () => open('sound');
    // Fullscreen (if the browser allows it; on iPhone, how to get it).
    if (canFull() || iosTip()) {
      $('btn-full').classList.remove('hidden');
      $('btn-full').innerHTML = G.Icons.html('full', 20);
      $('btn-full').onclick = toggleFull;
    }
    // The hint box follows the row under the cursor (or the keyboard focus).
    const show = (e) => {
      const r = e.target.closest && e.target.closest('.st-row[data-hint]');
      if (r) $('set-hint').innerHTML = r.dataset.hint;
    };
    $('set-body').addEventListener('mouseover', show);
    $('set-body').addEventListener('focusin', show);
    // Esc closes, Up / Down change category, Enter presses a focused action row.
    addEventListener('keydown', (e) => {
      if (!isOpen() || capturing) return;
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      if (e.key === 'Escape') {
        G.Audio.sfx('back');
        close();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const tabs = [...document.querySelectorAll('#set-tabs .st-cat')];
        const at = tabs.findIndex((b) => b.dataset.t === tab);
        tabs[(at + (e.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length].click();
        G.Audio.sfx('hover');
      } else if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('act')) e.target.click();
      else return;
      e.preventDefault();
    });
  }

  function open(t) {
    if (t) tab = t;
    // From the main menu: the top bar (counters) stays, the bottom bar gives way to the screen's own Back bar.
    if (G.UI.isOpen('scr-menu')) {
      G.UI.chrome(false);
      $('topbar').classList.remove('hidden');
      G.UI.refreshCoins();
    }
    $('scr-settings').classList.remove('hidden');
    render();
  }
  function close() {
    $('scr-settings').classList.add('hidden');
    if (G.UI.isOpen('scr-menu')) G.UI.chrome(true);
  }
  const isOpen = () => !$('scr-settings').classList.contains('hidden');

  // ---------------- fullscreen ----------------
  function canFull() {
    return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  }
  function isFull() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  // iPhone: Safari does not allow putting a site in fullscreen (that is why sometimes
  // the option did not show). It can be done by opening it from the home screen.
  const IOS =
    /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () =>
    !!navigator.standalone ||
    (window.matchMedia && matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches);
  function iosTip() {
    return IOS && !canFull() && !standalone();
  }
  const IOS_TIP =
    'On iPhone, Safari does not let websites go fullscreen. Tap Share, then "Add to Home Screen": opening the game from that icon plays it fullscreen.';
  function toggleFull() {
    if (!canFull()) {
      if (iosTip()) G.UI.toast(IOS_TIP, 9000);
      return;
    }
    if (isFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else {
      const el = document.documentElement;
      const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      // On mobile, it also tries to lock the screen to landscape.
      if (p && p.then)
        p.then(() => {
          try {
            screen.orientation.lock('landscape').catch(() => {});
          } catch (e) {
            /* nada */
          }
        }).catch(() => {});
    }
    setTimeout(() => {
      if (isOpen()) render(true);
    }, 300);
  }

  // ---------------- row pieces ----------------
  const hintAttr = (h) => (h ? ` data-hint="${esc(h)}"` : '');
  const heading = (t) => `<h3 class="st-h">${esc(t)}</h3>`;
  /** A row of choices. opts: [[attributes, text, selected, extra class]] */
  function optRow(label, hint, opts) {
    return `<div class="st-row"${hintAttr(hint)}><span class="st-lab">${esc(label)}</span><span class="st-val">${opts
      .map(
        ([attrs, text, on, cls]) =>
          `<button type="button" class="st-opt${on ? ' on' : ''}${cls ? ' ' + cls : ''}" ${attrs}>${esc(text)}</button>`
      )
      .join('')}</span></div>`;
  }
  const choiceRow = (key, label, hint, opts) =>
    optRow(
      label,
      hint,
      opts.map(([v, l]) => [`data-k="${key}" data-v="${v}"`, l, v === G.Settings.get(key)])
    );
  const boolRow = (key, label, hint, onText, offText) => {
    const v = !!G.Settings.get(key);
    return optRow(label, hint, [
      [`data-k="${key}" data-b="1"`, onText, v],
      [`data-k="${key}" data-b="0"`, offText, !v],
    ]);
  };
  const sliderRow = (label, key, hint) =>
    `<div class="st-row"${hintAttr(hint)}><span class="st-lab">${esc(label)}</span><span class="st-val st-slide"><input type="range" min="0" max="100" value="${Math.round(G.Audio.settings[key] * 100)}" data-vol="${key}" aria-label="${esc(label)}"></span></div>`;
  /** A slider for a G.Settings number (not a volume): shown as min..max percent in steps, stored as a fraction. */
  const settingSliderRow = (key, label, hint, minPercent, maxPercent, stepPercent) =>
    `<div class="st-row"${hintAttr(hint)}><span class="st-lab">${esc(label)}</span><span class="st-val st-slide"><input type="range" min="${minPercent}" max="${maxPercent}" step="${stepPercent}" value="${Math.round(G.Settings.get(key) * 100)}" data-setting-slider="${key}" aria-label="${esc(label)}"></span></div>`;
  const infoRow = (label, text, hint) =>
    `<div class="st-row"${hintAttr(hint)}><span class="st-lab">${esc(label)}</span><span class="st-val st-info" translate="no">${esc(text)}</span></div>`;
  /** A whole-row button: the label and an arrow. */
  const actRow = (id, label, hint, danger, extra = '') =>
    `<div class="st-row act${danger ? ' danger' : ''}" id="${id}" role="button" tabindex="0" ${extra}${hintAttr(hint)}><span class="st-lab">${esc(label)}</span><span class="st-val"><img src="assets/ui/team/arrow.png" alt=""></span></div>`;

  // --- key remapping (Controls) ---
  const ACTION_LABEL = {
    move_up: 'Up',
    move_down: 'Down',
    move_left: 'Left',
    move_right: 'Right',
    dodge: 'Dodge',
    attack_1: 'Attack 1',
    attack_2: 'Attack 2',
    attack_3: 'Attack 3',
    attack_4: 'Attack 4',
    cycle_prev: 'Previous attack',
    cycle_next: 'Next attack',
    pause: 'Pause',
    swap_prev: 'Swap to previous',
    swap_next: 'Swap to next',
    swap_1: 'Swap to slot 1',
    swap_2: 'Swap to slot 2',
    swap_3: 'Swap to slot 3',
    swap_4: 'Swap to slot 4',
    swap_5: 'Swap to slot 5',
    swap_6: 'Swap to slot 6',
    shake_off: 'Shake off (tap fast)',
  };
  // Pretty-print a key code (e.g. 'keyw' -> 'W', 'arrowup' -> '↑').
  function keyName(code) {
    if (!code) return '—';
    const MAP = {
      arrowup: '↑',
      arrowdown: '↓',
      arrowleft: '←',
      arrowright: '→',
      space: 'Space',
      escape: 'Esc',
      tab: 'Tab',
      enter: 'Enter',
      numpadadd: 'Num+',
    };
    if (MAP[code]) return MAP[code];
    let m;
    if ((m = /^key([a-z])$/.exec(code))) return m[1].toUpperCase();
    if ((m = /^digit(\d)$/.exec(code))) return m[1];
    if ((m = /^numpad(\d)$/.exec(code))) return 'Num' + m[1];
    return code;
  }
  let capturing = null; // action name currently waiting for a keypress, or null
  /** A warning line when two actions share a key. */
  function keyConflicts() {
    const c = G.Input.conflicts();
    if (!c.length) return '';
    return `<p class="st-note st-warn">Shared keys: ${c.map((x) => esc(keyName(x.key)) + ' (' + x.actions.map((a) => esc(ACTION_LABEL[a] || a)).join(', ') + ')').join('; ')}. Use a layout button or rebind one.</p>`;
  }
  function keymapRows() {
    return G.Input.actionList
      .map((a) => {
        const keys = G.Input.bindingsOf(a).map(keyName).join(' / ') || '—';
        const live = capturing === a;
        return optRow(ACTION_LABEL[a] || a, 'Click to change this key. Esc cancels.', [
          [`data-rebind="${a}"`, live ? 'Press a key…' : keys, live, 'act'],
        ]);
      })
      .join('');
  }
  function startCapture(action) {
    capturing = action;
    render(true);
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const code = (e.code || e.key).toLowerCase();
      removeEventListener('keydown', onKey, true);
      capturing = null;
      if (code === 'escape') {
        render(true);
        return;
      } // cancel
      if (G.Input.isReserved(code)) {
        G.UI.toast('That key cannot be used', 2000);
        render(true);
        return;
      }
      G.Input.rebind(action, code);
      render(true);
    };
    addEventListener('keydown', onKey, true);
  }

  // ---------------- the five categories ----------------
  function gfxHtml() {
    const lv = ['low', 'medium', 'high'][G.Settings.autoLevel];
    return (
      choiceRow(
        'quality',
        'Quality',
        `How many effects and particles are drawn. <b>Auto</b> lowers it by itself if the game stutters (now: ${lv}).`,
        [
          ['auto', 'Auto'],
          ['high', 'High'],
          ['mid', 'Medium'],
          ['low', 'Low'],
        ]
      ) +
      boolRow(
        'dmgNumbers',
        'Damage Numbers',
        'Numbers shows the figures that pop up when you hit or get hit. Vibes Only hides them.',
        'Numbers',
        'Vibes Only'
      ) +
      boolRow('calm', 'Shake & Flash', 'Calm tones down the camera shake and the bright flashes.', 'Calm', 'Not Calm') +
      boolRow('fps', 'Show FPS', 'Frames per second, in the bottom corner during a run.', 'Yes', 'No') +
      boolRow(
        'showDpsPanel',
        'DPS Panel',
        "The damage per second graph and your run's upgrade cards, top left during a run.",
        'Yes',
        'No'
      ) +
      settingSliderRow(
        'dpsPanelOpacity',
        'DPS Panel Opacity',
        'How see-through the DPS panel is: its box, text and graph together. Left is fainter.',
        20,
        100,
        5
      ) +
      (canFull()
        ? optRow('Fullscreen', 'Fullscreen hides the browser bars.', [
            ['data-full="1"', 'Fullscreen', isFull()],
            ['data-full="0"', 'Windowed', !isFull()],
          ])
        : iosTip()
          ? optRow('Fullscreen', IOS_TIP, [['data-full="tip"', 'How to', false, 'act']])
          : '')
    );
  }

  function ctlHtml() {
    return (
      heading('Touch') +
      choiceRow('stick', 'Joystick Size', 'How far you drag your finger on a phone or tablet.', [
        [0.8, 'Small'],
        [1, 'Normal'],
        [1.25, 'Large'],
      ]) +
      actRow(
        'set-layout',
        'Place Buttons',
        'Put the attacks, the pause button and the joystick (fixed, if you like) wherever you want on the screen. Touch the screen anywhere and drag to move; play in landscape.'
      ) +
      heading('Accessibility') +
      boolRow(
        'autoShake',
        'Auto Shake Off',
        'Shakes off sleep, freeze, paralysis, confusion, trap and daze for you, 3 taps per second. No button mashing.',
        'Yes',
        'No'
      ) +
      heading('Keyboard') +
      optRow(
        'Key Layout',
        'Compact: WASD move, I J K L skills. Full: WASD move, Num1-4 skills. Space is kept for the dodge.',
        [
          ['id="set-keys-compact"', 'Compact', false, 'act'],
          ['id="set-keys-full"', 'Full', false, 'act'],
          ['id="set-keys-reset"', 'Reset', false, 'act'],
        ]
      ) +
      keymapRows() +
      keyConflicts() +
      `<p class="st-note">Level-up cards: press 1 to 3. Compact: WASD move, I J K L skills, 1-6 team slot, Z / C team, H shake off. Full: WASD move, Num1-4 skills, Num+ shake off.</p>`
    );
  }

  function sndHtml() {
    const m = G.Audio.settings.muted;
    return (
      sliderRow('Music', 'music', 'The volume of the music.') +
      sliderRow('Effects', 'sfx', 'The volume of hits, clicks and other sound effects.') +
      optRow('Mute All', 'Turns every sound off without losing your volume levels.', [
        ['data-mute="1"', 'Yes', m],
        ['data-mute="0"', 'No', !m],
      ])
    );
  }

  function accHtml() {
    const SYNC = {
      ok: 'Saved to the cloud',
      syncing: 'Saving…',
      pending: 'Waiting to upload (uploads when you leave)',
      offline: 'Offline: uploads when back',
      local: 'Saved in this browser only',
      guest: 'Guest: not saved',
    };
    if (G.DB.guest)
      return (
        infoRow('Status', 'Guest', 'You are playing as a guest: your progress is not saved when you leave.') +
        actRow('set-login', 'Sign In or Create Account', 'Sign in so your progress is saved.')
      );
    const st = G.DB.syncState;
    const nick = G.Social.me ? G.Social.me.name : G.DB.user || '';
    const kind = G.DB.mode === 'local' ? 'This browser' : G.DB.nameAccount ? 'Name and password' : 'Google';
    return (
      infoRow('Nickname', nick, 'It is unique and cannot be changed.') +
      infoRow('Account Type', kind) +
      infoRow('Save', SYNC[st] || st) +
      actRow('set-logout', 'Sign Out', 'Back to the sign-in screen. Your progress stays saved.') +
      actRow('set-delete', 'Delete Account', 'Deletes your account and all your progress, forever.', true) +
      `<p class="st-note" id="set-msg"></p>`
    );
  }

  function aboutHtml() {
    return (
      infoRow('Version', VERSION) +
      `<div class="st-box"><p>A free fan project, <b>non-profit</b>: no ads, no purchases. Pokémon and its characters belong to Nintendo, Creatures and GAME FREAK; this project is not affiliated with them.</p>
        <p><b>Credits</b></p>
        <ul>
          <li><b>Sprites:</b> PMD SpriteCollab and its artists (CC BY-NC 4.0).</li>
          <li><b>Pokémon data:</b> PokéAPI.</li>
          <li><b>Music and sounds:</b> original, generated by the game itself.</li>
          <li><b>Fonts:</b> Silver by Poppy Works (CC BY 4.0), Monogram, Pokemon B/W fan font, Michroma (SIL OFL).</li>
        </ul></div>` +
      actRow('set-news', 'Patch Notes', 'What changed in each version.') +
      actRow('set-legal', 'Legal Notice', 'Legal notice and privacy.', false, 'data-legal')
    );
  }

  function render(keepScroll) {
    document.querySelectorAll('#set-tabs .st-cat').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
    const box = $('set-body');
    const top = keepScroll ? box.scrollTop : 0;
    box.innerHTML = ({ gfx: gfxHtml, ctl: ctlHtml, sound: sndHtml, acc: accHtml }[tab] || aboutHtml)();
    box.scrollTop = top;
    if (!keepScroll) $('set-hint').innerHTML = HINT_DEFAULT;
    wire(box);
  }

  function wire(box) {
    box.querySelectorAll('.st-opt[data-k]').forEach((b) => {
      b.onclick = () => {
        const v = b.dataset.b !== undefined ? b.dataset.b === '1' : isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v;
        G.Settings.set(b.dataset.k, v);
        G.Audio.sfx('click');
        render(true);
      };
    });
    box.querySelectorAll('input[data-vol]').forEach((r) => {
      r.oninput = () => G.Audio.setVolume(r.dataset.vol, r.value / 100);
      r.onchange = () => G.Audio.sfx('click');
    });
    box.querySelectorAll('input[data-setting-slider]').forEach((slider) => {
      slider.oninput = () => G.Settings.set(slider.dataset.settingSlider, slider.value / 100);
      slider.onchange = () => G.Audio.sfx('click');
    });
    box.querySelectorAll('[data-mute]').forEach((b) => {
      b.onclick = () => {
        if ((b.dataset.mute === '1') !== G.Audio.settings.muted) {
          G.Audio.toggleMute();
          $('btn-sound').innerHTML = G.Icons.html(G.Audio.settings.muted ? 'mute' : 'sound', 20);
        }
        render(true);
      };
    });
    box.querySelectorAll('[data-full]').forEach((b) => {
      b.onclick = () => {
        if (b.dataset.full === 'tip' || (b.dataset.full === '1') !== isFull()) toggleFull();
      };
    });
    const lay = $('set-layout');
    if (lay) lay.onclick = () => G.LayoutUI.open();
    box.querySelectorAll('[data-rebind]').forEach((b) => {
      b.onclick = () => startCapture(b.dataset.rebind);
    });
    const kr = $('set-keys-reset');
    if (kr)
      kr.onclick = () => {
        G.Input.resetBindings();
        render(true);
      };
    const kc = $('set-keys-compact');
    if (kc)
      kc.onclick = () => {
        G.Input.applyPreset('compact');
        render(true);
      };
    const kf = $('set-keys-full');
    if (kf)
      kf.onclick = () => {
        G.Input.applyPreset('full');
        render(true);
      };
    const lo = $('set-login');
    if (lo)
      lo.onclick = () => {
        close();
        leave();
      };
    const out = $('set-logout');
    if (out)
      out.onclick = () => {
        close();
        leave();
      };
    // Patch notes moved here from the top bar (the Black/White top bar keeps only the counters).
    const news = $('set-news');
    if (news)
      news.onclick = () => {
        close();
        G.NewsUI.open();
      };
    const del = $('set-delete');
    if (del)
      del.onclick = async () => {
        const ok = await G.UI.confirmDelete();
        if (!ok) return;
        del.classList.add('off');
        const r = await G.DB.deleteAccount(ok.pass);
        if (!r.ok) {
          $('set-msg').textContent = r.error;
          del.classList.remove('off');
          return;
        }
        close();
        G.UI.toast('Account deleted');
        G.Audio.music(null);
        G.Flow.toLogin();
      };
  }

  /** Sign out (if you are in a game, it is abandoned). */
  async function leave() {
    if (
      G.DB.guest &&
      !(await G.UI.ask(G.T('Eres invitado: se perderá todo el progreso. ¿Salir?'), {
        title: 'Sign out',
        ok: 'Sign out',
      }))
    )
      return;
    if (G.Game.state !== 'ui') G.Game.quit && G.Game.quit();
    G.Audio.music(null);
    G.DB.logout().then(() => G.Flow.toLogin());
  }

  return {
    init,
    open,
    close,
    get isOpen() {
      return isOpen();
    },
  };
})();
