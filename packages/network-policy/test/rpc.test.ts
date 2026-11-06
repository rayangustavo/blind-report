import { describe, expect, it, vi } from "vitest";
import { HostNotAllowedError, NetworkPolicyError, RpcError } from "../src/errors";
import { createPolicy } from "../src/policy";
import { createRpcTransport } from "../src/rpc";

const policy = createPolicy({ rpcUrl: "https://rpc.example.org", worldEnvironment: "staging" });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function transportWith(fetchImpl: ReturnType<typeof vi.fn>, extra: Record<string, unknown> = {}) {
  return createRpcTransport({ url: "https://rpc.example.org", policy, fetchImpl, ...extra });
}

describe("createRpcTransport", () => {
  it("posts JSON-RPC and returns the result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ jsonrpc: "2.0", id: 1, result: { chainId: 1 } }));
    const transport = transportWith(fetchMock);

    await expect(transport.request("eth_chainId")).resolves.toEqual({ chainId: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://rpc.example.org");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json", accept: "application/json" });
    expect(JSON.parse(init.body)).toEqual({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] });
  });

  it("increments the request id and forwards params", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({ result: "0x1" }));
    const transport = transportWith(fetchMock);

    await transport.request("a", [1]);
    await transport.request("b", ["x"]);

    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).id).toBe(1);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).params).toEqual([1]);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body).id).toBe(2);
  });

  it("retries 5xx and 429 responses with exponential backoff", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(jsonResponse({ result: "ok" }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const transport = transportWith(fetchMock, { sleep, baseDelayMs: 10, maxDelayMs: 15 });

    await expect(transport.request("eth_blockNumber")).resolves.toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[10], [15]]);
  });

  it("retries network failures", async () => {
    const failure = new Error("ECONNREFUSED");
    const fetchMock = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(jsonResponse({ result: 1 }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const transport = transportWith(fetchMock, { sleep });

    await expect(transport.request("x")).resolves.toBe(1);
    expect(sleep).toHaveBeenCalledWith(250);
  });

  it("gives up after the configured retries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 503));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const transport = transportWith(fetchMock, { sleep, retries: 2, baseDelayMs: 10, maxDelayMs: 100 });

    await expect(transport.request("x")).rejects.toBeInstanceOf(RpcError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[10], [20]]);
  });

  it("with retries=0 makes a single attempt", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 502));
    const transport = transportWith(fetchMock, { retries: 0, sleep: vi.fn() });

    await expect(transport.request("x")).rejects.toBeInstanceOf(RpcError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry client errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 400));
    const sleep = vi.fn();
    const transport = transportWith(fetchMock, { sleep });

    await expect(transport.request("x")).rejects.toMatchObject({ name: "RpcError", code: 400 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("surfaces JSON-RPC error payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: { code: -32000, message: "nonce too low" } }));
    const transport = transportWith(fetchMock);

    await expect(transport.request("x")).rejects.toMatchObject({ name: "RpcError", message: "nonce too low", code: -32000 });
  });

  it("handles error payloads without message and missing results", async () => {
    const withEmptyError = transportWith(vi.fn().mockResolvedValue(jsonResponse({ error: {} })));
    await expect(withEmptyError.request("x")).rejects.toMatchObject({ message: "RPC x failed" });

    const withoutResult = transportWith(vi.fn().mockResolvedValue(jsonResponse({ jsonrpc: "2.0" })));
    await expect(withoutResult.request("x")).rejects.toThrow(/returned no result/);
  });

  it("rejects invalid JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("not json", { status: 200 }));
    const transport = transportWith(fetchMock);
    await expect(transport.request("x")).rejects.toThrow(/invalid JSON/);
  });

  it("rejects invalid methods and params", async () => {
    const transport = transportWith(vi.fn());
    await expect(transport.request("  ")).rejects.toBeInstanceOf(NetworkPolicyError);
    await expect(transport.request("x", null as unknown as unknown[])).rejects.toBeInstanceOf(NetworkPolicyError);
  });

  it("refuses hosts outside the allowlist before any call", () => {
    expect(() => createRpcTransport({ url: "https://evil.example.net", policy })).toThrow(HostNotAllowedError);
  });

  it("validates its options", () => {
    expect(() => createRpcTransport(null as unknown as never)).toThrow(NetworkPolicyError);
    expect(() => createRpcTransport({ url: "", policy })).toThrow(/url is required/);
    expect(() => createRpcTransport({ url: "https://rpc.example.org", policy, retries: -1 })).toThrow(/retries/);
    expect(() => createRpcTransport({ url: "https://rpc.example.org", policy, retries: 1.5 })).toThrow(/retries/);
    expect(() => createRpcTransport({ url: "https://rpc.example.org", policy, baseDelayMs: 0 })).toThrow(/baseDelayMs/);
    expect(() => createRpcTransport({ url: "https://rpc.example.org", policy, baseDelayMs: 100, maxDelayMs: 50 })).toThrow(
      /maxDelayMs/,
    );
  });
});
