## 2026-10-31, 2-buff learn limit on the new path: self-only buffs (Jess)
On the new move path a move counts toward the 2-buff learn limit when every effect in it, emitted children included, lands on its own side: a self or team stat change, a self heal, a shield, a recoil cost. That is the five stat and heal buffs (Swords Dance, Agility, Harden, Dragon Dance, Aqua Ring) plus Substitute. Moves with a foe-side effect but no damage (Toxic, Will-O-Wisp, String Shot, Spikes, Toxic Spikes) are not buffs, since they still act on enemies. Replaces the build default "no damage anywhere". Unrouted moves keep the legacy kind check until 7b.
Canonical: js/systems/team-cards.js selfOnly; docs/current feature planning/move-schema-post-auth/slice-5-handoff.md

