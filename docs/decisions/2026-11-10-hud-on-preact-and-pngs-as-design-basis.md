## 2026-11-10, The HUD is a Preact overlay; PNGs are a design basis, not shipped art (Jess)
Rendering: the screen-fixed HUD moves off the game canvas into an HTML/CSS overlay built with Preact, htm and Preact Signals (vendored into the repo, since file:// cannot fetch packages; no compile step). Adopted now so the menus can follow on the same footing without a later rework. Things tied to world positions (arrows, damage numbers, debug overlays) stay on the canvas.
Performance: keep every design effect and build each the cheapest way that looks the same (moved and faded pre-made layers over live filters, per-frame values through Signals). A fallback quality tier only where no cheap equivalent exists, the full design always the default. Measure on the work laptop during a heavy run.
Assets: a PNG (mockup, rip or frame) is the design basis; the HUD and menu pieces are drawn in CSS at native resolution from it, not shipped as upscaled PNGs. Existing menu PNG frames are replaced when those menus move to Preact.
No profiling ticket for now (Jess).
Canonical: docs/HUD-STYLE.md (Rendering, Performance, Assets), built in #61.
