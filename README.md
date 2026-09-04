# London Now — Build 2.3: official departure boards (v0.3.3)

This small release replaces the airport flight links with the most useful official live departure boards. It updates the existing `london-now` Worker and requires no new API, subscription, secret or Cloudflare setting.

## What changes

- Heathrow, Luton and Stansted link directly to their official live departures pages.
- Gatwick links to its official live flights page; select **Departures** after it opens because the site does not publish a stable departure-only URL.
- London City links to its official combined Departures & Arrivals page.
- Every action is labelled `AIRPORT departures` and opens in a new tab.
- TfL, Met Office weather, partial airport-access status and the Google Sites embed configuration are unchanged.

## Deploy directly to main

1. Confirm v0.3.2 is working and committed to `main`.
2. In the existing GitHub `london-now` repository, select the `main` branch.
3. Choose **Add file → Upload files**.
4. Upload the contents inside this package folder to the repository root. Do not upload the ZIP or its enclosing folder.
5. Commit directly to `main` with `Use official live airport departure boards`.
6. Wait for the connected Cloudflare build to complete.

No Cloudflare variable, secret, KV namespace, command or build-setting change is required.

## Validate production

Open:

```text
https://london-now.ppastorin.workers.dev/api/health
https://london-now.ppastorin.workers.dev/
```

Health must return HTTP 200 and version `0.3.3`. On the dashboard, test all five departure actions and complete `TEST-CHECKLIST.md`.

The existing Google Sites embed code does not change. Republish the Google Sites page only if it does not immediately show the updated labels.

## Rollback

If production validation fails, use Cloudflare’s deployment history to roll back to the approved v0.3.2 deployment, then revert the GitHub commit. This release creates no new resource and adds no secret.

## Official boards

- [Heathrow departures](https://www.heathrow.com/departures)
- [Gatwick live flights](https://www.gatwickairport.com/flights)
- [Luton departures](https://www.london-luton.co.uk/departures)
- [Stansted departures](https://www.stanstedairport.com/departures/)
- [London City departures and arrivals](https://www.londoncityairport.com/flight-info/departures-arrivals)
