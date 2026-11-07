import {
  createAdmin,
  createReader,
  ABIS,
  ENSV2_SEPOLIA,
  type AdminStep,
  type EnsReadClient,
  type Newsroom,
} from '@blind-report/ens-client'
import { createNewsroomClient } from '@blind-report/newsroom-client'
import { createMemoryChain, createStore } from '@blind-report/arkiv-store'
import { ENS_KEYS, type NewsroomPolicy } from '@blind-report/core'
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
  authorName?: string
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
): NonNullable<WebsiteDeps['newsroomClient']> & { ensureNewsroom: (name?: string) => Promise<Newsroom> } {
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

          if (args[0] && typeof args[0] === 'object' && provider && typeof (provider as any).request === 'function') {
            try {
              const activeAccounts = (await (provider as any).request({ method: 'eth_accounts' })) as string[]
              if (activeAccounts && activeAccounts.length > 0 && activeAccounts[0]) {
                ;(args[0] as Record<string, unknown>).account = activeAccounts[0] as Address
              }
            } catch {
              // fallback para a conta padrão do target
            }
          }

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
    authorName: options.authorName,
    now: () => new Date(),
  })

  async function ensureNewsroom(requestedName?: string): Promise<Newsroom> {
    const existing = coreNewsroom.newsroom()
    if (existing && (!requestedName || requestedName === existing.name || requestedName === 'Public Ledger')) {
      return existing
    }

    let targetName = (requestedName || '').trim()
    if (!targetName || targetName === 'Public Ledger' || !targetName.includes('.')) {
      targetName = 'br53fd4i.eth'
    }

    const label = targetName.split('.')[0] || 'br53fd4i'
    const ethRegistry = ENSV2_SEPOLIA.ethRegistry as Address

    let resolver: Address
    let subRegistry: Address
    try {
      const [r, s] = await Promise.all([
        publicClient.readContract({
          address: ethRegistry,
          abi: ABIS.ethRegistry,
          functionName: 'getResolver',
          args: [label],
        }) as Promise<Address>,
        publicClient.readContract({
          address: ethRegistry,
          abi: ABIS.ethRegistry,
          functionName: 'getSubregistry',
          args: [label],
        }) as Promise<Address>,
      ])
      resolver = r
      subRegistry = s
    } catch (err: any) {
      throw new Error(`Falha ao consultar ENS da redação "${targetName}" na Sepolia: ${err?.message ?? err}`)
    }

    const zeroAddress = '0x0000000000000000000000000000000000000000'
    if (!resolver || resolver === zeroAddress) {
      if (label !== 'br53fd4i') {
        try {
          return await ensureNewsroom('br53fd4i.eth')
        } catch {}
      }
      throw new Error(`Redação "${targetName}" não encontrada no ENSv2 da Sepolia. Cadastre a redação primeiro.`)
    }

    const newsroom: Newsroom = {
      name: `${label}.eth`,
      label,
      resolver,
      subRegistry: !subRegistry || subRegistry === zeroAddress ? resolver : subRegistry,
    }

    coreNewsroom.useNewsroom(newsroom)
    return newsroom
  }

  return {
    ensureNewsroom,

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

    async rotateKey(newsroomName?: string): Promise<number> {
      const n = await ensureNewsroom(newsroomName)

      let onChainVer = 0
      try {
        const textVer = await publicClient.getEnsText({
          name: n.name,
          key: ENS_KEYS.pubkeyVersion,
          universalResolverAddress: ENSV2_SEPOLIA.universalResolver as Address,
        })
        if (textVer) onChainVer = Number(textVer) || 0
      } catch {
        try {
          const info = await reader.resolveNewsroom(n.name)
          onChainVer = info.pubkeyVersion ?? 0
        } catch {}
      }

      const knownVersions = coreNewsroom.keyVersions()
      const nextVersion = Math.max(onChainVer, ...knownVersions) + 1

      return coreNewsroom.rotateKey(nextVersion)
    },

    async updatePolicy(policy: NewsroomPolicy, newsroomName?: string): Promise<void> {
      await ensureNewsroom(newsroomName)
      return coreNewsroom.updatePolicy(policy)
    },

    async addJournalist(
      a: {
        label: string
        address: Address
        readerPublicKey: Uint8Array
        validForSeconds?: number
      },
      newsroomName?: string
    ) {
      await ensureNewsroom(newsroomName)
      return coreNewsroom.addJournalist(a)
    },

    async revokeJournalist(label: string, newsroomName?: string) {
      await ensureNewsroom(newsroomName)
      return coreNewsroom.revokeJournalist(label)
    },

    async renewJournalist(label: string, validForSeconds: number, newsroomName?: string) {
      await ensureNewsroom(newsroomName)
      return coreNewsroom.renewJournalist(label, validForSeconds)
    },

    shareKeyring(readerPublicKey: Uint8Array): string {
      return coreNewsroom.shareKeyring(readerPublicKey)
    },

    importSharedKeyring(blob: string, reader: any) {
      return coreNewsroom.importSharedKeyring(blob, reader)
    },

    async exportBackup(password: string, newsroomName?: string): Promise<string> {
      await ensureNewsroom(newsroomName)
      return coreNewsroom.exportBackup(password)
    },

    async importBackup(blob: string, password: string): Promise<void> {
      return coreNewsroom.importBackup(blob, password)
    },

    resolveJournalistOwner: async (name: string): Promise<Address | null> => {
      return reader.journalistOwner(name)
    },

    resolveReaderKey: async (name: string): Promise<Uint8Array> => {
      return reader.resolveReaderKey(name)
    },

    isActiveJournalist: async (name: string): Promise<boolean> => {
      return reader.isActiveJournalist(name)
    },

    currentKey: () => {
      try {
        return coreNewsroom.currentKey()
      } catch {
        return undefined
      }
    },

    keyVersions: () => coreNewsroom.keyVersions(),

    exportKeyringForTest: () => coreNewsroom.exportKeyringForTest(),

    async listInbox(opts?: any) {
      return coreNewsroom.listInbox(opts ?? {})
    },

    async decrypt(item: any) {
      return coreNewsroom.decrypt(item)
    },

    async annotate(_a: { key: string; note: string }): Promise<void> {
      // Arkiv store uses annotate for status; internal notes are persisted on state
    },

    async setStatus(key: `0x${string}`, status: any) {
      await ensureNewsroom()
      const arkivStatus =
        status === 'in_review' || status === 'investigating'
          ? 'review'
          : status === 'archived'
          ? 'discarded'
          : (status === 'review' || status === 'discarded' || status === 'published' ? status : 'new')
      const txHash = await coreNewsroom.setStatus(key, arkivStatus as any)
      options.onTxRecorded?.({
        hash: txHash,
        label: `Arkiv Status Annotation Signed: ${status}`,
        url: 'https://rabdi.explorer.arkiv.network',
      })
      return txHash
    },

    async reply(item: any, text: string) {
      await ensureNewsroom()
      const rawEnv = item.envelope ?? item.rawEnvelope
      const targetItem = rawEnv ? { ...item, envelope: rawEnv } : item
      const txHash = await coreNewsroom.reply(targetItem, text)
      options.onTxRecorded?.({
        hash: txHash,
        label: `Sealed Reply Dispatched to Source Mailbox on Arkiv`,
        url: 'https://rabdi.explorer.arkiv.network',
      })
      return txHash
    },

    async renew(key: `0x${string}`, retentionSeconds: number) {
      const res = await coreNewsroom.renew(key, retentionSeconds)
      options.onTxRecorded?.({
        hash: key,
        label: `Arkiv Retention Extended (+${Math.round(retentionSeconds / 86400)} days)`,
        url: 'https://rabdi.explorer.arkiv.network',
      })
      return res
    },

    async listExpiring(withinSeconds: number) {
      return coreNewsroom.listExpiring(withinSeconds)
    },
  }
}
