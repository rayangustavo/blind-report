import type { Abi } from "viem";
import ETHRegistryJson from "./ETHRegistry.json";
import PermissionedResolverJson from "./PermissionedResolver.json";
import UserRegistryJson from "./UserRegistry.json";

/** ABIs mínimas da interface ENSv2 usada pelo Blind Report. */
export const ETHRegistryAbi = ETHRegistryJson as unknown as Abi;
export const PermissionedResolverAbi = PermissionedResolverJson as unknown as Abi;
export const UserRegistryAbi = UserRegistryJson as unknown as Abi;
