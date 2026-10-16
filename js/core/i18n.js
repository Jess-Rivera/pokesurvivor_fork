/* ============ i18n.js — languages (Spanish / English) ============
 * The game is written in Spanish. If the language is English, every text
 * shown is translated with the js/data/lang-en.js dictionary, without having to
 * touch each screen:
 *   - the DOM (menus, cards, notices...) with a MutationObserver,
 *   - the canvas (HUD, notices, numbers) by wrapping fillText/strokeText,
 *   - confirm()/alert().
 *
 * The dictionary uses the Spanish text as the key. Three levels:
 *   1. exact phrase                    'Volver' -> 'Back'
 *   2. pattern with {x} holes          '¡Has conseguido a {x} shiny!' -> 'You got a shiny {x}!'
 *                                      (whatever falls in the hole is also translated)
 *   3. chunks inside a longer text, whole words only
 * What players type (nicknames) is marked with translate="no".
 *
 * Language: the one chosen in Settings; otherwise /en/ in the address or the browser's
 * (Spanish if the browser is Spanish, English in any other case).
 */
G.I18n = (() => {
  const KEY = 'ps.lang';
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* nothing */ }
  const byPath = /\/en(\/|$)/.test(location.pathname) ? 'en' : null;
  const nav = ((navigator.languages && navigator.languages[0]) || navigator.language || 'es').toLowerCase();
  const lang = saved === 'es' || saved === 'en' ? saved : byPath || (nav.startsWith('es') ? 'es' : 'en');
  document.documentElement.lang = lang;

  const exact = new Map(), exactLow = new Map();
  let patterns = [], frag = null, fragLow = null, fragMap = new Map();
  const cache = new Map();
  const L = '\\p{L}\\p{N}';
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /** Adds translations { 'texto en español': 'English text' }. */
  function add(dict) {
    const fr = [];
    for (const [es, en] of Object.entries(dict)) {
      if (!en || es === en) continue;
      if (es.includes('{x}')) {
        const parts = es.split('{x}').map(reEsc);
        patterns.push({ re: new RegExp('^' + parts.join('(.+?)') + '$', 'u'), reI: new RegExp('^' + parts.join('(.+?)') + '$', 'iu'), en });
      } else {
        exact.set(es, en);
        exactLow.set(es.toLowerCase(), en);
        if (es.length >= 4 || /\s/.test(es)) { fr.push(es); fragMap.set(es.toLowerCase(), en); }
      }
    }
    // A single expression with all the chunks (longest first), whole words only.
    const all = [...fragMap.keys()].sort((a, b) => b.length - a.length).map(reEsc).join('|');
    frag = all ? new RegExp(`(?<![${L}])(${all})(?![${L}])`, 'giu') : null;
    cache.clear();
  }

  function keepCase(src, en) {
    if (src === src.toUpperCase() && /\p{L}/u.test(src)) return en.toUpperCase();
    return en;
  }

  /** Translates a text (without surrounding spaces) to the current language. */
  function t(s) {
    if (lang === 'es' || !s || typeof s !== 'string') return s;
    if (!/\p{L}/u.test(s)) return s;
    const c = cache.get(s);
    if (c !== undefined) return c;
    let r = core(s);
    if (cache.size > 4000) cache.clear();
    cache.set(s, r);
    return r;
  }

  function core(s) {
    // Respects the surrounding spaces (DOM text nodes).
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    // HTML texts can span several lines: they are compared with the spaces collapsed.
    const lead = m[1], tail = m[3], body = m[2].replace(/\s+/g, ' ');
    if (!body) return s;
    const upper = body === body.toUpperCase() && /\p{L}/u.test(body);
    let r = exact.get(body);
    if (r === undefined && upper) { const e = exactLow.get(body.toLowerCase()); if (e !== undefined) r = keepCase(body, e); }
    if (r === undefined) {
      for (const p of patterns) {
        const mm = (upper ? p.reI : p.re).exec(body);
        if (!mm) continue;
        let i = 1;
        r = p.en.replace(/\{x\}/g, () => { const g = mm[i++]; return g === undefined ? '' : core(g); });
        r = keepCase(body, r);
        break;
      }
    }
    if (r === undefined && frag) {
      r = body.replace(frag, w => keepCase(w, fragMap.get(w.toLowerCase()) || w));
    }
    return lead + (r === undefined ? body : r) + tail;
  }

  /** Text with holes for the code: T('Nivel {x}', 5). */
  function f(es, ...vals) { let i = 0; return t(es).replace(/\{x\}/g, () => vals[i++]); }

  // ---------------- DOM ----------------
  const ATTRS = ['placeholder', 'title', 'alt', 'aria-label'];
  const skipEl = el => !!(el && el.closest && el.closest('[translate="no"], script, style, code'));

  function doText(n) {
    const p = n.parentElement;
    if (!p || skipEl(p)) return;
    const v = n.nodeValue;
    if (n.__tr === v) return;
    const r = t(v);
    n.__tr = r;
    if (r !== v) n.nodeValue = r;
  }
  function doEl(el) {
    if (skipEl(el)) return;
    for (const a of ATTRS) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v) { const r = t(v); if (r !== v) el.setAttribute(a, r); }
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 || skipEl(root)) return;
    doEl(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
  }

  function startDom() {
    if (lang === 'es') return;
    // The links to the website pages, to their English version.
    const EN_LINKS = { 'guia/': 'en/guide/', 'pokedex/': 'en/pokedex/' };
    document.querySelectorAll('a[href]').forEach(a => { const h = a.getAttribute('href'); if (EN_LINKS[h]) a.setAttribute('href', EN_LINKS[h]); });
    walk(document.body);
    new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes') doEl(m.target);
        else m.addedNodes.forEach(walk);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    document.title = t(document.title);
  }

  // ---------------- canvas and browser windows ----------------
  if (lang !== 'es') {
    const P = CanvasRenderingContext2D.prototype;
    for (const k of ['fillText', 'strokeText', 'measureText']) {
      const orig = P[k];
      P[k] = function (s, ...a) { return orig.call(this, typeof s === 'string' ? t(s) : s, ...a); };
    }
    const oc = window.confirm, oa = window.alert;
    window.confirm = s => oc.call(window, t(s));
    window.alert = s => oa.call(window, t(s));
  }

  function set(l) {
    try { localStorage.setItem(KEY, l); } catch (e) { /* nothing */ }
    location.reload();
  }

  return { lang, add, t, f, set, startDom, walk };
})();
G.T = G.I18n.t;
