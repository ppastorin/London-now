import test from "node:test";
import assert from "node:assert/strict";
import { getTflApiKey, isUsableTflSnapshot, normalizeTfl } from "../worker/index.js";

test("normalizes and prioritises disrupted TfL lines", () => {
  const result = normalizeTfl([
    {
      id: "victoria",
      name: "Victoria",
      modeName: "tube",
      lineStatuses: [{ statusSeverity: 10, statusSeverityDescription: "Good Service" }]
    },
    {
      id: "district",
      name: "District",
      modeName: "tube",
      lineStatuses: [{
        statusSeverity: 9,
        statusSeverityDescription: "Minor Delays",
        reason: "<b>District Line:</b> Minor delays &amp; recovery work."
      }]
    }
  ], "2026-09-04T12:00:00.000Z");

  assert.equal(result.status, "disruption");
  assert.equal(result.disruptionCount, 1);
  assert.equal(result.lines[0].name, "District");
  assert.equal(result.lines[0].details, "District Line: Minor delays & recovery work.");
  assert.equal(result.checkedAt, "2026-09-04T12:00:00.000Z");
});

test("reports good service when no included line is disrupted", () => {
  const result = normalizeTfl([{ name: "DLR", lineStatuses: [{ statusSeverityDescription: "Good Service" }] }]);
  assert.equal(result.status, "good");
  assert.equal(result.disruptionCount, 0);
});

test("prefers TFL_API_KEY and retains TFL_APP_KEY compatibility", () => {
  assert.equal(getTflApiKey({ TFL_API_KEY: " preferred ", TFL_APP_KEY: "legacy" }), "preferred");
  assert.equal(getTflApiKey({ TFL_APP_KEY: " legacy " }), "legacy");
  assert.equal(getTflApiKey({}), null);
});

test("accepts a last-confirmed TfL snapshot for no more than five minutes", () => {
  const checkedAt = "2026-09-04T12:00:00.000Z";
  const snapshot = { checkedAt, lines: [] };
  assert.equal(isUsableTflSnapshot(snapshot, Date.parse(checkedAt) + 5 * 60 * 1000), true);
  assert.equal(isUsableTflSnapshot(snapshot, Date.parse(checkedAt) + 5 * 60 * 1000 + 1), false);
  assert.equal(isUsableTflSnapshot({ checkedAt }, Date.parse(checkedAt)), false);
});
