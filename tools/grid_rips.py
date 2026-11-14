"""tools/grid_rips.py: gridded copies of the B/W UI rips, with short names, so a spot can be named like "b2-lower K7".

Reads every sheet in assets/ui/BW Pokedex rip (and its sub-folders) and writes a copy with a lettered and numbered grid
into assets/ui/BW Pokedex rip/_grid/, plus _grid/README.md mapping each short name to its original file.
Skipped: the _grid and ContactSheets folders, BW Party (small single pieces, already on the contact sheets), the
Tower of Ashes tileset, and images smaller than MIN_SIDE on their longest side. Identical images (the same pixels under
another path, such as the many background_sliding.PNG) are written once and listed as aliases.
Columns are letters (A to Z, then AA, AB, ...), rows are numbers, both counted from the top left.
Small art is enlarged by a whole number (nearest neighbour) so every cell is at least MIN_CELL_ON_SCREEN pixels wide.
Usage: python tools/grid_rips.py
"""

import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
RIP_DIR = ROOT / "assets" / "ui" / "BW Pokedex rip"
OUT_DIR = RIP_DIR / "_grid"

MIN_SIDE = 150  # skip images whose longest side is under this many pixels
MAX_COLUMNS = 40  # pick the smallest cell size that keeps the grid at or under this many columns
CELL_SIZES = [8, 10, 16, 20, 25, 32, 40, 50, 64, 100]  # cell sizes to choose from, in art pixels
MIN_CELL_ON_SCREEN = 40  # enlarge the art until a cell is at least this wide
MARGIN = 34  # label strip on every side
GRID_LINE = (255, 0, 255, 150)
GRID_LINE_MAJOR = (255, 0, 255, 230)  # every fifth line, to count by eye
LABEL_COLOR = (0, 0, 0, 255)
MARGIN_COLOR = (255, 255, 255, 255)

SKIP_PARTS = {"_grid", "ContactSheets", "BW Party"}
SKIP_NAMES = {"_tower_of_ashes_free_game_jam_tiles_by_pikachumazzinga_di8kbz2.png"}

# Short names for the top-level sheets; everything else is named from its folder path.
TOP_LEVEL_NAMES = {
    "black2_lower_screen_battle_system_rip_extra_by_pikachumazzinga_d55ba2t.png": "b2-lower",
    "black_2_and_white_2_upper_screen_battle_system_rip_by_pikachumazzinga_d6b33ld.png": "b2-upper",
    "DS _ DSi - Pokemon Black 2 _ White 2 - Miscellaneous - HP Bars.png": "b2-hpbars",
    "DS _ DSi - Pokemon Black _ White - Miscellaneous - Game Icons.png": "bw-icons",
    "DS _ DSi - Pokemon Black _ White - Miscellaneous - Options Screen.png": "bw-options",
    "DS _ DSi - Pokemon Black _ White - Miscellaneous - Party Screen.png": "bw-party",
}
FOLDER_NAMES = {
    "pokedexbg": "dex",
    "pokedexEntry": "",
    "Area": "area",
    "Cry": "cry",
    "Forms": "forms",
    "Info": "info",
    "Search Mode": "search",
    "Order Name Type Color Form": "order",
    "Top Screen": "top",
}


def short_name(relative_path):
    if relative_path.as_posix() in TOP_LEVEL_NAMES:
        return TOP_LEVEL_NAMES[relative_path.as_posix()]
    folder_parts = [FOLDER_NAMES.get(part, part.lower().replace(" ", "_")) for part in relative_path.parent.parts]
    file_part = relative_path.stem.lower().replace(" ", "_")
    return "-".join(part for part in folder_parts + [file_part] if part)


def column_label(index):
    label = ""
    index += 1
    while index:
        index, remainder = divmod(index - 1, 26)
        label = chr(65 + remainder) + label
    return label


def pick_cell_size(width):
    for size in CELL_SIZES:
        if -(-width // size) <= MAX_COLUMNS:
            return size
    return CELL_SIZES[-1]


def load_font(size):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # Pillow before 10.1 has only the small bitmap font
        return ImageFont.load_default()


def draw_grid(source_file, target_file):
    art = Image.open(source_file).convert("RGBA")
    cell = pick_cell_size(art.width)
    scale = max(1, -(-MIN_CELL_ON_SCREEN // cell))
    art = art.resize((art.width * scale, art.height * scale), Image.NEAREST)
    cell_on_screen = cell * scale
    columns = -(-art.width // cell_on_screen)
    rows = -(-art.height // cell_on_screen)

    sheet = Image.new("RGBA", (art.width + 2 * MARGIN, art.height + 2 * MARGIN), MARGIN_COLOR)
    checker = Image.new("RGBA", art.size, (200, 200, 200, 255))  # grey behind see-through pixels
    sheet.paste(Image.alpha_composite(checker, art), (MARGIN, MARGIN))

    overlay = Image.new("RGBA", sheet.size, (0, 0, 0, 0))
    pen = ImageDraw.Draw(overlay)
    font = load_font(16)
    for column in range(columns + 1):
        x = MARGIN + min(column * cell_on_screen, art.width)
        pen.line([(x, MARGIN), (x, MARGIN + art.height)], GRID_LINE_MAJOR if column % 5 == 0 else GRID_LINE, 1)
    for row in range(rows + 1):
        y = MARGIN + min(row * cell_on_screen, art.height)
        pen.line([(MARGIN, y), (MARGIN + art.width, y)], GRID_LINE_MAJOR if row % 5 == 0 else GRID_LINE, 1)
    sheet = Image.alpha_composite(sheet, overlay)

    labels = ImageDraw.Draw(sheet)
    for column in range(columns):
        x = MARGIN + column * cell_on_screen + cell_on_screen // 2
        for y in (MARGIN // 2, sheet.height - MARGIN // 2):
            labels.text((x, y), column_label(column), fill=LABEL_COLOR, font=font, anchor="mm")
    for row in range(rows):
        y = MARGIN + row * cell_on_screen + cell_on_screen // 2
        for x in (MARGIN // 2, sheet.width - MARGIN // 2):
            labels.text((x, y), str(row + 1), fill=LABEL_COLOR, font=font, anchor="mm")

    sheet.convert("RGB").save(target_file)
    return {"cell": cell, "scale": scale, "columns": columns, "rows": rows}


def main():
    OUT_DIR.mkdir(exist_ok=True)
    for old_file in OUT_DIR.glob("*.png"):
        old_file.unlink()

    sources = sorted(
        path
        for path in RIP_DIR.rglob("*")
        if path.is_file()
        and path.suffix.lower() == ".png"
        and not SKIP_PARTS.intersection(path.relative_to(RIP_DIR).parts)
        and path.name not in SKIP_NAMES
    )

    written = {}  # pixel hash -> entry
    entries = []
    for source in sources:
        relative = source.relative_to(RIP_DIR)
        with Image.open(source) as image:
            if max(image.size) < MIN_SIDE:
                continue
            pixel_hash = hashlib.sha1(image.convert("RGBA").tobytes() + str(image.size).encode()).hexdigest()
            size = image.size
        if pixel_hash in written:
            written[pixel_hash]["aliases"].append(relative.as_posix())
            continue
        name = short_name(relative)
        grid = draw_grid(source, OUT_DIR / (name + ".png"))
        entry = {"name": name, "source": relative.as_posix(), "size": size, "aliases": [], **grid}
        written[pixel_hash] = entry
        entries.append(entry)

    lines = [
        "# Gridded B/W UI rips",
        "",
        "Generated by `tools/grid_rips.py` (rerun it after adding rips). Name a spot as `<short name> <column><row>`,",
        'for example "b2-lower K7". Columns are letters, rows are numbers, from the top left. Cell size is in the',
        "original art's pixels; small art is enlarged so each cell is readable.",
        "",
        "| Short name | Original file | Size | Cell | Grid |",
        "| --- | --- | --- | --- | --- |",
    ]
    for entry in entries:
        width, height = entry["size"]
        source = entry["source"]
        if entry["aliases"]:
            source += "<br>same image: " + ", ".join(entry["aliases"])
        lines.append(
            f"| `{entry['name']}` | {source} | {width}x{height} | {entry['cell']} px |"
            f" A to {column_label(entry['columns'] - 1)}, 1 to {entry['rows']} |"
        )
    (OUT_DIR / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print(f"grid_rips: {len(entries)} gridded images in {OUT_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
