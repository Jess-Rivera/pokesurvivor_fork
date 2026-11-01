
import csv
import sys
from pathlib import Path


def get_header(path):
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.reader(f)
            header = next(reader, None)
            return (tuple(header) if header else (), path)
    except (OSError, UnicodeError, csv.Error) as e:
        print(f"Error reading {path}: {e}", file=sys.stderr)
        return ((), path)


def main():
    if len(sys.argv) < 2:
        print('Usage: python peek_csv.py "file1.csv" "file2.csv" ...')
        sys.exit(1)

    files = [Path(arg) for arg in sys.argv[1:]]
    results = []

    for path in files:
        if not path.is_file():
            print(f"File not found: {path}", file=sys.stderr)
            continue
        results.append(get_header(path))

    results.sort(key=lambda item: (item[0], str(item[1]).lower()))

    for header, path in results:
        print(f"\n{path}")
        print(",".join(header))


if __name__ == "__main__":
    main()
