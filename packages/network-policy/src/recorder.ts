export type RecordedRequest = {
  url: string;
  method: string;
  allowed: boolean;
  timestamp: number;
};

/**
 * Gravador em memória de tentativas de rede. Usado pelos testes de privacidade
 * para provar quais hosts o app tentou contatar (e se foram bloqueados).
 */
export class RequestRecorder {
  #entries: RecordedRequest[] = [];

  record(url: string | URL, init?: RequestInit, allowed = true): void {
    this.#entries.push({
      url: typeof url === "string" ? url : url.toString(),
      method: (init?.method ?? "GET").toUpperCase(),
      allowed,
      timestamp: Date.now(),
    });
  }

  /** Cópia imutável das tentativas gravadas, em ordem cronológica. */
  get entries(): readonly RecordedRequest[] {
    return [...this.#entries];
  }

  get size(): number {
    return this.#entries.length;
  }

  clear(): void {
    this.#entries.length = 0;
  }
}
