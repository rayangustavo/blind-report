import { describe, expect, it } from "vitest";
import { fromBase64Url, toBase64Url } from "../src/base64url";
import { Base64UrlError } from "../src/errors";

describe("base64url", () => {
  it("matches known vectors", () => {
    expect(toBase64Url(new TextEncoder().encode("hello"))).toBe("aGVsbG8");
    expect(toBase64Url(new Uint8Array([0xff, 0xfe]))).toBe("__4");
    expect(toBase64Url(new Uint8Array([]))).toBe("");
    expect(fromBase64Url("aGVsbG8")).toEqual(new TextEncoder().encode("hello"));
    expect(fromBase64Url("__4")).toEqual(new Uint8Array([0xff, 0xfe]));
    expect(fromBase64Url("")).toEqual(new Uint8Array([]));
  });

  it("round-trips every length up to 300 bytes", () => {
    for (let length = 0; length <= 300; length += 1) {
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i += 1) bytes[i] = (i * 37 + length) % 256;
      expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
    }
  });

  it("handles payloads larger than a single chunk", () => {
    const bytes = new Uint8Array(200_000);
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = i % 251;
    expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
  });

  it("rejects invalid input", () => {
    expect(() => toBase64Url("abc" as unknown as Uint8Array)).toThrow(Base64UrlError);
    expect(() => fromBase64Url("abc+def")).toThrow(Base64UrlError);
    expect(() => fromBase64Url("abc/def")).toThrow(Base64UrlError);
    expect(() => fromBase64Url("abc def")).toThrow(Base64UrlError);
    expect(() => fromBase64Url("a")).toThrow(Base64UrlError);
    expect(() => fromBase64Url(42 as unknown as string)).toThrow(Base64UrlError);
  });
});
