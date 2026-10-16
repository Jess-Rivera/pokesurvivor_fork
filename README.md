# PokeSurvivor . Mystery Dungeon

A Pokemon bullet-heaven in the style of Survivor.io and Megabonk, with sprites from
*Pokemon Mystery Dungeon*, a roguelike layer, **966 Pokemon from the 9 generations**,
shinies and a per-region gacha. Music and effects composed for the game.

Vanilla HTML + CSS + JavaScript on Canvas 2D. No build, no dependencies and
**everything local**: it needs no internet to play.

> **Aviso sobre criptomonedas / Crypto disclaimer**
>
> PokeSurvivor **has no official cryptocurrency, token or NFT**, and I have not
> created any. Any token that uses the game's name was created by third parties.
> **I take no responsibility for any purchase, sale or investment** you make
> with them, and nothing here is investment advice. The game is free and will
> stay free.
>
> PokeSurvivor has **no official cryptocurrency, token or NFT**, and I have not
> created any. Any token using the game's name was created by third parties.
> **I take no responsibility for any purchase, sale or investment** you make
> with them, and nothing here is investment advice. The game is free and will
> stay free.

## Playing

Double-click `index.html`. Create an account or enter as a guest, take the
personality test and into the dungeon.

| Key | Action |
|---|---|
| `W` `A` `S` `D` / arrows | Move |
| `1` `2` `3` `4` | Choose the active move |
| `Q` / `E` | Cycle moves |
| `Esc` / `P` | Pause |

**On phone or tablet** (in landscape): put your finger anywhere and drag
to move (the joystick appears where you touch), tap an attack at the bottom to
change it and the button at the top right to pause. It can be installed as an
app ("Add to home screen"). In **Settings** there is sound, graphics quality
(with an automatic mode), damage numbers, less shake, FPS and the account.

The Pokemon attacks on its own with the active move (or with all the moves of a
**link**: each legendary you beat lets you fuse moves to fire them at once from a
single slot, up to 4). Rocks, chests and tall grass break; walls and trees block
enemy shots; water slows you down and lava burns (enemies too).

On the map there are **power altars**, **springs** that heal, **locked chests**
(stay next to them a few seconds) and **traps** that also damage enemies. Now
and then a **rift** opens: enter it and you will fight a **legendary** in a
separate arena.

There is a **type chart** (a Bubble Beam takes more off a Charmander) and,
every so often, **weather** (sun, rain, sandstorm, snow, fog) that boosts some
types and weakens others.

Every day there are **quests** (and weekly ones) that give tickets and coins;
**achievements** give medals and titles, and your **profile** shows your 3
favorite Pokemon, your records and your medals. In runs you find **items**
(Leftovers, Choice Band...) and your moves **evolve** at max level. Enemies have
personality: they heal, put up shields, call in their pack or attack with a
ground warning.

**Upgrades** are per Pokemon. The **gacha** runs on **tickets** earned by
playing (x1 from some Pokemon, x10 from bosses and legendaries), and is pulled
on a pixel-art slot machine.

Each enemy has a 1/4096 chance of being **shiny**: it sparkles, an arrow at the
edge of the screen tells you where it is, and if you beat it you keep it. In the
gacha a shiny shows up 1 in every 100 pulls. In the collection you choose your
companion in normal or shiny version.

The music plays after the first click (browsers do not allow sound to play
before that). Volume and mute: the speaker button at the top right, or in the
pause menu.

The save lives in the browser's `localStorage`: if you clear the site's data,
it is lost.

In `videos/` there are recordings of the game (with their music): a boss fight,
catching a wild shiny and a shiny in the gacha.

## Cloud save and publishing

- **Database (Firebase):** accounts with name + password or Google, and the
  save follows you on any computer. Steps in [docs/FIREBASE.md](docs/FIREBASE.md).
  With no setup, the game saves only in the browser, as before.
- **Playing with friends (up to 4) and ranking:** with a cloud account, the
  **Friends** menu (add by nickname, invite to your room) and **Ranking** (time
  survived: solo or group, from today to all-time, friends, by Pokemon).
- **Publishing free on GitHub Pages:** [docs/PUBLICAR.md](docs/PUBLICAR.md).
- If you play on two computers at once or offline, the saves are **merged**:
  collections are joined (you never lose a Pokemon or a shiny), upgrades and
  stats keep the maximum, and coins and companion keep the most recent version.
  Changes from another computer arrive live.

## License

Code under [PolyForm Noncommercial 1.0.0](LICENSE-NONCOMMERCIAL.md) since
2026-10-14: it can be used, studied and modified, but **not for commercial
purposes** (neither selling the game nor charging anything inside it). The
versions up to commit `b297089` were published under MIT. The sprites (CC BY-NC
4.0), the font (OFL) and the Pokemon trademarks have their own conditions: see
[LICENSE](LICENSE) and [CREDITS.md](CREDITS.md). A non-profit fan project.

**The only official site is [pokesurvivor.com](https://pokesurvivor.com).** The
game is and will stay free: if anyone asks you to pay, it is not us.

## Structure

```
index.html              screens + load order
css/style.css           Mystery Dungeon style interface
assets/pokemon/{dex}/   PMD sprite sheets (Idle, Walk, Attack, Shoot, Charge, Hurt, Faint)
assets/pokemon/{dex}/s/ the same in shiny version
assets/fonts/           Pixelify Sans (OFL) and its version with redrawn numbers (tools/make_font.py)
js/
  net/      social (nickname, friends, rooms), net (WebRTC + relay),
            coop (group game), ranking
  core/     util, db (save), audio (synthesizer + effects), input,
            sprites (PMD animator), camera
  data/     pokedex*, sprites-meta*, moves, starters (+ test), enemies,
            upgrades, music (scores)
  world/    tiles (pixel art in code), world (terrain, objects, collisions)
  entities/ player, enemy, projectile, pickup, fx
  systems/  combat, spawner, levelup, gacha
  ui/       icons (pixel art), ui, hud, login, test, menu, gacha-ui, run-ui,
            social-ui, ranking-ui
  game.js   flow and main loop
tools/      scripts that regenerate the files marked with *
```

`*` = generated. To rebuild them (needs Python 3 + Pillow and internet, only that once):

```
python tools/fetch_sprites.py    # normal and shiny sprites + js/data/sprites-meta.js
                                 # (~20 min; can be stopped and relaunched: uses tools/cache/)
python tools/fetch_pokedex.py    # js/data/pokedex.js
python tools/fetch_credits.py    # CREDITS.md
```

## Implementation notes

- **PMD sprites.** Columns = frames, rows = 8 directions (Down, DownRight,
  Right, UpRight, Up, UpLeft, Left, DownLeft, verified with the `-Offsets.png`).
  Each animation has its own frame size, so they are aligned by the **ground
  anchor** taken from the `-Shadow.png`; without that the sprite would jump when attacking.
- **Coordinates.** An entity's `(x, y)` are its **feet**. Collisions happen on
  the ground plane; projectiles fly on that plane and are drawn raised with
  their shadow underneath.
- **World.** Chunks of 16x16 tiles: the *data* (terrain, objects) is cheap and
  always generated; the *image* is baked at art resolution by writing into an
  `ImageData` (~4 ms per chunk in Chrome) and only for the visible ones.
- **Performance.** Spatial grid of enemies rebuilt every frame. With 420
  enemies, simulation + full render ~ 3 ms per frame in Chrome.
- **Metadata in `.js`, not `.json`**, because `fetch()` is blocked on `file://`.
- **Shiny.** SpriteCollab shinies are the same drawing with a different palette;
  they are in `s/` and only 30 have different geometry (field `sa` in the metadata).
  The sheets are saved as PNG with an exact palette: same image, half the weight.
- **Audio.** Web Audio synthesizer with a look-ahead scheduler (it schedules the
  notes 150 ms ahead) and convolution reverb with a generated impulse.
  The scores are in `js/data/music.js` in a custom text format.
  The effects have a minimum gap between repeats and a voice cap, so that 400
  enemies hit at once do not saturate.
- **Icons.** Character maps converted to canvas and data URLs; always at integer
  multiples of their size so the pixel stays clean.

## Credits and license

Sprites from [SpriteCollab](https://github.com/PMDCollab/SpriteCollab) under
**CC BY-NC 4.0**, **non-commercial** use with attribution; the list of artists
is in [`CREDITS.md`](CREDITS.md). Pokemon is property of Nintendo, Creatures
Inc. and GAME FREAK. A non-profit fan project.
