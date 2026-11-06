import type { Envelope } from "@blind-report/core";
import { describe, expect, it } from "vitest";
import { concatBytes } from "../src/bytes";
import { MAX_RECIPIENTS } from "../src/constants";
import { CryptoError } from "../src/errors";
import { decodeEnvelope, encodeEnvelope } from "../src/format";

const envelope: Envelope = {
  version: 1,
  newsroom: "redacao.eth",
  category: "corrupcao",
  epoch: "2026-11",
  recipientKeys: ["aGVsbG8", "d29ybGQ"],
  ephemeralPublicKey: "ephemeral",
  ciphertext: new Uint8Array([1, 2, 3, 4]),
  authTag: new Uint8Array(16).fill(9),
  contentHash: "hash",
};

function envelopeHeader(recipientCount: number): Uint8Array {
  const encoder = new TextEncoder();
  const parts = ["redacao.eth", "cat", "2026-11", "epk", "hash"].map((value) => encoder.encode(value));
  const size = 4 + parts.reduce((total, bytes) => total + 4 + bytes.length, 0) + 4;
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  let offset = 0;
  view.setUint32(offset, 1);
  offset += 4;
  for (const bytes of parts) {
    view.setUint32(offset, bytes.length);
    offset += 4;
    out.set(bytes, offset);
    offset += bytes.length;
  }
  view.setUint32(offset, recipientCount);
  return out;
}

describe("envelope format", () => {
  it("round-trips an envelope", () => {
    expect(decodeEnvelope(encodeEnvelope(envelope))).toEqual(envelope);
  });

  it("is deterministic", () => {
    expect(encodeEnvelope(envelope)).toEqual(encodeEnvelope(envelope));
  });

  it("supports empty strings, lists and byte arrays", () => {
    const empty: Envelope = {
      version: 0,
      newsroom: "",
      category: "",
      epoch: "",
      recipientKeys: [],
      ephemeralPublicKey: "",
      ciphertext: new Uint8Array([]),
      authTag: new Uint8Array([]),
      contentHash: "",
    };
    expect(decodeEnvelope(encodeEnvelope(empty))).toEqual(empty);
  });

  it("rejects every truncation", () => {
    const encoded = encodeEnvelope(envelope);
    for (let cut = 0; cut < encoded.length; cut += 1) {
      expect(() => decodeEnvelope(encoded.slice(0, cut))).toThrow(CryptoError);
    }
  });

  it("rejects trailing bytes", () => {
    expect(() => decodeEnvelope(concatBytes(encodeEnvelope(envelope), new Uint8Array([0])))).toThrow(/trailing bytes/);
  });

  it("rejects invalid UTF-8", () => {
    const out = new Uint8Array(9);
    const view = new DataView(out.buffer);
    view.setUint32(0, 1);
    view.setUint32(4, 1);
    out[8] = 0xff;
    expect(() => decodeEnvelope(out)).toThrow(/invalid UTF-8/);
  });

  it("rejects an absurd number of recipients before reading them", () => {
    expect(() => decodeEnvelope(envelopeHeader(MAX_RECIPIENTS + 1))).toThrow(/too many recipients/);
  });

  it("rejects non-byte input", () => {
    expect(() => decodeEnvelope("bytes" as unknown as Uint8Array)).toThrow(CryptoError);
    expect(() => decodeEnvelope(null as unknown as Uint8Array)).toThrow(CryptoError);
  });

  it("validates fields before encoding", () => {
    const invalid: unknown[] = [
      null,
      { ...envelope, version: -1 },
      { ...envelope, version: 1.5 },
      { ...envelope, version: 0x1_0000_0000 },
      { ...envelope, newsroom: 1 },
      { ...envelope, category: null },
      { ...envelope, epoch: 2 },
      { ...envelope, ephemeralPublicKey: 3 },
      { ...envelope, contentHash: 4 },
      { ...envelope, recipientKeys: "keys" },
      { ...envelope, recipientKeys: [1] },
      { ...envelope, recipientKeys: Array.from({ length: MAX_RECIPIENTS + 1 }, () => "k") },
      { ...envelope, ciphertext: "bytes" },
      { ...envelope, authTag: "tag" },
    ];
    for (const value of invalid) {
      expect(() => encodeEnvelope(value as Envelope)).toThrow(CryptoError);
    }
  });
});
