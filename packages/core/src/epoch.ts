/** Épocas de submissão: período UTC mensal no formato `YYYY-MM` (ex.: `2026-11`). */

const EPOCH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export type EpochPeriod = "monthly";

/**
 * Época à qual uma data pertence. Datas são interpretadas em UTC, então o
 * resultado não depende do fuso horário da máquina.
 */
export function epochOf(date: Date = new Date(), period: EpochPeriod = "monthly"): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError("epochOf expects a valid Date");
  }
  if (period !== "monthly") {
    throw new TypeError(`unsupported epoch period: ${String(period)}`);
  }
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}

/** Valida o formato `YYYY-MM` com mês entre 01 e 12. */
export function isEpoch(str: string): boolean {
  return typeof str === "string" && EPOCH_RE.test(str);
}

/** Época corrente em UTC. */
export function currentEpoch(): string {
  return epochOf(new Date());
}
