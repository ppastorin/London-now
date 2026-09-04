import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRailBoard } from "../worker/index.js";

const payload = {
  generatedAt: "2026-09-04T14:00:00Z",
  locationName: "London Waterloo",
  crs: "WAT",
  nrccMessages: [{ value: "Engineering work may affect later services." }],
  trainServices: [
    {
      serviceID: "one",
      std: "14:20",
      etd: "On time",
      platform: "5",
      operator: "South Western Railway",
      destination: [{ locationName: "Weymouth", crs: "WEY" }]
    },
    {
      serviceID: "two",
      std: "14:25",
      etd: "14:32",
      platform: "7",
      operator: "South Western Railway",
      destination: [{ locationName: "Guildford", crs: "GLD" }],
      delayReason: "A late-running train"
    },
    {
      serviceID: "three",
      std: "14:30",
      etd: "Cancelled",
      isCancelled: true,
      destination: [{ locationName: "Portsmouth Harbour", crs: "PMH" }],
      cancelReason: "A signalling fault"
    }
  ]
};

test("normalizes departures and identifies material delays and cancellations", () => {
  const result = normalizeRailBoard(payload, { station: "WAT" }, "2026-09-04T14:01:00Z");
  assert.equal(result.provider, "National Rail Live Departure Board");
  assert.equal(result.station.code, "WAT");
  assert.equal(result.station.name, "London Waterloo");
  assert.equal(result.status, "disruption");
  assert.equal(result.delayedCount, 1);
  assert.equal(result.cancelledCount, 1);
  assert.equal(result.services[0].status, "On time");
  assert.equal(result.services[1].delayed, true);
  assert.equal(result.services[2].cancelled, true);
  assert.deepEqual(result.messages, ["Engineering work may affect later services."]);
});

test("does not treat a small expected-time variance as a disruption", () => {
  const result = normalizeRailBoard({
    locationName: "London Victoria",
    crs: "VIC",
    trainServices: [{ std: "23:59", etd: "00:02", destination: [{ locationName: "Gatwick Airport" }] }]
  }, { station: "VIC" });
  assert.equal(result.status, "good");
  assert.equal(result.delayedCount, 0);
});

test("reports an empty but valid board without claiming disruption", () => {
  const result = normalizeRailBoard({ locationName: "London Euston", crs: "EUS", trainServices: [] }, { station: "EUS" });
  assert.equal(result.status, "no-services");
  assert.match(result.summary, /No departures returned/);
});

test("rejects malformed service collections", () => {
  assert.throws(() => normalizeRailBoard({ trainServices: {} }, { station: "WAT" }), /Unexpected National Rail services response/);
});
