"""tools/make_hud_font.py: build the HUD's text font (#61, docs/HUD-STYLE.md "Fonts").

Reads assets/fonts/Truth-And-Ideals.ttf (left untouched) and writes assets/fonts/Truth-And-Ideals-10px.ttf with three changes:
  1. The em becomes 1000 units. The art's pixel is 100 units, so one font pixel is exactly 1/10 of the font size and the
     text is crisp at whole sizes (20, 30, 40 px) instead of 10.24, 20.48 and 30.72. Outlines are not moved, so glyphs
     render 2.4% larger at a given size.
  2. A middle dot (U+00B7) is added: the font's own period (2 x 2 font pixels) raised to the middle of the lower case.
  3. The digit one gets the other digits' 5-pixel advance, so every digit is the same width (numbers do not twitch as
     they change). Its stem already sits on the other digits' centre column, so the outline stays where it is.
The family is renamed "Truth And Ideals 10px" so it never collides with the original if both are loaded.

Needs Python 3 with fontTools (pip install fonttools). Usage: python tools/make_hud_font.py
"""

import copy
import os

from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "assets", "fonts", "Truth-And-Ideals.ttf")
OUTPUT = os.path.join(ROOT, "assets", "fonts", "Truth-And-Ideals-10px.ttf")

FONT_PIXEL = 100  # units per art pixel in the source
UNITS_PER_EM = 1000  # 10 font pixels per em
DIGIT_ADVANCE = 5 * FONT_PIXEL
MIDDLE_DOT_LIFT = 2 * FONT_PIXEL  # the period spans 0 to 2 pixels; lifted, it spans 2 to 4, the middle of the 6-pixel lower case
FAMILY = "Truth And Ideals 10px"


def main():
    font = TTFont(SOURCE)
    if font["head"].unitsPerEm != 1024:
        raise SystemExit("unexpected source em %d (expected 1024)" % font["head"].unitsPerEm)
    font["head"].unitsPerEm = UNITS_PER_EM

    cmap = font.getBestCmap()
    glyphs = font["glyf"]
    metrics = font["hmtx"]

    # 2. the middle dot, from the period
    if 0x00B7 not in cmap:
        period = cmap[ord(".")]
        dot = copy.deepcopy(glyphs[period])
        coordinates = dot.getCoordinates(glyphs)[0]
        coordinates.translate((0, MIDDLE_DOT_LIFT))
        dot.recalcBounds(glyphs)
        name = "periodcentered"
        order = font.getGlyphOrder()
        if name in order:
            raise SystemExit("source already has a glyph named " + name)
        font.setGlyphOrder(order + [name])
        glyphs.glyphOrder = font.getGlyphOrder()
        glyphs[name] = dot
        metrics[name] = metrics[period]
        for table in font["cmap"].tables:
            if table.isUnicode():
                table.cmap[0x00B7] = name

    # 3. every digit the same width
    for digit in "0123456789":
        name = cmap[ord(digit)]
        advance, left_bearing = metrics[name]
        if advance != DIGIT_ADVANCE:
            metrics[name] = (DIGIT_ADVANCE, left_bearing)

    # the new family name
    for record in font["name"].names:
        if record.nameID in (1, 4):
            record.string = FAMILY if record.nameID == 1 else FAMILY + " Regular"
        elif record.nameID == 6:
            record.string = FAMILY.replace(" ", "")
        elif record.nameID == 3:
            record.string = FAMILY + " (from Truth And Ideals - Fighting Ideals 0.2, tools/make_hud_font.py)"

    font["maxp"].numGlyphs = len(font.getGlyphOrder())
    font.save(OUTPUT)
    print("wrote assets/fonts/Truth-And-Ideals-10px.ttf")


if __name__ == "__main__":
    main()
