#!/usr/bin/env bash
# seed_issues.sh — one-time backlog seeding for PokeSurvivor English Fork.
# Creates GitHub issues from TODO.md (In progress + Up next) with labels,
# and adds each to the PokeSwarm project board.
#
# Prereqs:
#   - gh authed (gh auth status) with the 'project' scope:
#       gh auth refresh -s project
#   - run from inside the repo:  bash tools/seed_issues.sh
#
# Safe to read first. Each issue auto-lands in Triage on PokeSwarm
# (new issues have no status until you set it; the board shows them in the
#  no-status/Triage area — drag or set Status after).
#
# NOTE: #1 (gym sprite display fix) already exists, so it is NOT recreated here.

set -euo pipefail

PROJECT="PokeSwarm"

mk() {
  # mk "title" "labels" "body"
  gh issue create --title "$1" --label "$2" --project "$PROJECT" --body "$3"
}

# ---------------- In progress ----------------

mk "Moves import: resolver + 4 data files + 64-move conversion harness" \
"feature,area:moves,ready" \
"Importer slice of feature/all-moves-import. Build the move-data-raw layer from pokeapi-master/data/v2/csv/api_dataset.json (937 moves, Jess hand-built), the three other layers (attributes/classification/overrides), the resolver, and a 64-move CONVERSION HARNESS that proves the current 64 moves resolve unchanged (the go/no-go gate).

Resolver must null-guard: 110/937 moves have meta==null; 1 has no flavor_text; stat_chance==0 on a status move = guaranteed (not never); ~13 ailments are outside our status model.

See docs/MOVES-IMPORT-PLAN.md and docs/MOVE-AXIS-SCHEMA.md. Blocks resuming gyms."

mk "Review the remaining pending moves in move-decisions.json" \
"design,area:moves,ready" \
"~19 of 64 moves still pending in docs/move-decisions.json. Review each in the local docs/move-decisions-dashboard.html. Discipline: filtering to 'changed' then Approve-all is safe; do NOT blanket-approve the pending ones (they may carry merge bugs: empty payloads, wrong shapes). Scrutinize each."

mk "Settle open move feel-calls (Flamethrower / Night Shade / Psycho Cut)" \
"design,area:moves,needs-triage" \
"Three open feel-calls before the importer: (1) Flamethrower normalize true (90/cast) vs false (270 firehose); (2) Night Shade single-target vs full-circle aura; (3) Psycho Cut crit amount (or none, per the D4 no-move-crit lean). Bubble/Mud Shot normalize already decided = true."

mk "Gym progression: arena flow slice B (all-at-once multi-mon)" \
"feature,area:gyms,blocked" \
"rework/gym-progression slice B: the all-at-once arena flow (arena size by mon count, win = a SET of boss ids, one shared enrage clock, field G.Gym.roster at once). Convert enemy.js gymStart/gymCast and rift.js gym toasts to SimBus events as touched. BLOCKED on the moves import (gyms 2-8 need real moves). Slice A (roster data model) already built."

mk "Gym sprite display fix is tracked as #1 — harness for escalation clock/bump" \
"feature,area:gyms,ready" \
"Still no harness for the gym-gate escalation CLOCK itself (its events are covered, the clock is not). Add one. Related: #1 (the gym gate still draws the rift prop + purple tint). Design: DECISIONS 2026-10-22 'Gym gate is a pressure mechanic'."

mk "Boss damage slice: put bosses/gym leaders on the A/D ratio path" \
"balance,area:gyms,ready" \
"Bosses and gym leaders still use the flat def.dmg path (the biggest known balance hole). In the last log two Nidoking shots at a flat 17.3 each were 25% of all damage taken and ended the run. Put bosses on the A/D ratio and decide boss 'Power' (flat vs a boss-move). Opened 2026-10-17."

mk "Tileset loader + map generator cleanup" \
"feature,area:engine,ready" \
"Atlases for Shady Forest, Crystal Cave, Ash Volcano are baked (assets/tileset/*, G.TILESETS.*) but nothing in js/ loads them. Build: loader, map-generator cleanup of thin wall stubs, hedge occluder, rift arenas via filters. Open art gaps: Crystal deep-water inner piece, Ash Volcano deep-lava NE/NW concave corners, tall/short wall mixing rules. Specs: design/*-tileset-spec.md."

# ---------------- Up next ----------------

mk "Regional forms (blocks Lorelei, Agatha, Bruno gym builds)" \
"feature,area:gyms,blocked" \
"docs/GYM-ROSTERS.md needs Alolan Sandslash (Lorelei), Alolan Marowak (Agatha), Alolan Geodude line (Bruno slot 6). pokedex.js has NO regional forms (one entry per national dex number). Needs a plan: form data (types/stats from pokeapi-master -alola ids), sprites, evolution handling, gym-only vs collectible. Until built, gym data uses the regular form as a stand-in."

mk "Canonical type chart (0.5 / 2.0 / immune) — on hold" \
"balance,area:engine,blocked" \
"ON HOLD. Needs the immune-means-zero fix past the per-hit 1-damage floors (floorHit in combat.js, Math.max(1,raw) in Player.hurt), a boss-immunity rule, optional 'Immune' popup. Chart is still the softened SOFT one (1.6/0.6/0.3, clamp 0.3-2.4)."

mk "Canonical learnsets: real movepool per species" \
"feature,area:moves,blocked" \
"Give each species its real movepool (and move power), the shared system that lets both player and enemy 'Power' be real. Separate PokeAPI pull into one data file, capped per Pokemon. Gym rosters read from it. Depends on the moves import landing first. Opened 2026-10-17."

mk "More accurate hitboxes (per-species circle radius)" \
"feature,area:engine,needs-triage" \
"Today every unit is one circle (22% of idle frame width, clamped 5-26px). Option 1 (do first): per-species tuned circle radius from opaque pixels of the idle frame, measured once by an offline script into a data file. Then judge Option 2 (ellipse/capsule) only if serpents still feel wrong. Opened 2026-10-19, nothing decided."

echo
echo \"Done. Review the board: gh issue list  — or open PokeSwarm.\"
