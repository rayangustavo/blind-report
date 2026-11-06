import { describe, expect, it } from "vitest";

import { createRpContext } from "../src/rpContext";

describe("worldid-gate rp context", () => {
  it("binds the action and expires in the future", () => {
    const context = createRpContext({
      rpId: "blind-report",
      action: "submit:folha.eth:2026-11",
      secret: "secret-key",
      validMs: 60_000,
    });

    expect(context.rp_id).toBe("blind-report");
    expect(context.action).toBe("submit:folha.eth:2026-11");
    expect(context.signature).toBeTruthy();
    expect(context.valid_until).toBeGreaterThan(Date.now());
  });
});
