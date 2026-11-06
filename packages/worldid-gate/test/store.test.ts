import { describe, expect, it } from "vitest";

import { createMemoryNullifierStore } from "../src/store";

describe("worldid-gate nullifier store", () => {
  it("consumes a nullifier once per action", async () => {
    const store = createMemoryNullifierStore();

    await expect(store.consume("submit:folha.eth:2026-11", "nullifier-1")).resolves.toBe(true);
    await expect(store.consume("submit:folha.eth:2026-11", "nullifier-1")).resolves.toBe(false);
  });
});
