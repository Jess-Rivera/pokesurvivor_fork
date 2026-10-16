# Getting pokesurvivor.com up and running

The domain is bought at **Cloudflare** and does not yet point anywhere.
Everything in the code is already prepared: only the steps marked **YOU**
(the ones that need your account) and the final step, which I do when you tell me, are left.

Status as of 2026-10-10:

- [x] Domain bought at Cloudflare (Cloudflare DNS servers active).
- [x] `pokesurvivor.com` and `www.pokesurvivor.com` added to Firebase -> authorized
      domains (sign-in with Google will work from day one).
- [x] Pages in Spanish and English, sitemap, robots, 404 and a share image,
      generated and tested (Lighthouse: SEO 100, accessibility 100).
- [x] Final-step script rehearsed: `tools/activar_dominio.sh`.
- [x] Step 1 . DNS at Cloudflare (**YOU**)
- [x] Step 2 . Verify the domain on GitHub (**YOU**, recommended)
- [x] Step 3 . Final step (**ME**): done on 2026-10-10, with HTTPS
- [ ] Step 4 . Google Search Console and Bing (**YOU**)

---

## Step 1 . DNS at Cloudflare (YOU, 5 minutes)

1. Go to <https://dash.cloudflare.com> -> choose **pokesurvivor.com** ->
   left menu **DNS -> Records**.
2. Press **Add record** and create these 9 records. On all of them, the
   **Proxy status** switch has to stay on **DNS only** (**gray** cloud, not orange).

   | Type | Name | IPv4 / IPv6 / Target |
   |---|---|---|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | AAAA | `@` | `2606:50c0:8000::153` |
   | AAAA | `@` | `2606:50c0:8001::153` |
   | AAAA | `@` | `2606:50c0:8002::153` |
   | AAAA | `@` | `2606:50c0:8003::153` |
   | CNAME | `www` | `jpter78.github.io` |

   These are the GitHub Pages addresses, which is where the game is.

> **Why the gray cloud:** with the orange cloud, Cloudflare gets in the middle and
> GitHub cannot create the HTTPS certificate (the padlock). Also, with Cloudflare's
> "Flexible" SSL mode the site goes into a redirect loop. In gray everything
> works on the first try; later you can turn on the orange one with SSL
> **Full (strict)** if it ever matters, but it is not needed.

Optional and free in the same panel:
- **DNSSEC** (menu DNS -> Settings -> Enable DNSSEC): protects the domain against
  spoofing.
- **Email Routing**: a `contacto@pokesurvivor.com` email that reaches your Gmail,
  if you want an email with the game's name.

When you have it, tell me **"the DNS is ready"** and I check that it looks good from outside
(it usually takes from 5 minutes to 1 hour).

## Step 2 . Verify the domain on GitHub (YOU, recommended, 3 minutes)

It protects the domain: it prevents another GitHub account from using pokesurvivor.com.

1. Go to <https://github.com/settings/pages> (with the JPTER78 account).
2. **Add a domain** -> type `pokesurvivor.com` -> **Add domain**.
3. GitHub shows you a **TXT** record: a name along the lines of
   `_github-pages-challenge-JPTER78` and a long value.
4. In Cloudflare -> DNS -> Records -> **Add record**: Type **TXT**, Name the one GitHub gave you
   (without `.pokesurvivor.com` at the end), Content the long value.
5. Go back to GitHub and press **Verify**. If it says no, wait a few minutes and repeat.

## Step 3 . Final step (ME)

When the DNS works, I do it all:

1. `bash tools/activar_dominio.sh`: builds the game with the SEO, regenerates the
   pages, creates the `CNAME` file and prepares the commit (it checks that no
   private data slips in).
2. I upload it to GitHub and in GitHub Pages I set the domain `pokesurvivor.com`.
3. I wait for GitHub to create the certificate and turn on **Enforce HTTPS**.
4. I check in a real browser: the site, `www.` -> without `www`, the old github.io
   address -> the new one, English on `/en/`, signing in with an account and with Google,
   the ranking and co-op.
5. I set `https://pokesurvivor.com` as the GitHub repository's website.

**Watch out for guest saves:** they are stored in the browser and tied to the
address. Whoever plays as a guest on `jpter78.github.io` will not see that save on
`pokesurvivor.com` (registered accounts will, because they are in the cloud). If someone
asks you: they should create an account before the change.

## Step 4 . Google Search Console and Bing (YOU, after step 3)

1. <https://search.google.com/search-console> -> **Add property** ->
   **Domain** -> `pokesurvivor.com`.
2. Since the domain is at Cloudflare, Google offers to **verify with Cloudflare**
   automatically: accept and done (if not, it gives you a TXT to add like in
   step 2).
3. **Sitemaps** menu -> type `sitemap.xml` -> **Submit**.
4. **URL Inspection** menu -> `https://pokesurvivor.com/` -> **Request
   indexing**. Repeat with `https://pokesurvivor.com/en/`,
   `https://pokesurvivor.com/guia/` and `https://pokesurvivor.com/pokedex/`.
5. Bing (and with it DuckDuckGo and Ecosia): <https://www.bing.com/webmasters> ->
   **Import from Google Search Console**.

Google takes from a few days to a couple of weeks to start showing the site.

## Afterward

- Change the link in the YouTube trailer description, on Ko-fi and wherever you
  have shared it.
- What helps ranking most from here on is in [SEO.md](SEO.md),
  section 3 (links from YouTube, itch.io, Reddit, Discord...).
