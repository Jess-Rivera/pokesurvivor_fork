#!/usr/bin/env python3
"""
Build a learnset dataset from local PokeAPI-style CSV files.

Sibling of build_dataset.py (moves) and build_pokemon_dataset.py (species).
Same conventions: preserve the raw learnset `source` rows verbatim, resolve
id-fields to identifiers alongside, select the latest versioned movepool, and
emit a validation report. This fills the gap the species builder left open
("Learnsets, sprites, and any game-mapped fields are intentionally excluded").

Usage:
    python build_learnset_dataset.py
    python build_learnset_dataset.py "C:/path/to/csv-folder"
    python build_learnset_dataset.py "C:/path/to/csv-folder" --language 9

Reads CSVs locally; no uploads or third-party packages are needed.

Outputs:
    api_learnset_dataset.json
    learnset_validation_report.json

Scope and decisions (frozen 2026-10-24, Jess):
- One entry per POKEMON row (pokemon.csv), i.e. the default form AND every
  functional form, each keyed by its own pokemon_id. This is the natural grain
  of pokemon_moves.csv (it is keyed by pokemon_id, forms included). Each entry
  carries its owning species_id + species identifier for joining back to
  api_pokemon_dataset.json.
- Version group: the LATEST movepool per POKEMON, i.e. the highest
  version_groups.order among the version groups that pokemon actually appears
  in (this varies by pokemon: e.g. many top out at scarlet-violet, others at
  champions, sword-shield, legends-arceus, etc.). Mirrors the "latest" rule
  the sibling builders use for versioned records.
- Learn methods: ALL methods, GROUPED by method identifier (level-up, machine,
  egg, tutor, ...). level-up entries carry their level; others carry level only
  when the source row specifies one (usually null).
- Each learnset move is resolved to its move identifier + localized name; the
  raw pokemon_moves row is preserved verbatim under `source`.
"""

import argparse
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path


def read_csv(folder, filename, required=False):
    path = folder / filename
    if not path.exists():
        if required:
            raise FileNotFoundError(f"Required CSV not found: {path}")
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def val(raw):
    """Convert integer-looking CSV cells to integers; preserve other text."""
    if raw is None:
        return None
    raw = raw.strip()
    if raw == "":
        return None
    try:
        return int(raw)
    except ValueError:
        return raw


def clean(row):
    return {key: val(raw) for key, raw in row.items()}


def index(rows, key):
    result = {}
    for row in rows:
        raw_key = row.get(key, "")
        if raw_key != "":
            result[val(raw_key)] = row
    return result


def group(rows, key):
    result = defaultdict(list)
    for row in rows:
        raw_key = row.get(key, "")
        if raw_key != "":
            result[val(raw_key)].append(row)
    return result


def localized(rows, language_column, language_id):
    return [
        row for row in rows
        if val(row.get(language_column, "")) == language_id
    ]


def identifier(table, key):
    row = table.get(key)
    return val(row["identifier"]) if row else None


def main():
    parser = argparse.ArgumentParser(
        description="Build a learnset dataset from local PokeAPI CSV files."
    )
    parser.add_argument(
        "folder", nargs="?", default=".",
        help="Folder containing the CSV files (default: current directory)"
    )
    parser.add_argument("--language", type=int, default=9)
    parser.add_argument("--output", default="api_learnset_dataset.json")
    parser.add_argument("--report", default="learnset_validation_report.json")
    # Output lands in the staging folder (this script's own directory) by
    # default, NOT the CSV input folder. Override with --output-dir if needed.
    parser.add_argument(
        "--output-dir", default=str(Path(__file__).resolve().parent),
        help="Where to write the JSON outputs (default: this script's folder)"
    )
    # Also emit a slim companion file: pokemon-centric, ids-only, compact JSON,
    # verbatim source rows dropped (names resolve at load from moves.csv). Same
    # facts as the full file, ~1/40th the size.
    parser.add_argument(
        "--lean", action="store_true", default=True,
        help="Also write a lean companion (default: on; see --no-lean)"
    )
    parser.add_argument(
        "--no-lean", dest="lean", action="store_false",
        help="Skip the lean companion file"
    )
    parser.add_argument("--lean-output", default="api_learnset_dataset.lean.json")
    args = parser.parse_args()

    folder = Path(args.folder).expanduser().resolve()
    if not folder.is_dir():
        parser.error(f"Not a directory: {folder}")

    def load(filename, required=False):
        return read_csv(folder, filename, required)

    lang = args.language

    # --- Core tables ---
    pokemon_rows = load("pokemon.csv", required=True)
    pokemon_moves_rows = load("pokemon_moves.csv", required=True)

    # --- Lookup tables ---
    moves = index(load("moves.csv", required=True), "id")
    methods = index(load("pokemon_move_methods.csv", required=True), "id")
    version_groups = index(load("version_groups.csv", required=True), "id")

    # version_groups.order drives "latest" selection (unknown groups sort lowest)
    version_group_orders = {
        val(r.get("id")): (val(r.get("order"))
                           if isinstance(val(r.get("order")), int)
                           else float("-inf"))
        for r in version_groups.values()
    }

    # --- Localized prose ---
    move_names = index(
        localized(load("move_names.csv"), "local_language_id", lang),
        "move_id"
    )
    method_prose = index(
        localized(load("pokemon_move_method_prose.csv"),
                  "local_language_id", lang),
        "pokemon_move_method_id"
    )

    # pokemon_id -> species_id + identifier, for the join back to species data
    pokemon_by_id = index(pokemon_rows, "id")

    # pokemon_moves grouped by pokemon_id
    moves_by_pokemon = group(pokemon_moves_rows, "pokemon_id")

    report = {
        "input_directory": str(folder),
        "language_id": lang,
        "counts": {},
        "warnings": [],
    }

    def vg_order_of(row):
        vg = val(row.get("version_group_id"))
        return version_group_orders.get(vg, float("-inf"))

    output_learnsets = []
    pokemon_with_moves = 0
    total_moves_emitted = 0
    moves_missing_name = set()

    for raw_pokemon in pokemon_rows:
        pk = clean(raw_pokemon)
        pokemon_id = pk.get("id")
        if pokemon_id is None:
            report["warnings"].append(
                {"issue": "Pokemon row has no ID", "row": pk}
            )
            continue

        rows = moves_by_pokemon.get(pokemon_id, [])
        if not rows:
            # Many non-default/form rows legitimately have no own learnset.
            continue

        # latest version group THIS pokemon appears in
        latest_order = max(vg_order_of(r) for r in rows)
        latest_vg_rows = [r for r in rows if vg_order_of(r) == latest_order]
        latest_vg_id = val(latest_vg_rows[0].get("version_group_id"))

        # group the latest-vg learnset by method identifier
        by_method = defaultdict(list)
        for r in latest_vg_rows:
            method_id = val(r.get("pokemon_move_method_id"))
            method_ident = identifier(methods, method_id)
            move_id = val(r.get("move_id"))
            move_ident = identifier(moves, move_id)
            name_row = move_names.get(move_id)
            move_name = val(name_row.get("name")) if name_row else None
            if move_name is None:
                moves_missing_name.add(move_id)
            by_method[method_ident].append({
                "move": move_ident,
                "move_id": move_id,
                "name": move_name,
                "level": val(r.get("level")),
                "order": val(r.get("order")),
                "mastery": val(r.get("mastery")),
                "source": clean(r),
            })
            total_moves_emitted += 1

        # sort: level-up by (level, order, name); others by (name)
        learnset = {}
        for method_ident, entries in by_method.items():
            if method_ident == "level-up":
                entries.sort(key=lambda e: (
                    e["level"] is None, e["level"] or 0,
                    e["order"] is None, e["order"] or 0,
                    e["name"] or "",
                ))
            else:
                entries.sort(key=lambda e: (e["name"] or "", e["move_id"] or 0))
            mprose = method_prose.get(
                next((mid for mid, m in methods.items()
                      if val(m.get("identifier")) == method_ident), None)
            )
            learnset[method_ident] = {
                "method": method_ident,
                "method_name": val(mprose.get("name")) if mprose else None,
                "moves": entries,
            }

        species_id = pk.get("species_id")
        item = {
            "source": pk,                      # raw pokemon row, verbatim
            "pokemon_id": pokemon_id,
            "pokemon": pk.get("identifier"),
            "species_id": species_id,
            "is_default": pk.get("is_default"),
            "version_group": {
                "id": latest_vg_id,
                "identifier": identifier(version_groups, latest_vg_id),
                "order": latest_order if isinstance(latest_order, int) else None,
            },
            "methods": sorted(learnset.keys()),
            "learnset": learnset,
        }
        output_learnsets.append(item)
        pokemon_with_moves += 1

    # sort output by species_id then pokemon_id (default form first within species)
    output_learnsets.sort(key=lambda e: (
        e["species_id"] is None, e["species_id"] or 0,
        e["is_default"] != 1,
        e["pokemon_id"] or 0,
    ))

    if moves_missing_name:
        report["warnings"].append({
            "issue": f"No localized move name for language {lang}",
            "move_ids": sorted(m for m in moves_missing_name if m is not None),
        })

    report["counts"] = {
        "pokemon_rows_in_source": len(pokemon_rows),
        "pokemon_moves_rows_in_source": len(pokemon_moves_rows),
        "pokemon_with_learnsets_exported": pokemon_with_moves,
        "learnset_move_entries_emitted": total_moves_emitted,
        "moves_loaded": len(moves),
        "version_groups_loaded": len(version_groups),
        "moves_missing_localized_name": len(moves_missing_name),
        "warnings": len(report["warnings"]),
    }

    dataset = {
        "dataset": "pokemon_learnset_api",
        "language_id": lang,
        "version_selection": "highest version_groups.order per pokemon",
        "learnsets": output_learnsets,
    }

    out_dir = Path(args.output_dir).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    output_path = out_dir / args.output
    report_path = out_dir / args.report
    output_path.write_text(
        json.dumps(dataset, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8"
    )
    report_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8"
    )

    print(f"Exported {pokemon_with_moves} pokemon learnsets to: {output_path}")
    print(f"Move entries emitted: {total_moves_emitted}")
    print(f"Validation report: {report_path}")
    print(f"Warnings: {len(report['warnings'])}")
    if report["warnings"]:
        print("Review learnset_validation_report.json for details.")

    # --- Lean companion -----------------------------------------------------
    # Pokemon-centric, ids-only, compact. Drops the verbatim `source` rows and
    # all resolved names/prose (reconstructable at load via the `moves` legend
    # and pokemon.csv). Each move becomes a [move_id, level] pair, grouped by
    # method. level is null for non-level-up methods. Same 75k facts as the
    # full file, a fraction of the bytes.
    if args.lean:
        move_legend = {
            mid: identifier(moves, mid)
            for e in output_learnsets
            for blk in e["learnset"].values()
            for m in blk["moves"]
            for mid in [m["move_id"]]
        }
        lean_entries = []
        for e in output_learnsets:
            lean_entries.append({
                "pokemon_id": e["pokemon_id"],
                "pokemon": e["pokemon"],
                "species_id": e["species_id"],
                "is_default": e["is_default"],
                "vg": e["version_group"]["id"],
                "moves": {
                    meth: [[m["move_id"], m["level"]] for m in blk["moves"]]
                    for meth, blk in e["learnset"].items()
                },
            })
        lean = {
            "dataset": "pokemon_learnset_api_lean",
            "language_id": lang,
            "version_selection": "highest version_groups.order per pokemon",
            "note": ("moves are [move_id, level] pairs grouped by method; "
                     "level is null for non-level-up methods. Resolve move "
                     "identifiers via the `moves` legend, version groups via "
                     "version_groups.csv, pokemon via pokemon.csv."),
            "moves": move_legend,
            "learnsets": lean_entries,
        }
        lean_path = out_dir / args.lean_output
        lean_path.write_text(
            json.dumps(lean, ensure_ascii=False,
                       separators=(",", ":")) + "\n",
            encoding="utf-8"
        )
        print(f"Lean companion: {lean_path}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, csv.Error, UnicodeError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
