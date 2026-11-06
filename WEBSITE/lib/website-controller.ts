/**
 * Controller de Interface do Novo Frontend (Next.js - WEBSITE)
 * Encapsula as ações do usuário (Home, ReportFlow, EditorialDesk) e orquestra a
 * integração com os SDKs do Blind Report (@blind-report/source-client e @blind-report/newsroom-client).
 */

export type ReportStatus = 'unread' | 'in_review' | 'investigating' | 'archived'

export const STATUS_LABELS: Record<string, string> = {
  unread: 'Não lida',
  in_review: 'Em análise',
  investigating: 'Investigando',
  archived: 'Arquivada',
}

export type ReportItem = {
  id: string
  title: string
  category: string
  status: ReportStatus
  date: string
  priority: 'Alta' | 'Média' | 'Baixa'
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
  { id: 'BR-8421', title: 'Contratos de publicidade e conflito de interesse', category: 'Corrupção', status: 'investigating', date: 'Hoje, 09:42', priority: 'Alta', initials: 'CO', text: 'Documentação sobre contratos sem licitação.' },
  { id: 'BR-8418', title: 'Obra pública parada há 14 meses', category: 'Políticas públicas', status: 'in_review', date: 'Ontem, 18:16', priority: 'Média', initials: 'PP', text: 'Relatório fotográfico da obra paralisada na rodovia estadual.' },
  { id: 'BR-8412', title: 'Assédio e retaliação em órgão estadual', category: 'Direitos humanos', status: 'unread', date: 'Ontem, 14:03', priority: 'Alta', initials: 'DH', text: 'Denúncia sigilosa sobre perseguição institucional.' },
  { id: 'BR-8407', title: 'Licitação com empresa recém-criada', category: 'Corrupção', status: 'archived', date: '12 jun, 11:28', priority: 'Baixa', initials: 'CO', text: 'Edital direcionado para empresa fundada 3 dias antes.' },
]

export function createWebsiteController(deps: WebsiteDeps = {}, initialReports: ReportItem[] = INITIAL_MOCK_REPORTS) {
  let state: WebsiteControllerState = {
    view: 'home',
    reportStep: 1,
    selectedNewsroom: 'Folha Pública',
    selectedCategory: '',
    message: '',
    receipt: null,
    filter: 'Todos os status',
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
        set({ error: 'Selecione uma categoria para a denúncia.' })
        throw new Error('Categoria ausente')
      }
      if (state.message.trim().length < 10) {
        set({ error: 'A denúncia deve conter ao menos 10 caracteres.' })
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
          date: 'Agora',
          text: state.message,
        }

        // Adiciona à lista de denúncias da redação (caso seja a mesma redação conectada)
        const newReportItem: ReportItem = {
          id: generatedId,
          title: state.message.slice(0, 50) + (state.message.length > 50 ? '...' : ''),
          category: state.selectedCategory,
          status: 'unread',
          date: 'Agora',
          priority: 'Alta',
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
        set({ busy: false, error: err?.message ?? 'Falha ao enviar denúncia.' })
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
                title: existing?.title ?? (it.category ? `Denúncia recebida (${it.category})` : `Denúncia recebida #${it.key.slice(0, 8)}`),
                category: it.category ?? 'Investigação',
                status: (it.status as ReportStatus) ?? existing?.status ?? 'unread',
                date: 'Recente',
                priority: 'Alta',
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
        set({ error: err?.message ?? 'Falha ao carregar inbox da redação.' })
      } finally {
        set({ busy: false })
      }
    },

    async decryptSelectedReport(): Promise<string> {
      const selected = state.selectedReport
      if (!selected) throw new Error('Nenhuma denúncia selecionada')

      if (selected.decrypted && selected.text) {
        return selected.text
      }

      set({ busy: true, error: null })
      try {
        let text = selected.text ?? 'Conteúdo sigiloso da denúncia descriptografado com sucesso.'
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
        set({ busy: false, error: err?.message ?? 'Falha ao decifrar denúncia.' })
        throw err
      }
    },

    async saveInternalNote(note: string) {
      const selected = state.selectedReport
      if (!selected) throw new Error('Nenhuma denúncia selecionada')

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
        set({ busy: false, error: err?.message ?? 'Falha ao salvar nota interna.' })
        throw err
      }
    },

    async updateReportStatus(newStatus: ReportStatus) {
      const selected = state.selectedReport
      if (!selected) throw new Error('Nenhuma denúncia selecionada')

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
        set({ busy: false, error: err?.message ?? 'Falha ao atualizar status.' })
        throw err
      }
    },

    async replyToReport(replyText: string) {
      const selected = state.selectedReport
      if (!selected) throw new Error('Nenhuma denúncia selecionada')

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
        set({ busy: false, error: err?.message ?? 'Falha ao enviar resposta da redação.' })
        throw err
      }
    },

    async readRepliesWithReceipt(receiptToUse?: any) {
      const targetReceipt = receiptToUse ?? state.receipt
      if (!targetReceipt) throw new Error('Nenhum recibo para consulta de resposta')

      set({ busy: true, error: null })
      try {
        if (deps.sourceClient?.readReplies) {
          const res = await deps.sourceClient.readReplies(targetReceipt)
          set({ replies: res.replies, busy: false })
          return res.replies
        }
        return state.replies
      } catch (err: any) {
        set({ busy: false, error: err?.message ?? 'Falha ao consultar respostas.' })
        throw err
      }
    },
  }

  return controller
}
