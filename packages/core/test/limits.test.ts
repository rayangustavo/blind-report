import { describe, expect, it } from "vitest";
import { ARKIV_MAX_BYTES, ARKIV_PRACTICAL_ENTITY_BYTES, ENS_KEYS, PART_PAYLOAD_BYTES } from "../src/limits";

describe("limits", () => {
  it("keeps the protocol constants stable", () => {
    expect(ARKIV_MAX_BYTES).toBe(131_072);
    expect(ARKIV_PRACTICAL_ENTITY_BYTES).toBe(120_000);
    expect(PART_PAYLOAD_BYTES).toBe(100_000);
  });

  it("exposes the ENS record keys", () => {
    expect(ENS_KEYS).toEqual({
      KEY: "denuncia.key",
      VERSION: "denuncia.version",
      POLICY: "denuncia.policy",
      READER_KEY: "denuncia.readerkey",
    });
  });
});
