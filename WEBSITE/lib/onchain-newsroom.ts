import {
  createAdmin,
  createReader,
  type AdminStep,
  type EnsReadClient,
  type Newsroom,
} from '@blind-report/ens-client'
import { createNewsroomClient } from '@blind-report/newsroom-client'
import { createMemoryChain, createStore } from '@blind-report/arkiv-store'
import type { NewsroomPolicy } from '@blind-report/core'
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
  type Account,
  type Transport,
  type Chain,
} from 'viem'
import { sepolia } from 'viem/chains'
import type { Eip1193 } from './wallet'
import type { OnChainTxRecord, WebsiteDeps } from './website-controller'

export interface OnChainNewsroomOptions {
  sepoliaRpcUrl?: string
  wait?: (seconds: number) => Promise<void>
  mintTestToken?: boolean
  onTxRecorded?: (tx: { hash: string; label: string; chainId?: string; url?: string }) => void
  onProgress?: (step: AdminStep) => void
}

/**
 * Cria a dependência real do newsroomClient conectada aos contratos na rede Sepolia via MetaMask e Viem.
 */
export function createOnChainNewsroomDeps(
  provider: Eip1193,
  account: Address,
  options: OnChainNewsroomOptions = {}
): NonNullable<WebsiteDeps['newsroomClient']> {
  const rpcUrl =
    options.sepoliaRpcUrl ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SEPOLIA_RPC_URL) ||
    'https://ethereum-sepolia-rpc.publicnode.com'

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  })

  const baseWallet = createWalletClient({
    account,
    chain: sepolia,
    transport: custom(provider as any),
  })

  // Intercepta chamadas de writeContract para registrar o hash da transação em tempo real
  const walletClient = new Proxy(baseWallet, {
    get(target, prop, receiver) {
      if (prop === 'writeContract') {
        return async (...args: unknown[]) => {
          const fn = Reflect.get(target, prop, receiver) as Function
          const hash = (await fn.apply(target, args)) as Hex
          const callInfo = args[0] as { functionName?: string }
          const name = callInfo?.functionName || 'writeContract'

          options.onTxRecorded?.({
            hash,
            label: `ENSv2 Sepolia: ${name}`,
            chainId: '11155111',
            url: `https://sepolia.etherscan.io/tx/${hash}`,
          })

          return hash
        }
      }
      return Reflect.get(target, prop, receiver)
    },
  }) as WalletClient<Transport, Chain, Account>

  const waitFn =
    options.wait ??
    ((seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1000)))

  let currentProgressCallback: ((step: AdminStep) => void) | undefined = options.onProgress

  const makeAdmin = (hooks: { onProgress: (e: AdminStep) => void }) => {
    return createAdmin({
      publicClient: publicClient as PublicClient,
      walletClient,
      wait: waitFn,
      mintTestToken: options.mintTestToken ?? true,
      onProgress: (step) => {
        hooks.onProgress(step)
        currentProgressCallback?.(step)
        options.onProgress?.(step)
      },
    })
  }

  const reader = createReader({ client: publicClient as unknown as EnsReadClient })
  const memChain = createMemoryChain()
  const store = createStore(memChain.backendFor(account))

  const coreNewsroom = createNewsroomClient({
    makeAdmin,
    reader,
    store,
    account,
    now: () => new Date(),
  })

  return {
    async registerNewsroom(a: {
      label: string
      categories: string[]
      maxBytes: number
      attachments: boolean
      durationSeconds?: number
    }) {
      const policy: NewsroomPolicy = {
        categories: a.categories,
        maxBytes: a.maxBytes,
        attachments: a.attachments,
        epoch: 'monthly',
      }

      return coreNewsroom.registerNewsroom({
        label: a.label,
        policy,
        onProgress: options.onProgress,
      })
    },

    async rotateKey(): Promise<number> {
      return coreNewsroom.rotateKey()
    },

    async updatePolicy(policy: NewsroomPolicy): Promise<void> {
      return coreNewsroom.updatePolicy(policy)
    },

    async addJournalist(a: {
      label: string
      address: Address
      readerPublicKey: Uint8Array
      validForSeconds?: number
    }) {
      return coreNewsroom.addJournalist(a)
    },

    async revokeJournalist(label: string) {
      return coreNewsroom.revokeJournalist(label)
    },

    async renewJournalist(label: string, validForSeconds: number) {
      return coreNewsroom.renewJournalist(label, validForSeconds)
    },

    shareKeyring(readerPublicKey: Uint8Array): string {
      return coreNewsroom.shareKeyring(readerPublicKey)
    },

    importSharedKeyring(blob: string, reader: any) {
      return coreNewsroom.importSharedKeyring(blob, reader)
    },

    async exportBackup(password: string): Promise<string> {
      return coreNewsroom.exportBackup(password)
    },

    async importBackup(blob: string, password: string): Promise<void> {
      return coreNewsroom.importBackup(blob, password)
    },

    async listInbox(opts?: any) {
      return coreNewsroom.listInbox(opts ?? {})
    },

    async decrypt(item: any) {
      return coreNewsroom.decrypt(item)
    },

    async setStatus(key: `0x${string}`, status: any) {
      return coreNewsroom.setStatus(key, status)
    },

    async reply(item: any, text: string) {
      return coreNewsroom.reply(item, text)
    },

    async renew(key: `0x${string}`, retentionSeconds: number) {
      return coreNewsroom.renew(key, retentionSeconds)
    },

    async listExpiring(withinSeconds: number) {
      return coreNewsroom.listExpiring(withinSeconds)
    },
  }
}
