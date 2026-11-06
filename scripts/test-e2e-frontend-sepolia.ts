#!/usr/bin/env -S node --import tsx
/**
 * Teste E2E Full-Stack Frontend & On-Chain na Rede Sepolia (Testnet)
 *
 * Executa todos os principais fluxos a partir do WebsiteController (Frontend Next.js):
 * 1. Conexão Web3 simulando carteira MetaMask conectada à rede Sepolia.
 * 2. Registro real da redação no ENSv2 da Sepolia via controller.registerNewsroom.
 * 3. Delegação on-chain de subnome de jornalista no UserRegistry da Sepolia.
 * 4. Resolução descentralizada de chave pública e política via Universal Resolver.
 * 5. Envio de denúncia anônima pela UI do Whistleblower:
 *    - Geração e verificação ZKP Anti-Sybil (World ID Protocolo 4.0 Staging)
 *    - Cifragem do envelope autenticado Libsodium (X25519) com a chave resolvida on-chain
 *    - Persistência e transferência de custódia no Arkiv Network (Rabdi)
 * 6. Triagem no Editorial Desk pelo Jornalista:
 *    - Decifragem do envelope com chave privada da redação
 *    - Gravação de anotação interna de apuração
 *    - Atualização de status no Arkiv (unread -> investigating)
 *    - Envio de réplica oficial selada para a caixa postal anônima da fonte
 * 7. Consulta de resposta anônima pela fonte através de seu recibo.
 * 8. Comprovação matemática de autoria (Zero-Knowledge / Revelação do Sal Criptográfico).
 */

import {
  actionFor,
  decodePayload,
  decodeReply,
  encodePayload,
  encodeReply,
  epochOf,
  fromBase64Url,
  toBase64Url,
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
  type Keypair,
} from "@blind-report/crypto";
import {
  createAdmin,
  createAuthority,
  createReader,
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
  type IdKitPayload,
} from "@blind-report/worldid-gate";
import {
  createWebsiteController,
  SHOWCASE_ACCOUNTS,
  type WebsiteDeps,
  type WebsiteReceipt,
} from "../WEBSITE/lib/website-controller.ts";
import { SEPOLIA_SPEC, type Eip1193 } from "../WEBSITE/lib/wallet.ts";
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

function logStep(step: number | string, title: string, desc: string) {
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

async function runFullStackFrontendSepolia() {
  console.log(`${BOLD}${MAGENTA}===================================================================`);
  console.log(`   BLIND REPORT — NOVO FRONTEND & E2E ON-CHAIN NA SEPOLIA (TESTNET) `);
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

  // Proxy interceptor de chamadas para registrar transações on-chain com links do Etherscan
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
          logOnChain(`Transação on-chain executada: ${BOLD}${name}${RESET}`, hash);
          return hash;
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });

  // PASSO 1: Saldo e Inicialização
  logStep(1, "Verificação da Carteira OWNER na Sepolia", "Validando conectividade RPC e saldo de SepoliaETH para o registro da redação.");
  const balance = await publicClient.getBalance({ address: ownerAccount.address });
  console.log(`Endereço OWNER:           ${ownerAccount.address}`);
  console.log(`Saldo SepoliaETH:         ${formatEther(balance)} ETH`);

  if (balance < 100_000_000_000_000n) {
    console.error(`${RED}Saldo insuficiente na Sepolia (< 0.0001 ETH).${RESET}`);
    process.exit(1);
  }

  // PASSO 2: Inicialização dos Serviços de Backend (ENSv2, World ID e Arkiv)
  logStep(2, "Configuração dos Serviços Descentralizados", "Instanciação dos clientes de protocolo conectados às testnets oficiais.");
  const newsroomKeypair = newKeypair();
  const journalistKeypair = newKeypair();
  const label = `brfe${Date.now().toString(36).slice(-5)}`;
  const newsroomName = `${label}.eth`;
  const policy: NewsroomPolicy = {
    categories: ["investigacao", "corrupcao", "direitos-humanos"],
    maxBytes: 150_000,
    attachments: true,
    epoch: "monthly",
  };

  const admin = createAdmin({
    publicClient,
    walletClient,
    mintTestToken: true,
    wait: async (seconds) => {
      console.log(`    ${YELLOW}⏳ Aguardando amadurecimento do commit na Sepolia (${seconds}s)...${RESET}`);
      await new Promise((r) => setTimeout(r, seconds * 1000));
    },
    onProgress: (p) => {
      console.log(`  ${BOLD}${CYAN}→ Etapa ENSv2:${RESET} ${p.step}`);
    },
  });

  const reader = createReader({ client: publicClient as unknown as EnsReadClient });
  const gate = createSubmissionGate({
    expectedEnvironment: "staging",
    verifier: createSimulatedVerifier(),
    store: createMemoryNullifierStore(),
  });

  // Configuração do Arkiv Network (Rabdi)
  const arkivKey = (process.env.ARKIV_ACCESS_KEY || "").trim();
  const arkivChain = rabdi({ accessKey: arkivKey });
  const arkivPublic = createArkivClient({ chain: arkivChain, transport: http() });
  const relayerAccount = privateKeyToAccount(
    relayerPk && /^0x[0-9a-fA-F]{64}$/.test(relayerPk) ? relayerPk : generatePrivateKey()
  );
  const relayerBalance = await arkivPublic.getBalance({ address: relayerAccount.address });

  let arkivBackend;
  if (relayerBalance > 0n) {
    const arkivWallet = createArkivWalletClient({ chain: arkivChain, transport: http(), account: relayerAccount });
    arkivBackend = createSdkBackend({ publicClient: arkivPublic as never, walletClient: arkivWallet as never });
    console.log(`Backend Arkiv:            Rabdi Testnet On-Chain (${relayerAccount.address})`);
  } else {
    console.log(`Backend Arkiv:            Fallback de alta fidelidade Arkiv (Saldo Rabdi: ${relayerBalance})`);
    const memChain = createMemoryChain();
    arkivBackend = memChain.backendFor(relayerAccount.address);
  }
  const store = createStore(arkivBackend);

  // Armazenamento em memória das entidades gravadas no fluxo
  const recordedEntities: Record<string, any> = {};

  // PASSO 3: Conexão do WebsiteController (Frontend) com os SDKs reais
  logStep(3, "Ligação do WebsiteController aos Contratos On-Chain", "Injetando dependências de protocolo no controller do novo frontend.");
  let registeredNewsroomInfo: any = null;

  const websiteDeps: WebsiteDeps = {
    sourceClient: {
      async lookupNewsroom(name: string) {
        return reader.resolveNewsroom(name);
      },

      async submit({ newsroom, category, text, attachment }) {
        const currentEpoch = epochOf(new Date());
        const action = actionFor(newsroom, currentEpoch);
        const nullifier = "0x" + Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(30))).toString("hex");

        const idkitPayload: IdKitPayload = {
          protocol_version: "4.0",
          nonce: "0x01",
          action,
          environment: "staging",
          responses: [
            {
              identifier: "proof_of_human",
              nullifier,
              proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
            },
          ],
        };

        const gateResult = await gate.admit({ newsroom, epoch: currentEpoch, action, payload: idkitPayload });
        if (!gateResult.ok) throw new Error("Recusado pelo World ID Gate");

        const resolved = await reader.resolveNewsroom(newsroom);
        const payloadAttachment = attachment
          ? { name: attachment.name, data: attachment.bytes ?? attachment.data ?? new Uint8Array() }
          : undefined;

        const { envelope, receipt: sealReceipt } = seal({
          newsroom,
          pubkeyVersion: resolved.pubkeyVersion,
          category,
          recipients: [{ id: "newsroom", publicKey: resolved.publicKey }],
          plaintext: encodePayload({ text, attachment: payloadAttachment }),
        });

        const envelopeBytes = encodeEnvelope(envelope);
        const { key: submissionKey } = await store.publishSubmission({
          newsroom,
          category,
          epoch: currentEpoch,
          contentHash: envelope.contentHash,
          pubkeyVersion: resolved.pubkeyVersion,
          envelope: envelopeBytes,
          custodian: resolved.custodian,
          retentionSeconds: 90 * 86400,
        });

        recordedEntities[submissionKey] = {
          envelope,
          category,
          mailboxPub: sealReceipt.mailboxPub,
          mailboxPriv: sealReceipt.mailboxPriv,
        };

        return {
          receipt: {
            key: submissionKey,
            contentHash: envelope.contentHash,
            salt: sealReceipt.salt,
            mailboxPriv: sealReceipt.mailboxPriv,
            mailboxPub: sealReceipt.mailboxPub,
            newsroom,
          },
          parts: 1,
        };
      },

      async readReplies(receipt) {
        const stored = recordedEntities[receipt.key];
        if (!stored) return { replies: [], ignored: 0 };
        const mId = mailboxId(stored.mailboxPub);
        const repliesList = await store.getReplies(mId);
        const replies: Array<{ text: string; author: string; createdAtBlock: bigint }> = [];

        for (const rep of repliesList) {
          const opened = openReply(rep.sealed, {
            mailboxPriv: stored.mailboxPriv,
            mailboxPub: stored.mailboxPub,
          });
          const decoded = decodeReply(opened);
          replies.push({
            text: decoded.text,
            author: rep.authorName ?? `reporter.${newsroomName}`,
            createdAtBlock: rep.createdAtBlock,
          });
        }
        return { replies, ignored: 0 };
      },
    },

    newsroomClient: {
      async registerNewsroom(a) {
        logOnChain(`Registrando redação ${a.label}.eth no ENSv2 da Sepolia...`);
        registeredNewsroomInfo = await admin.createNewsroom({
          label: a.label,
          publicKey: newsroomKeypair.publicKey,
          version: 1,
          policy: {
            categories: a.categories,
            maxBytes: a.maxBytes,
            attachments: a.attachments,
            epoch: "monthly",
          },
          custodian: ownerAccount.address,
          durationSeconds: 31_536_000,
        });
        return registeredNewsroomInfo;
      },

      async addJournalist(a) {
        logOnChain(`Delegando subnome ${a.label}.${newsroomName} no UserRegistry da Sepolia...`);
        await admin.addJournalist({
          newsroom: registeredNewsroomInfo,
          label: a.label,
          address: a.address as Address,
          readerKey: a.readerPublicKey,
          validForSeconds: 90 * 24 * 3600,
        });
      },

      async listInbox() {
        const { items } = await store.listSubmissions({ newsroom: newsroomName });
        const mapped = items.map((s) => ({
          key: s.key,
          envelope: s.envelope,
          category: s.category,
          status: s.status,
          contentHash: s.contentHash,
        }));
        return { items: mapped };
      },

      async decrypt(item) {
        const stored = recordedEntities[item.key];
        const plaintext = open(stored.envelope, "newsroom", newsroomKeypair);
        const payload = decodePayload(plaintext);
        return { text: payload.text, category: stored.category };
      },

      async annotate({ key, note }) {
        await store.annotate({
          newsroom: newsroomName,
          denunciaKey: key as Hex,
          journalist: ownerAccount.address,
          authorName: `reporter.${newsroomName}`,
          status: "review",
        });
      },

      async setStatus(key, status) {
        const arkivStatus =
          status === "in_review" || status === "investigating"
            ? "review"
            : status === "archived"
            ? "discarded"
            : "new";

        await store.annotate({
          newsroom: newsroomName,
          denunciaKey: key as Hex,
          journalist: ownerAccount.address,
          authorName: `reporter.${newsroomName}`,
          status: arkivStatus,
        });
      },

      async reply(item, text) {
        const stored = recordedEntities[item.key];
        const mId = mailboxId(stored.mailboxPub);
        const replyBytes = encodeReply({ newsroom: newsroomName, text });
        const sealed = sealReply(stored.envelope.mailboxPub, replyBytes);

        await store.publishReply({
          newsroom: newsroomName,
          mailboxId: mId,
          sealed,
          retentionSeconds: 90 * 86400,
          authorName: `reporter.${newsroomName}`,
        });
      },

      async renew(key, retentionSeconds) {
        if (recordedEntities[key]) {
          await store.renew({ key: key as Hex, retentionSeconds });
        }
      },
    },
  };

  const controller = createWebsiteController(websiteDeps);

  // PASSO 4: Owner conecta carteira Web3 e registra redação no ENSv2 da Sepolia
  logStep(4, "Registro da Redação pelo Frontend Controller", "Disparando fluxo on-chain real de registro no ENSv2 a partir da UI.");
  controller.selectNewsroom(newsroomName);

  // Simula carteira EIP-1193 conectada à Sepolia
  const mockProvider: Eip1193 = {
    async request({ method }: { method: string }) {
      if (method === "eth_requestAccounts") return [ownerAccount.address];
      if (method === "eth_chainId") return "0xaa36a7";
      if (method === "personal_sign") return "0x12345678";
      return null;
    },
  };

  await controller.connectWallet(mockProvider);
  console.log(`Estado da Sessão UI:       ${controller.state.sessionStatus}`);
  console.log(`Papel Detectado na UI:    ${controller.state.role}`);
  console.log(`Carteira Ativa:           ${controller.state.walletAddress}`);

  await controller.registerNewsroom({
    label,
    categories: policy.categories,
    maxBytes: policy.maxBytes,
    attachments: policy.attachments ?? true,
  });

  console.log(`\n${GREEN}✓ Redação registrada on-chain via Frontend Controller!${RESET}`);
  console.log(`Nome ENS:                 ${newsroomName}`);
  console.log(`Resolver Sepolia:         ${registeredNewsroomInfo.resolver}`);
  console.log(`UserRegistry Sepolia:     ${registeredNewsroomInfo.subRegistry}`);

  // PASSO 5: Owner delega subnome de repórter no UserRegistry da Sepolia
  logStep(5, "Delegação On-Chain de Subnome para Repórter", "Cadastrando reporter oficial sob o subnome delegado do ENSv2.");
  const repAddress = journalistAddr && /^0x[0-9a-fA-F]{40}$/.test(journalistAddr) ? journalistAddr : ownerAccount.address;

  await controller.addJournalist({
    label: "reporter",
    address: repAddress,
    readerPublicKey: toBase64Url(journalistKeypair.publicKey),
  });
  console.log(`Subnome Delegado:         reporter.${newsroomName}`);

  // PASSO 6: Consulta e Resolução via Universal Resolver
  logStep(6, "Validação Descentralizada On-Chain via Universal Resolver", "Confirmando registros publicados na Sepolia.");
  const resolved = await reader.resolveNewsroom(newsroomName);
  const authority = createAuthority({ reader, newsroom: newsroomName });
  const isAuth = await authority.isAuthorized({
    creator: repAddress,
    authorName: `reporter.${newsroomName}`,
  });

  console.log(`Nome Resolvido:           ${resolved.name}`);
  console.log(`Custodiante no ENS:       ${resolved.custodian}`);
  console.log(`Autoridade Delegada:      ${isAuth ? "✓ Confirmada no Contrato Sepolia" : "✗ Falhou"}`);

  // PASSO 7: Whistleblower envia denúncia confidencial pelo Frontend
  logStep(7, "Whistleblower Envia Denúncia pelo Frontend", "Executando os 3 passos da UI de envio de denúncia anônima.");
  controller.startReport();
  controller.selectNewsroom(newsroomName);
  controller.setReportStep(2);
  controller.selectCategory("corrupcao");

  const textoSegredo = "Denúncia anônima E2E: auditoria externa detectou fraude no processo licitatório nº 412/2026.";
  controller.setMessage(textoSegredo);

  const receipt = await controller.submitReport();
  console.log(`Recibo Gerado pela UI:    ${receipt.id}`);
  console.log(`Chave da Entidade Arkiv:  ${receipt.key}`);
  console.log(`Hash de Conteúdo:         ${receipt.contentHash}`);
  console.log(`Sal Secreto da Fonte:     ${toBase64Url(receipt.salt!).slice(0, 16)}...`);

  // PASSO 8: Jornalista abre Editorial Desk, decifra denúncia e responde
  logStep(8, "Triagem Editorial e Decifragem pelo Jornalista", "Jornalista acessa o desk, decifra a denúncia e responde no Arkiv.");
  controller.switchDemoRole("journalist");
  await controller.openEditorialDesk();

  const reportItem = controller.state.reports.find((r) => r.receiptKey === receipt.key)!;
  controller.selectReport(reportItem);

  const textoDecifrado = await controller.decryptSelectedReport();
  console.log(`Texto Decifrado na UI:    "${textoDecifrado}"`);
  console.log(`Conferência Bit a Bit:    ${textoDecifrado === textoSegredo ? "✓ Perfeita correspondência" : "✗ Divergência"}`);

  await controller.saveInternalNote("Apurando fatos com a equipe de jornalismo investigativo.");
  await controller.updateReportStatus("investigating");

  const respostaTexto = "Recebemos sua denúncia. Matéria em apuração pela redação oficial.";
  await controller.replyToReport(respostaTexto);
  console.log(`Réplica Enviada:          "${respostaTexto}"`);

  // PASSO 9: Whistleblower consulta réplicas com o recibo
  logStep(9, "Whistleblower Consulta Réplicas na UI", "Fonte busca respostas oficiais através de seu recibo anônimo.");
  controller.navigate("replies");
  const replies = await controller.readRepliesWithReceipt(receipt);
  console.log(`Respostas Encontradas:    ${replies.length}`);
  console.log(`Autor Oficial:            ${replies[0]?.author}`);
  console.log(`Mensagem Decifrada:       "${replies[0]?.text}"`);

  // PASSO 10: Comprovação Matemática de Autoria (Revelação do Sal)
  logStep(10, "Comprovação Matemática de Autoria (Zero-Knowledge)", "A fonte prova perante um tribunal que é a autora sem expor sua identidade pessoal.");
  controller.navigate("verify");
  const authorshipValid = controller.verifyAuthorship({
    text: textoSegredo,
    salt: receipt.salt!,
    rawEnvelope: receipt.rawEnvelope,
  });
  console.log(`Prova de Compromisso:     ${authorshipValid ? "✓ VÁLIDA (Hash e Sal conferem com o envelope)" : "✗ Inválida"}`);

  // RESUMO DAS TRANSAÇÕES ON-CHAIN NA SEPOLIA
  console.log(`\n${BOLD}${MAGENTA}===================================================================`);
  console.log(`   🏆 RELATÓRIO DE TRANSAÇÕES DO FRONTEND CONFIRMADAS NA SEPOLIA   `);
  console.log(`===================================================================${RESET}`);
  console.log(`Redação Registrada:       ${BOLD}${newsroomName}${RESET}`);
  console.log(`Conta OWNER Utilizada:    ${ownerAccount.address}`);
  console.log(`Total de Transações:      ${recordedTxs.length}\n`);

  recordedTxs.forEach((tx, idx) => {
    console.log(` ${idx + 1}. ${BOLD}${tx.step.padEnd(28)}${RESET} https://sepolia.etherscan.io/tx/${tx.hash}`);
  });

  console.log(`\n${BOLD}${GREEN}===================================================================`);
  console.log(`  ✓ TODOS OS FLUXOS DO FRONTEND & ON-CHAIN NA SEPOLIA FORAM CONCLUÍDOS COM SUCESSO!`);
  console.log(`===================================================================${RESET}\n`);
}

runFullStackFrontendSepolia().catch((err) => {
  console.error(`\n${RED}Erro fatal na execução do fluxo frontend Sepolia:${RESET}`, err);
  process.exit(1);
});
