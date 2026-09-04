const TFL_STATUS_URL = "https://api.tfl.gov.uk/Line/Mode/tube,dlr,overground,elizabeth-line/Status";
const CACHE_SECONDS = 75;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": `public, max-age=30, s-maxage=${CACHE_SECONDS}`,
  "x-content-type-options": "nosniff"
};

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({
        status: "ok",
        version: "0.2.0",
        integrations: { tfl: "live", weather: "not-in-this-build" },
        checkedAt: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/tfl") {
      return handleTfl(request, env, context);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, 404);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleTfl(request, env, context) {
  const cache = caches.default;
  const cacheUrl = new URL("/__cache/tfl", request.url);
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return withCacheStatus(cached, "HIT");

  const upstreamUrl = new URL(TFL_STATUS_URL);
  if (env.TFL_APP_KEY) upstreamUrl.searchParams.set("app_key", env.TFL_APP_KEY);

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000)
    });

    if (!upstream.ok) {
      throw new Error(`TfL returned HTTP ${upstream.status}`);
    }

    const payload = await upstream.json();
    const response = json(normalizeTfl(payload), 200, { "x-cache": "MISS" });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    return json({
      error: "TfL status is temporarily unavailable",
      detail: error instanceof Error ? error.message : "Unknown upstream error",
      provider: "Transport for London",
      sourceUrl: "https://tfl.gov.uk/tube-dlr-overground/status/",
      checkedAt: new Date().toISOString()
    }, 502, { "cache-control": "no-store" });
  }
}

export function normalizeTfl(payload, checkedAt = new Date().toISOString()) {
  if (!Array.isArray(payload)) throw new TypeError("Unexpected TfL response");

  const lines = payload
    .filter((line) => line && typeof line.name === "string")
    .map((line) => {
      const statuses = Array.isArray(line.lineStatuses) ? line.lineStatuses : [];
      const primary = statuses[0] || {};
      const description = primary.statusSeverityDescription || "Status unavailable";
      const details = stripMarkup(primary.reason || "");
      const disrupted = !["Good Service", "Special Service"].includes(description);
      return {
        id: String(line.id || line.name),
        name: line.name,
        mode: line.modeName || "transport",
        status: description,
        severity: Number.isFinite(primary.statusSeverity) ? primary.statusSeverity : null,
        disrupted,
        details
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

function stripMarkup(value) {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function withCacheStatus(response, value) {
  const copy = new Response(response.body, response);
  copy.headers.set("x-cache", value);
  return copy;
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}
