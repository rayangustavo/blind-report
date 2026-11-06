import { describe, expect, it } from "vitest";
import { concatBytes } from "../src/bytes";
import { NONCE_BYTES, TAG_BYTES } from "../src/constants";
import { CryptoError } from "../src/errors";
import { decodeKey, newKeypair, type Keypair } from "../src/keys";
import { mailboxId, openReply, sealReply, type SealReplyOptions } from "../src/mailbox";
import { loadSodium } from "../src/sodium";

async function fixtures() {
  const author = await newKeypair();
  const mailbox = await newKeypair();
  return { author, mailbox, plaintext: "Sua denúncia foi recebida e está em análise." };
}

describe("mailboxId", () => {
  it("derives a stable 43-character base64url identifier", async () => {
    const { publicKey } = await newKeypair();
    const id = mailboxId(publicKey);
    expect(id).toHaveLength(43);
    expect(mailboxId(publicKey)).toBe(id);

    const other = await newKeypair();
    expect(mailboxId(other.publicKey)).not.toBe(id);
  });

  it("rejects invalid public keys", () => {
    expect(() => mailboxId("***")).toThrow(CryptoError);
    expect(() => mailboxId("")).toThrow(/32 bytes/);
  });
});

describe("sealReply / openReply", () => {
  it("round-trips a reply for the mailbox owner", async () => {
    const { author, mailbox, plaintext } = await fixtures();
    const sealed = await sealReply({ plaintext, mailboxPublicKey: mailbox.publicKey, authorKeypair: author });

    expect(sealed).toBeInstanceOf(Uint8Array);
    expect(sealed[0]).toBe(1);
    expect(sealed.length).toBeGreaterThan(1 + 32 + NONCE_BYTES + TAG_BYTES);
    expect(await openReply(sealed, mailbox.privateKey)).toBe(plaintext);
  });

  it("is randomised and accepts unicode", async () => {
    const { author, mailbox } = await fixtures();
    const plaintext = "Recebido ✅ — obrigada.";
    const first = await sealReply({ plaintext, mailboxPublicKey: mailbox.publicKey, authorKeypair: author });
    const second = await sealReply({ plaintext, mailboxPublicKey: mailbox.publicKey, authorKeypair: author });
    expect(first).not.toEqual(second);
    expect(await openReply(first, mailbox.privateKey)).toBe(plaintext);
  });

  it("rejects invalid seal options", async () => {
    const { author, mailbox } = await fixtures();
    const options: SealReplyOptions = {
      plaintext: "ok",
      mailboxPublicKey: mailbox.publicKey,
      authorKeypair: author,
    };
    const cases: SealReplyOptions[] = [
      null as unknown as SealReplyOptions,
      { ...options, plaintext: "" },
      { ...options, plaintext: 3 as unknown as string },
      { ...options, mailboxPublicKey: "***" },
      { ...options, authorKeypair: null as unknown as Keypair },
      { ...options, authorKeypair: { publicKey: "***", privateKey: author.privateKey } },
      { ...options, authorKeypair: { publicKey: author.publicKey, privateKey: "***" } },
    ];
    for (const value of cases) await expect(sealReply(value)).rejects.toBeInstanceOf(CryptoError);
  });

  it("rejects replies opened with the wrong key", async () => {
    const { author, mailbox, plaintext } = await fixtures();
    const sealed = await sealReply({ plaintext, mailboxPublicKey: mailbox.publicKey, authorKeypair: author });
    const intruder = await newKeypair();
    await expect(openReply(sealed, intruder.privateKey)).rejects.toThrow(/authentication failed/);
    await expect(openReply(sealed, "***")).rejects.toThrow(/mailboxPrivateKey/);
  });

  it("rejects corrupted replies", async () => {
    const { author, mailbox, plaintext } = await fixtures();
    const sealed = await sealReply({ plaintext, mailboxPublicKey: mailbox.publicKey, authorKeypair: author });

    const flipped = sealed.slice();
    flipped[flipped.length - 1]! ^= 0x01;
    await expect(openReply(flipped, mailbox.privateKey)).rejects.toThrow(/authentication failed/);

    const tamperedAuthor = sealed.slice();
    tamperedAuthor[1]! ^= 0x01;
    await expect(openReply(tamperedAuthor, mailbox.privateKey)).rejects.toThrow(/authentication failed/);

    const wrongVersion = sealed.slice();
    wrongVersion[0] = 2;
    await expect(openReply(wrongVersion, mailbox.privateKey)).rejects.toThrow(/unsupported reply version/);

    await expect(openReply(sealed.slice(0, sealed.length - 1), mailbox.privateKey)).rejects.toBeInstanceOf(CryptoError);
    await expect(openReply(sealed.slice(0, 10), mailbox.privateKey)).rejects.toThrow(/malformed/);
    await expect(openReply("bytes" as unknown as Uint8Array, mailbox.privateKey)).rejects.toThrow(/malformed/);
  });

  it("rejects decrypted payloads that are not UTF-8", async () => {
    const sodium = await loadSodium();
    const author = await newKeypair();
    const mailbox = await newKeypair();
    const nonce = sodium.randombytes_buf(NONCE_BYTES);
    const boxed = sodium.crypto_box_easy(
      new Uint8Array([0xff, 0xfe]),
      nonce,
      decodeKey(mailbox.publicKey),
      decodeKey(author.privateKey),
    );
    const blob = concatBytes(new Uint8Array([1]), decodeKey(author.publicKey), nonce, boxed);
    await expect(openReply(blob, mailbox.privateKey)).rejects.toThrow(/not valid UTF-8/);
  });
});
