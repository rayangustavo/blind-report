import { describe, expect, it } from "vitest";
import { actionFor, decodePayload, decodeReply, encodePayload, encodeReply, epochOf, type NewsroomPolicy } from "@blind-report/core";
import { decodeEnvelope, encodeEnvelope, mailboxId, newKeypair, open, openReply, seal, sealReply } from "@blind-report/crypto";
import { createMemoryChain, createStore } from "@blind-report/arkiv-store";
import { createMemoryNullifierStore, createSimulatedVerifier, createSubmissionGate, type IdKitPayload } from "@blind-report/worldid-gate";
import { createWebsiteController, type WebsiteDeps } from "../../WEBSITE/lib/website-controller";
import type { Address, Hex } from "viem";

describe("E2E Frontend — Fluxos Principais da Aplicação com Interação do Novo Frontend", () => {
  it("executa o fluxo completo do Whistleblower e do Editorial Desk integrando interface e protocolo", async () => {
    // -------------------------------------------------------------------------
    // 1. SETUP DO MUNDO PROTOCOLAR (ENSv2 + Arkiv + World ID + Crypto Libsodium)
    // -------------------------------------------------------------------------
    const newsroomName = "jornal-investigativo.eth";
    const newsroomKeypair = newKeypair();
    const relayerAddress = "0x9999999999999999999999999999999999999999" as Address;
    const journalistAddress = "0x1234567890123456789012345678901234567890" as Address;
    const authorName = `reporter.${newsroomName}`;

    // Cadeia de armazenamento descentralizado Arkiv em memória
    const chain = createMemoryChain();
    const store = createStore(chain.backendFor(relayerAddress));
    const journalistStore = createStore(chain.backendFor(journalistAddress));

    // Gatekeeper do World ID com armazenamento de nullifiers e verificador simulado
    const nullifierStore = createMemoryNullifierStore();
    const verifier = createSimulatedVerifier();
    const gate = createSubmissionGate({ expectedEnvironment: "staging", store: nullifierStore, verifier });

    const policy: NewsroomPolicy = {
      categories: ["corrupcao", "saude", "seguranca"],
      maxBytes: 100_000,
      attachments: true,
      epoch: "monthly",
    };

    // -------------------------------------------------------------------------
    // 2. ADAPTADORES DO PROTOCOLO LIGADOS AO WEBSITE CONTROLLER
    // -------------------------------------------------------------------------
    const recordedEntities: Record<string, any> = {};

    const websiteDeps: WebsiteDeps = {
      sourceClient: {
        async submit({ newsroom, category, text, attachment }) {
          expect(newsroom).toBe(newsroomName);
          expect(policy.categories).toContain(category);

          // Prova ZKP do World ID
          const currentEpoch = epochOf(new Date());
          const action = actionFor(newsroom, currentEpoch);
          const nullifier = "0x" + "bb".repeat(30);
          const idkitPayload: IdKitPayload = {
            protocol_version: "4.0",
            nonce: "0x01",
            action,
            environment: "staging",
            responses: [{ identifier: "proof_of_human", nullifier, proof: ["0x1", "0x2"] }],
          };

          const gateResult = await gate.admit({ newsroom, epoch: currentEpoch, payload: idkitPayload });
          expect(gateResult.ok).toBe(true);

          // Cifragem Libsodium com envelope autenticado
          const { envelope, receipt: sealReceipt } = seal({
            newsroom,
            pubkeyVersion: 1,
            category,
            recipients: [{ id: "redacao", publicKey: newsroomKeypair.publicKey }],
            plaintext: encodePayload({ text, attachment }),
          });

          // Gravação na rede Arkiv com transferência de custódia
          const published = await store.publishSubmission({
            newsroom,
            envelope: encodeEnvelope(envelope),
            category,
            epoch: currentEpoch,
            contentHash: envelope.contentHash as Hex,
            pubkeyVersion: 1,
            custodian: journalistAddress,
            retentionSeconds: 90 * 86400,
          });

          const receipt = {
            key: published.key,
            contentHash: envelope.contentHash,
            salt: sealReceipt.salt,
            mailboxPriv: sealReceipt.mailboxPriv,
            mailboxPub: sealReceipt.mailboxPub,
            newsroom,
          };

          recordedEntities[published.key] = {
            envelope,
            category,
            contentHash: envelope.contentHash,
            mailboxPub: sealReceipt.mailboxPub,
            mailboxPriv: sealReceipt.mailboxPriv,
            published,
          };

          return { receipt, parts: 1 };
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
            replies.push({ text: decoded.text, author: rep.authorName ?? authorName, createdAtBlock: rep.createdAtBlock });
          }
          return { replies, ignored: 0 };
        },
      },

      newsroomClient: {
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
          const plaintext = open(stored.envelope, "redacao", newsroomKeypair);
          const payload = decodePayload(plaintext);
          return { text: payload.text, category: stored.category };
        },

        async annotate({ key, note }) {
          await journalistStore.annotate({
            newsroom: newsroomName,
            denunciaKey: key as Hex,
            journalist: journalistAddress,
            authorName,
            status: "review",
          });
        },

        async setStatus(key, status) {
          const arkivStatus =
            status === "in_review" || status === "investigating"
              ? "review"
              : status === "archived"
              ? "discarded"
              : status === "unread"
              ? "new"
              : (status as any);

          await journalistStore.annotate({
            newsroom: newsroomName,
            denunciaKey: key as Hex,
            journalist: journalistAddress,
            authorName,
            status: arkivStatus,
          });
        },

        async reply(item, text) {
          const stored = recordedEntities[item.key];
          const mId = mailboxId(stored.mailboxPub);
          const replyData = encodeReply({
            newsroom: newsroomName,
            text,
          });
          const sealed = sealReply(stored.envelope.mailboxPub, replyData);
          await journalistStore.publishReply({
            newsroom: newsroomName,
            mailboxId: mId,
            sealed,
            retentionSeconds: 60 * 86400,
            authorName,
          });
        },
      },
    };

    // -------------------------------------------------------------------------
    // 3. EXECUÇÃO DO FLUXO PELA INTERFACE DO NOVO FRONTEND (USER JOURNEY)
    // -------------------------------------------------------------------------
    const controller = createWebsiteController(websiteDeps);

    // Passo 1: Fonte entra na página inicial
    expect(controller.state.view).toBe("home");

    // Passo 2: Fonte clica no botão "Enviar denúncia anônima"
    controller.startReport();
    expect(controller.state.view).toBe("report");
    expect(controller.state.reportStep).toBe(1);

    // Passo 3: Fonte seleciona a redação e continua
    controller.selectNewsroom(newsroomName);
    controller.setReportStep(2);
    expect(controller.state.reportStep).toBe(2);

    // Passo 4: Fonte seleciona categoria e digita a denúncia confidencial
    controller.selectCategory("corrupcao");
    const textoSegredo = "Documentos confidenciais comprovam desvio de verbas em contratos emergenciais.";
    controller.setMessage(textoSegredo);

    // Passo 5: Fonte clica em "Verificar e enviar"
    const receipt = await controller.submitReport();

    // Verificações da tela de sucesso e dados do recibo
    expect(controller.state.reportStep).toBe(3);
    expect(receipt.id).toMatch(/^BR-\d{4}$/);
    expect(receipt.category).toBe("corrupcao");
    expect(receipt.newsroom).toBe(newsroomName);
    expect(receipt.text).toBe(textoSegredo);
    expect(receipt.key).toBeDefined();

    // -------------------------------------------------------------------------
    // 4. JORNADA DO JORNALISTA NA REDAÇÃO (EDITORIAL DESK)
    // -------------------------------------------------------------------------
    // Passo 6: Jornalista acessa a "Área da redação" pelo menu
    await controller.openEditorialDesk();
    expect(controller.state.view).toBe("desk");
    expect(controller.state.reports.length).toBeGreaterThan(0);

    // Passo 7: Jornalista encontra a denúncia recebida na Inbox
    const reportItem = controller.state.reports.find((r) => r.id === receipt.id)!;
    expect(reportItem).toBeDefined();
    expect(reportItem.decrypted).toBe(false);

    // Passo 8: Jornalista foca na denúncia e clica para decifrar o conteúdo protegido
    controller.selectReport(reportItem);
    const textoDecifrado = await controller.decryptSelectedReport();

    // O texto decifrado na interface deve corresponder exatamente ao segredo da fonte!
    expect(textoDecifrado).toBe(textoSegredo);
    expect(controller.state.selectedReport?.decrypted).toBe(true);
    expect(controller.state.selectedReport?.text).toBe(textoSegredo);

    // Passo 9: Jornalista salva nota de apuração interna
    const nota = "Investigação prioritária iniciada; checando dados no Diário Oficial.";
    await controller.saveInternalNote(nota);
    expect(controller.state.selectedReport?.internalNote).toBe(nota);

    // Passo 10: Jornalista altera status da denúncia para "investigating"
    await controller.updateReportStatus("investigating");
    expect(controller.state.selectedReport?.status).toBe("investigating");

    // Passo 11: Jornalista envia réplica oficial cifrada para a caixa postal anônima
    const respostaRedacao = "Recebemos sua denúncia. Os fatos estão sendo apurados pela editoria de política.";
    await controller.replyToReport(respostaRedacao);

    // -------------------------------------------------------------------------
    // 5. FONTE LÊ A RESPOSTA OFICIAL ATRAVÉS DO SEU RECIBO
    // -------------------------------------------------------------------------
    const replies = await controller.readRepliesWithReceipt(receipt);
    expect(replies.length).toBe(1);
    expect(replies[0]!.text).toBe(respostaRedacao);
    expect(replies[0]!.author).toBe(authorName);
  });
});
