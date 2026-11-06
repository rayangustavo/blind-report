import { zeroAddress, type Address, type PublicClient } from "viem";
import { describe, expect, it, vi } from "vitest";
import { isActiveJournalist } from "../src/authority";
import { nodeForName } from "../src/dns";
import { EnsAdminError } from "../src/errors";

const registryAddress = "0x2222222222222222222222222222222222222222" as Address;
const custodian = "0x1111111111111111111111111111111111111111" as Address;

function clientReturning(owner: unknown) {
  const readContract = vi.fn(async () => owner);
  return { client: { readContract } as unknown as PublicClient, readContract };
}

describe("isActiveJournalist", () => {
  it("validates its dependencies", async () => {
    await expect(isActiveJournalist(null as unknown as never, "marina.redacao.eth")).rejects.toThrow(EnsAdminError);
    await expect(
      isActiveJournalist({ publicClient: {} as never, registryAddress }, "marina.redacao.eth"),
    ).rejects.toThrow(/publicClient/);
    await expect(
      isActiveJournalist({ publicClient: clientReturning(custodian).client, registryAddress: "nope" as Address }, "marina.redacao.eth"),
    ).rejects.toThrow(/registryAddress/);
  });

  it("rejects invalid subnames before reading the registry", async () => {
    const { client, readContract } = clientReturning(custodian);
    await expect(
      isActiveJournalist({ publicClient: client, registryAddress }, "marina.com"),
    ).rejects.toThrow(/invalid newsroom name/);
    expect(readContract).not.toHaveBeenCalled();
  });

  it("returns true when the node has a non-zero owner", async () => {
    const { client, readContract } = clientReturning(custodian);
    await expect(isActiveJournalist({ publicClient: client, registryAddress }, "marina.redacao.eth")).resolves.toBe(true);
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: registryAddress,
        functionName: "owner",
        args: [nodeForName("marina.redacao.eth")],
      }),
    );
  });

  it("returns false when the node has no active owner", async () => {
    for (const owner of [zeroAddress, "not-an-address", null, 42]) {
      const { client } = clientReturning(owner);
      await expect(
        isActiveJournalist({ publicClient: client, registryAddress }, "marina.redacao.eth"),
      ).resolves.toBe(false);
    }
  });
});
