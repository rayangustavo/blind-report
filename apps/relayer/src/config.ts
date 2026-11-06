export type RelayerConfig = {
  port: number;
  rpSecret: string;
  arkivAccessKey: string;
  newsroomName: string;
  worldIdAppId: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  nodeEnv: string;
};

export function loadConfig(env: Record<string, string | undefined> = process.env): RelayerConfig {
  return {
    port: Number(env.RELAYER_PORT ?? "3000"),
    rpSecret: env.RP_SECRET ?? "dev-secret",
    arkivAccessKey: env.ARKIV_ACCESS_KEY ?? "dev-access-key",
    newsroomName: env.NEWSROOM_NAME ?? "folha.eth",
    worldIdAppId: env.WORLD_ID_APP_ID ?? "blind-report",
    rateLimitWindowMs: Number(env.RATE_LIMIT_WINDOW_MS ?? "60000"),
    rateLimitMax: Number(env.RATE_LIMIT_MAX ?? "10"),
    nodeEnv: env.NODE_ENV ?? "development",
  };
}
