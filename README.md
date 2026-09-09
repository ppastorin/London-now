# London Now — v0.6.0 live air quality

This release adds live air quality from the London Air Quality Network (LAQN) to the existing weather card. It uses the official hourly London monitoring-index JSON feed and shows the highest current UK Daily Air Quality Index reported across participating London monitoring sites.

The result is deliberately labelled **London network peak**. It is a conservative city-wide signal, not a claim about the air on every street.

## Source, account and licence

No account, registration or API key is required for the LAQN API.

Use is subject to the Open Government Licence v2.0. The interface includes links to LAQN / Imperial College London and the licence. The API documentation also asks developers to tell the Environmental Research Group about applications using the feed and recommends using a server proxy with appropriate caching.

Before or shortly after publishing, use the [LondonAir contact page](https://www.londonair.org.uk/london/asp/contact.asp) to provide:

- application name: **London Now / London Advanced**;
- public URL: `https://london-now.ppastorin.workers.dev/`;
- feed: hourly monitoring index for group `London`;
- usage: a public London visitor dashboard;
- controls: requests are proxied through Cloudflare and cached using the feed's `TimeToLive` value.

This is notification, not an account application. Do not create or store a fictitious LAQN secret.

## UI decision

Three placements were assessed:

| Option | Benefit | Cost | Decision |
|---|---|---|---|
| Separate card | Most visible | Longer mobile page and awkward desktop grid | Rejected |
| Global alert strip | Strong when pollution is elevated | Feature disappears on normal days | Retain as a possible later enhancement |
| Weather-card module | Keeps environmental conditions together and fills existing space | Less visually dominant | Implemented |

The implemented module includes the 1–10 index, official band, peak pollutant, reporting-site count, bulletin time, source and licence. It creates no new mobile tab and preserves the bounded Google Sites layout.

## Integration design

```text
Browser / Google Sites
        ↓
Cloudflare Worker /api/air-quality
        ↓
Existing WEATHER_CACHE KV binding
        ↓
Official LAQN hourly London JSON feed
```

The upstream response is normalized server-side. Visitors never download the large source payload. The Worker uses LAQN's supplied validity period, refreshes when needed, and retains the most recent result if a temporary refresh fails. Data more than two hours old is labelled stale.

## Deploy to the existing application

No new GitHub repository, Cloudflare Worker, KV namespace, variable or secret is required.

1. Extract the release ZIP.
2. Open the existing `london-now` GitHub repository.
3. Select branch `main`.
4. Choose **Add file → Upload files**.
5. Upload the contents inside `london-now-v0.6.0-air-quality` to the repository root.
6. Confirm the repository root still contains `public/`, `worker/`, `tests/`, `package.json` and `wrangler.jsonc`.
7. Commit with:

   ```text
   Add live LAQN air quality
   ```

Do not upload the ZIP or create an extra enclosing directory.

## Cloudflare

Retain the existing settings:

| Setting | Value |
|---|---|
| Worker | `london-now` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm run check` |
| Deploy command | `npm run deploy` |

Retain the existing `WEATHER_CACHE` KV binding. Despite its historical name, this binding now stores small weather, TfL fallback and air-quality snapshots. Renaming it would create migration risk for no user benefit.

Retain all existing secrets, including `TFL_API_KEY`, `METOFFICE_API_KEY`, `NATIONAL_RAIL_API_KEY` and `TICKETMASTER_API_KEY`. LAQN needs no additional secret.

The existing hourly Cloudflare trigger remains sufficient because `/api/air-quality` also refreshes on demand when LAQN's own TTL expires.

## Production validation

After Cloudflare completes deployment, open:

```text
https://london-now.ppastorin.workers.dev/api/health
https://london-now.ppastorin.workers.dev/api/air-quality
https://london-now.ppastorin.workers.dev/
```

Health must return version `0.6.0` and:

```json
"airQuality": "ready"
```

The air-quality response must return HTTP 200 and include:

```json
{
  "provider": "London Air Quality Network",
  "scope": "Highest current index reported across London monitoring sites",
  "index": 1,
  "band": "Low",
  "stale": false
}
```

The example index and band above illustrate the response shape only; production values will change. Validate that:

- `index` is an integer from 1 to 10, or `null` when LAQN reports no current index;
- `band` is Low, Moderate, High or Very High when an index exists;
- `pollutants` and `reportingSiteCount` are present;
- `dataAt`, `fetchedAt` and `validUntil` are plausible;
- no API key or full upstream station payload is returned.

Repeat the request before `validUntil`; it should normally report `x-cache: HIT`. After expiry, it should report `REFRESH`. A temporary upstream failure with an existing snapshot returns `x-cache: STALE` and the UI says **refresh delayed**.

## Interface and mobile validation

1. Check the desktop dashboard at 1280 px: air quality must sit inside the weather card, not create a separate grid card.
2. Check 768 px and confirm the weather/air-quality content does not overlap.
3. Check the published Google Sites page at 320 px and 390 px.
4. Confirm the complete air-quality module, weather source row and TfL card can all be reached.
5. Confirm there is no horizontal scrollbar and only one usable vertical scroll path.
6. Switch through Now, Travel, Flights, Events and Tools; all existing sections must remain reachable.
7. Confirm both LAQN / Imperial and OGL v2.0 links open the official pages.

The existing Google Sites embed code does not need to be replaced.

After production passes, tag the approved commit:

```text
v0.6.0-air-quality-approved
```

## Rollback

If the release causes a regression, restore v0.5.5 in Cloudflare deployment history and revert the GitHub commit. No Cloudflare resource or secret needs to be removed.
