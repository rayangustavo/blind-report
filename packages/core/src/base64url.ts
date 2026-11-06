import { Base64UrlError } from "./errors";

const BASE64URL_RE = /^[A-Za-z0-9_-]*$/;
const CHUNK = 0x8000;

/** Codifica bytes em base64url sem padding (RFC 4648 §5). */
export function toBase64Url(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new Base64UrlError("expected a Uint8Array");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decodifica uma string base64url sem padding em bytes. */
export function fromBase64Url(text: string): Uint8Array {
  if (typeof text !== "string" || !BASE64URL_RE.test(text) || text.length % 4 === 1) {
    throw new Base64UrlError("invalid base64url string");
  }
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Base64UrlError("invalid base64url string");
  }
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}
