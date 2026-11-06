import { fromBase64Url } from "./base64url";
import { IntegrityError, ValidationError } from "./errors";
import type { Attachment, Payload, Reply } from "./types";

const MIME_TYPE_RE = /^[-\w.]+\/[-\w.+]+$/;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function takeAttachment(value: unknown, issues: string[]): Attachment | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    issues.push("attachment must be an object");
    return undefined;
  }
  if (typeof value.name !== "string" || value.name.trim().length === 0 || value.name.length > 255) {
    issues.push("attachment.name must be a non-empty string of at most 255 characters");
  }
  if (typeof value.mimeType !== "string" || !MIME_TYPE_RE.test(value.mimeType)) {
    issues.push("attachment.mimeType must be a valid MIME type");
  }
  if (typeof value.dataBase64Url !== "string") {
    issues.push("attachment.dataBase64Url must be a string");
  } else {
    try {
      fromBase64Url(value.dataBase64Url);
    } catch {
      issues.push("attachment.dataBase64Url must be valid base64url");
    }
  }
  if (issues.length > 0) return undefined;
  return {
    name: value.name as string,
    mimeType: value.mimeType as string,
    dataBase64Url: value.dataBase64Url as string,
  };
}

function takePayload(value: unknown): Payload {
  if (!isRecord(value)) throw new ValidationError(["payload must be an object"]);
  const issues: string[] = [];
  if (typeof value.text !== "string") issues.push("payload.text must be a string");
  if (typeof value.category !== "string" || value.category.length === 0) {
    issues.push("payload.category must be a non-empty string");
  }
  const attachment = takeAttachment(value.attachment, issues);
  if (issues.length > 0) throw new ValidationError(issues);
  const payload: Payload = { text: value.text as string, category: value.category as string };
  if (attachment !== undefined) payload.attachment = attachment;
  return payload;
}

function takeReply(value: unknown): Reply {
  if (!isRecord(value)) throw new ValidationError(["reply must be an object"]);
  const issues: string[] = [];
  if (typeof value.mailboxId !== "string" || value.mailboxId.length === 0) {
    issues.push("reply.mailboxId must be a non-empty string");
  }
  if (typeof value.text !== "string") issues.push("reply.text must be a string");
  if (typeof value.timestamp !== "number" || !Number.isFinite(value.timestamp)) {
    issues.push("reply.timestamp must be a finite number");
  }
  if (value.authorName !== undefined && (typeof value.authorName !== "string" || value.authorName.length === 0)) {
    issues.push("reply.authorName must be a non-empty string when present");
  }
  if (issues.length > 0) throw new ValidationError(issues);
  const reply: Reply = {
    mailboxId: value.mailboxId as string,
    text: value.text as string,
    timestamp: value.timestamp as number,
  };
  if (value.authorName !== undefined) reply.authorName = value.authorName as string;
  return reply;
}

function encodeJson(value: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(value));
}

function decodeJson(bytes: Uint8Array): unknown {
  if (!(bytes instanceof Uint8Array)) throw new IntegrityError("payload bytes must be a Uint8Array");
  let text: string;
  try {
    text = decoder.decode(bytes);
  } catch {
    throw new IntegrityError("payload is not valid UTF-8");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new IntegrityError("payload is not valid JSON");
  }
}

/** Codifica uma denúncia (texto, categoria e anexo opcional) em JSON UTF-8. */
export function encodePayload(payload: Payload): Uint8Array {
  return encodeJson(takePayload(payload));
}

/** Decodifica e valida um payload de denúncia. */
export function decodePayload(bytes: Uint8Array): Payload {
  return takePayload(decodeJson(bytes));
}

/** Codifica uma resposta da redação em JSON UTF-8. */
export function encodeReply(reply: Reply): Uint8Array {
  return encodeJson(takeReply(reply));
}

/** Decodifica e valida uma resposta da redação. */
export function decodeReply(bytes: Uint8Array): Reply {
  return takeReply(decodeJson(bytes));
}
