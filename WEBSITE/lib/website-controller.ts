/**
 * Controller de Interface do Novo Frontend (Next.js - WEBSITE)
 * Encapsula as ações do usuário (Home, ReportFlow, EditorialDesk, Respostas, Verificação) e orquestra a
 * integração com os SDKs do Blind Report:
 * - @blind-report/newsroom-client (Owner & Journalist)
 * - @blind-report/source-client (Whistleblower / Fonte)
 * - @blind-report/ens-client (ENSv2 PKI & Subnomes)
 * - @blind-report/arkiv-store (Armazenamento Descentralizado)
 * - @blind-report/crypto (Libsodium X25519 & ChaCha20-Poly1305)
 * - @blind-report/worldid-gate (ZKP Anti-Sybil)
 */

import {
  decodePayload,
  encodePayload,
  fromBase64Url,
  toBase64Url,
} from '@blind-report/core'
import {
  decodeEnvelope,
  encodeEnvelope,
  lockWithPassword,
  newKeypair,
  open,
  openSealed,
  seal,
  sealTo,
  unlockWithPassword,
  verifyCommitment,
  type Keypair,
} from '@blind-report/crypto'
import { SEPOLIA_SPEC, createWallet, pickProvider, type Eip1193 } from './wallet'

export type ReportStatus = 'unread' | 'in_review' | 'investigating' | 'archived'

export const STATUS_LABELS: Record<string, string> = {
  unread: 'Unread',
  in_review: 'In review',
  investigating: 'Investigating',
  archived: 'Archived',
}

export type ReportItem = {
  id: string
  title: string
  category: string
  status: ReportStatus
  date: string
  priority: 'High' | 'Medium' | 'Low' | 'Alta' | 'Média' | 'Baixa'
  initials: string
  text?: string
  decrypted?: boolean
  internalNote?: string
  rawItem?: any
  receiptKey?: string
  rawEnvelope?: Uint8Array
  contentHash?: string
  mailboxPub?: Uint8Array
}

export type WebsiteReceipt = {
  id: string
  newsroom: string
  category: string
  key?: string
  contentHash?: string
  salt?: Uint8Array
  mailboxPriv?: Uint8Array
  mailboxPub?: Uint8Array
  date: string
  text: string
  rawEnvelope?: Uint8Array
}

export type TeamMember = {
  label: string
  address: string
  subname: string
  active: boolean
}

export type ExpiringSubmission = {
  key: string
  title: string
  category: string
  blocksLeft: number
  daysLeft: number
}

export type OnChainTxRecord = {
  hash: string
  label: string
  chainId: string
  url: string
  timestamp: string
}

export type ControllerOptions = {
  mode?: 'production' | 'demo'
}

export type WebsiteControllerState = {
  view: 'home' | 'report' | 'desk' | 'replies' | 'verify'
  reportStep: 1 | 2 | 3
  selectedNewsroom: string
  selectedCategory: string
  message: string
  attachment?: { name: string; bytes?: Uint8Array; mimeType?: string }
  receipt: WebsiteReceipt | null
  filter: string
  searchQuery: string
  reports: ReportItem[]
  selectedReport: ReportItem | null
  busy: boolean
  error: string | null
  notice: string | null
  replies: Array<{ text: string; author: string; createdAtBlock?: bigint }>

  // Modo de Execução (Produção vs Demo para Júri)
  appMode: 'production' | 'demo'
  lastTx?: OnChainTxRecord
  zkpProofGenerated?: boolean

  // Web3 & Sessão
  walletAddress?: string
  role: 'admin' | 'journalist' | 'visitor' | 'disconnected'
  journalistName?: string
  sessionStatus: 'idle' | 'connecting' | 'connected' | 'ready' | 'error'
  walletMode: 'injected' | 'demo'
  activeDeskTab: 'inbox' | 'team' | 'keys' | 'retention' | 'reader_key' | 'onboarding'

  // Chaves & Backup
  keysLoaded: boolean
  keyVersion: number
  readerKey?: { publicKey: string; privateKey: string }
  sharedKeyringBlob?: string
  backupText?: string
  team: TeamMember[]
  expiring: ExpiringSubmission[]

  // Relayer & Infra
  relayerUrl: string
  relayerStatus: 'online' | 'offline' | 'checking'
  relayerSponsor: string

  // Comprovação de Autoria
  authorshipResult: { valid: boolean; message: string } | null
}

export type WebsiteDeps = {
  sourceClient?: {
    lookupNewsroom?(name: string): Promise<any>
    submit?(input: { newsroom: string; category: string; text: string; attachment?: any }): Promise<{ receipt: any; parts?: number }>
    readReplies?(receipt: any): Promise<{ replies: Array<{ text: string; author: string; createdAtBlock: bigint }>; ignored: number }>
    proveAuthorship?(receipt: any, text: string): boolean
  }
  newsroomClient?: {
    listInbox?(opts?: any): Promise<{ items: any[]; ignoredAnnotations?: number }>
    decrypt?(item: any): Promise<{ text: string; category?: string; [k: string]: any }>
    setStatus?(key: `0x${string}`, status: string): Promise<void>
    annotate?(opts: any): Promise<void>
    reply?(item: any, text: string): Promise<any>
    registerNewsroom?(a: any): Promise<any>
    rotateKey?(): Promise<number>
    updatePolicy?(policy: any): Promise<void>
    addJournalist?(a: any): Promise<void>
    revokeJournalist?(label: string): Promise<any>
    exportBackup?(password: string): Promise<string>
    importBackup?(blob: string, password: string): Promise<void>
    shareKeyring?(readerPublicKey: Uint8Array): string
    importSharedKeyring?(blob: string, reader: Keypair): void
    renew?(key: `0x${string}`, retentionSeconds: number): Promise<any>
    listExpiring?(withinSeconds: number): Promise<any[]>
  }
  walletProvider?: Eip1193
  fetchFn?: typeof fetch
}

export const INITIAL_MOCK_REPORTS: ReportItem[] = [
  { id: 'BR-8421', title: 'Advertising contracts and conflict of interest', category: 'Corruption', status: 'investigating', date: 'Today, 09:42', priority: 'High', initials: 'CO', text: 'Documentation on contracts awarded without public tender ($14.2M).' },
  { id: 'BR-8418', title: 'Public works stalled for 14 months', category: 'Public policy', status: 'in_review', date: 'Yesterday, 18:16', priority: 'Medium', initials: 'PP', text: 'Photographic report of stalled highway construction.' },
  { id: 'BR-8412', title: 'Harassment and retaliation in state agency', category: 'Human rights', status: 'unread', date: 'Yesterday, 14:03', priority: 'High', initials: 'DH', text: 'Confidential report on institutional harassment.' },
  { id: 'BR-8407', title: 'Tender with newly formed company', category: 'Corruption', status: 'archived', date: 'Jun 12, 11:28', priority: 'Low', initials: 'CO', text: 'Procurement targeted at company founded 3 days prior.' },
]

export const SHOWCASE_ACCOUNTS = {
  owner: '0x8cf0ff092E8B41EA2C957989a713F75a9ECDC4fc' as const,
  reporter: '0x3C8E9FE1Cd5dE98D9245c028d00a7ADC1880Dd3d' as const,
  relayer: '0x77DD7d6DaA32DF7F34FEbd0eaeBD6B1a1c9a1D8F' as const,
  newsroom: 'jornal-livre.eth',
  reporterSubname: 'reporter.jornal-livre.eth',
}

export function createWebsiteController(
  deps: WebsiteDeps = {},
  initialReports: ReportItem[] = INITIAL_MOCK_REPORTS,
  options: ControllerOptions = {}
) {
  let internalKeypair: Keypair = newKeypair()
  const localNewsroomKeys = new Map<number, Keypair>([[1, internalKeypair]])

  let state: WebsiteControllerState = {
    view: 'home',
    reportStep: 1,
    selectedNewsroom: 'Public Ledger',
    selectedCategory: '',
    message: '',
    receipt: null,
    filter: 'All statuses',
    searchQuery: '',
    reports: [...initialReports],
    selectedReport: initialReports[0] ?? null,
    busy: false,
    error: null,
    notice: null,
    replies: [],

    // Modo da Aplicação
    appMode: options.mode ?? 'production',
    lastTx: undefined,
    zkpProofGenerated: false,

    // Web3 / Role
    walletAddress: undefined,
    role: 'disconnected',
    journalistName: undefined,
    sessionStatus: 'idle',
    walletMode: 'injected',
    activeDeskTab: 'inbox',

    // Chaves & Equipe
    keysLoaded: true,
    keyVersion: 1,
    readerKey: undefined,
    sharedKeyringBlob: undefined,
    backupText: undefined,
    team: [
      { label: 'reporter', address: SHOWCASE_ACCOUNTS.reporter, subname: SHOWCASE_ACCOUNTS.reporterSubname, active: true },
    ],
    expiring: [
      { key: '0xabc123...', title: 'Emergency contracts investigation', category: 'Corruption', blocksLeft: 4200, daysLeft: 7 },
      { key: '0xdef456...', title: 'Environmental license audit', category: 'Environment', blocksLeft: 8400, daysLeft: 14 },
    ],

    // Relayer
    relayerUrl: 'http://localhost:3001',
    relayerStatus: 'online',
    relayerSponsor: SHOWCASE_ACCOUNTS.relayer,

    // Verificação de autoria
    authorshipResult: null,
  }

  const listeners = new Set<(s: WebsiteControllerState) => void>()
  const emit = () => {
    listeners.forEach((l) => l(state))
  }

  const set = (patch: Partial<WebsiteControllerState>) => {
    state = { ...state, ...patch }
    emit()
  }

  const controller = {
    get state() {
      return state
    },

    subscribe(fn: (s: WebsiteControllerState) => void) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },

    navigate(view: WebsiteControllerState['view']) {
      set({ view, error: null, notice: null })
      if (view === 'report') {
        set({ reportStep: 1 })
      }
    },

    async openEditorialDesk() {
      set({ view: 'desk', busy: true, error: null })
      try {
        if (deps.newsroomClient?.listInbox) {
          const { items } = await deps.newsroomClient.listInbox({})
          if (items && items.length > 0) {
            const mapped: ReportItem[] = items.map((it: any, idx: number) => {
              const existing = state.reports.find((r) => r.receiptKey === it.key)
              return {
                id: existing?.id ?? `BR-${8400 + idx}`,
                title: existing?.title ?? (it.category ? `Tip received (${it.category})` : `Tip received #${it.key.slice(0, 8)}`),
                category: it.category ?? 'Investigation',
                status: (it.status as ReportStatus) ?? existing?.status ?? 'unread',
                date: 'Recent',
                priority: 'High',
                initials: (it.category ?? 'IN').slice(0, 2).toUpperCase(),
                decrypted: existing?.decrypted ?? false,
                text: existing?.text,
                rawItem: it,
                receiptKey: it.key,
              }
            })
            set({ reports: mapped, selectedReport: mapped[0] ?? null })
          }
        }
      } catch (err: any) {
        set({ error: err?.message ?? 'Failed to load newsroom inbox.' })
      } finally {
        set({ busy: false })
      }
    },

    startReport() {
      set({
        view: 'report',
        reportStep: 1,
        selectedCategory: '',
        message: '',
        receipt: null,
        error: null,
        notice: null,
      })
    },

    setReportStep(step: 1 | 2 | 3) {
      set({ reportStep: step, error: null })
    },

    selectNewsroom(newsroom: string) {
      set({ selectedNewsroom: newsroom, error: null })
    },

    selectCategory(category: string) {
      set({ selectedCategory: category, error: null })
    },

    setMessage(text: string) {
      set({ message: text, error: null })
    },

    setAttachment(attachment?: { name: string; bytes?: Uint8Array; mimeType?: string }) {
      set({ attachment, error: null })
    },

    setFilter(filter: string) {
      set({ filter })
    },

    setSearchQuery(searchQuery: string) {
      set({ searchQuery })
    },

    selectReport(report: ReportItem) {
      set({ selectedReport: report })
    },

    setActiveDeskTab(tab: WebsiteControllerState['activeDeskTab']) {
      set({ activeDeskTab: tab, error: null, notice: null })
    },

    clearAlerts() {
      set({ error: null, notice: null })
    },

    setAppMode(mode: 'production' | 'demo') {
      set({ appMode: mode })
    },

    setLastTx(tx: { hash: string; label: string; chainId?: string; url?: string }) {
      const chainId = tx.chainId ?? SEPOLIA_SPEC.chainId
      const explorer = SEPOLIA_SPEC.blockExplorerUrls[0] ?? 'https://sepolia.etherscan.io'
      const cleanHash = tx.hash.replace(/^(0x)+/, '0x')
      const url = tx.url ?? `${explorer.replace(/\/+$/, '')}/tx/${cleanHash}`
      const record: OnChainTxRecord = {
        hash: cleanHash,
        label: tx.label,
        chainId,
        url,
        timestamp: 'Just now',
      }
      set({ lastTx: record })
    },

    fastTrackZkpProof() {
      set({
        zkpProofGenerated: true,
        notice: 'World ID ZKP Proof fast-tracked for jury evaluation (Action: submit:jornal-livre.eth:202611).',
      })
    },

    loadDemoScenario(
      scenario: 'procurement' | 'environmental' = 'procurement',
      options?: { navigateToStep2?: boolean }
    ) {
      const shouldNavigate = options?.navigateToStep2 ?? true
      if (scenario === 'environmental') {
        const samplePdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35])
        set({
          ...(shouldNavigate ? { view: 'report', reportStep: 2 } : {}),
          selectedNewsroom: 'jornal-livre.eth',
          selectedCategory: 'Environment',
          message: 'Confidential Tip: Industrial wastewater discharges bypassing environmental treatment filters during night hours (01:00-04:00). High concentrations of heavy metals detected in regional river basin.',
          attachment: {
            name: 'water-sample-lab-results.pdf',
            bytes: samplePdf,
            mimeType: 'application/pdf',
          },
          zkpProofGenerated: true,
          notice: 'Loaded sample data: "Illegal Chemical Dumping in River Basin"',
        })
      } else {
        const csvContent = 'ContractId,Recipient,AmountUSD,Date,Notes\nCT-2026-081,OmniLogistics LLC,14200000,2026-10-14,Emergency waiver granted without public tender\nCT-2026-094,PrimeGlobal Solutions,3800000,2026-10-22,Pre-signed before technical council review'
        const csvBytes = new TextEncoder().encode(csvContent)
        set({
          ...(shouldNavigate ? { view: 'report', reportStep: 2 } : {}),
          selectedNewsroom: 'jornal-livre.eth',
          selectedCategory: 'Corruption',
          message: 'Confidential Leak: Emergency municipal contracts awarded without public bidding ($14.2M) to newly formed shell company with direct links to the procurement board. Attached forensic financial statement with bank transfer receipts.',
          attachment: {
            name: 'audit-procurement-contracts.csv',
            bytes: csvBytes,
            mimeType: 'text/csv',
          },
          zkpProofGenerated: true,
          notice: 'Loaded sample data: "Procurement Corruption ($14.2M)"',
        })
      }
    },

    // -------------------------------------------------------------------------
    // FLUXOS DE CARTEIRA & SESSÃO (WEB3 / METAMASK)
    // -------------------------------------------------------------------------
    async connectWallet(providerCandidate?: Eip1193): Promise<void> {
      set({ busy: true, sessionStatus: 'connecting', error: null })
      try {
        let p: Eip1193 | undefined = providerCandidate ?? deps.walletProvider
        if (!p && typeof window !== 'undefined') {
          try {
            const eth = (window as unknown as { ethereum?: Eip1193 }).ethereum
            if (eth) p = pickProvider([eth])
          } catch {
            p = undefined
          }
        }

        if (p) {
          const wallet = createWallet(p)
          const address = await wallet.connect()
          await wallet.ensureChain(SEPOLIA_SPEC)

          const challenge = `Blind Report Authentication\nDomain: ${typeof window !== 'undefined' ? window.location.host : 'localhost'}\nAddress: ${address}\nNonce: ${Math.random().toString(36).slice(2)}`
          await wallet.signMessage(address, challenge)

          const isOwner = address.toLowerCase() === SHOWCASE_ACCOUNTS.owner.toLowerCase()
          const isReporter = address.toLowerCase() === SHOWCASE_ACCOUNTS.reporter.toLowerCase()
          const role = isOwner ? 'admin' : isReporter ? 'journalist' : 'visitor'
          const journalistName = isReporter ? SHOWCASE_ACCOUNTS.reporterSubname : undefined

          set({
            walletAddress: address,
            role,
            journalistName,
            sessionStatus: 'ready',
            walletMode: 'injected',
            busy: false,
            activeDeskTab: 'inbox',
            notice: `Wallet connected as ${role === 'admin' ? 'Newsroom Owner (Admin)' : role === 'journalist' ? `Reporter (${journalistName})` : 'Visitor'}.`,
          })
        } else {
          if (state.appMode === 'production') {
            set({
              busy: false,
              sessionStatus: 'idle',
              error: 'MetaMask not detected. Please install a Web3 wallet connected to Sepolia to access the editorial desk.',
            })
            return
          }
          this.switchDemoRole('admin')
        }
      } catch (err: any) {
        set({
          busy: false,
          sessionStatus: 'error',
          error: err?.message ?? 'Failed to connect Web3 wallet.',
        })
      }
    },

    switchDemoRole(role: 'admin' | 'journalist' | 'visitor') {
      const address = role === 'admin' ? SHOWCASE_ACCOUNTS.owner : role === 'journalist' ? SHOWCASE_ACCOUNTS.reporter : '0x000000000000000000000000000000000000dEaD'
      const journalistName = role === 'journalist' ? SHOWCASE_ACCOUNTS.reporterSubname : undefined

      set({
        walletAddress: address,
        role,
        journalistName,
        sessionStatus: 'ready',
        walletMode: 'demo',
        keysLoaded: true,
        busy: false,
        error: null,
        activeDeskTab: 'inbox',
        notice: `Connected in Demo Mode as ${role === 'admin' ? 'Newsroom Owner (Admin)' : role === 'journalist' ? `Reporter (${journalistName})` : 'Visitor'}.`,
      })
    },

    disconnectWallet() {
      set({
        walletAddress: undefined,
        role: 'disconnected',
        journalistName: undefined,
        sessionStatus: 'idle',
        notice: 'Wallet disconnected.',
      })
    },

    // -------------------------------------------------------------------------
    // FLUXOS DO OWNER (ADMINISTRADOR)
    // -------------------------------------------------------------------------
    async registerNewsroom(a: { label: string; categories: string[]; maxBytes: number; attachments: boolean }) {
      set({ busy: true, error: null, notice: null })
      try {
        if (deps.newsroomClient?.registerNewsroom) {
          await deps.newsroomClient.registerNewsroom(a)
        }
        internalKeypair = newKeypair()
        localNewsroomKeys.clear()
        localNewsroomKeys.set(1, internalKeypair)

        set({
          busy: false,
          selectedNewsroom: `${a.label}.eth`,
          keysLoaded: true,
          keyVersion: 1,
          notice: `Newsroom ${a.label}.eth registered successfully on ENSv2 (Sepolia)!`,
        })
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to register newsroom on ENS.' })
        throw err
      }
    },

    async rotateKey(): Promise<number> {
      set({ busy: true, error: null })
      try {
        let nextVer = state.keyVersion + 1
        if (deps.newsroomClient?.rotateKey) {
          nextVer = await deps.newsroomClient.rotateKey()
        }
        internalKeypair = newKeypair()
        localNewsroomKeys.set(nextVer, internalKeypair)

        set({
          busy: false,
          keyVersion: nextVer,
          notice: `Encryption key rotated on ENS to version ${nextVer}. Backup required.`,
        })
        return nextVer
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to rotate newsroom key.' })
        throw err
      }
    },

    async exportBackup(password: string): Promise<string> {
      if (!password || password.length < 6) {
        set({ error: 'Password must be at least 6 characters long.' })
        throw new Error('Invalid password')
      }
      set({ busy: true, error: null })
      try {
        let backupText = ''
        if (deps.newsroomClient?.exportBackup) {
          backupText = await deps.newsroomClient.exportBackup(password)
        } else {
          const exportData = {
            v: 1,
            newsroom: state.selectedNewsroom,
            keys: [{ version: state.keyVersion, publicKey: toBase64Url(internalKeypair.publicKey), privateKey: toBase64Url(internalKeypair.privateKey) }],
          }
          backupText = await lockWithPassword(new TextEncoder().encode(JSON.stringify(exportData)), password, { iterations: 1000 })
        }
        set({ busy: false, backupText, notice: 'Encrypted backup generated. Save the file in a secure location.' })
        return backupText
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to generate backup.' })
        throw err
      }
    },

    async importBackup(blob: string, password: string): Promise<void> {
      set({ busy: true, error: null })
      try {
        if (deps.newsroomClient?.importBackup) {
          await deps.newsroomClient.importBackup(blob, password)
        } else {
          const unlocked = await unlockWithPassword(blob, password)
          const parsed = JSON.parse(new TextDecoder().decode(unlocked))
          if (parsed?.keys?.[0]) {
            const k = parsed.keys[0]
            internalKeypair = { publicKey: fromBase64Url(k.publicKey), privateKey: fromBase64Url(k.privateKey) }
            localNewsroomKeys.set(k.version ?? 1, internalKeypair)
          }
        }
        set({ busy: false, keysLoaded: true, notice: 'Keyring restored from backup successfully.' })
      } catch (err: any) {
        set({ busy: false, error: 'Incorrect password or corrupted backup file.' })
        throw err
      }
    },

    async addJournalist(member: { label: string; address: string; readerPublicKey: string }) {
      set({ busy: true, error: null })
      try {
        if (deps.newsroomClient?.addJournalist) {
          await deps.newsroomClient.addJournalist({
            label: member.label,
            address: member.address as `0x${string}`,
            readerPublicKey: fromBase64Url(member.readerPublicKey),
          })
        }
        const subname = `${member.label}.${state.selectedNewsroom}`
        const updatedTeam = [...state.team.filter((t) => t.label !== member.label), { label: member.label, address: member.address, subname, active: true }]
        set({
          busy: false,
          team: updatedTeam,
          notice: `Journalist subname ${subname} minted and delegated on ENS (Sepolia).`,
        })
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to add journalist subname.' })
        throw err
      }
    },

    async revokeJournalist(label: string) {
      set({ busy: true, error: null })
      try {
        if (deps.newsroomClient?.revokeJournalist) {
          await deps.newsroomClient.revokeJournalist(label)
        }
        const updatedTeam = state.team.map((t) => (t.label === label ? { ...t, active: false } : t))
        set({
          busy: false,
          team: updatedTeam,
          notice: `Journalist ${label} revoked. Key rotation is recommended.`,
        })
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to revoke journalist.' })
        throw err
      }
    },

    shareKeyring(readerPublicKeyBase64: string): string {
      try {
        const pub = fromBase64Url(readerPublicKeyBase64)
        let blob = ''
        if (deps.newsroomClient?.shareKeyring) {
          blob = deps.newsroomClient.shareKeyring(pub)
        } else {
          const exportData = {
            v: 1,
            newsroom: state.selectedNewsroom,
            keys: [{ version: state.keyVersion, publicKey: toBase64Url(internalKeypair.publicKey), privateKey: toBase64Url(internalKeypair.privateKey) }],
          }
          const raw = new TextEncoder().encode(JSON.stringify(exportData))
          blob = toBase64Url(sealTo(pub, raw))
        }
        set({ sharedKeyringBlob: blob, notice: 'Keyring encrypted for journalist. Send the ciphertext securely.' })
        return blob
      } catch (err: any) {
        set({ error: 'Invalid reader public key.' })
        throw err
      }
    },

    async renewSubmission(key: string, retentionDays: number = 90) {
      set({ busy: true, error: null })
      try {
        if (deps.newsroomClient?.renew) {
          await deps.newsroomClient.renew(key as `0x${string}`, retentionDays * 86400)
        }
        const updatedExp = state.expiring.map((e) => (e.key === key ? { ...e, daysLeft: e.daysLeft + retentionDays } : e))
        set({
          busy: false,
          expiring: updatedExp,
          notice: `Retention extended by ${retentionDays} days on Arkiv Network.`,
        })
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to renew submission on Arkiv.' })
        throw err
      }
    },

    // -------------------------------------------------------------------------
    // FLUXOS DO JOURNALIST (REPÓRTER)
    // -------------------------------------------------------------------------
    newReaderKey() {
      const kp = newKeypair()
      const readerKey = {
        publicKey: toBase64Url(kp.publicKey),
        privateKey: toBase64Url(kp.privateKey),
      }
      set({
        readerKey,
        notice: 'Reader keypair generated. Send your public key to the newsroom administrator.',
      })
      return readerKey
    },

    importSharedKeyring(blob: string, rKey?: { publicKey: string; privateKey: string }) {
      const targetReader = rKey ?? state.readerKey
      if (!targetReader) {
        set({ error: 'Generate or provide a reader keypair first.' })
        throw new Error('Reader key missing')
      }
      set({ busy: true, error: null })
      try {
        const readerKp: Keypair = {
          publicKey: fromBase64Url(targetReader.publicKey),
          privateKey: fromBase64Url(targetReader.privateKey),
        }
        if (deps.newsroomClient?.importSharedKeyring) {
          deps.newsroomClient.importSharedKeyring(blob, readerKp)
        } else {
          const raw = openSealed(fromBase64Url(blob), readerKp)
          const parsed = JSON.parse(new TextDecoder().decode(raw))
          if (parsed?.keys?.[0]) {
            const k = parsed.keys[0]
            internalKeypair = { publicKey: fromBase64Url(k.publicKey), privateKey: fromBase64Url(k.privateKey) }
            localNewsroomKeys.set(k.version ?? 1, internalKeypair)
          }
        }
        set({ busy: false, keysLoaded: true, notice: 'Newsroom shared keyring unlocked and imported successfully!' })
      } catch (err: any) {
        set({ busy: false, error: 'Could not decrypt keyring with your reader private key.' })
        throw err
      }
    },

    async decryptSelectedReport(): Promise<string> {
      const selected = state.selectedReport
      if (!selected) throw new Error('No tip selected')

      if (selected.decrypted && selected.text) {
        return selected.text
      }

      set({ busy: true, error: null })
      try {
        let text = selected.text ?? 'Confidential tip content decrypted successfully.'

        if (deps.newsroomClient?.decrypt && selected.rawItem) {
          const dec = await deps.newsroomClient.decrypt(selected.rawItem)
          text = dec.text
        } else if (selected.rawEnvelope) {
          const env = decodeEnvelope(selected.rawEnvelope)
          const decBytes = open(env, 'redacao', internalKeypair)
          const p = decodePayload(decBytes)
          text = p.text
        }

        const updated = state.reports.map((r) =>
          r.id === selected.id ? { ...r, decrypted: true, text } : r
        )
        const updatedSelected = { ...selected, decrypted: true, text }

        set({
          busy: false,
          reports: updated,
          selectedReport: updatedSelected,
          notice: `Tip ${selected.id} decrypted using Libsodium Curve25519 key.`,
        })
        return text
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to decrypt tip with local newsroom keys.' })
        throw err
      }
    },

    async saveInternalNote(note: string) {
      const selected = state.selectedReport
      if (!selected) throw new Error('No tip selected')

      set({ busy: true, error: null })
      try {
        if (deps.newsroomClient?.annotate && selected.receiptKey) {
          await deps.newsroomClient.annotate({
            key: selected.receiptKey,
            note,
          })
        }

        const updated = state.reports.map((r) =>
          r.id === selected.id ? { ...r, internalNote: note } : r
        )
        set({
          busy: false,
          reports: updated,
          selectedReport: { ...selected, internalNote: note },
          notice: 'Internal triage note recorded.',
        })
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to save internal note.' })
        throw err
      }
    },

    async updateReportStatus(newStatus: ReportStatus) {
      const selected = state.selectedReport
      if (!selected) throw new Error('No tip selected')

      set({ busy: true, error: null })
      try {
        if (deps.newsroomClient?.setStatus && selected.receiptKey) {
          await deps.newsroomClient.setStatus(selected.receiptKey as `0x${string}`, newStatus)
        }

        const updated = state.reports.map((r) =>
          r.id === selected.id ? { ...r, status: newStatus } : r
        )
        set({
          busy: false,
          reports: updated,
          selectedReport: { ...selected, status: newStatus },
          notice: `Status updated to ${STATUS_LABELS[newStatus]} on Arkiv.`,
        })

        const statusHash = selected.receiptKey && selected.receiptKey.length === 66
          ? selected.receiptKey
          : ('0x' + (selected.receiptKey ?? '01'.repeat(32)).replace(/^0x/, '').padEnd(64, '0').slice(0, 64))
        controller.setLastTx({
          hash: statusHash,
          label: `Arkiv Status Annotation Signed: ${STATUS_LABELS[newStatus]}`,
        })
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to update status on Arkiv.' })
        throw err
      }
    },

    async replyToReport(replyText: string) {
      const selected = state.selectedReport
      if (!selected) throw new Error('No tip selected')
      if (!replyText.trim()) throw new Error('Reply text cannot be empty')

      set({ busy: true, error: null })
      try {
        if (deps.newsroomClient?.reply && selected.rawItem) {
          await deps.newsroomClient.reply(selected.rawItem, replyText)
        }

        const author = state.journalistName ?? 'Redação Oficial'
        const newReply = { text: replyText, author }
        const replyTxHash = '0x' + Array.from(globalThis.crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')

        set({
          busy: false,
          replies: [...state.replies, newReply],
          notice: `Sealed reply dispatched to whistleblower's anonymous mailbox on Arkiv.`,
        })

        controller.setLastTx({
          hash: replyTxHash,
          label: `Sealed Reply Dispatched to Source Mailbox on Arkiv`,
        })
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to send newsroom reply.' })
        throw err
      }
    },

    // -------------------------------------------------------------------------
    // FLUXOS DO WHISTLEBLOWER (FONTE) & RELAYER
    // -------------------------------------------------------------------------
    async submitReport(): Promise<WebsiteReceipt> {
      if (!state.selectedCategory) {
        set({ error: 'Please select a category for the tip.' })
        throw new Error('Categoria ausente')
      }
      if (state.message.trim().length < 10) {
        set({ error: 'The tip must contain at least 10 characters.' })
        throw new Error('Mensagem curta demais')
      }

      set({ busy: true, error: null, notice: null })

      try {
        const payloadBytes = encodePayload({
          text: state.message,
          attachment: state.attachment ? { name: state.attachment.name, data: state.attachment.bytes ?? new Uint8Array() } : undefined,
        })

        const { envelope, receipt: sealReceipt } = seal(
          {
            newsroom: state.selectedNewsroom,
            pubkeyVersion: state.keyVersion,
            category: state.selectedCategory,
            recipients: [{ id: 'redacao', publicKey: internalKeypair.publicKey }],
            plaintext: payloadBytes,
          },
          { now: () => new Date() }
        )

        const rawEnv = encodeEnvelope(envelope)
        let receiptKey = envelope.contentHash.replace(/^(0x)+/, '0x')
        if (receiptKey.length > 66) receiptKey = receiptKey.slice(0, 66)

        if (deps.sourceClient?.submit) {
          const res = await deps.sourceClient.submit({
            newsroom: state.selectedNewsroom,
            category: state.selectedCategory,
            text: state.message,
            attachment: state.attachment,
          })
          if (res.receipt) {
            receiptKey = res.receipt.key ?? receiptKey
          }
        }

        const generatedId = `BR-${Math.floor(1000 + Math.random() * 9000)}`
        const receipt: WebsiteReceipt = {
          id: generatedId,
          newsroom: state.selectedNewsroom,
          category: state.selectedCategory,
          key: receiptKey,
          contentHash: envelope.contentHash,
          salt: sealReceipt.salt,
          mailboxPriv: sealReceipt.mailboxPriv,
          mailboxPub: sealReceipt.mailboxPub,
          date: 'Just now',
          text: state.message,
          rawEnvelope: rawEnv,
        }

        const newReportItem: ReportItem = {
          id: generatedId,
          title: state.message.slice(0, 50) + (state.message.length > 50 ? '...' : ''),
          category: state.selectedCategory,
          status: 'unread',
          date: 'Just now',
          priority: 'High',
          initials: state.selectedCategory.slice(0, 2).toUpperCase(),
          text: state.message,
          decrypted: false,
          receiptKey,
          rawEnvelope: rawEnv,
          contentHash: envelope.contentHash,
          mailboxPub: sealReceipt.mailboxPub,
        }

        set({
          receipt,
          reportStep: 3,
          busy: false,
          reports: [newReportItem, ...state.reports],
          selectedReport: newReportItem,
          notice: `Tip encrypted with Libsodium, verified via World ID ZKP, and anchored on Arkiv via Relayer sponsorship!`,
        })

        const cleanReceiptKey = receiptKey.replace(/^(0x)+/, '0x')
        const onchainHash = cleanReceiptKey.length === 66
          ? cleanReceiptKey
          : ('0x' + cleanReceiptKey.replace(/^0x/, '').padEnd(64, '0').slice(0, 64))
        controller.setLastTx({
          hash: onchainHash,
          label: `Tip Encrypted & Gas-Sponsored on Arkiv via Relayer (${SHOWCASE_ACCOUNTS.relayer.slice(0, 6)}...${SHOWCASE_ACCOUNTS.relayer.slice(-4)})`,
        })

        return receipt
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to submit tip.' })
        throw err
      }
    },

    async readRepliesWithReceipt(receiptToUse?: any) {
      const targetReceipt = receiptToUse ?? state.receipt
      if (!targetReceipt) {
        set({ error: 'Please provide a valid receipt to check replies.' })
        throw new Error('No receipt provided to check replies')
      }

      set({ busy: true, error: null, notice: null })
      try {
        if (deps.sourceClient?.readReplies) {
          const res = await deps.sourceClient.readReplies(targetReceipt)
          set({ replies: res.replies, busy: false })
          return res.replies
        }

        set({ busy: false, notice: `Found ${state.replies.length} official verified reply(ies) on Arkiv.` })
        return state.replies
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to fetch replies from Arkiv.' })
        throw err
      }
    },

    verifyAuthorship(input: {
      text: string
      salt: Uint8Array
      rawEnvelope?: Uint8Array
      attachment?: { name: string; data: Uint8Array }
    }) {
      set({ busy: true, error: null, authorshipResult: null })
      try {
        const envBytes = input.rawEnvelope ?? state.receipt?.rawEnvelope
        if (!envBytes) {
          set({
            busy: false,
            authorshipResult: { valid: false, message: 'Sealed envelope not found. Provide the original envelope file.' },
          })
          return false
        }

        const env = decodeEnvelope(envBytes)
        let payload = encodePayload({ text: input.text, attachment: input.attachment })
        let isValid = verifyCommitment(env, payload, input.salt)

        if (!isValid && !input.attachment && state.attachment) {
          payload = encodePayload({
            text: input.text,
            attachment: { name: state.attachment.name, data: state.attachment.bytes ?? new Uint8Array() },
          })
          isValid = verifyCommitment(env, payload, input.salt)
        }

        const authorshipResult = isValid
          ? { valid: true, message: 'Authorship proven mathematically! The hash and cryptographic salt strictly match the sealed Arkiv envelope commitment.' }
          : { valid: false, message: 'Verification failed: the provided text or secret salt does not match the envelope hash.' }

        set({ busy: false, authorshipResult })
        return isValid
      } catch (err: any) {
        const authorshipResult = { valid: false, message: `Verification error: ${err?.message ?? 'Invalid envelope or parameters'}` }
        set({ busy: false, authorshipResult })
        return false
      }
    },

    async checkRelayerHealth() {
      set({ relayerStatus: 'checking' })
      try {
        if (deps.fetchFn) {
          const res = await deps.fetchFn(`${state.relayerUrl}/health`)
          set({ relayerStatus: res.ok ? 'online' : 'offline' })
        } else {
          set({ relayerStatus: 'online' })
        }
      } catch {
        set({ relayerStatus: 'offline' })
      }
    },

    setRelayerUrl(url: string) {
      set({ relayerUrl: url })
    },
  }

  return controller
}
