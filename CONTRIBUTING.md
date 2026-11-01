# Contributing & Playtesting

Thanks for playing PokeSurvivor and helping make it better. This page is for **playtesters**: how to report a bug, request a feature, and read the tracking board.

## Where things go

- **Bugs and feature ideas you want tracked → GitHub Issues** (this repo). They get a number, a status, and show up on the board.
- **Quick questions, chatter, "is this a known thing?" → the playtester Slack channel.** Slack is for conversation; GitHub is the record.

If in doubt, file it here. A quick issue is better than a lost Slack message.

## How to file

Click **Issues → New issue** and pick a template:

- **Bug report** — something broken or behaving wrong.
- **Feature request / idea** — a suggestion, change, or balance tweak.

The templates ask a few questions. Please fill them in; the more concrete, the faster it can be acted on.

### Filing a good bug report
- **Which build**: were you on the normal game (`index.html`) or the dev build (`dev.html`)?
- **What happened vs. what you expected.**
- **Steps to reproduce**, numbered.
- **Run context**: starter/team, roughly how far into the run, which region.
- **Try first**: a hard reload (Ctrl+Shift+R), and reproduce it once more. The save lives in your browser (localStorage), so some glitches are stale-state and clear on reload.
- **Console output**: press F12 → Console, copy any red errors in.
- **Browser and OS** (e.g. Chrome 142, Windows 11).

## How to read the board (PokeSwarm)

Issues flow left to right through these columns. Each column means something slightly different for a bug vs. a feature:

| Column | For a bug | For a feature |
|---|---|---|
| **Triage** | Submitted, not yet reviewed | Requested, not yet reviewed |
| **Accepted** | Accepted, will be fixed | Planned |
| **In Progress** | Being worked on | Being worked on |
| **Blocked** | Blocked on something else | On hold |
| **Needs Playtest** | Fixed, needs confirming in-game | Built, needs playtesting |
| **Shipped** | Resolved | Completed and in the game |

**Needs Playtest is where you come in most:** when something lands in that column, it's built but unconfirmed. Playing it and reporting back (works / still broken) is the most useful thing you can do.

## Labels you'll see
- **Type**: `bug`, `feature`, `balance`, `design`
- **Area**: `area:moves`, `area:gyms`, `area:enemies`, `area:items`, `area:ui`, `area:engine`
- **Status**: `needs-triage`, `ready`, `blocked`, `deferred`, `needs-playtest`
- `playtester` marks issues filed by a tester.

## A note on scope
The game is being built **local single-player first**. Online, multiplayer, accounts and leaderboards are deferred, so bugs or requests about those are valid but will be labeled `deferred` until that phase begins.

## License
This is a non-commercial fan project. See `LICENSE-NONCOMMERCIAL.md`. Reporting issues or suggesting ideas is welcome; it does not grant any commercial rights to the code.
