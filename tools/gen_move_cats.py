# gen_move_cats.py — report the mainline damage category (physical/special/status)
# for each move in js/data/moves.js, from the local pokeapi-master data.
#   python tools/gen_move_cats.py
#
# REPORT-ONLY: it does NOT edit moves.js. It prints, per move id:
#   - the category pokeapi says it should be,
#   - the category currently in moves.js (if any),
#   - and flags MISMATCH / MISSING / CUSTOM (id not in mainline).
# Apply any changes to moves.js by hand (moves.js is propose-and-approve game data).
#
# Category source: pokeapi-master/data/v2/csv/move_damage_classes.csv (id -> name)
# joined to moves.csv (identifier -> damage_class_id). In-game 'buff' kind is always status.

import csv, re, os

ROOT = os.path.join(os.path.dirname(__file__), "..")
MOVES_JS = os.path.join(ROOT, "js", "data", "moves.js")
CSV = os.path.join(ROOT, "pokeapi-master", "data", "v2", "csv")

def load_mainline_cats():
    dc = {}
    with open(os.path.join(CSV, "move_damage_classes.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            dc[row["id"]] = row["identifier"]           # 1 status, 2 physical, 3 special
    cat = {}
    with open(os.path.join(CSV, "moves.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            cat[row["identifier"]] = dc.get(row["damage_class_id"], "?")
    return cat

def load_moves_js():
    src = open(MOVES_JS, encoding="utf-8").read()
    # id, kind, and existing cat (if present) per RAW entry
    out = []
    for m in re.finditer(r"\{ id: '([^']+)', name: '[^']*', type: '[^']+', kind: '([^']+)',(?: cat: '([^']+)',)?", src):
        out.append({"id": m.group(1), "kind": m.group(2), "cat": m.group(3)})
    return out

def expected(mid, kind, mainline):
    if kind == "buff":
        return "status"
    return mainline.get(mid)      # None if the id is not a mainline move (custom)

def main():
    mainline = load_mainline_cats()
    moves = load_moves_js()
    n_ok = n_missing = n_mismatch = n_custom = 0
    print(f"{'move id':22} {'kind':10} {'expected':9} {'in moves.js':11} status")
    print("-" * 70)
    for mv in moves:
        exp = expected(mv["id"], mv["kind"], mainline)
        cur = mv["cat"]
        if exp is None:
            flag = "CUSTOM (hand-assign; fallback will use kind)"; n_custom += 1
        elif cur is None:
            flag = f"MISSING -> add cat: '{exp}'"; n_missing += 1
        elif cur != exp:
            flag = f"MISMATCH (expected '{exp}')"; n_mismatch += 1
        else:
            flag = "ok"; n_ok += 1
        print(f"{mv['id']:22} {mv['kind']:10} {str(exp):9} {str(cur):11} {flag}")
    print("-" * 70)
    print(f"ok={n_ok}  missing={n_missing}  mismatch={n_mismatch}  custom={n_custom}  total={len(moves)}")
    if n_missing or n_mismatch:
        print("\nApply the suggested cat values to js/data/moves.js by hand (propose-and-approve).")

if __name__ == "__main__":
    main()
