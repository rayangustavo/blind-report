import sodium from "libsodium-wrappers";

export type SodiumLib = typeof sodium;

let pending: Promise<SodiumLib> | undefined;

/** Inicializa o libsodium uma única vez e devolve a biblioteca pronta. */
export function loadSodium(): Promise<SodiumLib> {
  pending ??= sodium.ready.then(() => sodium);
  return pending;
}
