import { serializePolicy, toBase64Url, type NewsroomPolicy } from "@blind-report/core";
import { describe, expect, it } from "vitest";
import { EnsResolutionError } from "../src/errors";
import { parseNewsroomRecords, parsePublicKeyRecord, parseVersionRecord } from "../src/records";

const publicKey = toBase64Url(new Uint8Array(32).fill(7));
const policy: NewsroomPolicy = {
  version: 1,
  categories: ["corrupcao", "saude"],
  maxSizeBytes: 131_072,
  acceptsAttachments: true,
};
const custodianAddress = "0x1111111111111111111111111111111111111111";
const records = {
  key: publicKey,
  version: "2",
  policy: serializePolicy(policy),
  custodianAddress,
};

describe("parsePublicKeyRecord", () => {
  it("accepts a 32-byte base64url key", () => {
    expect(parsePublicKeyRecord(publicKey, "denuncia.key")).toBe(publicKey);
  });

  it("rejects missing or malformed keys", () => {
    expect(() => parsePublicKeyRecord(undefined, "denuncia.key")).toThrow(/missing/);
    expect(() => parsePublicKeyRecord("", "denuncia.key")).toThrow(/missing/);
    expect(() => parsePublicKeyRecord("***", "denuncia.key")).toThrow(/base64url/);
    expect(() => parsePublicKeyRecord(toBase64Url(new Uint8Array(31)), "denuncia.key")).toThrow(/32 bytes/);
  });
});

describe("parseVersionRecord", () => {
  it("parses positive integers", () => {
    expect(parseVersionRecord("1")).toBe(1);
    expect(parseVersionRecord("2026")).toBe(2026);
  });

  it("rejects non-positive and malformed versions", () => {
    for (const value of ["", "0", "-1", "1.5", "abc", "1 "]) {
      expect(() => parseVersionRecord(value)).toThrow(EnsResolutionError);
    }
    expect(() => parseVersionRecord(undefined)).toThrow(EnsResolutionError);
    expect(() => parseVersionRecord(`${Number.MAX_SAFE_INTEGER}9`)).toThrow(/out of range/);
  });
});

describe("parseNewsroomRecords", () => {
  it("builds a validated NewsroomInfo", () => {
    expect(parseNewsroomRecords("redacao.eth", records)).toEqual({
      name: "redacao.eth",
      publicKey,
      version: 2,
      policy,
      custodianAddress,
    });
  });

  it("rejects invalid names and policies", () => {
    expect(() => parseNewsroomRecords("redacao.com", records)).toThrow(/invalid newsroom name/);
    expect(() => parseNewsroomRecords("REDACAO.eth", records)).toThrow(/invalid newsroom name/);
    expect(() => parseNewsroomRecords("redacao.eth", { ...records, policy: undefined })).toThrow(/denuncia.policy/);
    expect(() => parseNewsroomRecords("redacao.eth", { ...records, policy: "{bad" })).toThrow(/denuncia.policy/);
  });

  it("rejects missing key and version records", () => {
    expect(() => parseNewsroomRecords("redacao.eth", { ...records, key: undefined })).toThrow(/denuncia.key/);
    expect(() => parseNewsroomRecords("redacao.eth", { ...records, version: undefined })).toThrow(/denuncia.version/);
  });

  it("rejects an invalid custodian", () => {
    for (const custodian of [undefined, "", "not-an-address", "0x0000000000000000000000000000000000000000"]) {
      expect(() => parseNewsroomRecords("redacao.eth", { ...records, custodianAddress: custodian })).toThrow(
        /custodian/,
      );
    }
  });
});
