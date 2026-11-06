import { toBase64Url } from "@blind-report/core";
import { sha256 } from "@noble/hashes/sha256";

/** SHA-256 em bytes (síncrono, portável entre Node e navegador). */
export function sha256Bytes(bytes: Uint8Array): Uint8Array {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("expected a Uint8Array");
  return sha256(bytes);
}

/** Hash de conteúdo em base64url, usado como `Envelope.contentHash`. */
export function contentHashOf(bytes: Uint8Array): string {
  return toBase64Url(sha256Bytes(bytes));
}
