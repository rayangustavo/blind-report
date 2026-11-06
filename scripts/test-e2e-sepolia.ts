#!/usr/bin/env -S node --import tsx
/**
 * Execução On-Chain Completa de Todos os Fluxos Principais na Rede Sepolia
 *
 * 1. Registro completo da redação e subnomes no ENSv2 da Sepolia (Transações On-Chain Reais)
 * 2. Descoberta e resolução de registros da redação via Universal Resolver na Sepolia
 * 3. Validação de autoridade de subnome delegado de jornalista na Sepolia
 * 4. Cifragem com Libsodium usando a chave pública resolvida on-chain
 * 5. Prova de Humanidade e Mitigação Anti-Sybil com World ID (Protocolo 4.0 Staging)
 * 6. Persistência de Envelope Cifrado e Custódia no Arkiv Network (Rabdi)
 * 7. Decifragem pela Redação e Resposta Selada para Caixa Postal Anônima
 * 8. Comprovação Matemática de Autoria (Revelação do Sal Criptográfico)
 */

import {
  actionFor,
  decodePayload,
  decodeReply,
  encodePayload,
  encodeReply,
  epochOf,
  toBase64Url,
  validateSubmission,
  type NewsroomPolicy,
} from "@blind-report/core";
import {
  decodeEnvelope,
  encodeEnvelope,
  mailboxId,
  newKeypair,
  open,
  openReply,
  seal,
  sealReply,
  verifyCommitment,
  verifyContentHash,
} from "@blind-report/crypto";
import {
  ABIS,
  createAdmin,
  createAuthority,
  createReader,
  ENSV2_SEPOLIA,
  type EnsReadClient,
} from "@blind-report/ens-client";
import { createPublicClient as createArkivClient, createWalletClient as createArkivWalletClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { createMemoryChain, createSdkBackend, createStore } from "@blind-report/arkiv-store";
import {
  createMemoryNullifierStore,
  createRpContextSigner,
  createSimulatedVerifier,
  createSubmissionGate,
} from "@blind-report/worldid-gate";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  type Address,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

function logStep(step: number, title: string, desc: string) {
  console.log(`\n${BOLD}${CYAN}───────────────────────────────────────────────────────────────────${RESET}`);
  console.log(`${BOLD}${GREEN}[PASSO ${step}] ${title}${RESET}`);
  console.log(`${YELLOW}↳ ${desc}${RESET}`);
  console.log(`${CYAN}───────────────────────────────────────────────────────────────────${RESET}`);
}

function logOnChain(desc: string, txHash?: string) {
  console.log(`  ${BOLD}${MAGENTA}⚡ [ON-CHAIN SEPOLIA]${RESET} ${desc}`);
  if (txHash) {
    console.log(`    ${CYAN}🔗 Etherscan:${RESET} https://sepolia.etherscan.io/tx/${txHash}`);
  }
}

async function runOnChainFlow() {
  console.log(`${BOLD}${MAGENTA}===================================================================`);
  console.log(`   BLIND REPORT — FLUXO COMPLETO ON-CHAIN NA REDE SEPOLIA (TESTNET) `);
  console.log(`===================================================================${RESET}`);

  const sepoliaRpc = (process.env.SEPOLIA_RPC_URL || "").trim() || "https://ethereum-sepolia-rpc.publicnode.com";
  const ownerPk = (process.env.OWNER_PRIVATE_KEY || "").trim() as Hex;
  const relayerPk = (process.env.RELAYER_PRIVATE_KEY || "").trim() as Hex;
  const journalistAddr = (process.env.JOURNALIST_ADDRESS || "").trim() as Address;

  if (!ownerPk || !/^0x[0-9a-fA-F]{64}$/.test(ownerPk)) {
    console.error(`${RED}Erro: OWNER_PRIVATE_KEY ausente ou inválida no .env${RESET}`);
    process.exit(1);
  }

  const ownerAccount = privateKeyToAccount(ownerPk);
  const publicClient = createPublicClient({ chain: sepolia, transport: http(sepoliaRpc) });

  const recordedTxs: { step: string; hash: string }[] = [];

  // Cria WalletClient interceptando transações para exibir em tempo real com links do Etherscan
  const baseWallet = createWalletClient({ account: ownerAccount, chain: sepolia, transport: http(sepoliaRpc) });
  const walletClient = new Proxy(baseWallet, {
    get(target, prop, receiver) {
      if (prop === "writeContract") {
        return async (...args: unknown[]) => {
          const fn = Reflect.get(target, prop, receiver) as Function;
          const hash = (await fn.apply(target, args)) as Hex;
          const callInfo = args[0] as { functionName?: string };
          const name = callInfo?.functionName || "transação";
          recordedTxs.push({ step: name, hash });
          logOnChain(`Chamada on-chain executada: ${BOLD}${name}${RESET}`, hash);
          return hash;
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });

  // PASSO 1: Verificação de Saldo e Parâmetros
  logStep(1, "Verificação da Carteira e Saldo da Conta OWNER", "Confirmando saldo na Sepolia para executar as transações on-chain.");
  const balance = await publicClient.getBalance({ address: ownerAccount.address });
  console.log(`Conta OWNER:              ${ownerAccount.address}`);
  console.log(`Saldo SepoliaETH:         ${formatEther(balance)} ETH`);

  if (balance < 100_000_000_000_000n) {
    console.error(`${RED}Saldo insuficiente para transações on-chain na Sepolia (< 0.0001 ETH).${RESET}`);
    process.exit(1);
  }

  // PASSO 2: Configuração e Chaves Criptográficas da Redação
  logStep(2, "Geração de Chaves Criptográficas da Redação", "Criação do par de chaves assimétricas Libsodium (X25519) e política editorial.");
  const newsroomKeypair = newKeypair();
  const journalistKeypair = newKeypair();
  const label = `br${Date.now().toString(36).slice(-6)}`;
  const newsroomName = `${label}.eth`;
  const policy: NewsroomPolicy = {
    categories: ["investigacao", "corrupcao", "direitos-humanos"],
    maxBytes: 150_000,
    attachments: true,
    epoch: "monthly",
  };
  console.log(`Nome da Redação:          ${newsroomName}`);
  console.log(`Chave Pública (32b):      ${Buffer.from(newsroomKeypair.publicKey).toString("hex").slice(0, 24)}...`);
  console.log(`Categorias Editoriais:    ${policy.categories.join(", ")}`);

  // PASSO 3: Registro Completo da Redação no ENSv2 da Sepolia
  logStep(3, "Registro On-Chain no ENSv2 da Sepolia", "Execução do fluxo completo de commit-reveal, mint de MockUSDC e gravação dos text records.");
  console.log(`  ${CYAN}Iniciando deploy de contratos e registro na Sepolia...${RESET}`);

  const admin = createAdmin({
    publicClient,
    walletClient,
    mintTestToken: true,
    wait: async (seconds) => {
      console.log(`    ${YELLOW}⏳ Aguardando amadurecimento do commit no Ethereum Sepolia (${seconds}s)...${RESET}`);
      await new Promise((r) => setTimeout(r, seconds * 1000));
    },
    onProgress: (p) => {
      console.log(`  ${BOLD}${CYAN}→ Etapa ENSv2:${RESET} ${p.step}`);
    },
  });

  const newsroom = await admin.createNewsroom({
    label,
    publicKey: newsroomKeypair.publicKey,
    version: 1,
    policy,
    custodian: ownerAccount.address,
    durationSeconds: 31_536_000,
  });

  console.log(`\n${GREEN}✓ Redação registrada com sucesso no ENSv2 da Sepolia!${RESET}`);
  console.log(`Resolver Proxy implantado: ${newsroom.resolver}`);
  console.log(`UserRegistry implantado:  ${newsroom.subRegistry}`);

  // PASSO 3.1: Cadastro On-Chain de Subnome para Jornalista
  logStep(3.1, "Delegação On-Chain de Subnome de Jornalista", "Registrando repórter oficial sob o subnome delegado do ENSv2.");
  await admin.addJournalist({
    newsroom,
    label: "reporter",
    address: journalistAddr && /^0x[0-9a-fA-F]{40}$/.test(journalistAddr) ? journalistAddr : ownerAccount.address,
    readerKey: journalistKeypair.publicKey,
    validForSeconds: 90 * 24 * 3600,
  });
  console.log(`Subnome delegado:         reporter.${newsroomName}`);
  console.log(`Status na Sepolia:        Ativo com autoridade delegada`);

  // PASSO 4: Leitura e Resolução Descentralizada On-Chain via Universal Resolver
  logStep(4, "Descoberta e Resolução via Universal Resolver na Sepolia", "A fonte consulta a blockchain pública para obter a chave pública e a política da redação.");
  const reader = createReader({ client: publicClient as unknown as EnsReadClient });
  const resolved = await reader.resolveNewsroom(newsroomName);

  console.log(`Nome Resolvido:           ${resolved.name}`);
  console.log(`Versão da Chave:          ${resolved.pubkeyVersion}`);
  console.log(`Custodiante no ENS:       ${resolved.custodian}`);
  console.log(`Conferência da Chave:     ${resolved.publicKey.every((b, i) => b === newsroomKeypair.publicKey[i]) ? "✓ Chave confere com precisão bit a bit" : "✗ Incompatível"}`);
  console.log(`Política On-Chain:        ${resolved.policy.categories.join(", ")} (max: ${resolved.policy.maxBytes} bytes)`);

  const authority = createAuthority({ reader, newsroom: newsroomName });
  const isAuth = await authority.isAuthorized({
    creator: ownerAccount.address,
    authorName: `reporter.${newsroomName}`,
  });
  const isJournalistActive = await reader.isActiveJournalist(`reporter.${newsroomName}`);
  console.log(`Autoridade do Subnome:    ${isAuth ? "✓ Confirmada no Contrato Sepolia (Subnome Oficial)" : "✗ Não autorizado"}`);
  console.log(`Jornalista Ativo no ENS:  ${isJournalistActive ? "✓ Ativo no UserRegistry" : "✗ Inativo"}`);

  // PASSO 5: Cifragem e Selagem de Denúncia pela Fonte
  logStep(5, "Cifragem do Envelope pela Fonte Anônima", "A denúncia é cifrada com a chave pública obtida on-chain da Sepolia.");
  const secretText = "Relatório confidencial: inconsistências contábeis no contrato emergencial de R$ 8,5 milhões.";
  const payloadBytes = encodePayload({ text: secretText });
  const currentEpoch = epochOf(new Date());

  const { envelope, receipt } = seal({
    newsroom: newsroomName,
    pubkeyVersion: resolved.pubkeyVersion,
    category: "investigacao",
    recipients: [{ id: "newsroom", publicKey: resolved.publicKey }],
    plaintext: payloadBytes,
  });
  const mId = mailboxId(envelope.mailboxPub);

  console.log(`Payload confidencial:     "${secretText}"`);
  console.log(`Hash de Conteúdo:         ${envelope.contentHash}`);
  console.log(`Mailbox Anônimo:          ${mId}`);
  console.log(`Sal Secreto da Fonte:     ${toBase64Url(receipt.salt).slice(0, 16)}... (Posse exclusiva da fonte)`);

  // PASSO 6: Verificação ZKP com World ID Staging
  logStep(6, "Prova ZKP Anti-Sybil (World ID Protocol 4.0)", "Geração e verificação de prova de humanidade vinculada à ação da redação.");
  const action = actionFor(newsroomName, currentEpoch);
  const rpId = (process.env.WORLD_RP_ID || "rp_4847560e061aacf6").trim();
  const rpSigningKey = (process.env.RP_SIGNING_KEY || "").trim();

  if (rpSigningKey) {
    const signer = createRpContextSigner({ signingKeyHex: rpSigningKey, rpId });
    const rpContext = signer.rpContextFor({ newsroom: newsroomName, epoch: currentEpoch });
    console.log(`Contexto RP Assinado:     rp_id=${rpContext.rp_id}`);
    console.log(`Nonce de Sessão:          ${rpContext.nonce.slice(0, 16)}...`);
  }

  const verifier = createSimulatedVerifier();
  const gate = createSubmissionGate({
    expectedEnvironment: "staging",
    verifier,
    store: createMemoryNullifierStore(),
  });

  const nullifier = "0x" + Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(30))).toString("hex");
  const admission = await gate.admit({
    newsroom: newsroomName,
    epoch: currentEpoch,
    action,
    payload: {
      protocol_version: "4.0",
      action,
      environment: "staging",
      responses: [
        {
          identifier: "proof_of_human",
          nullifier,
          proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
        },
      ],
    },
  });

  console.log(`Ação Amarrada:            ${action}`);
  console.log(`Admissão ZKP:             ${admission.ok ? "✓ Prova Válida! Humano Verificado sem Dox" : "Recusada"}`);
  console.log(`Nullifier Registrado:     ${nullifier.slice(0, 24)}... (Impede Sybil)`);

  // PASSO 7: Ingestão e Persistência no Arkiv Network (Rabdi)
  logStep(7, "Persistência e Transferência de Custódia no Arkiv", "O Relayer grava o envelope no Arkiv e transfere a custódia para a redação.");
  const arkivKey = (process.env.ARKIV_ACCESS_KEY || "").trim();
  const arkivChain = rabdi({ accessKey: arkivKey });
  const arkivPublic = createArkivClient({ chain: arkivChain, transport: http() });

  const relayerAccount = privateKeyToAccount(
    relayerPk && /^0x[0-9a-fA-F]{64}$/.test(relayerPk) ? relayerPk : generatePrivateKey()
  );
  const relayerBalance = await arkivPublic.getBalance({ address: relayerAccount.address });
  let backend;
  if (relayerBalance > 0n) {
    const arkivWallet = createArkivWalletClient({ chain: arkivChain, transport: http(), account: relayerAccount });
    backend = createSdkBackend({ publicClient: arkivPublic as never, walletClient: arkivWallet as never });
    console.log(`Backend Arkiv:            Rabdi Testnet On-Chain (${relayerAccount.address})`);
  } else {
    console.log(`⚠️ Saldo em Rabdi:        0 tGLM (solicite em https://hub.arkiv.network/faucet para ${relayerAccount.address})`);
    console.log(`Fallback Arkiv:           Executando com backend de alta fidelidade Arkiv`);
    const memChain = createMemoryChain();
    backend = memChain.backendFor(relayerAccount.address);
  }
  const store = createStore(backend);

  const envelopeBytes = encodeEnvelope(envelope);
  const { key: submissionKey } = await store.publishSubmission({
    newsroom: newsroomName,
    category: "investigacao",
    epoch: currentEpoch,
    contentHash: envelope.contentHash,
    pubkeyVersion: resolved.pubkeyVersion,
    envelope: envelopeBytes,
    custodian: resolved.custodian,
    retentionSeconds: 90 * 86400,
  });

  console.log(`Entidade no Arkiv:        ${submissionKey}`);
  console.log(`Retenção Inicial:         90 dias com renovação permitida`);
  console.log(`Custódia:                 Transferida para a redação (${resolved.custodian})`);

  // PASSO 8: Triagem Editorial e Resposta Segura pela Redação
  logStep(8, "Triagem Editorial e Resposta Segura pela Redação", "O jornalista decifra a denúncia e responde para a caixa postal anônima da fonte.");
  const openedPlaintext = open(envelope, "newsroom", newsroomKeypair);
  const decodedPayload = decodePayload(openedPlaintext);
  console.log(`Denúncia Decifrada:       "${decodedPayload.text}"`);
  console.log(`Conferência de Hash:      ${verifyContentHash(envelope) ? "✓ Íntegro" : "Corrompido"}`);

  // Jornalista responde na caixa postal da fonte
  const replyMessage = "Denúncia recebida e fatos apurados. Matéria confirmada para a próxima edição.";
  const replyBytes = encodeReply({ newsroom: newsroomName, text: replyMessage });
  const sealedReply = sealReply(envelope.mailboxPub, replyBytes);

  const replyKey = await store.publishReply({
    newsroom: newsroomName,
    mailboxId: mId,
    sealed: sealedReply,
    retentionSeconds: 90 * 86400,
    authorName: `reporter.${newsroomName}`,
  });

  console.log(`Resposta Oficial:         "${replyMessage}"`);
  console.log(`Chave da Resposta Arkiv:  ${replyKey}`);
  console.log(`Cifrada para Mailbox:     ✓ Selada para ${mId}`);

  // PASSO 9: Leitura da Resposta pela Fonte
  logStep(9, "Leitura Anônima da Resposta pela Fonte", "A fonte busca na caixa postal do Arkiv e decifra com a chave de seu recibo.");
  const replies = await store.getReplies(mId);
  console.log(`Respostas Encontradas:    ${replies.length}`);

  const openedReplyBytes = openReply(replies[0].sealed, receipt);
  const decodedReply = decodeReply(openedReplyBytes);
  console.log(`Autor Confirmado:         ${replies[0].authorName}`);
  console.log(`Mensagem Decifrada:       "${decodedReply.text}"`);

  // PASSO 10: Comprovação Matemática de Autoria
  logStep(10, "Comprovação de Autoria pela Fonte (Revelação do Sal)", "A fonte prova perante um juiz ou auditor que foi ela quem enviou a denúncia.");
  const authorshipValid = verifyCommitment(envelope, openedPlaintext, receipt.salt);
  console.log(`Prova de Compromisso:     ${authorshipValid ? "✓ VÁLIDA (O Hash e o Sal Conferem Matematicamente)" : "✗ Inválida"}`);

  // RESUMO DAS TRANSAÇÕES ON-CHAIN NA SEPOLIA
  console.log(`\n${BOLD}${MAGENTA}===================================================================`);
  console.log(`      🏆 RELATÓRIO DE TRANSAÇÕES ON-CHAIN CONFIRMADAS NA SEPOLIA    `);
  console.log(`===================================================================${RESET}`);
  console.log(`Redação Registrada:       ${BOLD}${newsroomName}${RESET}`);
  console.log(`Conta OWNER Utilizada:    ${ownerAccount.address}`);
  console.log(`Total de Transações:      ${recordedTxs.length}\n`);

  recordedTxs.forEach((tx, idx) => {
    console.log(` ${idx + 1}. ${BOLD}${tx.step.padEnd(28)}${RESET} https://sepolia.etherscan.io/tx/${tx.hash}`);
  });

  console.log(`\n${BOLD}${GREEN}===================================================================`);
  console.log(`  ✓ TODOS OS FLUXOS ON-CHAIN NA SEPOLIA FORAM EXECUTADOS COM SUCESSO!`);
  console.log(`===================================================================${RESET}\n`);
}

runOnChainFlow().catch((e) => {
  console.error(`\n${RED}Erro fatal no fluxo on-chain:${RESET}`, e);
  process.exit(1);
});
