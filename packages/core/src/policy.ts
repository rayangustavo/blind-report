import { PolicyError } from "./errors";
import type { NewsroomPolicy } from "./types";

const MAX_CATEGORIES = 100;
const MAX_CATEGORY_LENGTH = 64;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new PolicyError(`policy.${field} must be a positive integer`);
  }
  return value;
}

/**
 * Valida e normaliza a política publicada pela redação nos registros ENS.
 * Aceita a string JSON lida do ENS ou um objeto já parseado.
 */
export function parsePolicy(input: string | unknown): NewsroomPolicy {
  let raw: unknown = input;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch {
      throw new PolicyError("policy must be valid JSON");
    }
  }
  if (!isRecord(raw)) throw new PolicyError("policy must be a JSON object");

  const version = positiveInteger(raw.version, "version");

  if (!Array.isArray(raw.categories) || raw.categories.length === 0) {
    throw new PolicyError("policy.categories must be a non-empty array");
  }
  if (raw.categories.length > MAX_CATEGORIES) {
    throw new PolicyError(`policy.categories may have at most ${MAX_CATEGORIES} entries`);
  }
  const seen = new Set<string>();
  const categories = raw.categories.map((entry, index) => {
    if (typeof entry !== "string") {
      throw new PolicyError(`policy.categories[${index}] must be a string`);
    }
    const category = entry.trim();
    if (category.length === 0 || category.length > MAX_CATEGORY_LENGTH) {
      throw new PolicyError(`policy.categories[${index}] must have 1-${MAX_CATEGORY_LENGTH} characters`);
    }
    const key = category.toLowerCase();
    if (seen.has(key)) throw new PolicyError(`duplicate policy category: ${category}`);
    seen.add(key);
    return category;
  });

  const maxSizeBytes = positiveInteger(raw.maxSizeBytes, "maxSizeBytes");
  if (typeof raw.acceptsAttachments !== "boolean") {
    throw new PolicyError("policy.acceptsAttachments must be a boolean");
  }

  const policy: NewsroomPolicy = {
    version,
    categories,
    maxSizeBytes,
    acceptsAttachments: raw.acceptsAttachments,
  };
  if (raw.retentionDays !== undefined) {
    policy.retentionDays = positiveInteger(raw.retentionDays, "retentionDays");
  }
  return policy;
}

/** Serialização canônica e determinística da política para gravar no ENS. */
export function serializePolicy(policy: NewsroomPolicy): string {
  const parsed = parsePolicy(policy);
  return JSON.stringify({
    version: parsed.version,
    categories: parsed.categories,
    maxSizeBytes: parsed.maxSizeBytes,
    acceptsAttachments: parsed.acceptsAttachments,
    ...(parsed.retentionDays === undefined ? {} : { retentionDays: parsed.retentionDays }),
  });
}
