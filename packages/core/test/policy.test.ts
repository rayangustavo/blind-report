import { describe, expect, it } from "vitest";
import { PolicyError } from "../src/errors";
import { parsePolicy, serializePolicy } from "../src/policy";

const validPolicy = {
  version: 1,
  categories: ["corrupcao", "saude"],
  maxSizeBytes: 131_072,
  acceptsAttachments: true,
};

describe("parsePolicy", () => {
  it("parses a JSON string into a typed policy", () => {
    expect(parsePolicy(JSON.stringify(validPolicy))).toEqual(validPolicy);
  });

  it("accepts an already parsed object and retentionDays", () => {
    expect(parsePolicy({ ...validPolicy, retentionDays: 90 })).toEqual({ ...validPolicy, retentionDays: 90 });
  });

  it("trims category names", () => {
    const policy = parsePolicy({ ...validPolicy, categories: ["  corrupcao  "] });
    expect(policy.categories).toEqual(["corrupcao"]);
  });

  it("rejects policies that are not JSON objects", () => {
    expect(() => parsePolicy("{not json")).toThrow(PolicyError);
    expect(() => parsePolicy("null")).toThrowError(/JSON object/);
    expect(() => parsePolicy("[]")).toThrowError(/JSON object/);
    expect(() => parsePolicy(42)).toThrowError(/JSON object/);
  });

  it("rejects an invalid version", () => {
    for (const version of [0, -1, 1.5, "1", undefined]) {
      expect(() => parsePolicy({ ...validPolicy, version })).toThrowError(/policy.version/);
    }
  });

  it("rejects invalid categories", () => {
    expect(() => parsePolicy({ ...validPolicy, categories: undefined })).toThrowError(/non-empty array/);
    expect(() => parsePolicy({ ...validPolicy, categories: [] })).toThrowError(/non-empty array/);
    expect(() => parsePolicy({ ...validPolicy, categories: "corrupcao" })).toThrowError(/non-empty array/);
    expect(() => parsePolicy({ ...validPolicy, categories: [1] })).toThrowError(/must be a string/);
    expect(() => parsePolicy({ ...validPolicy, categories: ["   "] })).toThrowError(/characters/);
    expect(() => parsePolicy({ ...validPolicy, categories: ["x".repeat(65)] })).toThrowError(/characters/);
    expect(() => parsePolicy({ ...validPolicy, categories: ["Corrupcao", "corrupcao"] })).toThrowError(/duplicate/);
    expect(() => parsePolicy({ ...validPolicy, categories: Array.from({ length: 101 }, (_, i) => `c${i}`) })).toThrowError(/at most 100/);
  });

  it("rejects an invalid maxSizeBytes", () => {
    for (const maxSizeBytes of [0, -5, 10.5, "1000", undefined]) {
      expect(() => parsePolicy({ ...validPolicy, maxSizeBytes })).toThrowError(/maxSizeBytes/);
    }
  });

  it("rejects a non-boolean acceptsAttachments", () => {
    expect(() => parsePolicy({ ...validPolicy, acceptsAttachments: "yes" })).toThrowError(/acceptsAttachments/);
    expect(() => parsePolicy({ ...validPolicy, acceptsAttachments: undefined })).toThrowError(/acceptsAttachments/);
  });

  it("rejects an invalid retentionDays", () => {
    expect(() => parsePolicy({ ...validPolicy, retentionDays: 0 })).toThrowError(/retentionDays/);
    expect(() => parsePolicy({ ...validPolicy, retentionDays: 1.5 })).toThrowError(/retentionDays/);
  });
});

describe("serializePolicy", () => {
  it("serializes deterministically", () => {
    const withRetention = { ...validPolicy, retentionDays: 30 };
    expect(serializePolicy(withRetention)).toBe(
      '{"version":1,"categories":["corrupcao","saude"],"maxSizeBytes":131072,"acceptsAttachments":true,"retentionDays":30}',
    );
    expect(serializePolicy({ ...validPolicy, extra: true } as never)).toBe(
      '{"version":1,"categories":["corrupcao","saude"],"maxSizeBytes":131072,"acceptsAttachments":true}',
    );
  });

  it("round-trips through parsePolicy", () => {
    expect(parsePolicy(serializePolicy(validPolicy))).toEqual(validPolicy);
  });

  it("validates before serializing", () => {
    expect(() => serializePolicy({ ...validPolicy, version: 0 })).toThrow(PolicyError);
  });
});
