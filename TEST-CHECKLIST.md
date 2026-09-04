# Build 2.4 validation — unified tools and white theme

## Automated package checks

- [ ] `npm install` completes.
- [ ] `npm run check` passes all assertions and fixture tests.
- [ ] Wrangler remains pinned and the Worker name remains `london-now`.
- [ ] No API key appears in GitHub, browser source, responses or logs.

## London Advanced tools

- [ ] There is one London Advanced tools card, not a second map-based promotion.
- [ ] The card contains exactly four links.
- [ ] Escape the crowds opens `/home/escape-the-crowds`.
- [ ] Travel fare calculator opens `/home/travel-fare-calculator`.
- [ ] Smart navigation opens `/home/smart-navigation`.
- [ ] London by mood opens `/home/london-by-mood`.
- [ ] Every link opens in a new tab.

## Theme and responsive checks

- [ ] The dashboard background remains white when the device or browser is in dark mode.
- [ ] The background visually matches the surrounding London Advanced Google Sites page.
- [ ] The three lower cards align cleanly on desktop.
- [ ] All cards become a single column at 640 px and below.
- [ ] No horizontal overflow appears at 320, 390, 768 or 1280 px.
- [ ] Long tool labels wrap without widening the card.

## Live-data and embed regression

- [ ] `/api/health` returns HTTP 200 and version `0.3.4`.
- [ ] `/api/tfl`, `/api/weather` and `/api/airport-access` return HTTP 200.
- [ ] All five official airport departure actions still work.
- [ ] The existing Google Sites embed loads without changing its HTML code.
- [ ] Google Sites retains one usable vertical scrolling path and no horizontal scrollbar.

## Production gate

- [ ] Cloudflare build completed successfully from `main`.
- [ ] Production API, homepage, tool-link and embed checks passed.
- [ ] Existing weather secret, KV binding and hourly trigger remain present.
- [ ] Approved commit is tagged `v0.3.4-unified-tools-approved`.
