# London Now — Build 2.1: Google Sites frame fix (v0.3.1)

This patch retains the live TfL and Met Office integrations from v0.3.0 and fixes the published Google Sites embed. Google Sites places custom HTML inside an intermediate frame served by `https://www.gstatic.com`. The previous Content Security Policy omitted that ancestor, so browsers refused to display London Now inside the nested frame.

## Deploy this patch to the existing Worker

1. Create a GitHub branch named `fix-google-sites-embed` from the current `main` branch.
2. Upload the contents inside this package folder to the repository root on that branch.
3. Commit with `Permit Google Sites intermediate frame`.
4. Let Cloudflare build the preview.
5. Confirm `/api/health` reports version `0.3.1`, then merge the branch into `main`.
6. After production deployment, confirm the response header contains `https://www.gstatic.com` in `Content-Security-Policy` and republish the existing Google Sites page.

Do not recreate the Worker, repository or Google Sites embed. The existing URL and iframe code remain correct.

Deploy this only after Build 1 (`v0.2.0`) has passed and the production commit is tagged `phase-1-tfl-approved`. It updates the same `london-now` Worker.

## What becomes live

- TfL line status from Build 1
- Daily London forecast from the Met Office Weather DataHub Global Spot API
- Today plus the next two days linked to the existing date selector
- High/low temperature, rain probability, wind and weather description
- Hourly server-side refresh into Cloudflare KV
- Explicit stale, missing-configuration and upstream-failure states

National Rail, airport access and event listings remain official-link services.

## Why this uses KV

The Met Office free Global Spot plan publishes a daily request allowance. Cloudflare edge-cache entries are data-centre-local and are not a reliable quota control. Build 2 therefore refreshes one London forecast hourly and writes it to globally replicated Workers KV. Visitors read the cached result rather than calling the Met Office themselves.

The scheduled design targets roughly 24 Met Office requests per day, comfortably below the published free allowance. A first request can also prime an empty cache.

## Step 1 — obtain the free Met Office credential

1. Go to `https://datahub.metoffice.gov.uk/` and select **Login/Register**.
2. Verify the account email and sign in.
3. Choose the **Site-Specific / Global Spot** product.
4. Select its **Free plan**. Do not choose a paid tier.
5. Accept the applicable Weather DataHub terms.
6. Open **My Subscriptions** and copy the API key.

Do not paste the key into GitHub, `wrangler.jsonc`, JavaScript, a screenshot or a support message.

## Step 2 — add the Cloudflare secret

Adding the secret does not change the currently deployed Build 1.

1. Open **Cloudflare → Workers & Pages → london-now**.
2. Open **Settings → Variables and Secrets**.
3. Add a new **secret**, not plain text variable.
4. Name: `METOFFICE_API_KEY`.
5. Value: the key copied from Weather DataHub.
6. Save.

Keep the optional `TFL_APP_KEY` secret if one is already configured.

## Step 3 — upload Build 2 to a preview branch

1. In GitHub, create `phase-2-weather` from the approved `main` branch.
2. Upload the **contents inside this package folder** to the repository root on that branch.
3. Commit with `Add live Met Office weather`.
4. Cloudflare should run:

   | Setting | Value |
   |---|---|
   | Build command | `npm run check` |
   | Non-production deploy command | `npm run preview` |

The Wrangler configuration declares `WEATHER_CACHE` without an account-specific ID. Wrangler 4.129 uses Cloudflare automatic resource provisioning to create and bind the KV namespace.

If provisioning fails because the build token cannot create KV resources, use the fallback at the end of this document. Do not remove caching and call the Met Office once per visitor.

## Step 4 — validate the preview APIs

Use the preview hostname generated for `phase-2-weather`.

### Health

Open:

```text
https://PREVIEW-HOST/api/health
```

It must return HTTP 200 with:

```json
{
  "status": "ok",
    "version": "0.3.1",
  "integrations": {
    "tfl": "live",
    "weather": "ready"
  }
}
```

`missing-secret` means the Cloudflare secret is absent or not available to that version. `missing-kv` means the binding was not provisioned.

### Weather

Open:

```text
https://PREVIEW-HOST/api/weather
```

It must return HTTP 200 and contain:

- `provider: "Met Office Weather DataHub"`
- `location`
- a non-empty `days` array
- `fetchedAt`
- `stale: false`
- no API key or raw credential

Each day should contain a date, condition, maximum and minimum temperature, rain probability and wind speed. A genuinely unavailable field may be `null`; it must not be invented.

### TfL regression

Open `/api/tfl` and confirm Build 1 still works.

## Step 5 — validate the preview interface

1. Open the preview dashboard.
2. Confirm the weather card leaves its loading state.
3. Compare today's values with the linked Met Office London forecast. Small differences can occur because model update and location/time aggregation differ; grossly different values are a failure.
4. Select tomorrow and the following day. The card must change to the corresponding forecast date.
5. Confirm the fetch time is shown in London time.
6. Confirm TfL still updates independently if weather fails.
7. Complete `TEST-CHECKLIST.md` on phone and desktop widths.

## Step 6 — promote to production

1. Open a pull request from `phase-2-weather` to `main`.
2. Merge only after the API and UI checklist passes.
3. Wait for the production deployment.
4. Test:

   ```text
   https://london-now.ppastorin.workers.dev/api/health
   https://london-now.ppastorin.workers.dev/api/weather
   https://london-now.ppastorin.workers.dev/api/tfl
   https://london-now.ppastorin.workers.dev/
   ```

5. Check **Workers & Pages → london-now → Triggers** and confirm the hourly cron exists.
6. Check the existing Google Sites embed. Its URL does not change.
7. Tag the approved commit `phase-2-weather-approved`.

## Step 7 — validate the scheduled refresh

After at least 70 minutes:

1. Open `/api/weather` again.
2. Confirm `fetchedAt` has advanced.
3. Confirm the data remains `stale: false`.
4. In Cloudflare logs, confirm scheduled executions are successful and do not expose the API key.

Do not proceed to National Rail until this refresh test passes.

## KV provisioning fallback

Use this only if the preview build explicitly says it cannot provision the KV namespace.

1. In Cloudflare open **Storage & Databases → KV**.
2. Create a namespace named `london-now-weather-cache`.
3. Copy its namespace ID.
4. Change this block in `wrangler.jsonc`:

   ```json
   "kv_namespaces": [
     {
       "binding": "WEATHER_CACHE",
       "id": "PASTE_THE_NAMESPACE_ID_HERE"
     }
   ]
   ```

5. Commit the change only to `phase-2-weather` and let Cloudflare rebuild.

## Rollback

If Build 2 fails in production, roll Cloudflare back to the approved Build 1 deployment and revert the merge in GitHub. The unused Met Office secret and KV namespace can remain temporarily while the fault is diagnosed; neither changes Build 1 behaviour.

## Source decision

Open-Meteo was not used as the production shortcut. Its free hosted API excludes commercial use, including advertising or promotional applications. London Advanced has monetisation ambitions, so depending on that free endpoint would create a predictable licensing problem. The Met Office's own free Weather DataHub plan is the cleaner route, subject to its accepted subscription terms.

## Official references

- [Met Office Weather DataHub](https://datahub.metoffice.gov.uk/)
- [Met Office Global Spot overview](https://datahub.metoffice.gov.uk/docs/f/category/site-specific/overview)
- [Met Office site-specific pricing](https://datahub.metoffice.gov.uk/pricing/site-specific)
- [Cloudflare automatic resource provisioning](https://developers.cloudflare.com/changelog/post/2025-10-24-automatic-resource-provisioning/)
- [Cloudflare KV bindings](https://developers.cloudflare.com/kv/concepts/kv-bindings/)
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
