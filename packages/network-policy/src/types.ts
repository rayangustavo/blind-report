export type WorldEnvironment = "staging" | "production";

/**
 * Política de rede compilada. Só os hosts listados podem receber tráfego;
 * `hosts` guarda hostnames em minúsculas, sem esquema nem porta.
 */
export type NetworkPolicy = {
  readonly hosts: readonly string[];
  readonly rpcUrl: string;
  readonly worldEnvironment: WorldEnvironment;
  readonly relayerUrl?: string;
};
