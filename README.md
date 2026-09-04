# London Now — Build 4: National Rail (v0.5.0)

This release connects the approved London Now dashboard to Rail Delivery Group's **Live Departure Board** API through Rail Data Marketplace (RDM). It retains the existing TfL, Met Office, Ticketmaster, airport-board and Google Sites behaviour.

It does not use the Darwin push feed and does not claim to show flight status. National Rail data is used only for train departures and airport access.

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
   Add live National Rail departures
   ```

Do not upload the ZIP itself or create an enclosing `london-now-v0.5.0-national-rail/` directory in the repository.

## 5. Cloudflare build

No build setting changes are required. Retain:

| Setting | Value |
|---|---|
| Root directory | `/` |
| Build command | `npm run check` |
| Deploy command | `npm run deploy` |

The existing Worker URL and Google Sites embed remain unchanged.

## 6. Production API validation

Open:

```text
https://london-now.ppastorin.workers.dev/api/health
https://london-now.ppastorin.workers.dev/api/rail?station=WAT
https://london-now.ppastorin.workers.dev/api/airport-access
https://london-now.ppastorin.workers.dev/
```

Health must return HTTP 200, version `0.5.0`, `integrations.rail: "ready"` and `integrations.airportAccess: "live-access"`.

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
6. Test the existing Google Sites embed at 320, 390, 768 and 1280-pixel widths.
7. Confirm there is one usable vertical scroll path and no horizontal scrollbar.

After production passes, tag the approved commit:

```text
v0.5.0-national-rail-approved
```

## Rollback

If production fails, use Cloudflare's deployment history to roll back to v0.4.0 and revert the GitHub commit. A rollback does not remove the RDM subscription or secret.
