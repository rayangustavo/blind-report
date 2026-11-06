import { InvalidNewsroomNameError, isNewsroomName } from "@blind-report/core";
import { isAddress, zeroAddress, type Address, type PublicClient } from "viem";
import { ETHRegistryAbi } from "./abis/index";
import { nodeForName } from "./dns";
import { EnsAdminError } from "./errors";

export type AuthorityDeps = {
  publicClient: PublicClient;
  registryAddress: Address;
};

/** Confere se o nó do subname possui dono ativo (não nulo) no ETHRegistry. */
export async function isActiveJournalist(deps: AuthorityDeps, subname: string): Promise<boolean> {
  if (typeof deps !== "object" || deps === null) throw new EnsAdminError("authority dependencies are required");
  const { publicClient, registryAddress } = deps;
  if (typeof publicClient !== "object" || publicClient === null || typeof publicClient.readContract !== "function") {
    throw new EnsAdminError("publicClient with readContract is required");
  }
  if (typeof registryAddress !== "string" || !isAddress(registryAddress)) {
    throw new EnsAdminError("registryAddress must be a valid address");
  }
  if (!isNewsroomName(subname)) throw new InvalidNewsroomNameError(subname);

  const owner = await publicClient.readContract({
    address: registryAddress,
    abi: ETHRegistryAbi,
    functionName: "owner",
    args: [nodeForName(subname)],
  });
  return typeof owner === "string" && isAddress(owner) && owner.toLowerCase() !== zeroAddress;
}

export type AuthorityReader = {
  resolveNewsroom(name: string): Promise<{ custodianAddress?: Address; custodian?: Address }>;
  journalistOwner?(name: string): Promise<Address | null>;
};

export type AuthorityArgs = { reader: AuthorityReader; newsroom: string };

/**
 * Decide se uma assinatura veio do custodiante da redação ou de um jornalista
 * subnome ativo. A consulta é feita no momento da leitura (o ENS manda).
 */
export function createAuthority(deps: AuthorityArgs): {
  isAuthorized: (args: { creator: Address; authorName?: string }) => Promise<boolean>;
} {
  if (typeof deps !== "object" || deps === null || typeof deps.reader !== "object" || deps.reader === null) {
    throw new EnsAdminError("authority dependencies are required");
  }
  return {
    async isAuthorized({ creator, authorName }: { creator: Address; authorName?: string }): Promise<boolean> {
      if (typeof creator !== "string" || !isAddress(creator)) return false;
      const info = await deps.reader.resolveNewsroom(deps.newsroom);
      const custodian = info.custodianAddress ?? info.custodian;
      if (typeof custodian === "string" && isAddress(custodian) && custodian.toLowerCase() === creator.toLowerCase()) {
        return true;
      }
      if (typeof authorName === "string" && typeof deps.reader.journalistOwner === "function") {
        const owner = await deps.reader.journalistOwner(authorName);
        if (typeof owner === "string" && isAddress(owner) && owner.toLowerCase() === creator.toLowerCase()) return true;
      }
      return false;
    },
  };
}
