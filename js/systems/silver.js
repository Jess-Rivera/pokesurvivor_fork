/* ============ silver.js: Silver, the run's Move Shop currency (G.Silver) ============
 * Move Shop step 2 (docs/proposals/move-shop-plan.md "Silver"). A run starts with 100. Each kill pays world level / 10,
 * minimum 1, where world level is G.Stats.levelForTime(t): the plain run level, no escalation bump and no gym offset.
 * The fraction is kept inside and the HUD shows whole coins (js/ui/hud.js drawSilver).
 * Silver belongs to the run, not to a Pokemon, so a swap keeps it. It is run-only: it never touches pl.coins, the
 * end-of-run PokeCoins or the save, and unspent Silver is lost when the run ends (G.Game.startRun resets it).
 * #91-2: the run also keeps earned (what kills paid; the starting 100 and set() are not earned, DS1) and spent
 *   (successful spends only), for the pause menu's Run Info panel. Run-only like the balance; reset() zeroes both.
 * Checks: docs/proposals/silver-harness.js (mutations: silver-mutate.js).
 */
G.Silver = (() => {
  const START = 100;
  let amount = START;
  let earned = 0, // #91-2: what kills paid this run
    spent = 0; // #91-2: what successful spends took this run

  /** Silver one kill pays at run time t (seconds). */
  function payFor(t) {
    return Math.max(1, G.Stats.levelForTime(t) / 10);
  }

  return {
    START,
    payFor,
    /** A new run: back to the starting 100. */
    reset() {
      amount = START;
      earned = 0;
      spent = 0;
    },
    /** One defeated enemy at run time t (js/entities/enemy.js, the dead-enemy loop). */
    kill(t) {
      const pay = payFor(t);
      amount += pay;
      earned += pay;
    },
    /** Spend n whole coins (the shop screens, step 4). False, and nothing spent, when short. */
    spend(n) {
      if (!(n >= 0) || n > this.whole) return false;
      amount -= n;
      spent += n;
      return true;
    },
    /** Set the balance directly (G.Debug.silver). */
    set(n) {
      amount = Math.max(0, +n || 0);
    },
    /** The exact balance, fraction included. */
    get amount() {
      return amount;
    },
    /** #91-2: Silver kills paid this run, fraction included (Run Info shows whole coins). */
    get earned() {
      return earned;
    },
    /** #91-2: Silver spent this run. */
    get spent() {
      return spent;
    },
    /** Whole coins, what the HUD shows and what a price is paid from. */
    get whole() {
      return Math.floor(amount + 1e-9);
    },
  };
})();
