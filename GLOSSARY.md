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
| jefe / jefes | boss / bosses |
| oleada / marea | wave / tide (of enemies) |
| grieta | rift |
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
| `jefe` | boss |
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

## Note on strings vs. comments

Spanish string LITERALS in the JS (text shown to the player) are intentionally
left in Spanish: the i18n system translates them at runtime using `lang-en.js`,
keyed on the exact Spanish string. If you add a new user-facing string, add its
English translation to `js/data/lang-en.js` too, or it will only show in Spanish.
