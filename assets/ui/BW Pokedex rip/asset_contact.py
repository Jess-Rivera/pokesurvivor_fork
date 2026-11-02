
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import argparse
import math

# Contact sheet configuration
THUMB_WIDTH = 190
THUMB_HEIGHT = 135
TILE_WIDTH = 230
TILE_HEIGHT = 185
COLUMNS = 5
ASSETS_PER_SHEET = 100
PADDING = 10
BACKGROUND = (235, 235, 235)


def generate_contact_sheets(source, output):
    source = Path(source)
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)

    # Recursively locate PNG files
    files = sorted(
        p for p in source.rglob("*")
        if p.is_file() and p.suffix.lower() == ".png"
    )

    print(f"Found {len(files)} PNG files.")

    if not files:
        return

    font = ImageFont.load_default()

    total_sheets = math.ceil(len(files) / ASSETS_PER_SHEET)

    for sheet_num in range(total_sheets):
        batch = files[
            sheet_num * ASSETS_PER_SHEET:
            (sheet_num + 1) * ASSETS_PER_SHEET
        ]

        rows = math.ceil(len(batch) / COLUMNS)

        sheet = Image.new(
            "RGB",
            (COLUMNS * TILE_WIDTH, rows * TILE_HEIGHT),
            BACKGROUND
        )

        draw = ImageDraw.Draw(sheet)

        for index, path in enumerate(batch):
            try:
                with Image.open(path) as original:
                    dimensions = original.size
                    image = original.convert("RGBA")

                image.thumbnail((THUMB_WIDTH, THUMB_HEIGHT))

                col = index % COLUMNS
                row = index // COLUMNS

                x = col * TILE_WIDTH
                y = row * TILE_HEIGHT

                # Center thumbnail in tile
                img_x = x + (TILE_WIDTH - image.width) // 2
                img_y = y + 5

                # White background for transparency
                tile_bg = Image.new(
                    "RGBA",
                    image.size,
                    (255, 0, 255, 255)
                )
                tile_bg.alpha_composite(image)

                sheet.paste(
                    tile_bg.convert("RGB"),
                    (img_x, img_y)
                )

                # Filename and original dimensions
                relative_path = str(path.relative_to(source))

                draw.text(
                    (x + PADDING, y + 145),
                    relative_path[:36],
                    fill=(20, 20, 20),
                    font=font
                )

                draw.text(
                    (x + PADDING, y + 160),
                    f"{dimensions[0]} x {dimensions[1]}",
                    fill=(90, 90, 90),
                    font=font
                )

            except Exception as e:
                print(f"Skipped {path}: {e}")

        filename = output / f"contact_sheet_{sheet_num + 1:03}.png"
        sheet.save(filename)

        print(f"Created: {filename}")

    print(f"\nComplete! Generated {total_sheets} contact sheet(s).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate PNG asset contact sheets."
    )

    parser.add_argument("source", help="Folder to scan recursively")
    parser.add_argument(
        "-o", "--output",
        default="contact_sheets",
        help="Output folder"
    )

    args = parser.parse_args()

    generate_contact_sheets(args.source, args.output)
