# /// script
# requires-python = ">=3.10,<3.14"
# dependencies = ["skytemple-files", "pillow"]
# ///
"""tools/wan_extract.py: export the effect animations in a PMD effect.bin pack to PNG sheets, GIFs and timing JSON.

Run with uv (it builds a Python 3.13 environment on first use; skytemple-rust has no ready-built wheel for 3.14):
    uv run tools/wan_extract.py "assets/sprite extraction attempt/<rom>.nds"
    uv run tools/wan_extract.py "assets/sprite extraction attempt/effect.bin"
    uv run tools/wan_extract.py <rom.nds or effect.bin> --out <folder> --entries 1-40,292

Given an Explorers of Sky .nds (any region), it reads effect.bin from inside the ROM and also writes:
    by_name.html          every move, item and trap with the effect GIFs it plays, under its English name
    animation_table.json  the same mapping as data (move/item/trap -> general effect -> effect.bin entry and animation)
The mapping lives in overlay 10 (the table SkyTemple's ExtractAnimData patch copies out to BALANCE/anim.bin).
A general effect of type WAN_FILE0, WAN_FILE1 or WAN_OTHER is effect.bin entry `anim_file`, animation `unk2`;
WAT points at an atlas entry, SCREEN and WBA at screen effects (not exported). A move's four slots, as checked by eye
on Thunderbolt, Flamethrower, Water Gun, Razor Leaf and Shadow Ball: 1 before the move, 2 the shared charge-up ring
on the user, 3 what travels to the target, 4 the hit on the target.
The ROM and everything exported from it stay out of git (.gitignore).

Output, per entry (folder effect_NNNN):
    anim_AA.png   one horizontal strip per animation, every cell the same size
    anim_AA.gif   the same animation at its real speed (game frames are 1/60 s)
    effect.json   per animation: cell size, the origin's position inside a cell, and per frame its duration in game frames
Plus index.html at the top of the output folder, a gallery of every GIF, to find which entry is which move.

Pack layout (Explorers of Sky effect.bin, 293 entries):
    0       the general effects (hit sparks, stat rings, ...): animations only, its images live in entry 292
    1-259   self-contained effect sprites (moves, statuses, items)
    260-267 atlas effects (image type 3): exported as one atlas.png, no frame data
    268-291 not sprites (screen effects, raw data): skipped
    292     the shared image bank and base palette
Entries whose palette starts at an offset are drawn over the base palette from entry 292.
"""

import argparse
import contextlib
import html
import io
import json
from pathlib import Path

from PIL import Image
from skytemple_files.common.types.file_types import FileType
from skytemple_files.graphics.effect_wan import sheets as effect_sheets
from skytemple_files.graphics.effect_wan.handler import EffectWanHandler
from skytemple_files.graphics.effect_wan.model import mergeWithBasePalette
from skytemple_files.graphics.effect_wan.sheets import (
    GenerateAtlas,
    GenerateFrame,
    GetPieceRect,
)

SHARED_IMAGE_BANK_ENTRY = 292  # holds the images entry 0 draws from, and the base palette
IMAGES_ONLY_ENTRY_PAIRS = {0: SHARED_IMAGE_BANK_ENTRY}  # animation-only entry -> entry holding its images
ATLAS_IMAGE_TYPE = 3
GAME_FRAME_MS = 1000 / 60
GIF_MIN_FRAME_MS = 20  # browsers slow GIF frames shorter than this down to 100 ms
GIF_BACKGROUND = (32, 32, 40)  # GIF has no partial alpha, so frames are flattened onto this
GALLERY_SCALE = 2

ROM_EFFECT_PACK_PATH = "EFFECT/effect.bin"
ROM_STRINGS_PATH = "MESSAGE/text_e.str"
# Where overlay 10 keeps the animation tables, per region, and the byte sizes of its five tables in order:
# trap, item, move, general, special move (same layout SkyTemple's ExtractAnimData patch uses).
ANIMATION_TABLE_START = {"NA": 0xAFD0, "EU": 0xAFE8, "JP": 0xAF18}
ANIMATION_TABLE_SIZES = (52, 5600, 13512, 19600)
ANIMATION_TABLE_TOTAL = 0x14560
WAN_GENERAL_TYPES = {"WAN_FILE0", "WAN_FILE1", "WAN_OTHER"}


# Drawing a piece is slow pure Python and frames reuse pieces, so the library's piece drawer is cached per entry.
uncached_generate_piece = effect_sheets.GeneratePiece
piece_cache = {}


def cached_generate_piece(is_256_color, image_data, palette, palette_index, block_offset, width, height):
    key = (palette_index, block_offset, width, height)
    if key not in piece_cache:
        piece_cache[key] = uncached_generate_piece(
            is_256_color, image_data, palette, palette_index, block_offset, width, height
        )
    piece = piece_cache[key]
    return piece.copy() if piece is not None else None


effect_sheets.GeneratePiece = cached_generate_piece


def signed_16(value):
    """Frame offsets are stored as unsigned 16-bit numbers; 65534 means -2."""
    return value - 0x10000 if value >= 0x8000 else value


def fix_frame_offsets(effect):
    for animation in effect.animData or []:
        for sequence_frame in animation:
            sequence_frame.offset = (signed_16(sequence_frame.offset[0]), signed_16(sequence_frame.offset[1]))


def parse_entry_list(text, entry_count):
    if not text:
        return list(range(entry_count))
    chosen = set()
    for part in text.split(","):
        if "-" in part:
            first, last = part.split("-")
            chosen.update(range(int(first), int(last) + 1))
        else:
            chosen.add(int(part))
    return sorted(index for index in chosen if 0 <= index < entry_count)


def load_effect(raw_bytes):
    """Returns the parsed effect, or None for entries that are not effect sprites."""
    if raw_bytes[:4] != b"SIR0":
        return None
    try:
        with contextlib.redirect_stdout(io.StringIO()):  # the parser prints notes for non-sprite entries
            effect = EffectWanHandler.deserialize(raw_bytes)
    except Exception:
        return None
    if effect.imgType not in (1, 2, 3):
        return None
    return effect


def animation_bounds(effect, animation):
    """Smallest box (left, top, right, bottom) around the origin that holds every frame of one animation."""
    bounds = None
    for sequence_frame in animation:
        if sequence_frame.frmIndex >= len(effect.frameData):
            continue
        for piece in effect.frameData[sequence_frame.frmIndex]:
            piece_rect = GetPieceRect(effect, piece)
            if piece_rect is None:
                continue
            shifted = (
                piece_rect[0] + sequence_frame.offset[0],
                piece_rect[1] + sequence_frame.offset[1],
                piece_rect[2] + sequence_frame.offset[0],
                piece_rect[3] + sequence_frame.offset[1],
            )
            if bounds is None:
                bounds = shifted
            else:
                bounds = (
                    min(bounds[0], shifted[0]),
                    min(bounds[1], shifted[1]),
                    max(bounds[2], shifted[2]),
                    max(bounds[3], shifted[3]),
                )
    return bounds


def render_animation(effect, animation):
    """Returns (frames as RGBA images, bounds) or (None, None) when nothing draws."""
    bounds = animation_bounds(effect, animation)
    if bounds is None:
        return None, None
    width, height = bounds[2] - bounds[0], bounds[3] - bounds[1]
    frames = []
    for sequence_frame in animation:
        frame_box = (
            bounds[0] - sequence_frame.offset[0],
            bounds[1] - sequence_frame.offset[1],
            bounds[2] - sequence_frame.offset[0],
            bounds[3] - sequence_frame.offset[1],
        )
        image = None
        if sequence_frame.frmIndex < len(effect.frameData):
            image = GenerateFrame(effect, effect.frameData[sequence_frame.frmIndex], frame_box)
        frames.append(image if image is not None else Image.new("RGBA", (width, height), (0, 0, 0, 0)))
    return frames, bounds


def save_strip(frames, path):
    cell_width, cell_height = frames[0].size
    strip = Image.new("RGBA", (cell_width * len(frames), cell_height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        strip.alpha_composite(frame, (index * cell_width, 0))
    strip.save(path)


def save_gif(frames, durations_in_game_frames, path):
    flattened = []
    for frame in frames:
        backdrop = Image.new("RGBA", frame.size, GIF_BACKGROUND + (255,))
        backdrop.alpha_composite(frame)
        flattened.append(backdrop.convert("RGB"))
    durations_ms = [max(GIF_MIN_FRAME_MS, round(count * GAME_FRAME_MS)) for count in durations_in_game_frames]
    flattened[0].save(path, save_all=True, append_images=flattened[1:], duration=durations_ms, loop=0, disposal=2)


def export_entry(entry_index, effect, entry_folder):
    """Writes one entry's files; returns gallery rows (animation index, gif name, width, height, frame count)."""
    entry_folder.mkdir(parents=True, exist_ok=True)
    if effect.imgType == ATLAS_IMAGE_TYPE:
        atlas = GenerateAtlas(effect.imgData, effect.customPalette, 0)
        if atlas is not None:
            atlas.save(entry_folder / "atlas.png")
        return []

    gallery_rows = []
    description = {"entry": entry_index, "gameFrameMs": round(GAME_FRAME_MS, 3), "animations": []}
    for animation_index, animation in enumerate(effect.animData or []):
        frames, bounds = render_animation(effect, animation)
        if frames is None:
            continue
        durations = [sequence_frame.duration for sequence_frame in animation]
        stem = f"anim_{animation_index:02d}"
        save_strip(frames, entry_folder / f"{stem}.png")
        save_gif(frames, durations, entry_folder / f"{stem}.gif")
        description["animations"].append(
            {
                "index": animation_index,
                "sheet": f"{stem}.png",
                "cellWidth": frames[0].width,
                "cellHeight": frames[0].height,
                "originInCell": [-bounds[0], -bounds[1]],
                "frameDurations": durations,
            }
        )
        gallery_rows.append((animation_index, f"{stem}.gif", frames[0].width, frames[0].height, len(frames)))
    (entry_folder / "effect.json").write_text(json.dumps(description, indent=1), encoding="utf-8", newline="\n")
    return gallery_rows


def write_gallery(out_folder, gallery):
    cards = []
    for entry_index, rows in gallery:
        tiles = "".join(
            f'<figure><img src="effect_{entry_index:04d}/{gif}" width="{width * GALLERY_SCALE}" '
            f'height="{height * GALLERY_SCALE}"><figcaption>{entry_index}.{animation_index} '
            f"({frame_count}f)</figcaption></figure>"
            for animation_index, gif, width, height, frame_count in rows
        )
        cards.append(f'<section id="e{entry_index}"><h2>Entry {entry_index}</h2><div>{tiles}</div></section>')
    page = (
        "<!doctype html><meta charset=utf-8><title>Effect gallery</title><style>"
        "body{background:#1c1c22;color:#ddd;font:13px sans-serif;margin:16px}"
        "section{border-top:1px solid #444;padding:6px 0}h2{font-size:14px;margin:4px 0}"
        "div{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}figure{margin:0;text-align:center}"
        "img{image-rendering:pixelated;background:#202028}figcaption{color:#999}</style>"
        f"<h1>{html.escape(str(out_folder.name))}: {len(gallery)} entries</h1>" + "".join(cards)
    )
    (out_folder / "index.html").write_text(page, encoding="utf-8", newline="\n")


def read_rom(rom_path):
    """Returns (effect.bin bytes, animation tables, names by table) from an Explorers of Sky ROM."""
    from ndspy.rom import NintendoDSRom
    from skytemple_files.common.util import get_ppmdu_config_for_rom, write_u32
    from skytemple_files.data.anim.model import Anim

    rom = NintendoDSRom.fromFile(str(rom_path))
    config = get_ppmdu_config_for_rom(rom)
    if config.game_version != "EoS" or config.game_region not in ANIMATION_TABLE_START:
        raise SystemExit(
            f"Only Explorers of Sky ROMs are supported (this one: {config.game_version} {config.game_region})"
        )

    overlay_10 = rom.loadArm9Overlays([10])[10].data
    table_start = ANIMATION_TABLE_START[config.game_region]
    header = bytearray(20)
    table_offset = len(header)
    write_u32(header, table_offset, 0)
    for table_number, table_size in enumerate(ANIMATION_TABLE_SIZES, start=1):
        table_offset += table_size
        write_u32(header, table_offset, table_number * 4)
    tables = Anim(bytes(header) + bytes(overlay_10[table_start : table_start + ANIMATION_TABLE_TOTAL]))

    strings = FileType.STR.deserialize(rom.getFileByName(ROM_STRINGS_PATH), string_encoding=config.string_encoding)
    names = {}
    for table_name, block_name in (("move", "Move Names"), ("item", "Item Names"), ("trap", "Trap Names")):
        block = config.string_index_data.string_blocks.get(block_name)
        names[table_name] = strings.strings[block.begin : block.end] if block else []
    print(f"ROM: Explorers of Sky {config.game_region}")
    return rom.getFileByName(ROM_EFFECT_PACK_PATH), tables, names


def describe_general_effect(tables, general_index, exported_gifs):
    general = tables.general_table[general_index]
    description = {
        "general": general_index,
        "type": general.anim_type.name,
        "point": general.point.name,
        "loop": general.loop,
        "sfx": general.sfx,
    }
    if general.anim_type.name in WAN_GENERAL_TYPES:
        gif = f"effect_{general.anim_file:04d}/anim_{general.unk2:02d}.gif"
        description.update({"entry": general.anim_file, "animation": general.unk2})
        if gif in exported_gifs:
            description["gif"] = gif
    else:
        description["file"] = general.anim_file
    return description


def build_animation_table(tables, names, exported_gifs):
    def name_of(table_name, index):
        table_names = names.get(table_name, [])
        return table_names[index] if index < len(table_names) else f"{table_name} {index}"

    def slots_of(slot_ids):
        return [
            dict(describe_general_effect(tables, general_index, exported_gifs), slot=slot_number)
            for slot_number, general_index in enumerate(slot_ids, start=1)
            if 0 < general_index < len(tables.general_table)
        ]

    moves = [
        {
            "id": move_id,
            "name": name_of("move", move_id),
            "userAnimation": move.animation,
            "point": move.point.name,
            "direction": move.dir,
            "slots": slots_of([move.anim1, move.anim2, move.anim3, move.anim4]),
        }
        for move_id, move in enumerate(tables.move_table)
    ]
    items = [
        {"id": item_id, "name": name_of("item", item_id), "slots": slots_of([item.anim1, item.anim2])}
        for item_id, item in enumerate(tables.item_table)
    ]
    traps = [
        {"id": trap_id, "name": name_of("trap", trap_id), "slots": slots_of([trap.anim])}
        for trap_id, trap in enumerate(tables.trap_table)
    ]
    return {"moves": moves, "items": items, "traps": traps}


def write_name_gallery(out_folder, animation_table):
    sections = []
    for table_name in ("moves", "items", "traps"):
        rows = []
        for record in animation_table[table_name]:
            if not record["slots"]:
                continue
            tiles = []
            for slot in record["slots"]:
                caption = f"slot {slot['slot']}: "
                if "gif" in slot:
                    caption += f"{slot['entry']}.{slot['animation']}"
                    media = f'<img src="{slot["gif"]}" style="zoom:{GALLERY_SCALE}">'
                else:
                    caption += slot["type"].lower()
                    media = '<span class="none">no sprite</span>'
                tiles.append(f"<figure>{media}<figcaption>{html.escape(caption)}</figcaption></figure>")
            rows.append(
                f"<section><h2>{html.escape(str(record['name']))} <small>#{record['id']}</small></h2>"
                f"<div>{''.join(tiles)}</div></section>"
            )
        sections.append(f'<h1 id="{table_name}">{table_name.title()} ({len(rows)})</h1>' + "".join(rows))
    page = (
        "<!doctype html><meta charset=utf-8><title>Effects by name</title><style>"
        "body{background:#1c1c22;color:#ddd;font:13px sans-serif;margin:16px}"
        "nav a{color:#9cf;margin-right:12px}section{border-top:1px solid #444;padding:6px 0}"
        "h2{font-size:14px;margin:4px 0}small{color:#888}"
        "div{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}figure{margin:0;text-align:center}"
        "img{image-rendering:pixelated;background:#202028}figcaption{color:#999}.none{color:#666}</style>"
        '<nav><a href="#moves">Moves</a><a href="#items">Items</a><a href="#traps">Traps</a>'
        '<a href="index.html">All entries</a></nav>' + "".join(sections)
    )
    (out_folder / "by_name.html").write_text(page, encoding="utf-8", newline="\n")


def main():
    parser = argparse.ArgumentParser(
        description="Export PMD effect animations from an Explorers of Sky ROM or effect.bin."
    )
    parser.add_argument("source", type=Path, help="an Explorers of Sky .nds, or an effect.bin pulled from one")
    parser.add_argument("--out", type=Path, help="output folder (default: effect_export next to the source)")
    parser.add_argument("--entries", help="entries to export, e.g. 0-40,292 (default: all)")
    arguments = parser.parse_args()

    out_folder = arguments.out or arguments.source.parent / "effect_export"
    tables = names = None
    if arguments.source.suffix.lower() == ".nds":
        effect_pack_bytes, tables, names = read_rom(arguments.source)
    else:
        effect_pack_bytes = arguments.source.read_bytes()
    pack = FileType.BIN_PACK.deserialize(effect_pack_bytes)
    entry_count = len(pack)
    image_bank = load_effect(bytes(pack[SHARED_IMAGE_BANK_ENTRY]))
    base_palette = image_bank.customPalette if image_bank is not None else None

    gallery = []
    skipped = []
    for entry_index in parse_entry_list(arguments.entries, entry_count):
        effect = load_effect(bytes(pack[entry_index]))
        if effect is None:
            skipped.append(entry_index)
            continue
        if entry_index in IMAGES_ONLY_ENTRY_PAIRS and image_bank is not None:
            effect.imgData = image_bank.imgData
            effect.customPalette = image_bank.customPalette
            effect.is256Color = image_bank.is256Color
            effect.paletteOffset = image_bank.paletteOffset
        if effect.imgData is None or effect.customPalette is None:
            skipped.append(entry_index)
            continue
        if effect.paletteOffset and base_palette is not None:
            mergeWithBasePalette(effect, base_palette)
        fix_frame_offsets(effect)
        piece_cache.clear()
        try:
            rows = export_entry(entry_index, effect, out_folder / f"effect_{entry_index:04d}")
        except Exception as error:
            print(f"entry {entry_index}: failed ({error})")
            skipped.append(entry_index)
            continue
        if rows:
            gallery.append((entry_index, rows))
        if rows:
            print(f"entry {entry_index}: {len(rows)} animations")
        elif effect.imgType == ATLAS_IMAGE_TYPE:
            print(f"entry {entry_index}: atlas")
        else:
            print(f"entry {entry_index}: no animations (image bank only)")

    write_gallery(out_folder, gallery)
    print(f"done: {len(gallery)} entries with animations, {len(skipped)} skipped {skipped}")
    print(f"gallery: {out_folder / 'index.html'}")
    if tables is not None:
        exported_gifs = {path.relative_to(out_folder).as_posix() for path in out_folder.glob("effect_*/anim_*.gif")}
        animation_table = build_animation_table(tables, names, exported_gifs)
        (out_folder / "animation_table.json").write_text(
            json.dumps(animation_table, indent=1), encoding="utf-8", newline="\n"
        )
        write_name_gallery(out_folder, animation_table)
        print(f"by name: {out_folder / 'by_name.html'}")


if __name__ == "__main__":
    main()
