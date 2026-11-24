/* ============ menu-team-sell.js: selling in the Team menu (G.MenuTeamSell; #167) ============
 * Sell Pokemon, then a Pokemon, sells that one after a dialog. Shift with it (a click, Enter or Space) starts bulk sell:
 * Pokemon are picked, Sell Pokemon again asks for all of them, and a second dialog confirms (Shift on the first skips it).
 * Who may sell and for how much is G.TeamDraft's and G.Copies'. A sale saves at once.
 * Sketch note: assets/excalidraw/team-menu.excalidraw; decisions 2026-11-23-97-139-team-menu-and-upgrade-popup-rulings and
 * 2026-11-23-167-slice-a-plan-rulings.
 */
G.MenuTeamSell = (() => {
  const PROMPT = 'Select a Pokemon to sell.',
    BULK_PROMPT = 'Select Pokemon, then press Sell again.';
  const PROMPT_MS = 60 * 60 * 1000; // the prompt stays until a Pokemon is picked or the mode ends
  const coinText = (coins) => Math.floor(coins).toLocaleString('en-US');

  // whether Shift was down on the last press anywhere: the dialog's own answer does not say
  let shiftDown = false;
  for (const kind of ['pointerdown', 'keydown']) addEventListener(kind, (event) => (shiftDown = event.shiftKey), true);

  /**
   * The sell mode of one Team menu. draft() is its roster, shownUids() the copies the grid shows now, sold(uids) is
   * called after a sale, redraw() after any other change.
   */
  function create({ draft, shownUids, sold, redraw }) {
    let mode = null; // null, 'single' or 'bulk'
    const picked = new Set();

    const prompt = (text) => G.UI.toast(text, PROMPT_MS);
    function end() {
      if (!mode) return;
      mode = null;
      picked.clear();
      G.UI.toast(PROMPT, 1); // takes the standing prompt away
      redraw();
    }
    function start(bulk) {
      mode = bulk ? 'bulk' : 'single';
      prompt(bulk ? BULK_PROMPT : PROMPT);
      redraw();
    }
    function refuse(why) {
      G.Audio.sfx('error');
      G.UI.toast(why);
    }

    /** The Sell Pokemon button. */
    function pressButton() {
      G.Audio.sfx('click');
      if (mode === 'bulk') return sellPicked();
      if (shiftDown) return start(true);
      if (mode) return end();
      start(false);
    }

    /** A Pokemon was pressed while the mode is on. */
    function pressCopy(uid) {
      const copy = uid && G.Copies.get(G.DB.save, uid);
      if (!copy) return refuse('Only a Pokemon in a box can be sold.');
      if (mode === 'single') return sellOne(copy);
      const why = G.TeamDraft.bulkSellRefusal(draft(), G.DB.save, copy);
      if (why) return refuse(why);
      if (!picked.delete(uid)) picked.add(uid);
      G.Audio.sfx('select');
      redraw();
    }

    /** What a single sale warns about. */
    function warnings(copy, name) {
      const last = G.Copies.all(G.DB.save).filter((other) => other.speciesID === copy.speciesID).length === 1;
      return [
        copy.isFavorite && name + ' is a favorite.',
        copy.evTotal && 'It has ' + copy.evTotal + ' EVs. They are lost.',
        copy.candyXp && 'Its Exp Candy levels are lost.',
        copy.tmsLearned.length && 'Its ' + copy.tmsLearned.length + ' learned TMs go with it.',
        last && 'This is your last ' + G.DEX_BY[copy.speciesID].name + '. The Pokedex keeps it.',
      ]
        .filter(Boolean)
        .join(' ');
    }

    async function sellOne(copy) {
      const save = G.DB.save,
        uid = copy.pokemonUUID,
        why = G.TeamDraft.sellRefusal(draft(), save, copy);
      if (why) return refuse(why);
      const name = copy.nickname || G.DEX_BY[copy.speciesID].name;
      end();
      const yes = await G.UI.ask(`Sell ${name} for ${coinText(G.Copies.sellPrice(save, uid))}?`, {
        title: 'Sell Pokemon',
        ok: 'Sell',
        intent: 'negative',
        note: warnings(copy, name),
      });
      if (!yes) return;
      const result = G.Copies.sell(save, uid, G.TeamDraft.uids(draft()));
      if (!result.ok) return refuse('Nothing was sold.');
      done([uid], `Sold ${name} for ${coinText(result.coins)} PokeCoins`);
    }

    /** The picked copies the grid still shows: a filter or a sale may have taken some away. */
    function pickedNow() {
      const shown = shownUids();
      return [...picked].filter((uid) => shown.has(uid) && G.Copies.get(G.DB.save, uid));
    }
    const priceOf = (uids) => uids.reduce((total, uid) => total + (G.Copies.sellPrice(G.DB.save, uid) || 0), 0);

    async function sellPicked() {
      const save = G.DB.save,
        uids = pickedNow();
      if (!uids.length) return end();
      const learned = uids.some((uid) => G.Copies.get(save, uid).tmsLearned.length);
      const dialog = { title: 'Sell Pokemon', ok: 'Sell', intent: 'negative' };
      const asked = await G.UI.ask(`Sell selected Pokemon for ${coinText(priceOf(uids))}?`, {
        ...dialog,
        note: uids.length + ' selected.' + (learned ? ' Learned TMs go with the Pokemon sold.' : ''),
      });
      if (!asked) return;
      if (!shiftDown && !(await G.UI.ask('', { ...dialog, ok: 'Confirm' }))) return;
      const result = G.Copies.sellMany(save, uids, G.TeamDraft.uids(draft()));
      end();
      if (!result.sold) return refuse('Nothing was sold.');
      done(result.ids, `Sold ${result.sold} Pokemon for ${coinText(result.coins)} PokeCoins`);
    }

    function done(uids, text) {
      G.Audio.sfx('confirm');
      G.DB.commit(true);
      G.UI.toast(text);
      sold(uids);
    }

    return {
      mode: () => mode,
      isPicked: (uid) => picked.has(uid),
      pickedCount: () => pickedNow().length,
      pickedPrice: () => priceOf(pickedNow()),
      pressButton,
      pressCopy,
      end,
    };
  }

  return { create, coinText };
})();
