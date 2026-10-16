/* ============ login.js — start: sign in, create account or guest ============ */
G.LoginUI = (() => {
  const $ = G.UI.$;
  let mode = 'login';

  function init() {
    document.querySelectorAll('#scr-login .tab').forEach(t => {
      t.onclick = () => setMode(t.dataset.tab);
    });
    $('login-form').onsubmit = async e => {
      e.preventDefault();
      $('login-err').textContent = '';
      $('btn-auth').disabled = true;
      const fn = mode === 'login' ? G.DB.login : G.DB.register;
      const r = await fn($('f-user').value, $('f-pass').value);
      $('btn-auth').disabled = false;
      if (!r.ok) { $('login-err').textContent = r.error; return; }
      $('f-pass').value = '';
      G.Flow.afterLogin();
    };
    $('btn-guest').onclick = () => { G.DB.playAsGuest(); G.Flow.afterLogin(); };
    $('f-forgot').onclick = e => {
      e.preventDefault();
      $('login-err').textContent = '';
      $('forgot-note').classList.toggle('hidden');
    };
    // Link Gmail to be able to recover the account (see offerRecovery).
    $('rec-link').onclick = async () => {
      $('rec-err').textContent = '';
      $('rec-link').disabled = true;
      const r = await G.DB.linkGoogle();
      $('rec-link').disabled = false;
      if (!r.ok) { $('rec-err').textContent = r.error; return; }
      $('scr-recover').classList.add('hidden');
      G.UI.toast('¡Gmail vinculado! Si olvidas la contraseña, entra con Google.', 4500);
    };
    $('rec-later').onclick = () => $('scr-recover').classList.add('hidden');
    $('rec-never').onclick = () => {
      try { localStorage.setItem('ps.recover.no.' + G.DB.fb.uid, '1'); } catch (e) { /* nada */ }
      $('scr-recover').classList.add('hidden');
    };
    $('btn-google').onclick = async () => {
      $('login-err').textContent = '';
      $('btn-google').disabled = true;
      const r = await G.DB.loginWithGoogle();
      $('btn-google').disabled = false;
      if (!r.ok) { $('login-err').textContent = r.error; return; }
      G.Flow.afterLogin();
    };
  }

  /**
   * On signing in (or just creating the account) with name and password, if there is not yet
   * a linked Gmail: "are you afraid of losing your account?". Once per session,
   * until they link it or say not to ask them again.
   */
  let offered = false;
  function offerRecovery() {
    if (offered || G.DB.mode !== 'cloud' || !G.DB.fb || !G.DB.nameAccount || G.DB.hasGoogle) return;
    try { if (localStorage.getItem('ps.recover.no.' + G.DB.fb.uid)) return; } catch (e) { /* nada */ }
    offered = true;
    $('rec-err').textContent = '';
    $('scr-recover').classList.remove('hidden');
  }

  /** Explains where the save is stored based on the database mode. */
  function modeNote() {
    if (G.DB.mode === 'cloud') return 'Tu partida se guarda en la nube: entra desde cualquier ordenador. Como invitado no se guarda.';
    const why = G.DB.localReason === 'file'
      ? 'Abierto desde un archivo: la partida sólo se guarda en este navegador. Para guardar en la nube, juega en la versión publicada.'
      : G.DB.localReason === 'host'
        ? 'Esta no es la web oficial: la partida sólo se guarda en este navegador. El juego oficial y gratis está en pokesurvivor.com.'
      : G.DB.localReason === 'config'
        ? 'Nube sin configurar: la partida sólo se guarda en este navegador.'
        : 'No se pudo conectar con la nube: la partida sólo se guarda en este navegador.';
    return why;
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll('#scr-login .tab').forEach(t => t.classList.toggle('on', t.dataset.tab === m));
    $('btn-auth').textContent = m === 'login' ? 'Entrar' : 'Crear cuenta';
    $('f-pass').autocomplete = m === 'login' ? 'current-password' : 'new-password';
    $('login-err').textContent = '';
    // It only asks if there are spots left when going to create an account (each Worker call counts).
    if (m === 'register' && G.DB.mode === 'cloud' && G.Signups) G.Signups.check().then(applySignups);
  }

  /** Monthly account cap reached: no "Create account" until the next month. */
  function applySignups(open) {
    const reg = document.querySelector('#scr-login .tab[data-tab="register"]');
    if (reg) reg.classList.toggle('hidden', !open);
    if (!open && mode === 'register') setMode('login');
    const note = $('signup-closed');
    note.classList.toggle('hidden', open);
    if (!open) note.textContent = 'Este mes se han llenado las plazas de cuentas nuevas: vuelven el 1 de ' + G.Signups.nextMonthName() +
      '. Si ya tienes cuenta, entra normal. Si no, juega como invitado.';
    $('btn-google').textContent = open ? 'Entrar con Google' : 'Entrar con Google (si ya tienes cuenta)';
  }

  function open() {
    G.UI.chrome(false);
    G.UI.show('scr-login');
    // Open: it does not ask until going to "Create account". Closed (with the tab
    // hidden): it asks again (with a 30-min cache) to reopen in time.
    if (G.DB.mode === 'cloud' && G.Signups) {
      if (G.Signups.closed) G.Signups.check().then(applySignups); else applySignups(true);
    }
    if (!G.DB.storageOk) $('login-err').textContent = 'Este navegador no deja guardar datos: juega como invitado.';
    $('btn-google').classList.toggle('hidden', G.DB.mode !== 'cloud');
    $('login-mode').textContent = modeNote();
    setTimeout(() => $('f-user').focus(), 50);
  }

  return { init, open, offerRecovery };
})();
