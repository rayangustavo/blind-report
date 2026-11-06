import { toBase64Url } from "@blind-report/core";
import type { Envelope } from "@blind-report/core";
import { aadFor } from "./aad";
import { concatBytes } from "./bytes";
import { KEY_BYTES, MAX_RECIPIENTS, NONCE_BYTES, TAG_BYTES } from "./constants";
import { CryptoError } from "./errors";
import { contentHashOf } from "./hash";
import { decodeKey } from "./keys";
import { loadSodium } from "./sodium";

export type SealOptions = {
  plaintext: Uint8Array;
  recipientPublicKeys: string[];
  newsroom: string;
  category: string;
  epoch: string;
  version: number;
};

function assertSealOptions(options: SealOptions): void {
  if (typeof options !== "object" || options === null) throw new CryptoError("seal options are required");
  if (!(options.plaintext instanceof Uint8Array)) throw new CryptoError("plaintext must be a Uint8Array");
  if (!Array.isArray(options.recipientPublicKeys) || options.recipientPublicKeys.length === 0) {
    throw new CryptoError("at least one recipient public key is required");
  }
  if (options.recipientPublicKeys.length > MAX_RECIPIENTS) {
    throw new CryptoError(`at most ${MAX_RECIPIENTS} recipients are supported`);
  }
  for (const field of ["newsroom", "category", "epoch"] as const) {
    const value = options[field];
    if (typeof value !== "string" || value.length === 0) throw new CryptoError(`${field} must be a non-empty string`);
  }
  if (!Number.isSafeInteger(options.version) || options.version <= 0) {
    throw new CryptoError("version must be a positive integer");
  }
}

/**
 * Cifra um payload para múltiplos destinatários.
 *
 * Uma chave simétrica temporária cifra o conteúdo com XChaCha20-Poly1305
 * (AAD = versão + redação + categoria + época). Essa chave é então embrulhada
 * para cada destinatário com `crypto_box` (X25519) usando um par efêmero.
 * O nonce do AEAD vai prefixado ao `ciphertext`.
 */
export async function seal(options: SealOptions): Promise<Envelope> {
  assertSealOptions(options);
  const sodium = await loadSodium();
  const recipientKeys = options.recipientPublicKeys.map((key) => decodeKey(key, "recipientPublicKey"));
  const ephemeral = sodium.crypto_box_keypair();
  const symmetricKey = sodium.randombytes_buf(KEY_BYTES);
  const nonce = sodium.randombytes_buf(NONCE_BYTES);

  const sealed = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    options.plaintext,
    aadFor(options),
    null,
    nonce,
    symmetricKey,
  );
  const authTag = sealed.slice(sealed.length - TAG_BYTES);
  const ciphertext = concatBytes(nonce, sealed.slice(0, sealed.length - TAG_BYTES));

  const wrappedKeys = recipientKeys.map((publicKey) => {
    const wrapNonce = sodium.randombytes_buf(NONCE_BYTES);
    const wrapped = sodium.crypto_box_easy(symmetricKey, wrapNonce, publicKey, ephemeral.privateKey);
    return toBase64Url(concatBytes(wrapNonce, wrapped));
  });

  return {
    version: options.version,
    newsroom: options.newsroom,
    category: options.category,
    epoch: options.epoch,
    recipientKeys: wrappedKeys,
    ephemeralPublicKey: toBase64Url(ephemeral.publicKey),
    ciphertext,
    authTag,
    contentHash: contentHashOf(concatBytes(ciphertext, authTag)),
  };
}
