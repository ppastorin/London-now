# Build 4 validation — National Rail

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

- [ ] `/api/health` returns HTTP 200 and version `0.5.0`.
- [ ] Health reports rail `ready` and airport access `live-access`.
- [ ] `/api/rail?station=WAT` returns HTTP 200 and a `services` array.
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
- [ ] Airport and station preferences persist after refresh.
- [ ] Google Sites uses the existing embed code and URL.
- [ ] Test 320, 390, 768 and 1280-pixel widths.
- [ ] There is no horizontal scrollbar and only one usable vertical scroll path.

## Production gate

- [ ] GitHub `main` triggered a successful Cloudflare deployment.
- [ ] Production API, homepage and published Google Sites checks passed.
- [ ] Approved commit is tagged `v0.5.0-national-rail-approved`.
