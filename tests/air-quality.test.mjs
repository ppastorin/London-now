import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAirQuality, shouldRefreshAirQuality } from "../worker/index.js";

const sample = {
  HourlyAirQualityIndex: {
    "@GroupName": "London",
    "@TimeToLive": "17",
    LocalAuthority: [
      {
        "@LocalAuthorityName": "Camden",
        Site: {
          "@BulletinDate": "2026-09-09 12:00:00",
          "@SiteCode": "BL0",
          "@SiteName": "Camden - Bloomsbury",
          Species: [
            { "@SpeciesCode": "NO2", "@SpeciesDescription": "Nitrogen Dioxide", "@AirQualityIndex": "0", "@AirQualityBand": "No data", "@IndexSource": "Measurement" },
            { "@SpeciesCode": "PM25", "@SpeciesDescription": "PM2.5 Particulate", "@AirQualityIndex": "2", "@AirQualityBand": "Low", "@IndexSource": "Trigger" }
          ]
        }
      },
      {
        "@LocalAuthorityName": "Westminster",
        Site: [{
          "@BulletinDate": "2026-09-09 13:00:00",
          "@SiteCode": "MY1",
          "@SiteName": "Westminster - Marylebone Road",
          Species: { "@SpeciesCode": "NO2", "@SpeciesDescription": "Nitrogen Dioxide", "@AirQualityIndex": "4", "@AirQualityBand": "Moderate", "@IndexSource": "Measurement" }
        }]
      }
    ]
  }
};

test("normalizes the highest current LAQN index across array and singleton records", () => {
  const result = normalizeAirQuality(sample, "2026-09-09T12:05:00.000Z");
  assert.equal(result.index, 4);
  assert.equal(result.band, "Moderate");
  assert.equal(result.status, "moderate");
  assert.deepEqual(result.pollutants, ["Nitrogen Dioxide"]);
  assert.equal(result.reportingSiteCount, 2);
  assert.equal(result.observationCount, 2);
  assert.equal(result.dataAt, "2026-09-09 13:00:00");
  assert.equal(result.validUntil, "2026-09-09T12:22:00.000Z");
});

test("preserves a valid feed with no current non-zero observations as unavailable", () => {
  const payload = structuredClone(sample);
  payload.HourlyAirQualityIndex.LocalAuthority[0].Site.Species[1]["@AirQualityIndex"] = "0";
  payload.HourlyAirQualityIndex.LocalAuthority[1].Site[0].Species["@AirQualityIndex"] = "0";
  const result = normalizeAirQuality(payload);
  assert.equal(result.index, null);
  assert.equal(result.band, "No data");
  assert.equal(result.reportingSiteCount, 0);
});

test("rejects malformed LAQN payloads", () => {
  assert.throws(() => normalizeAirQuality({}), /Unexpected LAQN response/);
});

test("refreshes at the provider validity boundary", () => {
  const report = { fetchedAt: "2026-09-09T12:00:00.000Z", validUntil: "2026-09-09T12:17:00.000Z" };
  assert.equal(shouldRefreshAirQuality(report, Date.parse("2026-09-09T12:16:59.999Z")), false);
  assert.equal(shouldRefreshAirQuality(report, Date.parse("2026-09-09T12:17:00.000Z")), true);
  assert.equal(shouldRefreshAirQuality(null), true);
});
