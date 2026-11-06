import { describe, expect, it } from "vitest";
import { createPublicClient, createWalletClient, http, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";
import { createPublicClient as createArkivClient, createWalletClient as createArkivWalletClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { ABIS, createReader, ENSV2_SEPOLIA, type EnsReadClient } from "@blind-report/ens-client";
import { createSdkBackend, type EntityKind } from "@blind-report/arkiv-store";
import { createRpContextSigner } from "@blind-report/worldid-gate";
import { isAllowed } from "@blind-report/network-policy";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { loadConfig } from "../../apps/relayer/src/config.ts";
import { composeRelayer } from "../../apps/relayer/src/compose.ts";

const sepoliaRpc = (process.env.SEPOLIA_RPC_URL || "").trim() || "https://ethereum-sepolia-rpc.publicnode.com";
const arkivKey = (process.env.ARKIV_ACCESS_KEY || "").trim();
const worldRpId = (process.env.WORLD_RP_ID || "").trim();
const worldAppId = (process.env.WORLD_APP_ID || "").trim();
const rpSigningKey = (process.env.RP_SIGNING_KEY || "").trim();

describe("🌐 Sepolia & Testnets Live Integration Suite", () => {
  it("conecta na rede de testes da Sepolia e valida Chain ID 11155111", async () => {
    const client = createPublicClient({ chain: sepolia, transport: http(sepoliaRpc) });
    const chainId = await client.getChainId();
    expect(chainId).toBe(11155111);

    const blockNumber = await client.getBlockNumber();
    expect(blockNumber).toBeGreaterThan(12_000_000n);
  });

  it("verifica a implantação dos contratos ENSv2 na Sepolia", async () => {
    const client = createPublicClient({ chain: sepolia, transport: http(sepoliaRpc) });

    const contracts = [
      ENSV2_SEPOLIA.ethRegistrar,
      ENSV2_SEPOLIA.ethRegistry,
      ENSV2_SEPOLIA.universalResolver,
      ENSV2_SEPOLIA.verifiableFactory,
      ENSV2_SEPOLIA.mockUSDC,
    ];

    for (const address of contracts) {
      const code = await client.getCode({ address: address as Address });
      expect(code).toBeDefined();
      expect(code).not.toBe("0x");
      expect(code!.length).toBeGreaterThan(100);
    }
  });

  it("consulta disponibilidade de nomes via ENSv2 Universal Resolver na Sepolia", async () => {
    const client = createPublicClient({ chain: sepolia, transport: http(sepoliaRpc) });
    const reader = createReader({ client: client as unknown as EnsReadClient });

    const uniqueLabel = `br-test-${Date.now().toString(36)}.eth`;
    const isAvail = await reader.isNameAvailable(uniqueLabel);
    expect(isAvail).toBe(true);
  });

  it("conecta à rede de testes Arkiv Rabdi e obtém o bloco atual", async () => {
    const chain = rabdi({ accessKey: arkivKey });
    const arkivPublic = createArkivClient({ chain, transport: http() });

    const block = await arkivPublic.getBlockNumber();
    expect(block).toBeGreaterThan(200_000n);
  });

  it("executa consultas de leitura no Arkiv Rabdi nas tabelas do Blind Report", async () => {
    const chain = rabdi({ accessKey: arkivKey });
    const arkivPublic = createArkivClient({ chain, transport: http() });
    const relayerKey = (process.env.RELAYER_PRIVATE_KEY || "").trim();
    const account = privateKeyToAccount(
      /^0x[0-9a-fA-F]{64}$/.test(relayerKey) ? (relayerKey as Address) : generatePrivateKey()
    );
    const arkivWallet = createArkivWalletClient({ chain, transport: http(), account });

    const backend = createSdkBackend({
      publicClient: arkivPublic as never,
      walletClient: arkivWallet as never,
    });

    const kinds: EntityKind[] = ["denuncia", "resposta", "anotacao"];
    for (const kind of kinds) {
      const results = await backend.select(kind, { newsroom: "redacao.eth" }, { offset: 0, limit: 10 });
      expect(Array.isArray(results)).toBe(true);
    }
  });

  it("valida handshake com Developer Portal do World ID Staging e assinatura RP", async () => {
    expect(worldRpId).toMatch(/^rp_[a-zA-Z0-9]+$/);
    expect(worldAppId).toMatch(/^app_[a-zA-Z0-9]+$/);

    const res = await fetch(`https://developer.world.org/api/v4/verify/${worldRpId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "test-probe" }),
    });

    // O portal retorna 400 Bad Request ("responses array is required") confirmando que o endpoint está vivo e ativo
    expect(res.status).toBe(400);

    const signer = createRpContextSigner({ signingKeyHex: rpSigningKey, rpId: worldRpId });
    const context = signer.rpContextFor({ newsroom: "redacao.eth", epoch: 202611 });
    expect(context.rp_id).toBe(worldRpId);
    expect(context.nonce).toMatch(/^0x[0-9a-fA-F]+/);
    expect(context.signature).toMatch(/^0x[0-9a-fA-F]+/);
  });

  it("compõe a aplicação completa do Relayer sob a NetworkPolicy real", () => {
    const config = loadConfig(process.env);
    const composed = composeRelayer(config);

    expect(composed.app).toBeDefined();
    expect(composed.store).toBeDefined();
    expect(composed.backend).toBeDefined();
    expect(isAllowed(config.networkPolicy, "https://developer.world.org/api/v4/verify")).toBe(true);
    expect(isAllowed(config.networkPolicy, "https://ethereum-sepolia-rpc.publicnode.com")).toBe(true);
    expect(isAllowed(config.networkPolicy, "https://rpc.rabdi.db-chain.testnet.arkiv.network")).toBe(true);
  });

  it("submete transação on-chain real na Sepolia e confirma no Etherscan", async () => {
    const pk = (process.env.OWNER_PRIVATE_KEY || "").trim() as Hex;
    expect(pk).toMatch(/^0x[0-9a-fA-F]{64}$/);

    const account = privateKeyToAccount(pk);
    const client = createPublicClient({ chain: sepolia, transport: http(sepoliaRpc) });
    const wallet = createWalletClient({ account, chain: sepolia, transport: http(sepoliaRpc) });

    const balance = await client.getBalance({ address: account.address });
    expect(balance).toBeGreaterThan(10_000_000_000_000_000n);

    // Submete transação real de mint no contrato mockUSDC da ENSv2
    const hash = await wallet.writeContract({
      address: ENSV2_SEPOLIA.mockUSDC,
      abi: ABIS.mockUSDC,
      functionName: "mint",
      args: [account.address, 10_000_000n],
    });

    expect(hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    console.log(`\n  🔗 Transação On-Chain na Sepolia: https://sepolia.etherscan.io/tx/${hash}`);

    // Aguarda mineração e confirmação no bloco da Sepolia
    const receipt = await client.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe("success");
    expect(receipt.blockNumber).toBeGreaterThan(12_000_000n);
  });
});
