## 2026-10-31, D-COOP: no co-op work in slice 7a (Jess)
Co-op cannot run in the local-first phase, since the net stack it needs is deferred and does not work, so there is no local co-op behavior to preserve through the flip. 7a does no co-op work; co-op on the new move path is designed in the MP phase (TODO deferred section).
Canonical: docs/current feature planning/move-schema-post-auth/slice-7a.md, "Blocking decisions"

