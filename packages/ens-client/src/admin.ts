import {
  ENS_KEYS,
  InvalidNewsroomNameError,
  isNewsroomName,
  serializePolicy,
  type NewsroomPolicy,
} from "@blind-report/core";
import {
  encodeFunctionData,
  isAddress,
  labelhash,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
} from "viem";
import { ETHRegistryAbi, PermissionedResolverAbi } from "./abis/index";
import { isActiveJournalist } from "./authority";
import { nodeForName } from "./dns";
import { EnsAdminError } from "./errors";
import { parsePublicKeyRecord, parseVersionRecord } from "./records";

const LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export type AdminDeps = {
  walletClient: WalletClient;
  publicClient: PublicClient;
  registryAddress: Address;
  resolverAddress: Address;
};

export type EnsAdmin = {
  createNewsroom(name: string, initialKey: string, policy: NewsroomPolicy): Promise<Hash>;
  publishKey(name: string, newKey: string, newVersion: number): Promise<Hash>;
  addJournalist(newsroomName: string, journalistLabel: string, readerKey: string): Promise<Hash>;
  revokeJournalist(newsroomName: string, journalistLabel: string): Promise<Hash>;
  isActiveJournalist(subname: string): Promise<boolean>;
};

function parseLabel(label: string): string {
  if (typeof label !== "string" || label.length > 63 || !LABEL_PATTERN.test(label)) {
    throw new EnsAdminError(`invalid journalist label: ${String(label)}`);
  }
  return label;
}

function parseNewsroomName(name: string): string {
  if (!isNewsroomName(name)) throw new InvalidNewsroomNameError(name);
  return name;
}

/** Cria a administração ENSv2 de uma redação (registro, resolver e registros textuais). */
export function createAdmin(deps: AdminDeps): EnsAdmin {
  if (typeof deps !== "object" || deps === null) throw new EnsAdminError("admin dependencies are required");
  const { walletClient, publicClient, registryAddress, resolverAddress } = deps;
  if (typeof walletClient !== "object" || walletClient === null || typeof walletClient.writeContract !== "function") {
    throw new EnsAdminError("walletClient with writeContract is required");
  }
  if (typeof publicClient !== "object" || publicClient === null || typeof publicClient.readContract !== "function") {
    throw new EnsAdminError("publicClient with readContract is required");
  }
  if (typeof registryAddress !== "string" || !isAddress(registryAddress)) {
    throw new EnsAdminError("registryAddress must be a valid address");
  }
  if (typeof resolverAddress !== "string" || !isAddress(resolverAddress)) {
    throw new EnsAdminError("resolverAddress must be a valid address");
  }
  const account = walletClient.account;
  if (typeof account !== "object" || account === null || !isAddress(account.address)) {
    throw new EnsAdminError("walletClient must expose a valid account");
  }
  const owner: Address = account.address;

  function writeRegistry(functionName: "setSubnodeOwner" | "setResolver" | "deleteSubnode", args: readonly unknown[]) {
    return walletClient.writeContract({
      account: owner,
      chain: walletClient.chain ?? null,
      address: registryAddress,
      abi: ETHRegistryAbi,
      functionName,
      args,
    });
  }

  function writeResolver(data: readonly Hash[]) {
    return walletClient.writeContract({
      account: owner,
      chain: walletClient.chain ?? null,
      address: resolverAddress,
      abi: PermissionedResolverAbi,
      functionName: "multicall",
      args: [data],
    });
  }

  function setTextCalls(node: Hash, records: ReadonlyArray<readonly [string, string]>): Hash[] {
    return records.map(([key, value]) =>
      encodeFunctionData({
        abi: PermissionedResolverAbi,
        functionName: "setText",
        args: [node, key, value],
      }),
    );
  }

  function subnameOf(newsroomName: string, journalistLabel: string): { subname: string; subnode: Hash } {
    const label = parseLabel(journalistLabel);
    const subname = `${label}.${newsroomName}`;
    if (!isNewsroomName(subname)) throw new EnsAdminError(`invalid journalist subname: ${subname}`);
    return { subname, subnode: nodeForName(subname) };
  }

  return {
    async createNewsroom(name: string, initialKey: string, policy: NewsroomPolicy): Promise<Hash> {
      parseNewsroomName(name);
      const publicKey = parsePublicKeyRecord(initialKey, ENS_KEYS.KEY);
      const serializedPolicy = serializePolicy(policy);
      const node = nodeForName(name);
      const parentNode = nodeForName(name.split(".").slice(1).join("."));
      const label = name.split(".")[0] ?? "";

      await writeRegistry("setSubnodeOwner", [parentNode, labelhash(label), owner]);
      await writeRegistry("setResolver", [node, resolverAddress]);
      return writeResolver(
        setTextCalls(node, [
          [ENS_KEYS.KEY, publicKey],
          [ENS_KEYS.VERSION, "1"],
          [ENS_KEYS.POLICY, serializedPolicy],
        ]),
      );
    },

    async publishKey(name: string, newKey: string, newVersion: number): Promise<Hash> {
      parseNewsroomName(name);
      const publicKey = parsePublicKeyRecord(newKey, ENS_KEYS.KEY);
      const version = parseVersionRecord(String(newVersion));
      const node = nodeForName(name);
      return writeResolver(
        setTextCalls(node, [
          [ENS_KEYS.KEY, publicKey],
          [ENS_KEYS.VERSION, String(version)],
        ]),
      );
    },

    async addJournalist(newsroomName: string, journalistLabel: string, readerKey: string): Promise<Hash> {
      parseNewsroomName(newsroomName);
      const publicKey = parsePublicKeyRecord(readerKey, ENS_KEYS.READER_KEY);
      const { subnode } = subnameOf(newsroomName, journalistLabel);
      const label = parseLabel(journalistLabel);

      await writeRegistry("setSubnodeOwner", [nodeForName(newsroomName), labelhash(label), owner]);
      await writeRegistry("setResolver", [subnode, resolverAddress]);
      return writeResolver(setTextCalls(subnode, [[ENS_KEYS.READER_KEY, publicKey]]));
    },

    async revokeJournalist(newsroomName: string, journalistLabel: string): Promise<Hash> {
      parseNewsroomName(newsroomName);
      const { subnode } = subnameOf(newsroomName, journalistLabel);
      const label = parseLabel(journalistLabel);

      await writeResolver(
        setTextCalls(
          subnode,
          Object.values(ENS_KEYS).map((key) => [key, ""] as const),
        ),
      );
      return writeRegistry("deleteSubnode", [nodeForName(newsroomName), labelhash(label)]);
    },

    async isActiveJournalist(subname: string): Promise<boolean> {
      return isActiveJournalist({ publicClient, registryAddress }, subname);
    },
  };
}
