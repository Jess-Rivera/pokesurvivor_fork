# 2026-11-17: one select and move key set across the Main Menu and its windows (Jess)

- Select: Enter and Space, everywhere (Main Menu rows, Shop, Inventory).
- Move: the arrows and the bound movement keys (WASD by default, as set in Settings), everywhere.
- The union of what each screen took before (#153): nothing that worked stops working.
- A key a menu handles goes no further (the rule in STATE "Watch"). The Main Menu now follows it too: before, Enter or
  Space on Play also reached the region picker's listener and started a run on the first card without showing it.
- Built in #153: js/ui/menu.js (rowStepOf, the listener stops the key), js/ui/menu-window-kit.js (Space presses).

Canonical: js/ui/menu-window-kit.js createMenuCursor for the windows; js/ui/menu.js for the Main Menu rows (until #126 / #127 moves the Main Menu onto the shared cursor).
