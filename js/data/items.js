/* ============ items.js — objetos equipables (uno por run) ============
 * They are found in chests (sometimes in the normal ones, often in the
 * chests) and the bosses drop them. You can only carry ONE; if you find
 * another, you choose which to keep. They last as long as the run.
 *
 *   on(pl)   equip it (what it does while carried)
 *   off(pl)  unequip it (undoes what on did)
 * The ones that react to something (lethal hit, damage dealt...) are checked by the
 * player with pl.hasItem(id).
 */
G.Items = (() => {
  const LIST = [
    { id: 'leftovers', name: 'Restos', desc: 'Recuperas un 1,5% de tu vida por segundo.',
      on: p => { p.regenFlat += p.maxHp * 0.015; p._itemRegen = p.maxHp * 0.015; },
      off: p => { p.regenFlat -= p._itemRegen || 0; } },
    { id: 'choiceband', name: 'Cinta Elección', desc: '+40% de daño, pero no puedes cambiar de movimiento.',
      on: p => { p.atkMul *= 1.4; }, off: p => { p.atkMul /= 1.4; } },
    { id: 'quickclaw', name: 'Garra Rápida', desc: '-20% de recarga en todos tus movimientos.',
      on: p => { p.cdMul *= 0.8; }, off: p => { p.cdMul /= 0.8; } },
    { id: 'focussash', name: 'Banda Focus', desc: 'Un golpe que te dejaría KO te deja con 1 de vida (cada 60 s).',
      on: () => {}, off: () => {} },
    { id: 'shellbell', name: 'Cascabel Concha', desc: 'Recuperas vida con el daño que haces.',
      on: () => {}, off: () => {} },
    { id: 'amuletcoin', name: 'Moneda Amuleto', desc: '+50% de Pokémonedas al acabar la run.',
      on: p => { p.coinMul *= 1.5; }, off: p => { p.coinMul /= 1.5; } },
    { id: 'luckyegg', name: 'Huevo Suerte', desc: '+30% de experiencia.',
      on: p => { p.xpMul *= 1.3; }, off: p => { p.xpMul /= 1.3; } },
    { id: 'lifeorb', name: 'Vidasfera', desc: '+30% de daño, pero cada ataque te quita un poco de vida.',
      on: p => { p.atkMul *= 1.3; }, off: p => { p.atkMul /= 1.3; } },
    { id: 'choicescarf', name: 'Pañuelo Elección', desc: '+35% de velocidad.',
      on: p => { p.spdMul *= 1.35; }, off: p => { p.spdMul /= 1.35; } },
    { id: 'rockyhelmet', name: 'Casco Dentado', desc: 'Los que te golpean cuerpo a cuerpo reciben daño.',
      on: () => {}, off: () => {} },
    { id: 'assaultvest', name: 'Chaleco Asalto', desc: '+20% de reducción de daño recibido.',
      on: p => { p.dmgReduce += 0.2; }, off: p => { p.dmgReduce -= 0.2; } }
  ];
  const BY = {};
  for (const it of LIST) BY[it.id] = it;

  /** A random one, different from the one you already carry. */
  function roll(except) {
    const pool = LIST.filter(i => i.id !== except);
    return G.U.pick(pool).id;
  }

  return { LIST, BY, roll };
})();
