import { fromBase64Url, toBase64Url } from "@blind-report/core";
import { KEY_BYTES } from "./constants";
import { CryptoError } from "./errors";
import { loadSodium } from "./sodium";

/** Par de chaves X25519 serializado em base64url. */
export type Keypair = {
  publicKey: string;
  privateKey: string;
};

/** Gera um par de chaves X25519 para cifragem de envelopes e respostas. */
export async function newKeypair(): Promise<Keypair> {
  const sodium = await loadSodium();
  const keypair = sodium.crypto_box_keypair();
  return {
    publicKey: toBase64Url(keypair.publicKey),
    privateKey: toBase64Url(keypair.privateKey),
  };
}

/** Decodifica e valida uma chave de 32 bytes em base64url. */
export function decodeKey(value: unknown, field = "key"): Uint8Array {
  if (typeof value !== "string") throw new CryptoError(`${field} must be a base64url string`);
  let bytes: Uint8Array;
  try {
    bytes = fromBase64Url(value);
  } catch {
    throw new CryptoError(`${field} must be valid base64url`);
  }
  if (bytes.length !== KEY_BYTES) throw new CryptoError(`${field} must be ${KEY_BYTES} bytes`);
  return bytes;
}
