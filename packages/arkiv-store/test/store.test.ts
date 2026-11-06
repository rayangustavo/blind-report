import { describe, expect, it } from "vitest";

import { MemoryBackend } from "../src/memory-backend";
import { createStore } from "../src/store";

describe("arkiv-store store", () => {
  it("publishes submissions, queries and annotates", async () => {
    const store = createStore(new MemoryBackend());
    const submission = await store.publishSubmission({
      newsroom: "folha.eth",
      epoch: "2026-11",
      category: "politica",
      status: "unread",
      payload: new TextEncoder().encode("payload"),
      owner: "0xredacao",
      mailboxId: "mailbox-1",
    });

    expect(submission.entityKey).toBeTruthy();

    const listed = await store.listSubmissions({ newsroom: "folha.eth", status: "unread" });
    expect(listed).toHaveLength(1);

    const byMailbox = await store.getByMailbox("mailbox-1");
    expect(byMailbox).toHaveLength(1);

    const annotated = await store.annotate(submission.entityKey, {
      status: "investigating",
      notes: "em revisão",
    });
    expect(annotated.status).toBe("investigating");
  });

  it("renews retention and stores split payloads", async () => {
    const store = createStore(new MemoryBackend());
    const created = await store.publishSubmission({
      newsroom: "folha.eth",
      epoch: "2026-11",
      category: "politica",
      status: "unread",
      payload: new TextEncoder().encode("payload"),
      owner: "0xredacao",
      mailboxId: "mailbox-2",
    });

    await expect(store.renewRetention(created.entityKey, 600)).resolves.toBeUndefined();

    const chunks = await store.splitAndStore({
      newsroom: "folha.eth",
      epoch: "2026-11",
      category: "politica",
      status: "unread",
      payload: new Uint8Array(150_000),
      owner: "0xredacao",
      mailboxId: "mailbox-3",
    });

    expect(chunks).toHaveLength(2);
  });
});
