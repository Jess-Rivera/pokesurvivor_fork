#!/usr/bin/env python3
"""
Build an enriched Pokemon species dataset from local PokeAPI-style CSV files.

Sibling of build_dataset.py (the move builder). Same conventions:
preserve raw `source` verbatim, resolve id-fields to identifiers alongside,
denormalize localized prose, reduce versioned records, emit a validation report.

Usage:
    python build_pokemon_dataset.py
    python build_pokemon_dataset.py "C:/path/to/csv-folder"
    python build_pokemon_dataset.py "C:/path/to/csv-folder" --language 9

Reads CSVs locally; no uploads or third-party packages are needed.

Outputs:
    api_pokemon_dataset.json
    pokemon_validation_report.json

Scope and decisions (frozen 2026-10-24, API data only, no game/sprite data):
- One entry per SPECIES, keyed off the default `pokemon` row (is_default=1).
- Functional forms (non-default `pokemon` rows for the species) are nested in
  `forms[]`; each already carries its own stats/types/abilities via its own
  pokemon_id. Cosmetic-only pokemon_forms labels are not promoted to entries.
  A non-default pokemon row is treated as a functional form when it differs
  from the default in stats, types, or abilities.
- resolved_source = current values only (no _past tracking).
- All generations, every species.
- National dex is resolved by pokedexes.identifier == "national" and called
  out; all regional dex numbers are included alongside.
- Evolution is per-node: evolves_from_species_id plus the pokemon_evolution
  rows where evolved_species_id == this species. evolution_chain_id groups.
- Flavor text: highest version_id per species, after language filtering.
- Learnsets, sprites, and any game-mapped fields are intentionally excluded.
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
        description="Build an enriched Pokemon species dataset from local CSV files."
    )
    parser.add_argument(
        "folder", nargs="?", default=".",
        help="Folder containing the CSV files (default: current directory)"
    )
    parser.add_argument("--language", type=int, default=9)
    parser.add_argument("--output", default="api_pokemon_dataset.json")
    parser.add_argument("--report", default="pokemon_validation_report.json")
    args = parser.parse_args()

    folder = Path(args.folder).expanduser().resolve()
    if not folder.is_dir():
        parser.error(f"Not a directory: {folder}")

    def load(filename, required=False):
        return read_csv(folder, filename, required)

    lang = args.language

    # --- Core tables ---
    pokemon_rows = load("pokemon.csv", required=True)
    species_rows = load("pokemon_species.csv", required=True)

    # --- Lookup tables (id -> identifier) ---
    types = index(load("types.csv"), "id")
    stats = index(load("stats.csv"), "id")
    abilities = index(load("abilities.csv"), "id")
    egg_groups = index(load("egg_groups.csv"), "id")
    pokedexes = index(load("pokedexes.csv"), "id")
    growth_rates = index(load("growth_rates.csv"), "id")
    colors = index(load("pokemon_colors.csv"), "id")
    shapes = index(load("pokemon_shapes.csv"), "id")
    habitats = index(load("pokemon_habitats.csv"), "id")
    evo_triggers = index(load("evolution_triggers.csv"), "id")
    generations = index(load("generations.csv"), "id")

    # national pokedex id, resolved by identifier (not hardcoded)
    national_dex_id = None
    for pid, row in pokedexes.items():
        if val(row.get("identifier")) == "national":
            national_dex_id = pid
            break

    # --- Localized prose (language-filtered) ---
    species_names = index(
        localized(load("pokemon_species_names.csv", required=True),
                  "local_language_id", lang),
        "pokemon_species_id"
    )
    ability_names = index(
        localized(load("ability_names.csv"), "local_language_id", lang),
        "ability_id"
    )
    stat_names = index(
        localized(load("stat_names.csv"), "local_language_id", lang),
        "stat_id"
    )
    type_names = index(
        localized(load("type_names.csv"), "local_language_id", lang),
        "type_id"
    )
    egg_group_names = index(
        localized(load("egg_group_prose.csv"), "local_language_id", lang),
        "egg_group_id"
    )
    growth_rate_names = index(
        localized(load("growth_rate_prose.csv"), "local_language_id", lang),
        "growth_rate_id"
    )
    color_names = index(
        localized(load("pokemon_color_names.csv"), "local_language_id", lang),
        "pokemon_color_id"
    )
    shape_prose = index(
        localized(load("pokemon_shape_prose.csv"), "local_language_id", lang),
        "pokemon_shape_id"
    )
    habitat_names = index(
        localized(load("pokemon_habitat_names.csv"), "local_language_id", lang),
        "pokemon_habitat_id"
    )
    evo_trigger_names = index(
        localized(load("evolution_trigger_prose.csv"), "local_language_id", lang),
        "evolution_trigger_id"
    )
    flavor_summaries = index(
        localized(load("pokemon_species_flavor_summaries.csv"),
                  "local_language_id", lang),
        "pokemon_species_id"
    )

    # Flavor text: language-filtered, highest version_id per species wins.
    flavor_text_rows = localized(
        load("pokemon_species_flavor_text.csv"), "language_id", lang
    )
    flavor_text_by_species = {}
    for row in flavor_text_rows:
        sid = val(row.get("species_id", ""))
        if sid is None:
            continue
        vid = val(row.get("version_id", ""))
        vid_cmp = vid if isinstance(vid, int) else float("-inf")
        current = flavor_text_by_species.get(sid)
        if current is None:
            flavor_text_by_species[sid] = row
        else:
            cur_vid = val(current.get("version_id", ""))
            cur_cmp = cur_vid if isinstance(cur_vid, int) else float("-inf")
            if vid_cmp > cur_cmp:
                flavor_text_by_species[sid] = row

    # --- Relation tables ---
    types_by_pokemon = group(load("pokemon_types.csv"), "pokemon_id")
    stats_by_pokemon = group(load("pokemon_stats.csv"), "pokemon_id")
    abilities_by_pokemon = group(load("pokemon_abilities.csv"), "pokemon_id")
    egg_groups_by_species = group(load("pokemon_egg_groups.csv"), "species_id")
    dex_numbers_by_species = group(load("pokemon_dex_numbers.csv"), "species_id")
    evolution_by_evolved = group(load("pokemon_evolution.csv"), "evolved_species_id")

    # pokemon rows grouped by species; split default vs the rest
    pokemon_by_species = group(pokemon_rows, "species_id")

    report = {
        "input_directory": str(folder),
        "language_id": lang,
        "counts": {},
        "warnings": []
    }

    def resolve_types(pokemon_id):
        out = []
        for row in sorted(types_by_pokemon.get(pokemon_id, []),
                          key=lambda r: val(r.get("slot", "")) or 0):
            tid = val(row.get("type_id"))
            out.append({
                "slot": val(row.get("slot")),
                "type": identifier(types, tid),
            })
        return out

    def resolve_stats(pokemon_id):
        out = []
        for row in stats_by_pokemon.get(pokemon_id, []):
            sid = val(row.get("stat_id"))
            name_row = stat_names.get(sid)
            out.append({
                "stat": identifier(stats, sid),
                "name": val(name_row.get("name")) if name_row else None,
                "base_stat": val(row.get("base_stat")),
                "effort": val(row.get("effort")),
            })
        return out

    def resolve_abilities(pokemon_id):
        out = []
        for row in sorted(abilities_by_pokemon.get(pokemon_id, []),
                          key=lambda r: val(r.get("slot", "")) or 0):
            aid = val(row.get("ability_id"))
            name_row = ability_names.get(aid)
            out.append({
                "slot": val(row.get("slot")),
                "ability": identifier(abilities, aid),
                "name": val(name_row.get("name")) if name_row else None,
                "is_hidden": val(row.get("is_hidden")),
            })
        return out

    def form_signature(pokemon_id):
        """Comparable fingerprint of a form's stats/types/abilities."""
        t = tuple(sorted(
            (val(r.get("slot")), val(r.get("type_id")))
            for r in types_by_pokemon.get(pokemon_id, [])
        ))
        s = tuple(sorted(
            (val(r.get("stat_id")), val(r.get("base_stat")))
            for r in stats_by_pokemon.get(pokemon_id, [])
        ))
        a = tuple(sorted(
            (val(r.get("slot")), val(r.get("ability_id")), val(r.get("is_hidden")))
            for r in abilities_by_pokemon.get(pokemon_id, [])
        ))
        return (t, s, a)

    output_pokemon = []
    seen_species = set()
    functional_form_count = 0

    for raw_species in species_rows:
        species = clean(raw_species)
        species_id = species.get("id")
        if species_id is None:
            report["warnings"].append({
                "issue": "Species row has no ID", "row": species
            })
            continue
        if species_id in seen_species:
            report["warnings"].append({
                "issue": "Duplicate species ID", "species_id": species_id
            })
        seen_species.add(species_id)

        members = pokemon_by_species.get(species_id, [])
        if not members:
            report["warnings"].append({
                "species_id": species_id,
                "issue": "No pokemon rows for species"
            })
            continue

        default_rows = [m for m in members if val(m.get("is_default")) == 1]
        if default_rows:
            default_row = default_rows[0]
        else:
            default_row = members[0]
            report["warnings"].append({
                "species_id": species_id,
                "issue": "No default pokemon row; used first member"
            })
        if len(default_rows) > 1:
            report["warnings"].append({
                "species_id": species_id,
                "issue": "Multiple default pokemon rows",
                "count": len(default_rows)
            })

        source = clean(default_row)
        default_pokemon_id = source.get("id")
        # resolved_source: current values only (no _past). Kept for sibling
        # parity with the move builder's source/resolved_source pair.
        resolved_source = dict(source)

        # localized name + genus
        name_row = species_names.get(species_id)
        name = val(name_row.get("name")) if name_row else None
        genus = val(name_row.get("genus")) if name_row else None
        if not name_row:
            report["warnings"].append({
                "species_id": species_id,
                "issue": f"No localized species name for language {lang}"
            })

        # dex numbers (all regional), national called out
        dex_numbers = []
        national_dex = None
        for row in dex_numbers_by_species.get(species_id, []):
            pid = val(row.get("pokedex_id"))
            number = val(row.get("pokedex_number"))
            entry = {
                "pokedex": identifier(pokedexes, pid),
                "pokedex_id": pid,
                "number": number,
            }
            dex_numbers.append(entry)
            if national_dex_id is not None and pid == national_dex_id:
                national_dex = number
        dex_numbers.sort(key=lambda e: (e["pokedex_id"] is None, e["pokedex_id"]))

        # egg groups
        eggs = []
        for row in egg_groups_by_species.get(species_id, []):
            gid = val(row.get("egg_group_id"))
            gname = egg_group_names.get(gid)
            eggs.append({
                "egg_group": identifier(egg_groups, gid),
                "name": val(gname.get("name")) if gname else None,
            })

        # evolution (per-node)
        evo_from = species.get("evolves_from_species_id")
        evo_rows = [clean(r) for r in evolution_by_evolved.get(species_id, [])]
        for er in evo_rows:
            tid = er.get("evolution_trigger_id")
            er["evolution_trigger"] = identifier(evo_triggers, tid)
            tname = evo_trigger_names.get(tid)
            er["evolution_trigger_name"] = (
                val(tname.get("name")) if tname else None
            )
        evolution = {
            "chain_id": species.get("evolution_chain_id"),
            "evolves_from_species_id": evo_from,
            "evolution_details": evo_rows,
        }

        # grouped descriptive lookups
        color_id = species.get("color_id")
        shape_id = species.get("shape_id")
        habitat_id = species.get("habitat_id")
        growth_id = species.get("growth_rate_id")
        gen_id = species.get("generation_id")

        color_name_row = color_names.get(color_id)
        shape_name_row = shape_prose.get(shape_id)
        habitat_name_row = habitat_names.get(habitat_id)
        growth_name_row = growth_rate_names.get(growth_id)

        # flavor
        flavor_row = flavor_text_by_species.get(species_id)
        flavor_summary_row = flavor_summaries.get(species_id)

        # functional forms: non-default pokemon rows whose stats/types/abilities
        # differ from the default. Each carries its own resolved stats/types/abilities.
        default_sig = form_signature(default_pokemon_id)
        forms = []
        for m in members:
            if val(m.get("is_default")) == 1:
                continue
            form_pid = val(m.get("id"))
            if form_signature(form_pid) == default_sig:
                # purely cosmetic relative to default; skip per spec
                continue
            forms.append({
                "source": clean(m),
                "types": resolve_types(form_pid),
                "stats": resolve_stats(form_pid),
                "abilities": resolve_abilities(form_pid),
            })
            functional_form_count += 1
        forms.sort(key=lambda f: (f["source"].get("order") is None,
                                  f["source"].get("order")))

        item = {
            "source": source,
            "species_source": species,
            "resolved_source": resolved_source,
            "name": name,
            "genus": genus,
            "generation": identifier(generations, gen_id),
            "national_dex": national_dex,
            "dex_numbers": dex_numbers,
            "types": resolve_types(default_pokemon_id),
            "stats": resolve_stats(default_pokemon_id),
            "abilities": resolve_abilities(default_pokemon_id),
            "egg_groups": eggs,
            "evolution": evolution,
            "color": {
                "id": color_id,
                "identifier": identifier(colors, color_id),
                "name": val(color_name_row.get("name")) if color_name_row else None,
            },
            "shape": {
                "id": shape_id,
                "identifier": identifier(shapes, shape_id),
                "name": val(shape_name_row.get("name")) if shape_name_row else None,
            },
            "habitat": {
                "id": habitat_id,
                "identifier": identifier(habitats, habitat_id),
                "name": val(habitat_name_row.get("name")) if habitat_name_row else None,
            },
            "growth_rate": {
                "id": growth_id,
                "identifier": identifier(growth_rates, growth_id),
                "name": val(growth_name_row.get("name")) if growth_name_row else None,
            },
            "breeding": {
                "gender_rate": species.get("gender_rate"),
                "capture_rate": species.get("capture_rate"),
                "base_happiness": species.get("base_happiness"),
                "hatch_counter": species.get("hatch_counter"),
                "has_gender_differences": species.get("has_gender_differences"),
            },
            "flags": {
                "is_baby": species.get("is_baby"),
                "is_legendary": species.get("is_legendary"),
                "is_mythical": species.get("is_mythical"),
                "forms_switchable": species.get("forms_switchable"),
            },
            "flavor_summary": (
                val(flavor_summary_row.get("flavor_summary"))
                if flavor_summary_row else None
            ),
            "flavor_text": clean(flavor_row) if flavor_row else None,
            "forms": forms,
        }

        # unresolved-id warnings
        for field, value, table in (
            ("generation_id", gen_id, generations),
            ("color_id", color_id, colors),
            ("shape_id", shape_id, shapes),
            ("growth_rate_id", growth_id, growth_rates),
        ):
            if value is not None and table and value not in table:
                report["warnings"].append({
                    "species_id": species_id,
                    "issue": f"Unresolved {field}",
                    "value": value
                })
        # habitat is frequently null in the data; only warn when present-but-unresolved
        if habitat_id is not None and habitats and habitat_id not in habitats:
            report["warnings"].append({
                "species_id": species_id,
                "issue": "Unresolved habitat_id",
                "value": habitat_id
            })

        output_pokemon.append(item)

    # sort output by national dex when available, else species id
    output_pokemon.sort(key=lambda p: (
        p["national_dex"] is None,
        p["national_dex"] if p["national_dex"] is not None else 0,
        p["species_source"].get("id") or 0,
    ))

    report["counts"] = {
        "species_in_source": len(species_rows),
        "species_exported": len(output_pokemon),
        "pokemon_rows_in_source": len(pokemon_rows),
        "functional_forms_nested": functional_form_count,
        "localized_species_names": len(species_names),
        "flavor_text_species_selected": len(flavor_text_by_species),
        "national_pokedex_id": national_dex_id,
        "warnings": len(report["warnings"]),
    }

    dataset = {
        "dataset": "pokemon_species_api",
        "language_id": lang,
        "version_selection": "highest version_id (flavor text)",
        "pokemon": output_pokemon,
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

    print(f"Exported {len(output_pokemon)} species to: {output_path}")
    print(f"Nested functional forms: {functional_form_count}")
    print(f"Validation report: {report_path}")
    print(f"Warnings: {len(report['warnings'])}")
    if report["warnings"]:
        print("Review pokemon_validation_report.json for details.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, csv.Error, UnicodeError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
