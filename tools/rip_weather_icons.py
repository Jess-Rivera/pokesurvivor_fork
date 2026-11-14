"""tools/rip_weather_icons.py: cut the weather sheet into one transparent icon per weather, circle only (no label).

Reads assets/icons/weather/unofficial/weather-sheet.png (6 columns by 5 rows of coloured circles, each with its name printed
under it) and writes assets/icons/weather/unofficial/<name>.png for every circle, cropped to the circle's own bounds.
The circles are found from the sheet itself: a row of circles is a horizontal band of opaque pixels taller than
MIN_CIRCLE_SIDE (the label lines under it are much shorter), and inside that band each opaque column run is one circle.
Also writes unofficial/_contact.png, every cut icon on a grey board with its file name, to check the cut by eye.
Usage: python tools/rip_weather_icons.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
WEATHER_DIR = ROOT / "assets" / "icons" / "weather" / "unofficial"
SHEET = WEATHER_DIR / "weather-sheet.png"
CONTACT = WEATHER_DIR / "_contact.png"

MIN_CIRCLE_SIDE = 100  # an opaque band at least this tall is a row of circles, not a label line

# Reading order on the sheet, left to right, top to bottom.
NAMES = [
    "harsh-sunlight", "rain", "pollen-season", "thunder-gust", "holy-grounds", "high-winds",
    "locust-swarm", "acid-rain", "blood-moon", "soul-storm", "hail-snow", "dust-storm",
    "sand-storm", "rust-storm", "starlit-sky", "aura-field", "dragon-force", "pink-moon",
    "glitch", "crystal-rain", "fog", "diamond-dust", "shadowy-aura", "full-moon",
    "green-flash", "eclipse", "paint-rain", "dream-mist", "mirage-veil", "resonant-revel",
]  # fmt: skip


def opaque_runs(counts, min_length=1):
    """Start and end (exclusive) of every run of non-zero counts at least min_length long."""
    runs, start = [], None
    for index, count in enumerate(list(counts) + [0]):
        if count and start is None:
            start = index
        elif not count and start is not None:
            if index - start >= min_length:
                runs.append((start, index))
            start = None
    return runs


def main():
    sheet = Image.open(SHEET).convert("RGBA")
    alpha = sheet.getchannel("A")
    width, height = sheet.size
    opaque = alpha.load()

    row_counts = [sum(1 for x in range(width) if opaque[x, y]) for y in range(height)]
    circle_rows = opaque_runs(row_counts, MIN_CIRCLE_SIDE)

    boxes = []
    for top, bottom in circle_rows:
        column_counts = [sum(1 for y in range(top, bottom) if opaque[x, y]) for x in range(width)]
        for left, right in opaque_runs(column_counts):
            boxes.append((left, top, right, bottom))

    if len(boxes) != len(NAMES):
        raise SystemExit(f"found {len(boxes)} circles, expected {len(NAMES)}; the sheet layout changed")

    icons = []
    for name, box in zip(NAMES, boxes):
        icon = sheet.crop(box)
        icon = icon.crop(icon.getbbox())  # trim any clear edge the band left
        icon.save(WEATHER_DIR / f"{name}.png")
        icons.append((name, icon))
        print(f"{name}.png  {icon.size[0]}x{icon.size[1]}  from {box}")

    cell = max(max(icon.size) for _, icon in icons) + 20
    columns = 6
    board = Image.new("RGBA", (columns * cell, (len(icons) + columns - 1) // columns * (cell + 14)), (60, 60, 60, 255))
    draw = ImageDraw.Draw(board)
    for index, (name, icon) in enumerate(icons):
        x, y = index % columns * cell, index // columns * (cell + 14)
        board.alpha_composite(icon, (x + 10, y + 10))
        draw.text((x + 10, y + cell - 4), name, fill=(255, 255, 255, 255))
    board.save(CONTACT)
    print(f"contact sheet: {CONTACT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
