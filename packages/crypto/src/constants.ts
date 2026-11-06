/** Tamanhos fixos do protocolo criptográfico. */
export const KEY_BYTES = 32;
/** XChaCha20-Poly1305 e crypto_box usam nonce de 24 bytes. */
export const NONCE_BYTES = 24;
export const TAG_BYTES = 16;
/** Bloco cifrado de chave por destinatário: ciphertext (32) + tag (16). */
export const WRAPPED_KEY_BYTES = KEY_BYTES + TAG_BYTES;
export const MAX_RECIPIENTS = 1_024;
export const HASH_BYTES = 32;
