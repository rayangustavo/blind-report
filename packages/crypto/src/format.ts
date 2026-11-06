import type { Envelope } from "@blind-report/core";
import { MAX_RECIPIENTS } from "./constants";
import { CryptoError } from "./errors";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const UINT32_MAX = 0xffffffff;

function fail(message: string): never {
  throw new CryptoError(message);
}

function assertEnvelope(envelope: Envelope): void {
  if (typeof envelope !== "object" || envelope === null) fail("envelope is required");
  if (!Number.isSafeInteger(envelope.version) || envelope.version < 0 || envelope.version > UINT32_MAX) {
    fail("envelope.version must be a uint32");
  }
  for (const field of ["newsroom", "category", "epoch", "ephemeralPublicKey", "contentHash"] as const) {
    if (typeof envelope[field] !== "string") fail(`envelope.${field} must be a string`);
  }
  if (!Array.isArray(envelope.recipientKeys)) fail("envelope.recipientKeys must be an array");
  if (envelope.recipientKeys.length > MAX_RECIPIENTS) {
    fail(`envelope.recipientKeys may have at most ${MAX_RECIPIENTS} entries`);
  }
  if (!envelope.recipientKeys.every((key) => typeof key === "string")) {
    fail("envelope.recipientKeys must contain strings");
  }
  if (!(envelope.ciphertext instanceof Uint8Array)) fail("envelope.ciphertext must be a Uint8Array");
  if (!(envelope.authTag instanceof Uint8Array)) fail("envelope.authTag must be a Uint8Array");
}

/**
 * Serialização binária compacta e determinística do envelope:
 * uint32 de versão, strings e arrays prefixados por tamanho, ciphertext e tag.
 */
export function encodeEnvelope(envelope: Envelope): Uint8Array {
  assertEnvelope(envelope);
  const strings = [
    envelope.newsroom,
    envelope.category,
    envelope.epoch,
    envelope.ephemeralPublicKey,
    envelope.contentHash,
  ].map((value) => encoder.encode(value));
  const keys = envelope.recipientKeys.map((key) => encoder.encode(key));

  let size = 4;
  for (const bytes of strings) size += 4 + bytes.length;
  size += 4;
  for (const bytes of keys) size += 4 + bytes.length;
  size += 4 + envelope.ciphertext.length;
  size += 4 + envelope.authTag.length;

  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  let offset = 0;
  const putUint32 = (value: number): void => {
    view.setUint32(offset, value);
    offset += 4;
  };
  const putBytes = (bytes: Uint8Array): void => {
    out.set(bytes, offset);
    offset += bytes.length;
  };
  const putString = (bytes: Uint8Array): void => {
    putUint32(bytes.length);
    putBytes(bytes);
  };

  putUint32(envelope.version);
  for (const bytes of strings) putString(bytes);
  putUint32(keys.length);
  for (const bytes of keys) putString(bytes);
  putUint32(envelope.ciphertext.length);
  putBytes(envelope.ciphertext);
  putUint32(envelope.authTag.length);
  putBytes(envelope.authTag);
  return out;
}

/** Lê a serialização binária produzida por `encodeEnvelope`. */
export function decodeEnvelope(bytes: Uint8Array): Envelope {
  if (!(bytes instanceof Uint8Array)) fail("envelope bytes must be a Uint8Array");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  const readUint32 = (): number => {
    if (offset + 4 > bytes.length) fail("envelope is truncated");
    const value = view.getUint32(offset);
    offset += 4;
    return value;
  };
  const readBytes = (length: number): Uint8Array => {
    if (offset + length > bytes.length) fail("envelope is truncated");
    const out = bytes.slice(offset, offset + length);
    offset += length;
    return out;
  };
  const readString = (): string => {
    const raw = readBytes(readUint32());
    try {
      return decoder.decode(raw);
    } catch {
      return fail("envelope contains invalid UTF-8");
    }
  };

  const version = readUint32();
  const newsroom = readString();
  const category = readString();
  const epoch = readString();
  const ephemeralPublicKey = readString();
  const contentHash = readString();
  const recipientCount = readUint32();
  if (recipientCount > MAX_RECIPIENTS) fail("envelope has too many recipients");
  const recipientKeys: string[] = [];
  for (let index = 0; index < recipientCount; index += 1) recipientKeys.push(readString());
  const ciphertext = readBytes(readUint32());
  const authTag = readBytes(readUint32());
  if (offset !== bytes.length) fail("envelope has trailing bytes");

  return { version, newsroom, category, epoch, recipientKeys, ephemeralPublicKey, ciphertext, authTag, contentHash };
}
