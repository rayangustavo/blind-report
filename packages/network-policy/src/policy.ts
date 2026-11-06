import { NetworkPolicyError } from "./errors";
import type { NetworkPolicy, WorldEnvironment } from "./types";

const WORLD_ID_HOSTS = ["bridge.worldcoin.org", "developer.worldcoin.org"] as const;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export type CreatePolicyOptions = {
  rpcUrl: string;
  worldEnvironment: WorldEnvironment;
  relayerUrl?: string;
};

function parseUrl(value: unknown, field: string): URL {
  if (typeof value !== "string" || value.length === 0) {
    throw new NetworkPolicyError(`${field} must be an absolute URL`);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new NetworkPolicyError(`${field} must be an absolute URL`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new NetworkPolicyError(`${field} must use http or https`);
  }
  if (url.username !== "" || url.password !== "") {
    throw new NetworkPolicyError(`${field} must not embed credentials`);
  }
  if (url.protocol === "http:" && !isLoopbackHost(url.hostname)) {
    throw new NetworkPolicyError(`${field} must use https (http is only allowed on loopback)`);
  }
  return url;
}

export function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(String(hostname).toLowerCase());
}

/**
 * Compila a allowlist: host do RPC, hosts oficiais da World ID e, se houver,
 * o host do relayer. Ordem determinística (alfabética) para diffs estáveis.
 */
export function createPolicy(options: CreatePolicyOptions): NetworkPolicy {
  if (typeof options !== "object" || options === null) {
    throw new NetworkPolicyError("policy options are required");
  }
  if (options.worldEnvironment !== "staging" && options.worldEnvironment !== "production") {
    throw new NetworkPolicyError("worldEnvironment must be 'staging' or 'production'");
  }
  const rpcUrl = parseUrl(options.rpcUrl, "rpcUrl");
  const relayerUrl = options.relayerUrl === undefined ? undefined : parseUrl(options.relayerUrl, "relayerUrl");

  const hosts = new Set<string>([rpcUrl.hostname.toLowerCase(), ...WORLD_ID_HOSTS]);
  if (relayerUrl !== undefined) hosts.add(relayerUrl.hostname.toLowerCase());

  return {
    hosts: [...hosts].sort(),
    rpcUrl: rpcUrl.toString(),
    worldEnvironment: options.worldEnvironment,
    ...(relayerUrl === undefined ? {} : { relayerUrl: relayerUrl.toString() }),
  };
}

/**
 * Confere se o host da URL está na allowlist. Exige https, exceto para
 * loopback (desenvolvimento local). URLs inválidas nunca são permitidas.
 */
export function isAllowed(url: string | URL, policy: NetworkPolicy): boolean {
  const parsed = safeUrl(url);
  if (parsed === undefined) return false;
  if (policy === undefined || policy === null || !Array.isArray(policy.hosts)) return false;
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  if (parsed.username !== "" || parsed.password !== "") return false;
  if (parsed.protocol === "http:" && !isLoopbackHost(parsed.hostname)) return false;
  return policy.hosts.some((host) => host.toLowerCase() === parsed.hostname.toLowerCase());
}

function safeUrl(url: string | URL): URL | undefined {
  if (typeof url !== "string" && !(url instanceof URL)) return undefined;
  try {
    return url instanceof URL ? url : new URL(url);
  } catch {
    return undefined;
  }
}

let defaultPolicy: NetworkPolicy | undefined;

/** Define (ou limpa com `undefined`) a política padrão usada por guardedFetch e RPC. */
export function setDefaultPolicy(policy: NetworkPolicy | undefined): void {
  defaultPolicy = policy;
}

/**
 * Política padrão: RPC público da Sepolia e hosts da World ID em staging.
 * Ambientes reais devem chamar `setDefaultPolicy` na inicialização.
 */
export function getDefaultPolicy(): NetworkPolicy {
  if (defaultPolicy === undefined) {
    defaultPolicy = createPolicy({
      rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
      worldEnvironment: "staging",
    });
  }
  return defaultPolicy;
}
