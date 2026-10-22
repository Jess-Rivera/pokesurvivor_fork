/* ============ icons.js — iconos pixel art (sustituyen a los emojis) ============
 * Everything is drawn from character maps, like the tiles: this way the
 * interface shares its style with the Mystery Dungeon sprites.
 *
 *   G.Icons.html('coin', 18)     <img> for the DOM
 *   G.Icons.draw(ctx, 'coin', x, y, 18)   on the canvas
 *   G.Icons.url('star')          data URL (para CSS)
 *   'move:<id>'                  type emblem + family badge
 *   'type:<type>'                the emblem only
 */
G.Icons = (() => {
  const K = '#1b1528';          // contorno

  // ---------------- iconos de interfaz (12×12) ----------------
  const MEDAL = ['.kkk....kkk.', '.krk....kqk.', '..krk..kqk..', '...krkkqk...', '....kkkk....', '...kmmmmk...',
                 '..kmwmmmnk..', '.kmwmsmmmnk.', '.kmmsssmmnk.', '.kmmmsmmmnk.', '..kmmmmmnk..', '...kkkkkk...'];

  const UI = {
    gear: { pal: { g: '#c9d6ff', d: '#7f93c9' }, rows: [
      '....kkkk....', '.kk.kggk.kk.', '.kgkkggkkgk.', '..kggggggk..', 'kkggkkkkggkk', 'kgggk..kgddk',
      'kgggk..kgddk', 'kkggkkkkddkk', '..kggddddk..', '.kgkkddkkdk.', '.kk.kddk.kk.', '....kkkk....'] },
    full: { pal: { w: '#f4f8ff' }, rows: [
      'kkkkk..kkkkk', 'kwwwk..kwwwk', 'kwkk....kkwk', 'kwk......kwk', 'kkk......kkk', '............',
      '............', 'kkk......kkk', 'kwk......kwk', 'kwkk....kkwk', 'kwwwk..kwwwk', 'kkkkk..kkkkk'] },
    phone: { pal: { b: '#2c519f', s: '#9fd8ff', w: '#e6f4ff' }, rows: [
      '...kkkkkk...', '...kbbbbk...', '...kssssk...', '...kswssk...', '...kssssk...', '...kssssk...',
      '...kssssk...', '...kssssk...', '...kssssk...', '...kbbbbk...', '...kbwwbk...', '...kkkkkk...'] },
    // Little flag: report a ranking record.
    flag: { pal: { r: '#ff5f6d', w: '#c9cfdc' }, rows: [
      '.kk.........', '.kwkkkkkk...', '.kwkrrrrrk..', '.kwkrrrrrrk.', '.kwkrrrrrk..', '.kwkrrrrk...',
      '.kwkkkkk....', '.kwk........', '.kwk........', '.kwk........', 'kkwkk.......', 'kkkkk.......'] },
    // Prohibido (Veto: movimiento bloqueado).
    ban: { pal: { r: '#ff5f6d' }, rows: [
      '...kkkkkk...', '..krrrrrrk..', '.krrkkkkrrk.', 'krrk..krrrrk', 'krk..krrkkrk', 'krk.krrk.krk',
      'krkkrrk..krk', 'krrrrk..krrk', '.krrkkkkrrk.', '..krrrrrrk..', '...kkkkkk...', '............'] },
    heart: { pal: { r: '#ff5f6d', s: '#c23a4b', w: '#ffd3d8' }, rows: [
      '............', '.kkk....kkk.', 'kwwrk..krrrk', 'kwrrrkkrrrsk', 'krrrrrrrrrsk', 'krrrrrrrrrsk',
      '.krrrrrrrsk.', '..krrrrrsk..', '...krrrsk...', '....krsk....', '.....kk.....', '............'] },
    fist: { pal: { r: '#ff5f6d', s: '#c23a4b', w: '#ffd3d8', c: '#e8e8f0' }, rows: [
      '............', '..kkkkkk....', '.krrrrrrk...', 'krwwrrrrrkk.', 'krwrrrrrrrrk', 'krrrrrrrkrsk',
      'krrrrrrrkrsk', '.krrrrrrskk.', '..kssssssk..', '..kcccccck..', '..kkkkkkkk..', '............'] },
    up: { pal: { g: '#5fe08a', d: '#2f9a52', w: '#c8ffd8' }, rows: [
      '.....kk.....', '....kwgk....', '...kwgggk...', '..kwgggggk..', '.kwgggggggk.', 'kkkkggggkkkk',
      '...kggggk...', '...kggggk...', '...kggddk...', '...kgdddk...', '...kddddk...', '...kkkkkk...'] },
    boot: { pal: { b: '#4fb4ff', d: '#2a6fb0', w: '#e6f4ff', g: '#e8e8f0' }, rows: [
      '............', '....kkkk....', '....kbbk....', '....kbbk....', '....kbbk....', '....kbbbkk..',
      '...kbwbbbbk.', '..kbbbbbbbbk', '..kdddddddbk', '..kgggggggk.', '...kkkkkkk..', '............'] },
    // Link (reward from the legendaries): two linked chain links.
    bond: { pal: { y: '#ffd23f', w: '#fff3b0', p: '#ff8ad8', q: '#ffd3f1' }, rows: [
      '.kkkkk......', 'kwyyyyk.....', 'kykkkyk.....', 'kyk.kyk.....', 'kykkkyk.....', 'kyyyyykkkkk.',
      '.kkkkkqppppk', '.....kpkkkpk', '.....kpk.kpk', '.....kpkkkpk', '.....kpppppk', '......kkkkk.'] },
    clock: { pal: { w: '#f4f4ff', y: '#ffd23f', o: '#c9c9e0' }, rows: [
      '....kkkk....', '..kkyyyykk..', '.kyywwwwyyk.', '.kywwwkwwyk.', 'kywwwwkwwwyk', 'kywwwwkwwwyk',
      'kywwwwkkkwyk', 'kywwwwwwwwyk', '.kywwwwwwyk.', '.kyyowwwyyk.', '..kkyyyykk..', '....kkkk....'] },
    shield: { pal: { s: '#9fb1c9', d: '#5d6f8c', w: '#e6eef8', r: '#4fb4ff' }, rows: [
      '............', '.kkkkkkkkkk.', '.kwwsssssdk.', '.kwssrrssdk.', '.kwssrrssdk.', '.kssrrrrsdk.',
      '.kssrrrrsdk.', '..kssrrsdk..', '..kssssddk..', '...ksssdk...', '....kddk....', '.....kk.....'] },
    sprout: { pal: { g: '#5fe08a', d: '#2f9a52', b: '#8a5a2b' }, rows: [
      '............', '..kkk..kkk..', '.kgggk.kgggk', '.kggggkgggdk', '..kdggkggdk.', '...kkdgdkk..',
      '.....kgk....', '.....kgk....', '...kkkdkkk..', '..kbbbbbbbk.', '..kbbbbbbbk.', '...kkkkkkk..'] },
    magnet: { pal: { r: '#ff5f6d', s: '#c23a4b', w: '#e8e8f0' }, rows: [
      '............', '..kkkkkkkk..', '.krrrrrrrrk.', 'krrsskkssrrk', 'krrk....krrk', 'krrk....krrk',
      'krrk....krrk', 'kwwk....kwwk', 'kwwk....kwwk', 'kkkk....kkkk', '............', '............'] },
    book: { pal: { c: '#4fb4ff', d: '#2a6fb0', p: '#f4f4ff', y: '#ffd23f' }, rows: [
      '............', '.kkkkkkkkkk.', '.kcccccccck.', '.kcyyyyyyck.', '.kcccccccck.', '.kccyyyyyck.',
      '.kcccccccck.', '.kcccccccck.', '.kddddddddk.', '.kppppppppk.', '.kkkkkkkkkk.', '............'] },
    coin: { pal: { y: '#ffd23f', o: '#c08a10', w: '#fff4b0' }, rows: [
      '....kkkk....', '..kkyyyykk..', '.kyywwyyyyk.', '.kywyyyyyok.', 'kyyyyooyyyok', 'kywyoyyoyyok',
      'kyyyoyyoyyok', 'kyyyyooyyyok', '.kyyyyyyyok.', '.kooyyyyook.', '..kkooookk..', '....kkkk....'] },
    cards: { pal: { a: '#ffd23f', b: '#4fb4ff', w: '#e6f4ff' }, rows: [
      '............', '.kkkkkk.....', '.kaaaaakkkk.', '.kaaaakbbbbk', '.kaaaakbwwbk', '.kaaaakbwwbk',
      '.kaaaakbbbbk', '.kaaaakbwwbk', '.kkkkkkbwwbk', '......kbbbbk', '......kkkkkk', '............'] },
    berry: { pal: { r: '#ff7a9e', s: '#c23a6b', w: '#ffd3e0', g: '#5fe08a', d: '#2f9a52' }, rows: [
      '............', '.....kkk....', '....kgggk...', '..kkkgdkkk..', '.krrrkkrrrk.', 'krwwrrrrrrsk',
      'krwrrrrrrrsk', 'krrrrrrrrrsk', 'krrrrrrrrssk', '.krrrrrrssk.', '..kkssssskk.', '....kkkkk...'] },
    bomb: { pal: { b: '#3a3a4a', w: '#8a8aa0', f: '#ffd23f', r: '#ff7b3d' }, rows: [
      '........r...', '.......rfr..', '......kfr...', '.....kfk....', '...kkkkkk...', '..kbbbbbbk..',
      '.kbwwbbbbbk.', '.kbwbbbbbbk.', '.kbbbbbbbbk.', '.kbbbbbbbbk.', '..kbbbbbbk..', '...kkkkkk...'] },
    star: { pal: { y: '#ffd23f', o: '#c08a10', w: '#fff4b0' }, rows: [
      '.....kk.....', '.....kk.....', '....kwyk....', '....kyyk....', 'kkkkwyyykkkk', 'kwyyyyyyyyok',
      '.kyyyyyyyok.', '..kyyyyyyk..', '..kyyyoyyk..', '.kyok..koyk.', '.kok....kok.', '.kk......kk.'] },
    // Shiny mark: the red star from the games' summary, with a sparkle.
    shiny: { pal: { y: '#ff4d5e', w: '#ffd0d6', o: '#b8283a', x: '#fff6b0' }, rows: [
      '.....kk...x.', '.....kk..xxx', '....kwyk..x.', '....kyyk....', 'kkkkwyyykkkk', 'kwyyyyyyyyok',
      '.kyyyyyyyok.', '..kyyyyyyk..', '..kyyyoyyk..', '.kyok..koyk.', '.kok....kok.', '.kk......kk.'] },
    crown: { pal: { y: '#ffd23f', o: '#c08a10', r: '#ff5f6d' }, rows: [
      '............', '............', 'k....k....k.', 'kk..kyk..kk.', 'kyk.kyk.kyk.', 'kyykyyykyyk.',
      'kyyyyyyyyyk.', 'kyyryyyryyk.', 'kyyyyyyyyyk.', 'koooooooook.', 'kkkkkkkkkkk.', '............'] },
    user: { pal: { u: '#b9cbf0', d: '#7f93c0' }, rows: [
      '............', '....kkkk....', '...kuuuuk...', '...kuuuuk...', '...kuuuuk...', '....kuuk....',
      '..kkkuukkk..', '.kuuuuuuuuk.', '.kuuuuuuuuk.', '.kdduuuuddk.', '.kkkkkkkkkk.', '............'] },
    cursor: { pal: { y: '#ffd23f' }, rows: [
      'k.......', 'kk......', 'kyk.....', 'kyyk....', 'kyyyk...', 'kyyyyk..',
      'kyyyk...', 'kyyk....', 'kyk.....', 'kk......', 'k.......', '........'] },
    sound: { pal: { w: '#e8eef8' }, rows: [
      '............', '.....kk.....', '....kwk..k..', '...kwwk...k.', 'kkkwwwk.k..k', 'kwwwwwk..k.k',
      'kwwwwwk..k.k', 'kkkwwwk.k..k', '...kwwk...k.', '....kwk..k..', '.....kk.....', '............'] },
    mute: { pal: { w: '#e8eef8', r: '#ff5f6d' }, rows: [
      '............', '.....kk.....', '....kwk.....', '...kwwk.....', 'kkkwwwk.r..r', 'kwwwwwk..rr.',
      'kwwwwwk..rr.', 'kkkwwwk.r..r', '...kwwk.....', '....kwk.....', '.....kk.....', '............'] },
    ticket: { pal: { y: '#ffd23f', d: '#c08a10', w: '#fff3b0', r: '#ff5f6d' }, rows: [
      '............', '............', 'kkkkkkkkkkkk', 'kwyyydyyyyyk', 'kyyyyyyrryyk', '.kyyydyrryk.',
      '.kyyyyyrryk.', 'kyyyydyyyyyk', 'kddddddddddk', 'kkkkkkkkkkkk', '............', '............'] },
    ticket10: { pal: { p: '#c47bff', q: '#8a3fd0', w: '#f0d8ff', y: '#ffd23f' }, rows: [
      '............', '............', 'kkkkkkkkkkkk', 'kwpppqppyypk', 'kppppqpyyypk', '.kpppqpyyyk.',
      '.kpppqppyyk.', 'kppppqpppppk', 'kqqqqqqqqqqk', 'kkkkkkkkkkkk', '............', '............'] },
    wsun: { pal: { y: '#ffd23f', o: '#ff9a3d' }, rows: [
      '.....yy.....', '..y..yy..y..', '...y....y...', '....kkkk....', 'yy.kyyyyk.yy', 'yy.kyyoyk.yy',
      '...kyooyk...', '....kkkk....', '...y....y...', '..y..yy..y..', '.....yy.....', '............'] },
    wrain: { pal: { w: '#e8eef8', g: '#9fb1c9', b: '#4fb4ff' }, rows: [
      '............', '...kkkk.....', '..kwwwwkkk..', '.kwwwwwwwwk.', 'kwwwwwwwwwgk', 'kggggggggggk',
      '.kkkkkkkkkk.', '..b...b...b.', '.b...b...b..', '..b...b...b.', '.b...b...b..', '............'] },
    wsand: { pal: { s: '#e0bf73', d: '#9a7a3a' }, rows: [
      '............', '..ssssss....', '........ss..', 'ssssssss..s.', '.........s..', '..dddddd....',
      '........dd..', 'dddddd....d.', '.........d..', '...sssss....', '............', '............'] },
    wsnow: { pal: { w: '#ffffff', c: '#9fe0ff' }, rows: [
      '.....w......', '...w.w.w....', '....www.....', '.w..cwc..w..', '..w.cwc.w...', 'wwwwwwwwwww.',
      '..w.cwc.w...', '.w..cwc..w..', '....www.....', '...w.w.w....', '.....w......', '............'] },
    wfog: { pal: { g: '#c9cfdc', d: '#8f98ab' }, rows: [
      '............', '............', '..gggggg....', '.g......gg..', '............', '....gggggg..',
      '..dd......d.', '............', '.ggggggg....', 'g.......gg..', '............', '............'] },
    // Balls of the gacha slot machine (one per rarity). Pixel art cut from assets/icons/pokeball/<rarity>.png:
    // ball = Common, ball2 = Uncommon (Premier), ball3 = Rare, ballLux = Epic, ball4 = Legendary.
    ball2: { pal: { k: '#000000', a: '#ffffff', b: '#e0e0e0', c: '#ff0000' }, rows: [
      '....kkkk....', '..kkaabbkk..', '.kaaaaabbbk.', '.kaaaaaabbk.', 'kaaaaaaaabbk', 'kaaaaccabbbk',
      'kcaacabcbbck', 'kacccbbcccbk', '.kaaaccbbbk.', '.kbaaabbbbk.', '..kkbbbbkk..', '....kkkk....'] },
    ball3: { pal: { k: '#000000', a: '#24c1e0', b: '#e00000', c: '#ffffff', d: '#e0e0e0' }, rows: [
      '....kkkk....', '..kkaaaakk..', '.kbbaaaabbk.', '.kbbbaabbbk.', 'kaabbaabbaak', 'kaaaakkaaaak',
      'kkaakcdkaakk', 'kckkkddkkkdk', '.kccckkdddk.', '.kdcccddddk.', '..kkddddkk..', '....kkkk....'] },
    ball4: { pal: { k: '#000000', a: '#70157a', b: '#ff33d6', c: '#ffffff', d: '#e0e0e0' }, rows: [
      '....kkkk....', '..kkaaaakk..', '.kbbaaaabbk.', '.kbccaaccbk.', 'kaacaccacaak', 'kaaaakkaaaak',
      'kkaakcdkaakk', 'kckkkddkkkdk', '.kccckkdddk.', '.kdcccddddk.', '..kkddddkk..', '....kkkk....'] },
    ballLux: { pal: { k: '#000000', a: '#f7ff00', b: '#ffffff', c: '#e0e0e0' }, rows: [
      '....kkkk....', '..kkaaaakk..', '.kaaaaaaaak.', '.kaakkkkaak.', 'kkaakkkkaakk', 'kkkkkkkkkkkk',
      'kkkkkbckkkkk', 'kbkkkcckkkck', '.kbbbkkccck.', '.kcbbbcccck.', '..kkcccckk..', '....kkkk....'] },
    // ---------- objetos equipables (data/items.js) ----------
    leftovers: { pal: { r: '#ff5f6d', d: '#b8283a', w: '#ffd8d8', g: '#5fe08a' }, rows: [
      '.....kgk....', '....kggk....', '..kkkkkkkk..', '.krwrrrrrrk.', 'krwrrrrrrrdk', 'krrrrrrrrrdk',
      'krrrrrrrrrdk', 'krrrrrrrrddk', '.krrrrrrrdk.', '..kdrrrrdk..', '...kkkkkk...', '............'] },
    choiceband: { pal: { p: '#ff8ad8', q: '#c04a98', w: '#ffe0f4' }, rows: [
      '............', '............', '...kkkkkk...', '.kkppwwppkk.', 'kpp......ppk', 'kq........qk',
      'kq........qk', 'kpp......ppk', '.kkppppppkk.', '...kkkkkk...', '............', '............'] },
    quickclaw: { pal: { y: '#ffd23f', o: '#c08a10', b: '#8a5a2b' }, rows: [
      '........kk..', '.......kyk..', '......kyok..', '..kk..kyok..', '.kyk.kyok...', '.kyokyok....',
      '.kyyyok..kk.', '.kbbbbk.kyk.', 'kbbbbbbkyok.', 'kbbbbbbyok..', '.kkkkkkkk...', '............'] },
    focussash: { pal: { o: '#ff9a3d', d: '#c0601a', w: '#ffd0a0' }, rows: [
      '.kk.........', 'kook........', 'kwook.......', '.kwook......', '..kwook.....', '...kwook....',
      '....kwook...', '.....kwook..', '......kwook.', '.......koodk', '........kddk', '.........kk.'] },
    shellbell: { pal: { p: '#ff9ec4', q: '#c05a88', w: '#ffe0ee', y: '#ffd23f' }, rows: [
      '.....kk.....', '....kyyk....', '...kkkkkk...', '..kwppppqk..', '.kwppppppqk.', '.kpppppppqk.',
      'kpppppppppqk', 'kppqpqpqppqk', 'kkkkkkkkkkkk', '....kyyk....', '.....kk.....', '............'] },
    amuletcoin: { pal: { y: '#ffd23f', o: '#c08a10', w: '#fff3b0', r: '#ff5f6d' }, rows: [
      '..kk....kk..', '..krk..krk..', '...krkkrk...', '....kkkk....', '...kyyyyk...', '..kywyyyok..',
      '..kyyooyok..', '..kyyooyok..', '..kyyyyyok..', '...kooook...', '....kkkk....', '............'] },
    luckyegg: { pal: { w: '#fffaf0', s: '#e0d6c8', r: '#ff5f6d' }, rows: [
      '....kkkk....', '...kwwwwk...', '..kwwrwwwk..', '..kwwwwwwk..', '.kwrwwwwrwk.', '.kwwwwwwwwk.',
      '.kwwwrwwwsk.', '.kwwwwwwwsk.', '.kwrwwwwssk.', '..kwwwwssk..', '...kkkkkk...', '............'] },
    lifeorb: { pal: { p: '#c04a98', d: '#7a1f5a', w: '#ffb0e0', r: '#ff3048' }, rows: [
      '....kkkk....', '..kkpppdkk..', '.kwwpppppdk.', '.kwpprrpppk.', 'kppprrrrppdk', 'kpprrrrrrpdk',
      'kpprrrrrrpdk', 'kppprrrrppdk', '.kpppprppdk.', '.kdpppppddk.', '..kkddddkk..', '....kkkk....'] },
    choicescarf: { pal: { b: '#4fb4ff', d: '#2a6fb0', w: '#cfe8ff' }, rows: [
      '............', '............', 'kkkkkkkkkk..', 'kwbbbbbbbbk.', 'kbbbbbbbbdk.', 'kkkkkkkbbdk.',
      '......kbbdk.', '......kbbdk.', '.....kbbbdk.', '.....kbbddk.', '.....kkkkkk.', '............'] },
    rockyhelmet: { pal: { g: '#9aa6b5', d: '#5d6773', w: '#e0e6ee' }, rows: [
      '............', '.k...k...k..', 'kgk.kgk.kgk.', '.kkkkkkkkk..', 'kwggggggggk.', 'kwgggggggdk.',
      'kggggggggdk.', 'kgggkkkkgdk.', 'kggk....kdk.', 'kkk......kk.', '............', '............'] },
    assaultvest: { pal: { g: '#4f8a3a', d: '#2f5a22', y: '#ffd23f' }, rows: [
      '............', '.kkk....kkk.', 'kggk....kggk', 'kgggkkkkgggk', 'kgggyggygggk', 'kgggggggggdk',
      'kggyggggygdk', 'kgggggggggdk', 'kgggggggggdk', 'kddddddddddk', 'kkkkkkkkkkkk', '............'] },
    // ---------- medallas de logros (bronce, plata, oro) ----------
    medal1: { pal: { r: '#ff5f6d', q: '#b8283a', m: '#d08a4a', n: '#8a5226', w: '#ffd0a0', s: '#ffe8c8' }, rows: MEDAL },
    medal2: { pal: { r: '#4fb4ff', q: '#2a6fb0', m: '#c9d2de', n: '#7d8899', w: '#ffffff', s: '#ffffff' }, rows: MEDAL },
    medal3: { pal: { r: '#c47bff', q: '#7a3fb0', m: '#ffd23f', n: '#c08a10', w: '#fff3b0', s: '#fffbe0' }, rows: MEDAL },
    medalOff: { pal: { r: '#3a4870', q: '#2a3458', m: '#3a4870', n: '#2a3458', w: '#4a5a88', s: '#4a5a88' }, rows: MEDAL },
    trophy: { pal: { y: '#ffd23f', d: '#c08a10', w: '#fff3b0' }, rows: [
      '............', '..kkkkkkkk..', 'kkkwyyyydkkk', 'k.kwyyyydk.k', 'k.kwyyyydk.k', '.kkwyyyydkk.',
      '...kyyyyk...', '....kyyk....', '....kyyk....', '...kddddk...', '..kyyyyyyk..', '..kkkkkkkk..'] },
    friends: { pal: { b: '#4fb4ff', d: '#2a6fb0', g: '#5fe08a', h: '#2f9a52' }, rows: [
      '............', '..kkk..kkk..', '.kbbbkkgggk.', '.kbbbkkgggk.', '..kkk..kkk..', '............',
      '.kkkkkkkkkk.', 'kbbbbkkggggk', 'kbbbbkkggggk', 'kddddkkhhhhk', 'kkkkkkkkkkkk', '............'] },
    ball: { pal: { k: '#000000', a: '#f50000', b: '#ffffff', c: '#e0e0e0' }, rows: [
      '....kkkk....', '..kkaaaakk..', '.kaabaaaaak.', '.kabbbaaaak.', 'kaaabaaaaaak', 'kaaaakkaaaak',
      'kkaakbckaakk', 'kbkkkcckkkck', '.kbbbkkccck.', '.kcbbbcccck.', '..kkcccckk..', '....kkkk....'] }
  };
  // Variantes de paleta.
  UI.starDim = { rows: UI.star.rows, pal: { y: '#3a4870', o: '#2a3458', w: '#4a5a88' } };
  // Half star: the left half bright, the right half dim (capital letters = the dim colors).
  UI.starHalf = {
    rows: UI.star.rows.map(r => [...r].map((ch, x) => (x >= 6 && 'yow'.includes(ch) ? ch.toUpperCase() : ch)).join('')),
    pal: { y: '#ffd23f', o: '#c08a10', w: '#fff4b0', Y: '#3a4870', O: '#2a3458', W: '#4a5a88' }
  };

  // ---------------- type glyphs (8x8, white over the emblem) ----------------
  const TYPE_GLYPH = {
    normal:   ['..####..', '.#....#.', '#......#', '#..##..#', '#..##..#', '#......#', '.#....#.', '..####..'],
    fire:     ['...#....', '...##...', '..###.#.', '.#####..', '.######.', '##.####.', '##..###.', '.######.'],
    water:    ['...##...', '...##...', '..####..', '.######.', '.##.###.', '.#.####.', '.######.', '..####..'],
    grass:    ['.....###', '...#####', '..######', '.####.##', '.###.###', '.##.####', '.#.####.', '#.......'],
    electric: ['....###.', '...###..', '..###...', '.######.', '...###..', '..###...', '.##.....', '#.......'],
    psychic:  ['.######.', '#......#', '#.####.#', '#.#..#.#', '#.#.##.#', '#.#....#', '#.######', '#.......'],
    ice:      ['...#....', '.#.#.#..', '..###...', '#######.', '..###...', '.#.#.#..', '...#....', '........'],
    fighting: ['.######.', '########', '########', '#.#.#.##', '########', '.#######', '..#####.', '..####..'],
    poison:   ['.....##.', '....####', '.....##.', '.###....', '#####...', '#####.##', '.###.###', '.....##.'],
    ground:   ['........', '...##...', '..####..', '.##..##.', '.######.', '##.##.##', '########', '........'],
    flying:   ['#.......', '##......', '###.....', '####....', '######..', '########', '.#######', '...####.'],
    bug:      ['.#....#.', '..#..#..', '..####..', '.##.###.', '########', '###.####', '.######.', '..####..'],
    rock:     ['...###..', '..#####.', '.###.###', '######.#', '##.#####', '#######.', '.#####..', '........'],
    ghost:    ['..####..', '.######.', '##.##.##', '##.##.##', '########', '########', '########', '#.#..#.#'],
    dragon:   ['#.......', '##....#.', '.##..##.', '.######.', '..####..', '.######.', '##.##.##', '#..##..#'],
    dark:     ['..####..', '.###....', '###.....', '###.....', '###.....', '###.....', '.###....', '..####..'],
    steel:    ['..####..', '.######.', '###..###', '##....##', '##....##', '###..###', '.######.', '..####..'],
    fairy:    ['...#....', '...#....', '..###...', '#######.', '..###...', '..#.#...', '.#...#..', '........']
  };

  // Move family badge (5x5).
  const KIND_GLYPH = {
    projectile: ['..#..', '...#.', '#####', '...#.', '..#..'],
    melee:      ['....#', '...#.', '..#..', '.#...', '#....'],
    beam:       ['.....', '#####', '.....', '#####', '.....'],
    orbit:      ['.###.', '#...#', '#...#', '#...#', '.###.'],
    nova:       ['#.#.#', '.###.', '#####', '.###.', '#.#.#'],
    aura:       ['.###.', '#...#', '#.#.#', '#...#', '.###.'],
    buff:       ['..#..', '.###.', '#####', '..#..', '..#..'],
    boomerang:  ['####.', '#....', '#....', '#....', '#....'],
    chain:      ['##...', '..#..', '...##', '..#..', '##...'],
    mine:       ['..#..', '.###.', '##.##', '.###.', '..#..'],
    meteor:     ['....#', '...#.', '.##..', '####.', '.##..'],
    turret:     ['.###.', '.#.#.', '.###.', '..#..', '#####'],
    dash:       ['#.#..', '.#.#.', '..#.#', '.#.#.', '#.#..'],
    trail:      ['#....', '.....', '..#..', '.....', '....#'],
    cone:       ['....#', '..###', '#####', '..###', '....#']
  };

  // ---------------- type icons (18x18) ----------------
  // Jess's pixel art (assets/icons/types/<type>.png, 20x20 with a 1 px transparent margin), cropped to the 18x18 of
  // art and embedded as rows so they draw synchronously, like the balls. Used by the type emblem and by every move icon
  // (which adds the family badge on top). If a type is missing here the old code-drawn disc is used.
  const TYPE_ICON = {
    normal: { pal: { a: '#ffffff', b: '#5f5f5f', c: '#828282', d: '#3f3f3f', e: '#393939', f: '#5c5c5c', g: '#606060', h: '#5a5a5a', i: '#5d5d5d', j: '#626262', k: '#686868', l: '#565656', m: '#343434', n: '#363636', o: '#373737', p: '#656565', q: '#666666', r: '#3c3c3c', s: '#333333', t: '#3e3e3e', u: '#2e2e2e', v: '#545454', w: '#595959', x: '#696969', y: '#515151', z: '#3b3b3b', A: '#505050', B: '#303030', C: '#2a2a2a', D: '#454545' }, rows: [
      'cccccccccccccccccb', 'cbbbbbbihjhbbgkhvs', 'ciwbbbfjbbbbgbbbho', 'cbghaajaaaafaakfln', 'cbgaaaaaaaaaaaafit', 'cibaaaaddddaaaadfe',
      'cihbaaddgkbhaaddbe', 'chiaaddbbgpbfaafbe', 'cbbaadbbbbbgqaadlu', 'cigaadxgbbfbjaadhe', 'cbbaadbhhibfyaadqr', 'cbbbaagbfllfaaddfu',
      'cjbbaaabbfiaaadlie', 'cpkgbaaaaaaaaddjje', 'cbbbjbdaaaadddbgqz', 'cbffbihAddddfbgkjt', 'peenBeemnmmCmeeeee', 'feedDreomoneeeeres' ] },
    fire: { pal: { a: '#c23e1b', b: '#ffffff', c: '#e5613e', d: '#9c1800', e: '#3f3f3f', f: '#bf3b18', g: '#c03c19', h: '#c5411e', i: '#bd3916', j: '#c33f1c', k: '#971300', l: '#cb4724', m: '#bc3815', n: '#b93512', o: '#991500', p: '#c84421', q: '#9a1600', r: '#c94522', s: '#9f1b00', t: '#961200', u: '#a11d00', v: '#fffdfb', w: '#910d00', x: '#ce4a27', y: '#b32f0c', z: '#b73310', A: '#fff9f8', B: '#fffefe', C: '#ba3613', D: '#fff8f7', E: '#fff9f5', F: '#fff7f6', G: '#9e1a00', H: '#930f00', I: '#8d0900', J: '#a21e00', K: '#a82401' }, rows: [
      'ccccccccccccccccca', 'caaaaaagihiaajlizt', 'cgmaaafhaaaajaaaiq', 'cajigahabaafihlfno', 'cajhmahaAbgaagmfgu', 'cgaaaahabbeaaafgfd',
      'cgiahppBbbebggmfad', 'cigfngvbbebaeaCfad', 'caaagjbebbbvraaanw', 'cgjxhbbebbbbeaffid', 'caaaabeeDbbbbaajrs', 'caaahbeafEbbbeaafw',
      'chaafbeaafbbbeyngd', 'cpljaaFaaabbeexhhd', 'caaahaaeabbeeaajrG', 'caffagiyiaeefajlhu', 'pddoHddkokkIkddddd', 'fddJKsdqkqoddddsdt' ] },
    water: { pal: { a: '#0d77bf', b: '#ffffff', c: '#309ae2', d: '#005199', e: '#3f3f3f', f: '#0a74bc', g: '#0b75bd', h: '#107ac2', i: '#0e78c0', j: '#0872ba', k: '#0771b9', l: '#004c94', m: '#1680c8', n: '#046eb6', o: '#004e96', p: '#137dc5', q: '#004f97', r: '#147ec6', s: '#00549c', t: '#004b93', u: '#00569e', v: '#00468e', w: '#1983cb', x: '#0068b0', y: '#026cb4', z: '#056fb7', A: '#00539b', B: '#004890', C: '#00428a', D: '#00579f', E: '#005da5' }, rows: [
      'ccccccccccccccccca', 'caaaaaagjhjaaimjyt', 'cgkaaafhaaaaiaaajq', 'caijgahabaafjhmfno', 'caihkahabegaagkfgu', 'cgaaaahabeaaaafgfd',
      'cgjahppbbbajggkfad', 'cjgfngabbbeafazfad', 'caaagibbbbbiraaanv', 'cgiwhbbbbbbbhaffjd', 'caaaabbbbbbbeaairs', 'caaahbebbbebeiaafv',
      'chaafbeaeeebekxngd', 'cpmiabbaaabbeiwhhd', 'caaahaebbbaeeaairA', 'caffagjxeeehfaimhu', 'pddoBddlollClddddd', 'fddDEsdqlqoddddsdt' ] },
    grass: { pal: { a: '#207614', b: '#ffffff', c: '#3f3f3f', d: '#439937', e: '#005000', f: '#1d7311', g: '#1e7412', h: '#237917', i: '#217715', j: '#1b710f', k: '#1a700e', l: '#004b00', m: '#297f1d', n: '#176d0b', o: '#004d00', p: '#004e00', q: '#267c1a', r: '#005300', s: '#004a00', t: '#005500', u: '#004500', v: '#2c8220', w: '#277d1b', x: '#fffefd', y: '#116705', z: '#156b09', A: '#186e0c', B: '#fefffc', C: '#fdfffc', D: '#feffff', E: '#005200', F: '#004700', G: '#004100', H: '#005600', I: '#065c00' }, rows: [
      'ddddddddddddddddda', 'daaaaaagjhjaaimjzs', 'dgkaaafhaaaaiaaajp', 'daijgahaaabfjhmfno', 'daihkahafAbcagkfgt', 'dgaaaahakbbcaafgfe',
      'dgjahqbiibbcgbkfae', 'djgfngbcabccBbcfae', 'daaagbbcbbcibbcanu', 'dgivhbbcbbcCbccfje', 'daaaabbcbbcbbcaiwr', 'daaabbbcbcxbbcaafu',
      'dhaabbbcbcbbbcynge', 'dqmbbbccaDbbbcvhhe', 'daabbbcaabbbxcaiwE', 'daffcccyjaccccimht', 'qeeoFeelollGleeeee', 'feeHIreplpoeeeeres' ] },
    electric: { pal: { a: '#bd9a05', b: '#ffffff', c: '#e0bd28', d: '#977400', e: '#ba9702', f: '#c09d08', g: '#bb9803', h: '#be9b06', i: '#3f3f3f', j: '#b89500', k: '#b79400', l: '#b49100', m: '#c3a00b', n: '#926f00', o: '#c6a30e', p: '#947100', q: '#957200', r: '#c4a10c', s: '#9a7700', t: '#916e00', u: '#9c7900', v: '#8c6900', w: '#c9a611', x: '#ae8b00', y: '#b28f00', z: '#b59200', A: '#af8c00', B: '#997600', C: '#8e6b00', D: '#886500', E: '#9d7a00', F: '#a38000' }, rows: [
      'ccccccccccccccccca', 'caaaaaagjfjaahojyt', 'cgkaaaefaaaahaaajq', 'cahjgafabaaejfoelp', 'cahfkafbbbbaagkegu', 'cgaaaafbbbbbaaeged',
      'cgjafmbbbbbiigkead', 'cjgelbbbbbiieazead', 'caaagbbbbbihraaalv', 'cghwfmbbbbbafaeejd', 'caaaahabbbbbAaahrs', 'caaafhhabbbiihaaev',
      'cfaaekfabbiifkxlgd', 'cmohaaeabiiaghwffd', 'caaafaabaiaelaahrB', 'caeeagjxiamfeahofu', 'mddpCddnpnnDnddddd', 'eddEFsdqnqpddddsdt' ] },
    ice: { pal: { a: '#24a6a6', b: '#ffffff', c: '#47c9c9', d: '#3f3f3f', e: '#008080', f: '#21a3a3', g: '#22a4a4', h: '#27a9a9', i: '#1fa1a1', j: '#25a7a7', k: '#1b9d9d', l: '#007b7b', m: '#2dafaf', n: '#1ea0a0', o: '#007d7d', p: '#007e7e', q: '#2aacac', r: '#018383', s: '#007a7a', t: '#038585', u: '#007575', v: '#2badad', w: '#199b9b', x: '#f9ffff', y: '#30b2b2', z: '#008282', A: '#159797', B: '#007777', C: '#007171', D: '#048686', E: '#0a8c8c' }, rows: [
      'ccccccccccccccccca', 'caaaaaagihiaajmiws', 'cgnaaafhaaaajaaaip', 'cajigahabbafihmfko', 'cajhnahabbdaagnfgt', 'cgaabbhanddabbfgfe',
      'cgiabbdbbbbibbdfae', 'cigfkdbbdbbbfddfae', 'caaagjxdbbbbdaaaku', 'cgjyhqbdbbbbdaffie', 'caaaajbbbbbbdaajvr', 'caaabbjbbbbdbbaafu',
      'chaabbdaddddbbdkge', 'cqmjaddabbaagddhhe', 'caaahaaabbdfkaajvz', 'caffagiAiddhfajmht', 'qeeoBeelollCleeeee', 'feeDEreplpoeeeeres' ] },
    fighting: { pal: { a: '#ffffff', b: '#c26e00', c: '#3f3f3f', d: '#e59121', e: '#9c4800', f: '#bf6b00', g: '#c06c00', h: '#c36f00', i: '#bd6900', j: '#c57101', k: '#974300', l: '#cb7707', m: '#994500', n: '#9a4600', o: '#b96500', p: '#9f4b00', q: '#c87404', r: '#964200', s: '#a14d00', t: '#913d00', u: '#c97505', v: '#b76300', w: '#bc6800', x: '#ce7a0a', y: '#cc7808', z: '#9e4a00', A: '#933f00', B: '#8d3900', C: '#a24e00', D: '#a85400' }, rows: [
      'dddddddddddddddddb', 'dbbbbbbgijibbhlivr', 'dgwbbbfjbbbbhbbbin', 'dbhaabaabaafaalfom', 'dbhaacaacaacaacfgs', 'dgbaacaacaacaacgfe',
      'dgiaacaacaacaacfbe', 'digaacaachccfccfbe', 'dbbaacaacaaaaabbot', 'dghxccyccaaaaacfie', 'dbbaaaaaigccccchup', 'dbbaaaaaaaaaaabbft',
      'djbaaaaaaaaaaacoge', 'dqlhaaaaaaaaaccjje', 'dbbbjaaaacccccbhuz', 'dbffbgccccqjfbhljs', 'qeemAeekmkkBkeeeee', 'feeCDpenknmeeeeper' ] },
    poison: { pal: { a: '#7131a9', b: '#ffffff', c: '#9454cc', d: '#4b0b83', e: '#6e2ea6', f: '#3f3f3f', g: '#6f2fa7', h: '#7434ac', i: '#7232aa', j: '#6c2ca4', k: '#6b2ba3', l: '#6828a0', m: '#7737af', n: '#46067e', o: '#7a3ab2', p: '#480880', q: '#490981', r: '#4e0e86', s: '#45057d', t: '#6929a1', u: '#501088', v: '#400078', w: '#7838b0', x: '#66269e', y: '#7d3db5', z: '#7b3bb3', A: '#62229a', B: '#fffcff', C: '#4d0d85', D: '#42027a', E: '#3c0074', F: '#511189', G: '#57178f' }, rows: [
      'ccccccccccccccccca', 'caaaaaagjhjaaiojxs', 'cgkaaaehaaaaiaaajq', 'caijgabbaaaejhoelp', 'caihkbbbbtgaagkegu', 'cgaaabbbbfaaaaeged',
      'cgjahmbbffajggkead', 'cjgelgaffimbeatead', 'caaagiaaaabbbaaalv', 'cgiyhmziaaebffeejd', 'caaaaiajjgaefaaiwr', 'caaahiiabbleeiaaev',
      'chaaekhbbbbahkAlgd', 'cmobbbbbbbbbbbbhhd', 'caaaBbbbbbbbbbffwC', 'caeeaffffffffffohu', 'mddpDddnpnnEnddddd', 'eddFGrdqnqpddddrds' ] },
    ground: { pal: { a: '#825019', b: '#ffffff', c: '#a5733c', d: '#3f3f3f', e: '#5c2a00', f: '#7f4d16', g: '#804e17', h: '#83511a', i: '#7d4b14', j: '#85531c', k: '#8b5922', l: '#88561f', m: '#572500', n: '#7c4a13', o: '#794710', p: '#592700', q: '#5a2800', r: '#895720', s: '#5f2d00', t: '#562400', u: '#7a4811', v: '#fffeff', w: '#612f00', x: '#511f00', y: '#8e5c25', z: '#77450e', A: '#5e2c00', B: '#73410a', C: '#532100', D: '#4d1b00', E: '#623000', F: '#683600' }, rows: [
      'ccccccccccccccccca', 'caaaaaagijiaahkizt', 'cgnaaafjaaaahaaaiq', 'cahibbjaaaafijkfop', 'cahjbbdafugabvnfgw', 'cgaaaddangaabvdgfe',
      'cgiajllbhkaigddfae', 'cigfogaadhlafaufae', 'caaaghaabbahraaaox', 'cghyjbbbbbbbbaffie', 'caabbbbbbbbbbbbhrs', 'caaadbbbbbbbbdddfx',
      'cjabfnddbbddddboge', 'clkhbbbaaddbbbydje', 'caaajddbbbbfdddhrA', 'caffagiBddddfahkjw', 'leepCeempmmDmeeeee', 'feeEFseqmqpeeeeset' ] },
    flying: { pal: { a: '#5188ae', b: '#ffffff', c: '#74abd1', d: '#3f3f3f', e: '#2b6288', f: '#4e85ab', g: '#4f86ac', h: '#548bb1', i: '#4c83a9', j: '#5289af', k: '#487fa5', l: '#265d83', m: '#285f85', n: '#578eb4', o: '#5a91b7', p: '#4b82a8', q: '#296086', r: '#2e658b', s: '#255c82', t: '#4980a6', u: '#30678d', v: '#20577d', w: '#5d94ba', x: '#588fb5', y: '#42799f', z: '#467da3', A: '#437aa0', B: '#2d648a', C: '#22597f', D: '#1c5379', E: '#31688e', F: '#376e94' }, rows: [
      'ccccccccccccccccca', 'caaaaaagihiaajoizs', 'cgpaaafhaaaajaaaiq', 'cajigahaaaafibbfkm', 'cajhpahaftbbbbddgu', 'cgaaaahbbbbbbbdgfe',
      'cgiahnbbbbbbdddfae', 'cigfkgbbbbdddatfae', 'caaagbbbbbbbbaaakv', 'cgjwhbbbbbbdddffie', 'caaaabbbddddAaajxr', 'caaabbbbbbkffjaafv',
      'chaabbdddddahpykge', 'cnojbddaaaaagjwhhe', 'caaabdaaagafkaajxB', 'caffadiyianhfajohu', 'neemCeelmllDleeeee', 'feeEFreqlqmeeeeres' ] },
    psychic: { pal: { a: '#c7496a', b: '#ffffff', c: '#ea6c8d', d: '#3f3f3f', e: '#a12344', f: '#c44667', g: '#c54768', h: '#c24465', i: '#ca4c6d', j: '#c84a6b', k: '#d05273', l: '#be4061', m: '#9c1e3f', n: '#9e2041', o: '#c14364', p: '#9f2142', q: '#cd4f70', r: '#ce5071', s: '#a42647', t: '#9b1d3e', u: '#a62849', v: '#961839', w: '#bc3e5f', x: '#d35576', y: '#d15374', z: '#b93b5c', A: '#a32546', B: '#b83a5b', C: '#981a3b', D: '#921435', E: '#a7294a', F: '#ad2f50' }, rows: [
      'ccccccccccccccccca', 'caaaaaaghihaajkhwt', 'cgoaaafiaaaajaaahp', 'cajhgaiabbafhikfln', 'cajioaibbbbaagofgu', 'cgaabbbbddbbbbfgfe',
      'cghbbbbddkabbbbfae', 'chgbbdddajqadbbdae', 'caaabdaaaaajrbddlv', 'cgjxbdyjaafaibdfhe', 'caabbdahhgafzbbjrs', 'caabbbbafllbbbbdfv',
      'ciaabbbbafbbbbddge', 'cqkjaddbbbbddddiie', 'caaaiaaabbddlaajrA', 'caffaghBhddifajkiu', 'qeenCeemnmmDmeeeee', 'feeEFsepmpneeeeset' ] },
    bug: { pal: { a: '#ffffff', b: '#7d7d05', c: '#a0a028', d: '#3f3f3f', e: '#575700', f: '#7b7b03', g: '#7a7a02', h: '#808008', i: '#787800', j: '#7e7e06', k: '#525200', l: '#86860e', m: '#777700', n: '#545400', o: '#83830b', p: '#555500', q: '#747400', r: '#5a5a00', s: '#515100', t: '#5c5c00', u: '#4c4c00', v: '#84840c', w: '#727200', x: '#595900', y: '#6e6e00', z: '#4e4e00', A: '#484800', B: '#5d5d00', C: '#636300' }, rows: [
      'cccccccccccccccccb', 'cbbbbbbfihibbjliws', 'cfmbbbghbbbbjbbbip', 'cbjifbhaaaagihlgqn', 'cbjhmbaaaaaabfmgft', 'cfbbbaaaaaaaabgfge',
      'cfibaodaaaaddamgbe', 'cifaaabbddddaaagbe', 'cbbaaaaabbaaaaadqu', 'cfjaaaaadbaaaaadie', 'cbbaaaaddfbaaaadvr', 'cbbaaaadaaqaaaadgu',
      'chbbaaadbddaaaddfe', 'coljaadaaaabaadhhe', 'cbbbhadbddddaddjvx', 'cbggbfdyibohgdjlht', 'oeenzeeknkkAkeeeee', 'geeBCrepkpneeeeres' ] },
    rock: { pal: { a: '#ffffff', b: '#87825e', c: '#aaa581', d: '#3f3f3f', e: '#615c38', f: '#85805c', g: '#847f5b', h: '#827d59', i: '#8a8561', j: '#88835f', k: '#5c5733', l: '#908b67', m: '#817c58', n: '#5e5935', o: '#5f5a36', p: '#7e7955', q: '#645f3b', r: '#5b5632', s: '#66613d', t: '#56512d', u: '#8e8965', v: '#8d8864', w: '#7c7753', x: '#78734f', y: '#635e3a', z: '#58532f', A: '#524d29', B: '#67623e', C: '#6d6844' }, rows: [
      'cccccccccccccccccb', 'cbbbbbbfhihbbjlhwr', 'cfmbbbgibbbbjbbbho', 'cbjhfbaaaaaahilgpn', 'cbjimaaaaaadafmgfs', 'cfbbaaaaaaaabagfge',
      'cfhaaaaaaaaaafagbe', 'chfaaaaaaaaaaaadbe', 'cbbaaaaaaaaaaaadpt', 'cfjaaaaaaaaaaaadhe', 'cbbadaaaaaaaadaduq', 'cbbadjaaaaaaddadgt',
      'cibbamiaaaaddaxdfe', 'cvljbagbaaddajdiie', 'cbbbibaaaaaapdbjuy', 'cbggbfhddddddbjlis', 'veenzeeknkkAkeeeee', 'geeBCqeokoneeeeqer' ] },
    ghost: { pal: { a: '#4c224d', b: '#ffffff', c: '#6f4570', d: '#260027', e: '#491f4a', f: '#3f3f3f', g: '#4a204b', h: '#4f2550', i: '#471d48', j: '#4d234e', k: '#461c47', l: '#431944', m: '#210022', n: '#552b56', o: '#230024', p: '#240025', q: '#29002a', r: '#522853', s: '#200021', t: '#2b012c', u: '#1b001c', v: '#532954', w: '#3d133e', x: '#411742', y: '#441a45', z: '#582e59', A: '#280029', B: '#1d001e', C: '#170018', D: '#2c022d', E: '#320833' }, rows: [
      'ccccccccccccccccca', 'caaaaaagihiaajnixs', 'cgkaaaehaaaajaaaip', 'cajigahaaaaeihnelo', 'cajhkahbbbbaagkegt', 'cgaaaabbbbbbaaeged',
      'cgiahbbfbbfbbgkead', 'cigelbbfbbfbbfyead', 'caaagbbbbbbbbfaalu', 'cgjbbbbbbbbbbbbeid', 'caaabbbbbbbbbbffvq', 'caaahfbbbbbbfffaeu',
      'chaaekhbbbbffkwlgd', 'crnjaaeabbffgjzhhd', 'caaahaaaaffelaajvA', 'caeeagiwiarheajnht', 'rddoBddmommCmddddd', 'eddDEqdpmpoddddqds' ] },
    dragon: { pal: { a: '#ffffff', b: '#344c9a', c: '#576fbd', d: '#3f3f3f', e: '#0e2674', f: '#324a98', g: '#314997', h: '#374f9d', i: '#2f4795', j: '#354d9b', k: '#09216f', l: '#3d55a3', m: '#2e4694', n: '#2b4391', o: '#0b2371', p: '#3a52a0', q: '#0c2472', r: '#112977', s: '#08206e', t: '#132b79', u: '#031b69', v: '#3b53a1', w: '#fcfdff', x: '#29418f', y: '#2c4492', z: '#fbfdff', A: '#102876', B: '#253d8b', C: '#051d6b', D: '#001765', E: '#142c7a', F: '#1a3280' }, rows: [
      'cccccccccccccccccb', 'cbbbbbbfihibbjlixs', 'cfmbbbghbbbbjbbbiq', 'cbjifbhabbagihlgno', 'cbjhmbhadyadbfmgft', 'cfbbbbhadfadbbgfge',
      'cfibhppaaaadffmgbe', 'cifanfaaaaaagbagbe', 'cbbadaaaaaazabadnu', 'cfjadadaaaadadadie', 'cbbadadiaaddadadvr', 'cbbwajaaaaaagawdgu',
      'chbbadhaaaaddaddfe', 'cpljbdgaaaadfjdhhe', 'cbbbhbbbaaddnbbjvA', 'cbggbfiBiddhgbjlht', 'peeoCeekokkDkeeeee', 'geeEFreqkqoeeeeres' ] },
    dark: { pal: { a: '#2c2424', b: '#ffffff', c: '#4f4747', d: '#060000', e: '#3f3f3f', f: '#292121', g: '#2a2222', h: '#2f2727', i: '#271f1f', j: '#2d2525', k: '#000000', l: '#352d2d', m: '#261e1e', n: '#010000', o: '#231b1b', p: '#030000', q: '#322a2a', r: '#040000', s: '#090101', t: '#0b0303', u: '#332b2b', v: '#1d1515', w: '#211919', x: '#241c1c', y: '#383030', z: '#080000', A: '#0c0404', B: '#120a0a' }, rows: [
      'ccccccccccccccccca', 'caaaaaagihiaajliwk', 'cgmaaafhaaaajaaair', 'cajigahaaaafihlfop', 'cajhmahafxgaagmfgt', 'cgaabahamgaaabfgfd',
      'cgibbbbjjlabbbbfad', 'cigbbbbebbqbbbbead', 'caabbbbebbebbbbeok', 'cgjbbbbebbebbbbeid', 'caaabbbebbebbbeeus', 'caaahbbbfebbbeeafk',
      'chaafmbbbbbbeevogd', 'cqljaafeeeeeejyhhd', 'caaahaaaagafoaajuz', 'caffagiviaqhfajlht', 'qddpkddnpnnknddddd', 'fddABsdrnrpddddsdk' ] },
    steel: { pal: { a: '#ffffff', b: '#488aa6', c: '#6badc9', d: '#3f3f3f', e: '#226480', f: '#4587a3', g: '#4688a4', h: '#4b8da9', i: '#498ba7', j: '#4385a1', k: '#3f819d', l: '#1d5f7b', m: '#5193af', n: '#4284a0', o: '#1f617d', p: '#20627e', q: '#256783', r: '#4e90ac', s: '#1c5e7a', t: '#276985', u: '#175975', v: '#4f91ad', w: '#397b97', x: '#3d7f9b', y: '#5496b2', z: '#246682', A: '#195b77', B: '#135571', C: '#286a86', D: '#2e708c' }, rows: [
      'cccccccccccccccccb', 'cbbbbbbgjhjbbimjxs', 'cgnbbbfhbbbbibbbjp', 'cbijgaaaaaaaahmfko', 'cbihnadaaaadddnfgt', 'cgbbaaaaddddabfgfe',
      'cgjbaaaadaaaaanfbe', 'cjgfaaaadiadaadfbe', 'cbbaaaaaabaaaadbku', 'cgiaaaddddaaaaafje', 'cbbbddaaagbaaaadvq', 'cbbbaaaaadkaadddfu',
      'chbbfaaaaagaddwkge', 'crmibbaaaadbdiyhhe', 'cbbbhbbaaddfkbbivz', 'cbffbgjwddrhfbimht', 'reeoAeelollBleeeee', 'feeCDqeplpoeeeeqes' ] },
    fairy: { pal: { a: '#ffffff', b: '#bf6abf', c: '#e28de2', d: '#3f3f3f', e: '#994499', f: '#bc67bc', g: '#bd68bd', h: '#c26dc2', i: '#c06bc0', j: '#ba65ba', k: '#943f94', l: '#b661b6', m: '#964196', n: '#c570c5', o: '#c873c8', p: '#974297', q: '#9c479c', r: '#933e93', s: '#b964b9', t: '#9e499e', u: '#8e398e', v: '#cb76cb', w: '#c671c6', x: '#b05bb0', y: '#b45fb4', z: '#b762b7', A: '#9b469b', B: '#903b90', C: '#8a358a', D: '#9f4a9f', E: '#a550a5' }, rows: [
      'cccccccccccccccccb', 'cbbbbbbgjhjbbiojyr', 'cgsbbbfhbbbbibbbjp', 'cbiaaahbbbbfaaaflm', 'cbiaaaaafzaaaaadgt', 'cgbaaaaaaaaaaaadfe',
      'cgjbaaaaaaaaaaddbe', 'cjgfaaaaddaaaadfbe', 'cbbbgaaddbbaaddblu', 'cgivhnaaaaaaddffje', 'cbbbbaaaaaaaabbiwq', 'cbbbhaaaaaaaadbbfu',
      'chbbfsadaadaddxlge', 'cnoibbfabdabdivhhe', 'cbbbhbbadgadlbbiwA', 'cbffbgjxdbndfbioht', 'neemBeekmkkCkeeeee', 'feeDEqepkpmeeeeqer' ] },
  };

  // ---------------- render ----------------

  const cache = new Map();      // clave -> canvas a 1×
  const urls = new Map();

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => Math.max(0, Math.min(255, Math.round(c * k)));
    return '#' + [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function fromRows(def) {
    const h = def.rows.length, w = Math.max(...def.rows.map(r => r.length));
    const pad = def.outline ? 1 : 0;
    const cv = document.createElement('canvas');
    cv.width = w + pad * 2; cv.height = h + pad * 2;
    const c = cv.getContext('2d', { willReadFrequently: true });   // se lee en svgOf()
    const pal = Object.assign({ k: K }, def.pal);
    if (def.outline) {
      c.fillStyle = K;
      def.rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.' || ch === ' ') return;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.fillRect(x + pad + dx, y + pad + dy, 1, 1);
      }));
    }
    def.rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ' || !pal[ch]) return;
      c.fillStyle = pal[ch];
      c.fillRect(x + pad, y + pad, 1, 1);
    }));
    return cv;
  }

  /** Emblem of a type with an optional move family badge: Jess's 18x18 icon (TYPE_ICON), or the old code-drawn 16x16 disc. */
  function emblem(type, kind) {
    if (TYPE_ICON[type]) {
      // Jess's type icon (18x18) with the move family badge (7x7) in the bottom right corner.
      const cv = fromRows(TYPE_ICON[type]);
      if (kind && KIND_GLYPH[kind]) {
        const c = cv.getContext('2d', { willReadFrequently: true });
        c.fillStyle = K; c.fillRect(11, 11, 7, 7);
        c.fillStyle = '#2b3454'; c.fillRect(12, 12, 5, 5);
        c.fillStyle = '#ffd23f';
        KIND_GLYPH[kind].forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') c.fillRect(x + 12, y + 12, 1, 1); }));
      }
      return cv;
    }
    const S = 16;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d', { willReadFrequently: true });   // se lee en svgOf()
    const col = G.U.TYPE_COLOR[type] || '#b0a99f';
    const dark = shade(col, 0.55), lite = shade(col, 1.3);
    // A disc with an outline, shadow bottom-right and highlight top-left.
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d > 7.6) continue;
      let f = col;
      if (d > 6.6) f = K;
      else if ((x - 7.5) + (y - 7.5) > 6) f = dark;
      else if ((x - 7.5) + (y - 7.5) < -6.5) f = lite;
      c.fillStyle = f; c.fillRect(x, y, 1, 1);
    }
    const g = TYPE_GLYPH[type] || TYPE_GLYPH.normal;
    // Glyph shadow and glyph.
    c.fillStyle = dark;
    g.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') c.fillRect(x + 5, y + 5, 1, 1); }));
    c.fillStyle = '#ffffff';
    g.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') c.fillRect(x + 4, y + 4, 1, 1); }));

    if (kind && KIND_GLYPH[kind]) {
      c.fillStyle = K; c.fillRect(9, 9, 7, 7);
      c.fillStyle = '#2b3454'; c.fillRect(10, 10, 5, 5);
      c.fillStyle = '#ffd23f';
      KIND_GLYPH[kind].forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') c.fillRect(x + 10, y + 10, 1, 1); }));
    }
    return cv;
  }

  // The ticket pickups in the world are drawn as Pokesprite balls: 'ticket' (x1) is a Great Ball, 'ticket10' (x10) a Master Ball.
  // The menus do not use these names: they draw 'ball' (Poke Ball) and 'ball4' (the purple Master Ball) from assets/icons/pokeball.
  // To go back to the pixel-art tickets in the world, empty this table (their definitions are still in UI above).
  const ALIAS = { ticket: 'ps:ball.great', ticket10: 'ps:ball.master' };

  function canvas(name) {
    name = ALIAS[name] || name;
    let cv = cache.get(name);
    if (cv) return cv;
    if (name.startsWith('move:')) {
      const m = G.Moves.BY_ID[name.slice(5)];
      cv = emblem(m ? m.type : 'normal', m ? m.kind : null);
    } else if (name.startsWith('type:')) {
      cv = emblem(name.slice(5));
    } else if (name.startsWith('ps:')) {
      cv = psCanvas(name.slice(3));
    } else {
      cv = fromRows(UI[name] || UI.star);
    }
    cache.set(name, cv);
    return cv;
  }

  // 'ps:<category>.<name>': a 32x32 cell of the Pokesprite sheet (assets/items/pokesprite-inventory.png, positions in data/pokesprite-index.js).
  // The canvas is created at once and filled when the sheet has loaded, so a draw before that shows nothing for a moment.
  const PS_URL = 'assets/items/pokesprite-inventory.png', PS_CELL = 32, PS_W = 2174, PS_H = 576;
  let psImg = null;
  const psWait = [];
  function psPaint(cv, pos) {
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, PS_CELL, PS_CELL);
    c.drawImage(psImg, pos[0], pos[1], PS_CELL, PS_CELL, 0, 0, PS_CELL, PS_CELL);
  }
  function psCanvas(key) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = PS_CELL;
    const pos = G.PokeSprite && G.PokeSprite[key];
    if (!pos) return cv;
    if (!psImg) {
      psImg = new Image();
      psImg.onload = () => { for (const w of psWait.splice(0)) psPaint(w[0], w[1]); };
      psImg.src = PS_URL;
    }
    if (psImg.complete && psImg.naturalWidth) psPaint(cv, pos); else psWait.push([cv, pos]);
    return cv;
  }

  function url(name) {
    let u = urls.get(name);
    if (!u) {
      // The interface ones, directly from their drawing; the emblems (types, moves), from the canvas.
      const plain = !name.startsWith('move:') && !name.startsWith('type:');
      u = plain ? svgOfRows(UI[name] || UI.star) : svgOf(canvas(name));
      urls.set(name, u);
    }
    return u;
  }

  /**
   * The icon as a text SVG (one rectangle per run of equal pixels).
   * toDataURL() did the same in PNG, but the first time the browser takes
   * ~175 ms to prepare it and that blocked the page load (Lighthouse).
   */
  function svgDoc(W, H, rects) {
    return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${rects}</svg>`);
  }

  /** Same as fromRows() but without canvas (or pixel reading). */
  function svgOfRows(def) {
    const h = def.rows.length, w = Math.max(...def.rows.map(r => r.length));
    const pad = def.outline ? 1 : 0;
    const pal = Object.assign({ k: K }, def.pal);
    const px = new Map();
    if (def.outline) def.rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px.set((x + pad + dx) + ',' + (y + pad + dy), K);
    }));
    def.rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ' || !pal[ch]) return;
      px.set((x + pad) + ',' + (y + pad), pal[ch]);
    }));
    let out = '';
    for (const [k, c] of px) { const [x, y] = k.split(','); out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; }
    return svgDoc(w + pad * 2, h + pad * 2, out);
  }

  function svgOf(cv) {
    const W = cv.width, H = cv.height;
    const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
    let out = '';
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W;) {
        const i = (y * W + x) * 4, a = d[i + 3];
        if (!a) { x++; continue; }
        let n = 1;
        while (x + n < W && d[i + n * 4] === d[i] && d[i + n * 4 + 1] === d[i + 1] && d[i + n * 4 + 2] === d[i + 2] && d[i + n * 4 + 3] === a) n++;
        const hex = '#' + ((1 << 24) | (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).slice(1);
        out += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${hex}"${a < 255 ? ` fill-opacity="${(a / 255).toFixed(3)}"` : ''}/>`;
        x += n;
      }
    }
    return svgDoc(W, H, out);
  }

  /**
   * Adjusts the size to an integer multiple of the icon's resolution: a
   * 16 px icon painted at 24 would double some pixels and not others.
   */
  function snap(name, size) {
    name = ALIAS[name] || name;
    if (name.startsWith('ps:')) return size;           // Pokesprite cells scale freely (smoothed when drawn)
    const w = canvas(name).width;
    return w * Math.max(1, Math.round(size / w));
  }

  /** Pixelated <img> for the DOM. */
  function html(name, size = 20, cls = '') {
    name = ALIAS[name] || name;
    if (name.startsWith('ps:')) {
      const pos = G.PokeSprite && G.PokeSprite[name.slice(3)] || [0, 0], k = size / PS_CELL;
      return `<span class="pix ${cls}" style="display:inline-block;width:${size}px;height:${size}px;background:url(${PS_URL}) -${pos[0] * k}px -${pos[1] * k}px / ${PS_W * k}px ${PS_H * k}px no-repeat;image-rendering:pixelated"></span>`;
    }
    const cv = canvas(name), w = snap(name, size), h = w * cv.height / cv.width;
    return `<img class="pix ${cls}" src="${url(name)}" width="${w}" height="${h}" alt="" draggable="false">`;
  }

  function draw(ctx, name, x, y, size) {
    name = ALIAS[name] || name;
    const cv = canvas(name);
    const s2 = snap(name, size);
    x += (size - s2) / 2; y += (size - s2) / 2; size = s2;
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = name.startsWith('ps:') && size !== PS_CELL;
    ctx.drawImage(cv, Math.round(x), Math.round(y), size, size * cv.height / cv.width);
    ctx.imageSmoothingEnabled = prev;
  }

  /**
   * Shiny sparkle, drawn pixel by pixel (not an icon): a cross that
   * is born, grows, sprouts diagonal points and fades, as in the games.
   * phase 0..1 · px = pixel size on screen.
   */
  function twinkle(ctx, x, y, phase, px = 2) {
    const st = phase < 0.15 ? 0 : phase < 0.32 ? 1 : phase < 0.62 ? 2 : phase < 0.82 ? 1 : 0;
    const X = Math.round(x / px) * px, Y = Math.round(y / px) * px;
    const dot = (dx, dy, c) => { ctx.fillStyle = c; ctx.fillRect(X + dx * px, Y + dy * px, px, px); };
    const ARM = '#fff3a8', TIP = '#9ae6ff';
    dot(0, 0, '#ffffff');
    if (st >= 1) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) dot(dx, dy, ARM);
    if (st >= 2) {
      for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) dot(dx, dy, ARM);
      for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) dot(dx, dy, TIP);
      for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) dot(dx, dy, TIP);
    }
  }

  /**
   * Rarity as a Poke Ball (the art in assets/icons/pokeball/<rarity>.png, embedded above):
   * Common, Uncommon (Premier), Rare, Epic and Legendary.
   */
  const RARITY_BALL = { 1: 'ball', 2: 'ball2', 3: 'ball3', 4: 'ballLux', 5: 'ball4' };
  function rarity(n, size = 12) {
    return `<span class="rarity-ball" title="${(G.Gacha && G.Gacha.RARITY_NAME[n]) || ''}">${html(RARITY_BALL[n] || 'ball', size)}</span>`;
  }

  /**
   * Base Stat Total as a 7-star rating: each star is 100 BST and a half star is 50,
   * rounded to the NEAREST 50. Unfilled stars are shown dim so Pokemon compare at a glance.
   * (BST tops out at 720, Arceus, which is exactly 7 stars.)
   */
  function bstStars(bst, size = 12) {
    const halves = Math.max(0, Math.min(14, Math.round(bst / 50)));
    let out = '';
    for (let i = 0; i < 7; i++) {
      const name = halves >= (i + 1) * 2 ? 'star' : halves === i * 2 + 1 ? 'starHalf' : 'starDim';
      out += html(name, size);
    }
    return `<span class="bst-stars" title="BST ${bst} · ${halves / 2} / 7 stars">${out}</span>`;
  }

  /** Publishes to CSS the icons used by the stylesheets. */
  function installCss() {
    const r = document.documentElement.style;
    r.setProperty('--ico-coin', `url("${url('coin')}")`);
    r.setProperty('--ico-cursor', `url("${url('cursor')}")`);
  }

  return { canvas, url, html, draw, twinkle, rarity, bstStars, RARITY_BALL, installCss, UI, TYPE_GLYPH };
})();
