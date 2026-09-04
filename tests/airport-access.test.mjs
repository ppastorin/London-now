import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAirportAccess } from "../worker/index.js";

const checkedAt = "2026-09-04T14:00:00.000Z";

test("combines TfL and National Rail airport access", () => {
  const result = normalizeAirportAccess({
    checkedAt,
    lines: [
      { name: "Elizabeth line", status: "Good Service", disrupted: false },
      { name: "Piccadilly", status: "Minor Delays", disrupted: true },
      { name: "DLR", status: "Good Service", disrupted: false }
    ]
  }, [
    { airport: "LHR", name: "Heathrow Express", from: "PAD", to: "HXX", board: { status: "good", summary: "4 departures · no reported delay" } },
    { airport: "LGW", name: "Gatwick Express / Southern", from: "VIC", to: "GTW", board: { status: "disruption", summary: "1 delayed" } }
  ]);

  const heathrow = result.airports.find((airport) => airport.code === "LHR");
  const city = result.airports.find((airport) => airport.code === "LCY");
  assert.equal(result.checkedAt, checkedAt);
  assert.equal(heathrow.status, "disruption");
  assert.equal(heathrow.coverage, "live");
  assert.match(heathrow.label, /Piccadilly disruption/);
  assert.equal(result.airports.find((airport) => airport.code === "LGW").status, "disruption");
  assert.equal(city.status, "good");
  assert.equal(city.coverage, "live");
});

test("marks missing rail-dependent airport data unavailable without inventing a status", () => {
  const result = normalizeAirportAccess({ checkedAt, lines: [] });

  for (const code of ["LGW", "LTN", "STN"]) {
    const airport = result.airports.find((item) => item.code === code);
    assert.equal(airport.status, "pending");
    assert.equal(airport.coverage, "live");
    assert.equal(airport.label, "Live status unavailable");
  }
});

test("does not describe airport access as flight status", () => {
  const result = normalizeAirportAccess({ checkedAt, lines: [] });
  assert.match(result.scope, /not flight operations/i);
  assert.doesNotMatch(JSON.stringify(result), /flight delay|on time/i);
});
