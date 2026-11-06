import { describe, expect, it } from "vitest";

import type { StorageBackend } from "../src/backend";

export function backendContract(name: string, createBackend: () => StorageBackend) {
  describe(name, () => {
    it("creates entities and queries by schema and filter", async () => {
      const backend = createBackend();
      const created = await backend.createEntity("denuncia", { newsroom: "folha.eth", category: "politica", status: "unread" }, new TextEncoder().encode("payload"));

      expect(created.entityKey).toBeTruthy();

      const results = await backend.queryEntities("denuncia", { newsroom: "folha.eth" });
      expect(results).toHaveLength(1);
      expect(results[0]?.attributes.newsroom).toBe("folha.eth");
      expect(new TextDecoder().decode(results[0]?.payload ?? new Uint8Array())).toBe("payload");
    });

    it("transfers custody and extends expiration", async () => {
      const backend = createBackend();
      const created = await backend.createEntity("denuncia", { newsroom: "folha.eth", category: "politica", status: "unread" }, new Uint8Array([1, 2, 3]));

      await expect(backend.transferCustody(created.entityKey, "0xredacao")).resolves.toBeUndefined();
      await expect(backend.extendExpiration(created.entityKey, 300)).resolves.toBeUndefined();
    });
  });
}
