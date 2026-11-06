import { describe, expect, it } from "vitest";
import { ValidationError } from "../src/errors";
import { ARKIV_MAX_BYTES } from "../src/limits";
import { encodePayload } from "../src/payload";
import type { NewsroomPolicy, Payload } from "../src/types";
import { assertSubmission, validateSubmission } from "../src/validate";

const policy: NewsroomPolicy = {
  version: 1,
  categories: ["corrupcao", "saude"],
  maxSizeBytes: 50_000,
  acceptsAttachments: true,
};

const submission: Payload = { text: "Há propina no contrato.", category: "corrupcao" };

describe("validateSubmission", () => {
  it("accepts a valid submission and reports its encoded size", () => {
    const result = validateSubmission(policy, submission);
    expect(result).toEqual({ ok: true, issues: [], sizeBytes: encodePayload(submission).length });
  });

  it("accepts attachments when the policy allows them", () => {
    const result = validateSubmission(policy, {
      ...submission,
      attachment: { name: "a.txt", mimeType: "text/plain", dataBase64Url: "aGVsbG8" },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a non-object submission", () => {
    const result = validateSubmission(policy, null as unknown as Payload);
    expect(result.ok).toBe(false);
    expect(result.issues).toContain("submission must be an object");
  });

  it("rejects empty or non-string text", () => {
    expect(validateSubmission(policy, { ...submission, text: "   " }).issues).toContain("text must be a non-empty string");
    expect(validateSubmission(policy, { ...submission, text: 7 as unknown as string }).issues).toContain(
      "text must be a non-empty string",
    );
  });

  it("rejects missing or unaccepted categories", () => {
    expect(validateSubmission(policy, { ...submission, category: "" }).issues).toContain("category must be a non-empty string");
    expect(validateSubmission(policy, { ...submission, category: 3 as unknown as string }).issues).toContain(
      "category must be a non-empty string",
    );
    expect(validateSubmission(policy, { ...submission, category: "esporte" }).issues).toContain(
      "category not accepted by policy: esporte",
    );
  });

  it("rejects attachments when the policy does not accept them", () => {
    const result = validateSubmission(
      { ...policy, acceptsAttachments: false },
      { ...submission, attachment: { name: "a.txt", mimeType: "text/plain", dataBase64Url: "" } },
    );
    expect(result.issues).toContain("policy does not accept attachments");
  });

  it("surfaces attachment validation issues", () => {
    const result = validateSubmission(policy, {
      ...submission,
      attachment: { name: "", mimeType: "nope", dataBase64Url: "***" },
    });
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "attachment.name must be a non-empty string of at most 255 characters",
        "attachment.mimeType must be a valid MIME type",
        "attachment.dataBase64Url must be valid base64url",
      ]),
    );
    expect(result.sizeBytes).toBe(0);
  });

  it("enforces the policy size limit", () => {
    const result = validateSubmission({ ...policy, maxSizeBytes: 5 }, submission);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.startsWith("payload exceeds policy maxSizeBytes"))).toBe(true);
  });

  it("enforces the protocol size limit", () => {
    const huge = "x".repeat(ARKIV_MAX_BYTES);
    const result = validateSubmission({ ...policy, maxSizeBytes: ARKIV_MAX_BYTES * 2 }, { ...submission, text: huge });
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.startsWith("payload exceeds protocol limit"))).toBe(true);
  });
});

describe("assertSubmission", () => {
  it("passes for a valid submission", () => {
    expect(() => assertSubmission(policy, submission)).not.toThrow();
  });

  it("throws ValidationError with every issue", () => {
    try {
      assertSubmission(policy, { text: "", category: "esporte" });
      throw new Error("expected assertSubmission to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).issues).toEqual([
        "text must be a non-empty string",
        "category not accepted by policy: esporte",
      ]);
    }
  });
});
