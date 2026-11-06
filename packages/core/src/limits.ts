/** Limites do protocolo e chaves de registro ENS usadas em todo o monorepo. */

export const ARKIV_MAX_BYTES = 131_072; // 128 KiB
export const ARKIV_PRACTICAL_ENTITY_BYTES = 120_000;
export const PART_PAYLOAD_BYTES = 100_000;

export const ENS_KEYS = {
  KEY: "denuncia.key",
  VERSION: "denuncia.version",
  POLICY: "denuncia.policy",
  READER_KEY: "denuncia.readerkey",
} as const;

export type EnsKey = (typeof ENS_KEYS)[keyof typeof ENS_KEYS];
