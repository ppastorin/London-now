import test from "node:test";
import assert from "node:assert/strict";
import {
  londonDateRangeUtc,
  londonDayUtcRange,
  normalizeTicketmaster,
  ticketmasterAffiliateUrl,
  validateEventDateRange
} from "../worker/index.js";

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
  assert.equal(result.affiliateLinks, true);
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
  assert.equal(result.events[0].ticketUrl, "https://www.ticketmaster.co.uk/london-night-concert/event/123");
  assert.equal(
    result.events[0].affiliateUrl,
    "https://ticketmaster.evyy.net/c/7729619/1965662/24023?u=https%3A%2F%2Fwww.ticketmaster.co.uk%2Flondon-night-concert%2Fevent%2F123"
  );
});

test("builds a Ticketmaster UK theatre deep link without losing its performance fragment", () => {
  const destination = "https://theatre.ticketmaster.co.uk/book/1HMDJ-avenue-q/#perf=1HMDJ-5M&date=2026-09-14&time=7.30PM";
  assert.equal(
    ticketmasterAffiliateUrl(destination),
    "https://ticketmaster.evyy.net/c/7729619/1965662/24023?u=https%3A%2F%2Ftheatre.ticketmaster.co.uk%2Fbook%2F1HMDJ-avenue-q%2F%23perf%3D1HMDJ-5M%26date%3D2026-09-14%26time%3D7.30PM"
  );
});

test("does not build affiliate links for non-Ticketmaster destinations", () => {
  assert.equal(ticketmasterAffiliateUrl("https://example.com/tickets"), null);
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

test("normalizes events across an inclusive selected date range", () => {
  const endDate = "2026-09-07";
  const result = normalizeTicketmaster({
    _embedded: {
      events: [
        event(),
        event({
          id: "tm-2",
          name: "Range Closing Concert",
          dates: {
            start: { localDate: endDate, localTime: "20:00:00", dateTime: "2026-09-07T19:00:00Z" },
            status: { code: "onsale" }
          }
        }),
        event({
          id: "outside",
          dates: {
            start: { localDate: "2026-09-08", localTime: "18:00:00" },
            status: { code: "onsale" }
          }
        })
      ]
    }
  }, requestedDate, "music", checkedAt, endDate);

  assert.deepEqual(result.events.map((item) => item.id), ["tm-1", "tm-2"]);
  assert.equal(result.requestedDate, null);
  assert.equal(result.requestedStartDate, requestedDate);
  assert.equal(result.requestedEndDate, endDate);
});

test("validates single dates and ranges up to 31 inclusive days", () => {
  assert.deepEqual(validateEventDateRange("2026-09-05"), {
    startDate: "2026-09-05",
    endDate: "2026-09-05",
    days: 1
  });
  assert.equal(validateEventDateRange("2026-09-01", "2026-10-01").days, 31);
  assert.throws(() => validateEventDateRange("2026-02-30"), /Invalid start date/);
  assert.throws(() => validateEventDateRange("2026-09-06", "2026-09-05"), /on or after/);
  assert.throws(() => validateEventDateRange("2026-09-01", "2026-10-02"), /cannot exceed 31 days/);
});

test("builds a London UTC interval across a daylight-saving change", () => {
  assert.deepEqual(londonDateRangeUtc("2026-10-24", "2026-10-26"), {
    start: "2026-10-23T23:00:00Z",
    end: "2026-10-27T00:00:00Z"
  });
});
