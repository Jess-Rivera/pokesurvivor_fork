#!/usr/bin/env python3
"""tools/subset_silver.py: trims the game font. Silver.ttf holds about 13,800 characters and the game waits for it at boot.

Keeps Latin (for names players type), common punctuation and symbols, and every non-ASCII character in the game's code.
Characters left out fall back to the next font in the list. Run it again if text starts needing a character it dropped.
Needs fontTools (pip install fonttools). Usage from the repo root:  python tools/subset_silver.py
Silver by Poppy Works, CC BY 4.0: changes are allowed with attribution (CREDITS.md).
"""
import os
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'fonts', 'Silver.ttf')
OUT = os.path.join(ROOT, 'assets', 'fonts', 'Silver-game.ttf')

RANGES = [
    (0x20, 0x7E),  # Basic Latin
    (0xA0, 0x24F),  # Latin-1, Latin Extended A and B
    (0x2010, 0x2027),  # dashes, quotes, bullets, ellipsis
    (0x2030, 0x205E),  # per mille, primes, more punctuation
    (0x20A0, 0x20BF),  # currency
    (0x2190, 0x2199),  # arrows
    (0x2200, 0x22FF),  # math
    (0x2640, 0x2642),  # gender symbols
    (0x2605, 0x2606),  # stars
]


def game_chars():
    found = set()
    paths = [os.path.join(ROOT, 'dev.html')]
    for folder, _, files in os.walk(os.path.join(ROOT, 'js')):
        paths += [os.path.join(folder, f) for f in files if f.endswith('.js') and f != 'app.min.js']
    for path in paths:
        with open(path, encoding='utf8') as fh:
            found.update(ord(c) for c in fh.read() if ord(c) > 127)
    return found


def main():
    wanted = set(game_chars())
    for lo, hi in RANGES:
        wanted.update(range(lo, hi + 1))
    font = TTFont(SRC)
    have = set(font.getBestCmap())
    options = subset.Options()
    options.name_IDs = ['*']  # keep the author and licence fields
    options.notdef_outline = True
    options.layout_features = ['*']
    sub = subset.Subsetter(options)
    sub.populate(unicodes=sorted(wanted & have))
    sub.subset(font)
    font.save(OUT)
    print(
        'wrote %s: %d characters, %d KB (from %d KB)'
        % (os.path.relpath(OUT, ROOT), len(TTFont(OUT).getBestCmap()), os.path.getsize(OUT) // 1024, os.path.getsize(SRC) // 1024)
    )


if __name__ == '__main__':
    main()
