export const DEFAULT_BLOCK_RETENTION_SECONDS = 182 * 24 * 60 * 60;
export const ENTITY_SCHEMAS = {
  denuncia: {
    readonly: true,
    permissionlessExtension: true,
    defaultStatus: "unread",
  },
  resposta: {
    readonly: false,
    permissionlessExtension: true,
    defaultStatus: "sent",
  },
  anotacao: {
    readonly: false,
    permissionlessExtension: true,
    defaultStatus: "updated",
  },
} as const;

export const ARKIV_MAX_BYTES = 131_072;
export const ARKIV_PRACTICAL_ENTITY_BYTES = 120_000;
export const PART_PAYLOAD_BYTES = 100_000;
