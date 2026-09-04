# Build 2.3 validation — official departure boards

## Automated package checks

- [ ] `npm install` completes.
- [ ] `npm run check` passes all assertions and fixture tests.
- [ ] Wrangler remains pinned and the Worker name remains `london-now`.
- [ ] No API key appears in GitHub, browser source, responses or logs.

## Production API regression

- [ ] `/api/health` returns HTTP 200 and version `0.3.3`.
- [ ] `/api/tfl`, `/api/weather` and `/api/airport-access` still return HTTP 200.
- [ ] Airport-access data still describes ground transport only, never inferred flight status.

## Departure-link checks

- [ ] LHR opens Heathrow's live departures page.
- [ ] LGW opens Gatwick's live flights page; selecting **Departures** shows outbound flights.
- [ ] LTN opens Luton's live departures page.
- [ ] STN opens Stansted's live departures page.
- [ ] LCY opens London City's combined Departures & Arrivals page.
- [ ] All five pages are official airport websites and open in a new tab.
- [ ] Custom airport selection hides both the status row and its corresponding departure link.

## Responsive and embed regression

- [ ] No horizontal overflow at 320, 390, 768 and 1280 px.
- [ ] Departure-link labels wrap cleanly without widening the card.
- [ ] The existing published Google Sites embed loads without changing its code.
- [ ] Google Sites retains one usable vertical scrolling path.
- [ ] Full-screen mode remains usable.

## Production gate

- [ ] Cloudflare build completed successfully from `main`.
- [ ] Production health, APIs, homepage and all five departure links passed.
- [ ] Existing weather secret, KV binding and hourly trigger remain present.
- [ ] Approved commit is tagged `v0.3.3-departure-boards-approved`.
