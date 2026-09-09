# London Now v0.6.0 validation

## LAQN source and licence

- [ ] No LAQN account or API key has been added; none is required by the official API.
- [ ] The data source is the official hourly `MonitoringIndex` feed for group `London`.
- [ ] LAQN / Imperial College London and OGL v2.0 attribution is visible in the weather card.
- [ ] ERG has been told about the public application and its cached Cloudflare proxy, as requested in its API documentation.
- [ ] `/api/air-quality` returns HTTP 200 without exposing the upstream payload.
- [ ] The response has `index`, `band`, `pollutants`, `reportingSiteCount`, `dataAt`, `validUntil` and `scope`.
- [ ] `scope` states that the value is the highest current index reported across London monitoring sites.

## TfL authentication and resilience

- [ ] The TfL portal application is subscribed to the free registered product.
- [ ] Cloudflare has an encrypted secret named exactly `TFL_API_KEY`.
- [ ] `/api/health` reports version `0.6.0` and TfL `registered`.
- [ ] `/api/tfl` returns HTTP 200 with `accessMode: "registered"` and `stale: false` during normal service.
- [ ] No API key appears in the JSON response, browser source or repository.
- [ ] A delayed fallback is visibly labelled and never used when more than five minutes old.

## RDM subscription

- [ ] The subscribed product is **Live Departure Board**, product ID `P-d81d6eaf-8060-4467-a339-1c833e50cbbe`.
- [ ] Publisher is Rail Delivery Group; format is API; access is Open.
- [ ] Subscription status is **Active**, not merely account approved or subscription Pending.
- [ ] `GetDepartureBoard` with station `WAT` returns HTTP 200 in RDM **Try it**.
- [ ] The Cloudflare secret is the Consumer Key, not the Consumer Secret.

## Automated checks

- [ ] `npm install` completes.
- [ ] `npm run check` passes all assertions and fixture tests.
- [ ] Worker name remains `london-now` and Wrangler remains pinned.
- [ ] No TfL, Met Office, Ticketmaster or RDM credential is committed.

## Cloudflare

- [ ] `NATIONAL_RAIL_API_KEY` exists as an encrypted secret.
- [ ] Existing secrets, `WEATHER_CACHE` and hourly weather trigger remain present.
- [ ] Existing repository, Worker and production URL are unchanged.

## API checks

- [ ] `/api/health` returns HTTP 200 and version `0.6.0`.
- [ ] Health reports air quality `ready`.
- [ ] Health reports rail `ready` and airport access `live-access`.
- [ ] `/api/rail?station=WAT` returns HTTP 200 and a `services` array.
- [ ] `/api/weather` returns HTTP 200 with `stale: false` and `refreshFailed: false`.
- [ ] `/api/air-quality` returns HTTP 200 with `stale: false` during normal service.
- [ ] `/api/weather` has a reasonably recent `fetchedAt`; allow up to five minutes for an old edge-cached response to expire after deployment.
- [ ] WAT, VIC, PAD, LST, LBG, KGX and EUS are accepted.
- [ ] An unsupported CRS code returns HTTP 400.
- [ ] The response contains no RDM credential.
- [ ] A repeated station request normally changes `x-cache` from `MISS` to `HIT`.
- [ ] `/api/airport-access` returns HTTP 200 even if one upstream rail route fails.

## Content behaviour

- [ ] Selected-station departures show scheduled time, destination and expected status.
- [ ] Cancellations are labelled Cancelled.
- [ ] Expected departures five or more minutes later than scheduled are treated as delayed.
- [ ] Empty overnight boards say no departures were returned; they do not claim disruption.
- [ ] Airport access is not described as flight status.
- [ ] Official airport flight-departure links remain visible.

## Regression and embed

- [ ] `/api/tfl`, `/api/weather` and `/api/events` still return HTTP 200.
- [ ] Event date/category and weather date selection still work.
- [ ] All four London Advanced tool links remain in one block.
- [ ] Every tool card has the correct icon, title, description and destination.
- [ ] Tool cards render in four desktop columns, two tablet columns and one mobile column.
- [ ] Every tool card is fully clickable and has a visible keyboard focus state.
- [ ] Airport and station preferences persist after refresh.
- [ ] Google Sites uses the replacement code in `GOOGLE-SITES-EMBED.html`.
- [ ] The redundant Live data banner and Live coverage section are absent.
- [ ] The London Now brand header and safety footer remain.
- [ ] Desktop weather uses roughly one-third of the row and TfL two-thirds.
- [ ] The weather card ends after its content instead of stretching to match long TfL alerts.
- [ ] The weather icon matches sunny, cloudy, rain, snow, fog, thunder and night conditions.
- [ ] The air-quality index, band colour, pollutant, reporting-site count and LAQN bulletin time render inside the weather card.
- [ ] The air-quality module does not create another dashboard card or mobile tab.
- [ ] On mobile, Now contains weather and transport but does not stack airports, events and tools below them.
- [ ] Flights, Events and Tools each expose the corresponding section from the sticky mobile controls.
- [ ] Selecting a mobile tab returns to the beginning of that selected view.
- [ ] Test 320, 390, 768 and 1280-pixel widths.
- [ ] There is no horizontal scrollbar and only one usable vertical scroll path.

## Production gate

- [ ] GitHub `main` triggered a successful Cloudflare deployment.
- [ ] Production API, homepage and published Google Sites checks passed.
- [ ] Approved commit is tagged `v0.6.0-air-quality-approved`.
