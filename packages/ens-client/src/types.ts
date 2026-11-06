import type { NewsroomPolicy } from "@blind-report/core";
import type { Address } from "viem";

/** Dados publicados pela redação nos registros ENS. */
export type NewsroomInfo = {
  name: string;
  publicKey: string;
  version: number;
  policy: NewsroomPolicy;
  custodianAddress: Address;
};
