import { fromBase64Url, isNewsroomName, parsePolicy } from "@blind-report/core";
import { isAddress, zeroAddress, type Address } from "viem";
import { EnsResolutionError } from "./errors";
import type { NewsroomInfo } from "./types";

export type NewsroomRecords = {
  key?: string;
  version?: string;
  policy?: string;
  custodianAddress?: string;
};

/** Valida uma chave pública X25519 publicada em registro textual (base64url, 32 bytes). */
export function parsePublicKeyRecord(value: string | undefined, field: string): string {
  if (typeof value !== "string" || value.length === 0) throw new EnsResolutionError(`${field} is missing`);
  let bytes: Uint8Array;
  try {
    bytes = fromBase64Url(value);
  } catch {
    throw new EnsResolutionError(`${field} must be valid base64url`);
  }
  if (bytes.length !== 32) throw new EnsResolutionError(`${field} must be 32 bytes`);
  return value;
}

/** Valida o registro `denuncia.version` (inteiro positivo em decimal). */
export function parseVersionRecord(value: string | undefined): number {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    throw new EnsResolutionError("denuncia.version must be a positive integer");
  }
  const version = Number(value);
  if (!Number.isSafeInteger(version)) throw new EnsResolutionError("denuncia.version is out of range");
  return version;
}

/** Converte os registros textuais + custodiante em `NewsroomInfo` validado. */
export function parseNewsroomRecords(name: string, records: NewsroomRecords): NewsroomInfo {
  if (!isNewsroomName(name)) throw new EnsResolutionError(`invalid newsroom name: ${name}`);
  const publicKey = parsePublicKeyRecord(records.key, "denuncia.key");
  const version = parseVersionRecord(records.version);
  let policy;
  try {
    policy = parsePolicy(records.policy ?? "");
  } catch (error) {
    throw new EnsResolutionError(`invalid denuncia.policy: ${(error as Error).message}`);
  }
  const custodianAddress = records.custodianAddress;
  if (typeof custodianAddress !== "string" || !isAddress(custodianAddress) || custodianAddress.toLowerCase() === zeroAddress) {
    throw new EnsResolutionError("newsroom has no valid custodian address");
  }
  return { name, publicKey, version, policy, custodianAddress: custodianAddress as Address };
}
