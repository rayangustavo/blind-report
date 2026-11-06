import { ValidationError } from "./errors";
import { ARKIV_MAX_BYTES } from "./limits";
import { encodePayload } from "./payload";
import type { NewsroomPolicy, Payload } from "./types";

export type Submission = Payload;

export type ValidationResult = {
  ok: boolean;
  issues: string[];
  sizeBytes: number;
};

/**
 * Confere uma submissão contra a política da redação e os limites do protocolo.
 * Nunca lança: devolve a lista de problemas para a fonte corrigir.
 */
export function validateSubmission(policy: NewsroomPolicy, submission: Submission): ValidationResult {
  const issues: string[] = [];
  if (typeof submission !== "object" || submission === null) {
    return { ok: false, issues: ["submission must be an object"], sizeBytes: 0 };
  }
  if (typeof submission.text !== "string" || submission.text.trim().length === 0) {
    issues.push("text must be a non-empty string");
  }
  if (typeof submission.category !== "string" || submission.category.length === 0) {
    issues.push("category must be a non-empty string");
  } else if (!policy.categories.includes(submission.category)) {
    issues.push(`category not accepted by policy: ${submission.category}`);
  }
  if (submission.attachment !== undefined && !policy.acceptsAttachments) {
    issues.push("policy does not accept attachments");
  }

  let sizeBytes = 0;
  if (issues.length === 0) {
    try {
      sizeBytes = encodePayload(submission).length;
    } catch (error) {
      if (error instanceof ValidationError) issues.push(...error.issues);
      else throw error;
    }
    if (sizeBytes > policy.maxSizeBytes) {
      issues.push(`payload exceeds policy maxSizeBytes (${sizeBytes} > ${policy.maxSizeBytes})`);
    }
    if (sizeBytes > ARKIV_MAX_BYTES) {
      issues.push(`payload exceeds protocol limit (${sizeBytes} > ${ARKIV_MAX_BYTES})`);
    }
  }
  return { ok: issues.length === 0, issues, sizeBytes };
}

/** Igual a `validateSubmission`, mas lança `ValidationError` em caso de rejeição. */
export function assertSubmission(policy: NewsroomPolicy, submission: Submission): void {
  const result = validateSubmission(policy, submission);
  if (!result.ok) throw new ValidationError(result.issues);
}
