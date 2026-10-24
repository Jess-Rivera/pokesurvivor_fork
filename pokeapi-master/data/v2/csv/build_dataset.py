#!/usr/bin/env python3
"""
Build an enriched Pokémon move dataset from local PokeAPI-style CSV files.

Usage:
    python build_dataset.py
    python build_dataset.py "C:/path/to/csv-folder"
    python build_dataset.py "C:/path/to/csv-folder" --language 9

Reads CSVs locally; no uploads or third-party packages are needed.

Outputs:
    api_dataset.json
    validation_report.json

Version handling:
- move_flavor_text.csv: keep the row with the highest version_groups.order
  for each move after filtering by language.
- move_changelog.csv: for each move property, use the non-empty change from
  the highest-order version group that specifies that property. This avoids
  incorrectly treating one changelog row as a complete snapshot.
- move_effect_changelog.csv: retain only the highest-order changelog entry
  for each effect.
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


def version_order(row, version_group_orders, column="version_group_id"):
    """Return the order for a row's version group; unknown groups sort lowest."""
    group_id = val(row.get(column, ""))
    if group_id is None:
        return float("-inf")
    return version_group_orders.get(group_id, float("-inf"))


def latest_rows_per_key(rows, key, version_group_orders, column="version_group_id"):
    """Keep one highest-order row per key; stable first row wins ties."""
    chosen = {}
    for row in rows:
        raw_key = row.get(key, "")
        if raw_key == "":
            continue
        normalized_key = val(raw_key)
        current = chosen.get(normalized_key)
        candidate_order = version_order(row, version_group_orders, column)
        if current is None or candidate_order > version_order(
            current, version_group_orders, column
        ):
            chosen[normalized_key] = row
    return chosen


def main():
    parser = argparse.ArgumentParser(
        description="Build an enriched move dataset from local CSV files."
    )
    parser.add_argument(
        "folder", nargs="?", default=".",
        help="Folder containing the CSV files (default: current directory)"
    )
    parser.add_argument("--language", type=int, default=9)
    parser.add_argument("--output", default="api_dataset.json")
    parser.add_argument("--report", default="validation_report.json")
    args = parser.parse_args()

    folder = Path(args.folder).expanduser().resolve()
    if not folder.is_dir():
        parser.error(f"Not a directory: {folder}")

    def load(filename, required=False):
        return read_csv(folder, filename, required)

    # Version group ordering is used to select the latest versioned records.
    version_groups = load("version_groups.csv", required=True)
    version_group_orders = {
        val(row["id"]): val(row["order"])
        for row in version_groups
        if row.get("id", "") != "" and row.get("order", "") != ""
    }

    # Core tables and lookup tables.
    moves = load("moves.csv", required=True)
    types = index(load("types.csv"), "id")
    classes = index(load("move_damage_classes.csv"), "id")
    targets = index(load("move_targets.csv"), "id")
    effects = index(load("move_effects.csv"), "id")
    flags = index(load("move_flags.csv"), "id")
    ailments = index(load("move_meta_ailments.csv"), "id")
    categories = index(load("move_meta_categories.csv"), "id")

    # Localized lookup tables. Only language ID requested is retained.
    names = index(
        localized(load("move_names.csv", required=True),
                  "local_language_id", args.language),
        "move_id"
    )
    effect_prose = index(
        localized(load("move_effect_prose.csv", required=True),
                  "local_language_id", args.language),
        "move_effect_id"
    )
    flag_prose = index(
        localized(load("move_flag_prose.csv"),
                  "local_language_id", args.language),
        "move_flag_id"
    )
    class_prose = index(
        localized(load("move_damage_class_prose.csv"),
                  "local_language_id", args.language),
        "move_damage_class_id"
    )
    target_prose = index(
        localized(load("move_target_prose.csv"),
                  "local_language_id", args.language),
        "move_target_id"
    )
    ailment_names = index(
        localized(load("move_meta_ailment_names.csv"),
                  "local_language_id", args.language),
        "move_meta_ailment_id"
    )
    category_prose = index(
        localized(load("move_meta_category_prose.csv"),
                  "local_language_id", args.language),
        "move_meta_category_id"
    )
    flavor_summaries = index(
        localized(load("move_flavor_summaries.csv"),
                  "local_language_id", args.language),
        "move_id"
    )

    # Flavor text is language-filtered, then reduced to latest version group
    # per move. If duplicate rows tie at the same order, the first wins.
    flavor_text_rows = localized(
        load("move_flavor_text.csv"),
        "language_id", args.language
    )
    flavor_text_by_move = latest_rows_per_key(
        flavor_text_rows, "move_id", version_group_orders,
        column="version_group_id"
    )

    # Non-versioned relation tables.
    meta_by_move = index(load("move_meta.csv"), "move_id")
    flags_by_move = group(load("move_flag_map.csv"), "move_id")
    stats_by_move = group(load("move_meta_stat_changes.csv"), "move_id")

    # Merge the latest specified value for each property in move_changelog
    # over the base moves.csv row. Changelog rows can be partial, so do not
    # blindly replace the entire move record with one changelog row.
    changelog_rows = load("move_changelog.csv")
    changelog_by_move = group(changelog_rows, "move_id")
    changelog_value_fields = [
        "type_id", "power", "pp", "accuracy", "priority",
        "target_id", "effect_id", "effect_chance"
    ]
    latest_changes = {}
    for move_id, rows in changelog_by_move.items():
        for field in changelog_value_fields:
            candidates = [
                row for row in rows
                if row.get(field, "") != ""
                and row.get("changed_in_version_group_id", "") != ""
            ]
            if not candidates:
                continue
            # Stable tie handling: first row at the maximum order wins.
            latest = max(
                candidates,
                key=lambda row: version_group_orders.get(
                    val(row.get("changed_in_version_group_id", "")),
                    float("-inf")
                )
            )
            latest_changes.setdefault(move_id, {})[field] = val(latest[field])

    # Effect changelog records also use changed_in_version_group_id.
    effect_changelog_rows = load("move_effect_changelog.csv")
    latest_effect_changelog = {}
    for effect_id, rows in group(effect_changelog_rows, "effect_id").items():
        latest_effect_changelog[effect_id] = max(
            rows,
            key=lambda row: version_group_orders.get(
                val(row.get("changed_in_version_group_id", "")),
                float("-inf")
            )
        )

    effect_changelog_prose = index(
        localized(load("move_effect_changelog_prose.csv"),
                  "local_language_id", args.language),
        "move_effect_changelog_id"
    )

    report = {
        "input_directory": str(folder),
        "language_id": args.language,
        "counts": {},
        "warnings": []
    }

    output_moves = []
    seen_ids = set()

    for raw_move in moves:
        source = clean(raw_move)
        move_id = source.get("id")

        if move_id is None:
            report["warnings"].append({
                "issue": "Move row has no ID", "row": source
            })
            continue
        if move_id in seen_ids:
            report["warnings"].append({
                "issue": "Duplicate move ID in moves.csv", "move_id": move_id
            })
        seen_ids.add(move_id)

        # Source values are preserved separately. resolved_source reflects
        # base values with latest non-empty changelog changes applied.
        resolved_source = dict(source)
        resolved_source.update(latest_changes.get(move_id, {}))

        type_id = resolved_source.get("type_id")
        class_id = resolved_source.get("damage_class_id")
        target_id = resolved_source.get("target_id")
        effect_id = resolved_source.get("effect_id")

        name_row = names.get(move_id)
        prose_row = effect_prose.get(effect_id)

        item = {
            "source": source,
            "resolved_source": resolved_source,
            "name": val(name_row.get("name")) if name_row else None,
            "type": identifier(types, type_id),
            "damage_class": identifier(classes, class_id),
            "target": identifier(targets, target_id),
            "effect": {
                "id": effect_id,
                "short_effect": val(prose_row.get("short_effect")) if prose_row else None,
                "description": val(prose_row.get("effect")) if prose_row else None,
                "latest_changelog": None
            },
            "meta": None,
            "flags": [],
            "stat_changes": [
                clean(row) for row in stats_by_move.get(move_id, [])
            ],
            "flavor_summary": (
                val(flavor_summaries[move_id].get("flavor_summary"))
                if move_id in flavor_summaries else None
            ),
            "flavor_text": None
        }

        if class_id in class_prose:
            item["damage_class_description"] = val(
                class_prose[class_id].get("description")
            )
        if target_id in target_prose:
            item["target_description"] = val(
                target_prose[target_id].get("description")
            )

        meta_row = meta_by_move.get(move_id)
        if meta_row:
            meta = clean(meta_row)
            category_id = meta.get("meta_category_id")
            ailment_id = meta.get("meta_ailment_id")
            meta["category"] = identifier(categories, category_id)
            meta["ailment"] = identifier(ailments, ailment_id)

            category_description = category_prose.get(category_id)
            ailment_name = ailment_names.get(ailment_id)
            meta["category_description"] = (
                val(category_description.get("description"))
                if category_description else None
            )
            meta["ailment_name"] = (
                val(ailment_name.get("name")) if ailment_name else None
            )
            item["meta"] = meta

        for relation in flags_by_move.get(move_id, []):
            flag_id = val(relation.get("move_flag_id"))
            flag = flags.get(flag_id)
            prose = flag_prose.get(flag_id)
            item["flags"].append({
                "id": flag_id,
                "identifier": val(flag.get("identifier")) if flag else None,
                "name": val(prose.get("name")) if prose else None,
                "description": val(prose.get("description")) if prose else None
            })

        flavor_row = flavor_text_by_move.get(move_id)
        if flavor_row:
            item["flavor_text"] = clean(flavor_row)

        changelog_entry = latest_effect_changelog.get(effect_id)
        if changelog_entry:
            entry = clean(changelog_entry)
            prose = effect_changelog_prose.get(entry.get("id"))
            entry["description"] = val(prose.get("effect")) if prose else None
            item["effect"]["latest_changelog"] = entry

        if not name_row:
            report["warnings"].append({
                "move_id": move_id,
                "issue": f"No localized name for language ID {args.language}"
            })

        for field, table in (
            ("type_id", types),
            ("damage_class_id", classes),
            ("target_id", targets),
            ("effect_id", effects)
        ):
            ref_id = resolved_source.get(field)
            if ref_id is not None and table and ref_id not in table:
                report["warnings"].append({
                    "move_id": move_id,
                    "issue": f"Unresolved {field}",
                    "value": ref_id
                })

        if effect_id is not None and not prose_row:
            report["warnings"].append({
                "move_id": move_id,
                "issue": f"No localized effect prose for language ID {args.language}",
                "effect_id": effect_id
            })

        output_moves.append(item)

    report["counts"] = {
        "moves_in_source": len(moves),
        "moves_exported": len(output_moves),
        "version_groups_loaded": len(version_group_orders),
        "localized_names": len(names),
        "localized_effect_prose": len(effect_prose),
        "localized_flavor_text_rows_before_version_selection": len(flavor_text_rows),
        "flavor_text_rows_selected": len(flavor_text_by_move),
        "moves_with_changelog_changes": len(latest_changes),
        "warnings": len(report["warnings"])
    }

    dataset = {
        "dataset": "pokemon_move_api",
        "language_id": args.language,
        "version_selection": "highest version_groups.order",
        "moves": output_moves
    }

    output_path = folder / args.output
    report_path = folder / args.report
    output_path.write_text(
        json.dumps(dataset, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8"
    )
    report_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8"
    )

    print(f"Exported {len(output_moves)} moves to: {output_path}")
    print(f"Validation report: {report_path}")
    print(f"Warnings: {len(report['warnings'])}")
    if report["warnings"]:
        print("Review validation_report.json for missing names or unresolved IDs.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, csv.Error, UnicodeError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
