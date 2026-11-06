import { describe, expect, it } from "vitest";
import { toBase64Url } from "../src/base64url";
import { IntegrityError } from "../src/errors";
import { PART_PAYLOAD_BYTES } from "../src/limits";
import { checksumOf, joinParts, splitIntoParts } from "../src/parts";
import type { Part } from "../src/types";

function bytes(length: number, seed = 7): Uint8Array {
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) out[i] = (i * seed + 3) % 256;
  return out;
}

describe("checksumOf", () => {
  it("matches the CRC32 reference vector", () => {
    // CRC32("123456789") = 0xCBF43926
    expect(checksumOf(new TextEncoder().encode("123456789"))).toBe(toBase64Url(new Uint8Array([0xcb, 0xf4, 0x39, 0x26])));
  });

  it("is deterministic and byte-sensitive", () => {
    expect(checksumOf(new Uint8Array([]))).toBe(toBase64Url(new Uint8Array([0, 0, 0, 0])));
    expect(checksumOf(new Uint8Array([1, 2, 3]))).toBe(checksumOf(new Uint8Array([1, 2, 3])));
    expect(checksumOf(new Uint8Array([1, 2, 3]))).not.toBe(checksumOf(new Uint8Array([1, 2, 4])));
  });
});

describe("splitIntoParts", () => {
  it("splits into ordered parts with checksums", () => {
    const payload = bytes(250);
    const parts = splitIntoParts(payload, 100);
    expect(parts.map((part) => part.index)).toEqual([0, 1, 2]);
    expect(parts.map((part) => part.total)).toEqual([3, 3, 3]);
    expect(parts.map((part) => part.payload.length)).toEqual([100, 100, 50]);
    for (const part of parts) expect(part.checksum).toBe(checksumOf(part.payload));
  });

  it("uses PART_PAYLOAD_BYTES by default", () => {
    const parts = splitIntoParts(bytes(PART_PAYLOAD_BYTES + 1));
    expect(parts).toHaveLength(2);
    expect(parts[0]!.payload.length).toBe(PART_PAYLOAD_BYTES);
    expect(parts[1]!.payload.length).toBe(1);
  });

  it("keeps an empty payload as a single empty part", () => {
    const parts = splitIntoParts(new Uint8Array([]), 10);
    expect(parts).toHaveLength(1);
    expect(parts[0]!.payload.length).toBe(0);
    expect(parts[0]!.checksum).toBe(checksumOf(new Uint8Array([])));
  });

  it("copies the data instead of aliasing the source", () => {
    const payload = bytes(10);
    const [part] = splitIntoParts(payload, 10);
    payload[0] = 255;
    expect(part!.payload[0]).not.toBe(255);
  });

  it("rejects invalid arguments", () => {
    expect(() => splitIntoParts("payload" as unknown as Uint8Array)).toThrow(TypeError);
    expect(() => splitIntoParts(bytes(1), 0)).toThrow(TypeError);
    expect(() => splitIntoParts(bytes(1), -10)).toThrow(TypeError);
    expect(() => splitIntoParts(bytes(1), 1.5)).toThrow(TypeError);
    expect(() => splitIntoParts(bytes(1), Number.NaN)).toThrow(TypeError);
  });
});

describe("joinParts", () => {
  it("reorders and rejoins parts", () => {
    const payload = bytes(1_000);
    const parts = splitIntoParts(payload, 128);
    const shuffled = [parts[4]!, parts[0]!, parts[6]!, parts[3]!, parts[1]!, parts[7]!, parts[2]!, parts[5]!];
    expect(joinParts(shuffled)).toEqual(payload);
  });

  it("joins the single empty part", () => {
    expect(joinParts(splitIntoParts(new Uint8Array([])))).toEqual(new Uint8Array([]));
  });

  it("rejects an empty list", () => {
    expect(() => joinParts([])).toThrow(IntegrityError);
    expect(() => joinParts(undefined as unknown as Part[])).toThrow(IntegrityError);
  });

  it("rejects a part count that does not match total", () => {
    const parts = splitIntoParts(bytes(30), 10);
    expect(() => joinParts(parts.slice(0, 2))).toThrowError(/inconsistent part count/);
  });

  it("rejects duplicate and out-of-range indices", () => {
    const parts = splitIntoParts(bytes(30), 10);
    const duplicated = [parts[0]!, parts[0]!, parts[2]!];
    expect(() => joinParts(duplicated)).toThrowError(/duplicate part index/);

    const outOfRange = [parts[0]!, parts[1]!, { ...parts[2]!, index: 5 }];
    expect(() => joinParts(outOfRange)).toThrowError(/out of range/);

    const fractional = [parts[0]!, parts[1]!, { ...parts[2]!, index: 1.5 }];
    expect(() => joinParts(fractional)).toThrowError(/out of range/);
  });

  it("rejects inconsistent totals between parts", () => {
    const parts = splitIntoParts(bytes(30), 10);
    const inconsistent = [parts[0]!, { ...parts[1]!, total: 4 }, parts[2]!];
    expect(() => joinParts(inconsistent)).toThrowError(/reports total/);
  });

  it("rejects corrupted content or checksums", () => {
    const parts = splitIntoParts(bytes(30), 10);
    const corruptedPayload: Part = { ...parts[1]!, payload: new Uint8Array([9, 9, 9]) };
    expect(() => joinParts([parts[0]!, corruptedPayload, parts[2]!])).toThrowError(/checksum mismatch/);

    const corruptedChecksum: Part = { ...parts[1]!, checksum: "AAAAAA" };
    expect(() => joinParts([parts[0]!, corruptedChecksum, parts[2]!])).toThrowError(/checksum mismatch/);

    const notString: Part = { ...parts[1]!, checksum: 42 as unknown as string };
    expect(() => joinParts([parts[0]!, notString, parts[2]!])).toThrowError(/checksum mismatch/);
  });

  it("rejects parts without byte payloads", () => {
    const parts = splitIntoParts(bytes(30), 10);
    const bad = { ...parts[1]!, payload: "oops" as unknown as Uint8Array };
    expect(() => joinParts([parts[0]!, bad, parts[2]!])).toThrowError(/no payload/);
  });
});
