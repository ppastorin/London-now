const TFL_STATUS_URL = "https://api.tfl.gov.uk/Line/Mode/tube,dlr,overground,elizabeth-line/Status";
const MET_OFFICE_DAILY_URL = "https://data.hub.api.metoffice.gov.uk/sitespecific/v0/point/daily";
const WEATHER_CACHE_KEY = "metoffice:global-spot:london:daily:v1";
const TFL_CACHE_SECONDS = 75;
const WEATHER_STALE_AFTER_MS = 2 * 60 * 60 * 1000;

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
      return json({
        status: weatherState === "ready" ? "ok" : "configuration-required",
        version: "0.3.1",
        integrations: { tfl: "live", weather: weatherState },
        checkedAt: new Date().toISOString()
      }, weatherState === "ready" ? 200 : 503, { "cache-control": "no-store" });
    }

    if (url.pathname === "/api/tfl") return handleTfl(request, env, context);
    if (url.pathname === "/api/weather") return handleWeather(env);

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
  const cache = caches.default;
  const cacheKey = new Request(new URL("/__cache/tfl", request.url).toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return withCacheStatus(cached, "HIT");

  const upstreamUrl = new URL(TFL_STATUS_URL);
  if (env.TFL_APP_KEY) upstreamUrl.searchParams.set("app_key", env.TFL_APP_KEY);

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000)
    });
    if (!upstream.ok) throw new Error(`TfL returned HTTP ${upstream.status}`);

    const response = json(normalizeTfl(await upstream.json()), 200, {
      "cache-control": `public, max-age=30, s-maxage=${TFL_CACHE_SECONDS}`,
      "x-cache": "MISS"
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    return upstreamError("TfL status is temporarily unavailable", error, "Transport for London", "https://tfl.gov.uk/tube-dlr-overground/status/");
  }
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
    let cacheStatus = "HIT";
    if (!forecast) {
      forecast = await refreshWeather(env);
      cacheStatus = "MISS";
    }

    forecast.stale = Date.now() - Date.parse(forecast.fetchedAt) > WEATHER_STALE_AFTER_MS;
    return json(forecast, 200, {
      "cache-control": "public, max-age=300, s-maxage=300",
      "x-cache": cacheStatus
    });
  } catch (error) {
    return upstreamError("Weather forecast is temporarily unavailable", error, "Met Office Weather DataHub", "https://weather.metoffice.gov.uk/forecast/gcpvj0v07");
  }
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
