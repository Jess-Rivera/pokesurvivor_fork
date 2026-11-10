## 2026-11-10, HUD sizes are fixed pixels, taken from the mockup at 1080p (Jess)
The HUD stays in fixed CSS pixels and never scales with the window (scaling makes pieces look odd while resizing). The fixed values are the sizes the run-screen mockup gives at 1080p, the default player monitor; on Jess's 1440p dev monitor the HUD looks proportionally smaller, by design.
Measuring: the mockup's black rectangle is the game's part of a 1080p monitor; convert by its width (1920 px), since browser chrome eats an unknown share of the height.
Existing fit guards on small screens (for example the team strip shrinking on short windows, the boss bar capped at the window width) stay; they are not scaling.
Applies to #35 and every later HUD restyle slice from the mockup.
Canonical: assets/excalidraw/run_screen_mockup.png and this file, until a HUD layout spec exists.
