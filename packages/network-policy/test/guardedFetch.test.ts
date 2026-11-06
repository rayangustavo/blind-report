import { afterEach, describe, expect, it, vi } from "vitest";
import { HostNotAllowedError } from "../src/errors";
import { guardedFetch } from "../src/guardedFetch";
import { createPolicy, setDefaultPolicy } from "../src/policy";

const policy = createPolicy({ rpcUrl: "https://rpc.example.org", worldEnvironment: "staging" });

afterEach(() => {
  vi.unstubAllGlobals();
  setDefaultPolicy(undefined);
});

describe("guardedFetch", () => {
  it("blocks hosts outside the allowlist without touching the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(guardedFetch("https://evil.example.net/collect", {}, policy)).rejects.toBeInstanceOf(HostNotAllowedError);
    await expect(guardedFetch(new URL("https://evil.example.net/x"), {}, policy)).rejects.toBeInstanceOf(HostNotAllowedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards allowed requests to fetch", async () => {
    const response = new Response("ok", { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    const init: RequestInit = { method: "POST", body: "{}" };

    await expect(guardedFetch("https://rpc.example.org/v1", init, policy)).resolves.toBe(response);
    expect(fetchMock).toHaveBeenCalledWith("https://rpc.example.org/v1", init);
  });

  it("uses the configured default policy when none is passed", async () => {
    setDefaultPolicy(policy);
    const response = new Response("ok");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(guardedFetch("https://bridge.worldcoin.org/verify")).resolves.toBe(response);
    await expect(guardedFetch("https://evil.example.net")).rejects.toBeInstanceOf(HostNotAllowedError);
  });
});
