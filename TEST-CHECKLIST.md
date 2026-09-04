# Build 1 validation — live TfL

## Automated package checks

- [ ] `npm install` completes.
- [ ] `npm run check` passes syntax, configuration, fixture and normalisation tests.
- [ ] No key, token or credential is present in GitHub.

## Preview API

- [ ] `/api/health` returns HTTP 200 and version `0.2.0`.
- [ ] `/api/tfl` returns HTTP 200 and a non-empty `lines` array.
- [ ] `checkedAt` is a valid recent timestamp.
- [ ] A second request normally returns `x-cache: HIT`.
- [ ] The response contains no `app_key`, subscription key or full upstream payload.
- [ ] An invalid/unavailable upstream produces HTTP 502 JSON rather than HTML or an endless request.

## Preview interface

- [ ] No Phase 0 sample alert, sample weather value, invented airport delay or invented event remains.
- [ ] TfL disruptions appear before good-service lines.
- [ ] When no disruption is reported, the card says good service without fabricating details.
- [ ] The visible TfL timestamp uses London time.
- [ ] TfL errors replace the loader and preserve the official TfL link.
- [ ] Weather says not connected and links to Met Office/BBC.
- [ ] National Rail, airports and events remain explicit link-only states.

## Responsive/accessibility regression

- [ ] No horizontal overflow at 320, 390, 768 and 1280 px.
- [ ] TfL status text wraps without covering the line name.
- [ ] View tabs, date controls and settings remain keyboard accessible.
- [ ] Live updates are announced through the existing polite live regions.
- [ ] Preferences persist after reload.
- [ ] Google Sites embed still scrolls once and opens full screen correctly.

## Production gate

- [ ] Preview branch deployment passed before merge.
- [ ] Production `/api/health`, `/api/tfl` and `/` passed after merge.
- [ ] Cloudflare build log has no Worker-name mismatch.
- [ ] Previous Phase 0 deployment remains available for rollback.
- [ ] Approved commit is tagged `phase-1-tfl-approved`.
