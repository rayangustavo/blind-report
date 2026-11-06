import { describe, expect, it } from "vitest";
import { toBase64Url } from "../src/base64url";
import { IntegrityError, ValidationError } from "../src/errors";
import { decodePayload, decodeReply, encodePayload, encodeReply } from "../src/payload";
import type { Payload, Reply } from "../src/types";

const attachment = {
  name: "prova.pdf",
  mimeType: "application/pdf",
  dataBase64Url: toBase64Url(new TextEncoder().encode("%PDF-1.7")),
};

const payload: Payload = { text: "Denúncia sobre contratos.", category: "corrupcao", attachment };

describe("payload", () => {
  it("round-trips text and category", () => {
    const simple: Payload = { text: "olá", category: "saude" };
    expect(decodePayload(encodePayload(simple))).toEqual(simple);
  });

  it("round-trips an attachment", () => {
    expect(decodePayload(encodePayload(payload))).toEqual(payload);
  });

  it("produces canonical UTF-8 JSON and drops unknown fields", () => {
    const encoded = encodePayload({ ...payload, extra: "ignored" } as unknown as Payload);
    expect(new TextDecoder().decode(encoded)).toBe(
      `{"text":"Denúncia sobre contratos.","category":"corrupcao","attachment":{"name":"prova.pdf","mimeType":"application/pdf","dataBase64Url":"${attachment.dataBase64Url}"}}`,
    );
    expect(decodePayload(encoded)).not.toHaveProperty("extra");
  });

  it("rejects malformed payloads on encode", () => {
    const invalid = [
      "text" as unknown as Payload,
      { text: 1, category: "x" } as unknown as Payload,
      { text: "x" } as unknown as Payload,
      { text: "x", category: "" } as unknown as Payload,
    ];
    for (const value of invalid) expect(() => encodePayload(value)).toThrow(ValidationError);
  });

  it("rejects invalid attachments", () => {
    const cases: unknown[] = [
      { text: "x", category: "y", attachment: "file" },
      { text: "x", category: "y", attachment: { ...attachment, name: "  " } },
      { text: "x", category: "y", attachment: { ...attachment, name: "a".repeat(256) } },
      { text: "x", category: "y", attachment: { ...attachment, mimeType: "not-a-mime" } },
      { text: "x", category: "y", attachment: { ...attachment, dataBase64Url: "***" } },
      { text: "x", category: "y", attachment: { ...attachment, dataBase64Url: 7 } },
    ];
    for (const value of cases) expect(() => encodePayload(value as Payload)).toThrow(ValidationError);
  });

  it("rejects undecodable bytes", () => {
    expect(() => decodePayload(new Uint8Array([0xff, 0xfe]))).toThrow(IntegrityError);
    expect(() => decodePayload(new TextEncoder().encode("{not json"))).toThrow(IntegrityError);
    expect(() => decodePayload(new TextEncoder().encode("null"))).toThrow(ValidationError);
    expect(() => decodePayload(new TextEncoder().encode("[]"))).toThrow(ValidationError);
    expect(() => decodePayload("bytes" as unknown as Uint8Array)).toThrow(IntegrityError);
  });
});

describe("reply", () => {
  const reply: Reply = { mailboxId: "mbx", text: "Recebemos sua denúncia.", timestamp: 1_763_000_000 };

  it("round-trips a reply", () => {
    expect(decodeReply(encodeReply(reply))).toEqual(reply);
    const signed = { ...reply, authorName: "Marina" };
    expect(decodeReply(encodeReply(signed))).toEqual(signed);
  });

  it("rejects invalid replies", () => {
    const cases: unknown[] = [
      "reply",
      { ...reply, mailboxId: "" },
      { ...reply, text: 3 },
      { ...reply, timestamp: Number.NaN },
      { ...reply, timestamp: "now" },
      { ...reply, authorName: "" },
    ];
    for (const value of cases) expect(() => encodeReply(value as Reply)).toThrow(ValidationError);
  });

  it("rejects undecodable reply bytes", () => {
    expect(() => decodeReply(new Uint8Array([0xff]))).toThrow(IntegrityError);
  });
});
