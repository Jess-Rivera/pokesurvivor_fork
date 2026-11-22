---
title: "#155 pixel panels frame one Pokemon and what it owns; everything shared, and the code's own interface, is clean (Jess)"
date: 2026-11-18
issues: [155]
area: ui
canonical: "js/ui/lib/primitives/panel/panel.js header, once #126 applies it; until then this file."
---
# 2026-11-18: #155 pixel panels frame one Pokemon and what it owns; everything shared, and the code's own interface, is clean (Jess)

- Pixel (panel.pixel, panel.slanted, the B2 art): one Pokemon. pause.pokemonDetail's stats and moves boxes, its held item
  slot, catch.window.pokemon (the catch screen's left box, the Pokemon being caught) and run.hud.moveSlot.
- Clean (a clean panel in the button.glitch style, not designed yet): what the team shares and the code's interface.
  Both belts (catch.window.belt, main.shop.pokeball.belt), the run items (run.hud.runItem, main.inventory.slot), the
  shop's team item cards, the Berry Pocket, the Shop's Character Upgrades pocket boxes (main.shop.upgrades.pocket), the
  catch screen's Pokemon owned box (a list from your collection), and every window, prompt and button.
- Why (docs/META-NARRATIVE.md): the Pokemon sit inside the code's clean interface, so a glitch reads as that outer layer
  cracking around them.
- Applied at #126. The clean panel's design is its own issue. panel.story.js's places list leaves out the catch
  screen's Pokemon owned box (it draws panel.pixel today).

Canonical: js/ui/lib/primitives/panel/panel.js header, once #126 applies it; until then this file.
