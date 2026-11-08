## 2026-10-31, New path primitive path.loop for Fairy Wind (Jess)
Travelling shots gain path.loop { radius, frequency }: the shot circles a base point that keeps travelling straight, so it draws loop-de-loops that drift away from the caster. The loop is centred on the base point, so the first loop goes round the caster and the shot starts one radius across from it; it never turns the base heading, and adds to oscillate. Needed because curve alone traces a closed circle and oscillate is a 1D weave. First user: Fairy Wind (radius 70, 0.6667 Hz, 90 px/s drift, 2 loops in 3 s; retuned and centred after the same-day feel test). Rule change: grammar, runtime and render trail.
Canonical: docs/current feature planning/combat-architecture.md D38; docs/MOVE-AXIS-SCHEMA.md path row

