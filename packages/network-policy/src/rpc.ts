import { HostNotAllowedError, NetworkPolicyError, RpcError } from "./errors";
import { getDefaultPolicy, isAllowed } from "./policy";
import type { NetworkPolicy } from "./types";

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type RpcTransportOptions = {
  url: string;
  policy?: NetworkPolicy;
  fetchImpl?: FetchLike;
  /** Tentativas adicionais após a primeira (padrão: 3). */
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

export type RpcTransport = {
  request<T = unknown>(method: string, params?: unknown[]): Promise<T>;
};

type RpcPayload<T> = {
  result?: T;
  error?: { code?: number; message?: string };
};

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Transporte JSON-RPC com allowlist e retentativa exponencial (429 e 5xx). */
export function createRpcTransport(options: RpcTransportOptions): RpcTransport {
  if (typeof options !== "object" || options === null || typeof options.url !== "string" || options.url.length === 0) {
    throw new NetworkPolicyError("rpc url is required");
  }
  const policy = options.policy ?? getDefaultPolicy();
  const fetchImpl: FetchLike = options.fetchImpl ?? fetch;
  const retries = options.retries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 5_000;
  const sleep = options.sleep ?? defaultSleep;
  if (!Number.isSafeInteger(retries) || retries < 0) {
    throw new NetworkPolicyError("retries must be a non-negative integer");
  }
  if (!Number.isFinite(baseDelayMs) || baseDelayMs <= 0) {
    throw new NetworkPolicyError("baseDelayMs must be a positive number");
  }
  if (!Number.isFinite(maxDelayMs) || maxDelayMs < baseDelayMs) {
    throw new NetworkPolicyError("maxDelayMs must be finite and >= baseDelayMs");
  }
  if (!isAllowed(options.url, policy)) throw new HostNotAllowedError(options.url);

  let nextId = 0;
  return {
    async request<T>(method: string, params: unknown[] = []): Promise<T> {
      if (typeof method !== "string" || method.trim().length === 0) {
        throw new NetworkPolicyError("method must be a non-empty string");
      }
      if (!Array.isArray(params)) throw new NetworkPolicyError("params must be an array");
      const body = JSON.stringify({ jsonrpc: "2.0", id: (nextId += 1), method, params });

      let lastError: unknown = new RpcError(`RPC ${method} failed`);
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        if (attempt > 0) await sleep(Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)));

        let response: Response;
        try {
          response = await fetchImpl(options.url, {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json" },
            body,
          });
        } catch (error) {
          lastError = error;
          continue;
        }

        if (response.status === 429 || response.status >= 500) {
          lastError = new RpcError(`RPC ${method} failed with HTTP ${response.status}`, response.status);
          continue;
        }
        if (!response.ok) {
          throw new RpcError(`RPC ${method} failed with HTTP ${response.status}`, response.status);
        }

        let payload: RpcPayload<T>;
        try {
          payload = (await response.json()) as RpcPayload<T>;
        } catch {
          throw new RpcError(`RPC ${method} returned invalid JSON`);
        }
        if (payload.error !== undefined) {
          throw new RpcError(payload.error.message ?? `RPC ${method} failed`, payload.error.code);
        }
        if (!("result" in payload)) throw new RpcError(`RPC ${method} returned no result`);
        return payload.result as T;
      }
      throw lastError;
    },
  };
}
