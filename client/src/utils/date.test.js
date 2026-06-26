import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDate, relativeTime, toValidDate } from "./date.js";

describe("date utilities", () => {
  it("formats invalid dates without throwing", () => {
    assert.equal(formatDate("not-a-date"), "Unknown");
    assert.equal(formatDate({}), "Unknown");
    assert.equal(relativeTime("not-a-date"), "");
  });

  it("accepts Firestore timestamp-like values", () => {
    const timestampLike = { seconds: 1_786_208_400, nanoseconds: 0 };
    const date = toValidDate(timestampLike);

    assert.ok(date instanceof Date);
    assert.equal(date.toISOString(), "2026-08-08T17:00:00.000Z");
  });
});
