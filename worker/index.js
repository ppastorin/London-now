const TFL_STATUS_URL = "https://api.tfl.gov.uk/Line/Mode/tube,dlr,overground,elizabeth-line/Status";
const MET_OFFICE_DAILY_URL = "https://data.hub.api.metoffice.gov.uk/sitespecific/v0/point/daily";
const TICKETMASTER_EVENTS_URL = "https://app.ticketmaster.com/discovery/v2/events.json";
const NATIONAL_RAIL_DEPARTURES_URL = "https://api1.raildata.org.uk/1010-live-departure-board-dep1_2/LDBWS/api/20220120/GetDepartureBoard";
const WEATHER_CACHE_KEY = "metoffice:global-spot:london:daily:v1";
const TFL_LAST_GOOD_KEY = "tfl:status:last-good:v1";
const TFL_CACHE_SECONDS = 75;
const TFL_FALLBACK_MAX_AGE_MS = 5 * 60 * 1000;
const TFL_FETCH_ATTEMPTS = 2;
const RAIL_CACHE_SECONDS = 75;
const WEATHER_REFRESH_AFTER_MS = 70 * 60 * 1000;
const WEATHER_STALE_AFTER_MS = 2 * 60 * 60 * 1000;
const EVENTS_CACHE_SECONDS = 6 * 60 * 60;

const EVENT_CATEGORIES = {
  all: null,
  music: "Music",
  arts: "Arts & Theatre",
  sports: "Sports",
  family: "Family"
};

const LONDON_STATIONS = {
  WAT: "London Waterloo",
  VIC: "London Victoria",
  PAD: "London Paddington",
  LST: "London Liverpool Street",
  LBG: "London Bridge",
  KGX: "London King’s Cross",
  EUS: "London Euston"
};

const AIRPORT_RAIL_ROUTES = [
  { airport: "LHR", name: "Heathrow Express", from: "PAD", to: "HXX" },
  { airport: "LGW", name: "Gatwick Express / Southern", from: "VIC", to: "GTW" },
  { airport: "LTN", name: "Thameslink / East Midlands Railway", from: "STP", to: "LTN" },
  { airport: "STN", name: "Stansted Express / Greater Anglia", from: "LST", to: "SSD" }
];

const BASE_JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff"
};

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      const weatherState = !env.METOFFICE_API_KEY
        ? "missing-secret"
        : !env.WEATHER_CACHE
          ? "missing-kv"
          : "ready";
      const eventsState = env.TICKETMASTER_API_KEY ? "ready" : "missing-secret";
      const railState = env.NATIONAL_RAIL_API_KEY ? "ready" : "missing-secret";
      const configured = weatherState === "ready" && eventsState === "ready" && railState === "ready";
      return json({
        status: configured ? "ok" : "configuration-required",
        version: "0.5.5",
        integrations: {
          tfl: getTflApiKey(env) ? "registered" : "anonymous",
          weather: weatherState,
          rail: railState,
          airportAccess: railState === "ready" ? "live-access" : "partial-live",
          events: eventsState
        },
        checkedAt: new Date().toISOString()
      }, configured ? 200 : 503, { "cache-control": "no-store" });
    }

    if (url.pathname === "/api/tfl") return handleTfl(request, env, context);
    if (url.pathname === "/api/rail") return handleRail(request, env, context);
    if (url.pathname === "/api/airport-access") return handleAirportAccess(request, env, context);
    if (url.pathname === "/api/weather") return handleWeather(env);
    if (url.pathname === "/api/events") return handleEvents(request, env, context);

    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    return env.ASSETS.fetch(request);
  },

  async scheduled(_event, env, context) {
    if (env.METOFFICE_API_KEY && env.WEATHER_CACHE) {
      context.waitUntil(refreshWeather(env));
    }
  }
};

async function handleTfl(request, env, context) {
  return getTflResponse(request, env, context);
}

async function handleEvents(request, env, context) {
  if (!env.TICKETMASTER_API_KEY) {
    return json({
      error: "Ticketmaster API key is not configured",
      action: "Add the TICKETMASTER_API_KEY secret in Cloudflare",
      sourceUrl: "https://developer.ticketmaster.com/"
    }, 503, { "cache-control": "no-store" });
  }

  const requestUrl = new URL(request.url);
  const date = requestUrl.searchParams.get("date") || londonDateKey(new Date());
  const category = requestUrl.searchParams.get("category") || "all";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidDateKey(date)) {
    return json({ error: "Invalid date; use YYYY-MM-DD" }, 400, { "cache-control": "no-store" });
  }
  if (!(category in EVENT_CATEGORIES)) {
    return json({ error: "Invalid event category" }, 400, { "cache-control": "no-store" });
  }

  const cache = caches.default;
  const cacheUrl = new URL("/__cache/events", request.url);
  cacheUrl.search = new URLSearchParams({ date, category }).toString();
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return withCacheStatus(cached, "HIT");

  const range = londonDayUtcRange(date);
  const upstreamUrl = new URL(TICKETMASTER_EVENTS_URL);
  upstreamUrl.searchParams.set("apikey", env.TICKETMASTER_API_KEY);
  upstreamUrl.searchParams.set("countryCode", "GB");
  upstreamUrl.searchParams.set("city", "London");
  upstreamUrl.searchParams.set("source", "ticketmaster");
  upstreamUrl.searchParams.set("startDateTime", range.start);
  upstreamUrl.searchParams.set("endDateTime", range.end);
  upstreamUrl.searchParams.set("includeTBA", "no");
  upstreamUrl.searchParams.set("includeTBD", "no");
  upstreamUrl.searchParams.set("sort", "date,asc");
  upstreamUrl.searchParams.set("size", "100");
  if (EVENT_CATEGORIES[category]) {
    upstreamUrl.searchParams.set("classificationName", EVENT_CATEGORIES[category]);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10000)
    });
    if (!upstream.ok) throw new Error(`Ticketmaster returned HTTP ${upstream.status}`);

    const events = normalizeTicketmaster(await upstream.json(), date, category);
    const response = json(events, 200, {
      "cache-control": `public, max-age=300, s-maxage=${EVENTS_CACHE_SECONDS}`,
      "x-cache": "MISS"
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    return upstreamError(
      "London events are temporarily unavailable",
      error,
      "Ticketmaster Discovery API",
      "https://www.ticketmaster.co.uk/discover/london"
    );
  }
}

async function getTflResponse(request, env, context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/__cache/tfl-v2", request.url).toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return withCacheStatus(cached, "HIT");

  const upstreamUrl = new URL(TFL_STATUS_URL);
  const apiKey = getTflApiKey(env);
  if (apiKey) upstreamUrl.searchParams.set("app_key", apiKey);

  try {
    const upstream = await fetchTflWithRetry(upstreamUrl);
    const status = {
      ...normalizeTfl(await upstream.json()),
      accessMode: apiKey ? "registered" : "anonymous",
      stale: false,
      degraded: false
    };
    const response = json(status, 200, {
      "cache-control": `public, max-age=30, s-maxage=${TFL_CACHE_SECONDS}`,
      "x-cache": "MISS"
    });
    const writes = [cache.put(cacheKey, response.clone())];
    if (env.WEATHER_CACHE) {
      writes.push(env.WEATHER_CACHE.put(TFL_LAST_GOOD_KEY, JSON.stringify(status), { expirationTtl: 3600 }));
    }
    context.waitUntil(Promise.all(writes));
    return response;
  } catch (error) {
    const snapshot = env.WEATHER_CACHE
      ? await env.WEATHER_CACHE.get(TFL_LAST_GOOD_KEY, "json").catch(() => null)
      : null;
    if (isUsableTflSnapshot(snapshot)) {
      return json({
        ...snapshot,
        accessMode: apiKey ? "registered" : "anonymous",
        stale: true,
        degraded: true,
        warning: "TfL refresh failed; showing the last confirmed status",
        refreshError: safeTflError(error)
      }, 200, {
        "cache-control": "public, max-age=15, s-maxage=30",
        "x-cache": "STALE"
      });
    }
    return upstreamError("TfL status is temporarily unavailable", error, "Transport for London", "https://tfl.gov.uk/tube-dlr-overground/status/");
  }
}

export function getTflApiKey(env = {}) {
  const value = env.TFL_API_KEY || env.TFL_APP_KEY;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function fetchTflWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= TFL_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json", "user-agent": "LondonNow/0.5.5 (+https://www.londonadvanced.com/)" },
        signal: AbortSignal.timeout(4500)
      });
      if (response.ok) return response;
      const error = new Error(`TfL returned HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    } catch (error) {
      lastError = error;
      const retryable = !error?.status || error.status === 429 || error.status >= 500;
      if (!retryable || attempt === TFL_FETCH_ATTEMPTS) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw lastError;
}

export function isUsableTflSnapshot(snapshot, now = Date.now()) {
  const checkedAt = Date.parse(snapshot?.checkedAt || "");
  return Array.isArray(snapshot?.lines)
    && Number.isFinite(checkedAt)
    && now >= checkedAt
    && now - checkedAt <= TFL_FALLBACK_MAX_AGE_MS;
}

function safeTflError(error) {
  const status = Number(error?.status);
  if (Number.isFinite(status)) return `HTTP ${status}`;
  return error?.name === "TimeoutError" ? "timeout" : "upstream unavailable";
}

async function handleRail(request, env, context) {
  if (!env.NATIONAL_RAIL_API_KEY) {
    return json({
      error: "National Rail API key is not configured",
      action: "Add the NATIONAL_RAIL_API_KEY secret in Cloudflare",
      sourceUrl: "https://raildata.org.uk/dataProduct/P-d81d6eaf-8060-4467-a339-1c833e50cbbe/overview"
    }, 503, { "cache-control": "no-store" });
  }

  const requestUrl = new URL(request.url);
  const station = String(requestUrl.searchParams.get("station") || "WAT").toUpperCase();
  if (!(station in LONDON_STATIONS)) {
    return json({
      error: "Unsupported station",
      supportedStations: Object.entries(LONDON_STATIONS).map(([code, name]) => ({ code, name }))
    }, 400, { "cache-control": "no-store" });
  }

  try {
    return await getRailBoardResponse(request, env, context, { station, numRows: 6, timeWindow: 120 });
  } catch (error) {
    return upstreamError(
      "National Rail departures are temporarily unavailable",
      error,
      "National Rail Live Departure Board",
      `https://www.nationalrail.co.uk/live-trains/departures/${station.toLowerCase()}/`
    );
  }
}

async function getRailBoardResponse(request, env, context, options) {
  if (!env.NATIONAL_RAIL_API_KEY) throw new Error("National Rail API key is not configured");

  const station = String(options.station || "").toUpperCase();
  const filterCrs = options.filterCrs ? String(options.filterCrs).toUpperCase() : null;
  const numRows = Math.min(12, Math.max(1, Number(options.numRows) || 6));
  const timeWindow = Math.min(300, Math.max(1, Number(options.timeWindow) || 120));
  const cache = caches.default;
  const cacheUrl = new URL("/__cache/rail", request.url);
  cacheUrl.search = new URLSearchParams({
    station,
    ...(filterCrs ? { filterCrs } : {}),
    numRows: String(numRows),
    timeWindow: String(timeWindow)
  }).toString();
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return withCacheStatus(cached, "HIT");

  const upstreamUrl = new URL(`${NATIONAL_RAIL_DEPARTURES_URL}/${station}`);
  upstreamUrl.searchParams.set("numRows", String(numRows));
  upstreamUrl.searchParams.set("timeOffset", "0");
  upstreamUrl.searchParams.set("timeWindow", String(timeWindow));
  if (filterCrs) {
    upstreamUrl.searchParams.set("filterCrs", filterCrs);
    upstreamUrl.searchParams.set("filterType", "to");
  }

  const upstream = await fetch(upstreamUrl, {
    headers: {
      accept: "application/json",
      "x-apikey": env.NATIONAL_RAIL_API_KEY,
      "user-agent": "LondonNow/0.5.5 (+https://www.londonadvanced.com/)"
    },
    signal: AbortSignal.timeout(10000)
  });
  if (!upstream.ok) throw new Error(`Rail Data Marketplace returned HTTP ${upstream.status}`);

  const board = normalizeRailBoard(await upstream.json(), { station, filterCrs });
  const response = json(board, 200, {
    "cache-control": `public, max-age=30, s-maxage=${RAIL_CACHE_SECONDS}`,
    "x-cache": "MISS"
  });
  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function handleAirportAccess(request, env, context) {
  const tasks = [getTflResponse(request, env, context)];
  if (env.NATIONAL_RAIL_API_KEY) {
    AIRPORT_RAIL_ROUTES.forEach((route) => {
      tasks.push(getRailBoardResponse(request, env, context, {
        station: route.from,
        filterCrs: route.to,
        numRows: 6,
        timeWindow: 120
      }));
    });
  }

  const results = await Promise.allSettled(tasks);
  let tfl = null;
  if (results[0]?.status === "fulfilled" && results[0].value.ok) {
    tfl = await results[0].value.clone().json();
  }

  const railRoutes = [];
  if (env.NATIONAL_RAIL_API_KEY) {
    for (let index = 0; index < AIRPORT_RAIL_ROUTES.length; index += 1) {
      const definition = AIRPORT_RAIL_ROUTES[index];
      const result = results[index + 1];
      if (result?.status === "fulfilled" && result.value.ok) {
        const board = await result.value.clone().json();
        railRoutes.push({ ...definition, board });
      } else {
        railRoutes.push({ ...definition, error: "Live rail status unavailable" });
      }
    }
  }

  if (!tfl && !railRoutes.some((route) => route.board)) {
    return json({
      error: "Live airport access is temporarily unavailable",
      provider: "TfL and National Rail",
      sourceUrl: "https://www.nationalrail.co.uk/status-and-disruptions/",
      checkedAt: new Date().toISOString()
    }, 502, { "cache-control": "no-store" });
  }

  return json(normalizeAirportAccess(tfl, railRoutes), 200, {
    "cache-control": `public, max-age=30, s-maxage=${RAIL_CACHE_SECONDS}`
  });
}

async function handleWeather(env) {
  if (!env.METOFFICE_API_KEY) {
    return json({
      error: "Met Office API key is not configured",
      action: "Add the METOFFICE_API_KEY secret in Cloudflare",
      sourceUrl: "https://datahub.metoffice.gov.uk/"
    }, 503, { "cache-control": "no-store" });
  }
  if (!env.WEATHER_CACHE) {
    return json({ error: "Weather cache binding is not configured" }, 503, { "cache-control": "no-store" });
  }

  try {
    let forecast = await env.WEATHER_CACHE.get(WEATHER_CACHE_KEY, "json");
    const hadCachedForecast = Boolean(forecast);
    let cacheStatus = "HIT";
    let refreshFailed = false;
    if (shouldRefreshWeather(forecast)) {
      try {
        forecast = await refreshWeather(env);
        cacheStatus = hadCachedForecast ? "REFRESH" : "MISS";
      } catch (error) {
        if (!forecast) throw error;
        refreshFailed = true;
        cacheStatus = "STALE";
      }
    }

    const stale = refreshFailed || Date.now() - Date.parse(forecast.fetchedAt) > WEATHER_STALE_AFTER_MS;
    return json({ ...forecast, stale, refreshFailed }, 200, {
      "cache-control": "public, max-age=300, s-maxage=300",
      "x-cache": cacheStatus
    });
  } catch (error) {
    return upstreamError("Weather forecast is temporarily unavailable", error, "Met Office Weather DataHub", "https://weather.metoffice.gov.uk/forecast/gcpvj0v07");
  }
}

export function shouldRefreshWeather(forecast, now = Date.now()) {
  const fetchedAt = Date.parse(forecast?.fetchedAt || "");
  return !Number.isFinite(fetchedAt) || now - fetchedAt >= WEATHER_REFRESH_AFTER_MS;
}

async function refreshWeather(env) {
  const url = new URL(MET_OFFICE_DAILY_URL);
  url.searchParams.set("dataSource", "BD1");
  url.searchParams.set("includeLocationName", "true");
  url.searchParams.set("excludeParameterMetadata", "true");
  url.searchParams.set("latitude", "51.5074");
  url.searchParams.set("longitude", "-0.1278");

  const upstream = await fetch(url, {
    headers: { accept: "application/json", apikey: env.METOFFICE_API_KEY },
    signal: AbortSignal.timeout(10000)
  });
  if (!upstream.ok) throw new Error(`Met Office returned HTTP ${upstream.status}`);

  const forecast = normalizeWeather(await upstream.json());
  await env.WEATHER_CACHE.put(WEATHER_CACHE_KEY, JSON.stringify(forecast), {
    expirationTtl: 172800
  });
  return forecast;
}

export function normalizeTfl(payload, checkedAt = new Date().toISOString()) {
  if (!Array.isArray(payload)) throw new TypeError("Unexpected TfL response");

  const lines = payload
    .filter((line) => line && typeof line.name === "string")
    .map((line) => {
      const statuses = Array.isArray(line.lineStatuses) ? line.lineStatuses : [];
      const primary = statuses[0] || {};
      const description = primary.statusSeverityDescription || "Status unavailable";
      return {
        id: String(line.id || line.name),
        name: line.name,
        mode: line.modeName || "transport",
        status: description,
        severity: Number.isFinite(primary.statusSeverity) ? primary.statusSeverity : null,
        disrupted: !["Good Service", "Special Service"].includes(description),
        details: stripMarkup(primary.reason || "")
      };
    })
    .sort((a, b) => Number(b.disrupted) - Number(a.disrupted) || a.name.localeCompare(b.name));

  const disruptions = lines.filter((line) => line.disrupted);
  return {
    provider: "Transport for London",
    sourceUrl: "https://tfl.gov.uk/tube-dlr-overground/status/",
    checkedAt,
    status: disruptions.length ? "disruption" : "good",
    summary: disruptions.length
      ? `${disruptions.length} line${disruptions.length === 1 ? "" : "s"} with reported issues`
      : "Good service reported on all included lines",
    disruptionCount: disruptions.length,
    lines
  };
}

export function normalizeRailBoard(payload, options = {}, checkedAt = new Date().toISOString()) {
  if (!payload || typeof payload !== "object") throw new TypeError("Unexpected National Rail response");
  const rawServices = payload.trainServices;
  if (rawServices != null && !Array.isArray(rawServices)) {
    throw new TypeError("Unexpected National Rail services response");
  }

  const services = (rawServices || []).map((service, index) => {
    const scheduled = cleanText(service?.std);
    const expected = cleanText(service?.etd);
    const cancelled = Boolean(service?.isCancelled) || /cancelled/i.test(expected);
    const delayed = !cancelled && isRailServiceDelayed(scheduled, expected);
    const destinations = Array.isArray(service?.destination) ? service.destination : [];
    const destination = destinations.map((item) => cleanText(item?.locationName)).filter(Boolean).join(" & ") || "Destination unavailable";
    return {
      id: cleanText(service?.serviceID) || `${options.station || payload.crs || "rail"}-${index}`,
      scheduled: scheduled || null,
      expected: expected || null,
      platform: cleanText(service?.platform) || null,
      operator: cleanText(service?.operator) || null,
      destination,
      cancelled,
      delayed,
      status: cancelled ? "Cancelled" : delayed ? expected : expected || "Expected time unavailable",
      reason: cleanText(service?.cancelReason) || cleanText(service?.delayReason) || null
    };
  });

  const cancelledCount = services.filter((service) => service.cancelled).length;
  const delayedCount = services.filter((service) => service.delayed).length;
  const disruptionCount = cancelledCount + delayedCount;
  const messages = (Array.isArray(payload.nrccMessages) ? payload.nrccMessages : [])
    .map((message) => cleanText(message?.value || message))
    .filter(Boolean)
    .slice(0, 3);

  return {
    provider: "National Rail Live Departure Board",
    sourceUrl: `https://www.nationalrail.co.uk/live-trains/departures/${String(options.station || payload.crs || "").toLowerCase()}/`,
    checkedAt,
    generatedAt: payload.generatedAt || null,
    station: {
      code: cleanText(payload.crs) || options.station || null,
      name: cleanText(payload.locationName) || LONDON_STATIONS[options.station] || options.station || "National Rail station"
    },
    filterCrs: options.filterCrs || null,
    status: disruptionCount ? "disruption" : services.length ? "good" : "no-services",
    summary: disruptionCount
      ? [cancelledCount ? `${cancelledCount} cancelled` : "", delayedCount ? `${delayedCount} delayed` : ""].filter(Boolean).join(" · ")
      : services.length
        ? `${services.length} departure${services.length === 1 ? "" : "s"} · no reported delay`
        : "No departures returned in the next 2 hours",
    cancelledCount,
    delayedCount,
    messages,
    services
  };
}

export function normalizeAirportAccess(tfl, railRoutes = [], checkedAt = tfl?.checkedAt || new Date().toISOString()) {
  const tflLines = Array.isArray(tfl?.lines) ? tfl.lines : [];
  const findLine = (name) => tflLines.find((line) => line.name.toLowerCase() === name.toLowerCase());
  const liveRoute = (name) => {
    const line = findLine(name);
    return line
      ? { name, provider: "TfL", live: true, disrupted: Boolean(line.disrupted), status: line.status }
      : { name, provider: "TfL", live: false, disrupted: null, status: "Status unavailable" };
  };
  const railRoute = (airport, fallbackName) => {
    const route = railRoutes.find((item) => item.airport === airport);
    if (!route) return { name: fallbackName, provider: "National Rail", live: false, disrupted: null, status: "Rail feed not configured" };
    if (!route.board) return { name: route.name, provider: "National Rail", live: false, disrupted: null, status: route.error || "Status unavailable" };
    return {
      name: route.name,
      provider: "National Rail",
      live: true,
      disrupted: route.board.status === "disruption",
      status: route.board.summary,
      from: route.from,
      to: route.to
    };
  };
  const summarise = (code, name, routes, coverage) => {
    const live = routes.filter((route) => route.live);
    const disrupted = live.filter((route) => route.disrupted);
    const status = disrupted.length ? "disruption" : live.length ? "good" : "pending";
    const label = disrupted.length
      ? `${disrupted.map((route) => route.name).join(" and ")} disruption`
      : live.length && coverage === "live"
        ? "Live route clear"
        : live.length
          ? "TfL routes clear"
          : "Live status unavailable";

    return { code, name, status, coverage, label, routes };
  };

  const airports = [
    summarise("LHR", "Heathrow", [liveRoute("Elizabeth line"), liveRoute("Piccadilly"), railRoute("LHR", "Heathrow Express")], "live"),
    summarise("LGW", "Gatwick", [railRoute("LGW", "Gatwick Express / Southern")], "live"),
    summarise("LTN", "Luton", [railRoute("LTN", "Thameslink / East Midlands Railway")], "live"),
    summarise("STN", "Stansted", [railRoute("STN", "Stansted Express / Greater Anglia")], "live"),
    summarise("LCY", "London City", [liveRoute("DLR")], "live")
  ];

  return {
    provider: "Transport for London and National Rail",
    sourceUrl: "https://www.nationalrail.co.uk/status-and-disruptions/",
    checkedAt,
    scope: "Public-transport access only; not flight operations",
    airports
  };
}

export function normalizeTicketmaster(payload, requestedDate, requestedCategory = "all", checkedAt = new Date().toISOString()) {
  const rawEvents = payload?._embedded?.events;
  if (rawEvents != null && !Array.isArray(rawEvents)) {
    throw new TypeError("Unexpected Ticketmaster response");
  }

  const events = (rawEvents || [])
    .map((event) => {
      const date = event?.dates?.start?.localDate;
      const title = cleanText(event?.name);
      const ticketUrl = validHttpsUrl(event?.url);
      if (!event?.id || !date || !title || !ticketUrl) return null;
      if (date !== requestedDate) return null;

      const statusCode = cleanText(event?.dates?.status?.code).toLowerCase();
      if (statusCode === "cancelled") return null;

      const venue = event?._embedded?.venues?.[0] || {};
      const classification = event?.classifications?.[0] || {};
      const segment = cleanText(classification?.segment?.name) || "Other";
      const genre = cleanText(classification?.genre?.name);
      const price = normalizePrice(event?.priceRanges);

      return {
        id: String(event.id),
        title,
        date,
        time: /^\d{2}:\d{2}:\d{2}$/.test(event?.dates?.start?.localTime || "")
          ? event.dates.start.localTime.slice(0, 5)
          : null,
        dateTime: event?.dates?.start?.dateTime || null,
        venue: cleanText(venue.name) || "Venue to be confirmed",
        area: cleanText(venue?.city?.name),
        category: segment,
        subcategory: genre && genre !== "Undefined" ? genre : null,
        status: statusCode || "scheduled",
        price,
        ticketUrl
      };
    })
    .filter(Boolean)
    .sort((a, b) => eventSortKey(a).localeCompare(eventSortKey(b)) || a.title.localeCompare(b.title))
    .slice(0, 12);

  return {
    provider: "Ticketmaster Discovery API",
    sourceUrl: "https://www.ticketmaster.co.uk/discover/london",
    checkedAt,
    requestedDate,
    requestedCategory,
    affiliateLinks: false,
    count: events.length,
    events
  };
}

function normalizePrice(priceRanges) {
  if (!Array.isArray(priceRanges) || !priceRanges.length) return null;
  const range = priceRanges.find((item) => Number.isFinite(Number(item?.min))) || priceRanges[0];
  const min = finiteNumberOrNull(range?.min);
  const max = finiteNumberOrNull(range?.max);
  if (min == null) return null;
  return {
    currency: cleanText(range?.currency) || "GBP",
    min,
    max: max == null ? min : max,
    explicitlyFree: min === 0 && (max == null || max === 0)
  };
}

function eventSortKey(event) {
  return `${event.date}T${event.time || "23:59"}`;
}

function isRailServiceDelayed(scheduled, expected) {
  if (!expected || /^(on time|no report)$/i.test(expected)) return false;
  if (/^(delayed|cancelled)$/i.test(expected)) return /delayed/i.test(expected);
  if (!/^\d{2}:\d{2}$/.test(scheduled) || !/^\d{2}:\d{2}$/.test(expected)) return false;
  const toMinutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  let difference = toMinutes(expected) - toMinutes(scheduled);
  if (difference < -720) difference += 1440;
  return difference >= 5;
}

function cleanText(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function validHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)ticketmaster\.co\.uk$/i.test(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

function finiteNumberOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isValidDateKey(value) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function londonDateKey(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/London"
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function londonDayUtcRange(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const start = londonMidnightUtc(year, month, day);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const end = londonMidnightUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
  return { start: start.toISOString().replace(".000Z", "Z"), end: end.toISOString().replace(".000Z", "Z") };
}

function londonMidnightUtc(year, month, day) {
  const middayUtc = new Date(Date.UTC(year, month - 1, day, 12));
  const offsetName = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    timeZoneName: "longOffset"
  }).formatToParts(middayUtc).find((part) => part.type === "timeZoneName")?.value || "GMT";
  const match = offsetName.match(/GMT([+-])(\d{2}):(\d{2})/);
  const offsetMinutes = match
    ? (match[1] === "+" ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3]))
    : 0;
  return new Date(Date.UTC(year, month - 1, day) - offsetMinutes * 60_000);
}

export function normalizeWeather(payload, fetchedAt = new Date().toISOString()) {
  const properties = payload?.features?.[0]?.properties;
  const series = properties?.timeSeries;
  if (!Array.isArray(series) || !series.length) throw new TypeError("Unexpected Met Office response");

  const days = series.map((row) => {
    const code = firstNumber(row.daySignificantWeatherCode, row.significantWeatherCode, row.nightSignificantWeatherCode);
    const maxC = firstNumber(row.dayMaxScreenTemperature, row.maxScreenAirTemp, row.screenTemperature);
    const minC = firstNumber(row.nightMinScreenTemperature, row.minScreenAirTemp, row.screenTemperature);
    const rainProbability = maxNumber(row.dayProbabilityOfRain, row.nightProbabilityOfRain, row.probOfPrecipitation);
    const windMs = firstNumber(row.midday10MWindSpeed, row.windSpeed10m);
    const gustMs = firstNumber(row.midday10MWindGust, row.max10mWindGust, row.windGustSpeed10m);
    const date = String(row.time || "").slice(0, 10);
    if (!date) throw new TypeError("Met Office forecast day is missing a date");

    return {
      date,
      condition: weatherDescription(code),
      weatherCode: code,
      maxC: roundOrNull(maxC),
      minC: roundOrNull(minC),
      rainProbability: roundOrNull(rainProbability),
      windMph: roundOrNull(windMs == null ? null : windMs * 2.23694),
      gustMph: roundOrNull(gustMs == null ? null : gustMs * 2.23694)
    };
  });

  return {
    provider: "Met Office Weather DataHub",
    sourceUrl: "https://weather.metoffice.gov.uk/forecast/gcpvj0v07",
    location: properties.location?.name || "London",
    modelRunAt: properties.modelRunDate || null,
    fetchedAt,
    stale: false,
    days
  };
}

function weatherDescription(code) {
  const descriptions = {
    0: "Clear night", 1: "Sunny", 2: "Partly cloudy", 3: "Partly cloudy",
    5: "Mist", 6: "Fog", 7: "Cloudy", 8: "Overcast", 9: "Light rain showers",
    10: "Light rain showers", 11: "Drizzle", 12: "Light rain", 13: "Heavy rain showers",
    14: "Heavy rain showers", 15: "Heavy rain", 16: "Sleet showers", 17: "Sleet showers",
    18: "Sleet", 19: "Hail showers", 20: "Hail showers", 21: "Hail", 22: "Light snow showers",
    23: "Light snow showers", 24: "Light snow", 25: "Heavy snow showers", 26: "Heavy snow showers",
    27: "Heavy snow", 28: "Thunder showers", 29: "Thunder showers", 30: "Thunder"
  };
  return descriptions[code] || "Forecast available";
}

function firstNumber(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function maxNumber(...values) {
  const numbers = values
    .filter((value) => value != null && value !== "")
    .map(Number)
    .filter(Number.isFinite);
  return numbers.length ? Math.max(...numbers) : null;
}

function roundOrNull(value) {
  return value == null || !Number.isFinite(value) ? null : Math.round(value);
}

function stripMarkup(value) {
  return String(value).replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}

function withCacheStatus(response, value) {
  const copy = new Response(response.body, response);
  copy.headers.set("x-cache", value);
  return copy;
}

function upstreamError(message, error, provider, sourceUrl) {
  return json({
    error: message,
    detail: error instanceof Error ? error.message : "Unknown upstream error",
    provider,
    sourceUrl,
    checkedAt: new Date().toISOString()
  }, 502, { "cache-control": "no-store" });
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_JSON_HEADERS, ...extraHeaders }
  });
}
