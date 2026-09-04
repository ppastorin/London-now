import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWeather, shouldRefreshWeather } from "../worker/index.js";

test("normalizes Met Office daily Global Spot data", () => {
  const result = normalizeWeather({
    features: [{
      properties: {
        location: { name: "City of London" },
        modelRunDate: "2026-09-04T09:00Z",
        timeSeries: [{
          time: "2026-09-04T12:00Z",
          daySignificantWeatherCode: 10,
          dayMaxScreenTemperature: 19.4,
          nightMinScreenTemperature: 11.6,
          dayProbabilityOfRain: 42,
          nightProbabilityOfRain: 18,
          midday10MWindSpeed: 5,
          midday10MWindGust: 8
        }]
      }
    }]
  }, "2026-09-04T10:00:00.000Z");

  assert.equal(result.provider, "Met Office Weather DataHub");
  assert.equal(result.location, "City of London");
  assert.equal(result.days[0].date, "2026-09-04");
  assert.equal(result.days[0].condition, "Light rain showers");
  assert.equal(result.days[0].maxC, 19);
  assert.equal(result.days[0].minC, 12);
  assert.equal(result.days[0].rainProbability, 42);
  assert.equal(result.days[0].windMph, 11);
});

test("rejects an unexpected Met Office response", () => {
  assert.throws(() => normalizeWeather({ features: [] }), /Unexpected Met Office response/);
});

test("preserves genuinely missing weather values as null", () => {
  const result = normalizeWeather({
    features: [{ properties: { timeSeries: [{ time: "2026-09-05T12:00Z" }] } }]
  });
  assert.equal(result.days[0].maxC, null);
  assert.equal(result.days[0].rainProbability, null);
  assert.equal(result.days[0].windMph, null);
});

test("refreshes a forecast once its cache is 70 minutes old", () => {
  const fetchedAt = "2026-09-04T12:00:00.000Z";
  assert.equal(shouldRefreshWeather({ fetchedAt }, Date.parse("2026-09-04T13:09:59.000Z")), false);
  assert.equal(shouldRefreshWeather({ fetchedAt }, Date.parse("2026-09-04T13:10:00.000Z")), true);
});

test("refreshes missing or invalid cache metadata", () => {
  assert.equal(shouldRefreshWeather(null), true);
  assert.equal(shouldRefreshWeather({ fetchedAt: "not-a-date" }), true);
});
