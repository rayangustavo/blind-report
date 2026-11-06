import { describe, expect, it, beforeEach } from "vitest";
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
  lockWithPassword,
  mailboxId,
  newKeypair,
  open,
  openReply,
  openSealed,
  seal,
  sealReply,
  sealTo,
  unlockWithPassword,
  verifyCommitment,
  verifyContentHash,
  type Keypair,
} from "@blind-report/crypto";
import { createMemoryChain, createStore } from "@blind-report/arkiv-store";
import { createAuthority, parseNewsroomRecords, type EnsReadClient } from "@blind-report/ens-client";
import {
  createMemoryNullifierStore,
  createSimulatedVerifier,
  createSubmissionGate,
  type IdKitPayload,
} from "@blind-report/worldid-gate";
import {
  createWebsiteController,
  SHOWCASE_ACCOUNTS,
  type ReportItem,
  type WebsiteDeps,
  type WebsiteReceipt,
} from "../../WEBSITE/lib/website-controller";
import { SEPOLIA_SPEC, type Eip1193 } from "../../WEBSITE/lib/wallet";
import { toHex, type Address, type Hex } from "viem";

describe("E2E Full-Stack Frontend & On-Chain Architecture", () => {
  const newsroomName = "jornal-livre.eth";
  const ownerAddress = SHOWCASE_ACCOUNTS.owner;
  const journalistAddress = SHOWCASE_ACCOUNTS.reporter;
  const relayerAddress = SHOWCASE_ACCOUNTS.relayer;
  const journalistSubname = SHOWCASE_ACCOUNTS.reporterSubname;

  let newsroomKeypair: Keypair;
  let journalistReaderKeypair: Keypair;
  let chain: ReturnType<typeof createMemoryChain>;
  let relayerStore: ReturnType<typeof createStore>;
  let journalistStore: ReturnType<typeof createStore>;
  let nullifierStore: ReturnType<typeof createMemoryNullifierStore>;
  let gate: ReturnType<typeof createSubmissionGate>;
  let recordedEntities: Record<string, any>;
  let ensRecords: Record<string, Record<string, string>>;
  let delegatedJournalists: Map<string, { address: Address; readerKey: Uint8Array; active: boolean }>;

  const policy: NewsroomPolicy = {
    categories: ["investigacao", "corrupcao", "direitos-humanos", "meio-ambiente"],
    maxBytes: 250_000,
    attachments: true,
    epoch: "monthly",
  };

  beforeEach(() => {
    newsroomKeypair = newKeypair();
    journalistReaderKeypair = newKeypair();
    chain = createMemoryChain();
    relayerStore = createStore(chain.backendFor(relayerAddress));
    journalistStore = createStore(chain.backendFor(journalistAddress));
    nullifierStore = createMemoryNullifierStore();
    gate = createSubmissionGate({
      expectedEnvironment: "staging",
      store: nullifierStore,
      verifier: createSimulatedVerifier(),
    });

    recordedEntities = {};
    delegatedJournalists = new Map();
    delegatedJournalists.set(journalistSubname, {
      address: journalistAddress,
      readerKey: journalistReaderKeypair.publicKey,
      active: true,
    });

    ensRecords = {
      [newsroomName]: {
        name: newsroomName,
        pubkey: toBase64Url(newsroomKeypair.publicKey),
        version: "1",
        policy: JSON.stringify(policy),
        relayer: "https://relayer.blindreport.org",
        custodian: ownerAddress,
      },
      [journalistSubname]: {
        name: journalistSubname,
        address: journalistAddress,
        readerKey: toBase64Url(journalistReaderKeypair.publicKey),
      },
    };
  });

  function createMockReader(): any {
    return {
      async resolveNewsroom(name: string) {
        const raw = ensRecords[name];
        if (!raw) throw new Error(`Redação ${name} não encontrada no ENS`);
        return parseNewsroomRecords(raw as any);
      },
      async journalistOwner(subname: string) {
        const found = delegatedJournalists.get(subname);
        return found?.active ? found.address : undefined;
      },
      async isActiveJournalist(subname: string) {
        const found = delegatedJournalists.get(subname);
        return Boolean(found?.active);
      },
    };
  }

  function createMockEip1193(account: Address, chainIdHex: string = "0xaa36a7"): Eip1193 {
    let currentChainId = chainIdHex;
    return {
      async request({ method, params }: { method: string; params?: any }): Promise<any> {
        switch (method) {
          case "eth_requestAccounts":
          case "eth_accounts":
            return [account];
          case "eth_chainId":
            return currentChainId;
          case "wallet_switchEthereumChain":
            currentChainId = params[0].chainId;
            return null;
          case "personal_sign":
            return "0x" + "99".repeat(65);
          default:
            throw new Error(`Método EIP-1193 não suportado no mock: ${method}`);
        }
      },
    };
  }

  function setupFullStackDependencies() {
    const reader = createMockReader();
    const authority = createAuthority({ reader, newsroom: newsroomName });

    const deps: WebsiteDeps = {
      sourceClient: {
        async lookupNewsroom(name: string) {
          return reader.resolveNewsroom(name);
        },

        async submit({ newsroom, category, text, attachment }) {
          expect(newsroom).toBe(newsroomName);
          expect(policy.categories).toContain(category);

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

          const gateResult = await gate.admit({
            newsroom,
            epoch: currentEpoch,
            payload: idkitPayload,
          });
          expect(gateResult.ok).toBe(true);

          const newsroomInfo = await reader.resolveNewsroom(newsroom);
          const payloadAttachment = attachment
            ? { name: attachment.name, data: attachment.bytes ?? attachment.data ?? new Uint8Array() }
            : undefined;

          const { envelope, receipt: sealReceipt } = seal({
            newsroom,
            pubkeyVersion: newsroomInfo.pubkeyVersion,
            category,
            recipients: [{ id: "newsroom", publicKey: newsroomInfo.publicKey }],
            plaintext: encodePayload({ text, attachment: payloadAttachment }),
          });

          const published = await relayerStore.publishSubmission({
            newsroom,
            envelope: encodeEnvelope(envelope),
            category,
            epoch: currentEpoch,
            contentHash: envelope.contentHash as Hex,
            pubkeyVersion: newsroomInfo.pubkeyVersion,
            custodian: newsroomInfo.custodian,
            retentionSeconds: 90 * 86400,
          });

          recordedEntities[published.key] = {
            envelope,
            category,
            contentHash: envelope.contentHash,
            mailboxPub: sealReceipt.mailboxPub,
            mailboxPriv: sealReceipt.mailboxPriv,
            published,
          };

          const receipt = {
            key: published.key,
            contentHash: envelope.contentHash,
            salt: sealReceipt.salt,
            mailboxPriv: sealReceipt.mailboxPriv,
            mailboxPub: sealReceipt.mailboxPub,
            newsroom,
          };

          return { receipt, parts: 1 };
        },

        async readReplies(receipt) {
          const stored = recordedEntities[receipt.key];
          if (!stored) return { replies: [], ignored: 0 };
          const mId = mailboxId(stored.mailboxPub);
          const repliesList = await relayerStore.getReplies(mId);
          const replies: Array<{ text: string; author: string; createdAtBlock: bigint }> = [];

          for (const rep of repliesList) {
            const isAuth = await authority.isAuthorized({
              creator: journalistAddress,
              authorName: rep.authorName ?? journalistSubname,
            });
            expect(isAuth).toBe(true);

            const opened = openReply(rep.sealed, {
              mailboxPriv: stored.mailboxPriv,
              mailboxPub: stored.mailboxPub,
            });
            const decoded = decodeReply(opened);
            replies.push({
              text: decoded.text,
              author: rep.authorName ?? journalistSubname,
              createdAtBlock: rep.createdAtBlock,
            });
          }
          return { replies, ignored: 0 };
        },

        proveAuthorship(receipt, text) {
          const stored = recordedEntities[receipt.key];
          if (!stored) return false;
          const payload = encodePayload({ text });
          return verifyCommitment(stored.envelope, payload, receipt.salt);
        },
      },

      newsroomClient: {
        async listInbox() {
          const { items } = await relayerStore.listSubmissions({ newsroom: newsroomName });
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
          await journalistStore.annotate({
            newsroom: newsroomName,
            denunciaKey: key as Hex,
            journalist: journalistAddress,
            authorName: journalistSubname,
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

          await journalistStore.annotate({
            newsroom: newsroomName,
            denunciaKey: key as Hex,
            journalist: journalistAddress,
            authorName: journalistSubname,
            status: arkivStatus,
          });
        },

        async reply(item, text) {
          const stored = recordedEntities[item.key];
          const mId = mailboxId(stored.mailboxPub);
          const replyBytes = encodeReply({ newsroom: newsroomName, text });
          const sealed = sealReply(stored.envelope.mailboxPub, replyBytes);

          await journalistStore.publishReply({
            newsroom: newsroomName,
            mailboxId: mId,
            sealed,
            retentionSeconds: 90 * 86400,
            authorName: journalistSubname,
          });
        },

        async registerNewsroom(a) {
          ensRecords[`${a.label}.eth`] = {
            name: `${a.label}.eth`,
            pubkey: toBase64Url(newsroomKeypair.publicKey),
            version: "1",
            policy: JSON.stringify(policy),
            relayer: "https://relayer.blindreport.org",
            custodian: ownerAddress,
          };
        },

        async rotateKey() {
          const nextVer = 2;
          newsroomKeypair = newKeypair();
          ensRecords[newsroomName] = {
            ...ensRecords[newsroomName],
            pubkey: toBase64Url(newsroomKeypair.publicKey),
            version: String(nextVer),
          };
          return nextVer;
        },

        async addJournalist(a) {
          const subname = `${a.label}.${newsroomName}`;
          delegatedJournalists.set(subname, {
            address: a.address as Address,
            readerKey: a.readerPublicKey,
            active: true,
          });
          ensRecords[subname] = {
            name: subname,
            address: a.address,
            readerKey: toBase64Url(a.readerPublicKey),
          };
        },

        async revokeJournalist(label) {
          const subname = `${label}.${newsroomName}`;
          const current = delegatedJournalists.get(subname);
          if (current) {
            delegatedJournalists.set(subname, { ...current, active: false });
          }
        },

        async exportBackup(password) {
          const exportData = {
            v: 1,
            newsroom: newsroomName,
            keys: [
              {
                version: 1,
                publicKey: toBase64Url(newsroomKeypair.publicKey),
                privateKey: toBase64Url(newsroomKeypair.privateKey),
              },
            ],
          };
          return lockWithPassword(new TextEncoder().encode(JSON.stringify(exportData)), password, {
            iterations: 1000,
          });
        },

        async importBackup(blob, password) {
          const unlocked = await unlockWithPassword(blob, password);
          const parsed = JSON.parse(new TextDecoder().decode(unlocked));
          if (parsed?.keys?.[0]) {
            const k = parsed.keys[0];
            newsroomKeypair = {
              publicKey: fromBase64Url(k.publicKey),
              privateKey: fromBase64Url(k.privateKey),
            };
          }
        },

        shareKeyring(readerPublicKey) {
          const exportData = {
            v: 1,
            newsroom: newsroomName,
            keys: [
              {
                version: 1,
                publicKey: toBase64Url(newsroomKeypair.publicKey),
                privateKey: toBase64Url(newsroomKeypair.privateKey),
              },
            ],
          };
          const raw = new TextEncoder().encode(JSON.stringify(exportData));
          return toBase64Url(sealTo(readerPublicKey, raw));
        },

        importSharedKeyring(blob, reader) {
          const raw = openSealed(fromBase64Url(blob), reader);
          const parsed = JSON.parse(new TextDecoder().decode(raw));
          if (parsed?.keys?.[0]) {
            const k = parsed.keys[0];
            newsroomKeypair = {
              publicKey: fromBase64Url(k.publicKey),
              privateKey: fromBase64Url(k.privateKey),
            };
          }
        },

        async renew(key, retentionSeconds) {
          if (recordedEntities[key]) {
            await relayerStore.renew({ key: key as Hex, retentionSeconds });
          }
        },

        async listExpiring() {
          return [];
        },
      },

      fetchFn: async (url: string | URL | Request) => {
        const u = url.toString();
        if (u.includes("/health")) {
          return new Response(JSON.stringify({ status: "ok", sponsor: relayerAddress, chainId: 11155111 }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("Not found", { status: 404 });
      },
    };

    return { deps, reader, authority };
  }

  // =========================================================================
  // TESTE 1: Whistleblower — Cifragem Libsodium, World ID ZKP e Arkiv Store
  // =========================================================================
  it("Fluxo 1: Whistleblower envia denúncia através dos 3 passos da UI, passando por World ID, ENS e Arkiv", async () => {
    const { deps } = setupFullStackDependencies();
    const controller = createWebsiteController(deps);

    // Passo 1: Whistleblower inicia fluxo de denúncia
    controller.startReport();
    expect(controller.state.view).toBe("report");
    expect(controller.state.reportStep).toBe(1);

    // Passo 2: Seleção da redação cadastrada no ENS
    controller.selectNewsroom(newsroomName);
    controller.setReportStep(2);
    expect(controller.state.reportStep).toBe(2);

    // Passo 3: Preenchimento de categoria e texto confidencial
    controller.selectCategory("corrupcao");
    const secretContent = "Inconsistências orçamentárias de R$ 12,4M encontradas no contrato emergencial de TI.";
    controller.setMessage(secretContent);
    controller.setAttachment({
      name: "evidencia-financeira.pdf",
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      mimeType: "application/pdf",
    });

    // Envio: Dispara World ID ZKP, resolução ENS, Libsodium Sealed Box e Persistência no Arkiv
    const receipt = await controller.submitReport();

    // Verificações do Recibo e da UI
    expect(controller.state.reportStep).toBe(3);
    expect(receipt.id).toMatch(/^BR-\d{4}$/);
    expect(receipt.newsroom).toBe(newsroomName);
    expect(receipt.category).toBe("corrupcao");
    expect(receipt.text).toBe(secretContent);
    expect(receipt.salt).toBeDefined();
    expect(receipt.mailboxPub).toBeDefined();
    expect(receipt.mailboxPriv).toBeDefined();
    expect(receipt.contentHash).toBeDefined();

    // Verifica que a entidade foi gravada no Arkiv com integridade de hash
    const storedEntity = recordedEntities[receipt.key!];
    expect(storedEntity).toBeDefined();
    expect(verifyContentHash(storedEntity.envelope)).toBe(true);
  });

  // =========================================================================
  // TESTE 2: Web3 Wallet Connect — MetaMask EIP-1193, Sepolia & Papéis
  // =========================================================================
  it("Fluxo 2: Conexão Web3 via EIP-1193 valida Sepolia, assina desafio e resolve papéis de Owner e Jornalista", async () => {
    const { deps } = setupFullStackDependencies();
    const controller = createWebsiteController(deps);

    // Conexão com carteira do Owner
    const ownerProvider = createMockEip1193(ownerAddress);
    await controller.connectWallet(ownerProvider);

    expect(controller.state.sessionStatus).toBe("ready");
    expect(controller.state.role).toBe("admin");
    expect(controller.state.walletAddress).toBe(ownerAddress);
    expect(controller.state.notice).toContain("Newsroom Owner (Admin)");

    // Desconecta carteira
    controller.disconnectWallet();
    expect(controller.state.sessionStatus).toBe("idle");
    expect(controller.state.role).toBe("disconnected");

    // Conexão com carteira do Jornalista (repórter oficial com subnome)
    const reporterProvider = createMockEip1193(journalistAddress);
    await controller.connectWallet(reporterProvider);

    expect(controller.state.sessionStatus).toBe("ready");
    expect(controller.state.role).toBe("journalist");
    expect(controller.state.walletAddress).toBe(journalistAddress);
    expect(controller.state.journalistName).toBe(journalistSubname);
  });

  // =========================================================================
  // TESTE 3: Governança do Owner no Editorial Desk (ENSv2 + Rotação + Backup + TTL)
  // =========================================================================
  it("Fluxo 3: Owner administra a redação no frontend (Registro, Rotação ENSv2, Backup Cifrado, Delegação e Renovação Arkiv)", async () => {
    const { deps } = setupFullStackDependencies();
    const controller = createWebsiteController(deps);
    controller.selectNewsroom(newsroomName);
    controller.switchDemoRole("admin");

    // Acessa aba de chaves
    controller.setActiveDeskTab("keys");
    expect(controller.state.activeDeskTab).toBe("keys");

    // Rotação de chave pública no ENSv2
    const newVersion = await controller.rotateKey();
    expect(newVersion).toBe(2);
    expect(controller.state.keyVersion).toBe(2);
    expect(ensRecords[newsroomName]?.version).toBe("2");

    // Geração de backup cifrado com senha (KDF / Argon2id)
    const backupPassword = "SuperSecretPassword123!";
    const encryptedBackup = await controller.exportBackup(backupPassword);
    expect(encryptedBackup).toBeDefined();
    expect(encryptedBackup.length).toBeGreaterThan(50);

    // Restauração do chaveiro a partir do backup cifrado
    await controller.importBackup(encryptedBackup, backupPassword);
    expect(controller.state.keysLoaded).toBe(true);
    expect(controller.state.notice).toContain("Keyring restored from backup successfully");

    // Acessa aba de equipe para delegação de subnome ENSv2
    controller.setActiveDeskTab("team");
    const novoReporterAddr = "0x5555555555555555555555555555555555555555";
    const novoReporterKp = newKeypair();

    await controller.addJournalist({
      label: "investigador",
      address: novoReporterAddr,
      readerPublicKey: toBase64Url(novoReporterKp.publicKey),
    });

    const subnomeCriado = `investigador.${newsroomName}`;
    expect(delegatedJournalists.get(subnomeCriado)?.active).toBe(true);
    expect(controller.state.team.some((t) => t.subname === subnomeCriado)).toBe(true);

    // Compartilhamento seguro do chaveiro com o novo repórter (X25519 Sealed Box)
    const sharedBlob = controller.shareKeyring(toBase64Url(novoReporterKp.publicKey));
    expect(sharedBlob).toBeDefined();
    expect(controller.state.sharedKeyringBlob).toBe(sharedBlob);

    // Revogação do jornalista no ENSv2
    await controller.revokeJournalist("investigador");
    expect(delegatedJournalists.get(subnomeCriado)?.active).toBe(false);

    // Acessa aba de retenção e renova expiração de denúncia no Arkiv
    controller.setActiveDeskTab("retention");
    const dummyKey = "0xabc123...";
    await controller.renewSubmission(dummyKey, 90);
    const renewed = controller.state.expiring.find((e) => e.key === dummyKey);
    expect(renewed?.daysLeft).toBe(97); // 7 dias originais + 90 dias renovados
  });

  // =========================================================================
  // TESTE 4: Jornalista — Onboarding com Reader Key, Decifragem, Triagem e Resposta
  // =========================================================================
  it("Fluxo 4: Jornalista gera reader key, desbloqueia chaveiro, decifra denúncia e responde no mailbox anônimo", async () => {
    const { deps } = setupFullStackDependencies();
    const controller = createWebsiteController(deps);

    // Passo A: Whistleblower envia uma denúncia prévia
    controller.selectNewsroom(newsroomName);
    controller.selectCategory("direitos-humanos");
    const denunciaTexto = "Trabalho análogo à escravidão flagrado em fazenda de gado no interior do estado.";
    controller.setMessage(denunciaTexto);
    const receipt = await controller.submitReport();

    // Passo B: Jornalista entra no Editorial Desk
    controller.switchDemoRole("journalist");
    await controller.openEditorialDesk();
    expect(controller.state.view).toBe("desk");

    // Passo C: Gera novo par de chaves de leitura
    controller.setActiveDeskTab("reader_key");
    const readerKey = controller.newReaderKey();
    expect(readerKey.publicKey).toBeDefined();

    // Passo D: Desbloqueia o chaveiro compartilhado da redação
    const blobCompartilhado = controller.shareKeyring(readerKey.publicKey);
    controller.importSharedKeyring(blobCompartilhado, readerKey);
    expect(controller.state.keysLoaded).toBe(true);

    // Passo E: Acessa Inbox e localiza a denúncia recebida
    controller.setActiveDeskTab("inbox");
    const targetReport = controller.state.reports.find((r) => r.receiptKey === receipt.key)!;
    expect(targetReport).toBeDefined();
    expect(targetReport.decrypted).toBe(false);

    // Passo F: Decifra a denúncia usando a chave assimétrica Curve25519 da redação
    controller.selectReport(targetReport);
    const textoDecifrado = await controller.decryptSelectedReport();
    expect(textoDecifrado).toBe(denunciaTexto);
    expect(controller.state.selectedReport?.decrypted).toBe(true);

    // Passo G: Salva anotação interna de apuração
    const notaInterna = "Caso de extrema gravidade. Contatando Ministério Público do Trabalho.";
    await controller.saveInternalNote(notaInterna);
    expect(controller.state.selectedReport?.internalNote).toBe(notaInterna);

    // Passo H: Altera o status da denúncia no Arkiv
    await controller.updateReportStatus("investigating");
    expect(controller.state.selectedReport?.status).toBe("investigating");

    // Passo I: Envia réplica oficial cifrada para o mailbox da fonte
    const respostaOficial = "Recebemos sua denúncia. Nossa equipe já acionou o MPT e iniciou a reportagem.";
    await controller.replyToReport(respostaOficial);
    expect(controller.state.replies.length).toBe(1);
    expect(controller.state.replies[0]?.text).toBe(respostaOficial);
  });

  // =========================================================================
  // TESTE 5: Whistleblower — Consulta de Respostas e Comprovação de Autoria
  // =========================================================================
  it("Fluxo 5 & 6: Whistleblower consulta réplicas com seu recibo e comprova matematicamente a autoria perante auditor", async () => {
    const { deps } = setupFullStackDependencies();
    const controller = createWebsiteController(deps);

    // Envio inicial da denúncia
    controller.selectNewsroom(newsroomName);
    controller.selectCategory("meio-ambiente");
    const denunciaTexto = "Despejo ilegal de efluentes químicos tóxicos no rio municipal durante a madrugada.";
    controller.setMessage(denunciaTexto);
    const receipt = await controller.submitReport();

    // Redação envia resposta oficial
    controller.switchDemoRole("journalist");
    await controller.openEditorialDesk();
    const reportItem = controller.state.reports.find((r) => r.receiptKey === receipt.key)!;
    controller.selectReport(reportItem);
    const respostaRedacao = "Amostras da água foram coletadas para laudo técnico independente.";
    await controller.replyToReport(respostaRedacao);

    // Whistleblower acessa a aba de consulta e lê a resposta cifrada
    controller.navigate("replies");
    const replies = await controller.readRepliesWithReceipt(receipt);
    expect(replies.length).toBe(1);
    expect(replies[0]?.text).toBe(respostaRedacao);
    expect(replies[0]?.author).toBe(journalistSubname);

    // Whistleblower comprova matematicamente a autoria revelando o sal (Zero-Knowledge / Commitment)
    controller.navigate("verify");
    const authorshipValid = controller.verifyAuthorship({
      text: denunciaTexto,
      salt: receipt.salt!,
      rawEnvelope: receipt.rawEnvelope,
    });

    expect(authorshipValid).toBe(true);
    expect(controller.state.authorshipResult?.valid).toBe(true);
    expect(controller.state.authorshipResult?.message).toContain("Authorship proven mathematically");

    // Tentativa de fraude com texto alterado deve falhar na verificação criptográfica
    const fakeAuthorship = controller.verifyAuthorship({
      text: "Texto forjado por um impostor",
      salt: receipt.salt!,
      rawEnvelope: receipt.rawEnvelope,
    });

    expect(fakeAuthorship).toBe(false);
    expect(controller.state.authorshipResult?.valid).toBe(false);
  });

  // =========================================================================
  // TESTE 6: Relayer — Verificação de Saúde e Patrocínio de Gás
  // =========================================================================
  it("Fluxo 7: Frontend monitora a saúde do Relayer e parâmetros de patrocínio gasless", async () => {
    const { deps } = setupFullStackDependencies();
    const controller = createWebsiteController(deps);

    expect(controller.state.relayerStatus).toBe("online");
    await controller.checkRelayerHealth();
    expect(controller.state.relayerStatus).toBe("online");
    expect(controller.state.relayerSponsor).toBe(relayerAddress);
  });

  // =========================================================================
  // TESTE 7: World ID — Mitigação Anti-Sybil e Rejeição de Nullifier Duplicado
  // =========================================================================
  it("World ID Anti-Sybil: Bloqueia submissão fraudulenta se o mesmo nullifier for submetido duas vezes na mesma época", async () => {
    const currentEpoch = epochOf(new Date());
    const action = actionFor(newsroomName, currentEpoch);
    const duplicatedNullifier = "0x" + "ee".repeat(30);

    const makePayload = (): IdKitPayload => ({
      protocol_version: "4.0",
      nonce: "0x01",
      action,
      environment: "staging",
      responses: [
        {
          identifier: "proof_of_human",
          nullifier: duplicatedNullifier,
          proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
        },
      ],
    });

    // Primeira admissão deve ter sucesso
    const firstAttempt = await gate.admit({
      newsroom: newsroomName,
      epoch: currentEpoch,
      payload: makePayload(),
    });
    expect(firstAttempt.ok).toBe(true);

    // Segunda tentativa na mesma época com o mesmo nullifier DEVE ser recusada (Ataque Sybil mitigado!)
    const secondAttempt = await gate.admit({
      newsroom: newsroomName,
      epoch: currentEpoch,
      payload: makePayload(),
    });
    expect(secondAttempt.ok).toBe(false);
  });
});
