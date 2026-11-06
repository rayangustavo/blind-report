import { describe, expect, it } from "vitest";

import { createRenewalJob } from "../src/renewal";

describe("relayer renewal job", () => {
  it("creates a renewal job with a start method", () => {
    const job = createRenewalJob({
      intervalMs: 1000,
      thresholdSeconds: 60,
      onTick: async () => undefined,
    });

    expect(job).toBeTruthy();
    expect(typeof job.start).toBe("function");
    expect(typeof job.stop).toBe("function");
  });
});
