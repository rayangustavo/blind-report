import type { StorageBackend } from "./backend";

export type StoredEntity = {
  entityKey: string;
  schema: string;
  attributes: Record<string, string | number>;
  payload: Uint8Array;
  expirationAt: number;
  custody: string;
};

export class MemoryBackend implements StorageBackend {
  private entities = new Map<string, StoredEntity>();

  async createEntity(
    schema: string,
    attributes: Record<string, string | number>,
    payload: Uint8Array,
  ): Promise<{ entityKey: string }> {
    const entityKey = `entity:${schema}:${this.entities.size + 1}:${Date.now()}`;
    const expirationAt = Date.now() + 182 * 24 * 60 * 60 * 1000;

    this.entities.set(entityKey, {
      entityKey,
      schema,
      attributes,
      payload: new Uint8Array(payload),
      expirationAt,
      custody: "0xowner",
    });

    return { entityKey };
  }

  async transferCustody(entityKey: string, newOwner: string): Promise<void> {
    const entity = this.entities.get(entityKey);
    if (!entity) throw new Error(`Unknown entity: ${entityKey}`);
    entity.custody = newOwner;
  }

  async queryEntities(
    schema: string,
    filter: Record<string, string | number>,
  ): Promise<Array<{ entityKey: string; attributes: Record<string, any>; payload: Uint8Array }>> {
    return [...this.entities.values()]
      .filter((entity) => entity.schema === schema)
      .filter((entity) => {
        return Object.entries(filter).every(([key, value]) => entity.attributes[key] === value);
      })
      .map(({ entityKey, attributes, payload }) => ({
        entityKey,
        attributes,
        payload: new Uint8Array(payload),
      }));
  }

  async extendExpiration(entityKey: string, extraSeconds: number): Promise<void> {
    const entity = this.entities.get(entityKey);
    if (!entity) throw new Error(`Unknown entity: ${entityKey}`);
    entity.expirationAt += extraSeconds * 1000;
  }

  getEntity(entityKey: string): StoredEntity | undefined {
    return this.entities.get(entityKey);
  }
}
