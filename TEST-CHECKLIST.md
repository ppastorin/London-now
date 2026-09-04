# Build 2 validation — Met Office weather

## Credentials and configuration

- [ ] Global Spot free plan is active in Weather DataHub.
- [ ] `METOFFICE_API_KEY` exists as an encrypted Cloudflare secret.
- [ ] No API key appears in GitHub, browser source, API responses or logs.
- [ ] `WEATHER_CACHE` KV binding exists after preview deployment.
- [ ] Hourly cron trigger is visible after production deployment.

## Automated package checks

- [ ] `npm install` completes.
- [ ] `npm run check` passes configuration, TfL and Met Office fixture tests.
- [ ] Wrangler remains pinned and the Worker name remains `london-now`.

## Preview APIs

- [ ] `/api/health` returns HTTP 200, version `0.3.0`, TfL `live` and weather `ready`.
- [ ] `/api/weather` returns HTTP 200 and provider `Met Office Weather DataHub`.
- [ ] Weather response contains at least today and the next two dates.
- [ ] Temperatures and percentages are plausible numeric values or explicit nulls.
- [ ] `fetchedAt` is a valid timestamp and `stale` is false.
- [ ] Repeated weather requests do not repeatedly call the Met Office.
- [ ] `/api/tfl` continues to pass the Build 1 checks.

## Preview interface

- [ ] Weather loading state always resolves to data or a clear error.
- [ ] Today, tomorrow and following-day buttons show the correct dates.
- [ ] High, low, rain and wind values match the selected day.
- [ ] Missing values show an em dash rather than zero or invented data.
- [ ] Delayed data is explicitly labelled update delayed.
- [ ] Official Met Office and BBC links remain visible.
- [ ] TfL remains usable when weather is unavailable.

## Plausibility comparison

- [ ] Today's condition broadly agrees with the linked Met Office forecast.
- [ ] High/low temperatures are not reversed.
- [ ] Rain probability stays between 0 and 100.
- [ ] Wind is displayed in mph and is within a plausible range.
- [ ] Forecast location is London or the nearest returned Met Office site.

## Responsive and embed regression

- [ ] No horizontal overflow at 320, 390, 768 and 1280 px.
- [ ] Long location/condition text wraps cleanly.
- [ ] Date changes work by keyboard and touch.
- [ ] Google Sites embed retains a single usable vertical scroll path.
- [ ] Full-screen link still opens the same Worker.

## Production and scheduled-refresh gate

- [ ] Preview passed before merge.
- [ ] Production health, weather, TfL and homepage passed after merge.
- [ ] Scheduled execution refreshed `fetchedAt` within 70 minutes.
- [ ] Weather remains non-stale after the scheduled refresh.
- [ ] Build 1 remains available for rollback.
- [ ] Approved commit is tagged `phase-2-weather-approved`.
