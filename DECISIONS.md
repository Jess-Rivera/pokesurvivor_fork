# DECISIONS

Standing design and workflow rulings. Once something is here, treat it as settled, do not relitigate it.
Add a dated entry whenever a durable decision is made.

---

## 2026-10-17, Local-first scope
Build and perfect the LOCAL single-player game before any cloud/online work. Deferred until Jess
explicitly switches phase: Firebase (auth, Firestore, RTDB, cloud saves), Cloudflare TURN worker,
and the entire multiplayer/co-op/networking stack (js/net/: social, net, coop, ranking, signups),
plus friends, rooms, online leaderboards. Multiplayer is tied to the cloud work and deferred with it.

## 2026-10-17, English-native development
Jess develops in English, not Spanish. Author all new user-facing strings directly in English.
Inherited Spanish string literals stay as-is (they are the runtime i18n keys via lang-en.js). Do
NOT add lang-en.js entries or Spanish translations for our own new strings. New features render
English-only, and that is intended. Jess is not maintaining the Spanish side.

## 2026-10-17, Edit boundary (propose-first vs free-edit)
Dividing line: "does this change what the game does when you run it?"
- Yes (game code, js/data/*.js, dev.html, build config, assets): PROPOSE-first, Jess applies by hand.
- No (Markdown project docs: CONTEXT/DEVLOG/DECISIONS/BALANCE/TODO/ISSUES): assistant edits directly.
Note: js/data/*.js looks like docs but IS game data (the game loads it), so it is propose-first.

## 2026-10-17, Git execution
The AI assistant never runs git, ever. It provides commands and strategy only; Jess runs all git himself.

## 2026-10-17, Docs portability
All project docs live in-repo (not in a tool's private memory) so git pull carries them to Claude
Desktop at home. The repo is the single shared source of truth between the two tools.

## 2026-10-17, Performance stance
Vision first, trim fat later. Ignore small per-frame millisecond differences at this stage. BUT a
visible framerate collapse (e.g. 60fps to ~22fps at high enemy density) is a FEEL problem and is
addressed immediately, not deferred.
