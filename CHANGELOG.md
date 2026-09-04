# Changelog

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
