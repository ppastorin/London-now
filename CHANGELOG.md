# Changelog

## 0.5.3 — 4 September 2026

- Prevented the Google Sites mobile embed from hiding content below its fixed container height.
- Split the mobile dashboard into bounded Now, Travel, Flights, Events and Tools views while preserving the complete desktop Now view.
- Made mobile controls sticky and returned the viewport to the beginning of a newly selected view.
- Added a replacement Google Sites embed that provides a touch-scrollable viewport without manual resizing.

## 0.5.2 — 4 September 2026

- Removed the redundant Live data banner and Live coverage section.
- Added request-time recovery so a forecast older than 70 minutes is refreshed without depending solely on the hourly scheduled event.
- Retained the last valid forecast when an upstream refresh fails and exposed that state through `refreshFailed` and `stale`.
- Relabelled the weather card as the latest forecast, reserving **Refresh delayed** for a failed refresh.

## 0.5.1 — 4 September 2026

- Removed user-facing release-stage labels from the status banner, coverage note and footer.
- Changed the desktop weather/transport split from equal columns to four/eight columns.
- Made the weather card fit its content instead of stretching to the height of long TfL alerts.
- Added condition-specific weather icons using the existing Met Office weather codes.
- Added compact mobile sizing for the combined icon and temperature treatment.

## 0.5.0 — 4 September 2026

- Added `/api/rail?station=CRS` using Rail Delivery Group's Live Departure Board product on Rail Data Marketplace.
- Added a strict allowlist for seven selectable London terminals.
- Added 75-second per-board caching, upstream timeouts and secret-safe error responses.
- Replaced the selected-station placeholder with the next three live departures.
- Added filtered rail-board checks for Heathrow, Gatwick, Luton and Stansted access routes.
- Kept airport flight status separate and linked only to official airport departure boards.
- Added National Rail normalization, delay, cancellation, empty-board and malformed-response tests.

## 0.4.0 — 4 September 2026

- Added `/api/events` using the Ticketmaster Discovery API.
- Added London date and category filters for Music, Theatre & Arts, Sport and Family.
- Added six-hour server-side event caching to protect the free API allowance.
- Added explicit loading, empty, configuration and upstream-error states.
- Preserved unknown prices as `Price unavailable`; missing price data is never presented as free.
- Added an affiliate-ready URL boundary while keeping standard Ticketmaster links until Impact approval.
- Added event normalization, cancellation, URL-safety and missing-price regression tests.

## 0.3.4 — 4 September 2026

- Consolidated all London Advanced destinations into one four-link tools card.
- Added London by Mood and replaced the Escape the Crowds and fare-calculator Worker/legacy URLs with native `londonadvanced.com` pages.
- Removed the separate map-based Smart Navigation promotion.
- Fixed the dashboard to a white background and removed the automatic dark-theme override.
- Kept the live TfL, weather, airport-access and departure-board behaviour unchanged.

## 0.3.3 — 4 September 2026

- Replaced the Heathrow arrivals link with its official live departures board.
- Replaced the Luton and Stansted general flight-information links with official departures pages.
- Pointed Gatwick and London City to their official combined live flight boards, which do not expose stable departure-only URLs.
- Relabelled all five airport actions as departures and kept them opening in a new tab.
- Left the TfL, Met Office, airport-access API and Google Sites embed configuration unchanged.

## 0.3.2 — 4 September 2026

- Added `/api/airport-access`, derived from the already-approved TfL feed.
- Added live access status for Heathrow via the Elizabeth and Piccadilly lines.
- Added live London City access status via the DLR.
- Added explicit pending states for Gatwick, Luton and Stansted until National Rail API access is approved.
- Kept official flight-board links and prevented access conditions being presented as flight status.
- Added airport-access normalization and disclosure tests.

## 0.3.1 — 4 September 2026

- Added `https://www.gstatic.com` to the `frame-ancestors` policy used by Google Sites' nested custom-code embed.
- Added a regression assertion for the complete Google Sites frame chain.
- Retained the v0.3.0 TfL and Met Office integrations unchanged.

## 0.3.0 — 4 September 2026

- Added Met Office Weather DataHub Global Spot daily forecast.
- Added Cloudflare KV-backed global weather caching.
- Added an hourly scheduled refresh and on-demand initial cache prime.
- Connected the existing three-day date selector to weather results.
- Added missing-secret, missing-KV, stale and upstream-failure states.
- Added Met Office fixture tests and deployment validation.

## 0.2.0 — 4 September 2026

- Added live TfL status with short server-side caching.
- Removed invented weather, airport, rail and event values.

## 0.1.1 — 4 September 2026

- Matched the Wrangler name to the existing `london-now` Worker.

## 0.1.0 — 4 September 2026

- Initial Phase 0 dashboard prototype.
