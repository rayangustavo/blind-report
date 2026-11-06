import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface NullifierStore {
  consume(action: string, nullifierHash: string): Promise<boolean>;
  release(action: string, nullifierHash: string): Promise<void>;
}

export function createMemoryNullifierStore(): NullifierStore {
  const seen = new Set<string>();

  return {
    async consume(action: string, nullifierHash: string) {
      const key = `${action}:${nullifierHash}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    },
    async release(action: string, nullifierHash: string) {
      seen.delete(`${action}:${nullifierHash}`);
    },
  };
}

export function createFileNullifierStore(filePath: string): NullifierStore {
  const normalizedFilePath = resolve(filePath);
  const cache = new Map<string, boolean>();

  async function load() {
    try {
      const raw = await readFile(normalizedFilePath, "utf8");
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      for (const [key, value] of Object.entries(parsed)) {
        if (value) cache.set(key, true);
      }
    } catch {
      await mkdir(dirname(normalizedFilePath), { recursive: true });
    }
  }

  const init = load();

  return {
    async consume(action: string, nullifierHash: string) {
      await init;
      const key = createHash("sha256").update(`${action}:${nullifierHash}`).digest("hex");
      if (cache.has(key)) return false;
      cache.set(key, true);
      await writeFile(normalizedFilePath, JSON.stringify(Object.fromEntries(cache), null, 2), "utf8");
      return true;
    },
    async release(action: string, nullifierHash: string) {
      await init;
      const key = createHash("sha256").update(`${action}:${nullifierHash}`).digest("hex");
      cache.delete(key);
      await writeFile(normalizedFilePath, JSON.stringify(Object.fromEntries(cache), null, 2), "utf8");
    },
  };
}
