import { ENS_KEYS, serializePolicy, toBase64Url, type NewsroomPolicy } from "@blind-report/core";
import { vi } from "vitest";
import type { Address, PublicClient } from "viem";
import { describe, expect, it } from "vitest";
import { nodeForName } from "../src/dns";
import { EnsResolutionError } from "../src/errors";
import { createReader } from "../src/reader";

const registryAddress = "0x2222222222222222222222222222222222222222" as Address;
const resolverAddress = "0x3333333333333333333333333333333333333333" as Address;
const custodian = "0x1111111111111111111111111111111111111111" as Address;
const publicKey = toBase64Url(new Uint8Array(32).fill(7));
const policy: NewsroomPolicy = {
  version: 1,
  categories: ["corrupcao"],
  maxSizeBytes: 1_024,
  acceptsAttachments: true,
};

type ReadCall = { functionName: string; args: readonly unknown[] };

function mockClient(overrides: {
  resolver?: unknown;
  owner?: unknown;
  texts?: Record<string, string>;
  rejectWith?: Error;
} = {}) {
  const calls: ReadCall[] = [];
  const readContract = vi.fn(async (call: ReadCall) => {
    calls.push({ functionName: call.functionName, args: call.args });
    if (overrides.rejectWith !== undefined) throw overrides.rejectWith;
    if (call.functionName === "resolver") return "resolver" in overrides ? overrides.resolver : resolverAddress;
    if (call.functionName === "owner") return "owner" in overrides ? overrides.owner : custodian;
    if (call.functionName === "text") return overrides.texts?.[String(call.args[1])] ?? "";
    throw new Error(`unexpected call: ${call.functionName}`);
  });
  return { client: { readContract } as unknown as PublicClient, calls };
}

const validTexts = {
  [ENS_KEYS.KEY]: publicKey,
  [ENS_KEYS.VERSION]: "3",
  [ENS_KEYS.POLICY]: serializePolicy(policy),
  [ENS_KEYS.READER_KEY]: toBase64Url(new Uint8Array(32).fill(9)),
};

describe("createReader", () => {
  it("validates its dependencies", () => {
    expect(() => createReader(null as unknown as never)).toThrow(EnsResolutionError);
    expect(() => createReader({} as never)).toThrow(/viemClient/);
    expect(() => createReader({ viemClient: {} as never, registryAddress })).toThrow(/viemClient/);
    expect(() => createReader({ viemClient: mockClient().client, registryAddress: "nope" as Address })).toThrow(
      /registryAddress/,
    );
  });

  it("resolves a newsroom from ENS records", async () => {
    const { client, calls } = mockClient({ texts: validTexts });
    const reader = createReader({ viemClient: client, registryAddress });

    await expect(reader.resolveNewsroom("redacao.eth")).resolves.toEqual({
      name: "redacao.eth",
      publicKey,
      version: 3,
      policy,
      custodianAddress: custodian,
    });

    const resolverCall = calls.find((call) => call.functionName === "resolver");
    expect(resolverCall?.args).toEqual([nodeForName("redacao.eth")]);
    const textCalls = calls.filter((call) => call.functionName === "text");
    expect(textCalls.map((call) => call.args[1])).toEqual(
      expect.arrayContaining([ENS_KEYS.KEY, ENS_KEYS.VERSION, ENS_KEYS.POLICY]),
    );
    expect(calls.filter((call) => call.functionName === "owner")).toHaveLength(1);
  });

  it("resolves journalist reader keys from subnames", async () => {
    const { client, calls } = mockClient({ texts: validTexts });
    const reader = createReader({ viemClient: client, registryAddress });

    await expect(reader.resolveReaderKey("marina.redacao.eth")).resolves.toBe(validTexts[ENS_KEYS.READER_KEY]);
    expect(calls[0]).toEqual({ functionName: "resolver", args: [nodeForName("marina.redacao.eth")] });
    expect(calls[1]).toEqual({
      functionName: "text",
      args: [nodeForName("marina.redacao.eth"), ENS_KEYS.READER_KEY],
    });
  });

  it("rejects invalid names before touching the chain", async () => {
    const { client, calls } = mockClient({ texts: validTexts });
    const reader = createReader({ viemClient: client, registryAddress });

    await expect(reader.resolveNewsroom("redacao.com")).rejects.toThrow(/invalid newsroom name/);
    await expect(reader.resolveReaderKey("")).rejects.toThrow(/invalid newsroom name/);
    expect(calls).toHaveLength(0);
  });

  it("rejects names without a resolver", async () => {
    for (const resolver of [
      "0x0000000000000000000000000000000000000000",
      "not-an-address",
      null,
    ]) {
      const { client } = mockClient({ resolver, texts: validTexts });
      const reader = createReader({ viemClient: client, registryAddress });
      await expect(reader.resolveNewsroom("redacao.eth")).rejects.toThrow(/no resolver/);
    }
  });

  it("rejects names without a custodian", async () => {
    for (const owner of [
      "0x0000000000000000000000000000000000000000",
      undefined,
      42,
    ]) {
      const { client } = mockClient({ owner, texts: validTexts });
      const reader = createReader({ viemClient: client, registryAddress });
      await expect(reader.resolveNewsroom("redacao.eth")).rejects.toThrow(/custodian/);
    }
  });

  it("rejects incomplete or invalid records", async () => {
    const cases: Record<string, string>[] = [
      { ...validTexts, [ENS_KEYS.KEY]: "" },
      { ...validTexts, [ENS_KEYS.VERSION]: "zero" },
      { ...validTexts, [ENS_KEYS.POLICY]: "{}" },
    ];
    for (const texts of cases) {
      const { client } = mockClient({ texts });
      const reader = createReader({ viemClient: client, registryAddress });
      await expect(reader.resolveNewsroom("redacao.eth")).rejects.toBeInstanceOf(EnsResolutionError);
    }
  });

  it("rejects invalid reader keys", async () => {
    for (const key of ["", "***", toBase64Url(new Uint8Array(31))]) {
      const { client } = mockClient({ texts: { ...validTexts, [ENS_KEYS.READER_KEY]: key } });
      const reader = createReader({ viemClient: client, registryAddress });
      await expect(reader.resolveReaderKey("marina.redacao.eth")).rejects.toBeInstanceOf(EnsResolutionError);
    }
  });

  it("propagates RPC failures", async () => {
    const failure = new Error("rpc unavailable");
    const { client } = mockClient({ rejectWith: failure });
    const reader = createReader({ viemClient: client, registryAddress });
    await expect(reader.resolveNewsroom("redacao.eth")).rejects.toBe(failure);
  });
});
