import { describe, expect, it } from "vitest";

import { createMemoryNullifierStore } from "../src/store";
import { createSubmissionGate } from "../src/gate";
import { createSimulatedVerifier } from "../src/verifier";

describe("worldid-gate gate", () => {
  it("admits and blocks replay for the same action", async () => {
    const gate = createSubmissionGate({
      verifier: createSimulatedVerifier({ appId: "blind-report" }),
      store: createMemoryNullifierStore(),
      rpId: "blind-report",
      environment: "test",
    });

    const allowed = await gate.admit({
      newsroom: "folha.eth",
      epoch: "2026-11",
      idKitPayload: {
        proof: "valid-proof",
        merkle_root: "root",
        nullifier_hash: "nullifier-1",
        verification_level: "orb",
      },
    });

    expect(allowed.ok).toBe(true);

    const replay = await gate.admit({
      newsroom: "folha.eth",
      epoch: "2026-11",
      idKitPayload: {
        proof: "valid-proof",
        merkle_root: "root",
        nullifier_hash: "nullifier-1",
        verification_level: "orb",
      },
    });

    expect(replay.ok).toBe(false);
    if (replay.ok === false) {
      expect(replay.code).toBe("limit_reached");
    }

    if (allowed.ok) {
      await allowed.release();
    }
  });
});
