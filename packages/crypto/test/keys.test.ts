import { fromBase64Url, toBase64Url } from "@blind-report/core";
import { describe, expect, it } from "vitest";
import { CryptoError } from "../src/errors";
import { decodeKey, newKeypair } from "../src/keys";

describe("newKeypair", () => {
  it("creates fresh 32-byte X25519 keys in base64url", async () => {
    const first = await newKeypair();
    const second = await newKeypair();

    expect(fromBase64Url(first.publicKey)).toHaveLength(32);
    expect(fromBase64Url(first.privateKey)).toHaveLength(32);
    expect(first.publicKey).not.toBe(first.privateKey);
    expect(first.publicKey).not.toBe(second.publicKey);
    expect(first.privateKey).not.toBe(second.privateKey);
  });
});

describe("decodeKey", () => {
  it("decodes a valid 32-byte key", () => {
    const bytes = new Uint8Array(32).fill(7);
    expect(decodeKey(toBase64Url(bytes))).toEqual(bytes);
    expect(decodeKey(toBase64Url(bytes), "recipientPublicKey")).toEqual(bytes);
  });

  it("rejects non-string, malformed and wrong-size keys", () => {
    expect(() => decodeKey(42)).toThrow(CryptoError);
    expect(() => decodeKey("***", "recipientPublicKey")).toThrow(/recipientPublicKey must be valid base64url/);
    expect(() => decodeKey(toBase64Url(new Uint8Array(31)), "privateKey")).toThrow(/privateKey must be 32 bytes/);
    expect(() => decodeKey("")).toThrow(/32 bytes/);
  });
});
