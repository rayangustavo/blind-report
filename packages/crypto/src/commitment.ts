import { toBase64Url } from "@blind-report/core";
import { CryptoError } from "./errors";
import { sha256Bytes } from "./hash";

const COMMITMENT_DOMAIN = "blind-report:commitment:v1";
const encoder = new TextEncoder();

function commitmentBytes(plaintext: string, salt: string): Uint8Array {
  // JSON garante separação não ambígua entre domínio, texto e sal.
  return encoder.encode(JSON.stringify([COMMITMENT_DOMAIN, plaintext, salt]));
}

/**
 * Compromisso com sal sobre o conteúdo original. Permite comprovar autoria
 * depois sem guardar o texto em claro.
 */
export function commitmentOf(plaintext: string, salt: string): string {
  if (typeof plaintext !== "string") throw new CryptoError("plaintext must be a string");
  if (typeof salt !== "string" || salt.length === 0) throw new CryptoError("salt must be a non-empty string");
  return toBase64Url(sha256Bytes(commitmentBytes(plaintext, salt)));
}

function equalConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

/** Confere se `expectedHash` corresponde ao compromisso do conteúdo e do sal. */
export function verifyCommitment(plaintext: string, salt: string, expectedHash: string): boolean {
  if (typeof expectedHash !== "string") throw new CryptoError("expectedHash must be a string");
  return equalConstantTime(commitmentOf(plaintext, salt), expectedHash);
}
