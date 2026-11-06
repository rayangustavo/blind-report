import { describe, expect, it } from "vitest";
import { contentHashOf, sha256Bytes } from "../src/hash";

describe("hash", () => {
  it("hashes deterministically and distinguishes content", () => {
    const bytes = new TextEncoder().encode("blind-report");
    expect(sha256Bytes(bytes)).toHaveLength(32);
    expect(contentHashOf(bytes)).toBe(contentHashOf(bytes));
    expect(contentHashOf(bytes)).not.toBe(contentHashOf(new TextEncoder().encode("blind-reporT")));
  });

  it("only accepts byte arrays", () => {
    expect(() => sha256Bytes("text" as unknown as Uint8Array)).toThrow(TypeError);
  });
});
