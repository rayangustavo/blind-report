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
