export type StorageEntity = {
  entityKey: string;
  attributes: Record<string, any>;
  payload: Uint8Array;
};

export interface StorageBackend {
  createEntity(
    schema: string,
    attributes: Record<string, string | number>,
    payload: Uint8Array,
  ): Promise<{ entityKey: string }>;
  transferCustody(entityKey: string, newOwner: string): Promise<void>;
  queryEntities(
    schema: string,
    filter: Record<string, string | number>,
  ): Promise<Array<{ entityKey: string; attributes: Record<string, any>; payload: Uint8Array }>>;
  extendExpiration(entityKey: string, extraSeconds: number): Promise<void>;
}
