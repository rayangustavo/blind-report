import { toBase64Url } from "./base64url";
import { IntegrityError } from "./errors";
import { PART_PAYLOAD_BYTES } from "./limits";
import type { Part } from "./types";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

/** Checksum CRC32 (binário, base64url) usado para detectar corrupção entre partes. */
export function checksumOf(bytes: Uint8Array): string {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  }
  crc = (crc ^ 0xffffffff) >>> 0;
  return toBase64Url(new Uint8Array([(crc >>> 24) & 0xff, (crc >>> 16) & 0xff, (crc >>> 8) & 0xff, crc & 0xff]));
}

/**
 * Divide o payload em partes de no máximo `maxPartBytes` bytes.
 * O índice é baseado em zero e cada parte carrega o próprio checksum.
 */
export function splitIntoParts(payload: Uint8Array, maxPartBytes: number = PART_PAYLOAD_BYTES): Part[] {
  if (!(payload instanceof Uint8Array)) throw new TypeError("payload must be a Uint8Array");
  if (!Number.isSafeInteger(maxPartBytes) || maxPartBytes <= 0) {
    throw new TypeError("maxPartBytes must be a positive integer");
  }
  const total = Math.max(1, Math.ceil(payload.length / maxPartBytes));
  const parts: Part[] = [];
  for (let index = 0; index < total; index += 1) {
    const chunk = payload.slice(index * maxPartBytes, (index + 1) * maxPartBytes);
    parts.push({ index, total, payload: chunk, checksum: checksumOf(chunk) });
  }
  return parts;
}

/**
 * Reordena, verifica os checksums e concatena as partes.
 * Lança `IntegrityError` se houver lacuna, duplicata, total divergente ou corrupção.
 */
export function joinParts(parts: readonly Part[]): Uint8Array {
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new IntegrityError("no parts to join");
  }
  const total = parts[0]!.total;
  if (!Number.isSafeInteger(total) || total !== parts.length) {
    throw new IntegrityError(`inconsistent part count: expected ${total}, got ${parts.length}`);
  }
  const ordered: Part[] = new Array(total);
  for (const part of parts) {
    if (!(part.payload instanceof Uint8Array)) throw new IntegrityError(`part ${String(part.index)} has no payload`);
    if (!Number.isSafeInteger(part.index) || part.index < 0 || part.index >= total) {
      throw new IntegrityError(`part index out of range: ${String(part.index)}`);
    }
    if (part.total !== total) throw new IntegrityError(`part ${part.index} reports total ${part.total}`);
    if (ordered[part.index] !== undefined) throw new IntegrityError(`duplicate part index: ${part.index}`);
    if (typeof part.checksum !== "string" || checksumOf(part.payload) !== part.checksum) {
      throw new IntegrityError(`checksum mismatch on part ${part.index}`);
    }
    ordered[part.index] = part;
  }
  // Com `total` partes, índices únicos e no intervalo [0, total), todas estão presentes.
  let size = 0;
  for (const part of ordered) size += part.payload.length;
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of ordered) {
    out.set(part.payload, offset);
    offset += part.payload.length;
  }
  return out;
}
