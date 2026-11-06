import { describe, expect, it } from "vitest";

import { createRelayerApp } from "../src/app";

describe("relayer app", () => {
  it("builds a request handler with health and rp-context endpoints", async () => {
    const app = createRelayerApp({
      rpSecret: "secret",
      newsroomName: "folha.eth",
    });

    expect(app).toBeTruthy();
    expect(typeof app.handleRequest).toBe("function");

    const health = await app.handleRequest({
      method: "GET",
      url: "/health",
      headers: {},
      body: undefined,
    });
    expect(health.statusCode).toBe(200);
  });
});
