import { describe, expect, it, vi } from 'vitest'
import { createWebsiteController, STATUS_LABELS, type ReportItem } from '../lib/website-controller'

describe('WEBSITE E2E — Fluxo Completo de Interação do Usuário no Novo Frontend', () => {
  it('executa a jornada completa da fonte (Whistleblower): Home -> Formulario 3 Passos -> Recibo', async () => {
    const mockSubmit = vi.fn(async (input: any) => ({
      receipt: {
        key: '0x1111222233334444555566667777888899990000111122223333444455556666',
        contentHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        salt: new Uint8Array([9, 8, 7, 6]),
        mailboxPriv: new Uint8Array(32),
        mailboxPub: new Uint8Array(32),
      },
    }))

    const controller = createWebsiteController({
      sourceClient: { submit: mockSubmit },
    })

    // 1. Inicia na Home
    expect(controller.state.view).toBe('home')
    expect(controller.state.reportStep).toBe(1)

    // 2. Usuário clica no botão "Enviar denúncia anônima"
    controller.startReport()
    expect(controller.state.view).toBe('report')
    expect(controller.state.reportStep).toBe(1)

    // 3. Usuário escolhe a redação no Passo 1 e clica em continuar
    controller.selectNewsroom('Folha Pública')
    controller.setReportStep(2)
    expect(controller.state.reportStep).toBe(2)

    // 4. Validação de formulário: não deve permitir envio sem categoria ou com texto curto
    controller.setMessage('Curto')
    await expect(controller.submitReport()).rejects.toThrow('Categoria ausente')

    controller.selectCategory('Corrupção')
    await expect(controller.submitReport()).rejects.toThrow('Mensagem curta demais')

    // 5. Usuário preenche a denúncia completa
    const textoDenuncia = 'Contratos superfaturados identificados na secretaria de infraestrutura no valor de R$ 5,2 milhões.'
    controller.setMessage(textoDenuncia)

    // 6. Usuário clica em "Verificar e enviar"
    const receipt = await controller.submitReport()

    // 7. Validação do recibo e transição de tela
    expect(mockSubmit).toHaveBeenCalledWith({
      newsroom: 'jornal-livre.eth',
      category: 'Corrupção',
      text: textoDenuncia,
      attachment: undefined,
    })
    expect(controller.state.reportStep).toBe(3)
    expect(receipt.id).toMatch(/^BR-\d{4}$/)
    expect(receipt.category).toBe('Corrupção')
    expect(receipt.newsroom).toBe('jornal-livre.eth')
    expect(receipt.key).toBe('0x1111222233334444555566667777888899990000111122223333444455556666')
    expect(controller.state.receipt).toEqual(receipt)

    // 8. Usuário clica em "Voltar ao início"
    controller.navigate('home')
    expect(controller.state.view).toBe('home')
  })

  it('faz a atualização automática imediatamente após a aprovação do World ID', async () => {
    const mockSubmit = vi.fn(async () => ({
      receipt: {
        key: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        contentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        salt: new Uint8Array([1, 2, 3]),
        mailboxPriv: new Uint8Array(32),
        mailboxPub: new Uint8Array(32),
      },
    }))

    const controller = createWebsiteController({
      sourceClient: { submit: mockSubmit },
    })

    controller.startReport()
    controller.selectCategory('Corrupção')
    controller.setMessage('Denúncia detalhada sobre contratos superfaturados e pagamentos suspeitos no setor público.')
    controller.setReportStep(2)

    const receipt = await controller.simulateWorldIdApproval()

    expect(mockSubmit).toHaveBeenCalledTimes(1)
    expect(controller.state.reportStep).toBe(3)
    expect(receipt).toBeTruthy()
    expect(controller.state.receipt).toEqual(receipt)
  })

  it('executa a jornada completa do jornalista (Editorial Desk): Triagem, Decifragem, Anotacao e Status', async () => {
    const mockDecrypt = vi.fn(async (_item: any) => ({
      text: 'Informação sigilosa decifrada da denúncia recebida.',
      category: 'Corrupção',
    }))
    const mockSetStatus = vi.fn(async (_key: any, _status: any) => {})
    const mockAnnotate = vi.fn(async (_opts: any) => {})
    const mockReply = vi.fn(async (_item: any, _text: any) => {})

    const initialReports: ReportItem[] = [
      {
        id: 'BR-9901',
        title: 'Denúncia urgente recebida',
        category: 'Corrupção',
        status: 'unread',
        date: 'Agora',
        priority: 'Alta',
        initials: 'CO',
        decrypted: false,
        receiptKey: '0xabcdef',
        rawItem: { key: '0xabcdef', envelope: 'cifrado' },
      },
    ]

    const controller = createWebsiteController(
      {
        newsroomClient: {
          decrypt: mockDecrypt,
          setStatus: mockSetStatus,
          annotate: mockAnnotate,
          reply: mockReply,
        },
      },
      initialReports
    )

    // 1. Usuário clica em "Área da redação"
    controller.navigate('desk')
    expect(controller.state.view).toBe('desk')
    expect(controller.state.reports.length).toBe(1)

    // 2. Seleciona a denúncia não lida
    const report = controller.state.reports[0]
    controller.selectReport(report)
    expect(controller.state.selectedReport?.id).toBe('BR-9901')
    expect(controller.state.selectedReport?.decrypted).toBe(false)

    // 3. Jornalista clica para decifrar a denúncia protegida
    const decifrado = await controller.decryptSelectedReport()
    expect(mockDecrypt).toHaveBeenCalled()
    expect(decifrado).toBe('Informação sigilosa decifrada da denúncia recebida.')
    expect(controller.state.selectedReport?.decrypted).toBe(true)
    expect(controller.state.selectedReport?.text).toBe(decifrado)

    // 4. Jornalista adiciona nota interna de triagem
    await controller.saveInternalNote('Verificado com fontes no Tribunal de Contas.')
    expect(mockAnnotate).toHaveBeenCalledWith({
      key: '0xabcdef',
      note: 'Verificado com fontes no Tribunal de Contas.',
    })
    expect(controller.state.selectedReport?.internalNote).toBe('Verificado com fontes no Tribunal de Contas.')

    // 5. Jornalista atualiza o status para "investigating"
    await controller.updateReportStatus('investigating')
    expect(mockSetStatus).toHaveBeenCalledWith('0xabcdef', 'investigating')
    expect(controller.state.selectedReport?.status).toBe('investigating')

    // 6. Jornalista envia uma resposta pela caixa postal
    await controller.replyToReport('Recebemos sua mensagem. A apuração foi iniciada.')
    expect(mockReply).toHaveBeenCalled()
    expect(controller.state.replies).toEqual([
      { text: 'Recebemos sua mensagem. A apuração foi iniciada.', author: 'Redação Oficial' },
    ])
  })

  it('permite a fonte consultar respostas oficiais pelo recibo', async () => {
    const mockReadReplies = vi.fn(async (_receipt: any) => ({
      replies: [
        { text: 'Mensagem confirmada pela redação.', author: 'repórter.folha.eth', createdAtBlock: 42n },
      ],
      ignored: 0,
    }))

    const controller = createWebsiteController({
      sourceClient: { readReplies: mockReadReplies },
    })

    const fakeReceipt = {
      id: 'BR-1234',
      newsroom: 'jornal-livre.eth',
      category: 'Corrupção',
      key: '0x123',
      date: 'Ontem',
      text: 'Texto denúncia',
    }

    const replies = await controller.readRepliesWithReceipt(fakeReceipt)
    expect(mockReadReplies).toHaveBeenCalledWith(fakeReceipt)
    expect(replies).toEqual([
      { text: 'Mensagem confirmada pela redação.', author: 'repórter.folha.eth', createdAtBlock: 42n },
    ])
  })
})
