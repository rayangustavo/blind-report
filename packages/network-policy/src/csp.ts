import { isLoopbackHost } from "./policy";
import type { NetworkPolicy } from "./types";

/**
 * Gera o header `Content-Security-Policy` com `connect-src` estrito:
 * somente o próprio site e os hosts da allowlist.
 */
export function cspFor(policy: NetworkPolicy): string {
  const sources = new Set<string>();
  for (const host of policy.hosts) {
    const hostname = host.toLowerCase();
    if (isLoopbackHost(hostname)) sources.add(`http://${hostname}:*`);
    sources.add(`https://${hostname}:*`);
  }
  const connectSrc = ["'self'", ...[...sources].sort()].join(" ");
  return [
    "default-src 'self'",
    `connect-src ${connectSrc}`,
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
  ].join("; ");
}
