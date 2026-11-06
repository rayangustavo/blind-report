import { describe, expect, it } from "vitest";

import { createSimulatedVerifier, createWorldVerifier } from "../src/verifier";

describe("worldid-gate verifier", () => {
  it("accepts a simulated valid proof", async () => {
    const verifier = createSimulatedVerifier({ appId: "blind-report" });

    const result = await verifier(
      {
        proof: "valid-proof",
        merkle_root: "root",
        nullifier_hash: "nullifier-1",
        verification_level: "orb",
      },
      "submit:folha.eth:2026-11",
    );

    expect(result.ok).toBe(true);
  });

  it("rejects invalid proof payloads", async () => {
    const verifier = createSimulatedVerifier({ appId: "blind-report" });

    const result = await verifier(
      {
        proof: "bad-proof",
        merkle_root: "root",
        nullifier_hash: "nullifier-2",
        verification_level: "orb",
      },
      "submit:folha.eth:2026-11",
    );

    expect(result.ok).toBe(false);
  });

  it("exposes a world verifier factory", () => {
    const verifier = createWorldVerifier({ appId: "blind-report", apiUrl: "https://example.test" });
    expect(typeof verifier).toBe("function");
  });
});
