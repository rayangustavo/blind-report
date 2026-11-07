import { describe, expect, it, vi } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createWebsiteController, SHOWCASE_ACCOUNTS } from '../lib/website-controller'
import { fakeWallet } from './fake-provider'
import { SEPOLIA_SPEC } from '../lib/wallet'

const APP_DIR = resolve(import.meta.dirname, '../app')

describe('WEBSITE - Separação Arquitetural: Modo Produção (/) vs Modo Demo (/demo)', () => {
  // =========================================================================
  // 1. CONTRATOS DO MODO PRODUÇÃO (/)
  // =========================================================================
  describe('1. Modo Produção (/): Exigência Estrita de Carteira Web3 e Sem Atalhos Simulados', () => {
    it('inicializa em appMode "production" por padrão', () => {
      const controller = createWebsiteController({}, undefined, { mode: 'production' })
      expect(controller.state.appMode).toBe('production')
    })

    it('em produção, tentar conectar sem carteira injetada NÃO faz fallback para demo admin', async () => {
      const controller = createWebsiteController({}, undefined, { mode: 'production' })

      // Simula tentativa de conexão sem provider (ex.: navegador sem MetaMask)
      await controller.connectWallet(undefined)

      expect(controller.state.sessionStatus).toBe('idle')
      expect(controller.state.role).toBe('disconnected')
      expect(controller.state.walletAddress).toBeUndefined()
      expect(controller.state.error).toContain('MetaMask not detected')
    })

    it('em produção, conecta normalmente e assina desafio se uma carteira Web3 Sepolia for injetada', async () => {
      const controller = createWebsiteController({}, undefined, { mode: 'production' })
      const w = fakeWallet({ chainId: '0xaa36a7' })

      await controller.connectWallet(w.provider)

      expect(controller.state.sessionStatus).toBe('ready')
      expect(controller.state.walletAddress).toBe(w.state.account.address)
      expect(controller.state.walletMode).toBe('injected')
      expect(controller.state.error).toBeNull()
    })

    it('a página principal (app/page.tsx) inclui o aviso para jurados da ETHGlobal e modal orientativo de MetaMask', () => {
      const pagePath = join(APP_DIR, 'page.tsx')
      expect(existsSync(pagePath)).toBe(true)
      const src = readFileSync(pagePath, 'utf8')

      // Deve importar e usar componentes de produção
      expect(src).toContain('ProductionEvaluatorCallout')
      expect(src).toContain('MetaMaskModal')
      expect(src).toContain('OnChainTxBadge')

      // Não deve ter botões de atalho falso no cabeçalho de produção
      expect(src).not.toContain('demo-role-selector')
      expect(src).toContain('Connect MetaMask on Sepolia')
    })
  })

  // =========================================================================
  // 2. CONTRATOS DO MODO DEMO (/demo)
  // =========================================================================
  describe('2. Modo Demo (/demo): Carga Rápida de Cenários, Roles e Transparência para o Júri', () => {
    it('inicializa em appMode "demo"', () => {
      const controller = createWebsiteController({}, undefined, { mode: 'demo' })
      expect(controller.state.appMode).toBe('demo')
    })

    it('permite alternar rapidamente para o papel de Owner da redação (0x8cf0...) em 1 clique', () => {
      const controller = createWebsiteController({}, undefined, { mode: 'demo' })

      controller.switchDemoRole('admin')

      expect(controller.state.role).toBe('admin')
      expect(controller.state.walletAddress).toBe(SHOWCASE_ACCOUNTS.owner)
      expect(controller.state.sessionStatus).toBe('ready')
      expect(controller.state.keysLoaded).toBe(true)
    })

    it('permite alternar rapidamente para o papel de Repórter com subnome ENS delegado (0x3C8E...) em 1 clique', () => {
      const controller = createWebsiteController({}, undefined, { mode: 'demo' })

      controller.switchDemoRole('journalist')

      expect(controller.state.role).toBe('journalist')
      expect(controller.state.walletAddress).toBe(SHOWCASE_ACCOUNTS.reporter)
      expect(controller.state.journalistName).toBe(SHOWCASE_ACCOUNTS.reporterSubname)
      expect(controller.state.sessionStatus).toBe('ready')
    })

    it('carrega o cenário pré-configurado de corrupção em compras públicas ($14.2M) com anexo CSV', () => {
      const controller = createWebsiteController({}, undefined, { mode: 'demo' })

      controller.loadDemoScenario('procurement')

      expect(controller.state.view).toBe('report')
      expect(controller.state.reportStep).toBe(2)
      expect(controller.state.selectedNewsroom).toBe('jornal-livre.eth')
      expect(controller.state.selectedCategory).toBe('Corruption')
      expect(controller.state.message).toContain('$14.2M')
      expect(controller.state.attachment).toBeDefined()
      expect(controller.state.attachment?.name).toBe('audit-procurement-contracts.csv')
      expect(controller.state.attachment?.mimeType).toBe('text/csv')
      expect(controller.state.zkpProofGenerated).toBe(true)
    })

    it('carrega o cenário pré-configurado de crime ambiental com laudo laboratorial PDF', () => {
      const controller = createWebsiteController({}, undefined, { mode: 'demo' })

      controller.loadDemoScenario('environmental')

      expect(controller.state.view).toBe('report')
      expect(controller.state.selectedNewsroom).toBe('jornal-livre.eth')
      expect(controller.state.selectedCategory).toBe('Environment')
      expect(controller.state.attachment?.name).toBe('water-sample-lab-results.pdf')
      expect(controller.state.attachment?.mimeType).toBe('application/pdf')
    })

    it('permite aceleração de ZKP para bancada de avaliação com ação vinculada à época', () => {
      const controller = createWebsiteController({}, undefined, { mode: 'demo' })

      controller.fastTrackZkpProof()

      expect(controller.state.zkpProofGenerated).toBe(true)
      expect(controller.state.notice).toContain('World ID ZKP Proof fast-tracked')
    })

    it('permite carregar dados de exemplo in-place sem saltar de tela ou de etapa', () => {
      const controller = createWebsiteController({}, undefined, { mode: 'demo' })
      controller.navigate('report')
      controller.setReportStep(2)

      controller.loadDemoScenario('procurement', { navigateToStep2: false })

      expect(controller.state.view).toBe('report')
      expect(controller.state.reportStep).toBe(2)
      expect(controller.state.message).toContain('$14.2M')
      expect(controller.state.attachment?.name).toBe('audit-procurement-contracts.csv')
    })

    it('a página /demo (app/demo/page.tsx) é limpa: usa DemoTopBar e elimina banners pesados de explicação', () => {
      const demoPagePath = join(APP_DIR, 'demo/page.tsx')
      expect(existsSync(demoPagePath)).toBe(true)
      const src = readFileSync(demoPagePath, 'utf8')

      // Deve usar o DemoTopBar minimalista
      expect(src).toContain('DemoTopBar')
      expect(src).toContain('onSelectRole')

      // Não deve poluir a interface com banners pesados ou storyboards cheios de código
      expect(src).not.toContain('EvaluatorBanner')
      expect(src).not.toContain('JuryStoryboard')
      expect(src).not.toContain('demo-quick-bar')
    })
  })

  // =========================================================================
  // 3. EXECUÇÃO CRIPTOGRÁFICA E REGISTRO ON-CHAIN EM MODO DEMO
  // =========================================================================
  describe('3. Garantia de Operações On-Chain e Criptográficas Reais na Demo', () => {
    it('ao submeter denúncia na demo, gera envelope Libsodium genuíno e registra hash de transação na Sepolia', async () => {
      const mockSubmit = vi.fn(async () => ({
        receipt: { key: '0x1111222233334444555566667777888899990000111122223333444455556666' },
      }))

      const controller = createWebsiteController(
        { sourceClient: { submit: mockSubmit } },
        undefined,
        { mode: 'demo' }
      )

      controller.loadDemoScenario('procurement')
      const receipt = await controller.submitReport()

      expect(receipt.key).toBe('0x1111222233334444555566667777888899990000111122223333444455556666')
      expect(receipt.salt).toBeDefined()
      expect(receipt.rawEnvelope).toBeDefined()
      expect(controller.state.lastTx).toBeDefined()
      expect(controller.state.lastTx?.url).toMatch(/rabdi\.explorer\.arkiv\.network|sepolia\.etherscan\.io/)
    })

    it('ao atualizar status ou enviar réplica na demo, atualiza lastTx com link do Etherscan Sepolia', async () => {
      const mockSetStatus = vi.fn(async () => {})
      const mockReply = vi.fn(async () => ({}))

      const controller = createWebsiteController(
        { newsroomClient: { setStatus: mockSetStatus, reply: mockReply } },
        undefined,
        { mode: 'demo' }
      )

      controller.switchDemoRole('journalist')
      const report = controller.state.reports[0]!
      report.receiptKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      report.rawItem = { key: report.receiptKey }
      controller.selectReport(report)

      // Atualiza status
      await controller.updateReportStatus('investigating')
      expect(controller.state.lastTx?.label).toContain('Arkiv Status Annotation Signed')
      expect(controller.state.lastTx?.url).toContain('https://sepolia.etherscan.io/tx/')

      // Envia réplica
      await controller.replyToReport('Mensagem selada de teste')
      expect(controller.state.lastTx?.label).toContain('Sealed Reply Dispatched')
      expect(controller.state.lastTx?.url).toContain('https://sepolia.etherscan.io/tx/')
    })

    it('a comprovação matemática de autoria (Zero-Knowledge / Commitment) funciona exatamente igual', () => {
      const controller = createWebsiteController(
        {
          fetchFn: async () =>
            ({
              ok: true,
              status: 201,
              json: async () => ({ key: '0x123', parts: 1 }),
            } as Response),
        },
        undefined,
        { mode: 'demo' }
      )

      controller.loadDemoScenario('procurement')
      const message = controller.state.message

      // Submete denúncia
      return controller.submitReport().then((receipt) => {
        const isValid = controller.verifyAuthorship({
          text: message,
          salt: receipt.salt!,
          rawEnvelope: receipt.rawEnvelope,
        })

        expect(isValid).toBe(true)
        expect(controller.state.authorshipResult?.valid).toBe(true)
        expect(controller.state.authorshipResult?.message).toContain('Authorship proven mathematically')
      })
    })
  })
})
