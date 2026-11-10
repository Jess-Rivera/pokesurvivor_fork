// tools/copy_portraits.js: copy SpriteCollab's Normal portraits into the game, next to each species' sprites.
// Ruling: docs/decisions/2026-11-10-hud-portraits-spritecollab-normal-face.md (docs/HUD-STYLE.md "Assets").
//   portrait/<dex4>/Normal.png            ->  assets/pokemon/<dex>/Portrait.png     (normal)
//   portrait/<dex4>/0000/0001/Normal.png  ->  assets/pokemon/<dex>/s/Portrait.png   (shiny)
// Only species the game already has sprites for (a folder in assets/pokemon). Every other SpriteCollab folder is an
// alternate form (Mega, Gigantamax, Altcolor, costumes, female) and is skipped. A shiny portrait is copied only where
// the game has shiny sprites (an s/ folder), so no new shiny folder is created.
// Usage: node tools/copy_portraits.js [SpriteCollab folder] [--dry-run]
//        The SpriteCollab folder defaults to C:\dev\SpriteCollab (the one holding portrait/).
const fs = require('fs'),
  path = require('path');

const root = path.resolve(__dirname, '..'),
  POKEMON_DIR = path.join(root, 'assets/pokemon'),
  args = process.argv.slice(2),
  dryRun = args.includes('--dry-run'),
  spriteCollabDir = args.find((arg) => !arg.startsWith('--')) || 'C:\\dev\\SpriteCollab',
  portraitDir = path.join(spriteCollabDir, 'portrait'),
  PORTRAIT_NAME = 'Portrait.png';

if (!fs.existsSync(portraitDir)) {
  console.error(`copy_portraits: no portrait folder at ${portraitDir}`);
  process.exit(1);
}

const speciesDexes = fs
  .readdirSync(POKEMON_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
  .map((entry) => Number(entry.name))
  .sort((first, second) => first - second);

const totals = { normal: 0, shiny: 0, unchanged: 0 },
  missingNormal = [],
  missingShiny = [];

/** Copy one file unless the target already holds the same bytes. Returns true when it wrote (or would write). */
function copyIfChanged(source, target) {
  if (fs.existsSync(target) && fs.readFileSync(target).equals(fs.readFileSync(source))) {
    totals.unchanged++;
    return false;
  }
  if (!dryRun) fs.copyFileSync(source, target);
  return true;
}

for (const dex of speciesDexes) {
  const sourceFolder = path.join(portraitDir, String(dex).padStart(4, '0')),
    speciesFolder = path.join(POKEMON_DIR, String(dex)),
    normalSource = path.join(sourceFolder, 'Normal.png'),
    shinySource = path.join(sourceFolder, '0000', '0001', 'Normal.png'),
    shinySpriteFolder = path.join(speciesFolder, 's');

  if (fs.existsSync(normalSource)) {
    if (copyIfChanged(normalSource, path.join(speciesFolder, PORTRAIT_NAME))) totals.normal++;
  } else missingNormal.push(dex);

  if (!fs.existsSync(shinySpriteFolder)) continue;
  if (fs.existsSync(shinySource)) {
    if (copyIfChanged(shinySource, path.join(shinySpriteFolder, PORTRAIT_NAME))) totals.shiny++;
  } else missingShiny.push(dex);
}

const verb = dryRun ? 'would copy' : 'copied';
console.log(
  `copy_portraits: ${speciesDexes.length} species; ${verb} ${totals.normal} normal and ${totals.shiny} shiny portraits;` +
    ` ${totals.unchanged} already up to date`
);
if (missingNormal.length) console.log(`  no normal portrait: ${missingNormal.join(' ')}`);
if (missingShiny.length) console.log(`  no shiny portrait (falls back to normal): ${missingShiny.join(' ')}`);
