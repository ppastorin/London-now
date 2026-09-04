# London Now — Build 1: live TfL (v0.2.0)

This build replaces all invented operational values with either live TfL status, an explicit unavailable/not-connected state, or an official source link. It updates the existing `london-now` Worker and does not create another application.

## What becomes live

- Tube, DLR, London Overground and Elizabeth line status from the TfL Unified API
- A compact priority alert built from current reported disruptions
- TfL fetch time and clear upstream-failure state
- Server-side short caching so visitors do not call TfL directly

Weather, National Rail, airport access and events are intentionally not inferred. They remain link-only until their individual integrations pass later gates.

## Architecture

The browser requests `/api/tfl` from the same `london-now` Worker. The Worker calls TfL, removes unnecessary fields and returns a small normalised response. The API is cached for 75 seconds. An optional TfL key can be stored as a Cloudflare secret; it never appears in browser code or GitHub.

## Step 1 — protect Phase 0

Confirm the working Phase 0 state is committed on `main`, then create a release/tag named `phase-0-approved` in GitHub. Do not delete the existing Worker or disconnect its repository.

## Step 2 — enable preview branch builds

In Cloudflare:

1. Open **Workers & Pages → london-now → Settings → Builds**.
2. Open **Branch control**.
3. Keep `main` as the production branch.
4. Enable builds for non-production branches.
5. Set the non-production deploy command to `npm run preview` if Cloudflare exposes that field.

The production settings remain:

| Setting | Value |
|---|---|
| Root directory | `/` |
| Build command | `npm run check` |
| Deploy command | `npm run deploy` |

## Step 3 — upload Build 1 to a branch

In GitHub:

1. Open the existing `london-now` repository.
2. Create a branch named `phase-1-tfl` from `main`.
3. Upload the **contents inside this package folder** to the repository root on that branch.
4. Commit with `Add live TfL status`.

The root must contain `worker/index.js`, `public/index.html`, `package.json` and `wrangler.jsonc`. Do not upload the enclosing folder as another level.

## Step 4 — test the Cloudflare preview

Cloudflare should build the non-production branch and create a version preview URL. Test these addresses using the preview hostname it supplies:

```text
https://PREVIEW-HOST/api/health
https://PREVIEW-HOST/api/tfl
https://PREVIEW-HOST/
```

Expected health response includes:

```json
{
  "status": "ok",
  "version": "0.2.0",
  "integrations": {
    "tfl": "live",
    "weather": "not-in-this-build"
  }
}
```

Expected `/api/tfl` behaviour:

- HTTP 200
- `provider` is `Transport for London`
- `lines` is a non-empty array
- every line has `name`, `status` and `disrupted`
- `checkedAt` is recent
- response header `x-cache` is `MISS` on an uncached request and normally `HIT` on a subsequent request

## Step 5 — optional TfL API key

TfL currently permits anonymous access at a lower published limit. For a small Phase 1 test, the 75-second server cache should be sufficient. For wider use, register for TfL open data and add the key without putting it in GitHub:

1. Register at `https://api-portal.tfl.gov.uk/`.
2. Subscribe to the available 500-requests-per-minute product.
3. Copy the `app_key` from your profile.
4. In Cloudflare open **london-now → Settings → Variables and Secrets**.
5. Add a **secret** named `TFL_APP_KEY` and paste the key as its value.
6. Redeploy the preview branch.

The integration also works without this secret.

## Step 6 — acceptance tests

Complete `TEST-CHECKLIST.md`. Do not merge if:

- the dashboard shows invented status values;
- `/api/tfl` exposes an API key;
- a TfL failure leaves a permanent spinner;
- the status card overflows on a phone;
- the Google Sites preview introduces a second horizontal scrollbar.

## Step 7 — promote to production

1. Open a GitHub pull request from `phase-1-tfl` into `main`.
2. Confirm the Cloudflare preview check passed.
3. Merge the pull request.
4. Wait for the production build to complete.
5. Re-test:

   ```text
   https://london-now.ppastorin.workers.dev/api/health
   https://london-now.ppastorin.workers.dev/api/tfl
   https://london-now.ppastorin.workers.dev/
   ```

6. Test the existing Google Sites embed. Its URL does not change.
7. Tag the approved commit `phase-1-tfl-approved`.

## Rollback

If production fails, use Cloudflare **Deployments** to roll back to the last Phase 0 version, then revert the merge commit in GitHub. Do not create a replacement Worker.

## Official references

- [TfL Unified API](https://api.tfl.gov.uk/)
- [TfL developer portal](https://api-portal.tfl.gov.uk/)
- [Cloudflare preview URLs](https://developers.cloudflare.com/workers/configuration/previews/)
- [Cloudflare build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
- [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
