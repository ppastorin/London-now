# Build 2.2 validation — partial live airport access

## Automated package checks

- [ ] `npm install` completes.
- [ ] `npm run check` passes all assertions and fixture tests.
- [ ] Wrangler remains pinned and the Worker name remains `london-now`.
- [ ] No API key appears in GitHub, browser source, responses or logs.

## API checks

- [ ] `/api/health` returns HTTP 200, version `0.3.2` and `airportAccess: partial-live`.
- [ ] `/api/tfl` returns HTTP 200 with a non-empty line array.
- [ ] `/api/weather` returns HTTP 200 with current forecast data.
- [ ] `/api/airport-access` returns HTTP 200.
- [ ] Airport access contains exactly LHR, LGW, LTN, STN and LCY.
- [ ] LHR reports Elizabeth and Piccadilly status, with Heathrow Express pending.
- [ ] LCY reports DLR status.
- [ ] LGW, LTN and STN say `Rail feed pending`; they do not claim good service.
- [ ] Scope says public-transport access, not flight operations.

## Interface checks

- [ ] Heathrow and London City leave the loading state.
- [ ] A reported TfL disruption produces a visible warning for the affected airport.
- [ ] Official flight-board links open in a new tab.
- [ ] Custom airport selection hides both the status row and corresponding board link.
- [ ] Airport states resolve to live data or a clear error—never an endless spinner.

## Responsive and embed regression

- [ ] No horizontal overflow at 320, 390, 768 and 1280 px.
- [ ] Long airport service names wrap cleanly.
- [ ] The existing published Google Sites embed loads without changing its code.
- [ ] Google Sites retains one usable vertical scrolling path.
- [ ] Full-screen mode remains usable.

## Production gate

- [ ] Preview passed before merge.
- [ ] Production health, TfL, weather, airport access and homepage passed after merge.
- [ ] Existing weather secret, KV binding and hourly trigger remain present.
- [ ] Approved commit is tagged `phase-2-2-airport-access-approved`.
