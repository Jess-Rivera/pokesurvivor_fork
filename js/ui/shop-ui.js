/* ============ shop-ui.js: the Move Trainer and TR Shop screens (G.ShopUI, Move Shop step 4) ============
 * The TR Shop was the TM Mart until #149 149f (decision 2026-11-17-tm-for-good-tr-for-one-run): a move bought in a run is a
 * TR, kept for that run; a TM (Main Menu Shop) is learned for good. Code ids keep 'mart'.
 * Opened by G.Game.openShop when you walk into a shop (js/systems/shops.js), with the run paused. Plan: docs/AI Outputs/
 * Move Shop step 4 - Shop screens.txt. All buying rules live in G.Shops (offers, check, buy); this file only draws and routes input.
 *   Move Trainer  team keys pick WHO you shop for (it never swaps your active Pokemon), attack keys buy one of its 4 offers.
 *   TR Shop       attack keys pick a TR, team keys (or a click on a Pokemon) buy it for that Pokemon.
 *   Forget step   slots full (or a third buff): attack keys pick the LOOSE move to forget; bonds are fixed and greyed out.
 *                 Esc or Cancel: nothing bought, nothing paid.
 *   Confirm       (step 4b, Jess 2026-11-05) every purchase asks first, in the in-game dialog (G.UI.ask), at the moment you would
 *                 pay. Buy / Enter buys; Cancel / Esc buys nothing: back to the offers, or on a forget, back to the forget list
 *                 (H2). While the dialog is open the shop ignores every key and click (busy), so 1-4 or a team key cannot start a
 *                 second purchase under it. The dialog itself takes Enter and Esc before the game sees them.
 *   Reroll        (step 4c) R or the button: new offers for the Pokemon you are shopping for (Trainer) or 4 new TMs (Mart), free,
 *                 from the building's count, shared by the team (G.Shops.reroll). Greyed out at 0, hidden on the forget step,
 *                 ignored while the dialog is open.
 * Esc leaves the shop. Mouse and touch: click anything.
 */
G.ShopUI = (() => {
  const $ = G.UI.$;
  let cur = null; // { shop, onClose, f: member index, tm: Mart offer index, forget: { f, id } | null, note, asking }

  const busy = () => !cur || cur.asking; // closed, or the confirm dialog is open
  const roster = () => G.Game.roster || [];
  const member = (i) => roster()[i] || null;
  const fmt = (n) => Math.floor(n).toLocaleString('en-US');
  const coin = '<span class="mshop-coin"></span>';
  const mname = (id) => G.MoveInfo.name(id);
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function open(shop, onClose) {
    const r = roster(),
      first = Math.max(
        0,
        r.findIndex((f) => f === G.Game.player)
      );
    cur = { shop, onClose, f: first, tm: 0, forget: null, note: '', asking: false };
    $('mshop-leave').onclick = leave;
    $('mshop-back').onclick = back;
    $('mshop-reroll').onclick = rerollNow;
    render();
    G.UI.show('scr-shop');
  }

  function leave() {
    if (busy()) return;
    if (cur.forget) return back(); // Esc on the forget step cancels it first
    const cb = cur.onClose;
    cur = null;
    G.UI.hide('scr-shop');
    G.Audio.sfx('back');
    if (cb) cb();
  }

  /** Cancels the forget step: nothing bought, nothing paid. */
  function back() {
    if (busy() || !cur.forget) return;
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
      mart = shop.kind === 'mart';
    $('mshop-title').textContent = G.Shops.nameOf(shop.kind);
    // #124: the price depends on the member (its slots filled), so the header shows the balance only
    $('mshop-silver').innerHTML = coin + ' ' + fmt(G.Silver.whole) + ' Silver';
    $('mshop-hint').textContent = mart
      ? 'Pick a TR, then the Pokemon to teach it. R rerolls the TRs. A new move gets its own slot: press its number key in a run to use it.'
      : 'R rerolls the offers. A new move gets its own slot: press its number key in a run to use it. Bonds are fixed.';
    $('mshop-back').classList.toggle('hidden', !cur.forget);
    $('mshop-leave').classList.toggle('hidden', !!cur.forget);
    const left = G.Shops.rerollsLeft(shop),
      rb = $('mshop-reroll');
    rb.classList.toggle('hidden', !!cur.forget);
    rb.disabled = left <= 0;
    rb.textContent = left > 0 ? 'Reroll (' + left + ' left) · R' : 'No rerolls left';
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
        ds = !c
          ? ''
          : c.ok
            ? 'Can learn · ' + fmt(c.cost) + ' Silver'
            : c.why === "Can't afford"
              ? c.why + ' · ' + fmt(c.cost)
              : c.why;
        na = !c || !c.ok;
      } else {
        const full = f.slots.length >= f.maxMoves;
        ds =
          f.slots.length +
          ' / ' +
          f.maxMoves +
          ' slots · next ' +
          fmt(G.Shops.price(cur.shop.kind, f.slots.length, full)) +
          (full ? ' (replaces)' : '');
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
        ? 'Four TRs, each can be bought any number of times.'
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
    // #124: a TM's price depends on who learns it, so a TM card shows the Mart's range; a Trainer card shows this member's price
    const martRange = fmt(G.Shops.price('mart', 1, false)) + ' to ' + fmt(G.Shops.price('mart', 1, true));
    ids.forEach((id, i) => {
      let tail, na, cost;
      if (mart) {
        tail = '';
        na = false;
        cost = martRange;
      } else {
        const c = G.Shops.check(cur.shop, f, id);
        na = !c.ok;
        tail = c.ok ? (c.forget ? ' · replaces a move' : '') : ' · ' + c.why;
        cost = fmt(c.cost);
      }
      const ic = moveIco(id),
        el = card(
          (mart && i === cur.tm ? 'mshop-sel' : '') + (na ? ' mshop-na' : ''),
          ic.html,
          esc(mname(id)) + '<span class="mshop-price">' + coin + ' ' + cost + '</span>',
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
        why = ok
          ? 'Forget it, ' + mname(id) + ' takes this slot.'
          : g.length > 1
            ? 'Bond · fixed'
            : 'Not a buff (2 buffs at most)',
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
    if (busy() || cur.forget || !member(i)) return;
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
    if (busy() || cur.forget) return;
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
    } else return confirmBuy(fi, id, null);
    render();
  }

  /** R or the Reroll button (step 4c): new offers for the Pokemon you are shopping for, or 4 new TMs. Free, from the count. */
  function rerollNow() {
    if (busy() || cur.forget) return;
    const mart = cur.shop.kind === 'mart',
      f = mart ? null : member(cur.f);
    if (!G.Shops.reroll(cur.shop, f)) {
      cur.note =
        G.Shops.rerollsLeft(cur.shop) <= 0
          ? 'No rerolls left in this shop.'
          : f
            ? f.mon.name + ' cannot shop (fainted).'
            : '';
      G.Audio.sfx('back');
    } else {
      if (mart) cur.tm = 0;
      cur.note = mart ? 'Rerolled: 4 new TRs.' : 'Rerolled: new moves for ' + f.mon.name + '.';
      G.Audio.sfx('select');
    }
    render();
  }

  /** Attack key i on the forget step: forget that loose move (after the confirm). */
  function pickSlot(i) {
    if (busy() || !cur.forget) return;
    const { f: fi, id } = cur.forget,
      f = member(fi),
      c = G.Shops.check(cur.shop, f, id);
    if (!f || !f.slots[i] || !c.ok || !c.forget || !c.allowed.includes(i)) {
      G.Audio.sfx('back');
      return;
    }
    confirmBuy(fi, id, i);
  }

  /**
   * Asks before paying (step 4b). slot: the forget step's slot, or null for a free slot. Buy re-checks everything in G.Shops.buy.
   * Cancel: back to the offers, or with a slot, back to the forget list (H2, Jess 2026-11-05).
   */
  function confirmBuy(fi, id, slot) {
    const f = member(fi),
      c = G.Shops.check(cur.shop, f, id),
      old = slot == null ? null : f.slots[slot].map((m) => m.name).join(' + '),
      mart = cur.shop.kind === 'mart',
      msg =
        old != null
          ? f.mon.name + ' forgets ' + old + ' and learns ' + mname(id) + '?'
          : mart
            ? 'Teach ' + mname(id) + ' to ' + f.mon.name + '?'
            : 'Buy ' + mname(id) + ' for ' + f.mon.name + '?',
      note =
        fmt(c.cost) +
        ' Silver' +
        (old != null ? ' · no refund for ' + old : '') +
        ' · ' +
        fmt(G.Silver.whole - c.cost) +
        ' left',
      // a buy that replaces a move is a loss (no refund; decision 2026-11-20-155-move-shop-replace-a-move-asks-replace-
      // or-go-back), so it opens on Cancel; a buy into a free slot is a purchase and opens on Buy
      opts = {
        title: G.Shops.nameOf(cur.shop.kind),
        ok: 'Buy',
        cancel: 'Cancel',
        note,
        intent: old != null ? 'negative' : 'positive',
      },
      shop = cur.shop;
    cur.asking = true;
    G.Audio.sfx('select');
    G.UI.ask(msg, opts).then((yes) => {
      if (!cur || cur.shop !== shop) return;
      cur.asking = false;
      if (yes && G.Shops.buy(shop, f, id, slot)) {
        cur.forget = null;
        cur.note =
          old != null
            ? f.mon.name + ' forgot ' + old + ' and learned ' + mname(id) + '!'
            : f.mon.name + ' learned ' + mname(id) + '!';
        G.Audio.sfx('confirm');
      } else {
        if (slot == null) cur.forget = null; // a free-slot buy: back to the offers; a forget keeps its list (H2)
        cur.note = slot == null ? 'Cancelled: nothing bought.' : 'Cancelled: pick another move to forget, or Cancel.';
        G.Audio.sfx('back');
      }
      render();
    });
  }

  function keys() {
    if (busy()) return; // the confirm dialog takes its own keys (Enter, Esc); nothing else while it is open
    if (G.Input.tap('escape')) return leave();
    if (cur.forget) {
      for (let i = 0; i < 4; i++) if (G.Input.action('attack_' + (i + 1))) return pickSlot(i);
      return;
    }
    if (G.Input.tap('keyr')) return rerollNow();
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
    reroll: rerollNow,
    get isOpen() {
      return !!cur;
    },
    /** The confirm dialog is open (step 4b). */
    get asking() {
      return !!(cur && cur.asking);
    },
    get forgetting() {
      return !!(cur && cur.forget);
    },
  };
})();
