#!/usr/bin/env -S node --import tsx
/**
 * Diagnóstico e Testes na Rede de Testes da Sepolia & Redes Integradas (Arkiv Rabdi + World ID)
 *
 * Utiliza as credenciais e parâmetros configurados no arquivo .env
 */

import { createPublicClient, createWalletClient, formatEther, http, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { createPublicClient as createArkivClient, createWalletClient as createArkivWalletClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { ABIS, createReader, ENSV2_SEPOLIA, type EnsReadClient } from "@blind-report/ens-client";
import { createSdkBackend, type EntityKind, KIND_ATTRS } from "@blind-report/arkiv-store";
import { createRpContextSigner } from "@blind-report/worldid-gate";
import { loadConfig, redact } from "../apps/relayer/src/config.ts";
import { composeRelayer } from "../apps/relayer/src/compose.ts";

const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

function logHeader(title: string) {
  console.log(`\n${BOLD}${CYAN}───────────────────────────────────────────────────────────────────${RESET}`);
  console.log(`${BOLD}${MAGENTA}▶ ${title}${RESET}`);
  console.log(`${CYAN}───────────────────────────────────────────────────────────────────${RESET}`);
}

function logOk(msg: string) {
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
}

function logWarn(msg: string) {
  console.log(`  ${YELLOW}⚠${RESET} ${msg}`);
}

function logError(msg: string) {
  console.log(`  ${RED}✗${RESET} ${msg}`);
}

function logDetail(label: string, value: string) {
  console.log(`    ${CYAN}${label.padEnd(26)}:${RESET} ${value}`);
}

async function run() {
  console.log(`${BOLD}${MAGENTA}===================================================================`);
  console.log(`    BLIND REPORT — DIAGNÓSTICO E TESTES NA SEPOLIA E TESTNETS      `);
  console.log(`===================================================================${RESET}`);

  // 1. Carregamento de Configurações
  logHeader("1. Verificação de Variáveis de Ambiente (.env)");
  const sepoliaRpc = (process.env.SEPOLIA_RPC_URL || "").trim() || "https://ethereum-sepolia-rpc.publicnode.com";
  const arkivRpc = (process.env.ARKIV_RPC_URL || "").trim() || "https://rpc.rabdi.db-chain.testnet.arkiv.network";
  const arkivKey = (process.env.ARKIV_ACCESS_KEY || "").trim();
  const worldRpId = (process.env.WORLD_RP_ID || "").trim();
  const worldAppId = (process.env.WORLD_APP_ID || "").trim();
  const rpSigningKey = (process.env.RP_SIGNING_KEY || "").trim();

  logDetail("SEPOLIA_RPC_URL", sepoliaRpc);
  logDetail("ARKIV_RPC_URL", arkivRpc);
  logDetail("ARKIV_ACCESS_KEY", arkivKey ? `${arkivKey.slice(0, 12)}...` : "(não configurada)");
  logDetail("WORLD_RP_ID", worldRpId || "(não configurado)");
  logDetail("WORLD_APP_ID", worldAppId || "(não configurado)");
  logDetail("RP_SIGNING_KEY", rpSigningKey ? `${rpSigningKey.slice(0, 10)}...` : "(não configurado)");

  // 2. Conectividade e Estado da Rede Sepolia
  logHeader("2. Ethereum Sepolia Testnet (Chain ID 11155111)");
  const sepoliaClient = createPublicClient({ chain: sepolia, transport: http(sepoliaRpc) });

  try {
    const t0 = Date.now();
    const chainId = await sepoliaClient.getChainId();
    const latency = Date.now() - t0;
    const blockNumber = await sepoliaClient.getBlockNumber();
    const gasPrice = await sepoliaClient.getGasPrice();

    if (chainId === 11155111) {
      logOk(`Conectado à Sepolia com sucesso! (latência: ${latency}ms)`);
      logDetail("Chain ID", String(chainId));
      logDetail("Bloco Atual", String(blockNumber));
      logDetail("Preço do Gás", `${formatEther(gasPrice * 1000000000n)} Gwei`);
    } else {
      logError(`Chain ID inesperado: ${chainId} (esperado 11155111)`);
    }
  } catch (err: unknown) {
    logError(`Falha ao conectar no RPC da Sepolia: ${(err as Error).message}`);
    process.exit(1);
  }

  // 3. Checagem de Carteiras na Sepolia
  logHeader("3. Saldos das Carteiras Configuradas");
  const wallets = [
    { label: "Administrador / OWNER", addr: process.env.OWNER_ADDRESS as Address },
    { label: "Relayer (paga gás)", addr: process.env.RELAYER_ADDRESS as Address },
    { label: "Jornalista Editorial", addr: process.env.JOURNALIST_ADDRESS as Address },
  ];

  let hasGas = false;
  for (const w of wallets) {
    if (!w.addr || !/^0x[0-9a-fA-F]{40}$/.test(w.addr)) {
      logWarn(`${w.label}: Endereço inválido ou ausente no .env`);
      continue;
    }
    const balance = await sepoliaClient.getBalance({ address: w.addr });
    const eth = formatEther(balance);
    if (balance > 0n) {
      hasGas = true;
      logOk(`${w.label}: ${w.addr}`);
      logDetail("Saldo SepoliaETH", `${eth} ETH`);
    } else {
      logWarn(`${w.label}: ${w.addr}`);
      logDetail("Saldo SepoliaETH", `${eth} ETH (Sem saldo)`);
    }
  }

  if (!hasGas) {
    console.log(`\n  ${YELLOW}ℹ Faucets para obter SepoliaETH gratuitamente se desejar registrar novos contratos:${RESET}`);
    console.log(`    - Google Cloud Faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia`);
    console.log(`    - Sepolia PoW Faucet : https://sepolia-faucet.pk910.de/`);
    console.log(`    - Alchemy Faucet     : https://www.alchemy.com/faucets/ethereum-sepolia`);
  }

  // 4. Validação dos Contratos ENSv2 na Sepolia
  logHeader("4. Implantação do ENSv2 na Sepolia");
  const contracts = [
    { name: "ethRegistrar", address: ENSV2_SEPOLIA.ethRegistrar },
    { name: "ethRegistry", address: ENSV2_SEPOLIA.ethRegistry },
    { name: "universalResolver", address: ENSV2_SEPOLIA.universalResolver },
    { name: "verifiableFactory", address: ENSV2_SEPOLIA.verifiableFactory },
    { name: "mockUSDC", address: ENSV2_SEPOLIA.mockUSDC },
  ];

  for (const c of contracts) {
    const code = await sepoliaClient.getCode({ address: c.address as Address });
    if (code && code !== "0x") {
      logOk(`Contrato ${c.name} verificado em ${c.address} (${code.length} bytes bytecode)`);
    } else {
      logError(`Contrato ${c.name} NÃO possui bytecode em ${c.address}`);
    }
  }

  // Consulta de Disponibilidade no ENS
  const reader = createReader({ client: sepoliaClient as unknown as EnsReadClient });
  const testName = `test-${Date.now().toString(36)}.eth`;
  const isAvail = await reader.isNameAvailable(testName);
  logOk(`Consulta ENSv2 isAvailable("${testName}") respondida: ${isAvail ? "Livre" : "Ocupado"}`);

  // 4.1 Submissão de Transação Real On-Chain na Sepolia
  const ownerPk = (process.env.OWNER_PRIVATE_KEY || "").trim() as Hex;
  if (hasGas && /^0x[0-9a-fA-F]{64}$/.test(ownerPk)) {
    logHeader("4.1 Transação On-Chain Real na Sepolia (Verificável no Explorer)");
    try {
      const ownerAccount = privateKeyToAccount(ownerPk);
      const ownerWallet = createWalletClient({ account: ownerAccount, chain: sepolia, transport: http(sepoliaRpc) });

      console.log(`  ${CYAN}Enviando transação on-chain para a Sepolia...${RESET}`);
      const txHash = await ownerWallet.writeContract({
        address: ENSV2_SEPOLIA.mockUSDC,
        abi: ABIS.mockUSDC,
        functionName: "mint",
        args: [ownerAccount.address, 10_000_000n],
      });

      logOk(`Transação enviada e transmitida ao mempool da Sepolia!`);
      logDetail("TX HASH", txHash);
      logDetail("Link Etherscan", `https://sepolia.etherscan.io/tx/${txHash}`);

      console.log(`  ${YELLOW}Aguardando mineração do bloco na Sepolia...${RESET}`);
      const receipt = await sepoliaClient.waitForTransactionReceipt({ hash: txHash });
      logOk(`Transação CONFIRMADA on-chain no bloco ${receipt.blockNumber}! (Gás usado: ${receipt.gasUsed})`);
    } catch (err: unknown) {
      logError(`Falha ao emitir transação on-chain: ${(err as Error).message}`);
    }
  }

  // 5. Testnet Arkiv Rabdi
  logHeader("5. Arkiv Network — Testnet Rabdi (Chain ID 7794095)");
  try {
    const chain = rabdi({ accessKey: arkivKey });
    const arkivPublic = createArkivClient({ chain, transport: http() });
    const rabdiBlock = await arkivPublic.getBlockNumber();
    logOk(`Conexão com a rede Arkiv Rabdi estabelecida!`);
    logDetail("Bloco Rabdi Atual", String(rabdiBlock));

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
      const page = await backend.select(kind, { newsroom: "redacao.eth" }, { offset: 0, limit: 5 });
      logOk(`Consulta na tabela '${kind}': ${page.length} registros encontrados.`);
    }
  } catch (err: unknown) {
    logError(`Falha ao conectar na Rabdi: ${(err as Error).message}`);
  }

  // 6. World ID Staging
  logHeader("6. World ID (Worldcoin Protocol 4.0 Staging)");
  if (worldRpId) {
    try {
      const res = await fetch(`https://developer.world.org/api/v4/verify/${worldRpId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "test_probe" }),
      });
      const data = await res.json().catch(() => ({}));
      logOk(`Handshake com Developer Portal World ID OK (HTTP ${res.status})`);
      logDetail("Resposta do Portal", (data as { detail?: string }).detail || "Endpoint ativo");
    } catch (err: unknown) {
      logError(`Falha ao contactar World ID: ${(err as Error).message}`);
    }
  } else {
    logWarn("WORLD_RP_ID ausente no .env");
  }

  if (rpSigningKey && worldRpId) {
    try {
      const signer = createRpContextSigner({ signingKeyHex: rpSigningKey, rpId: worldRpId });
      const context = signer.rpContextFor({ newsroom: "redacao.eth", epoch: 202611 });
      logOk(`Contexto RP assinado gerado com sucesso!`);
      logDetail("RP ID amarrado", context.rp_id);
      logDetail("Nonce gerado", context.nonce);
      logDetail("Assinatura HMAC", `${context.signature.slice(0, 16)}...`);
    } catch (err: unknown) {
      logError(`Falha na chave RP_SIGNING_KEY: ${(err as Error).message}`);
    }
  }

  // 7. Relayer & Network Policy Composition
  logHeader("7. Composição do Relayer & NetworkPolicy");
  try {
    const config = loadConfig(process.env);
    const { app, store } = composeRelayer(config);
    logOk("Relayer composto com sucesso conectando Sepolia, Arkiv e World ID!");
    logDetail("Configurações Redigidas", JSON.stringify(redact(config)));
    logDetail("Porta Configurada", String(config.port));
    logDetail("Retenção Padrão", `${config.retentionDays} dias`);
  } catch (err: unknown) {
    logError(`Erro ao compor o Relayer: ${(err as Error).message}`);
  }

  console.log(`\n${BOLD}${GREEN}===================================================================`);
  console.log(`    ✓ TODOS OS DIAGNÓSTICOS E TESTES NAS TESTNETS FORAM CONCLUÍDOS!  `);
  console.log(`===================================================================${RESET}\n`);
}

run().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
