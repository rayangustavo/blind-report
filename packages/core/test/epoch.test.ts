import { describe, expect, it } from "vitest";
import { currentEpoch, epochOf, isEpoch } from "../src/epoch";

describe("epochOf", () => {
  it("returns the UTC year-month with zero padding", () => {
    expect(epochOf(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-01");
    expect(epochOf(new Date(Date.UTC(2026, 10, 6, 23, 59, 59)))).toBe("2026-11");
    expect(epochOf(new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999)))).toBe("2026-12");
  });

  it("uses UTC, not the local timezone", () => {
    // 2026-12-31T23:30 at UTC-3 is already 2027-01-01T02:30 UTC.
    const date = new Date("2026-12-31T23:30:00-03:00");
    expect(epochOf(date)).toBe("2027-01");
  });

  it("defaults to the current date and monthly period", () => {
    const before = epochOf(new Date());
    expect(currentEpoch()).toBe(before);
    expect(isEpoch(currentEpoch())).toBe(true);
  });

  it("rejects invalid dates", () => {
    expect(() => epochOf(new Date(Number.NaN))).toThrow(TypeError);
    expect(() => epochOf("2026-11-06" as unknown as Date)).toThrow(TypeError);
  });

  it("rejects unsupported periods", () => {
    expect(() => epochOf(new Date(), "weekly" as unknown as "monthly")).toThrow(TypeError);
  });
});

describe("isEpoch", () => {
  it("accepts valid YYYY-MM strings", () => {
    for (const epoch of ["2026-01", "2026-09", "2026-10", "2026-11", "2026-12", "1999-06"]) {
      expect(isEpoch(epoch)).toBe(true);
    }
  });

  it("rejects malformed or out-of-range strings", () => {
    for (const value of ["", "2026", "2026-1", "2026-00", "2026-13", "202611", " 2026-11", "2026-11 ", "abcd-ef", "2026-11-01"]) {
      expect(isEpoch(value)).toBe(false);
    }
    expect(isEpoch(202611 as unknown as string)).toBe(false);
  });
});
