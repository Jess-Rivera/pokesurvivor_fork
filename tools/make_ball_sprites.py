"""tools/make_ball_sprites.py: cuts the in-run Poke Ball sheet into one animation strip per ball, plus the frame map.

Source: assets/icons/pokeball/in-run-pokeballs.png (Black/White in-battle balls, 17 columns, one per ball, 17 rows of
frames). Every ball is cut, not only the ones the game uses today (Jess, 2026-11-16: later features need them).
Writes:
  assets/icons/pokeball/balls/<ball>.png   one row of 17 frames, FRAME x FRAME pixels each, the teal background clear
  js/data/ball-sprites.js                  G.BALL_SPRITES: the frame size, the strip paths, the named animations and
                                           each frame's centreShift (#128 S6): the shift in whole art px that puts the
                                           ball's filled pixels, not its frame, in the middle (js/ui/hud-kit-items.js
                                           BallSprite applies it)
The frame map is a JS file, not JSON, because the game runs from file:// where a page cannot fetch a JSON file.
Frame rows on the sheet (read by eye, 2026-11-16): 0 the front face, 0 to 9 one full forward tumble (the spin), 10 open,
11 to 13 tilting left (small, more, most), 14 to 16 tilting right (small, more, most).

Usage from the repo root:  python tools/make_ball_sprites.py           (writes the strips and the frame map)
                           python tools/make_ball_sprites.py --check   (exit 1 when an output is missing or out of date)
"""

import io
import math
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / "assets" / "icons" / "pokeball" / "in-run-pokeballs.png"
STRIP_DIR = ROOT / "assets" / "icons" / "pokeball" / "balls"
FRAME_MAP = ROOT / "js" / "data" / "ball-sprites.js"

# The sheet's columns, left to right: mainline item order, then the Dream Ball (Gen 5).
BALL_IDS = [
    "master", "ultra", "great", "poke", "safari", "net", "dive", "nest", "repeat",
    "timer", "luxury", "premier", "dusk", "heal", "quick", "cherish", "dream",
]
FRAME = 32  # every frame's width and height in the strips; the largest sprite (the open ball) is 30 x 29
ROWS = 17
ROW_PITCH = 40  # the sheet's rows sit 40 px apart, the first frame centred at y 20
FIRST_ROW_CENTRE = 20
BACKGROUND_TOLERANCE = 30  # a pixel this close to the corner's teal (sum of channel differences) is background
CREDIT_TOP = 680  # the ripper's credit line starts below the last frame row
ANIMATIONS = {
    "front": [0],
    "spin": list(range(10)),
    "open": [10],
    # three side to side shakes, each out and back through the front face
    "wobble": [11, 12, 13, 12, 11, 0, 14, 15, 16, 15, 14, 0],
}


def is_background(pixel, background):
    return sum(abs(pixel[channel] - background[channel]) for channel in range(3)) < BACKGROUND_TOLERANCE


def column_centres(image, background):
    """The x centre of each ball column: runs of columns holding any non-background pixel above the credit line."""
    pixels = image.load()
    width = image.size[0]
    filled = [x for x in range(width) if any(not is_background(pixels[x, y], background) for y in range(CREDIT_TOP))]
    runs, start, previous = [], filled[0], filled[0]
    for x in filled[1:]:
        if x != previous + 1:
            runs.append((start, previous))
            start = x
        previous = x
    runs.append((start, previous))
    return [round((left + right) / 2) for left, right in runs]


def cut_strips():
    sheet = Image.open(SHEET).convert("RGBA")
    background = sheet.getpixel((0, 0))
    centres = column_centres(sheet, background)
    if len(centres) != len(BALL_IDS):
        raise SystemExit(f"expected {len(BALL_IDS)} ball columns on the sheet, found {len(centres)}")
    strips = {}
    for ball, centre_x in zip(BALL_IDS, centres):
        strip = Image.new("RGBA", (FRAME * ROWS, FRAME), (0, 0, 0, 0))
        for row in range(ROWS):
            centre_y = FIRST_ROW_CENTRE + ROW_PITCH * row
            left, top = centre_x - FRAME // 2, centre_y - FRAME // 2
            frame = sheet.crop((left, top, left + FRAME, top + FRAME))
            frame_pixels = frame.load()
            for y in range(FRAME):
                for x in range(FRAME):
                    if is_background(frame_pixels[x, y], background):
                        frame_pixels[x, y] = (0, 0, 0, 0)
            strip.paste(frame, (row * FRAME, 0))
        buffer = io.BytesIO()
        strip.save(buffer, format="PNG", optimize=True)
        strips[ball] = buffer.getvalue()
    return strips


def centre_shifts(strips):
    """Each frame's [x, y] shift in whole art px: the frame's centre minus the centre of its filled (opaque) box. Halves
    round up, as JavaScript's Math.round does (a 23 px tall ball sits half an art px low). An empty frame stays put."""
    shifts = {}
    for ball, data in strips.items():
        alpha = Image.open(io.BytesIO(data)).getchannel("A")
        frames = []
        for row in range(ROWS):
            box = alpha.crop((row * FRAME, 0, row * FRAME + FRAME, FRAME)).getbbox()
            if not box:
                frames.append((0, 0))
                continue
            left, top, right, bottom = box
            frames.append(
                tuple(math.floor(FRAME / 2 - (low + high) / 2 + 0.5) for low, high in ((left, right), (top, bottom)))
            )
        shifts[ball] = frames
    return shifts


def frame_map_text(shifts):
    lines = [
        "/* ============ ball-sprites.js, the in-run Poke Ball animation strips (G.BALL_SPRITES) ============",
        " * GENERATED by tools/make_ball_sprites.py from assets/icons/pokeball/in-run-pokeballs.png; do not edit by hand.",
        " * Each ball is one strip of `frames` frames, `size` x `size` px, left to right. animations: named frame lists.",
        " * centreShift: per ball, each frame's [x, y] shift in art px that centres its filled pixels in the frame.",
        " */",
        "G.BALL_SPRITES = {",
        f"  size: {FRAME},",
        f"  frames: {ROWS},",
        "  path: (ball) => 'assets/icons/pokeball/balls/' + ball + '.png',",
        "  balls: [" + ", ".join(f"'{ball}'" for ball in BALL_IDS) + "],",
        "  animations: {",
    ]
    for name, frames in ANIMATIONS.items():
        lines.append(f"    {name}: [{', '.join(str(frame) for frame in frames)}],")
    lines += ["  },", "  centreShift: {"]
    for ball, frames in shifts.items():
        lines.append(f"    {ball}: [{', '.join(f'[{x}, {y}]' for x, y in frames)}],")
    lines += ["  },", "};", ""]
    return "\n".join(lines)


def main():
    check = "--check" in sys.argv
    strips = cut_strips()
    text = frame_map_text(centre_shifts(strips))
    stale = [p for b, data in strips.items() if not (p := STRIP_DIR / f"{b}.png").exists() or p.read_bytes() != data]
    if not FRAME_MAP.exists() or FRAME_MAP.read_text(encoding="utf-8") != text:
        stale.append(FRAME_MAP)
    if check:
        if stale:
            print("ball sprites out of date: run python tools/make_ball_sprites.py")
            for path in stale:
                print("  " + str(path.relative_to(ROOT)))
            sys.exit(1)
        print(f"ball sprites are current ({len(strips)} balls)")
        return
    STRIP_DIR.mkdir(parents=True, exist_ok=True)
    for ball, data in strips.items():
        (STRIP_DIR / f"{ball}.png").write_bytes(data)
    FRAME_MAP.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {len(strips)} strips to {STRIP_DIR.relative_to(ROOT)} and {FRAME_MAP.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
