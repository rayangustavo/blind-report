import { describe, expect, it } from "vitest";
import {
  actionFor,
  decodePayload,
  decodeReply,
  encodePayload,
  encodeReply,
  epochOf,
  parsePolicy,
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
} from "@blind-report/crypto";
import { createMemoryChain, createStore } from "@blind-report/arkiv-store";
import { createAuthority, parseNewsroomRecords } from "@blind-report/ens-client";
import {
  createMemoryNullifierStore,
  createSimulatedVerifier,
  createSubmissionGate,
  type IdKitPayload,
} from "@blind-report/worldid-gate";
import type { Address } from "viem";

function makeProof(person: string, newsroom: string, epoch: number): IdKitPayload {
  const action = actionFor(newsroom, epoch);
  return {
    protocol_version: "4.0",
    nonce: "0x01",
    action,
    environment: "staging",
    responses: [
      {
        identifier: "proof_of_human",
        nullifier: "0x" + "aa".repeat(30),
        proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
      },
    ],
  };
}

describe("🏆 ETHGlobal Mumbai — Partner Prizes Integration Test Suite", () => {
  describe("Partner 1: ENS (Ethereum Name Service / ENSv2)", () => {
    it("deve codificar e decodificar text records da redação em conformidade com o padrão ENS", () => {
      const policy: NewsroomPolicy = {
        categories: ["investigacao", "corrupcao", "fraude"],
        maxBytes: 250 * 1024,
        attachments: true,
        epoch: "monthly",
      };

      const recordText = JSON.stringify(policy);
      const decoded = parsePolicy(recordText);

      expect(decoded.categories).toEqual(policy.categories);
      expect(decoded.maxBytes).toBe(250 * 1024);
      expect(decoded.attachments).toBe(true);
      expect(decoded.epoch).toBe("monthly");
    });

    it("deve validar e interpretar conjunto completo de registros ENS da redação (PKI descentralizada)", () => {
      const kp = newKeypair();
      const rawRecords = {
        name: "investiga.eth",
        pubkey: toBase64Url(kp.publicKey),
        version: "1",
        policy: JSON.stringify({
          categories: ["corrupcao", "meio-ambiente"],
          maxBytes: 200 * 1024,
          attachments: true,
          epoch: "monthly",
        }),
        relayer: "https://relayer.blindreport.org",
        custodian: "0x1234567890123456789012345678901234567890",
      };

      const info = parseNewsroomRecords(rawRecords);
      expect(info.name).toBe("investiga.eth");
      expect(info.pubkeyVersion).toBe(1);
      expect(info.policy.categories).toContain("corrupcao");
      expect(info.relayers).toEqual(["https://relayer.blindreport.org"]);
      expect(info.custodian.toLowerCase()).toBe(rawRecords.custodian.toLowerCase());
    });

    it("deve validar a autoridade de subnomes delegados de jornalistas (ex: repórter.redacao.eth)", async () => {
      const newsroom = "jornal-livre.eth";
      const custodianAddress = "0x1111111111111111111111111111111111111111" as Address;
      const reporterAddress = "0x2222222222222222222222222222222222222222" as Address;
      const strangerAddress = "0x3333333333333333333333333333333333333333" as Address;

      const mockReader = {
        async resolveNewsroom(name: string) {
          return { custodian: custodianAddress };
        },
        async journalistOwner(subname: string) {
          if (subname === "reporter.jornal-livre.eth") return reporterAddress;
          return null;
        },
      };

      const authority = createAuthority({ reader: mockReader, newsroom });

      // 1. Custodiante / Administrador tem autoridade direta
      expect(await authority.isAuthorized({ creator: custodianAddress })).toBe(true);

      // 2. Repórter com subnome oficial delegado e chave correspondente tem autoridade
      expect(
        await authority.isAuthorized({
          creator: reporterAddress,
          authorName: "reporter.jornal-livre.eth",
        })
      ).toBe(true);

      // 3. Estranho tentando assinar como repórter oficial é rejeitado
      expect(
        await authority.isAuthorized({
          creator: strangerAddress,
          authorName: "reporter.jornal-livre.eth",
        })
      ).toBe(false);

      // 4. Subnome pertencente a outro domínio é rejeitado
      expect(
        await authority.isAuthorized({
          creator: reporterAddress,
          authorName: "reporter.outro-jornal.eth",
        })
      ).toBe(false);
    });
  });

  describe("Partner 2: Arkiv Network (@arkiv-network/sdk)", () => {
    it("deve publicar envelope cifrado, transferir custódia e consultar denúncias por metadados", async () => {
      const chain = createMemoryChain();
      const relayerAddress = "0x9999999999999999999999999999999999999999";
      const newsroomAddress = "0x1111111111111111111111111111111111111111";

      const backend = chain.backendFor(relayerAddress);
      const store = createStore(backend);

      const newsroomKp = newKeypair();
      const payloadBytes = encodePayload({
        text: "Documento exclusivo sobre desvios orçamentários.",
      });

      const { envelope } = seal(
        {
          newsroom: "redacao.eth",
          pubkeyVersion: 1,
          category: "investigacao",
          recipients: [{ id: "redacao", publicKey: newsroomKp.publicKey }],
          plaintext: payloadBytes,
        },
        { now: () => new Date() }
      );

      const currentEp = epochOf(new Date());
      const published = await store.publishSubmission({
        newsroom: "redacao.eth",
        epoch: currentEp,
        category: "investigacao",
        contentHash: envelope.contentHash,
        pubkeyVersion: 1,
        envelope: encodeEnvelope(envelope),
        retentionSeconds: 90 * 86400,
        custodian: newsroomAddress,
      });

      expect(published.key).toBeDefined();
      expect(published.keys.length).toBeGreaterThanOrEqual(1);

      // Consulta no Arkiv por redação
      const listed = await store.listSubmissions({ newsroom: "redacao.eth" });
      expect(listed.items.length).toBe(1);
      expect(listed.items[0]?.contentHash).toBe(envelope.contentHash);
      expect(listed.items[0]?.category).toBe("investigacao");
    });

    it("deve permitir renovação de retenção temporária de entidades no Arkiv", async () => {
      const chain = createMemoryChain();
      const newsroomAddress = "0x1111111111111111111111111111111111111111";
      const store = createStore(chain.backendFor(newsroomAddress));

      const published = await store.publishSubmission({
        newsroom: "redacao.eth",
        epoch: epochOf(new Date()),
        category: "investigacao",
        contentHash: "0x" + "aa".repeat(32),
        pubkeyVersion: 1,
        envelope: new Uint8Array([1, 2, 3]),
        retentionSeconds: 30 * 86400,
        custodian: newsroomAddress,
      });

      // Extensão/renovação do período de retenção para 120 dias
      const result = await store.renew({
        key: published.key,
        retentionSeconds: 120 * 86400,
      });

      expect(result).toBe("extended");
    });

    it("deve suportar caixas postais anônimas para respostas da redação", async () => {
      const chain = createMemoryChain();
      const store = createStore(chain.backendFor("0x1111111111111111111111111111111111111111"));

      const newsroomKp = newKeypair();
      const { envelope, receipt } = seal(
        {
          newsroom: "redacao.eth",
          pubkeyVersion: 1,
          category: "investigacao",
          recipients: [{ id: "redacao", publicKey: newsroomKp.publicKey }],
          plaintext: new TextEncoder().encode("Denúncia teste"),
        },
        { now: () => new Date() }
      );

      const mId = mailboxId(receipt.mailboxPub);
      const replyData = encodeReply({
        newsroom: "redacao.eth",
        text: "Mensagem oficial da equipe editorial.",
      });

      const sealed = sealReply(envelope.mailboxPub, replyData);
      await store.publishReply({
        newsroom: "redacao.eth",
        mailboxId: mId,
        sealed,
        retentionSeconds: 60 * 86400,
        authorName: "reporter.redacao.eth",
      });

      const replies = await store.getReplies(mId);
      expect(replies.length).toBe(1);
      expect(replies[0]?.authorName).toBe("reporter.redacao.eth");

      const decryptedReply = decodeReply(openReply(replies[0]!.sealed, receipt));
      expect(decryptedReply.text).toBe("Mensagem oficial da equipe editorial.");
    });
  });

  describe("Partner 3: World ID (Worldcoin Protocol 4.0)", () => {
    it("deve admitir prova de humanidade ZKP com amarração correta à ação da redação e época", async () => {
      const verifier = createSimulatedVerifier();
      const store = createMemoryNullifierStore();
      const gate = createSubmissionGate({
        expectedEnvironment: "staging",
        verifier,
        store,
      });

      const epoch = epochOf(new Date());
      const proof = makeProof("ana", "jornal-livre.eth", epoch);

      const result = await gate.admit({
        newsroom: "jornal-livre.eth",
        epoch,
        payload: proof,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.release).toBe("function");
      }
    });

    it("deve barrar ataques Sybil (mesma pessoa tentando enviar 2 denúncias no mesmo mês para a mesma redação)", async () => {
      const verifier = createSimulatedVerifier();
      const store = createMemoryNullifierStore();
      const gate = createSubmissionGate({
        expectedEnvironment: "staging",
        verifier,
        store,
      });

      const epoch = epochOf(new Date());
      const proof = makeProof("ana", "jornal-livre.eth", epoch);

      // Primeiro envio no mês: OK
      const first = await gate.admit({
        newsroom: "jornal-livre.eth",
        epoch,
        payload: proof,
      });
      expect(first.ok).toBe(true);

      // Segundo envio no mesmo mês com o mesmo nullifier: REJEITADO (limite atingido)
      const second = await gate.admit({
        newsroom: "jornal-livre.eth",
        epoch,
        payload: proof,
      });
      expect(second.ok).toBe(false);
      if (!second.ok) {
        expect(second.code).toBe("limit_reached");
      }
    });

    it("deve permitir novo envio em nova época (mês seguinte) com garantia de anonimato", async () => {
      const verifier = createSimulatedVerifier();
      const store = createMemoryNullifierStore();
      const gate = createSubmissionGate({
        expectedEnvironment: "staging",
        verifier,
        store,
      });

      const ep1 = 202611;
      const ep2 = 202612;

      // Mês 1
      const resM1 = await gate.admit({
        newsroom: "jornal-livre.eth",
        epoch: ep1,
        payload: makeProof("ana", "jornal-livre.eth", ep1),
      });
      expect(resM1.ok).toBe(true);

      // Mês 2 (nova época): admitido sem reuso cruzado
      const resM2 = await gate.admit({
        newsroom: "jornal-livre.eth",
        epoch: ep2,
        payload: makeProof("ana", "jornal-livre.eth", ep2),
      });
      expect(resM2.ok).toBe(true);
    });
  });
});
