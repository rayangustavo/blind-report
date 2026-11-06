/**
 * Controller de Interface do Novo Frontend (Next.js - WEBSITE)
 * Encapsula as ações do usuário (Home, ReportFlow, EditorialDesk) e orquestra a
 * integração com os SDKs do Blind Report (@blind-report/source-client e @blind-report/newsroom-client).
 */

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
}

export type WebsiteControllerState = {
  view: 'home' | 'report' | 'desk'
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
  replies: Array<{ text: string; author: string; createdAtBlock?: bigint }>
}

export type WebsiteDeps = {
  sourceClient?: {
    lookupNewsroom?(name: string): Promise<any>
    submit?(input: { newsroom: string; category: string; text: string; attachment?: any }): Promise<{ receipt: any; parts?: number }>
    readReplies?(receipt: any): Promise<{ replies: Array<{ text: string; author: string; createdAtBlock: bigint }>; ignored: number }>
    proveAuthorship?(receipt: any, text: string): boolean
  }
  newsroomClient?: {
    listInbox?(opts?: any): Promise<{ items: any[] }>
    decrypt?(item: any): Promise<{ text: string; category?: string; [k: string]: any }>
    setStatus?(key: `0x${string}`, status: string): Promise<void>
    annotate?(opts: any): Promise<void>
    reply?(item: any, text: string): Promise<any>
  }
}

export const INITIAL_MOCK_REPORTS: ReportItem[] = [
  { id: 'BR-8421', title: 'Advertising contracts and conflict of interest', category: 'Corruption', status: 'investigating', date: 'Today, 09:42', priority: 'High', initials: 'CO', text: 'Documentation on contracts without public tender.' },
  { id: 'BR-8418', title: 'Public works stalled for 14 months', category: 'Public policy', status: 'in_review', date: 'Yesterday, 18:16', priority: 'Medium', initials: 'PP', text: 'Photographic report of stalled highway construction.' },
  { id: 'BR-8412', title: 'Harassment and retaliation in state agency', category: 'Human rights', status: 'unread', date: 'Yesterday, 14:03', priority: 'High', initials: 'DH', text: 'Confidential report on institutional harassment.' },
  { id: 'BR-8407', title: 'Tender with newly formed company', category: 'Corruption', status: 'archived', date: 'Jun 12, 11:28', priority: 'Low', initials: 'CO', text: 'Procurement targeted at company founded 3 days prior.' },
]

export function createWebsiteController(deps: WebsiteDeps = {}, initialReports: ReportItem[] = INITIAL_MOCK_REPORTS) {
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
    replies: [],
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

    navigate(view: 'home' | 'report' | 'desk') {
      set({ view, error: null })
      if (view === 'report') {
        set({ reportStep: 1 })
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

    async submitReport(): Promise<WebsiteReceipt> {
      if (!state.selectedCategory) {
        set({ error: 'Please select a category for the tip.' })
        throw new Error('Categoria ausente')
      }
      if (state.message.trim().length < 10) {
        set({ error: 'The tip must contain at least 10 characters.' })
        throw new Error('Mensagem curta demais')
      }

      set({ busy: true, error: null })

      try {
        let receiptKey = '0x' + Math.random().toString(16).slice(2).padStart(64, '0')
        let salt = new Uint8Array([1, 2, 3, 4])
        let contentHash = '0x' + Math.random().toString(16).slice(2).padStart(64, '0')
        let mailboxPriv = new Uint8Array(32)
        let mailboxPub = new Uint8Array(32)

        // Se houver client real do SDK de envio
        if (deps.sourceClient?.submit) {
          const res = await deps.sourceClient.submit({
            newsroom: state.selectedNewsroom,
            category: state.selectedCategory,
            text: state.message,
            attachment: state.attachment,
          })
          if (res.receipt) {
            receiptKey = res.receipt.key ?? receiptKey
            salt = res.receipt.salt ?? salt
            contentHash = res.receipt.contentHash ?? contentHash
            mailboxPriv = res.receipt.mailboxPriv ?? mailboxPriv
            mailboxPub = res.receipt.mailboxPub ?? mailboxPub
          }
        }

        const generatedId = `BR-${Math.floor(1000 + Math.random() * 9000)}`
        const receipt: WebsiteReceipt = {
          id: generatedId,
          newsroom: state.selectedNewsroom,
          category: state.selectedCategory,
          key: receiptKey,
          contentHash,
          salt,
          mailboxPriv,
          mailboxPub,
          date: 'Just now',
          text: state.message,
        }

        // Adiciona à lista de denúncias da redação (caso seja a mesma redação conectada)
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
        }

        set({
          receipt,
          reportStep: 3,
          busy: false,
          reports: [newReportItem, ...state.reports],
          selectedReport: newReportItem,
        })

        return receipt
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to submit tip.' })
        throw err
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
        }

        const updated = state.reports.map((r) =>
          r.id === selected.id ? { ...r, decrypted: true, text } : r
        )
        const updatedSelected = { ...selected, decrypted: true, text }

        set({
          busy: false,
          reports: updated,
          selectedReport: updatedSelected,
        })
        return text
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to decrypt tip.' })
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
        })
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to update status.' })
        throw err
      }
    },

    async replyToReport(replyText: string) {
      const selected = state.selectedReport
      if (!selected) throw new Error('No tip selected')

      set({ busy: true, error: null })
      try {
        if (deps.newsroomClient?.reply && selected.rawItem) {
          await deps.newsroomClient.reply(selected.rawItem, replyText)
        }

        const newReply = { text: replyText, author: 'Redação Oficial' }
        set({
          busy: false,
          replies: [...state.replies, newReply],
        })
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to send newsroom reply.' })
        throw err
      }
    },

    async readRepliesWithReceipt(receiptToUse?: any) {
      const targetReceipt = receiptToUse ?? state.receipt
      if (!targetReceipt) throw new Error('No receipt provided to check replies')

      set({ busy: true, error: null })
      try {
        if (deps.sourceClient?.readReplies) {
          const res = await deps.sourceClient.readReplies(targetReceipt)
          set({ replies: res.replies, busy: false })
          return res.replies
        }
        return state.replies
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Failed to fetch replies.' })
        throw err
      }
    },
  }

  return controller
}
