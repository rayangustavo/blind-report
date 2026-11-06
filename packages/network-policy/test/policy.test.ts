import { afterEach, describe, expect, it } from "vitest";
import { NetworkPolicyError } from "../src/errors";
import {
  createPolicy,
  getDefaultPolicy,
  isAllowed,
  isLoopbackHost,
  setDefaultPolicy,
} from "../src/policy";
import type { NetworkPolicy } from "../src/types";

afterEach(() => setDefaultPolicy(undefined));

describe("createPolicy", () => {
  it("compiles a sorted, deduplicated allowlist", () => {
    const policy = createPolicy({
      rpcUrl: "https://rpc.example.org:8545/v1",
      worldEnvironment: "production",
      relayerUrl: "https://relay.example.org/rpc",
    });
    expect(policy.hosts).toEqual([
      "bridge.worldcoin.org",
      "developer.worldcoin.org",
      "relay.example.org",
      "rpc.example.org",
    ]);
    expect(policy.rpcUrl).toBe("https://rpc.example.org:8545/v1");
    expect(policy.relayerUrl).toBe("https://relay.example.org/rpc");
    expect(policy.worldEnvironment).toBe("production");
  });

  it("deduplicates hosts and omits the relayer when absent", () => {
    const policy = createPolicy({ rpcUrl: "https://developer.worldcoin.org/x", worldEnvironment: "staging" });
    expect(policy.hosts).toEqual(["bridge.worldcoin.org", "developer.worldcoin.org"]);
    expect(policy).not.toHaveProperty("relayerUrl");
  });

  it("allows loopback http for local development", () => {
    const policy = createPolicy({ rpcUrl: "http://127.0.0.1:8545", worldEnvironment: "staging" });
    expect(policy.hosts).toContain("127.0.0.1");
  });

  it("rejects invalid options", () => {
    expect(() => createPolicy(null as unknown as never)).toThrow(NetworkPolicyError);
    expect(() => createPolicy({ rpcUrl: "", worldEnvironment: "staging" })).toThrow(/absolute URL/);
    expect(() => createPolicy({ rpcUrl: "/relative", worldEnvironment: "staging" })).toThrow(/absolute URL/);
    expect(() => createPolicy({ rpcUrl: "ftp://rpc.example.org", worldEnvironment: "staging" })).toThrow(/http or https/);
    expect(() => createPolicy({ rpcUrl: "http://rpc.example.org", worldEnvironment: "staging" })).toThrow(/https/);
    expect(() => createPolicy({ rpcUrl: "https://user:pass@rpc.example.org", worldEnvironment: "staging" })).toThrow(
      /credentials/,
    );
    expect(() => createPolicy({ rpcUrl: "https://rpc.example.org", worldEnvironment: "dev" as never })).toThrow(
      /worldEnvironment/,
    );
    expect(() =>
      createPolicy({ rpcUrl: "https://rpc.example.org", worldEnvironment: "staging", relayerUrl: "http://relay.example.org" }),
    ).toThrow(/https/);
  });
});

describe("isAllowed", () => {
  const policy = createPolicy({
    rpcUrl: "https://rpc.example.org",
    worldEnvironment: "staging",
    relayerUrl: "http://localhost:8080",
  });

  it("accepts allowlisted hosts", () => {
    expect(isAllowed("https://rpc.example.org/v1", policy)).toBe(true);
    expect(isAllowed("https://rpc.example.org:9999/", policy)).toBe(true);
    expect(isAllowed(new URL("https://bridge.worldcoin.org/verify"), policy)).toBe(true);
    expect(isAllowed("http://localhost:8080/send", policy)).toBe(true);
  });

  it("rejects hosts outside the allowlist", () => {
    expect(isAllowed("https://evil.example.net", policy)).toBe(false);
    expect(isAllowed("https://rpc.example.org.evil.net", policy)).toBe(false);
    expect(isAllowed("https://user:pass@rpc.example.org", policy)).toBe(false);
  });

  it("rejects insecure or non-http protocols", () => {
    expect(isAllowed("http://rpc.example.org", policy)).toBe(false);
    expect(isAllowed("ws://rpc.example.org", policy)).toBe(false);
  });

  it("rejects malformed input and invalid policies", () => {
    expect(isAllowed("not a url", policy)).toBe(false);
    expect(isAllowed(42 as unknown as string, policy)).toBe(false);
    expect(isAllowed("https://rpc.example.org", null as unknown as NetworkPolicy)).toBe(false);
    expect(isAllowed("https://rpc.example.org", { hosts: "rpc.example.org" } as unknown as NetworkPolicy)).toBe(false);
  });
});

describe("isLoopbackHost", () => {
  it("recognises loopback hostnames case-insensitively", () => {
    expect(isLoopbackHost("localhost")).toBe(true);
    expect(isLoopbackHost("LOCALHOST")).toBe(true);
    expect(isLoopbackHost("127.0.0.1")).toBe(true);
    expect(isLoopbackHost("[::1]")).toBe(true);
    expect(isLoopbackHost("example.org")).toBe(false);
  });
});

describe("default policy", () => {
  it("is created lazily and memoised", () => {
    const first = getDefaultPolicy();
    expect(getDefaultPolicy()).toBe(first);
    expect(first.hosts).toContain("ethereum-sepolia-rpc.publicnode.com");
    expect(first.worldEnvironment).toBe("staging");
  });

  it("can be replaced and reset", () => {
    const custom = createPolicy({ rpcUrl: "https://rpc.example.org", worldEnvironment: "production" });
    setDefaultPolicy(custom);
    expect(getDefaultPolicy()).toBe(custom);
    setDefaultPolicy(undefined);
    expect(getDefaultPolicy()).not.toBe(custom);
  });
});
