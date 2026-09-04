import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "public/index.html",
  "public/styles.css",
  "public/app.js",
  "public/_headers",
  "worker/index.js",
  "tests/tfl.test.mjs",
  "tests/weather.test.mjs",
  "tests/airport-access.test.mjs",
  "tests/events.test.mjs",
  "tests/rail.test.mjs",
  "GOOGLE-SITES-EMBED.html",
  "wrangler.jsonc"
];

await Promise.all(required.map((path) => access(resolve(root, path))));

const html = await readFile(resolve(root, "public/index.html"), "utf8");
const css = await readFile(resolve(root, "public/styles.css"), "utf8");
const headers = await readFile(resolve(root, "public/_headers"), "utf8");
const wrangler = JSON.parse(await readFile(resolve(root, "wrangler.jsonc"), "utf8"));
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const worker = await readFile(resolve(root, "worker/index.js"), "utf8");
const embed = await readFile(resolve(root, "GOOGLE-SITES-EMBED.html"), "utf8");
const toolBlock = html.match(/<nav class="tool-links"[\s\S]*?<\/nav>/)?.[0] ?? "";
const nativeToolUrls = [
  "https://www.londonadvanced.com/home/escape-the-crowds",
  "https://www.londonadvanced.com/home/travel-fare-calculator",
  "https://www.londonadvanced.com/home/smart-navigation",
  "https://www.londonadvanced.com/home/london-by-mood"
];

const assertions = [
  [!html.includes('class="demo-banner"') && !html.includes('class="phase-note"'), "redundant status banner and coverage section are absent"],
  [html.includes('data-mobile-views="flights"') && html.includes('data-mobile-views="events"') && html.includes('data-mobile-views="tools"'), "mobile cards are separated into bounded views"],
  [html.includes('data-view="tools"') && css.includes(".view-tab--mobile-only") && css.includes("position: sticky"), "mobile Tools tab and sticky controls are present"],
  [embed.includes("height: 100vh") && embed.includes('scrolling="yes"') && embed.includes("overflow: hidden") && embed.includes("?embed=google-sites"), "Google Sites embed supplies one touch-scrollable dashboard viewport"],
  [css.includes("is-google-sites-embed") && css.includes("scrollbar-width: none") && css.includes("overscroll-behavior-y: contain"), "embedded document keeps touch scrolling without a duplicate visible scrollbar"],
  [!/>[^<]*\bbuild(?:s|ing)?\b[^<]*</i.test(html), "user-facing build terminology is absent"],
  [!html.match(/18°|Sample alert|illustrative listing/i), "invented operational values are absent"],
  [html.includes('./styles.css'), "stylesheet reference is present"],
  [html.includes('./app.js'), "script reference is present"],
  [css.includes("--paper: #ffffff") && css.includes("background: var(--paper)") && html.includes('name="theme-color" content="#ffffff"'), "dashboard and browser theme backgrounds are white"],
  [!css.includes("prefers-color-scheme: dark"), "device dark mode cannot override the white dashboard"],
  [headers.includes("frame-ancestors") && headers.includes("https://sites.google.com") && headers.includes("https://www.gstatic.com"), "complete Google Sites frame chain is permitted"],
  [!headers.includes("X-Frame-Options"), "obsolete X-Frame-Options is absent"],
  [wrangler.name === "london-now", "Wrangler name matches the Cloudflare Worker"],
  [wrangler.workers_dev === true, "workers.dev route is explicit"],
  [wrangler.preview_urls === true, "preview URLs are explicit"],
  [wrangler.main === "./worker/index.js", "Worker entrypoint is configured"],
  [wrangler.assets?.binding === "ASSETS", "static asset binding is configured"],
  [wrangler.assets?.run_worker_first?.includes("/api/*"), "API routes run through the Worker"],
  [worker.includes("api.tfl.gov.uk") && worker.includes("/api/tfl"), "TfL adapter and endpoint are present"],
  [worker.includes("data.hub.api.metoffice.gov.uk") && worker.includes("/api/weather"), "Met Office adapter and endpoint are present"],
  [worker.includes("WEATHER_REFRESH_AFTER_MS") && worker.includes("shouldRefreshWeather") && worker.includes('cacheStatus = "STALE"'), "weather cache has request-time recovery and stale fallback"],
  [worker.includes("/api/airport-access") && worker.includes("normalizeAirportAccess"), "airport-access endpoint and normalizer are present"],
  [worker.includes("app.ticketmaster.com/discovery/v2/events.json") && worker.includes("/api/events") && worker.includes("normalizeTicketmaster"), "Ticketmaster adapter, endpoint and normalizer are present"],
  [worker.includes("api1.raildata.org.uk/1010-live-departure-board-dep1_2") && worker.includes("/api/rail") && worker.includes("normalizeRailBoard"), "National Rail adapter, endpoint and normalizer are present"],
  [worker.includes('"x-apikey": env.NATIONAL_RAIL_API_KEY') && worker.includes("RAIL_CACHE_SECONDS"), "National Rail secret and caching are configured"],
  [html.includes('id="stationDepartures"') && html.includes('id="stationStatus"') && html.includes('id="railFreshness"'), "live selected-station regions are present"],
  [html.includes('id="weatherIcon"') && css.includes(".weather-icon") && css.includes("grid-column: span 8"), "weather icon and asymmetric desktop layout are present"],
  [worker.includes("TICKETMASTER_API_KEY") && worker.includes("EVENTS_CACHE_SECONDS"), "Ticketmaster secret and event caching are configured"],
  [html.includes('id="eventCategory"') && html.includes('value="music"') && html.includes('value="arts"') && html.includes('value="sports"') && html.includes('value="family"'), "event category selector is present"],
  [html.includes('id="eventList"') && html.includes('id="eventsFreshness"'), "live event result and freshness regions are present"],
  [html.includes("https://www.ticketmaster.co.uk/discover/london") && !html.includes("www.timeout.com"), "Ticketmaster replaces the former Time Out event link"],
  [worker.includes("Public-transport access only; not flight operations"), "rail-access and flight-board scopes are separated"],
  [html.includes("https://www.heathrow.com/departures") && html.includes("https://www.london-luton.co.uk/departures") && html.includes("https://www.stanstedairport.com/departures/"), "departure-specific airport links are present"],
  [html.includes("https://www.gatwickairport.com/flights") && html.includes("https://www.londoncityairport.com/flight-info/departures-arrivals"), "official combined airport boards are present"],
  [(html.match(/departures ↗/g) || []).length === 5, "all five airport links are labelled as departures"],
  [!html.includes("https://www.heathrow.com/arrivals"), "the former Heathrow arrivals link is absent"],
  [nativeToolUrls.every((url) => toolBlock.includes(url)), "all four native London Advanced links share one block"],
  [(toolBlock.match(/<a /g) || []).length === 4 && (html.match(/class="tool-links"/g) || []).length === 1, "the unified tools block contains exactly four links"],
  [(toolBlock.match(/target="_blank"/g) || []).length === 4 && (toolBlock.match(/rel="noreferrer"/g) || []).length === 4, "all tool links open safely in a new tab"],
  [!html.includes("card--pick") && !css.includes("card--pick") && !css.includes("pick-image"), "the separate Smart Navigation promotion is removed"],
  [!html.includes("london-advanced-crowd-pressure.ppastorin.workers.dev") && !html.includes("/london-travel-fare-calculator"), "obsolete tool URLs are absent"],
  [!worker.match(/app_key\s*[:=]\s*["'][^"']+["']/i), "no TfL key is committed"],
  [!worker.match(/METOFFICE_API_KEY\s*[:=]\s*["'][^"']+["']/), "no Met Office key is committed"],
  [!worker.match(/TICKETMASTER_API_KEY\s*[:=]\s*["'][^"']+["']/), "no Ticketmaster key is committed"],
  [!worker.match(/NATIONAL_RAIL_API_KEY\s*[:=]\s*["'][^"']+["']/), "no National Rail key is committed"],
  [wrangler.kv_namespaces?.some((item) => item.binding === "WEATHER_CACHE" && !item.id), "weather KV is configured for automatic provisioning"],
  [wrangler.triggers?.crons?.includes("7 * * * *"), "hourly weather refresh is configured"],
  [packageJson.version === "0.5.3", "package version is 0.5.3"],
  [packageJson.devDependencies?.wrangler === "4.129.0", "Wrangler version is pinned"]
];

const failures = assertions.filter(([passed]) => !passed);
if (failures.length) {
  failures.forEach(([, label]) => console.error(`FAIL: ${label}`));
  process.exit(1);
}

assertions.forEach(([, label]) => console.log(`PASS: ${label}`));
console.log("London Now v0.5.3 package validation passed.");
