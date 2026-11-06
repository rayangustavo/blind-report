import { ENS_KEYS, InvalidNewsroomNameError, isNewsroomName } from "@blind-report/core";
import { isAddress, zeroAddress, type Address, type Hex, type PublicClient } from "viem";
import { ETHRegistryAbi, PermissionedResolverAbi } from "./abis/index";
import { nodeForName } from "./dns";
import { EnsResolutionError } from "./errors";
import { parseNewsroomRecords, parsePublicKeyRecord } from "./records";
import type { NewsroomInfo } from "./types";

export type ReaderDeps = {
  viemClient: PublicClient;
  registryAddress: Address;
};

export type EnsReader = {
  resolveNewsroom(name: string): Promise<NewsroomInfo>;
  resolveReaderKey(subname: string): Promise<string>;
};

/** Cria um leitor ENSv2 que resolve redações e chaves de leitura de jornalistas. */
export function createReader(deps: ReaderDeps): EnsReader {
  if (typeof deps !== "object" || deps === null) throw new EnsResolutionError("reader dependencies are required");
  const { viemClient, registryAddress } = deps;
  if (typeof viemClient !== "object" || viemClient === null || typeof viemClient.readContract !== "function") {
    throw new EnsResolutionError("viemClient with readContract is required");
  }
  if (typeof registryAddress !== "string" || !isAddress(registryAddress)) {
    throw new EnsResolutionError("registryAddress must be a valid address");
  }

  async function resolverOf(name: string, node: Hex): Promise<Address> {
    const resolver = await viemClient.readContract({
      address: registryAddress,
      abi: ETHRegistryAbi,
      functionName: "resolver",
      args: [node],
    });
    if (typeof resolver !== "string" || !isAddress(resolver) || resolver.toLowerCase() === zeroAddress) {
      throw new EnsResolutionError(`name has no resolver: ${name}`);
    }
    return resolver as Address;
  }

  async function readText(resolver: Address, node: Hex, key: string): Promise<string> {
    const value = await viemClient.readContract({
      address: resolver,
      abi: PermissionedResolverAbi,
      functionName: "text",
      args: [node, key],
    });
    return typeof value === "string" ? value : "";
  }

  return {
    async resolveNewsroom(name: string): Promise<NewsroomInfo> {
      if (!isNewsroomName(name)) throw new InvalidNewsroomNameError(name);
      const node = nodeForName(name);
      const resolver = await resolverOf(name, node);
      const [key, version, policy, custodian] = await Promise.all([
        readText(resolver, node, ENS_KEYS.KEY),
        readText(resolver, node, ENS_KEYS.VERSION),
        readText(resolver, node, ENS_KEYS.POLICY),
        viemClient.readContract({
          address: registryAddress,
          abi: ETHRegistryAbi,
          functionName: "owner",
          args: [node],
        }),
      ]);
      return parseNewsroomRecords(name, {
        key,
        version,
        policy,
        custodianAddress: typeof custodian === "string" ? custodian : undefined,
      });
    },

    async resolveReaderKey(subname: string): Promise<string> {
      if (!isNewsroomName(subname)) throw new InvalidNewsroomNameError(subname);
      const node = nodeForName(subname);
      const resolver = await resolverOf(subname, node);
      const value = await readText(resolver, node, ENS_KEYS.READER_KEY);
      return parsePublicKeyRecord(value, ENS_KEYS.READER_KEY);
    },
  };
}
