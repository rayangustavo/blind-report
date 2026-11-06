import { fromBase64Url } from "@blind-report/core";
import type { Envelope } from "@blind-report/core";
import { aadFor } from "./aad";
import { concatBytes } from "./bytes";
import { NONCE_BYTES, TAG_BYTES, WRAPPED_KEY_BYTES } from "./constants";
import { CryptoError } from "./errors";
import { contentHashOf } from "./hash";
import { decodeKey, type Keypair } from "./keys";
import { loadSodium, type SodiumLib } from "./sodium";

/** Encontra a chave simétrica embrulhada para o destinatário dono de `privateKey`. */
function unwrapKey(sodium: SodiumLib, entries: unknown[], ephemeralPublicKey: Uint8Array, privateKey: Uint8Array): Uint8Array {
  for (const entry of entries) {
    if (typeof entry !== "string") continue;
    let blob: Uint8Array;
    try {
      blob = fromBase64Url(entry);
    } catch {
      continue;
    }
    if (blob.length !== NONCE_BYTES + WRAPPED_KEY_BYTES) continue;
    try {
      return sodium.crypto_box_open_easy(
        blob.slice(NONCE_BYTES),
        blob.slice(0, NONCE_BYTES),
        ephemeralPublicKey,
        privateKey,
      );
    } catch {
      // Esta entrada pertence a outro destinatário; tenta a próxima.
    }
  }
  throw new CryptoError("envelope is not addressed to this key");
}

/**
 * Abre um envelope com a chave privada do destinatário.
 * Verifica o hash de conteúdo e autentica AAD + ciphertext; qualquer
 * adulteração resulta em `CryptoError`.
 */
export async function open(envelope: Envelope, keypair: Keypair): Promise<Uint8Array> {
  if (typeof envelope !== "object" || envelope === null) throw new CryptoError("envelope is required");
  if (typeof keypair !== "object" || keypair === null) throw new CryptoError("keypair is required");

  const { ciphertext, authTag } = envelope;
  if (!(ciphertext instanceof Uint8Array) || ciphertext.length < NONCE_BYTES) {
    throw new CryptoError("envelope ciphertext is malformed");
  }
  if (!(authTag instanceof Uint8Array) || authTag.length !== TAG_BYTES) {
    throw new CryptoError("envelope auth tag is malformed");
  }
  if (typeof envelope.contentHash !== "string" || contentHashOf(concatBytes(ciphertext, authTag)) !== envelope.contentHash) {
    throw new CryptoError("envelope content hash mismatch");
  }
  if (!Array.isArray(envelope.recipientKeys) || envelope.recipientKeys.length === 0) {
    throw new CryptoError("envelope has no recipient keys");
  }

  const sodium = await loadSodium();
  const privateKey = decodeKey(keypair.privateKey, "privateKey");
  const ephemeralPublicKey = decodeKey(envelope.ephemeralPublicKey, "ephemeralPublicKey");
  const symmetricKey = unwrapKey(sodium, envelope.recipientKeys as unknown[], ephemeralPublicKey, privateKey);

  const nonce = ciphertext.slice(0, NONCE_BYTES);
  const body = ciphertext.slice(NONCE_BYTES);
  try {
    return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      concatBytes(body, authTag),
      aadFor(envelope),
      nonce,
      symmetricKey,
    );
  } catch {
    throw new CryptoError("envelope authentication failed");
  }
}
