import { ENS_KEYS, serializePolicy, toBase64Url, type NewsroomPolicy } from "@blind-report/core";
import {
  decodeFunctionData,
  labelhash,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { describe, expect, it, vi } from "vitest";
import { PermissionedResolverAbi } from "../src/abis/index";
import { createAdmin } from "../src/admin";
import { nodeForName } from "../src/dns";
import { EnsAdminError } from "../src/errors";

const registryAddress = "0x2222222222222222222222222222222222222222" as Address;
const resolverAddress = "0x3333333333333333333333333333333333333333" as Address;
const custodian = "0x1111111111111111111111111111111111111111" as Address;
const publicKey = toBase64Url(new Uint8Array(32).fill(7));
const readerKey = toBase64Url(new Uint8Array(32).fill(9));
const policy: NewsroomPolicy = {
  version: 1,
  categories: ["corrupcao"],
  maxSizeBytes: 1_024,
  acceptsAttachments: true,
};
const hashes = Array.from({ length: 8 }, (_, index) => `0x${String(index + 1).padStart(64, "0")}` as Hex);

type WriteCall = { address: Address; functionName: string; args: readonly unknown[] };
type ReadCall = { address: Address; functionName: string; args: readonly unknown[] };

function setup(options: { owner?: unknown; account?: unknown } = {}) {
  const writes: WriteCall[] = [];
  const reads: ReadCall[] = [];
  const writeContract = vi.fn(async (call: WriteCall) => {
    writes.push(call);
    return hashes[writes.length - 1];
  });
  const readContract = vi.fn(async (call: ReadCall) => {
    reads.push(call);
    return "owner" in options ? options.owner : custodian;
  });
  const walletClient = {
    account: "account" in options ? options.account : { address: custodian },
    writeContract,
  } as unknown as WalletClient;
  const publicClient = { readContract } as unknown as PublicClient;
  const admin = createAdmin({ walletClient, publicClient, registryAddress, resolverAddress });
  return { admin, writes, reads, writeContract };
}

function decodeSetTexts(call: WriteCall): Array<{ node: Hex; key: string; value: string }> {
  const [batch] = call.args as [readonly Hex[]];
  return batch.map((data) => {
    const decoded = decodeFunctionData({ abi: PermissionedResolverAbi, data });
    expect(decoded.functionName).toBe("setText");
    const args = decoded.args as unknown as [Hex, string, string];
    return { node: args[0], key: args[1], value: args[2] };
  });
}

describe("createAdmin", () => {
  it("validates its dependencies", () => {
    expect(() => createAdmin(null as unknown as never)).toThrow(EnsAdminError);
    const base = {
      walletClient: { account: { address: custodian }, writeContract: vi.fn() } as unknown as WalletClient,
      publicClient: { readContract: vi.fn() } as unknown as PublicClient,
      registryAddress,
      resolverAddress,
    };
    expect(() => createAdmin({ ...base, walletClient: {} as never })).toThrow(/walletClient/);
    expect(() => createAdmin({ ...base, publicClient: {} as never })).toThrow(/publicClient/);
    expect(() => createAdmin({ ...base, registryAddress: "nope" as Address })).toThrow(/registryAddress/);
    expect(() => createAdmin({ ...base, resolverAddress: "nope" as Address })).toThrow(/resolverAddress/);
    expect(() =>
      createAdmin({ ...base, walletClient: { writeContract: vi.fn() } as unknown as WalletClient }),
    ).toThrow(/account/);
    expect(() =>
      createAdmin({
        ...base,
        walletClient: { account: { address: "nope" }, writeContract: vi.fn() } as unknown as WalletClient,
      }),
    ).toThrow(/account/);
  });

  it("creates a newsroom with registry, resolver and textual records", async () => {
    const { admin, writes } = setup();
    await expect(admin.createNewsroom("redacao.eth", publicKey, policy)).resolves.toBe(hashes[2]);

    expect(writes.map((call) => call.functionName)).toEqual(["setSubnodeOwner", "setResolver", "multicall"]);
    expect(writes[0]).toMatchObject({
      address: registryAddress,
      args: [nodeForName("eth"), labelhash("redacao"), custodian],
    });
    expect(writes[1]).toMatchObject({
      address: registryAddress,
      args: [nodeForName("redacao.eth"), resolverAddress],
    });
    expect(writes[2]?.address).toBe(resolverAddress);
    expect(decodeSetTexts(writes[2]!)).toEqual([
      { node: nodeForName("redacao.eth"), key: ENS_KEYS.KEY, value: publicKey },
      { node: nodeForName("redacao.eth"), key: ENS_KEYS.VERSION, value: "1" },
      { node: nodeForName("redacao.eth"), key: ENS_KEYS.POLICY, value: serializePolicy(policy) },
    ]);
  });

  it("rejects invalid newsrooms, keys and policies", async () => {
    const { admin, writeContract } = setup();
    await expect(admin.createNewsroom("redacao.com", publicKey, policy)).rejects.toThrow(/invalid newsroom name/);
    await expect(admin.createNewsroom("redacao.eth", "***", policy)).rejects.toThrow(/base64url/);
    await expect(admin.createNewsroom("redacao.eth", publicKey, { ...policy, maxSizeBytes: 0 })).rejects.toThrow();
    expect(writeContract).not.toHaveBeenCalled();
  });

  it("publishes a new key and version", async () => {
    const { admin, writes } = setup();
    const newKey = toBase64Url(new Uint8Array(32).fill(3));
    await expect(admin.publishKey("redacao.eth", newKey, 4)).resolves.toBe(hashes[0]);
    expect(writes).toHaveLength(1);
    expect(decodeSetTexts(writes[0]!)).toEqual([
      { node: nodeForName("redacao.eth"), key: ENS_KEYS.KEY, value: newKey },
      { node: nodeForName("redacao.eth"), key: ENS_KEYS.VERSION, value: "4" },
    ]);
  });

  it("rejects invalid keys and versions when publishing", async () => {
    const { admin, writeContract } = setup();
    await expect(admin.publishKey("redacao.com", publicKey, 2)).rejects.toThrow(/invalid newsroom name/);
    await expect(admin.publishKey("redacao.eth", publicKey, 0)).rejects.toThrow(/positive integer/);
    await expect(admin.publishKey("redacao.eth", publicKey, 1.5)).rejects.toThrow(/positive integer/);
    await expect(admin.publishKey("redacao.eth", "***", 2)).rejects.toThrow(/base64url/);
    expect(writeContract).not.toHaveBeenCalled();
  });

  it("adds a journalist subname without transferring ownership", async () => {
    const { admin, writes } = setup();
    await expect(admin.addJournalist("redacao.eth", "marina", readerKey)).resolves.toBe(hashes[2]);

    expect(writes.map((call) => call.functionName)).toEqual(["setSubnodeOwner", "setResolver", "multicall"]);
    expect(writes[0]).toMatchObject({
      address: registryAddress,
      args: [nodeForName("redacao.eth"), labelhash("marina"), custodian],
    });
    expect(writes[1]).toMatchObject({
      address: registryAddress,
      args: [nodeForName("marina.redacao.eth"), resolverAddress],
    });
    expect(decodeSetTexts(writes[2]!)).toEqual([
      { node: nodeForName("marina.redacao.eth"), key: ENS_KEYS.READER_KEY, value: readerKey },
    ]);
  });

  it("rejects invalid journalist labels and keys", async () => {
    const { admin, writeContract } = setup();
    for (const label of ["", "Marina", "ma.rina", "-marina", "a".repeat(64)]) {
      await expect(admin.addJournalist("redacao.eth", label, readerKey)).rejects.toThrow(/invalid journalist label/);
    }
    await expect(admin.addJournalist("redacao.eth", "marina", "***")).rejects.toThrow(/base64url/);
    await expect(admin.addJournalist("redacao.com", "marina", readerKey)).rejects.toThrow(/invalid newsroom name/);
    expect(writeContract).not.toHaveBeenCalled();
  });

  it("revokes a journalist by clearing records and deleting the subnode", async () => {
    const { admin, writes } = setup();
    await expect(admin.revokeJournalist("redacao.eth", "marina")).resolves.toBe(hashes[1]);

    expect(writes.map((call) => call.functionName)).toEqual(["multicall", "deleteSubnode"]);
    expect(writes[1]).toMatchObject({
      address: registryAddress,
      args: [nodeForName("redacao.eth"), labelhash("marina")],
    });
    const cleared = decodeSetTexts(writes[0]!);
    expect(cleared).toHaveLength(Object.keys(ENS_KEYS).length);
    for (const record of cleared) {
      expect(record.node).toBe(nodeForName("marina.redacao.eth"));
      expect(record.value).toBe("");
    }
    expect(new Set(cleared.map((record) => record.key))).toEqual(new Set(Object.values(ENS_KEYS)));
  });

  it("delegates the active journalist check to the registry", async () => {
    const { admin, reads } = setup();
    await expect(admin.isActiveJournalist("marina.redacao.eth")).resolves.toBe(true);
    expect(reads[0]).toMatchObject({
      address: registryAddress,
      functionName: "owner",
      args: [nodeForName("marina.redacao.eth")],
    });
    await expect(admin.isActiveJournalist("marina.com")).rejects.toThrow(/invalid newsroom name/);
  });
});
