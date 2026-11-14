"""tools/status_icon_split.py: split the #71 status icon sheet into one GIF and one sprite sheet per status.

Reads status_icons_1x.png and status_icons.json (written by tools/status_icon_preview.py) from the git-ignored
assets/sprite extraction attempt/status_preview/ and writes into its split/ subfolder, per status:
    <name>.gif         the animation at 1x, looping, with the preview's frame timings
    <name>_sheet.png   the same frames left to right in equal cells (full alpha, unlike the GIF)
    <name>.json        frame size, frame count and each frame's duration in ms, for the sheet
GIFs only have on/off transparency, so pixels under half alpha drop out (the sleep and drowsy fades lose their soft
edges there); the sheets keep the exact alpha. Timings mirror the statuses list in tools/status_icon_preview.py.
Usage: python tools/status_icon_split.py
"""

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PREVIEW_FOLDER = ROOT / "assets" / "sprite extraction attempt" / "status_preview"
SOURCE_SHEET = PREVIEW_FOLDER / "status_icons_1x.png"
SOURCE_RECTANGLES = PREVIEW_FOLDER / "status_icons.json"
OUT_FOLDER = PREVIEW_FOLDER / "split"
GIF_ALPHA_CUTOFF = 128
TRANSPARENT_INDEX = 255

# Same numbers as tools/status_icon_preview.py. Sleep and drowsy are eight samples of their period.
FRAME_MS = {
    "Burn": 100,
    "Poison": 100,
    "Bad poison": 80,
    "Paralysis": 70,
    "Sleep": 1800 / 8,
    "Freeze": 140,
    "Confusion": 120,
    "Daze": 80,
    "Trap": 60,
    "Drowsy": 2600 / 8,
    "Slow": 80,
    "Haste": 80,
}
# Trap rests on its first frame between swipes, so that frame holds for its own length plus the rest.
FIRST_FRAME_REST_MS = {"Trap": 900}


def file_stem(status_name):
    return status_name.lower().replace(" ", "_")


def frame_durations(status_name, frame_count):
    durations = [round(FRAME_MS[status_name])] * frame_count
    durations[0] += FIRST_FRAME_REST_MS.get(status_name, 0)
    return durations


def to_gif_frame(frame):
    """RGBA frame to a palette frame whose index 255 is transparent."""
    paletted = frame.convert("RGB").quantize(colors=255, dither=Image.Dither.NONE)
    palette = paletted.getpalette()[: 255 * 3]
    paletted.putpalette(palette + [0, 0, 0])
    hidden = frame.getchannel("A").point(lambda alpha: 255 if alpha < GIF_ALPHA_CUTOFF else 0)
    paletted.paste(TRANSPARENT_INDEX, mask=hidden)
    paletted.info["transparency"] = TRANSPARENT_INDEX
    return paletted


def main():
    sheet = Image.open(SOURCE_SHEET).convert("RGBA")
    rectangles = json.loads(SOURCE_RECTANGLES.read_text(encoding="utf-8"))
    OUT_FOLDER.mkdir(exist_ok=True)

    for status_name, frame_rectangles in rectangles.items():
        frames = [sheet.crop((x, y, x + width, y + height)) for x, y, width, height in frame_rectangles]
        frame_width = max(frame.width for frame in frames)
        frame_height = max(frame.height for frame in frames)
        durations = frame_durations(status_name, len(frames))
        stem = file_stem(status_name)

        gif_frames = [to_gif_frame(frame) for frame in frames]
        gif_frames[0].save(
            OUT_FOLDER / f"{stem}.gif",
            save_all=True,
            append_images=gif_frames[1:],
            duration=durations,
            loop=0,
            disposal=2,
            transparency=TRANSPARENT_INDEX,
            optimize=False,
        )

        strip = Image.new("RGBA", (frame_width * len(frames), frame_height), (0, 0, 0, 0))
        for column, frame in enumerate(frames):
            strip.alpha_composite(frame, (column * frame_width, 0))
        strip.save(OUT_FOLDER / f"{stem}_sheet.png")

        layout = {
            "status": status_name,
            "image": f"{stem}_sheet.png",
            "frameWidth": frame_width,
            "frameHeight": frame_height,
            "frameCount": len(frames),
            "frameMs": durations,
        }
        (OUT_FOLDER / f"{stem}.json").write_text(json.dumps(layout, indent=1) + "\n", encoding="utf-8", newline="\n")
        print(f"{status_name}: {len(frames)} frames of {frame_width} x {frame_height}, {sum(durations)} ms loop")


if __name__ == "__main__":
    main()
