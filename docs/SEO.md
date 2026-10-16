# SEO and the pokesurvivor.com domain

Everything technical is already prepared in the code. What is left is what only you
can do (buy the domain, configure the DNS and register the site on Google).

## What is prepared

| File | What for |
|---|---|
| `index.html` | Title and description aimed at searches ("free online Pokemon game", "Survivor.io style"), canonical address, cards for social networks (Open Graph / Twitter), `VideoGame` structured data (free, 1-4 players, browser/Android/iOS) and real text while it loads (with an `<h1>`). |
| `guia/` | Guide with how to play, features, tips and **frequently asked questions** (with `FAQPage` data, which Google can show as expandables in the results). |
| `pokedex/` | The 966 playable Pokemon with their types and sprites: attracts searches like "free game with Pikachu". |
| `404.html` | A "does not exist" page with links to the game (GitHub Pages uses it on its own). |
| `robots.txt` | Allows crawling everything except `tools/` and `docs/`, and points to the sitemap. |
| `sitemap.xml` | The pages that have to be indexed. |
| `assets/og-image.jpg` | The image that shows when sharing the link (1200x630). |
| `manifest.webmanifest`, icons | Installable app, icon in the browser and on mobile. |

The pages are regenerated with `python tools/make_seo_pages.py` (for example, if
the Pokemon or the features change).

> **Important:** the canonical addresses already point to `https://pokesurvivor.com/`.
> Do not publish these changes until the domain works, or Google will try
> to index a domain that does not yet exist.

## 1. Domain

The steps to get pokesurvivor.com running (DNS at Cloudflare, GitHub Pages,
Firebase and the final step) are in [DOMINIO.md](DOMINIO.md).

## 2. Google Search Console (the most important)

1. Go to <https://search.google.com/search-console> with your Google account.
2. **Add property -> Domain** -> `pokesurvivor.com`.
3. Google gives you a **TXT** record: add it in the DNS (name `@`) and press Verify
   (it may take a few minutes).
4. **Sitemaps** -> submit `sitemap.xml`.
5. **URL Inspection** -> `https://pokesurvivor.com/` -> **Request indexing**.
   Repeat with `/guia/` and `/pokedex/`.

Bing (and with it DuckDuckGo and Ecosia): <https://www.bing.com/webmasters> -> "Import
from Google Search Console".

## 3. What ranks best (off the site)

Google raises the sites that other sites link to and that people search for by name:

- **YouTube trailer** with the link on the first line of the description and the
  title "PokeSurvivor - Free Pokemon game in the browser".
- **itch.io**: create a game page (free, in the HTML5 category) with a link.
- **Reddit**: r/PokemonROMhacks, r/incremental_games, r/WebGames, r/survivorslikes
  (read their rules; many like free fan games with no ads).
- **Discord**: Pokemon fan-game and "survivors-like" servers.
- **TikTok / Shorts** with 15 s clips (shinies, legendaries, co-op).
- Ask whoever plays it to link or share it: every link counts.

## 4. Over time

- Check in Search Console the **searches** that bring you visits and add answers
  to those questions to the guide.
- Each big piece of news: a new entry (for example `novedades/`) and to the sitemap.
- The pages load fast (Lighthouse: guide and Pokedex 100/100/100/100).

## Notice

"Pokemon" is a registered trademark. The name PokeSurvivor and the domain can
attract notices from The Pokemon Company; the legal notice and the free, non-profit
nature help, but they do not remove that risk.

## How we work now (important)

- **You edit `dev.html`** (and the `js/`), not `index.html`. `dev.html` loads each script
  separately for development; `index.html` is the version for publishing, with everything in
  a single `js/app.min.js` (the front page loads much faster).
- Before testing the final version or publishing:

```
node tools/build.js            # dev.html -> index.html + js/app.min.js
node tools/export_data.js      # game data for the pages
python tools/make_seo_pages.py # pages in Spanish and English, en/index.html, sitemap
```

## Languages

- The game shows up in **English or Spanish** depending on the browser language and is changed in
  Settings -> Graphics -> Language. `/en/` opens the game in English.
- English texts: `js/data/lang-en.js` (key = the Spanish text). If you add a
  new text to the game, add its translation there too.
- Pages: guide, Pokedex, legendaries, shinies, types, moves, items, achievements and
  news, each one in both languages and linked to each other (hreflang).
