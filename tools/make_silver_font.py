"""tools/make_silver_font.py: build the Pokemon tier's text font (#155 155e, docs/HUD-STYLE.md "Fonts").

Reads assets/fonts/Silver-game.ttf (left untouched; the game loads it until #126) and writes
assets/fonts/Silver-10px.ttf with three changes:
  1. The em becomes 1000 units. The art's pixel is 100 units, so one font pixel is exactly 1/10 of the font size and
     the text is crisp at whole sizes (20, 30, 40 px, or 5, 10, 15 on the 2x canvas) with no CSS size-adjust.
     Outlines are not moved.
  2. Line metrics in whole font pixels: 12 up, 3 down, no line gap (the 9-pixel capitals sit centred in the line, as
     the CSS ascent and descent overrides placed them before). Replaces those overrides.
  3. Every digit takes the widest digit's advance; a narrower digit is padded evenly on both sides, so numbers (HP, Lv)
     do not twitch as they change.
The family is renamed "Silver 10px" so it never collides with GameFont if both are loaded.
Run tools/subset_silver.py first whenever Silver-game.ttf is rebuilt. Silver by Poppy Works, CC BY 4.0 (CREDITS.md).

Needs Python 3 with fontTools (pip install fonttools). Usage from the repo root: python tools/make_silver_font.py
"""

import os

from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "assets", "fonts", "Silver-game.ttf")
OUTPUT = os.path.join(ROOT, "assets", "fonts", "Silver-10px.ttf")

SOURCE_UNITS_PER_EM = 1900  # 19 font pixels per em in Silver-game.ttf
FONT_PIXEL = 100  # units per art pixel in the source
UNITS_PER_EM = 10 * FONT_PIXEL  # 10 font pixels per em
ASCENT = 12 * FONT_PIXEL
DESCENT = 3 * FONT_PIXEL
FAMILY = "Silver 10px"
# Tables that store sizes in pixels per em for the old em; browsers rebuild them, stale copies only mislead.
PIXEL_SIZE_TABLES = ("hdmx", "LTSH", "VDMX")


def set_line_metrics(font):
    hhea = font["hhea"]
    hhea.ascent, hhea.descent, hhea.lineGap = ASCENT, -DESCENT, 0
    os2 = font["OS/2"]
    os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = ASCENT, -DESCENT, 0
    os2.usWinAscent, os2.usWinDescent = ASCENT, DESCENT


def even_digit_widths(font):
    """Gives every digit the widest digit's advance, padding a narrower one by whole font pixels on both sides."""
    cmap = font.getBestCmap()
    glyphs = font["glyf"]
    metrics = font["hmtx"]
    names = [cmap[ord(digit)] for digit in "0123456789"]
    widest = max(metrics[name][0] for name in names)
    for name in names:
        advance, left_bearing = metrics[name]
        padding = widest - advance
        if padding == 0:
            continue
        if padding % (2 * FONT_PIXEL):
            raise SystemExit("digit %s cannot be padded by whole font pixels on both sides" % name)
        shift = padding // 2
        glyphs[name].coordinates.translate((shift, 0))
        glyphs[name].recalcBounds(glyphs)
        metrics[name] = (widest, left_bearing + shift)
    return widest // FONT_PIXEL


def rename(font):
    for record in font["name"].names:
        if record.nameID in (1, 16):
            record.string = FAMILY
        elif record.nameID == 4:
            record.string = FAMILY + " Regular"
        elif record.nameID == 6:
            record.string = FAMILY.replace(" ", "") + "-Regular"
        elif record.nameID == 3:
            record.string = FAMILY + " (from Silver by Poppy Works, tools/make_silver_font.py)"


def main():
    font = TTFont(SOURCE)
    if font["head"].unitsPerEm != SOURCE_UNITS_PER_EM:
        raise SystemExit("unexpected source em %d (expected %d)" % (font["head"].unitsPerEm, SOURCE_UNITS_PER_EM))
    font["head"].unitsPerEm = UNITS_PER_EM
    set_line_metrics(font)
    digit_pixels = even_digit_widths(font)
    rename(font)
    for table in PIXEL_SIZE_TABLES:
        if table in font:
            del font[table]
    font.save(OUTPUT)
    print("wrote assets/fonts/Silver-10px.ttf: 10 font pixels per em, digits %d pixels wide" % digit_pixels)


if __name__ == "__main__":
    main()
