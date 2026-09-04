import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAirportAccess } from "../worker/index.js";

const checkedAt = "2026-09-04T14:00:00.000Z";

test("builds live Heathrow and London City access from TfL lines", () => {
  const result = normalizeAirportAccess({
    checkedAt,
    lines: [
      { name: "Elizabeth line", status: "Good Service", disrupted: false },
      { name: "Piccadilly", status: "Minor Delays", disrupted: true },
      { name: "DLR", status: "Good Service", disrupted: false }
    ]
  });

  const heathrow = result.airports.find((airport) => airport.code === "LHR");
  const city = result.airports.find((airport) => airport.code === "LCY");
  assert.equal(result.checkedAt, checkedAt);
  assert.equal(heathrow.status, "disruption");
  assert.equal(heathrow.coverage, "partial");
  assert.match(heathrow.label, /Piccadilly disruption/);
  assert.equal(city.status, "good");
  assert.equal(city.coverage, "live");
});

test("marks rail-dependent airports pending without inventing a status", () => {
  const result = normalizeAirportAccess({ checkedAt, lines: [] });

  for (const code of ["LGW", "LTN", "STN"]) {
    const airport = result.airports.find((item) => item.code === code);
    assert.equal(airport.status, "pending");
    assert.equal(airport.coverage, "pending");
    assert.equal(airport.label, "Rail feed pending");
  }
});

test("does not describe airport access as flight status", () => {
  const result = normalizeAirportAccess({ checkedAt, lines: [] });
  assert.match(result.scope, /not flight operations/i);
  assert.doesNotMatch(JSON.stringify(result), /flight delay|on time/i);
});
