# Cloudflare TURN for co-op

**Why:** when two players cannot connect directly (mobile data,
some routers), their group games were relayed through Firebase's Realtime
Database, which charges $1 per GB. On 2026-10-11 that was about 650 MB per hour.
With Cloudflare's TURN that traffic goes through Cloudflare: **1,000 GB free per month**
and after that $0.05 per GB.

Pieces:
- `cloudflare/turn-worker.js`: a Cloudflare Worker (free) that gives temporary
  TURN keys only to players with an account (it checks their Firebase token).
- `js/net/net.js`: the game requests the keys from `https://turn.pokesurvivor.com/` on
  entering a room. If the Worker does not respond, everything continues as before.

## Steps (in https://dash.cloudflare.com)

### 1. Create the TURN key
1. Left menu: **Realtime** (may show as *Calls*) -> **TURN Server**.
2. **Create** -> name `pokesurvivor` -> **Create**.
3. Copy and save the two values shown (the API Token is only visible once):
   - **Turn Token ID**
   - **API Token**

### 2. Create the Worker
1. Menu: **Workers & Pages** -> **Create** -> **Create Worker** (or *Start with Hello World*).
2. Name: `pokesurvivor-turn` -> **Deploy**.
3. **Edit code**: delete everything, paste the content of `cloudflare/turn-worker.js` -> **Deploy**.

### 3. Save the keys in the Worker
1. In the Worker: **Settings** -> **Variables and Secrets** -> **Add**.
2. Type **Secret**, name `TURN_KEY_ID`, value: the *Turn Token ID* -> save.
3. **Add** again: type **Secret**, name `TURN_KEY_API_TOKEN`, value: the *API Token*.
4. **Deploy** if it asks you to.

### 4. Give it the address turn.pokesurvivor.com
1. In the Worker: **Settings** -> **Domains & Routes** -> **Add** -> **Custom domain**.
2. Type `turn.pokesurvivor.com` -> **Add domain**. Cloudflare creates the DNS record on its own
   (no need to touch the GitHub records).

When it is ready, let me know: I check that the Worker gives keys and the game is uploaded.

## "N playing now" counter (same Worker)

The Worker also has the `/online` route: each tab pings on opening the game and
every 20 min, and a Durable Object (`Online`, free on the Free plan) counts the
sessions of the last 25 min. It does not use Firebase. If the day's free quota
runs out (100,000 calls), the counter does not show and nothing more: the Free plan does not charge.

Since it needs the Durable Object, this Worker is deployed with wrangler from the
`cloudflare/` folder (see `wrangler.toml`; the TURN keys are kept):

    npx wrangler login      (once)
    npx wrangler deploy
