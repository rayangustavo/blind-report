import { describe, expect, it } from "vitest";
import { commitmentOf, verifyCommitment } from "../src/commitment";
import { CryptoError } from "../src/errors";

const plaintext = "Há propina no contrato 42.";
const salt = "sal-aleatorio-123";

describe("commitmentOf", () => {
  it("is deterministic and depends on text and salt", () => {
    const commitment = commitmentOf(plaintext, salt);
    expect(commitment).toHaveLength(43);
    expect(commitmentOf(plaintext, salt)).toBe(commitment);
    expect(commitmentOf(`${plaintext}!`, salt)).not.toBe(commitment);
    expect(commitmentOf(plaintext, `${salt}!`)).not.toBe(commitment);
    expect(commitmentOf("", salt)).not.toBe(commitment);
  });

  it("keeps domain separation between text and salt", () => {
    expect(commitmentOf("ab", "c")).not.toBe(commitmentOf("a", "bc"));
  });

  it("validates its inputs", () => {
    expect(() => commitmentOf(3 as unknown as string, salt)).toThrow(CryptoError);
    expect(() => commitmentOf(plaintext, "")).toThrow(/salt/);
    expect(() => commitmentOf(plaintext, 3 as unknown as string)).toThrow(/salt/);
  });
});

describe("verifyCommitment", () => {
  it("accepts the matching commitment", () => {
    expect(verifyCommitment(plaintext, salt, commitmentOf(plaintext, salt))).toBe(true);
  });

  it("rejects mismatched or malformed commitments", () => {
    expect(verifyCommitment(plaintext, salt, commitmentOf(`${plaintext}!`, salt))).toBe(false);
    expect(verifyCommitment(plaintext, salt, "short")).toBe(false);
    expect(verifyCommitment(plaintext, `${salt}!`, commitmentOf(plaintext, salt))).toBe(false);
  });

  it("validates argument types", () => {
    expect(() => verifyCommitment(plaintext, salt, 42 as unknown as string)).toThrow(CryptoError);
    expect(() => verifyCommitment(plaintext, "", commitmentOf(plaintext, salt))).toThrow(CryptoError);
  });
});
