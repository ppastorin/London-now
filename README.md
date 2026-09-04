# London Now — v0.5.3 mobile embed fix

This release prevents Google Sites from cutting off the dashboard on mobile. The desktop dashboard is unchanged. On screens up to 640 pixels, **Now** contains only weather and current transport, while **Flights**, **Events** and the new **Tools** tab expose the other sections without creating one extremely tall document. The controls remain available while scrolling.

The package also contains `GOOGLE-SITES-EMBED.html`. Its code gives the embedded dashboard one touch-scrollable viewport and does not require manual dragging or height adjustment in Google Sites.

It does not use the Darwin push feed and does not claim to show flight status. National Rail data is used only for train departures and airport access.

## Weather freshness

The Met Office Global Spot response is a forecast, not a second-by-second observation. London Now stores the last successful response in Cloudflare KV to avoid unnecessary calls against the free allowance.

- A forecast less than 70 minutes old is served immediately.
- At 70 minutes, the next dashboard request refreshes it from the Met Office before responding.
- The hourly Cloudflare trigger remains as an additional background refresh.
- If the Met Office request fails, the last valid forecast remains visible and is labelled **Refresh delayed** rather than leaving the card blank.

The first request after the 70-minute threshold may therefore be slightly slower. A normal response exposes `stale: false` and `refreshFailed: false`; neither the API key nor the upstream payload is exposed.

## 1. Subscribe to the correct RDM product

1. Sign in at <https://raildata.org.uk/>.
2. Open **Data product catalogue**.
3. Search for `Live Departure Board`.
4. Open **Live Departure Board** published by **Rail Delivery Group**. Its product page is:
   <https://raildata.org.uk/dataProduct/P-d81d6eaf-8060-4467-a339-1c833e50cbbe/overview>
5. Confirm that the product is marked **Open** and **API**.
6. Select **Subscribe**.
7. Review and accept the licence terms, then select **Subscribe** again.
8. Open **My subscriptions**: <https://raildata.org.uk/dashboard/subscriptionHome/mySubscriptions>.
9. Wait until the subscription status is **Active**. Account approval and product-subscription approval are separate states.

Do not subscribe to **Live Departure Board - Staff Version**, **Live Next Departures Board**, **Service Details**, or a Darwin push product for this release.

## 2. Retrieve and test the RDM credential

1. In **My subscriptions**, select the active **Live Departure Board** subscription.
2. Open its **Documentation** tab and confirm that the request uses a station CRS code.
3. Open its **Specification** tab.
4. Select the `GetDepartureBoard` operation.
5. Copy the **Consumer Key**. Do not copy the Consumer Secret.
6. Use **Try it** with:

   | Parameter | Value |
   |---|---|
   | Station / CRS path | `WAT` |
   | `numRows` | `6` |
   | `timeOffset` | `0` |
   | `timeWindow` | `120` |

7. Send the test request. It should return HTTP 200, `locationName` for London Waterloo, CRS `WAT`, and a `trainServices` array. The test counts against the product allowance.

The application uses the RDM endpoint documented for this product and sends the Consumer Key in the `x-apikey` request header.

## 3. Add the Consumer Key to Cloudflare

1. Open **Cloudflare → Workers & Pages → london-now**.
2. Open **Settings → Variables and Secrets**.
3. Add a new **Secret** named exactly:

   ```text
   NATIONAL_RAIL_API_KEY
   ```

4. Paste the RDM **Consumer Key** as the value and save it.

Do not add the Consumer Secret. Do not put either credential in GitHub, `wrangler.jsonc`, browser code, screenshots or support messages. Retain the existing `METOFFICE_API_KEY`, `TICKETMASTER_API_KEY`, optional `TFL_APP_KEY`, `WEATHER_CACHE` and hourly trigger.

## 4. Update the existing GitHub repository

This release may be committed directly to `main`, matching the workflow used for recent London Now updates.

1. Extract this ZIP.
2. Open the existing GitHub repository and select `main`.
3. Choose **Add file → Upload files**.
4. Upload the contents *inside* the extracted folder to the repository root.
5. Confirm that the root contains `public/`, `worker/`, `tests/`, `package.json` and `wrangler.jsonc`.
6. Commit with:

   ```text
   Fix mobile Google Sites navigation
   ```

Do not upload the ZIP itself or create an enclosing `london-now-v0.5.3-mobile-scroll/` directory in the repository.

## 5. Cloudflare build

No build setting changes are required. Retain:

| Setting | Value |
|---|---|
| Root directory | `/` |
| Build command | `npm run check` |
| Deploy command | `npm run deploy` |

The existing Worker URL remains unchanged. After deployment, replace the current Google Sites embed with the code from `GOOGLE-SITES-EMBED.html`.

### Replace the Google Sites block

1. Open the London dashboard page in Google Sites edit mode.
2. Select the existing dashboard embed and delete that block.
3. Choose **Insert → Embed → Embed code**.
4. Copy the complete contents of `GOOGLE-SITES-EMBED.html`, paste it into the box, then choose **Next → Insert**.
5. Do not drag or resize the inserted block. Publish the site and test the published page on the phone; the editor preview is not a reliable mobile test.

## 6. Production API validation

Open:

```text
https://london-now.ppastorin.workers.dev/api/health
https://london-now.ppastorin.workers.dev/api/rail?station=WAT
https://london-now.ppastorin.workers.dev/api/airport-access
https://london-now.ppastorin.workers.dev/
```

Health must return HTTP 200, version `0.5.3`, `integrations.rail: "ready"` and `integrations.airportAccess: "live-access"`.

The weather response must return HTTP 200 with `stale: false`, `refreshFailed: false` and a reasonably recent `fetchedAt`. Immediately after deployment, an earlier edge-cached response can remain visible for up to five minutes; wait or hard-refresh before diagnosing it as stale.

The rail response must return HTTP 200 with `provider: "National Rail Live Departure Board"`, station code `WAT`, a `services` array, a current `checkedAt`, and no credential.

An empty `services` array can be valid overnight. HTTP 401 means the wrong Consumer Key was stored. HTTP 403 usually means the product subscription is not Active or the key is for another RDM product. HTTP 404 points to a product-version or endpoint mismatch; compare the package endpoint with the URL shown in the active subscription's Specification tab before changing code.

Test the allowlist:

```text
/api/rail?station=VIC
/api/rail?station=PAD
/api/rail?station=XYZ
```

VIC and PAD should return HTTP 200. XYZ must return HTTP 400. Repeating the same valid request should normally change `x-cache` from `MISS` to `HIT`.

## 7. Dashboard and Google Sites validation

1. Open **Customise** and select at least three different London terminals.
2. Confirm the station name, first three departures and official board link change.
3. Confirm cancelled and materially delayed trains are highlighted, while missing values are not interpreted as on time.
4. Check Heathrow, Gatwick, Luton and Stansted route rows. They should no longer say that RDM access is pending.
5. Confirm all five official airport departure-board links still work.
6. On mobile, confirm **Now** shows weather and transport, **Flights** shows airport access, **Events** shows Ticketmaster results, and **Tools** shows the four London Advanced links.
7. Confirm the controls remain reachable while scrolling and switching tabs returns to the top of the selected section.
8. Test the replacement Google Sites embed at 320, 390, 768 and 1280-pixel widths.
9. Confirm every section can be reached, there is no horizontal scrollbar, and the app is not clipped at the bottom.

After production passes, tag the approved commit:

```text
v0.5.3-mobile-scroll-approved
```

## Rollback

If production fails, use Cloudflare's deployment history to roll back to v0.4.0 and revert the GitHub commit. A rollback does not remove the RDM subscription or secret.
