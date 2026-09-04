# London Now — Build 2.2: partial live airport access (v0.3.2)

This is the safe interim build while Rail Data Marketplace registration is pending. It updates the existing `london-now` Worker and does not require a new secret.

## What changes

- Heathrow access is derived live from the Elizabeth and Piccadilly line status.
- London City access is derived live from the DLR.
- Gatwick, Luton and Stansted retain their completed cards but remain explicitly pending until the National Rail Disruptions API is connected.
- Official flight-board links remain available. Transport access is never presented as airport or flight-operating status.
- `/api/airport-access` provides normalized data for the browser.

The Met Office integration, hourly KV refresh, TfL line-status integration and Google Sites framing correction from v0.3.1 remain unchanged.

## Deploy to a preview branch

1. Confirm v0.3.1 is working in production and committed to `main`.
2. Create branch `phase-2-2-airport-access` from `main`.
3. Upload the contents inside this package folder to the repository root.
4. Commit with `Add partial live airport access`.
5. Let Cloudflare create the branch preview.

No Cloudflare variable, secret, KV namespace, command or build-setting change is required.

## Validate the preview

Open:

```text
https://PREVIEW-HOST/api/health
https://PREVIEW-HOST/api/tfl
https://PREVIEW-HOST/api/weather
https://PREVIEW-HOST/api/airport-access
https://PREVIEW-HOST/
```

Health must report version `0.3.2`, TfL `live`, weather `ready`, and airport access `partial-live`.

The airport-access response must contain exactly five airports. LHR must include live Elizabeth and Piccadilly status; LCY must include live DLR status. LGW, LTN and STN must say that their rail feed is pending rather than claiming good service.

Complete `TEST-CHECKLIST.md` before merging.

## Promote

1. Open a pull request from `phase-2-2-airport-access` to `main`.
2. Merge only after the preview API, mobile and Google Sites checks pass.
3. Wait for the production deployment.
4. Test all five addresses at `https://london-now.ppastorin.workers.dev`.
5. Test the existing published Google Sites page. The embed code does not change.
6. Tag the approved commit `phase-2-2-airport-access-approved`.

## Later National Rail extension

The National Rail build will extend `/api/airport-access` rather than replace the interface. It will add live rail coverage for Heathrow Express, Gatwick, Luton and Stansted, plus London terminal disruptions.

## Rollback

If the production checks fail, roll Cloudflare back to the approved v0.3.1 deployment and revert the merge in GitHub. This build creates no new Cloudflare resource and adds no secret, so rollback has no cleanup step.

## Official references

- [TfL Unified API](https://tfl.gov.uk/info-for/open-data-users/unified-api)
- [TfL line status](https://tfl.gov.uk/tube-dlr-overground/status/)
- [National Rail developers](https://www.nationalrail.co.uk/developers/)
- [National Rail Disruptions API v2](https://www.rspaccreditation.org/publicDocumentationAPI.php?action=viewAPIVersion&apiVersionID=18)
