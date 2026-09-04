# London Now — v0.5.5 TfL resilience

This release fixes the TfL HTTP 429 issue caused when the Cloudflare secret is named `TFL_API_KEY`. Earlier releases read only `TFL_APP_KEY`; v0.5.5 prefers `TFL_API_KEY` and continues to accept the legacy name.

It also adds one controlled retry for transient TfL failures and, after at least one successful request, shows a last-confirmed status for up to five minutes instead of immediately replacing the dashboard with an error. The API marks that response with `stale: true`, `degraded: true` and `x-cache: STALE`.

## 1. Confirm the TfL product and key

1. Sign in at <https://api-portal.tfl.gov.uk/>.
2. Confirm that your application is subscribed to the free **500 requests per minute** product, rather than relying on anonymous access.
3. Copy the application's API key. Do not paste it into GitHub or this package.

## 2. Store the preferred Cloudflare secret

1. Open **Cloudflare → Workers & Pages → london-now**.
2. Open **Settings → Variables and Secrets**.
3. Add or edit an encrypted **Secret** named exactly:

   ```text
   TFL_API_KEY
   ```

4. Paste the TfL API key and save it.
5. If `TFL_APP_KEY` already exists, it may remain temporarily. `TFL_API_KEY` takes precedence. Once production reports registered access, the old secret can be removed.

Retain `METOFFICE_API_KEY`, `NATIONAL_RAIL_API_KEY`, `TICKETMASTER_API_KEY`, the existing `WEATHER_CACHE` binding and the hourly trigger. The existing KV binding is also used for the short-lived last-confirmed TfL snapshot; no new resource is required.

## 3. Update the existing repository

This release can be committed directly to `main`.

1. Extract the ZIP.
2. Open the existing `london-now` GitHub repository and select `main`.
3. Choose **Add file → Upload files**.
4. Upload the contents inside the extracted folder to the repository root.
5. Confirm that `public/`, `worker/`, `tests/`, `package.json` and `wrangler.jsonc` remain at the root.
6. Commit with:

   ```text
   Fix TfL authenticated requests and fallback
   ```

Do not upload the ZIP or its enclosing folder. No Cloudflare build-setting or Google Sites embed change is required.

## 4. Validate production

After Cloudflare finishes deploying, open:

```text
https://london-now.ppastorin.workers.dev/api/health
https://london-now.ppastorin.workers.dev/api/tfl
https://london-now.ppastorin.workers.dev/api/airport-access
https://london-now.ppastorin.workers.dev/
```

`/api/health` must show version `0.5.5` and `"tfl": "registered"`.

`/api/tfl` should return HTTP 200 with:

```json
{
  "accessMode": "registered",
  "stale": false,
  "degraded": false
}
```

Refresh it after 75 seconds to force a new upstream cycle. A temporary upstream failure may instead return HTTP 200 with `stale: true` for no more than five minutes. The dashboard will say **TfL update delayed** and show the last confirmation time.

If health says `anonymous`, the active Worker does not have either supported secret. Check the spelling, ensure it is an encrypted Secret for `london-now`, save it, and redeploy.

If health says `registered` but `/api/tfl` still consistently returns HTTP 429, the code is sending a key; confirm in the TfL portal that this exact key belongs to an active application subscribed to the free product.

After all checks pass, tag the approved commit:

```text
v0.5.5-tfl-resilience-approved
```

## Retained behaviour

- Live Met Office forecast with request-time recovery and hourly refresh.
- Live National Rail departures and public-transport airport access.
- Ticketmaster event categories and London Advanced visual tool cards.
- Bounded mobile views and the existing Google Sites scrolling fix.
- Official airport departure-board links; the dashboard does not claim to provide live flight operations.

## Rollback

If the release causes a regression, use Cloudflare deployment history to restore v0.5.4 and revert the GitHub commit. Secrets are not removed by a rollback.
