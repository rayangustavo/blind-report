import { describe, expect, it } from "vitest";

import { createServer, createTestServer } from "../src/server";

describe("relayer server", () => {
  it("creates a simple HTTP server", async () => {
    const server = createTestServer();
    const listening = await server.start();
    expect(listening).toBe(true);
    await server.stop();
  });

  it("exposes a server factory", () => {
    const server = createServer({ port: 8080 });
    expect(server).toBeTruthy();
  });
});
