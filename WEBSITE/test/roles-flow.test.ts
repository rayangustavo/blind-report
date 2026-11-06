import { describe, expect, it, vi } from 'vitest'
import { createWebsiteController, SHOWCASE_ACCOUNTS, type ReportItem } from '../lib/website-controller'
import { toBase64Url } from '@blind-report/core'
import { newKeypair } from '@blind-report/crypto'

describe('WEBSITE Roles Flow — Owner, Journalist, Relayer and Whistleblower End-to-End Test Suite', () => {
  it('1. Owner (Admin): Conexão Web3, Registro ENSv2, Backup, Rotação e Delegação de Subnome', async () => {
    const mockRegister = vi.fn(async (args: any) => ({ name: `${args.label}.eth` }))
    const mockRotate = vi.fn(async () => 2)
    const mockAddJournalist = vi.fn(async (args: any) => {})
    const mockRenew = vi.fn(async (_k: any, _s: any) => 'extended')

    const controller = createWebsiteController({
      newsroomClient: {
        registerNewsroom: mockRegister,
        rotateKey: mockRotate,
        addJournalist: mockAddJournalist,
        renew: mockRenew,
      },
    })

    // Conecta como Owner
    controller.switchDemoRole('admin')
    expect(controller.state.role).toBe('admin')
    expect(controller.state.walletAddress).toBe(SHOWCASE_ACCOUNTS.owner)
    expect(controller.state.sessionStatus).toBe('ready')

    // 1.1 Owner cadastra nova redação no ENSv2
    await controller.registerNewsroom({
      label: 'folha-livre',
      categories: ['Corruption', 'Human rights'],
      maxBytes: 150000,
      attachments: true,
    })
    expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({ label: 'folha-livre' }))
    expect(controller.state.selectedNewsroom).toBe('folha-livre.eth')
    expect(controller.state.keyVersion).toBe(1)
    expect(controller.state.keysLoaded).toBe(true)

    // 1.2 Owner gera backup cifrado com senha
    const backupCipher = await controller.exportBackup('super-secret-password-123')
    expect(backupCipher.length).toBeGreaterThan(50)
    expect(controller.state.backupText).toBe(backupCipher)

    // 1.3 Owner restaura backup com a senha
    await controller.importBackup(backupCipher, 'super-secret-password-123')
    expect(controller.state.keysLoaded).toBe(true)

    // 1.4 Senha incorreta deve lançar erro
    await expect(controller.importBackup(backupCipher, 'wrong-password')).rejects.toThrow()

    // 1.5 Owner rotaciona a chave pública no ENSv2
    const newVer = await controller.rotateKey()
    expect(mockRotate).toHaveBeenCalled()
    expect(newVer).toBe(2)
    expect(controller.state.keyVersion).toBe(2)

    // 1.6 Owner delega subnome on-chain para jornalista e cifra chaveiro
    const journalistReaderKp = newKeypair()
    const readerPubBase64 = toBase64Url(journalistReaderKp.publicKey)

    await controller.addJournalist({
      label: 'ana',
      address: '0x1234567890123456789012345678901234567890',
      readerPublicKey: readerPubBase64,
    })
    expect(mockAddJournalist).toHaveBeenCalled()
    expect(controller.state.team.find((t) => t.label === 'ana')?.subname).toBe('ana.folha-livre.eth')

    // 1.7 Owner compartilha chaveiro cifrado para a chave pública do jornalista
    const sharedBlob = controller.shareKeyring(readerPubBase64)
    expect(sharedBlob.length).toBeGreaterThan(50)
    expect(controller.state.sharedKeyringBlob).toBe(sharedBlob)

    // 1.8 Owner estende retenção de denúncia no Arkiv
    await controller.renewSubmission('0xabc123...', 90)
    expect(mockRenew).toHaveBeenCalledWith('0xabc123...', 90 * 86400)
  })

  it('2. Journalist: Detecção de Subnome, Chave de Leitura, Desbloqueio de Chaveiro e Triagem', async () => {
    const mockDecrypt = vi.fn(async (item: any) => ({
      text: 'Desvios de R$ 3,8M em contratos de alimentação escolar.',
      category: 'Corruption',
    }))
    const mockReply = vi.fn(async (item: any, text: string) => {})
    const mockSetStatus = vi.fn(async (k: any, s: any) => {})

    const initialReports: ReportItem[] = [
      {
        id: 'BR-7001',
        title: 'Denúncia recebida sobre merenda escolar',
        category: 'Corruption',
        status: 'unread',
        date: 'Hoje',
        priority: 'High',
        initials: 'CO',
        receiptKey: '0x7001',
        rawItem: { key: '0x7001' },
      },
    ]

    const controller = createWebsiteController(
      {
        newsroomClient: {
          decrypt: mockDecrypt,
          reply: mockReply,
          setStatus: mockSetStatus,
        },
      },
      initialReports
    )

    // Conecta como Jornalista
    controller.switchDemoRole('journalist')
    expect(controller.state.role).toBe('journalist')
    expect(controller.state.walletAddress).toBe(SHOWCASE_ACCOUNTS.reporter)
    expect(controller.state.journalistName).toBe('reporter.jornal-livre.eth')

    // 2.1 Jornalista gera par de chaves de leitura no aparelho
    const rKey = controller.newReaderKey()
    expect(rKey.publicKey.length).toBeGreaterThan(30)
    expect(rKey.privateKey.length).toBeGreaterThan(30)
    expect(controller.state.readerKey).toEqual(rKey)

    // 2.2 Jornalista importa o chaveiro compartilhado pela redação
    const ownerController = createWebsiteController()
    const sharedBlob = ownerController.shareKeyring(rKey.publicKey)

    controller.importSharedKeyring(sharedBlob, rKey)
    expect(controller.state.keysLoaded).toBe(true)

    // 2.3 Jornalista decifra denúncia recebida
    controller.selectReport(controller.state.reports[0])
    const plaintext = await controller.decryptSelectedReport()
    expect(mockDecrypt).toHaveBeenCalled()
    expect(plaintext).toBe('Desvios de R$ 3,8M em contratos de alimentação escolar.')
    expect(controller.state.selectedReport?.decrypted).toBe(true)

    // 2.4 Jornalista altera status editorial para investigating
    await controller.updateReportStatus('investigating')
    expect(mockSetStatus).toHaveBeenCalledWith('0x7001' as any, 'investigating')
    expect(controller.state.selectedReport?.status).toBe('investigating')

    // 2.5 Jornalista compõe e envia resposta oficial selada para a caixa postal da fonte
    await controller.replyToReport('Recebemos sua denúncia e as provas foram validadas.')
    expect(mockReply).toHaveBeenCalled()
    expect(controller.state.replies).toEqual([
      expect.objectContaining({
        text: 'Recebemos sua denúncia e as provas foram validadas.',
        author: 'reporter.jornal-livre.eth',
      }),
    ])
  })

  it('3. Whistleblower & Relayer: Envio Protegido com World ID ZKP, Respostas e Autoria Matemática', async () => {
    const mockFetch = vi.fn(async (url: string) => {
      if (url.endsWith('/health')) {
        return { ok: true, json: async () => ({ ok: true }) } as any
      }
      return { ok: false } as any
    })

    const controller = createWebsiteController({
      fetchFn: mockFetch,
    })

    // 3.1 Relayer Health Check
    await controller.checkRelayerHealth()
    expect(controller.state.relayerStatus).toBe('online')

    // 3.2 Whistleblower envia denúncia através do Relayer
    controller.startReport()
    controller.selectNewsroom('jornal-livre.eth')
    controller.setReportStep(2)
    controller.selectCategory('Corruption')
    const leakText = 'Fraude comprovada em pregão eletrônico no setor de transportes.'
    controller.setMessage(leakText)

    const receipt = await controller.submitReport()
    expect(receipt.id).toMatch(/^BR-\d{4}$/)
    expect(receipt.newsroom).toBe('jornal-livre.eth')
    expect(receipt.category).toBe('Corruption')
    expect(receipt.salt).toBeDefined()
    expect(receipt.rawEnvelope).toBeDefined()
    expect(receipt.mailboxPub).toBeDefined()
    expect(receipt.mailboxPriv).toBeDefined()
    expect(controller.state.reportStep).toBe(3)

    // 3.3 Whistleblower consulta respostas com o recibo
    // Simula uma resposta enviada pela redação
    await controller.replyToReport('Confirmamos o recebimento e iniciamos apuração interna.')
    const replies = await controller.readRepliesWithReceipt(receipt)
    expect(replies.length).toBeGreaterThan(0)
    expect(replies[0].text).toBe('Confirmamos o recebimento e iniciamos apuração interna.')

    // 3.4 Whistleblower comprova matematicamente autoria revelando o sal e o texto original
    const authorshipProof = controller.verifyAuthorship({
      text: leakText,
      salt: receipt.salt!,
      rawEnvelope: receipt.rawEnvelope,
    })
    expect(authorshipProof).toBe(true)
    expect(controller.state.authorshipResult?.valid).toBe(true)
    expect(controller.state.authorshipResult?.message).toContain('Authorship proven mathematically')

    // 3.5 Texto forjado ou sal incorreto falha matematicamente
    const fakeProof = controller.verifyAuthorship({
      text: 'Texto completamente falso e alterado',
      salt: receipt.salt!,
      rawEnvelope: receipt.rawEnvelope,
    })
    expect(fakeProof).toBe(false)
    expect(controller.state.authorshipResult?.valid).toBe(false)
  })
})
