import { actionFor, currentEpoch } from "@blind-report/core";
import { createRpContext } from "@blind-report/worldid-gate";

export type RelayerApp = {
  handleRequest: (request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
  }) => Promise<{ statusCode: number; headers?: Record<string, string>; body: string }>;
};

export function createRelayerApp({
  rpSecret,
  newsroomName,
}: {
  rpSecret: string;
  newsroomName: string;
}): RelayerApp {
  return {
    async handleRequest(request) {
      const url = new URL(request.url, "http://localhost");

      if (request.method === "GET" && url.pathname === "/health") {
        return {
          statusCode: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "ok", timestamp: Date.now() }),
        };
      }

      if (request.method === "GET" && url.pathname === "/rp-context") {
        const newsroom = url.searchParams.get("newsroom") ?? newsroomName;
        const action = actionFor(newsroom, currentEpoch());
        const context = createRpContext({
          rpId: newsroom,
          action,
          secret: rpSecret,
          validMs: 60_000,
        });

        return {
          statusCode: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(context),
        };
      }

      if (request.method === "POST" && url.pathname === "/submissions") {
        return {
          statusCode: 201,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            entityKey: "0xsubmission",
            epoch: currentEpoch(),
            receivedAt: Math.floor(Date.now() / 1000),
          }),
        };
      }

      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: "not_found" }),
      };
    },
  };
}
