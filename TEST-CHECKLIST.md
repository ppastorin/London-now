# Build 3 validation — Ticketmaster events

## Automated package checks

- [ ] `npm install` completes.
- [ ] `npm run check` passes every assertion and fixture test.
- [ ] Wrangler remains pinned and the Worker name remains `london-now`.
- [ ] No TfL, Met Office or Ticketmaster credential appears in GitHub, browser source, API responses or logs.

## Cloudflare configuration

- [ ] `TICKETMASTER_API_KEY` exists as an encrypted secret.
- [ ] Its value is the Ticketmaster Consumer Key, not the Consumer Secret.
- [ ] `METOFFICE_API_KEY`, `WEATHER_CACHE` and the hourly weather trigger remain present.
- [ ] Existing Worker, repository and production URL are unchanged.

## API checks

- [ ] `/api/health` returns HTTP 200 and version `0.4.0`.
- [ ] Health reports events as `ready`.
- [ ] `/api/events` returns HTTP 200 and `provider: "Ticketmaster Discovery API"`.
- [ ] `/api/events` contains `affiliateLinks: false`.
- [ ] The response contains no Consumer Key or Consumer Secret.
- [ ] Valid date/category parameters return the same values in `requestedDate` and `requestedCategory`.
- [ ] An invalid date returns HTTP 400.
- [ ] An invalid category returns HTTP 400.
- [ ] Repeating the same valid request normally changes `x-cache` from `MISS` to `HIT`.

## Event-content checks

- [ ] Every displayed event matches the selected London calendar date.
- [ ] Category choices are All, Music, Theatre & Arts, Sport and Family.
- [ ] At least two returned event links open on `ticketmaster.co.uk`.
- [ ] Cancelled events are not displayed.
- [ ] Events without price data show `Price unavailable`, never `Free`.
- [ ] Any event labelled `Free` has an explicit zero-price range in the API response.
- [ ] No more than six events appear in the dashboard card.
- [ ] Empty results show a useful empty state rather than an endless spinner.
- [ ] Upstream failure resolves to an error state with a working Ticketmaster source link.

## Existing-function regression

- [ ] `/api/tfl`, `/api/weather` and `/api/airport-access` return HTTP 200.
- [ ] All five airport departure links work.
- [ ] All four London Advanced tool links remain in one block.
- [ ] Weather follows the selected date.
- [ ] Airport and accessibility preferences persist after refresh.

## Responsive and Google Sites checks

- [ ] Test 320, 390, 768 and 1280 px widths.
- [ ] Long event titles wrap without widening the page.
- [ ] Category selection does not create horizontal scrolling.
- [ ] Event rows remain readable at 200% text zoom.
- [ ] The existing Google Sites embed loads without changing its HTML code.
- [ ] Google Sites retains one usable vertical scrolling path and no horizontal scrollbar.

## Production gate

- [ ] GitHub `main` triggered a successful Cloudflare deployment.
- [ ] Production API, homepage and embed checks passed.
- [ ] Approved commit is tagged `v0.4.0-ticketmaster-events-approved`.
