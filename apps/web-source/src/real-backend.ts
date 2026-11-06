// Liga a UI ao backend real: ENSv2 na Sepolia, Arkiv (Rabdi) e relayer local.
// Usado pelo build de produção; a demo (build-demo.mjs) mantém o backend simulado.
import { createReader, type EnsReadClient } from "@blind-report/ens-client";
import { createSdkBackend, createStore } from "@blind-report/arkiv-store";
import { guardedFetch, RPC_TRANSPORT } from "@blind-report/network-policy";
import { createIdKitProofProvider, createSourceClient, sourceNetworkPolicy } from "@blind-report/source-client";
import { createPublicClient as createArkivPublic, createWalletClient as createArkivWallet } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { createPublicClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { cancellable } from "./controller.ts";

export type RealConfig = { rpcUrl: string; relayerUrl: string; arkivRpcUrl: string; arkivAccessKey?: string };

/**
 * Cria o client real da fonte. `onLink` recebe a URI do World App e deve ser
 * ligado ao controller para que a tela mostre o link da prova.
 */
export async function createRealBackend(onLink: (uri: string) => void) {
  const config: RealConfig = await (await fetch("config.json")).json();
  const policy = sourceNetworkPolicy(config);
  const guarded = guardedFetch(policy);

  const ens = createPublicClient({ chain: sepolia, transport: http(config.rpcUrl, { fetchFn: guarded, ...RPC_TRANSPORT }) });
  // Leitura apenas: a conta abaixo é descartável, nunca assina nem paga nada.
  const chain = rabdi({ accessKey: config.arkivAccessKey ?? "" });
  const transport = http(undefined, { fetchFn: guarded, ...RPC_TRANSPORT });
  const store = createStore(
    createSdkBackend({
      publicClient: createArkivPublic({ chain: chain as never, transport }),
      walletClient: createArkivWallet({ chain: chain as never, transport, account: privateKeyToAccount(generatePrivateKey()) }),
    }),
  );

  const proof = cancellable(createIdKitProofProvider({ onLink }));
  const client = createSourceClient({
    fetch: guarded,
    relayerUrl: config.relayerUrl,
    reader: createReader({ client: ens as unknown as EnsReadClient }),
    replies: store,
    submissions: store,
    proofProvider: proof.provider,
    now: () => new Date(),
  });

  return { config, client, proof };
}
