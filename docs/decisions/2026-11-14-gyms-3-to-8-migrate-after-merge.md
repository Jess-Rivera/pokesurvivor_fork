---
title: "gyms 3 to 8 migrate after feature/gym-leader-ai merges (Jess)"
date: 2026-11-14
issues: []
area: gyms
canonical: "docs/proposals/host-model-plan.md, slice 12."
---
# 2026-11-14, gyms 3 to 8 migrate after feature/gym-leader-ai merges (Jess)

feature/gym-leader-ai merges to main with only Brock and Misty on the AI player; gyms 3 to 8 stay on GymBrain until
then. Host-model slice 12 (migrate gyms 3 to 8, delete the old brain) runs on its own branch off main after the merge,
one gym per session, and starts after the Brock and Misty tuning settles the personality template. Why: the branch is
212 commits ahead with main unchanged, so the merge is clean now; six gyms authored on a model still being tuned would
need retuning; each gym also moves from one mon to a team, so its feel test stays isolated. The two leader paths on main
are the duplication the host-model plan accepts: keep the window short, add no features to the old brain.

Ordering superseded the same day by 2026-11-14-template-check-then-gyms-then-full-tuning (template check, then gyms 3 to
8, then one tuning pass across all eight). The rest of this ruling stands.

Canonical: docs/proposals/host-model-plan.md, slice 12.
