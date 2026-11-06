import { namehash, type Hex } from "viem";

const encoder = new TextEncoder();
const MAX_LABEL_BYTES = 63;
const MAX_WIRE_BYTES = 255;

/**
 * Codifica um nome ENS no formato DNS wire esperado pelo ENS:
 * cada label é precedido pelo seu tamanho em bytes e a sequência termina em 0x00.
 */
export function encodeDnsName(name: string): Uint8Array {
  if (typeof name !== "string" || name.length === 0) throw new TypeError("name must be a non-empty string");
  const normalized = name.endsWith(".") ? name.slice(0, -1) : name;
  if (normalized.length === 0) throw new TypeError("name must contain at least one label");

  const out: number[] = [];
  for (const label of normalized.split(".")) {
    if (label.length === 0) throw new TypeError("name must not contain empty labels");
    const bytes = encoder.encode(label);
    if (bytes.length > MAX_LABEL_BYTES) {
      throw new TypeError(`each label must be at most ${MAX_LABEL_BYTES} bytes`);
    }
    out.push(bytes.length, ...bytes);
  }
  out.push(0);
  if (out.length > MAX_WIRE_BYTES) {
    throw new TypeError(`name must be at most ${MAX_WIRE_BYTES} bytes in DNS wire format`);
  }
  return new Uint8Array(out);
}

/** Node (bytes32) do nome no registro ENSv2. */
export function nodeForName(name: string): Hex {
  if (typeof name !== "string" || name.length === 0) throw new TypeError("name must be a non-empty string");
  return namehash(name);
}
