import { namehash } from "viem";
import { describe, expect, it } from "vitest";
import { encodeDnsName, nodeForName } from "../src/dns";

const utf8 = (value: string) => Array.from(new TextEncoder().encode(value));

describe("encodeDnsName", () => {
  it("encodes labels in DNS wire format", () => {
    expect(Array.from(encodeDnsName("eth"))).toEqual([3, ...utf8("eth"), 0]);
    expect(Array.from(encodeDnsName("redacao.eth"))).toEqual([7, ...utf8("redacao"), 3, ...utf8("eth"), 0]);
    expect(Array.from(encodeDnsName("eth."))).toEqual([3, ...utf8("eth"), 0]);
  });

  it("uses UTF-8 byte lengths", () => {
    expect(Array.from(encodeDnsName("é.eth"))).toEqual([2, 0xc3, 0xa9, 3, ...utf8("eth"), 0]);
  });

  it("rejects invalid names", () => {
    const invalid = [
      "",
      ".",
      ".eth",
      "redacao..eth",
      `${"a".repeat(64)}.eth`,
      `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.eth`,
    ];
    for (const name of invalid) expect(() => encodeDnsName(name)).toThrow(TypeError);
    expect(() => encodeDnsName(42 as unknown as string)).toThrow(TypeError);
  });
});

describe("nodeForName", () => {
  it("matches the ENS namehash", () => {
    expect(nodeForName("eth")).toBe(namehash("eth"));
    expect(nodeForName("marina.redacao.eth")).toBe(namehash("marina.redacao.eth"));
    expect(nodeForName("eth")).toHaveLength(66);
  });

  it("rejects empty or non-string names", () => {
    expect(() => nodeForName("")).toThrow(TypeError);
    expect(() => nodeForName(1 as unknown as string)).toThrow(TypeError);
  });
});
