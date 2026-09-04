# London Now — Phase 0

This is the static, zero-API prototype for the London Advanced real-time dashboard. It is designed to validate the information hierarchy, responsive layout, Google Sites embed and light customisation before any live data integration begins.

## What is included

- Responsive desktop and mobile dashboard
- Now, Travel, Flights and Events views
- Today plus two future date controls
- Browser-local preferences for airports, preferred mainline station and step-free notices
- Direct links to official sources and existing London Advanced tools
- Persistent, prominent warnings that every status and listing is sample data
- Cloudflare Workers static-assets configuration
- Security headers that permit embedding from Google Sites and the London Advanced domain
- No cookies, analytics, live API calls, API keys, framework or build step

The map image supplied with the project is used as a compressed editorial accent in the London Advanced Pick card. The supplied PDF is a visual reference only and is not redistributed in this package.

## Phase 0 acceptance sequence

Complete the gates in order. Do not begin live integrations until all five pass.

| Gate | Goal | Pass condition |
|---|---|---|
| 0A | Package integrity | `npm run check` prints only PASS lines |
| 0B | Local behaviour | Controls, preferences and links work without console errors |
| 0C | Responsive design | No horizontal overflow at 320, 390, 768 and 1280 px widths |
| 0D | Cloudflare deployment | Public `workers.dev` URL loads over HTTPS and returns the supplied security headers |
| 0E | Google Sites embed | Dashboard renders inside the published Site and the full-screen link opens correctly |

## 1. Inspect and validate the package

Requirements: Git and Node.js 20 or newer. Python 3 is helpful for the simplest local server.

From the project folder:

```bash
npm run check
```

Expected final line:

```text
Phase 0 package validation passed.
```

## 2. Run locally

The easiest dependency-free option is:

```bash
python3 -m http.server 4173 --directory public
```

Open `http://localhost:4173`. Stop the server with `Ctrl+C`.

An alternative that emulates Cloudflare static-assets handling is:

```bash
npm run dev
```

Wrangler may ask you to approve a one-off download. Open the local URL it prints.

## 3. Perform the local checks

Use `TEST-CHECKLIST.md`. The key checks are:

1. Confirm the black Phase 0 banner is visible before any status information.
2. Select Travel, Flights and Events; only the relevant cards should remain.
3. Select another date; the events date badge should change.
4. Open Customise, change airports and preferred station, save, then reload. The choices should remain in that browser.
5. Reset preferences and confirm Heathrow, Gatwick and Stansted return.
6. Open each external source in a new tab.
7. Test narrow phone widths and keyboard-only navigation.

## 4. Put the package in GitHub

Create a new empty GitHub repository named `london-now-dashboard`. Do not initialise it with a README or licence because this package already contains files.

Then run from the project folder, replacing the example account name:

```bash
git init
git branch -M main
git add .
git commit -m "Add London Now Phase 0 prototype"
git remote add origin https://github.com/YOUR-GITHUB-ACCOUNT/london-now-dashboard.git
git push -u origin main
```

Keep the repository private during Phase 0 if desired. Cloudflare's GitHub app can be granted access to one selected repository.

## 5. Deploy with Cloudflare Workers Builds

This package uses Cloudflare Workers static assets, which is suitable for the free tier and does not require a Worker script.

1. In Cloudflare, open **Workers & Pages** and choose **Create application**.
2. Select the option to import or connect a Git repository.
3. Connect GitHub and grant the Cloudflare Workers & Pages app access to `london-now-dashboard` only.
4. Select the `main` branch.
5. Use these build settings:

   - Root directory: `/`
   - Build command: `npm run check`
   - Deploy command: `npx wrangler@latest deploy`

6. Deploy. Cloudflare reads `wrangler.jsonc` and publishes the `public` directory.
7. Open the assigned `https://london-now-phase-0.<account>.workers.dev` address.
8. Push a small test change to GitHub and confirm Cloudflare automatically creates a new deployment.

If the project name is already taken in your Cloudflare account, edit the `name` value in `wrangler.jsonc`, commit and push before retrying.

Official references:

- [Cloudflare Workers Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/)
- [Cloudflare static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

## 6. Verify the deployed headers

Replace the example address:

```bash
curl -I https://london-now-phase-0.YOUR-SUBDOMAIN.workers.dev
```

Confirm the response includes `content-security-policy`, `referrer-policy` and `x-content-type-options`, and does **not** include `x-frame-options`.

The supplied Content Security Policy allows these iframe ancestors:

- `https://sites.google.com`
- `https://www.londonadvanced.com`
- `https://londonadvanced.com`
- `https://*.googleusercontent.com`

If the final Google Sites custom domain differs, add its exact HTTPS origin to the `frame-ancestors` list in `public/_headers`, commit, push and let Cloudflare redeploy.

## 7. Embed it in Google Sites

1. Open the target Google Site in edit mode.
2. Choose **Insert → Embed → By URL**.
3. Paste the deployed `workers.dev` URL and choose the embedded-page preview.
4. Stretch the embed to the full content width.
5. Start with a height around 1,600 px, then adjust until there is no nested vertical scrollbar on desktop.
6. Preview the Site in phone, tablet and desktop modes.
7. Publish the Site and repeat the test on the published URL—not only the editor preview.
8. Confirm **Open full screen** opens the dashboard in a new tab.

Google Sites cannot automatically resize a cross-origin iframe to match changing content height. Keeping cards compact and providing the full-screen link are the Phase 0 mitigations.

## 8. Freeze Phase 0 and decide whether to proceed

When all acceptance gates pass:

1. Tag the approved state:

   ```bash
   git tag phase-0-approved
   git push origin phase-0-approved
   ```

2. Record screenshots at phone and desktop widths.
3. Record the Google Sites page URL and Cloudflare deployment URL.
4. Open Phase 1 only for weather. Do not connect transport, airports and events simultaneously.

## Free-source plan for later phases

Phase 0 does not consume these services. This matrix is the guardrail for later implementation.

| Area | Free route | Constraints and fallback |
|---|---|---|
| Weather | Met Office Weather DataHub free site-specific plan | Registration and API credentials required; the published free allowance must be checked before Phase 1. Cache on Cloudflare and link to Met Office/BBC forecast pages. Do not scrape either website. |
| Tube, DLR, Overground | TfL Unified API | Anonymous access is rate-limited; a free account/API key raises the published allowance. Fetch from a Cloudflare Worker so the key is not exposed in the browser. |
| Mainline rail | Rail Data Marketplace | Registration is free, but each dataset has its own licence/access terms. First fallback: show official National Rail disruption and station links rather than scraping. |
| Airports | Official airport live-board links | Do not assume a free reusable feed. Heathrow advertises a developer API, but access/licensing must be confirmed before use; no equivalent free official public feeds are assumed for every London airport. Phase 0 therefore links out. |
| Events | Ticketmaster Discovery API | Its public API has a free default quota but does not represent all London events. Time Out should be an outbound discovery source or a separately agreed editorial/licensing relationship—not scraped. |
| Air quality | London Air Quality Network or UK government open data | Good optional widget after core travel sources. Verify update frequency and attribution before implementation. |
| Crowding/value | Existing London Advanced tools | Prefer linking or integrating owned tools first; they are differentiated and avoid third-party data risk. |

Useful official developer pages:

- [TfL API portal](https://api-portal.tfl.gov.uk/)
- [Met Office Weather DataHub](https://datahub.metoffice.gov.uk/)
- [Rail Data Marketplace](https://raildata.org.uk/)
- [Ticketmaster Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)
- [Heathrow developer portal](https://developer.heathrow.com/api-flights)

## Phase boundaries

- **Phase 0 — shell:** static sample data, responsive UI, preferences, GitHub/Cloudflare/Google Sites path.
- **Phase 1 — weather:** one server-side Met Office integration, caching, stale-data state and monitoring.
- **Phase 2 — London transport:** TfL status, accessibility notices and official deep links.
- **Phase 3 — rail:** selected London terminals and disruptions using an approved Rail Data Marketplace source.
- **Phase 4 — airports:** surface-access health first; flight status only where licensed free access is explicitly confirmed.
- **Phase 5 — events:** Ticketmaster plus London Advanced editorial picks; no Time Out scraping.
- **Phase 6 — personalisation:** saved routes, quiet-time/crowding context and optional air quality.

Every live phase should add one adapter, cached server-side fetches, a visible freshness time, a stale/unavailable state, source attribution and tests before the next adapter begins.
