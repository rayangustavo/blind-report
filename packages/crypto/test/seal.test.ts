import { encodePayload, fromBase64Url, toBase64Url, type Envelope } from "@blind-report/core";
import { describe, expect, it } from "vitest";
import { concatBytes } from "../src/bytes";
import { MAX_RECIPIENTS, NONCE_BYTES, TAG_BYTES, WRAPPED_KEY_BYTES } from "../src/constants";
import { CryptoError } from "../src/errors";
import { contentHashOf } from "../src/hash";
import { newKeypair, type Keypair } from "../src/keys";
import { open } from "../src/open";
import { seal, type SealOptions } from "../src/seal";

async function fixture(recipients = 2) {
  const keys = await Promise.all(Array.from({ length: recipients }, () => newKeypair()));
  const options: SealOptions = {
    plaintext: encodePayload({ text: "Há propina no contrato.", category: "corrupcao" }),
    recipientPublicKeys: keys.map((key) => key.publicKey),
    newsroom: "redacao.eth",
    category: "corrupcao",
    epoch: "2026-11",
    version: 1,
  };
  return { keys, options, envelope: await seal(options) };
}

describe("seal", () => {
  it("builds an authenticated envelope for every recipient", async () => {
    const { keys, options, envelope } = await fixture(3);

    expect(envelope).toMatchObject({
      version: 1,
      newsroom: "redacao.eth",
      category: "corrupcao",
      epoch: "2026-11",
    });
    expect(envelope.recipientKeys).toHaveLength(3);
    for (const key of envelope.recipientKeys) {
      expect(fromBase64Url(key)).toHaveLength(NONCE_BYTES + WRAPPED_KEY_BYTES);
    }
    expect(envelope.ciphertext).toHaveLength(NONCE_BYTES + options.plaintext.length);
    expect(envelope.authTag).toHaveLength(TAG_BYTES);
    expect(envelope.contentHash).toBe(contentHashOf(concatBytes(envelope.ciphertext, envelope.authTag)));
    expect(fromBase64Url(envelope.ephemeralPublicKey)).toHaveLength(32);

    for (const keypair of keys) {
      expect(await open(envelope, keypair)).toEqual(options.plaintext);
    }
  });

  it("supports empty plaintext", async () => {
    const keypair = await newKeypair();
    const envelope = await seal({
      plaintext: new Uint8Array([]),
      recipientPublicKeys: [keypair.publicKey],
      newsroom: "redacao.eth",
      category: "outros",
      epoch: "2026-11",
      version: 1,
    });
    expect(envelope.ciphertext).toHaveLength(NONCE_BYTES);
    expect(await open(envelope, keypair)).toEqual(new Uint8Array([]));
  });

  it("is randomised on every call", async () => {
    const { options, envelope } = await fixture(1);
    const again = await seal(options);
    expect(again.ephemeralPublicKey).not.toBe(envelope.ephemeralPublicKey);
    expect(again.ciphertext).not.toEqual(envelope.ciphertext);
    expect(again.recipientKeys).not.toEqual(envelope.recipientKeys);
  });

  it("rejects invalid options", async () => {
    const { options } = await fixture(1);
    const cases: SealOptions[] = [
      null as unknown as SealOptions,
      { ...options, plaintext: "text" as unknown as Uint8Array },
      { ...options, recipientPublicKeys: [] },
      { ...options, recipientPublicKeys: "key" as unknown as string[] },
      { ...options, recipientPublicKeys: Array.from({ length: MAX_RECIPIENTS + 1 }, () => "x") },
      { ...options, recipientPublicKeys: ["***"] },
      { ...options, newsroom: "" },
      { ...options, category: 1 as unknown as string },
      { ...options, epoch: "" },
      { ...options, version: 0 },
      { ...options, version: 1.5 },
    ];
    for (const value of cases) {
      await expect(seal(value)).rejects.toBeInstanceOf(CryptoError);
    }
  });
});

describe("open", () => {
  it("rejects keys that are not recipients", async () => {
    const { envelope } = await fixture(2);
    const stranger = await newKeypair();
    await expect(open(envelope, stranger)).rejects.toThrow(/not addressed/);
  });

  it("skips malformed wrapped keys and finds the right one", async () => {
    const { keys, options, envelope } = await fixture(1);
    const [valid] = envelope.recipientKeys;
    const noisy = {
      ...envelope,
      recipientKeys: ["***", "AAAA", 42 as unknown as string, toBase64Url(new Uint8Array(NONCE_BYTES + WRAPPED_KEY_BYTES)), valid!],
    };
    expect(await open(noisy, keys[0]!)).toEqual(options.plaintext);
  });

  it("rejects envelopes addressed to other wrapped keys only", async () => {
    const { keys, envelope } = await fixture(1);
    const others = await Promise.all([newKeypair(), newKeypair()]);
    const rebuilt = await seal({
      plaintext: new Uint8Array([1, 2, 3]),
      recipientPublicKeys: others.map((key) => key.publicKey),
      newsroom: envelope.newsroom,
      category: envelope.category,
      epoch: envelope.epoch,
      version: envelope.version,
    });
    await expect(open(rebuilt, keys[0]!)).rejects.toThrow(/not addressed/);
  });

  it("authenticates the AAD fields", async () => {
    const { keys, envelope } = await fixture(1);
    const patches: Partial<Envelope>[] = [
      { version: 2 },
      { newsroom: "outra-redacao.eth" },
      { category: "saude" },
      { epoch: "2026-12" },
    ];
    for (const patch of patches) {
      await expect(open({ ...envelope, ...patch }, keys[0]!)).rejects.toThrow(/authentication failed/);
    }
  });

  it("detects content-hash tampering", async () => {
    const { keys, envelope } = await fixture(1);
    const flipped = envelope.ciphertext.slice();
    flipped[flipped.length - 1]! ^= 0x01;
    await expect(open({ ...envelope, ciphertext: flipped }, keys[0]!)).rejects.toThrow(/content hash mismatch/);

    const tag = envelope.authTag.slice();
    tag[0]! ^= 0x01;
    await expect(open({ ...envelope, authTag: tag }, keys[0]!)).rejects.toThrow(/content hash mismatch/);

    await expect(open({ ...envelope, contentHash: "AAAA" }, keys[0]!)).rejects.toThrow(/content hash mismatch/);
  });

  it("detects a tampered ciphertext even when the hash is recomputed", async () => {
    const { keys, envelope } = await fixture(1);
    const flipped = envelope.ciphertext.slice();
    flipped[flipped.length - 1]! ^= 0x01;
    const attackerEnvelope = { ...envelope, ciphertext: flipped };
    attackerEnvelope.contentHash = contentHashOf(concatBytes(flipped, envelope.authTag));
    await expect(open(attackerEnvelope, keys[0]!)).rejects.toThrow(/authentication failed/);
  });

  it("rejects a tampered ephemeral key", async () => {
    const { keys, envelope } = await fixture(1);
    const other = await newKeypair();
    await expect(open({ ...envelope, ephemeralPublicKey: other.publicKey }, keys[0]!)).rejects.toThrow(/not addressed/);
    await expect(open({ ...envelope, ephemeralPublicKey: "***" }, keys[0]!)).rejects.toThrow(/ephemeralPublicKey/);
  });

  it("rejects malformed envelopes and keypairs", async () => {
    const { envelope } = await fixture(1);
    const badEnvelopes: unknown[] = [
      null,
      { ...envelope, ciphertext: "bytes" },
      { ...envelope, ciphertext: new Uint8Array(NONCE_BYTES - 1) },
      { ...envelope, authTag: new Uint8Array(TAG_BYTES - 1) },
      { ...envelope, authTag: "tag" },
      { ...envelope, contentHash: 42 },
      { ...envelope, recipientKeys: [] },
      { ...envelope, recipientKeys: "keys" },
    ];
    for (const value of badEnvelopes) {
      await expect(open(value as Envelope, await newKeypair())).rejects.toBeInstanceOf(CryptoError);
    }
    await expect(open(envelope, null as unknown as Keypair)).rejects.toBeInstanceOf(CryptoError);
    await expect(open(envelope, { publicKey: "", privateKey: "***" })).rejects.toThrow(/privateKey/);
  });
});
