import type { StorageBackend } from "./backend";

export class SdkBackend implements StorageBackend {
  constructor(private readonly sdk: any = undefined) {}

  async createEntity(schema: string, attributes: Record<string, string | number>, payload: Uint8Array): Promise<{ entityKey: string }> {
    if (!this.sdk) {
      return { entityKey: `sdk:${schema}:${Date.now()}` };
    }
    const created = await this.sdk.createEntity?.(schema, attributes, payload);
    return { entityKey: created?.entityKey ?? `sdk:${schema}:${Date.now()}` };
  }

  async transferCustody(entityKey: string, newOwner: string): Promise<void> {
    if (this.sdk?.transferCustody) {
      await this.sdk.transferCustody(entityKey, newOwner);
    }
  }

  async queryEntities(
    schema: string,
    filter: Record<string, string | number>,
  ): Promise<Array<{ entityKey: string; attributes: Record<string, any>; payload: Uint8Array }>> {
    if (!this.sdk?.queryEntities) {
      return [];
    }
    return this.sdk.queryEntities(schema, filter);
  }

  async extendExpiration(entityKey: string, extraSeconds: number): Promise<void> {
    if (this.sdk?.extendExpiration) {
      await this.sdk.extendExpiration(entityKey, extraSeconds);
    }
  }
}
