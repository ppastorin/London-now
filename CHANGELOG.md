# Changelog

## 0.2.0 — 4 September 2026

- Added live TfL line status through a same-origin Worker endpoint.
- Added short server-side caching, normalisation tests and failure states.
- Removed invented operational weather, rail, airport and event values.
- Added preview-branch deployment and acceptance instructions.

## 0.1.1 — 4 September 2026

- Corrected the Wrangler Worker name from `london-now-phase-0` to `london-now` so it matches the existing Cloudflare project.
- Explicitly enabled the `workers.dev` route and preview URLs.
- Pinned Wrangler to `4.129.0` and changed Cloudflare's deploy command to `npm run deploy`.
- Replaced the repository and Cloudflare instructions with a repository-first, name-matched process.

No dashboard interface or sample content changed in this release.

## 0.1.0 — 4 September 2026

- Initial Phase 0 dashboard prototype.
