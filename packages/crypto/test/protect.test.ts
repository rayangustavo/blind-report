import { fromBase64Url, toBase64Url } from "@blind-report/core";
import { describe, expect, it } from "vitest";
import { CryptoError } from "../src/errors";
import { protectKeyring, unlockKeyring, type ProtectedKeyring } from "../src/protect";

const iterations = 1_000;
const password = "senha-muito-forte";
const keyring = '{"version":1,"seed":"c2VlZA=="}';

function mutate(json: string, patch: Record<string, unknown>): string {
  return JSON.stringify({ ...JSON.parse(json), ...patch });
}

describe("protectKeyring", () => {
  it("produces a PBKDF2 + secretbox envelope that unlocks back", async () => {
    const protectedJson = await protectKeyring(keyring, password, { iterations });
    const parsed = JSON.parse(protectedJson) as ProtectedKeyring;

    expect(parsed).toMatchObject({ version: 1, kdf: "pbkdf2-sha256", iterations });
    expect(fromBase64Url(parsed.salt)).toHaveLength(16);
    expect(fromBase64Url(parsed.nonce)).toHaveLength(24);
    expect(fromBase64Url(parsed.ciphertext).length).toBeGreaterThanOrEqual(16);

    const unlocked = await unlockKeyring(protectedJson, password);
    expect(new TextDecoder().decode(unlocked)).toBe(keyring);
  });

  it("protects raw bytes and accepts a parsed object on unlock", async () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 255]);
    const protectedJson = await protectKeyring(bytes, password, { iterations });
    expect(await unlockKeyring(JSON.parse(protectedJson) as ProtectedKeyring, password)).toEqual(bytes);
  });

  it("uses a fresh salt and nonce per call", async () => {
    const first = JSON.parse(await protectKeyring(keyring, password, { iterations })) as ProtectedKeyring;
    const second = JSON.parse(await protectKeyring(keyring, password, { iterations })) as ProtectedKeyring;
    expect(first.salt).not.toBe(second.salt);
    expect(first.nonce).not.toBe(second.nonce);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it("defaults to 310k iterations", async () => {
    const parsed = JSON.parse(await protectKeyring(keyring, password)) as ProtectedKeyring;
    expect(parsed.iterations).toBe(310_000);
  });

  it("validates inputs", async () => {
    await expect(protectKeyring(42 as unknown as string, password)).rejects.toBeInstanceOf(CryptoError);
    await expect(protectKeyring(keyring, "")).rejects.toThrow(/password/);
    await expect(protectKeyring(keyring, 3 as unknown as string)).rejects.toThrow(/password/);
    await expect(protectKeyring(keyring, password, { iterations: 0 })).rejects.toThrow(/iterations/);
    await expect(protectKeyring(keyring, password, { iterations: 1.5 })).rejects.toThrow(/iterations/);
    await expect(protectKeyring(keyring, password, { iterations: 999 })).rejects.toThrow(/iterations/);
  });
});

describe("unlockKeyring", () => {
  it("rejects a wrong password", async () => {
    const protectedJson = await protectKeyring(keyring, password, { iterations });
    await expect(unlockKeyring(protectedJson, "outra-senha")).rejects.toThrow(/wrong password/);
  });

  it("rejects tampered ciphertext, salt and nonce", async () => {
    const protectedJson = await protectKeyring(keyring, password, { iterations });
    const parsed = JSON.parse(protectedJson) as ProtectedKeyring;

    const ciphertext = fromBase64Url(parsed.ciphertext);
    ciphertext[ciphertext.length - 1]! ^= 0x01;
    await expect(unlockKeyring(mutate(protectedJson, { ciphertext: toBase64Url(ciphertext) }), password)).rejects.toThrow(
      /wrong password/,
    );
    await expect(
      unlockKeyring(mutate(protectedJson, { salt: toBase64Url(new Uint8Array(16).fill(1)) }), password),
    ).rejects.toThrow(/wrong password/);
    await expect(
      unlockKeyring(mutate(protectedJson, { nonce: toBase64Url(new Uint8Array(24).fill(1)) }), password),
    ).rejects.toThrow(/wrong password/);
  });

  it("rejects malformed protected keyrings", async () => {
    const protectedJson = await protectKeyring(keyring, password, { iterations });
    const invalid: Array<string | ProtectedKeyring> = [
      "{not json",
      "null",
      "[]",
      mutate(protectedJson, { version: 2 }),
      mutate(protectedJson, { kdf: "scrypt" }),
      mutate(protectedJson, { iterations: "1000" }),
      mutate(protectedJson, { iterations: 999 }),
      mutate(protectedJson, { salt: "***" }),
      mutate(protectedJson, { salt: toBase64Url(new Uint8Array(15)) }),
      mutate(protectedJson, { nonce: toBase64Url(new Uint8Array(23)) }),
      mutate(protectedJson, { ciphertext: "***" }),
      mutate(protectedJson, { ciphertext: toBase64Url(new Uint8Array(15)) }),
    ];
    for (const value of invalid) {
      await expect(unlockKeyring(value, password)).rejects.toBeInstanceOf(CryptoError);
    }
  });

  it("validates the password", async () => {
    const protectedJson = await protectKeyring(keyring, password, { iterations });
    await expect(unlockKeyring(protectedJson, "")).rejects.toThrow(/password/);
    await expect(unlockKeyring(protectedJson, 42 as unknown as string)).rejects.toThrow(/password/);
  });
});
