/* ============ changelog.js — novedades del juego ============
 * What people see in the "News" button of the top bar: changes
 * game changes and fixed bugs (nothing about servers or databases).
 * The newest date, on top. In each date, by sections:
 *   new  what is new · chg  changes and tweaks · fix  fixed bugs
 * Each line in Spanish and English.
 */
G.CHANGELOG = [
  { d: '2026-10-19', title: ['A gentler opening', 'A gentler opening'], chg: [
    ['Enemies are weaker at the start of a run and ramp up to full strength over the first 3 minutes, so the opening is less of a grind.',
     'Enemies are weaker at the start of a run and ramp up to full strength over the first 3 minutes, so the opening is less of a grind.'],
    ['More melee and fewer ranged enemies now show up, so fewer shooters pile up out of your reach.',
     'More melee and fewer ranged enemies now show up, so fewer shooters pile up out of your reach.'],
  ] },
  { d: '2026-10-18', title: ['A faster start', 'A faster start'], new: [
    ['Every run now starts with a 3 Min XP boost: wild enemies give double XP until the first boss shows up, so your first level-ups come sooner.',
     'Every run now starts with a 3 Min XP boost: wild enemies give double XP until the first boss shows up, so your first level-ups come sooner.'],
  ], chg: [
    ['Elite enemies no longer appear until the first boss has shown up. Your moves also hit about twice as hard.',
     'Elite enemies no longer appear until the first boss has shown up. Your moves also hit about twice as hard.'],
  ] },
  { d: '2026-10-18', title: ['Ailment Chance cards', 'Ailment Chance cards'], new: [
    ['New level-up card: Ailment Chance. It adds 10 points to the burn or poison chance of one move (Ember goes from 10% to 20%, up to 100%). Burn and poison now also get stronger with your damage cards (Increased Effect and the Fire, Poison and kind damage cards), and the team summary shows each burn or poison move with its chance and how much of the max HP of the enemy it takes.',
     'New level-up card: Ailment Chance. It adds 10 points to the burn or poison chance of one move (Ember goes from 10% to 20%, up to 100%). Burn and poison now also get stronger with your damage cards (Increased Effect and the Fire, Poison and kind damage cards), and the team summary shows each burn or poison move with its chance and how much of the max HP of the enemy it takes.'],
  ] },
  { d: '2026-10-18', title: ['Burn and poison reworked', 'Burn and poison reworked'], chg: [
    ['Burn and poison now work like the main games. They only land with the real chance of the move (Ember burns 10% of the time, Sludge and Poison Sting poison 30%), they take a fraction of the max HP of the enemy each turn (burn 1/16, poison 1/8), and they no longer stack. Toxic builds up more damage every turn. Fire types cannot be burned, and Poison and Steel types cannot be poisoned.',
     'Burn and poison now work like the main games. They only land with the real chance of the move (Ember burns 10% of the time, Sludge and Poison Sting poison 30%), they take a fraction of the max HP of the enemy each turn (burn 1/16, poison 1/8), and they no longer stack. Toxic builds up more damage every turn. Fire types cannot be burned, and Poison and Steel types cannot be poisoned.'],
  ] },
  { d: '2026-10-18', title: ['Choose upgrades on the team summary', 'Choose upgrades on the team summary'], new: [
    ['Picking a move upgrade or a stat card now opens the team summary in Apply mode: choose the Pokémon in the strip and the move in the block, see the change before and after (including how hard one hit lands and a dashed outline on the hexagon for stat cards), then Confirm, double-click a move or press Enter. Back (Backspace) returns to the same cards without spending a reroll. The level-up screen is now in English.',
     'Picking a move upgrade or a stat card now opens the team summary in Apply mode: choose the Pokémon in the strip and the move in the block, see the change before and after (including how hard one hit lands and a dashed outline on the hexagon for stat cards), then Confirm, double-click a move or press Enter. Back (Backspace) returns to the same cards without spending a reroll. The level-up screen is now in English.']
  ] },
  { d: '2026-10-18', title: ['Team summary screen', 'Team summary screen'], new: [
    ['The pause screen is now a team summary. Pick any Pokémon in the strip to see its moves with their upgrades and current numbers (including how hard one hit lands), its stat hexagon with the bonuses from stat cards in yellow, and its held item. The end-of-run screen has a Team summary button that shows the same sheet for your whole team. Pause, results and the Continue / Settings / Quit buttons are now in English.',
     'The pause screen is now a team summary. Pick any Pokémon in the strip to see its moves with their upgrades and current numbers (including how hard one hit lands), its stat hexagon with the bonuses from stat cards in yellow, and its held item. The end-of-run screen has a Team summary button that shows the same sheet for your whole team. Pause, results and the Continue / Settings / Quit buttons are now in English.']
  ] },
  { d: '2026-10-18', title: ['Stat cards and type damage cards', 'Stat cards and type damage cards'], new: [
    ['Two new kinds of level-up card. Stat cards (HP Up, Protein, Iron, Calcium, Zinc, Carbos) give one Pokémon +5% to a stat; you choose the Pokémon. Damage cards for a type or a kind (+15% Fire Damage, +15% Projectile Damage) go on one move and stack with Increased Effect. Protein only helps physical moves and Calcium only special ones. The run summary lists the stat cards each Pokémon took.',
     'Two new kinds of level-up card. Stat cards (HP Up, Protein, Iron, Calcium, Zinc, Carbos) give one Pokémon +5% to a stat; you choose the Pokémon. Damage cards for a type or a kind (+15% Fire Damage, +15% Projectile Damage) go on one move and stack with Increased Effect. Protein only helps physical moves and Calcium only special ones. The run summary lists the stat cards each Pokémon took.']
  ] },
  { d: '2026-10-18', title: ['Upgrades you aim at a move', 'Upgrades you aim at a move'], new: [
    ['Level-up cards are now upgrades you aim: pick a card (+1 Projectile, +15% Recharge Speed, +15% Area and more), then a Pokémon, then one of its moves. Moves no longer have levels. Pokémon or moves that cannot take a card are dimmed, and a single choice is picked for you after a short flash. Moves show how many upgrades they have as +N.',
     'Level-up cards are now upgrades you aim: pick a card (+1 Projectile, +15% Recharge Speed, +15% Area and more), then a Pokémon, then one of its moves. Moves no longer have levels. Pokémon or moves that cannot take a card are dimmed, and a single choice is picked for you after a short flash. Moves show how many upgrades they have as +N.']
  ] },
  { d: '2026-10-18', title: ['Move evolutions and stat cards removed', 'Move evolutions and stat cards removed'], chg: [
    ['Move evolutions and the old stat cards (Power, Sprint, Armor, Vigor and the rest) are gone while the upgrade system is rebuilt. Level-ups now offer new moves and move upgrades only. The evolution achievements and missions were removed.',
     'Move evolutions and the old stat cards (Power, Sprint, Armor, Vigor and the rest) are gone while the upgrade system is rebuilt. Level-ups now offer new moves and move upgrades only. The evolution achievements and missions were removed.']
  ] },
  { d: '2026-10-18', title: ['Independent move cooldowns', 'Independent move cooldowns'], chg: [
    ['Every move you carry now recharges on its own, even while you use another one, and a ready move fires the moment you switch to it. After switching you must wait a moment before switching again.',
     'Every move you carry now recharges on its own, even while you use another one, and a ready move fires the moment you switch to it. After switching you must wait a moment before switching again.']
  ] },
  { d: '2026-10-18', title: ['Move cooldowns follow PP', 'Move cooldowns follow PP'], chg: [
    ['Attack cooldowns now come from each move\'s PP, like the main games: strong low-PP moves (Hydro Pump, Giga Drain, Bug Buzz) fire much slower, high-PP basics stay quick. Orbiting orbs and trails split their damage across their hits.',
     'Attack cooldowns now come from each move\'s PP, like the main games: strong low-PP moves (Hydro Pump, Giga Drain, Bug Buzz) fire much slower, high-PP basics stay quick. Orbiting orbs and trails split their damage across their hits.']
  ] },
  { d: '2026-10-18', title: ['Move balance pass', 'Move balance pass'], chg: [
    ['Sprays and boomerangs now split one attack\'s damage across their pellets or passes (Flamethrower, Bubble Beam, Razor Leaf, Psycho Cut), and moves that can miss in the games (Hydro Pump, Heat Wave, Leaf Storm and others) now hit a bit softer.',
     'Sprays and boomerangs now split one attack\'s damage across their pellets or passes (Flamethrower, Bubble Beam, Razor Leaf, Psycho Cut), and moves that can miss in the games (Hydro Pump, Heat Wave, Leaf Storm and others) now hit a bit softer.']
  ] },
  { d: '2026-10-18', title: ['Fairer enemy defense', 'Fairer enemy defense'], fix: [
    ['Enemy defense now scales with the enemy\'s own level instead of yours, so early hits are a little weaker and damage is no longer rounded up on small hits.',
     'Enemy defense now scales with the enemy\'s own level instead of yours, so early hits are a little weaker and damage is no longer rounded up on small hits.']
  ] },
  { d: '2026-10-18', title: ['Mainline XP and leveling', 'Mainline XP and leveling'], chg: [
    ['Leveling now follows the main games: each level costs more than the last (the classic Medium Fast curve), and every kill pays XP based on the enemy species and level compared with yours. Strong species are worth more, and kills are worth less as you outlevel the wave. Boss XP is unchanged. XP orbs now show as big when they are worth a good share of your next level, and breaking a rock gives 1% of your next level.',
     'Leveling now follows the main games: each level costs more than the last (the classic Medium Fast curve), and every kill pays XP based on the enemy species and level compared with yours. Strong species are worth more, and kills are worth less as you outlevel the wave. Boss XP is unchanged. XP orbs now show as big when they are worth a good share of your next level, and breaking a rock gives 1% of your next level.']
  ] },
  { d: '2026-10-18', title: ['More even enemy mix', 'More even enemy mix'], chg: [
    ['Each stage now spawns a steady share of melee, ranged and support enemies, so a shooter-heavy roll no longer fills the screen with shooters.',
     'Each stage now spawns a steady share of melee, ranged and support enemies, so a shooter-heavy roll no longer fills the screen with shooters.']
  ] },
  { d: '2026-10-18', title: ['Flankers, crowd-seeking support, tighter melee', 'Flankers, crowd-seeking support, tighter melee'], chg: [
    ['Runners are now Flankers: a couple of the fastest plain and shooter enemies circle round to the emptiest side of you, strike once, then run to the screen edge and come back from a new side. Shielders and healers now stand with the biggest group of their allies and fight back weakly. Melee enemies stop just short of overlapping you, and plain shooters\' shots now travel twice as far.',
     'Runners are now Flankers: a couple of the fastest plain and shooter enemies circle round to the emptiest side of you, strike once, then run to the screen edge and come back from a new side. Shielders and healers now stand with the biggest group of their allies and fight back weakly. Melee enemies stop just short of overlapping you, and plain shooters\' shots now travel twice as far.']
  ] },
  { d: '2026-10-18', title: ['Enemies keep their distance by role', 'Enemies keep their distance by role'], chg: [
    ['Ranged and support enemies now stand at a distance that matches their role instead of one shared range: fans stay close, beamers a step back, healers, summoners and zoners further out, shooters at the edge of the screen. Shielders no longer walk into you. Units back away at 80% speed so you can still chase them down, and they no longer freeze in place or jam against walls.',
     'Ranged and support enemies now stand at a distance that matches their role instead of one shared range: fans stay close, beamers a step back, healers, summoners and zoners further out, shooters at the edge of the screen. Shielders no longer walk into you. Units back away at 80% speed so you can still chase them down, and they no longer freeze in place or jam against walls.']
  ] },
  { d: '2026-10-18', title: ['Enemy roles rebuilt', 'Enemy roles rebuilt'], chg: [
    ['Every enemy species now has a fixed role chosen from its real stats and moves: melee fighters, ranged attackers or support units. Each stage now draws 9 species instead of 7, always with a mix of melee, ranged and support. Runners and bombers no longer get a speed bonus, and Tank is now a trait any enemy can have (tougher and worth more XP).',
     'Every enemy species now has a fixed role chosen from its real stats and moves: melee fighters, ranged attackers or support units. Each stage now draws 9 species instead of 7, always with a mix of melee, ranged and support. Runners and bombers no longer get a speed bonus, and Tank is now a trait any enemy can have (tougher and worth more XP).']
  ], new: [
    ['Chargers now show a red warning line on the ground before they dash, so you can sidestep it.',
     'Chargers now show a red warning line on the ground before they dash, so you can sidestep it.']
  ] },
  { d: '2026-10-17', title: ['Random region option', 'Random region option'], new: [
    ['Added a Random option to the region select: it rolls a region for you, and the end-of-run screen tells you which one you got.',
     'Added a Random option to the region select: it rolls a region for you, and the end-of-run screen tells you which one you got.']
  ] },
  { d: '2026-10-17', title: ['Pick your region before a run', 'Pick your region before a run'], new: [
    ['When you start a solo run you now choose a region first. Only Pokemon from that region and the regions before it will show up as enemies and bosses, so you can run a pure Kanto game, a Johto-and-earlier game, and so on, up to Paldea for the full roster.',
     'When you start a solo run you now choose a region first. Only Pokemon from that region and the regions before it will show up as enemies and bosses, so you can run a pure Kanto game, a Johto-and-earlier game, and so on, up to Paldea for the full roster.']
  ] },
  { d: '2026-10-17', title: ['Enemy attacks use real stats', 'Enemy attacks use real stats'], chg: [
    ['Enemy damage to you now runs through the same stat-based formula your own attacks use: an enemy hits with its real Attack or Special Attack (whichever is higher for that species), and your Defense or Special Defense now actually reduces it, so a bulky Pokemon survives noticeably longer than a frail one. The opening is gentler and the threat grows as the horde thickens rather than from any single hit. Bosses are unchanged for now.',
     'Enemy damage to you now runs through the same stat-based formula your own attacks use: an enemy hits with its real Attack or Special Attack (whichever is higher for that species), and your Defense or Special Defense now actually reduces it, so a bulky Pokemon survives noticeably longer than a frail one. The opening is gentler and the threat grows as the horde thickens rather than from any single hit. Bosses are unchanged for now.']
  ] },
  { d: '2026-10-17', title: ['Moves rebuilt on canonical data', 'Moves rebuilt on canonical data'], chg: [
    ['Every move now uses its real mainline base power, English name, and an English effect description. This rebalances attacks toward the official games: utility moves hit a bit softer and signature attacks (Flamethrower, Psychic, Bug Buzz and the like) hit much harder, so move choice matters more. Overall damage was re-centered so early fights still take a few hits. Status effects play the same as before for now.',
     'Every move now uses its real mainline base power, English name, and an English effect description. This rebalances attacks toward the official games: utility moves hit a bit softer and signature attacks (Flamethrower, Psychic, Bug Buzz and the like) hit much harder, so move choice matters more. Overall damage was re-centered so early fights still take a few hits. Status effects play the same as before for now.']
  ] },
  { d: '2026-10-17', title: ['Pokedex search and filters', 'Pokedex search and filters'], new: [
    ['The Pokedex now has a search bar (by name or number), plus Region, Ownership and Sort-by dropdowns and multi-select Type, Rarity and BST filters, so you can find and compare Pokemon across every region at once instead of flipping through one region at a time. Sorting by a stat sinks Pokemon you do not own to the bottom.',
     'The Pokedex now has a search bar (by name or number), plus Region, Ownership and Sort-by dropdowns and multi-select Type, Rarity and BST filters, so you can find and compare Pokemon across every region at once instead of flipping through one region at a time. Sorting by a stat sinks Pokemon you do not own to the bottom.']
  ] },
  { d: '2026-10-17', title: ['Move damage rebuilt on the real stat formula', 'Move damage rebuilt on the real stat formula'], chg: [
    ['Your attacks now use the mainline damage formula: a move\'s damage scales with your Attack or Special Attack (depending on the move) against each enemy\'s matching Defense or Special Defense, and grows as you level up during a run. Same-type moves get a damage bonus (STAB). Early hits feel modest on purpose, your upgrades and criticals are what turn the ramp into a power fantasy.',
     'Your attacks now use the mainline damage formula: a move\'s damage scales with your Attack or Special Attack (depending on the move) against each enemy\'s matching Defense or Special Defense, and grows as you level up during a run. Same-type moves get a damage bonus (STAB). Early hits feel modest on purpose, your upgrades and criticals are what turn the ramp into a power fantasy.']
  ] },
  { d: '2026-10-17', title: ['Enemy speed from base Speed', 'Enemy speed from base Speed'], chg: [
    ['Enemy movement speed now comes from each Pokemon\'s real base Speed stat, the same way your own does, so fast Pokemon are genuinely fast and slow ones slow. Enemies no longer simply speed up as the run goes on.',
     'Enemy movement speed now comes from each Pokemon\'s real base Speed stat, the same way your own does, so fast Pokemon are genuinely fast and slow ones slow. Enemies no longer simply speed up as the run goes on.']
  ] },
  { d: '2026-10-17', title: ['Enemy level shown on the HUD', 'Enemy level shown on the HUD'], new: [
    ['The current enemy level now shows in the top-right corner during a run, next to the run timer, so you can see how the difficulty is scaling.',
     'The current enemy level now shows in the top-right corner during a run, next to the run timer, so you can see how the difficulty is scaling.']
  ] },
  { d: '2026-10-17', title: ['Enemy HP rebuilt on base stats', 'Enemy HP rebuilt on base stats'], chg: [
    ['Wild enemy HP now comes from each Pokemon\'s real base HP stat and scales with how far into the run you are, the same way your own HP works. This is an early pass: enemies are much less spongy than before while the rest of the combat stats are rebuilt, so expect them to feel easy for now.',
     'Wild enemy HP now comes from each Pokemon\'s real base HP stat and scales with how far into the run you are, the same way your own HP works. This is an early pass: enemies are much less spongy than before while the rest of the combat stats are rebuilt, so expect them to feel easy for now.']
  ] },
  { d: '2026-10-17', title: ['HP scales with your base stat and level', 'HP scales with your base stat and level'], chg: [
    ['Your Pokemon\'s HP now comes from its real base HP stat and grows as you level up during a run, instead of a fixed value. High-HP Pokemon are tankier and low-HP ones are frailer, and leveling up raises your max HP (and tops you up a little). Early runs are leaner on purpose while the rest of the combat stats are built out.',
     'Your Pokemon\'s HP now comes from its real base HP stat and grows as you level up during a run, instead of a fixed value. High-HP Pokemon are tankier and low-HP ones are frailer, and leveling up raises your max HP (and tops you up a little). Early runs are leaner on purpose while the rest of the combat stats are built out.']
  ] },
  { d: '2026-10-17', title: ['Movement reflects base Speed', 'Movement reflects base Speed'], chg: [
    ['Movement speed now comes from each Pokemon\'s real base Speed stat. Fast Pokemon are noticeably quicker and slow ones slower, instead of everyone moving at nearly the same pace. Your Pokemon\'s Speed is a fixed trait for the run; items, upgrades and buffs still change it.',
     'Movement speed now comes from each Pokemon\'s real base Speed stat. Fast Pokemon are noticeably quicker and slow ones slower, instead of everyone moving at nearly the same pace. Your Pokemon\'s Speed is a fixed trait for the run; items, upgrades and buffs still change it.']
  ] },
  { d: '2026-10-16', title: ['Teams, controls and balance', 'Teams, controls and balance'], new: [
    ['Rebindable keyboard controls: in Settings > Controls, click any control (move, attacks, cycle, pause) and press a new key. Your attack keys also pick level-up cards, and the on-screen key labels follow whatever you bind.',
     'Rebindable keyboard controls: in Settings > Controls, click any control (move, attacks, cycle, pause) and press a new key. Your attack keys also pick level-up cards, and the on-screen key labels follow whatever you bind.'],
    ['Developer sandbox (open the game with ?dev): press Shift+D to unlock every Pokemon and shiny, max coins and tickets, and max every upgrade. Debug runs never count toward the ranking.',
     'Developer sandbox (open the game with ?dev): press Shift+D to unlock every Pokemon and shiny, max coins and tickets, and max every upgrade. Debug runs never count toward the ranking.'],
    ['Teams: build a team of up to 6 Pokemon in fixed slots. On the main menu, click a roster card, choose a Pokemon in the Pokedex and press Commit to Roster. During a run, swap with Z / C (previous / next) or jump straight to a slot with H J K L ; and \' (all rebindable in Settings). Swapping is instant, brings a short invulnerability window, and has a 5 second lockout.',
     'Teams: build a team of up to 6 Pokemon in fixed slots. On the main menu, click a roster card, choose a Pokemon in the Pokedex and press Commit to Roster. During a run, swap with Z / C (previous / next) or jump straight to a slot with H J K L ; and \' (all rebindable in Settings). Swapping is instant, brings a short invulnerability window, and has a 5 second lockout.'],
    ['Buffs (Swords Dance, Agility, Harden, Aqua Ring) now belong to the whole team: they stay active after you swap, until their own timer runs out, so a teammate can be your buffer.',
     'Buffs (Swords Dance, Agility, Harden, Aqua Ring) now belong to the whole team: they stay active after you swap, until their own timer runs out, so a teammate can be your buffer.']
  ], chg: [
    ['When your active Pokemon faints, the living teammate with the lowest slot number takes its place. The run only ends when the whole team is down.',
     'When your active Pokemon faints, the living teammate with the lowest slot number takes its place. The run only ends when the whole team is down.'],
    ['New in-run layout: your Pokemon\'s name, health bar and level now sit in a strip at the bottom center, and the attack bar moves up to make room. Active buffs and altar powers are bigger, stack up from the bottom left (beside the team), and show a small timer bar for how long they have left.',
     'New in-run layout: your Pokemon\'s name, health bar and level now sit in a strip at the bottom center, and the attack bar moves up to make room. Active buffs and altar powers are bigger, stack up from the bottom left (beside the team), and show a small timer bar for how long they have left.'],
    ['The Pokedex now rates each Pokemon you own on a 7-star scale from its Base Stat Total, next to its rarity: each star is 100 BST and a half star is 50. Hover the stars to see the exact number.',
     'The Pokedex now rates each Pokemon you own on a 7-star scale from its Base Stat Total, next to its rarity: each star is 100 BST and a half star is 50. Hover the stars to see the exact number.'],
    ['The Pokedex now shows each Pokemon\'s six base stats (HP, Attack, Defense, Speed, Sp. Def, Sp. Atk) as a hexagon, like the main games.',
     'The Pokedex now shows each Pokemon\'s six base stats (HP, Attack, Defense, Speed, Sp. Def, Sp. Atk) as a hexagon, like the main games.'],
    ['The Pokedex button on the main menu is now browse-only; teams are changed from the roster cards. Pokemon already on your roster show their slot.',
     'The Pokedex button on the main menu is now browse-only; teams are changed from the roster cards. Pokemon already on your roster show their slot.'],
    ['Healers reworked so a cluster of them can no longer make a mob unkillable: each healer now heals at most the 3 most-wounded allies in range, never other healers. Below 35% health a healer panics and heals only itself that turn.',
     'Healers reworked so a cluster of them can no longer make a mob unkillable: each healer now heals at most the 3 most-wounded allies in range, never other healers. Below 35% health a healer panics and heals only itself that turn.']
  ] },
  { d: '2026-10-14', title: ['Recupera tu cuenta con Gmail', 'Recover your account with Gmail'], new: [
    ['Si juegas con nombre y contraseña, puedes vincular tu Gmail: si un día olvidas la contraseña, entras con Google y es tu misma cuenta. Te lo ofrecemos al entrar.',
     'If you play with a name and password, you can link your Gmail: if you ever forget your password, sign in with Google and it is the same account. We offer it when you sign in.'],
    ['Móvil: ya puedes colocar los botones donde quieras. En Ajustes > Controles > Colocar los botones arrastras los ataques (con el objeto), la pausa y el joystick, que ahora también puede ser fijo en vez de aparecer donde pones el dedo.',
     'Mobile: you can now place the buttons wherever you want. In Settings > Controls > Place the buttons, drag the attacks (with the item), the pause button and the joystick, which can now also be fixed instead of appearing where you put your finger.']
  ], chg: [
    ['Las tablas de la semana y del mes del ranking empiezan de cero, como el histórico: ahora sólo cuentan partidas con la Sentencia de Arceus y todas las tablas cuadran entre sí.',
     'The weekly and monthly leaderboards start from scratch, like the all-time one: now only runs with the Judgment of Arceus count, and all boards match each other.'],
    ['Aviso importante: la única web oficial de PokéSurvivor es pokesurvivor.com. El juego es y será gratis: si alguna otra web te pide pagar (por tickets, monedas o lo que sea), no somos nosotros. Lo verás también al entrar y en el Aviso legal.',
     'Important: the only official PokéSurvivor website is pokesurvivor.com. The game is and always will be free: if any other website asks you to pay (for tickets, coins or anything else), it isn’t us. You will also see this when signing in and in the Legal notice.'],
    ['El código del juego pasa a una licencia no comercial (PolyForm Noncommercial 1.0.0): se puede seguir estudiando y modificando, pero nadie puede cobrar por él.',
     'The game’s code moves to a non-commercial license (PolyForm Noncommercial 1.0.0): you can still study and modify it, but nobody may charge for it.']
  ], fix: [
    ['Cooperativo: la partida ya no se queda parada con cada uno esperando a que el otro elija. Un objeto y las cartas de nivel ya no se tapan, y si la conexión pierde un aviso se arregla solo.',
     'Co-op: the game no longer freezes with each player waiting for the other to choose. An item and the level-up cards no longer cover each other, and if the connection drops a message it fixes itself.'],
    ['Cooperativo: al volver de una grieta, quien no era el anfitrión ya ve a todos los enemigos (antes algunos eran invisibles y sólo se veían sus ataques).',
     'Co-op: after coming back from a rift, players who are not the host can see every enemy again (some used to be invisible, with only their attacks showing).'],
    ['Amigos: si tu móvil u ordenador tiene la hora (o la zona horaria) mal puesta, tus amigos ya no salen siempre desconectados y sus invitaciones te llegan.',
     'Friends: if your phone or computer has the wrong time (or time zone), your friends no longer always show as offline and their invitations reach you.'],
    ['Los avisos grandes de la partida (un Gholdengo cerca, una marea...) ya salen siempre centrados.',
     'Big in-game announcements (a nearby Gholdengo, a swarm...) are always centered now.']
  ] },
  { d: '2026-10-13', title: ['La Sentencia de Arceus', 'The Judgment of Arceus'], new: [
    ['La Sentencia de Arceus: al llegar al minuto 30, Arceus baja del cielo y te lleva a las Ruinas del Juicio. Es invencible, te persigue cada vez más deprisa y lanza pilares de luz, rayos y ondas; si te toca, te quita casi media vida. Cada 5 segundos acude un legendario con el doble de vida y de daño que el anterior. ¿Cuánto aguantarás?',
     'The Judgment of Arceus: at minute 30, Arceus descends from the sky and takes you to the Ruins of Judgment. It is invincible, chases you faster and faster and casts pillars of light, beams and shockwaves; if it touches you, you lose almost half your HP. Every 5 seconds a legendary joins, each with twice the HP and damage of the previous one. How long can you last?'],
    ['Tres logros nuevos: La Sentencia (llega al minuto 30), Ante el Creador (aguanta 1 minuto ante Arceus) y Desafío divino (derrota a 3 legendarios ante Arceus en una partida).',
     'Three new achievements: The Judgment (reach minute 30), Before the Creator (survive 1 minute against Arceus) and Divine challenge (defeat 3 legendaries against Arceus in a single run).'],
    ['Música nueva para la pelea contra Arceus.', 'New music for the fight against Arceus.'],
    ['Botón para reportar marcas sospechosas en el ranking (la banderita de cada fila).',
     'A button to report suspicious records on the leaderboard (the little flag on each row).']
  ], chg: [
    ['El ranking histórico empieza de cero: ahora que las partidas acaban ante Arceus, las marcas de antes ya no se podrían alcanzar. Las tablas de hoy, de la semana y del mes siguen igual.',
     'The all-time leaderboard starts from scratch: now that runs end against Arceus, older records could no longer be reached. The daily, weekly and monthly boards are unchanged.'],
    ['Se quita el tiempo extra del minuto 60 (ya no se llega hasta ahí).',
     'Overtime from minute 60 is removed (runs no longer get that far).'],
    ['Desde el minuto 28 ya no se abren grietas, para que la Sentencia no te pille dentro de una.',
     'Rifts no longer open from minute 28 on, so the Judgment does not catch you inside one.'],
    ['Ranking protegido contra trampas: el servidor comprueba que cada marca se ha jugado de verdad. Nunca se pierde nada de lo que ganas jugando.',
     'Leaderboard protected against cheating: the server checks that every record was really played. You never lose anything you earn by playing.'],
    ['Se han quitado del ranking las marcas de más de 35 minutos: con la Sentencia de Arceus ya no son posibles.',
     'Records over 35 minutes have been removed from the leaderboard: with the Judgment of Arceus they are no longer possible.']
  ], fix: [
    ['Las tiradas del gacha, los Pokémon nuevos y los premios se guardan en la nube al momento. Si abriste el juego en otro aparato o navegador y te faltaba algo, vuelve a abrirlo donde lo conseguiste: se recupera solo.',
     'Gacha pulls, new Pokémon and rewards are saved to the cloud right away. If you opened the game on another device or browser and something was missing, open it again where you got it: it comes back on its own.']
  ] },
  { d: '2026-10-12', title: ['Tiempo extra y grietas con menos azar', 'Overtime and less random rifts'], new: [
    ['Tiempo extra: desde el minuto 60 los Pokémon salvajes se vuelven cada vez más fuertes (más vida y más daño), y cada vez más deprisa. Antes, con las mejoras al máximo, algunas partidas no acababan nunca; ahora las mejores rondarán la hora y media.',
     'Overtime: from minute 60 on, wild Pokémon keep getting stronger (more HP and more damage), faster and faster. Before, with maxed upgrades, some runs never ended; now the best ones will last about an hour and a half.'],
    ['El juego se actualiza solo cuando sale una versión nueva: si estás en el menú, a los 5 segundos; si estás jugando, al acabar la partida (sin perder nada).',
     'The game now updates itself when a new version is out: within 5 seconds if you are in the menu, or after your run if you are playing (without losing anything).'],
    ['Botón de Novedades (esta ventana) con todos los cambios del juego.',
     'A "What\'s new" button (this window) with every change to the game.'],
    ['Números más fáciles de leer: el 2, el 5 y el 8 ya no se confunden.',
     'Easier to read numbers: 2, 5 and 8 no longer look alike.'],
    ['Elige la versión normal o shiny de tu compañero desde el menú principal, debajo de él.',
     'Pick the normal or shiny version of your partner right from the main menu, under it.'],
    ['Mejoras nuevas para cada Pokémon: Golpe Crítico (+3 % de críticos por nivel, que hacen x1,5 de daño), Cambio de cartas (+1 cambio de las cartas de nivel por run) y Veto (bloquea movimientos para que no te salgan en las cartas; se eligen en Mejoras).',
     'New upgrades for each Pokémon: Critical Hit (+3% critical chance per level, crits deal x1.5 damage), Card reroll (+1 level-up card reroll per run) and Ban (block moves so they never show up in your cards; pick them in Upgrades).'],
    ['Atajos de movimientos (en Mejoras, para cada Pokémon): elige qué movimiento va siempre en cada hueco, por ejemplo Confusión siempre en el 1, para la memoria muscular.',
     'Move shortcuts (in Upgrades, for each Pokémon): choose which move always goes in each slot, for example Confusion always on 1, for muscle memory.']
  ], chg: [
    ['Avalancha hace menos daño (21 en vez de 26): derrotaba casi el doble que la media de los movimientos.',
     'Rock Slide deals less damage (21 instead of 26): it defeated almost twice as many as the average move.'],
    ['Los cambios de cartas de nivel ya no se ganan venciendo jefes: tienes 1 gratis por run y el resto se compra en Mejoras.',
     'Level-up card rerolls are no longer earned by defeating bosses: you get 1 free per run and can buy more in Upgrades.'],
    ['Los legendarios de grieta ya no dan siempre tickets x10: dan uno la mitad de las veces (antes daban 2 siempre y salían demasiados).',
     'Rift legendaries no longer always drop x10 tickets: they drop one half of the time (they used to always drop 2, which was too many).'],
    ['Cooperativo: si vuestras redes no consiguen conectar entre sí, la sala lo avisa y lo reintenta sola, en vez de jugar a tirones por un servidor lento.',
     'Co-op: if your networks cannot connect to each other, the room says so and keeps retrying, instead of playing laggy through a slow server.'],
    ['Hemos cambiado de servidores para que el juego siga siendo gratis: puede que tengas que volver a iniciar sesión (con la misma cuenta y contraseña, o con Google). Tu partida y tus Pokémon siguen igual.',
     'We moved to new servers so the game can stay free: you may need to sign in again (with the same account and password, or with Google). Your save and your Pokémon are unchanged.'],
    ['Gacha: los shiny ya no salen repetidos. Si te toca uno que ya tienes, sale otro de la misma rareza que te falte.',
     'Gacha: shinies no longer come out as duplicates. If you roll one you already have, you get another of the same rarity that you are missing.'],
    ['Grietas con menos azar: cada vez que no sale una, la siguiente es más probable (como mucho 2,5 minutos sin grieta).',
     'Less random rifts: every time one does not show up, the next one is more likely (at most 2.5 minutes without a rift).'],
    ['Los legendarios que aún no has vencido salen 4 veces más en las grietas.',
     'Legendaries you have not beaten yet show up 4 times as often in rifts.'],
    ['Los curanderos curan más cuanto más fuerte pegas, pero cada vez menos y con un tope (como mucho el 2,5x).',
     'Healers heal more the harder you hit, but with diminishing returns and a cap (2.5x at most).'],
    ['Ataques cuerpo a cuerpo más fuertes: mientras llevas uno activo recibes un 25 % menos de daño, llegan un 25 % más lejos y hacen un 20 % más de daño.',
     'Stronger melee attacks: while one is active you take 25% less damage, and they reach 25% further and deal 20% more damage.'],
    ['Cooperativo: al elegir con qué objeto quedarte, la partida se para para todos (antes seguía y te pegaban mientras elegías).',
     'Co-op: choosing which held item to keep now pauses the run for everyone (it used to keep going and you got hit while choosing).'],
    ['Cooperativo: mientras alguien elige una fusión, la partida se para para todos.',
     'Co-op: while someone is choosing a fusion, the run pauses for everyone.'],
    ['Cooperativo: si el anfitrión cambia de pestaña o se le para el juego, la partida se pausa para todos hasta que vuelva.',
     'Co-op: if the host switches tabs or their game stalls, the run pauses for everyone until they are back.'],
    ['Las runs de menos de 1 minuto ya no cuentan para el ranking.',
     'Runs shorter than 1 minute no longer count for the leaderboard.']
  ], fix: [
    ['Quitadas del ranking las marcas rotas por el fallo del minuto 84 (el reloj seguía corriendo con el juego parado) y alguna imposible. Si tenías una, tu próxima partida vuelve a contar.',
     'Removed broken records from the leaderboard caused by the minute 84 bug (the clock kept running while the game was frozen) and a few impossible ones. If you had one, your next run counts again.'],
    ['iPhone (Safari y Chrome): a veces no se podía cambiar de movimiento tocando los iconos, sobre todo con el otro dedo en el joystick. Además los botones quedan por encima de la barra de inicio.',
     'iPhone (Safari and Chrome): sometimes you could not switch moves by tapping the icons, especially with your other finger on the joystick. Buttons also sit above the home bar now.'],
    ['En las partidas de más de 84 minutos la pantalla se quedaba en negro, el juego se paraba o empezabas a subir de nivel sin fin. Ya puedes jugar todo lo que aguantes.',
     'In runs longer than 84 minutes the screen went black, the game froze or you kept levelling up forever. Now you can play for as long as you survive.'],
    ['Si el juego fallara, la partida se cierra sola y se guarda (tiempo, derrotados, récords y ranking) en vez de perderse.',
     'If the game ever crashes, the run ends by itself and is saved (time, defeated, records and leaderboard) instead of being lost.'],
    ['Las partidas muy largas a veces se tomaban por trampas y no contaban para el ranking.',
     'Very long runs were sometimes flagged as cheating and did not count for the leaderboard.'],
    ['Cooperativo: si el anfitrión cambiaba de pestaña, los enemigos se quedaban quietos y los demás jugaban con ventaja.',
     'Co-op: if the host switched tabs, enemies stood still and everyone else got a free advantage.'],
    ['iPhone: mantener el dedo en el joystick sacaba "Copiar / Seleccionar todo".',
     'iPhone: holding your finger on the joystick brought up "Copy / Select all".'],
    ['iPhone: a veces no salía la pantalla completa. Ahora el botón explica cómo tenerla (Compartir y "Añadir a pantalla de inicio").',
     'iPhone: fullscreen sometimes did not show up. Now the button explains how to get it (Share and "Add to Home Screen").']
  ] },
  { d: '2026-10-11', title: ['Vínculos', 'Bonds'], new: [
    ['Vínculos: al vencer a un legendario fusionas movimientos que se lanzan a la vez desde un solo hueco (hasta 4).',
     'Bonds: defeating a legendary lets you fuse moves that fire at the same time from a single slot (up to 4).'],
    ['Botón para cambiar las cartas de subir de nivel.',
     'A button to reroll the level-up cards.']
  ], chg: [
    ['Más grietas.', 'More rifts.'],
    ['Movimientos psíquicos y curanderos más flojos.', 'Weaker psychic moves and healers.'],
    ['Las mejoras de las cartas de nivel (velocidad, recarga, experiencia, imán, coraza y potencia) tienen un tope de veces.',
     'Level-up card upgrades (speed, cooldown, experience, magnet, armor and power) can only be taken a limited number of times.'],
    ['En el móvil, la ficha del Pokémon sale al lado; entrar es más rápido y el gacha x10 se puede cerrar.',
     'On mobile, the Pokémon details show alongside; logging in is faster and the x10 gacha can be closed.']
  ], fix: [
    ['Pantalla negra en partidas de más de una hora por llenarse la memoria de imágenes.',
     'Black screen in runs longer than an hour because image memory filled up.'],
    ['Los tickets se perdían si se cerraba la pestaña antes de acabar la partida: ahora se guardan al cogerlos.',
     'Tickets were lost if the tab closed before the run ended: now they are saved as soon as you pick them up.'],
    ['Una mejora comprada justo después de guardar se cobraba y no se apuntaba.',
     'An upgrade bought right after saving was charged but not applied.'],
    ['El juego se quedaba congelado para siempre si algo fallaba a mitad de partida.',
     'The game froze forever if something went wrong mid-run.']
  ] },
  { d: '2026-10-10', title: ['Más reto', 'More challenge'], new: [
    ['Jefes y legendarios con 4 ataques avisados que se enfurecen a media vida.',
     'Bosses and legendaries with 4 telegraphed attacks that get enraged at half health.'],
    ['12 movimientos nuevos y 8 formas de atacar nuevas: bumerán, cadena, minas, meteoros, torreta, embestida, rastro y abanico.',
     '12 new moves and 8 new ways to attack: boomerang, chain, mines, meteors, turret, dash, trail and spray.'],
    ['Eventos a mitad de partida (hordas de un tipo, hora dorada, Pokémon perdidos) y Meowth y Gholdengo que huyen cargados de monedas.',
     'Mid-run events (single-type hordes, golden hour, lost Pokémon) and Meowth and Gholdengo running away loaded with coins.'],
    ['Estatuas para los Pokémon grandes.', 'Statues for big Pokémon.']
  ], chg: [
    ['Más difícil: menos enemigos pero más duros.', 'Harder: fewer but tougher enemies.'],
    ['Subir de nivel es más lento, los tickets son más raros y los jefes dan ticket x10 una de cada tres veces.',
     'Levelling up is slower, tickets are rarer and bosses drop a x10 ticket one time in three.'],
    ['Carga más rápida.', 'Faster loading.']
  ], fix: [
    ['Los enemigos rezagados desaparecían delante de ti: ahora sólo fuera de la vista.',
     'Straggling enemies vanished in front of you: now only off-screen.'],
    ['Los menús y pantallas se montaban encima de la barra de arriba.',
     'Menus and screens overlapped the top bar.']
  ] },
  { d: '2026-10-09', title: ['Móvil e inglés', 'Mobile and English'], new: [
    ['Se puede jugar en móvil y tablet con joystick táctil, e instalar como app.',
     'Play on phones and tablets with a touch joystick, and install it as an app.'],
    ['El juego, en español y en inglés.', 'The game in English and Spanish.'],
    ['Pantalla de ajustes con calidad gráfica automática.', 'Settings screen with automatic graphics quality.']
  ], chg: [
    ['Menos enemigos en pantalla pero más fuertes.', 'Fewer but stronger enemies on screen.'],
    ['Gigadrenado pasa a ser Hierba Lazo (ya no cura).', 'Giga Drain becomes Grass Knot (no more healing).']
  ] },
  { d: '2026-10-08', title: ['Misiones, grietas y cooperativo', 'Missions, rifts and co-op'], new: [
    ['Misiones diarias y semanales, logros con medallas y títulos, y perfil público.',
     'Daily and weekly missions, achievements with medals and titles, and a public profile.'],
    ['Objetos equipables, evoluciones de movimientos y enemigos que curan, protegen, invocan o explotan.',
     'Held items, move evolutions and enemies that heal, shield, summon or explode.'],
    ['Grietas que llevan a 18 arenas legendarias, una por tipo, y clima que cambia la batalla.',
     'Rifts leading to 18 legendary arenas, one per type, and weather that changes the fight.'],
    ['Cooperativo con tu lista de amigos y ranking.', 'Co-op with your friends list and leaderboards.'],
    ['Mejoras para cada Pokémon, gacha tragaperras con tickets y tabla de tipos.',
     'Upgrades for each Pokémon, a slot-machine ticket gacha and a type chart.']
  ], chg: [
    ['Cámara más lejos y enemigos que rodean los obstáculos.', 'Camera further out and enemies that walk around obstacles.']
  ] },
  { d: '2026-10-07', title: ['Primera versión', 'First version'], new: [
    ['Primera versión pública de PokéSurvivor.', 'First public version of PokéSurvivor.']
  ] }
];
