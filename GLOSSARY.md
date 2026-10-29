# GLOSSARY, Spanish to English developer reference

This codebase is authored in Spanish. The game runs in English at runtime through
the i18n system (see `js/core/i18n.js` and `js/data/lang-en.js`), but the source
code, folder names, comments and many identifiers are Spanish. This glossary lets
you navigate and read the code WITHOUT renaming anything. Do not rename folders or
identifiers: the routing (the `/guia/`, `/pokedex/` URLs), the i18n dictionary keys
and internal references all depend on the Spanish names staying as they are.

## Folder names (do NOT rename, they are public URLs)

| Folder | English | Role |
|---|---|---|
| `apoyar` | support | "Support the project" page |
| `contacto` | contact | Contact page |
| `guia` | guide | Game guide page (SEO) |
| `legendarios` | legendaries | Legendaries page (SEO) |
| `logros` | achievements | Achievements page (SEO) |
| `movimientos` | moves | Moves page (SEO) |
| `novedades` | news / changelog | News page (SEO) |
| `objetos` | items | Items page (SEO) |
| `pokedex` | pokedex | Pokedex page (SEO) |
| `shinies` | shinies | Shinies page (SEO) |
| `tipos` | types | Types page (SEO) |
| `en` | english | English versions of the SEO pages |

## Core game / domain terms

| Spanish | English |
|---|---|
| juego | game |
| jugador | player |
| partida | game / run |
| run | run (a single play session) |
| ronda | round |
| pantalla | screen |
| menú | menu |
| ajustes | settings |
| mejora / mejoras | upgrade / upgrades |
| movimiento / movimientos | move / moves (attacks) |
| ataque | attack |
| defensa | defense |
| velocidad | speed |
| vida | health / HP |
| salud | health |
| nivel | level |
| experiencia | experience / XP |
| enemigo / enemigos | enemy / enemies |
| jefe / jefes | boss / bosses (REMOVED as a timed spawn, see BOSS-REWORK.md; the word survives in code) |
| oleada / marea | wave / tide (of enemies) |
| grieta | rift (REMOVED as a random event; the rift flow now serves gym gates) |
| arena | arena |
| bioma | biome |
| clima | weather |
| altar | altar |
| manantial | spring (healing) |
| cofre | chest |
| candado | lock (locked chest) |
| trampa / trampas | trap / traps |
| roca / rocas | rock / rocks |
| hierba | grass |
| lava | lava |
| agua | water |
| moneda / monedas | coin / coins (Poke-coins) |
| ticket / tickets | ticket / tickets (gacha currency) |
| gacha | gacha |
| tirada | pull (gacha) |
| banner | banner (gacha, per region) |
| rareza | rarity |
| pity | pity (gacha guarantee) |
| compañero | companion (the player's Pokemon) |
| colección | collection |
| starter / iniciales | starters |
| shiny / shinies | shiny / shinies |
| legendario / legendarios | legendary / legendaries |
| logro / logros | achievement / achievements |
| misión / misiones | quest / mission |
| diaria / semanal | daily / weekly |
| medalla | medal |
| título | title |
| perfil | profile |
| objeto / objetos | item / items |
| familia | family (move family) |
| potenciador | buff |
| nova | nova (move family) |
| aura | aura (move family) |
| proyectil | projectile |
| cuerpo a cuerpo | melee |
| rayo | beam |
| orbe / orbes | orb / orbs |
| apuntado | targeting |
| sala | room (co-op) |
| anfitrión | host (co-op) |
| amigo / amigos | friend / friends |
| apodo | nickname |
| en línea | online |
| invitación | invitation |
| ranking | ranking / leaderboard |
| tabla | table (leaderboard tab) |
| test de personalidad | personality test |
| rasgo | trait |

## Pokemon types (Spanish -> English)

The official English names live in the i18n dictionary (`js/data/lang-en.js`).

| Spanish | English |
|---|---|
| Normal | Normal |
| Fuego | Fire |
| Agua | Water |
| Planta | Grass |
| Eléctrico | Electric |
| Hielo | Ice |
| Lucha | Fighting |
| Veneno | Poison |
| Tierra | Ground |
| Volador | Flying |
| Psíquico | Psychic |
| Bicho | Bug |
| Roca | Rock |
| Fantasma | Ghost |
| Dragón | Dragon |
| Siniestro | Dark |
| Acero | Steel |
| Hada | Fairy |

Regions: `Teselia` = Unova (the rest keep their names: Kanto, Johto, Hoenn,
Sinnoh, Kalos, Alola, Galar, Paldea).

## Permanent upgrades (per Pokemon)

| Spanish | English (likely intent) |
|---|---|
| Vitalidad | Vitality (max health) |
| Fuerza | Strength (damage) |
| Zancada | Stride (move speed) |
| Reflejos | Reflexes (cooldown / attack speed) |
| Coraza | Carapace (defense) |
| Síntesis | Synthesis (regen) |
| Imán | Magnet (pickup range) |
| Sabiduría | Wisdom (XP) |
| Fortuna | Fortune (coins) |
| Repertorio | Repertoire (start with 2 moves) |

## Common identifier fragments in code

These show up inside variable, function and key names. Knowing them makes the
code readable even though they are not renamed.

| Fragment | Meaning |
|---|---|
| `vida` | health |
| `dano` / `danio` / `daño` | damage |
| `vel` | speed (velocidad) |
| `niv` / `nivel` | level |
| `exp` | experience |
| `enem` | enemy (enemigo) |
| `jug` / `jugador` | player |
| `jefe` | boss (system removed, see BOSS-REWORK.md) |
| `mov` | move (movimiento) |
| `mej` | upgrade (mejora) |
| `tipo` | type |
| `arma` | weapon / attack build |
| `moneda` / `mon` | coin |
| `ticket` | ticket |
| `apodo` | nickname |
| `sala` | room |
| `anfitrion` | host |
| `guardar` | save |
| `cargar` | load |
| `dibujar` / `pintar` | draw / paint |
| `actualizar` | update |
| `empezar` / `iniciar` | start |
| `acabar` / `terminar` | end / finish |
| `elegir` | choose |
| `mostrar` | show |
| `ocultar` | hide |
| `calcular` | compute |
| `pantalla` | screen |
| `ronda` / `partida` | run / game |
| `hv` (in sprites-meta) | hover flag (floats in sprite) |
| `sa` (in sprites-meta) | shiny-alt geometry flag |
| `leg` (in pokedex) | legendary / singular flag |

## Move schema terms (the new move path)

English-native terms of the move schema rewrite. Owners: docs/MOVE-AXIS-SCHEMA.md (grammar) and
docs/current feature planning/combat-architecture.md (runtime); this table only names them.

| Term | Meaning |
|---|---|
| axis | one of the three parts of a move: `space` (shape), `delivery` (where, how it moves, when it ends), `payload` (effects) |
| resolved definition | a move after defaults, derived values (cd, basePower, range) and overrides; `G.MoveDefs`, deep-frozen |
| routed | in the ROUTED list of js/systems/move-route.js, so the new path runs it with `?dev&newcombat` |
| legacy path | the old `kind`-based combat in combat.js and moves.js; removed in slice 7b |
| instance | one live hitbox spawned by a cast (one per `space.count`) |
| group | the `count` instances of one spawn; a persistent slot keeps one group alive |
| `endOn` | the conditions that end an instance (time, wall, offScreen, returned, ownerDeath, notActive) |
| persistent | `persistent: true`: the slot owns the move's life, no cooldown; ends on a swap, stun or faint, respawns after an instance end (H25) |
| aura / pulse | a persistent move with no `endOn` / with an `endOn` time, which respawns each cycle |
| self-cast | `anchor: self`, a shapeless cast (Swords Dance); its effects carry their own duration, no `endOn` |
| hit policy | when one instance may hit the same enemy again: `oncePerInstance`, `interval` (every `rehit` s) |
| pierce | how many enemies an instance passes through before it ends; UNLIMITED never ends it |
| lens | the area multiplier (`moveRadiusMul`) applied to radii, arcs, beam length and orbit radius |
| cast gate | the check that holds a cast until a target is in reach (retries every 0.05 s) |
| maxStacks | live applications one self-buff move may keep on its host; foe drops only when authored |
| intent scenario | a staged fight in move-intent-scenarios.json with a hand-derived expected outcome |
| batch review | Jess's sign-off of newly routed moves that have no MOVE-INTENT entry (CLAUDE.md "Move review rule") |
| harness / mutation runner | an offline test file under docs/proposals/ run by check.js / a script that breaks the code on purpose to prove the harness catches it |

## Note on strings vs. comments

Spanish string LITERALS in the JS (text shown to the player) are intentionally
left in Spanish: the i18n system translates them at runtime using `lang-en.js`,
keyed on the exact Spanish string. Those inherited literals stay as they are. New
user-facing strings are authored directly in English with NO lang-en.js entry and no
Spanish version (CLAUDE.md "English-native i18n").
