import { createRelayerApp } from "./app";
import { loadConfig } from "./config";
import { createServer } from "./server";

export function createRelayerComposition(env: Record<string, string | undefined> = process.env) {
  const config = loadConfig(env);
  const app = createRelayerApp({
    rpSecret: config.rpSecret,
    newsroomName: config.newsroomName,
  });

  return {
    config,
    app,
    server: createServer({
      port: config.port,
      handler: (request) => app.handleRequest(request),
    }),
  };
}
