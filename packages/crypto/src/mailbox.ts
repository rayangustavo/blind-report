import { concatBytes } from "./bytes";
import { NONCE_BYTES, TAG_BYTES } from "./constants";
import { CryptoError } from "./errors";
import { contentHashOf } from "./hash";
import { decodeKey, type Keypair } from "./keys";
import { loadSodium } from "./sodium";

const MAILBOX_DOMAIN = "blind-report:mailbox:v1:";
const REPLY_VERSION = 1;
const REPLY_HEADER_BYTES = 1 + 32 + NONCE_BYTES;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export type SealReplyOptions = {
  plaintext: string;
  mailboxPublicKey: string;
  authorKeypair: Keypair;
};

/**
 * Identificador estável da caixa de entrada anônima, derivado da chave pública
 * da redação. Não revela a chave em si.
 */
export function mailboxId(publicKey: string): string {
  const key = decodeKey(publicKey, "mailboxPublicKey");
  return contentHashOf(concatBytes(encoder.encode(MAILBOX_DOMAIN), key));
}

/**
 * Cifra uma resposta da redação para a caixa anônima da fonte.
 * Formato: versão (1) || chave pública do autor (32) || nonce (24) || crypto_box.
 */
export async function sealReply(options: SealReplyOptions): Promise<Uint8Array> {
  if (typeof options !== "object" || options === null) throw new CryptoError("sealReply options are required");
  if (typeof options.plaintext !== "string" || options.plaintext.length === 0) {
    throw new CryptoError("plaintext must be a non-empty string");
  }
  const sodium = await loadSodium();
  const mailboxPublicKey = decodeKey(options.mailboxPublicKey, "mailboxPublicKey");
  const authorPublicKey = decodeKey(options.authorKeypair?.publicKey, "authorPublicKey");
  const authorPrivateKey = decodeKey(options.authorKeypair?.privateKey, "authorPrivateKey");

  const nonce = sodium.randombytes_buf(NONCE_BYTES);
  const boxed = sodium.crypto_box_easy(encoder.encode(options.plaintext), nonce, mailboxPublicKey, authorPrivateKey);
  return concatBytes(new Uint8Array([REPLY_VERSION]), authorPublicKey, nonce, boxed);
}

/** Decifra uma resposta recebida na caixa anônima usando a chave privada do mailbox. */
export async function openReply(ciphertext: Uint8Array, mailboxPrivateKey: string): Promise<string> {
  if (!(ciphertext instanceof Uint8Array) || ciphertext.length < REPLY_HEADER_BYTES + TAG_BYTES) {
    throw new CryptoError("reply ciphertext is malformed");
  }
  if (ciphertext[0] !== REPLY_VERSION) throw new CryptoError(`unsupported reply version: ${String(ciphertext[0])}`);

  const sodium = await loadSodium();
  const authorPublicKey = ciphertext.slice(1, 33);
  const nonce = ciphertext.slice(33, REPLY_HEADER_BYTES);
  const boxed = ciphertext.slice(REPLY_HEADER_BYTES);
  const privateKey = decodeKey(mailboxPrivateKey, "mailboxPrivateKey");

  let plaintext: Uint8Array;
  try {
    plaintext = sodium.crypto_box_open_easy(boxed, nonce, authorPublicKey, privateKey);
  } catch {
    throw new CryptoError("reply authentication failed");
  }
  try {
    return decoder.decode(plaintext);
  } catch {
    throw new CryptoError("reply is not valid UTF-8");
  }
}
