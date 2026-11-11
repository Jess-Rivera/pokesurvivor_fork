"""tools/status_icon_preview.py: preview the twelve on-sprite status icons (#71, docs/HUD-STYLE.md "On-sprite status icons").

Cuts the reference rows out of the ripped Rescue Team sheet (assets/raw/PMDRR status.png), draws the new pieces
(paralysis lightning wrap, haste arrow, the text Z's for sleep and drowsy) and writes, into a git-ignored folder since
most of it is ripped art:
    status_icons_sheet.png   every status's frames in a row, labelled, at 3x
    status_icons_1x.png      the same frames at 1x, unlabelled, plus status_icons.json with each frame's rectangle
    status_icons_preview.gif all twelve animating on a Pikachu, at 3x
The ripped rows are reference for the look only: the shipped icons get redrawn as original art (HUD-STYLE).
Usage: python tools/status_icon_preview.py
"""

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SHEET_PATH = ROOT / "assets" / "raw" / "PMDRR status.png"
CONFUSION_BIRDS_PATH = ROOT / "assets" / "raw" / "confuse-birds.png"  # Jess's fix of the sheet's birds row
CONFUSION_FRAME_SIZE = (32, 16)
POKEMON_IDLE_PATH = ROOT / "assets" / "pokemon" / "25" / "Idle.png"
OUT_FOLDER = ROOT / "assets" / "sprite extraction attempt" / "status_preview"

SHEET_BACKGROUND = (0, 120, 144)
SHEET_LEFT = 104  # the status rows start here; cells are 16 px apart (the ice block uses 32)
OUTLINE = (0, 0, 0, 255)
PREVIEW_SCALE = 3
TICK_MS = 50  # the GIF's frame length; every status picks its own frame from the shared clock
PREVIEW_LENGTH_MS = 4800
TILE_WIDTH, TILE_HEIGHT = 76, 88
TILE_BACKGROUND = (44, 50, 62)
POKEMON_FRAME_WIDTH, POKEMON_FRAME_HEIGHT = 40, 56  # Pikachu Idle, from js/data/sprites-meta.js
POKEMON_IDLE_TICKS = [40, 2, 3, 3, 3, 2]  # game frames (1/60 s)


def hex_colour(text, alpha=255):
    text = text.lstrip("#")
    return (int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16), alpha)


def cut_row(sheet, top, bottom, cell_width=16):
    """Every non-empty cell of one sheet row, as RGBA frames with the sheet's teal made transparent."""
    frames = []
    left = SHEET_LEFT
    while left + cell_width <= sheet.width:
        cell = sheet.crop((left, top, left + cell_width, bottom)).convert("RGBA")
        pixels = [(0, 0, 0, 0) if pixel[:3] == SHEET_BACKGROUND else pixel for pixel in cell.get_flattened_data()]
        cell.putdata(pixels)
        if cell.getbbox() is not None:
            frames.append(cell)
        left += cell_width
    return frames


def load_confusion_birds():
    """The four-bird frames from confuse-birds.png. The strip's frames are split by full-height black columns at
    uneven spacing, so each frame is re-centred: the middle of its four birds (its bounding box, since they sit evenly
    round the circle) goes to the middle of a 32 x 16 cell."""
    strip = Image.open(CONFUSION_BIRDS_PATH).convert("RGBA")
    width, height = strip.size
    separators = {x for x in range(width) if all(strip.getpixel((x, y))[:3] == (0, 0, 0) for y in range(height))}
    spans = []
    start = 0
    for x in range(width + 1):
        if x == width or x in separators:
            if x > start:
                spans.append((start, x))
            start = x + 1
    frames = []
    cell_width, cell_height = CONFUSION_FRAME_SIZE
    for left, right in spans:
        piece = strip.crop((left, 0, right, height))
        piece.putdata(
            [(0, 0, 0, 0) if pixel[:3] == SHEET_BACKGROUND else pixel for pixel in piece.get_flattened_data()]
        )
        box = piece.getbbox()
        if box is None:
            continue
        birds = piece.crop(box)
        cell = Image.new("RGBA", CONFUSION_FRAME_SIZE, (0, 0, 0, 0))
        cell.alpha_composite(birds, ((cell_width - birds.width) // 2, (cell_height - birds.height) // 2))
        frames.append(cell)
    return frames


def recolour(frame, colour_map):
    out = frame.copy()
    out.putdata(
        [
            colour_map.get(pixel[:3], pixel[:3]) + (pixel[3],) if pixel[3] else pixel
            for pixel in frame.get_flattened_data()
        ]
    )
    return out


def tint_by_lightness(frame, ramp):
    """Maps every non-outline pixel onto ramp (darkest first) by its lightness."""
    out = frame.copy()
    tinted = []
    for pixel in frame.get_flattened_data():
        if pixel[3] == 0 or pixel[:3] == (0, 0, 0):
            tinted.append(pixel)
            continue
        lightness = sum(pixel[:3]) / (3 * 255)
        index = min(len(ramp) - 1, int(lightness * len(ramp)))
        tinted.append(ramp[index][:3] + (pixel[3],))
    out.putdata(tinted)
    return out


def add_outline(layer):
    """A 1 px black outline on every transparent pixel that touches a coloured one (4 neighbours)."""
    width, height = layer.size
    source = layer.load()
    out = layer.copy()
    target = out.load()
    for y in range(height):
        for x in range(width):
            if source[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height and source[nx, ny][3]:
                    target[x, y] = OUTLINE
                    break
    return out


# ---------- new drawings ----------

PARALYSIS_CORE = hex_colour("#f0e800")
PARALYSIS_EDGE = hex_colour("#d8b000")
PARALYSIS_DEEP = hex_colour("#a06800")
HIGHLIGHT = hex_colour("#f0f0f0")


def draw_line(pixels, start, end, colour, size):
    x0, y0 = start
    x1, y1 = end
    steps = max(abs(x1 - x0), abs(y1 - y0), 1)
    for step in range(steps + 1):
        x = round(x0 + (x1 - x0) * step / steps)
        y = round(y0 + (y1 - y0) * step / steps)
        if 0 <= x < size[0] and 0 <= y < size[1]:
            pixels[x, y] = colour


def paralysis_frames(frame_count=4, size=(40, 28), radius_x=14, radius_y=5):
    """Lightning wrapped round the body: two jagged arcs on an ellipse, turning and re-jagging each frame.
    Returns (back layer, front layer) per frame; the back half draws behind the Pokemon, the front half over it."""
    frames = []
    centre_x, centre_y = size[0] // 2, size[1] // 2
    for frame_index in range(frame_count):
        layers = []
        for front in (False, True):
            layer = Image.new("RGBA", size, (0, 0, 0, 0))
            pixels = layer.load()
            bends = []
            for arc in range(2):
                start_angle = arc * math.pi + frame_index * (math.pi / 4)
                points = []
                for step in range(9):
                    angle = start_angle + step * (math.pi * 0.8 / 8)
                    jag = (2 if (step + frame_index + arc) % 2 else -2) if 0 < step < 8 else 0
                    x = centre_x + (radius_x + jag) * math.cos(angle)
                    y = centre_y + (radius_y + jag * 0.6) * math.sin(angle)
                    points.append((round(x), round(y), math.sin(angle) >= 0))
                for (x0, y0, front0), (x1, y1, front1) in zip(points, points[1:]):
                    if (front0 and front1) != front:
                        continue
                    draw_line(pixels, (x0, y0 + 1), (x1, y1 + 1), PARALYSIS_EDGE if front else PARALYSIS_DEEP, size)
                    draw_line(pixels, (x0, y0), (x1, y1), PARALYSIS_CORE if front else PARALYSIS_EDGE, size)
                    bends.append((x0, y0))
            layer = add_outline(layer)
            if front:
                pixels = layer.load()
                for x, y in bends[::3]:
                    if 0 <= x < size[0] and 0 <= y < size[1]:
                        pixels[x, y] = HIGHLIGHT
            layers.append(layer)
        frames.append(tuple(layers))
    return frames


Z_GLYPHS = {
    "large": ["########", "########", "....###.", "...###..", "..###...", ".###....", "########", "########"],
    "medium": ["######", "######", "...##.", "..##..", ".##...", "######", "######"],
    "small": ["#####", "#####", "..##.", ".##..", "#####", "#####"],
}


def z_glyph(size_name, fill, highlight):
    rows = Z_GLYPHS[size_name]
    glyph = Image.new("RGBA", (len(rows[0]) + 2, len(rows) + 2), (0, 0, 0, 0))
    pixels = glyph.load()
    for y, row in enumerate(rows):
        for x, mark in enumerate(row):
            if mark == "#":
                pixels[x + 1, y + 1] = highlight if y < 1 else fill
    return add_outline(glyph)


# ---------- status table ----------


def build_statuses(sheet):
    birds = load_confusion_birds()
    question = cut_row(sheet, 48, 64)
    cross = cut_row(sheet, 66, 79)
    fire = cut_row(sheet, 111, 128)
    ice = cut_row(sheet, 145, 176, cell_width=32)
    arrow = cut_row(sheet, 193, 208)
    skull = cut_row(sheet, 248, 264)

    poison_ramp = [hex_colour(c) for c in ("#6b2942", "#a82fb0", "#d631de", "#f0b0f0")]
    bad_poison_ramp = [hex_colour(c) for c in ("#391042", "#6b2380", "#a82fb0", "#d631de")]
    haste_map = {
        (160, 104, 0): (0, 96, 176),
        (216, 176, 0): (24, 152, 216),
        (240, 232, 0): (136, 216, 240),
    }
    haste = [recolour(frame, haste_map).transpose(Image.Transpose.FLIP_TOP_BOTTOM) for frame in arrow]

    trap_rest_ms = 900
    return [
        {"name": "Burn", "kind": "major", "frames": fire, "frameMs": 100, "place": "above head"},
        {
            "name": "Poison",
            "kind": "major",
            "frames": [tint_by_lightness(f, poison_ramp) for f in skull],
            "frameMs": 100,
            "place": "above head",
        },
        {
            "name": "Bad poison",
            "kind": "major",
            "frames": [tint_by_lightness(f, bad_poison_ramp) for f in skull],
            "frameMs": 80,
            "place": "above head",
        },
        {"name": "Paralysis", "kind": "major", "layered": paralysis_frames(), "frameMs": 70, "place": "around body"},
        {"name": "Sleep", "kind": "major", "text": "sleep", "place": "above head"},
        {"name": "Freeze", "kind": "major", "frames": ice, "frameMs": 140, "place": "over body"},
        {"name": "Confusion", "kind": "minor", "frames": birds, "frameMs": 120, "place": "circling head"},
        {"name": "Daze", "kind": "minor", "frames": question, "frameMs": 80, "place": "above head"},
        {
            "name": "Trap",
            "kind": "minor",
            "frames": cross,
            "frameMs": 60,
            "restMs": trap_rest_ms,
            "place": "above head",
        },
        {"name": "Drowsy", "kind": "minor", "text": "drowsy", "place": "above head"},
        {"name": "Slow", "kind": "minor", "frames": arrow, "frameMs": 80, "place": "above head"},
        {"name": "Haste", "kind": "minor", "frames": haste, "frameMs": 80, "place": "above head"},
    ]


SLEEP_FILL, SLEEP_HIGHLIGHT = hex_colour("#d83860"), hex_colour("#f0c0d0")
DROWSY_FILL, DROWSY_HIGHLIGHT = hex_colour("#9a8fd8"), hex_colour("#d4ceff")
SLEEP_PERIOD_MS = 1800
DROWSY_PERIOD_MS = 2600


def text_z_layer(status_kind, time_ms, size=(44, 44)):
    """Sleep: three Z's of growing size rising one after another. Drowsy: one small z, slower."""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    if status_kind == "sleep":
        letters = [("small", 0.0), ("medium", 1 / 3), ("large", 2 / 3)]
        period, fill, highlight = SLEEP_PERIOD_MS, SLEEP_FILL, SLEEP_HIGHLIGHT
    else:
        letters = [("medium", 0.0)]
        period, fill, highlight = DROWSY_PERIOD_MS, DROWSY_FILL, DROWSY_HIGHLIGHT
    for size_name, offset in letters:
        phase = (time_ms / period + offset) % 1
        glyph = z_glyph(size_name, fill, highlight)
        alpha = math.sin(phase * math.pi)
        faded = glyph.copy()
        faded.putalpha(glyph.getchannel("A").point(lambda value, a=alpha: int(value * a)))
        x = round(size[0] / 2 - 6 + phase * 14)
        y = round(size[1] - glyph.height - phase * 30)
        layer.alpha_composite(faded, (x, y))
    return layer


def frame_at(status, time_ms):
    """(back layer or None, front layer) for this status at this moment."""
    if "text" in status:
        return None, text_z_layer(status["text"], time_ms)
    if "layered" in status:
        index = int(time_ms // status["frameMs"]) % len(status["layered"])
        return status["layered"][index]
    frames = status["frames"]
    cycle_ms = status["frameMs"] * len(frames) + status.get("restMs", 0)
    local_ms = time_ms % cycle_ms
    index = (
        min(len(frames) - 1, int(local_ms // status["frameMs"])) if local_ms < status["frameMs"] * len(frames) else 0
    )
    return None, frames[index]


# ---------- outputs ----------


def label_font(size):
    for name in ("arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def sheet_frames(status):
    if "text" in status:
        period = SLEEP_PERIOD_MS if status["text"] == "sleep" else DROWSY_PERIOD_MS
        return [text_z_layer(status["text"], period * step / 8) for step in range(8)]
    if "layered" in status:
        merged = []
        for back, front in status["layered"]:
            frame = back.copy()
            frame.alpha_composite(front)
            merged.append(frame)
        return merged
    return status["frames"]


def write_sheets(statuses):
    rows = [(status, sheet_frames(status)) for status in statuses]
    cell_width = max(frame.width for _, frames in rows for frame in frames)
    row_heights = [max(frame.height for frame in frames) for _, frames in rows]
    column_count = max(len(frames) for _, frames in rows)

    plain = Image.new("RGBA", (cell_width * column_count, sum(row_heights)), (0, 0, 0, 0))
    rectangles = {}
    y = 0
    for (status, frames), height in zip(rows, row_heights):
        rectangles[status["name"]] = []
        for column, frame in enumerate(frames):
            x = column * cell_width
            plain.alpha_composite(frame, (x, y))
            rectangles[status["name"]].append([x, y, frame.width, frame.height])
        y += height
    plain.save(OUT_FOLDER / "status_icons_1x.png")
    (OUT_FOLDER / "status_icons.json").write_text(json.dumps(rectangles, indent=1), encoding="utf-8", newline="\n")

    margin = 120
    scaled = plain.resize((plain.width * PREVIEW_SCALE, plain.height * PREVIEW_SCALE), Image.Resampling.NEAREST)
    labelled = Image.new("RGBA", (scaled.width + margin, scaled.height + 8 * len(rows)), TILE_BACKGROUND + (255,))
    draw = ImageDraw.Draw(labelled)
    font = label_font(14)
    y = 0
    for (status, frames), height in zip(rows, row_heights):
        row_height = height * PREVIEW_SCALE
        if y:
            draw.line([(0, y - 4), (labelled.width, y - 4)], fill=(70, 78, 92, 255))
        draw.text((8, y + row_height // 2 - 8), status["name"], fill=(235, 235, 235, 255), font=font)
        y += row_height + 8
    # paste rows one by one so the gaps line up with the labels
    y_source = 0
    y_target = 0
    for height in row_heights:
        band = scaled.crop((0, y_source, scaled.width, y_source + height * PREVIEW_SCALE))
        labelled.alpha_composite(band, (margin, y_target))
        y_source += height * PREVIEW_SCALE
        y_target += height * PREVIEW_SCALE + 8
    labelled.save(OUT_FOLDER / "status_icons_sheet.png")


def pokemon_frame(time_ms):
    sheet = Image.open(POKEMON_IDLE_PATH).convert("RGBA")
    total_ticks = sum(POKEMON_IDLE_TICKS)
    tick = int(time_ms / (1000 / 60)) % total_ticks
    index = 0
    while tick >= POKEMON_IDLE_TICKS[index]:
        tick -= POKEMON_IDLE_TICKS[index]
        index += 1
    return sheet.crop((index * POKEMON_FRAME_WIDTH, 0, (index + 1) * POKEMON_FRAME_WIDTH, POKEMON_FRAME_HEIGHT))


def place(layer, place_name, body_box, tile_origin):
    left, top, right, bottom = body_box
    centre_x = (left + right) // 2
    if place_name in ("around body", "over body"):
        centre_y = (top + bottom) // 2 + (2 if place_name == "around body" else 0)
        return tile_origin[0] + centre_x - layer.width // 2, tile_origin[1] + centre_y - layer.height // 2
    if place_name == "circling head":  # the circle's middle sits just above the top of the head
        return tile_origin[0] + centre_x - layer.width // 2, tile_origin[1] + top - 3 - layer.height // 2
    return tile_origin[0] + centre_x - layer.width // 2, tile_origin[1] + top - layer.height - 1


def write_preview_gif(statuses):
    columns = 4
    rows = math.ceil(len(statuses) / columns)
    label_band = 14
    font = label_font(13)
    gif_frames = []
    sprite_offset = ((TILE_WIDTH - POKEMON_FRAME_WIDTH) // 2, TILE_HEIGHT - POKEMON_FRAME_HEIGHT - label_band // 2)
    for time_ms in range(0, PREVIEW_LENGTH_MS, TICK_MS):
        canvas = Image.new("RGBA", (columns * TILE_WIDTH, rows * TILE_HEIGHT), TILE_BACKGROUND + (255,))
        pokemon = pokemon_frame(time_ms)
        body_box = pokemon.getbbox()
        for index, status in enumerate(statuses):
            origin = ((index % columns) * TILE_WIDTH, (index // columns) * TILE_HEIGHT)
            sprite_origin = (origin[0] + sprite_offset[0], origin[1] + sprite_offset[1])
            back, front = frame_at(status, time_ms)
            if back is not None:
                canvas.alpha_composite(back, place(back, status["place"], body_box, sprite_origin))
            canvas.alpha_composite(pokemon, sprite_origin)
            canvas.alpha_composite(front, place(front, status["place"], body_box, sprite_origin))
        big = canvas.resize((canvas.width * PREVIEW_SCALE, canvas.height * PREVIEW_SCALE), Image.Resampling.NEAREST)
        draw = ImageDraw.Draw(big)
        for index, status in enumerate(statuses):
            x = (index % columns) * TILE_WIDTH * PREVIEW_SCALE + 8
            y = ((index // columns) + 1) * TILE_HEIGHT * PREVIEW_SCALE - 20
            draw.text((x, y), f"{status['name']} ({status['kind']})", fill=(235, 235, 235, 255), font=font)
        for column in range(1, columns):
            draw.line(
                [(column * TILE_WIDTH * PREVIEW_SCALE, 0), (column * TILE_WIDTH * PREVIEW_SCALE, big.height)],
                fill=(70, 78, 92, 255),
            )
        for row in range(1, rows):
            draw.line(
                [(0, row * TILE_HEIGHT * PREVIEW_SCALE), (big.width, row * TILE_HEIGHT * PREVIEW_SCALE)],
                fill=(70, 78, 92, 255),
            )
        gif_frames.append(big.convert("RGB"))
    gif_frames[0].save(
        OUT_FOLDER / "status_icons_preview.gif", save_all=True, append_images=gif_frames[1:], duration=TICK_MS, loop=0
    )


def main():
    OUT_FOLDER.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(SHEET_PATH).convert("RGB")
    statuses = build_statuses(sheet)
    for status in statuses:
        count = len(status.get("frames") or status.get("layered") or [])
        print(f"{status['name']}: {count or 'text'} frames")
    write_sheets(statuses)
    write_preview_gif(statuses)
    print(f"written to {OUT_FOLDER}")


if __name__ == "__main__":
    main()
