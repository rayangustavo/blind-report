import type { Envelope } from "@blind-report/core";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CryptoError } from "../src/errors";
import { decodeEnvelope, encodeEnvelope } from "../src/format";
import { newKeypair } from "../src/keys";
import { open } from "../src/open";
import { seal } from "../src/seal";

const ascii = (maxLength: number) =>
  fc.string({ maxLength }).map((value) => value.replace(/[^\x20-\x7E]/g, ""));

describe("crypto properties", () => {
  it("round-trips arbitrary plaintexts for one to three recipients", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ maxLength: 1_024 }),
        fc.integer({ min: 1, max: 3 }),
        fc.stringMatching(/^[a-z]{1,20}$/),
        async (plaintext, recipients, category) => {
          const keys = await Promise.all(Array.from({ length: recipients }, () => newKeypair()));
          const envelope = await seal({
            plaintext,
            recipientPublicKeys: keys.map((key) => key.publicKey),
            newsroom: "redacao.eth",
            category,
            epoch: "2026-11",
            version: 1,
          });
          for (const keypair of keys) {
            expect(await open(envelope, keypair)).toEqual(plaintext);
          }
        },
      ),
      { numRuns: 15 },
    );
  });

  it("rejects any single-bit tampering of the ciphertext", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 256 }),
        fc.nat({ max: 4_096 }),
        async (plaintext, position) => {
          const keypair = await newKeypair();
          const envelope = await seal({
            plaintext,
            recipientPublicKeys: [keypair.publicKey],
            newsroom: "redacao.eth",
            category: "outros",
            epoch: "2026-11",
            version: 1,
          });
          const ciphertext = envelope.ciphertext.slice();
          ciphertext[position % ciphertext.length]! ^= 0x01;
          await expect(open({ ...envelope, ciphertext }, keypair)).rejects.toBeInstanceOf(CryptoError);
        },
      ),
      { numRuns: 15 },
    );
  });

  it("round-trips arbitrary envelopes through the binary format", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        ascii(40),
        ascii(40),
        ascii(40),
        fc.array(ascii(40), { maxLength: 3 }),
        ascii(40),
        ascii(40),
        fc.uint8Array({ maxLength: 64 }),
        fc.uint8Array({ maxLength: 64 }),
        (version, newsroom, category, epoch, recipientKeys, ephemeralPublicKey, contentHash, ciphertext, authTag) => {
          const envelope: Envelope = {
            version,
            newsroom,
            category,
            epoch,
            recipientKeys,
            ephemeralPublicKey,
            ciphertext,
            authTag,
            contentHash,
          };
          expect(decodeEnvelope(encodeEnvelope(envelope))).toEqual(envelope);
        },
      ),
      { numRuns: 30 },
    );
  });
});
