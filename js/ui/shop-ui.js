/* ============ shop-ui.js: the Move Trainer and TM Mart screens (G.ShopUI, Move Shop step 4) ============
 * Opened by G.Game.openShop when you walk into a shop (js/systems/shops.js), with the run paused. Plan: docs/ASCII Concept Maps/
 * Move Shop step 4 - Shop screens.txt. All buying rules live in G.Shops (offers, check, buy); this file only draws and routes input.
 *   Move Trainer  team keys pick WHO you shop for (it never swaps your active Pokemon), attack keys buy one of its 4 offers.
 *   TM Mart       attack keys pick a TM, team keys (or a click on a Pokemon) buy it for that Pokemon.
 *   Forget step   slots full (or a third buff): attack keys pick the LOOSE move to forget; bonds are fixed and greyed out.
 *                 Esc or Cancel: nothing bought, nothing paid.
 * Esc leaves the shop. Mouse and touch: click anything.
 */
G.ShopUI = (() => {
  const $ = G.UI.$;
  let cur = null; // { shop, onClose, f: member index, tm: Mart offer index, forget: { f, id } | null, note }

  const roster = () => G.Game.roster || [];
  const member = (i) => roster()[i] || null;
  const fmt = (n) => Math.floor(n).toLocaleString('en-US');
  const coin = '<span class="mshop-coin"></span>';
  const mname = (id) => G.MoveInfo.name(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function open(shop, onClose) {
    const r = roster(),
      first = Math.max(
        0,
        r.findIndex((f) => f === G.Game.player)
      );
    cur = { shop, onClose, f: first, tm: 0, forget: null, note: '' };
    $('mshop-leave').onclick = leave;
    $('mshop-back').onclick = back;
    render();
    G.UI.show('scr-shop');
  }

  function leave() {
    if (!cur) return;
    if (cur.forget) return back(); // Esc on the forget step cancels it first
    const cb = cur.onClose;
    cur = null;
    G.UI.hide('scr-shop');
    G.Audio.sfx('back');
    if (cb) cb();
  }

  /** Cancels the forget step: nothing bought, nothing paid. */
  function back() {
    if (!cur || !cur.forget) return;
    cur.forget = null;
    cur.note = 'Cancelled: nothing bought.';
    G.Audio.sfx('back');
    render();
  }

  function card(cls, ico, nm, ds, key, onclick) {
    const el = document.createElement('div');
    el.className = 'card ' + cls;
    el.innerHTML = `<div class="ico"></div><div class="txt"><div class="nm">${nm}</div><div class="ds">${ds}</div></div><div class="key">${key}</div>`;
    if (typeof ico === 'string') el.querySelector('.ico').innerHTML = ico;
    else if (ico) el.querySelector('.ico').appendChild(ico);
    el.dataset.sfx = 'none';
    el.onclick = onclick;
    return el;
  }
  const moveIco = (id) => {
    const col = G.U.TYPE_COLOR[G.MoveInfo.type(id)] || '#888';
    return { html: G.Icons.html('move:' + id, 32), col };
  };

  function render() {
    if (!cur) return;
    const { shop } = cur,
      mart = shop.kind === 'mart',
      cost = G.Shops.price(G.Game.st.time, G.Game.player ? G.Game.player.level : 1);
    $('mshop-title').textContent = G.Shops.nameOf(shop.kind);
    $('mshop-silver').innerHTML = coin + ' ' + fmt(G.Silver.whole) + ' Silver · ' + fmt(cost) + ' a move';
    $('mshop-hint').textContent = mart
      ? 'Pick a TM, then the Pokemon to teach it. A new move gets its own slot: press its number key in a run to use it.'
      : 'A new move gets its own slot: press its number key in a run to use it. Bonds are fixed.';
    $('mshop-back').classList.toggle('hidden', !cur.forget);
    $('mshop-leave').classList.toggle('hidden', !!cur.forget);
    renderTeam(mart);
    if (cur.forget) renderForget();
    else renderOffers(mart);
  }

  function renderTeam(mart) {
    const box = $('mshop-team'),
      tm = mart ? G.Shops.offers(cur.shop)[cur.tm] : null;
    box.innerHTML = '';
    roster().forEach((f, i) => {
      let ds, na;
      if (f.dead) {
        ds = 'Fainted';
        na = true;
      } else if (mart) {
        const c = tm ? G.Shops.check(cur.shop, f, tm) : null;
        ds = !c ? '' : c.ok ? 'Can learn' : c.why;
        na = !c || !c.ok;
      } else {
        ds = f.slots.length + ' / ' + f.maxMoves + ' slots';
        na = false;
      }
      const sel = !mart && i === cur.f;
      const el = card(
        'mshop-mon' + (sel ? ' mshop-sel' : '') + (na ? ' mshop-na' : '') + (cur.forget ? ' mshop-na' : ''),
        G.UI.spriteCanvas(f.dex, 32, 32, { scale: 1, shiny: f.shiny }),
        `<span translate="no">${esc(f.mon.name)}</span>`,
        esc(ds),
        G.Input.keyLabel('swap_' + (i + 1)),
        () => pickMember(i)
      );
      box.appendChild(el);
    });
  }

  function renderOffers(mart) {
    const box = $('mshop-offers'),
      f = member(cur.f),
      ids = G.Shops.offers(cur.shop, f);
    $('mshop-sub').textContent =
      cur.note ||
      (mart
        ? 'Four TMs, each can be bought any number of times.'
        : f
          ? f.dead
            ? f.mon.name + ' has fainted: pick another Pokemon.'
            : 'Moves ' + f.mon.name + ' can learn here.'
          : '');
    box.innerHTML = '';
    if (!ids.length) {
      box.innerHTML = '<div class="ds mshop-empty">Nothing left to learn here.</div>';
      return;
    }
    ids.forEach((id, i) => {
      let tail, na;
      if (mart) {
        tail = '';
        na = false;
      } else {
        const c = G.Shops.check(cur.shop, f, id);
        na = !c.ok;
        tail = c.ok ? (c.forget ? ' · replaces a move' : '') : ' · ' + c.why;
      }
      const ic = moveIco(id),
        el = card(
          (mart && i === cur.tm ? 'mshop-sel' : '') + (na ? ' mshop-na' : ''),
          ic.html,
          esc(mname(id)) + '<span class="mshop-price">' + coin + ' ' + fmt(G.Shops.price(G.Game.st.time, G.Game.player.level)) + '</span>',
          esc(G.MoveInfo.desc(id) + tail),
          G.Input.keyLabel('attack_' + (i + 1)),
          () => pickOffer(i)
        );
      el.querySelector('.ico').style.background = ic.col + '33';
      box.appendChild(el);
    });
  }

  function renderForget() {
    const box = $('mshop-offers'),
      { f: fi, id } = cur.forget,
      f = member(fi),
      c = G.Shops.check(cur.shop, f, id),
      allowed = c.ok && c.forget ? c.allowed : [];
    $('mshop-sub').textContent =
      f.slots.length >= f.maxMoves
        ? f.mon.name + "'s slots are full. " + mname(id) + ' replaces:'
        : f.mon.name + ' has 2 buffs already. ' + mname(id) + ' replaces a buff:';
    box.innerHTML = '';
    f.slots.forEach((g, i) => {
      const ok = allowed.includes(i),
        why = ok ? 'Forget it, ' + mname(id) + ' takes this slot.' : g.length > 1 ? 'Bond · fixed' : 'Not a buff (2 buffs at most)',
        ic = moveIco(g[0].id),
        el = card(
          (g.length > 1 ? 'bond' : '') + (ok ? '' : ' mshop-na'),
          ic.html,
          esc(g.map((m) => m.name).join(' + ')),
          esc(why),
          G.Input.keyLabel('attack_' + (i + 1)),
          () => pickSlot(i)
        );
      el.querySelector('.ico').style.background = ic.col + '33';
      box.appendChild(el);
    });
  }

  /** Team key i. Trainer: shop for that Pokemon. Mart: buy the picked TM for it. */
  function pickMember(i) {
    if (!cur || cur.forget || !member(i)) return;
    if (cur.shop.kind === 'mart') {
      const id = G.Shops.offers(cur.shop)[cur.tm];
      if (id) tryBuy(i, id);
      return;
    }
    cur.f = i;
    cur.note = '';
    G.Audio.sfx('select');
    render();
  }

  /** Attack key i. Trainer: buy that offer for the Pokemon picked. Mart: pick that TM. */
  function pickOffer(i) {
    if (!cur || cur.forget) return;
    if (cur.shop.kind === 'mart') {
      if (i >= G.Shops.offers(cur.shop).length) return;
      cur.tm = i;
      cur.note = '';
      G.Audio.sfx('select');
      render();
      return;
    }
    const id = G.Shops.offers(cur.shop, member(cur.f))[i];
    if (id) tryBuy(cur.f, id);
  }

  function tryBuy(fi, id) {
    const f = member(fi),
      c = G.Shops.check(cur.shop, f, id);
    if (!c.ok) {
      cur.note = (f ? f.mon.name + ': ' : '') + c.why + '.';
      G.Audio.sfx('back');
    } else if (c.forget) {
      cur.forget = { f: fi, id };
      cur.note = '';
      G.Audio.sfx('select');
    } else if (G.Shops.buy(cur.shop, f, id)) {
      cur.note = f.mon.name + ' learned ' + mname(id) + '!';
      G.Audio.sfx('confirm');
    }
    render();
  }

  /** Attack key i on the forget step: forget that loose move. */
  function pickSlot(i) {
    if (!cur || !cur.forget) return;
    const { f: fi, id } = cur.forget,
      f = member(fi),
      g = f && f.slots[i];
    if (!g) return;
    const old = g.map((m) => m.name).join(' + ');
    if (!G.Shops.buy(cur.shop, f, id, i)) {
      G.Audio.sfx('back');
      return;
    }
    cur.forget = null;
    cur.note = f.mon.name + ' forgot ' + old + ' and learned ' + mname(id) + '!';
    G.Audio.sfx('confirm');
    render();
  }

  function keys() {
    if (!cur) return;
    if (G.Input.tap('escape')) return leave();
    if (cur.forget) {
      for (let i = 0; i < 4; i++) if (G.Input.action('attack_' + (i + 1))) return pickSlot(i);
      return;
    }
    for (let i = 0; i < 6; i++) if (G.Input.action('swap_' + (i + 1))) return pickMember(i);
    for (let i = 0; i < 4; i++) if (G.Input.action('attack_' + (i + 1))) return pickOffer(i);
  }

  return {
    open,
    leave,
    back,
    keys,
    pickMember,
    pickOffer,
    pickSlot,
    get isOpen() {
      return !!cur;
    },
    get forgetting() {
      return !!(cur && cur.forget);
    },
  };
})();
