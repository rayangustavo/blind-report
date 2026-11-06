import { PART_PAYLOAD_BYTES } from "./constants";
import type { StorageBackend } from "./backend";

export type SubmissionRecord = {
  newsroom: string;
  epoch: string;
  category: string;
  status: string;
  payload: Uint8Array;
  owner: string;
  mailboxId: string;
};

export type StoreAnnotation = {
  status: string;
  notes?: string;
};

export function createStore(backend: StorageBackend) {
  return {
    async publishSubmission(input: SubmissionRecord): Promise<{ entityKey: string; createdAt: number }> {
      const createdAt = Date.now();
      const { entityKey } = await backend.createEntity("denuncia", {
        newsroom: input.newsroom,
        epoch: input.epoch,
        category: input.category,
        status: input.status,
        mailboxId: input.mailboxId,
        createdAt,
      }, input.payload);

      await backend.transferCustody(entityKey, input.owner);

      return { entityKey, createdAt };
    },

    async listSubmissions(filter: Partial<{ newsroom: string; status: string; epoch: string; category: string }> = {}) {
      const entries = await backend.queryEntities("denuncia", {
        ...(filter.newsroom ? { newsroom: filter.newsroom } : {}),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.epoch ? { epoch: filter.epoch } : {}),
        ...(filter.category ? { category: filter.category } : {}),
      });

      return entries.map((entry) => ({
        entityKey: entry.entityKey,
        attributes: entry.attributes,
        payload: entry.payload,
      }));
    },

    async getByMailbox(mailboxId: string) {
      return backend.queryEntities("denuncia", { mailboxId });
    },

    async annotate(entityKey: string, annotation: StoreAnnotation) {
      const updatedAt = Date.now();
      const { entityKey: annotationKey } = await backend.createEntity("anotacao", {
        submissionKey: entityKey,
        status: annotation.status,
        notes: annotation.notes ?? "",
        updatedAt,
      }, new TextEncoder().encode(JSON.stringify(annotation)));

      return {
        entityKey: annotationKey,
        status: annotation.status,
        notes: annotation.notes,
        updatedAt,
      };
    },

    async renewRetention(entityKey: string, extraSeconds: number) {
      await backend.extendExpiration(entityKey, extraSeconds);
    },

    async splitAndStore(input: SubmissionRecord) {
      const payload = input.payload;
      const chunkCount = Math.ceil(payload.length / PART_PAYLOAD_BYTES);
      const chunks: string[] = [];

      for (let index = 0; index < chunkCount; index += 1) {
        const start = index * PART_PAYLOAD_BYTES;
        const chunk = payload.slice(start, start + PART_PAYLOAD_BYTES);
        const created = await backend.createEntity("denuncia", {
          newsroom: input.newsroom,
          epoch: input.epoch,
          category: input.category,
          status: input.status,
          mailboxId: `${input.mailboxId}:${index}`,
          createdAt: Date.now(),
          part: index,
          totalParts: chunkCount,
        }, chunk);
        chunks.push(created.entityKey);
      }

      return chunks;
    },
  };
}
