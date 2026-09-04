# London Now — Build 3: Ticketmaster events (v0.4.0)

This release adds live, licensed London event listings from the Ticketmaster Discovery API to the existing `london-now` Worker. It retains the approved TfL, Met Office, airport-access, departure-board, unified-tools and Google Sites embed behaviour.

Affiliate tracking is deliberately disabled. Standard Ticketmaster event URLs are used until the Impact application is approved and its UK link rules are confirmed.

## What changes

- Adds `/api/events?date=YYYY-MM-DD&category=all`.
- Adds categories for Music, Theatre & Arts, Sport and Family.
- Connects the existing three-day date selector to event results.
- Shows up to six events in the dashboard and returns up to twelve from the API.
- Caches each date/category response for six hours.
- Excludes cancelled events and rejects outbound URLs outside `ticketmaster.co.uk`.
- Shows `Price unavailable` when Ticketmaster supplies no price; missing data is never interpreted as free.
- Adds loading, empty, missing-key and upstream-failure states.

## Before uploading the package

Keep v0.3.4 working in production. This update can be committed directly to `main`, as requested for recent London Now releases. Cloudflare will deploy automatically and the existing Worker URL and Google Sites embed do not change.

## 1. Add the Ticketmaster key to Cloudflare

1. Open **Cloudflare → Workers & Pages → london-now**.
2. Open **Settings → Variables and Secrets**.
3. Add a new **Secret** named exactly:

   ```text
   TICKETMASTER_API_KEY
   ```

4. Paste the Ticketmaster **Consumer Key** as the value.
5. Save it.

Do not use the Consumer Secret. Do not add either credential to GitHub, `wrangler.jsonc`, `public/app.js`, screenshots or support messages.

Existing `METOFFICE_API_KEY`, optional `TFL_APP_KEY`, `WEATHER_CACHE` and the hourly weather trigger must remain unchanged.

## 2. Update the existing GitHub repository

1. Extract this ZIP.
2. Open the existing GitHub repository and select `main`.
3. Choose **Add file → Upload files**.
4. Upload the contents *inside* the extracted folder to the repository root.
5. Confirm the root contains `public/`, `worker/`, `tests/`, `package.json` and `wrangler.jsonc`.
6. Commit directly to `main` with:

   ```text
   Add live Ticketmaster events
   ```

Do not upload the ZIP or create an enclosing `london-now-v0.4.0-ticketmaster-events/` folder in the repository.

## 3. Wait for the existing Cloudflare build

No build setting changes are required. Retain:

| Setting | Value |
|---|---|
| Root directory | `/` |
| Build command | `npm run check` |
| Deploy command | `npm run deploy` |

The build must finish successfully and deploy the existing `london-now` Worker.

## 4. Validate production endpoints

Open these URLs:

```text
https://london-now.ppastorin.workers.dev/api/health
https://london-now.ppastorin.workers.dev/api/events
https://london-now.ppastorin.workers.dev/api/events?date=2026-09-05&category=music
https://london-now.ppastorin.workers.dev/
```

`/api/health` must return HTTP 200 with version `0.4.0` and `integrations.events: "ready"`.

`/api/events` must return HTTP 200 with:

- `provider: "Ticketmaster Discovery API"`
- `affiliateLinks: false`
- the requested London date and category
- an `events` array
- no API key

An empty `events` array is valid when Ticketmaster has no matching listing. HTTP 401 or 503 means the Consumer Key or Cloudflare secret needs correction. HTTP 429 means the Ticketmaster allowance has been exceeded.

## 5. Validate the dashboard and Google Sites

Complete `TEST-CHECKLIST.md`. In particular:

- Change Today/Tomorrow/third day and confirm the events change.
- Test every category.
- Open at least two event links and confirm they land on Ticketmaster UK.
- Confirm unknown prices say `Price unavailable`.
- Confirm no internal or horizontal scrollbar appears in the Google Sites embed.
- Confirm the existing embed code and URL remain unchanged.

After production passes, tag the approved commit:

```text
v0.4.0-ticketmaster-events-approved
```

## Affiliate activation later

Do not manually append guessed affiliate parameters. After Impact approves the application, use its onboarding guide and UK contract to implement the authorised deep-link format. The API response deliberately reports `affiliateLinks: false` so there is no ambiguity about the current build.

## Rollback

If production fails, roll Cloudflare back to the approved v0.3.4 deployment and revert the GitHub commit. Removing this release does not delete or modify the Ticketmaster account or Consumer Key.
