import { fromBase64Url, toBase64Url } from "@blind-report/core";
import { NONCE_BYTES, TAG_BYTES } from "./constants";
import { CryptoError } from "./errors";
import { loadSodium } from "./sodium";

const DEFAULT_ITERATIONS = 310_000;
const MIN_ITERATIONS = 1_000;
const SALT_BYTES = 16;
const encoder = new TextEncoder();

export type ProtectedKeyring = {
  version: 1;
  kdf: "pbkdf2-sha256";
  iterations: number;
  salt: string;
  nonce: string;
  ciphertext: string;
};

export type ProtectOptions = {
  iterations?: number;
};

function assertIterations(iterations: number): void {
  if (!Number.isSafeInteger(iterations) || iterations < MIN_ITERATIONS) {
    throw new CryptoError(`iterations must be an integer >= ${MIN_ITERATIONS}`);
  }
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  // Cópias sobre ArrayBuffer garantem compatibilidade com WebCrypto (BufferSource).
  const passwordBytes = new Uint8Array(encoder.encode(password));
  const saltBytes = new Uint8Array(salt);
  const baseKey = await crypto.subtle.importKey("raw", passwordBytes, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    baseKey,
    256,
  );
  return new Uint8Array(bits);
}

function decodeField(value: unknown, field: string): Uint8Array {
  if (typeof value !== "string") throw new CryptoError(`protected.${field} must be a base64url string`);
  try {
    return fromBase64Url(value);
  } catch {
    throw new CryptoError(`protected.${field} must be valid base64url`);
  }
}

/**
 * Protege o chaveiro com senha: PBKDF2-SHA256 (WebCrypto) deriva a chave e o
 * crypto_secretbox (XSalsa20-Poly1305) cifra os bytes. Retorna JSON serializável.
 */
export async function protectKeyring(
  plaintext: string | Uint8Array,
  password: string,
  options: ProtectOptions = {},
): Promise<string> {
  if (typeof plaintext !== "string" && !(plaintext instanceof Uint8Array)) {
    throw new CryptoError("keyring must be a string or a Uint8Array");
  }
  if (typeof password !== "string" || password.length === 0) throw new CryptoError("password must be a non-empty string");
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  assertIterations(iterations);

  const sodium = await loadSodium();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const nonce = sodium.randombytes_buf(NONCE_BYTES);
  const key = await deriveKey(password, salt, iterations);
  const data = typeof plaintext === "string" ? encoder.encode(plaintext) : plaintext;
  const sealed: ProtectedKeyring = {
    version: 1,
    kdf: "pbkdf2-sha256",
    iterations,
    salt: toBase64Url(salt),
    nonce: toBase64Url(nonce),
    ciphertext: toBase64Url(sodium.crypto_secretbox_easy(data, nonce, key)),
  };
  return JSON.stringify(sealed);
}

function parseProtected(input: string | ProtectedKeyring): { protectedKeyring: ProtectedKeyring; salt: Uint8Array; nonce: Uint8Array; ciphertext: Uint8Array } {
  let raw: unknown = input;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch {
      throw new CryptoError("protected keyring must be valid JSON");
    }
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new CryptoError("protected keyring must be an object");
  }
  const record = raw as Record<string, unknown>;
  if (record.version !== 1) throw new CryptoError("unsupported protected keyring version");
  if (record.kdf !== "pbkdf2-sha256") throw new CryptoError("unsupported key derivation function");
  const iterations = record.iterations;
  if (typeof iterations !== "number") throw new CryptoError("protected.iterations must be a number");
  assertIterations(iterations);
  const salt = decodeField(record.salt, "salt");
  if (salt.length !== SALT_BYTES) throw new CryptoError(`protected.salt must be ${SALT_BYTES} bytes`);
  const nonce = decodeField(record.nonce, "nonce");
  if (nonce.length !== NONCE_BYTES) throw new CryptoError(`protected.nonce must be ${NONCE_BYTES} bytes`);
  const ciphertext = decodeField(record.ciphertext, "ciphertext");
  if (ciphertext.length < TAG_BYTES) throw new CryptoError("protected.ciphertext is too short");
  return { protectedKeyring: raw as ProtectedKeyring, salt, nonce, ciphertext };
}

/** Recupera os bytes do chaveiro a partir do JSON protegido e da senha. */
export async function unlockKeyring(input: string | ProtectedKeyring, password: string): Promise<Uint8Array> {
  if (typeof password !== "string" || password.length === 0) throw new CryptoError("password must be a non-empty string");
  const { protectedKeyring, salt, nonce, ciphertext } = parseProtected(input);
  const sodium = await loadSodium();
  const key = await deriveKey(password, salt, protectedKeyring.iterations);
  try {
    return sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
  } catch {
    throw new CryptoError("keyring could not be unlocked: wrong password or corrupted data");
  }
}
