"""tools/gif_to_sheet.py: turn animated GIFs into a sprite sheet plus a JSON layout each.

For every .gif in the given folder (or every .gif path given), writes into <folder>/sheets/:
    <name>_sheet.png   the GIF's frames left to right in equal cells, transparent background
    <name>.json        frame size, frame count and each frame's duration in ms (the same layout
                       tools/status_icon_split.py writes)
Frames are taken as the GIF shows them (disposal and partial-frame updates applied), so each cell is a full frame.
Usage: python tools/gif_to_sheet.py "<folder>" [more folders or .gif files]
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageSequence

DEFAULT_FRAME_MS = 100  # used when a frame carries no duration


def gif_frames(gif_path):
    with Image.open(gif_path) as animation:
        frames, durations = [], []
        for frame in ImageSequence.Iterator(animation):
            durations.append(frame.info.get("duration") or DEFAULT_FRAME_MS)
            frames.append(frame.convert("RGBA").copy())
    return frames, durations


def write_sheet(gif_path, out_folder):
    frames, durations = gif_frames(gif_path)
    frame_width = max(frame.width for frame in frames)
    frame_height = max(frame.height for frame in frames)
    strip = Image.new("RGBA", (frame_width * len(frames), frame_height), (0, 0, 0, 0))
    for column, frame in enumerate(frames):
        strip.alpha_composite(frame, (column * frame_width, 0))
    stem = gif_path.stem
    strip.save(out_folder / f"{stem}_sheet.png")
    layout = {
        "source": gif_path.name,
        "image": f"{stem}_sheet.png",
        "frameWidth": frame_width,
        "frameHeight": frame_height,
        "frameCount": len(frames),
        "frameMs": durations,
    }
    (out_folder / f"{stem}.json").write_text(json.dumps(layout, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"{gif_path.name}: {len(frames)} frames of {frame_width} x {frame_height}, {sum(durations)} ms loop")


def main(arguments):
    if not arguments:
        print(__doc__)
        return 1
    for argument in arguments:
        path = Path(argument)
        gif_paths = sorted(path.glob("*.gif")) if path.is_dir() else [path]
        out_folder = (path if path.is_dir() else path.parent) / "sheets"
        out_folder.mkdir(exist_ok=True)
        for gif_path in gif_paths:
            write_sheet(gif_path, out_folder)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
