import type { NewsroomPolicy } from "./types.ts";

export type Submission = { category: string; sizeBytes: number; hasAttachment: boolean };
export type SubmissionRefusalCode = "category_not_allowed" | "too_large" | "attachments_not_allowed" | "invalid_size";
export type SubmissionCheck = { ok: true } | { ok: false; code: SubmissionRefusalCode; message: string };

export function normalizeCategoryName(category: string): string {
  return category
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

/** Confere um envio contra a política da redação. */
export function validateSubmission(policy: NewsroomPolicy, s: Submission): SubmissionCheck {
  if (!Number.isInteger(s.sizeBytes) || s.sizeBytes < 1) {
    return { ok: false, code: "invalid_size", message: "O tamanho da denúncia é inválido ou está vazio." };
  }
  const normalizedCategory = normalizeCategoryName(s.category);
  const allowed = new Set(policy.categories.map((c) => normalizeCategoryName(c)));
  if (!allowed.has(normalizedCategory)) {
    return { ok: false, code: "category_not_allowed", message: `A categoria "${s.category}" não é aceita por esta redação.` };
  }
  if (s.hasAttachment && !policy.attachments) {
    return { ok: false, code: "attachments_not_allowed", message: "Esta redação não aceita anexos." };
  }
  if (s.sizeBytes > policy.maxBytes) {
    return { ok: false, code: "too_large", message: `A denúncia excede o tamanho máximo de ${policy.maxBytes} bytes.` };
  }
  return { ok: true };
}
