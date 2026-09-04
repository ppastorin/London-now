import test from "node:test";
import assert from "node:assert/strict";
import { londonDayUtcRange, normalizeTicketmaster } from "../worker/index.js";

const requestedDate = "2026-09-05";
const checkedAt = "2026-09-04T12:00:00.000Z";

function event(overrides = {}) {
  return {
    id: "tm-1",
    name: "London Night Concert",
    url: "https://www.ticketmaster.co.uk/london-night-concert/event/123",
    dates: {
      start: {
        localDate: requestedDate,
        localTime: "19:30:00",
        dateTime: "2026-09-05T18:30:00Z"
      },
      status: { code: "onsale" }
    },
    classifications: [{
      segment: { name: "Music" },
      genre: { name: "Rock" }
    }],
    priceRanges: [{ currency: "GBP", min: 25, max: 75 }],
    _embedded: {
      venues: [{ name: "Example Hall", city: { name: "London" } }]
    },
    ...overrides
  };
}

test("normalizes a Ticketmaster event without exposing upstream noise", () => {
  const result = normalizeTicketmaster({ _embedded: { events: [event()] } }, requestedDate, "music", checkedAt);

  assert.equal(result.provider, "Ticketmaster Discovery API");
  assert.equal(result.checkedAt, checkedAt);
  assert.equal(result.affiliateLinks, false);
  assert.equal(result.count, 1);
  assert.deepEqual(result.events[0].price, {
    currency: "GBP",
    min: 25,
    max: 75,
    explicitlyFree: false
  });
  assert.equal(result.events[0].time, "19:30");
  assert.equal(result.events[0].venue, "Example Hall");
  assert.equal(result.events[0].category, "Music");
  assert.equal(result.events[0].subcategory, "Rock");
});

test("preserves a missing price as unknown rather than free", () => {
  const result = normalizeTicketmaster({ _embedded: { events: [event({ priceRanges: undefined })] } }, requestedDate);
  assert.equal(result.events[0].price, null);
});

test("marks an event free only when the supplied range is explicitly zero", () => {
  const result = normalizeTicketmaster({
    _embedded: { events: [event({ priceRanges: [{ currency: "GBP", min: 0, max: 0 }] })] }
  }, requestedDate);
  assert.equal(result.events[0].price.explicitlyFree, true);
});

test("removes cancelled, wrong-date and unsafe-link events", () => {
  const result = normalizeTicketmaster({
    _embedded: {
      events: [
        event({ id: "cancelled", dates: { start: { localDate: requestedDate }, status: { code: "cancelled" } } }),
        event({ id: "wrong-date", dates: { start: { localDate: "2026-09-06" }, status: { code: "onsale" } } }),
        event({ id: "unsafe", url: "https://example.com/tickets" })
      ]
    }
  }, requestedDate);
  assert.equal(result.count, 0);
});

test("handles a valid Ticketmaster response with no events", () => {
  const result = normalizeTicketmaster({ page: { totalElements: 0 } }, requestedDate);
  assert.deepEqual(result.events, []);
  assert.equal(result.count, 0);
});

test("rejects malformed embedded event data", () => {
  assert.throws(
    () => normalizeTicketmaster({ _embedded: { events: {} } }, requestedDate),
    /Unexpected Ticketmaster response/
  );
});

test("builds Ticketmaster query boundaries for London daylight saving time", () => {
  assert.deepEqual(londonDayUtcRange("2026-09-05"), {
    start: "2026-09-04T23:00:00Z",
    end: "2026-09-05T23:00:00Z"
  });
  assert.deepEqual(londonDayUtcRange("2026-12-05"), {
    start: "2026-12-05T00:00:00Z",
    end: "2026-12-06T00:00:00Z"
  });
});
