import { HostNotAllowedError } from "./errors";
import { getDefaultPolicy, isAllowed } from "./policy";
import type { NetworkPolicy } from "./types";

/**
 * `fetch` com allowlist. Se o host não estiver na política, rejeita com
 * `HostNotAllowedError` antes de emitir qualquer chamada de rede.
 */
export async function guardedFetch(
  url: string | URL,
  init?: RequestInit,
  policy?: NetworkPolicy,
): Promise<Response> {
  const activePolicy = policy ?? getDefaultPolicy();
  if (!isAllowed(url, activePolicy)) {
    throw new HostNotAllowedError(typeof url === "string" ? url : url.toString());
  }
  return fetch(url, init);
}
