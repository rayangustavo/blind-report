import { describe, expect, it } from "vitest";

import { createRateLimiter } from "../src/ratelimit";

describe("relayer rate limiter", () => {
  it("allows the first request and blocks the second within the window", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });

    expect(limiter.check("client-1")).toBe(true);
    expect(limiter.check("client-1")).toBe(false);
  });
});
