import { describe, expect, it } from "vitest";
import { cspFor } from "../src/csp";
import { createPolicy } from "../src/policy";
import type { NetworkPolicy } from "../src/types";

describe("cspFor", () => {
  it("builds a strict CSP with every allowlisted host", () => {
    const policy = createPolicy({
      rpcUrl: "https://rpc.example.org",
      worldEnvironment: "staging",
      relayerUrl: "http://localhost:8080",
    });
    expect(cspFor(policy)).toBe(
      [
        "default-src 'self'",
        "connect-src 'self' http://localhost:* https://bridge.worldcoin.org:* https://developer.worldcoin.org:* https://localhost:* https://rpc.example.org:*",
        "base-uri 'none'",
        "form-action 'none'",
        "object-src 'none'",
      ].join("; "),
    );
  });

  it("normalises duplicates and casing", () => {
    const policy = {
      hosts: ["RPC.example.org", "rpc.example.org"],
      rpcUrl: "https://rpc.example.org",
      worldEnvironment: "staging",
    } as NetworkPolicy;
    expect(cspFor(policy)).toBe(
      "default-src 'self'; connect-src 'self' https://rpc.example.org:*; base-uri 'none'; form-action 'none'; object-src 'none'",
    );
  });
});
