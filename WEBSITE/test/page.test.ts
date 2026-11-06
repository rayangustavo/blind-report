import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createWebsiteController } from '../lib/website-controller'

const PAGE_PATH = resolve(import.meta.dirname, '../app/page.tsx')
const CONTROLLER_PATH = resolve(import.meta.dirname, '../lib/website-controller.ts')
const pageSource = readFileSync(PAGE_PATH, 'utf8')
const controllerSource = readFileSync(CONTROLLER_PATH, 'utf8')

describe('WEBSITE - Contratos Estruturais da Página Principal (app/page.tsx)', () => {
  it('contem os 3 fluxos de navegacao principais (home, report, desk)', () => {
    expect(pageSource).toContain("view === 'home'")
    expect(pageSource).toContain("view === 'report'")
    expect(pageSource).toContain("view === 'desk'")
  })

  it('define as categorias de denuncia oficiais', () => {
    expect(pageSource).toMatch(/Corruption|Corrupção/)
    expect(pageSource).toMatch(/Public policy|Políticas públicas/)
    expect(pageSource).toMatch(/Human rights|Direitos humanos/)
    expect(pageSource).toMatch(/Environment|Meio ambiente/)
  })

  it('define os status das denuncias para a redacao', () => {
    expect(pageSource).toMatch(/unread:\s*'(Unread|Não lida)'/)
    expect(pageSource).toMatch(/in_review:\s*'(In review|Em análise)'/)
    expect(pageSource).toMatch(/investigating:\s*'(Investigating|Investigando)'/)
    expect(pageSource).toMatch(/archived:\s*'(Archived|Arquivada)'/)
  })

  it('define as opcoes de redacao suportadas', () => {
    expect(pageSource).toMatch(/Public Ledger|Folha Pública/)
    expect(pageSource).toMatch(/City Journal|Jornal da Cidade/)
    expect(pageSource).toMatch(/Horizon Wire|Agência Horizonte/)
  })

  it('garante padrao de identificador de denuncia anonima no formato BR-XXXX', () => {
    expect(pageSource).toMatch(/BR-/)
    expect(pageSource).toMatch(/TIP IDENTIFIER|IDENTIFICADOR DA DENÚNCIA/)
  })

  it('define regras de limite de tamanho de mensagem (min 10 caracteres, max 2.000)', () => {
    expect(pageSource).toContain('message.length < 10')
    expect(pageSource).toMatch(/2[.,]000/)
  })

  it('inclui os 3 passos do fluxo de denuncia (01/03, 02/03, ENVIADO)', () => {
    expect(pageSource).toMatch(/NEW TIP|NOVA DENÚNCIA/)
    expect(pageSource).toMatch(/ABOUT THE TIP|SOBRE A DENÚNCIA/)
    expect(pageSource).toMatch(/TIP RECEIVED|DENÚNCIA RECEBIDA/)
  })

  it('painel da redacao (desk) inclui metricas e controles editoriais', () => {
    expect(pageSource).toMatch(/UNREAD|NÃO LIDAS/)
    expect(pageSource).toMatch(/INVESTIGATING|EM INVESTIGAÇÃO/)
    expect(pageSource).toMatch(/AVG\. RESPONSE TIME|TEMPO MÉDIO DE RESPOSTA/)
    expect(pageSource).toMatch(/Internal note|Nota interna/)
    expect(pageSource).toMatch(/Tip status|Status da denúncia/)
  })

  it('nao gera link simulado invalido para o fallback do World ID', () => {
    expect(controllerSource).not.toContain('staging.world.org/verify?t=wld&i=simulated-')
  })

  it('usa um newsroom ENS valido para o World ID', () => {
    expect(controllerSource).toContain("selectedNewsroom: SHOWCASE_ACCOUNTS.newsroom")
    expect(controllerSource).not.toContain("selectedNewsroom: 'Public Ledger'")
  })

  it('normaliza qualquer label de newsroom para o ENS valido', () => {
    const controller = createWebsiteController()
    controller.selectNewsroom('Public Ledger')
    expect(controller.state.selectedNewsroom).toBe('jornal-livre.eth')
  })

  it('usa o relayer real para publicar a denuncia quando nao ha sourceClient', async () => {
    const calls: Array<{ url: string; method?: string; body?: string }> = []
    const controller = createWebsiteController({
      fetchFn: async (url, init) => {
        calls.push({
          url: String(url),
          method: init?.method ? String(init.method) : 'GET',
          body: typeof init?.body === 'string' ? init.body : undefined,
        })

        if (String(url).includes('/submissions')) {
          return {
            ok: true,
            status: 201,
            json: async () => ({ key: '0xabc123', parts: 1 }),
          } as Response
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
        } as Response
      },
    })

    controller.selectNewsroom('jornal-livre.eth')
    controller.selectCategory('Corruption')
    controller.setMessage('Mensagem válida para teste de publicação real do tip.')
    ;(controller.state as any).worldIdProof = {
      protocol_version: '4.0',
      action: 'submit:jornal-livre.eth:202611',
      environment: 'staging',
      responses: [{ nullifier: '0xabc', proof: ['0x1', '0x2'] }],
    }

    const receipt = await controller.submitReport()

    expect(receipt.key).toBeDefined()
    expect(calls.some((c) => c.url.includes('/submissions'))).toBe(true)
    const submissionCall = calls.find((c) => c.url.includes('/submissions'))
    expect(submissionCall?.method).toBe('POST')
    expect(submissionCall?.body).toContain('"proof"')
    expect(submissionCall?.body).toContain('"envelope"')
  })

  it('gera uma prova simulada compatível com o payload v4 do World ID', async () => {
    const controller = createWebsiteController({
      fetchFn: async (url) => {
        if (String(url).includes('/submissions')) {
          return {
            ok: true,
            status: 201,
            json: async () => ({ key: '0xabc123', parts: 1 }),
          } as Response
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
        } as Response
      },
    })

    controller.selectNewsroom('jornal-livre.eth')
    controller.selectCategory('Corruption')
    controller.setMessage('Mensagem válida para testar o payload v4 do mundo simulado.')

    await controller.simulateWorldIdApproval()

    expect(controller.state.worldIdProof).toMatchObject({
      protocol_version: '4.0',
      nonce: expect.any(String),
      action: expect.stringContaining('submit:jornal-livre.eth:'),
      environment: 'staging',
      responses: [
        expect.objectContaining({
          identifier: 'proof_of_human',
          issuer_schema_id: 1,
          proof: expect.any(String),
          nullifier: expect.any(String),
          expires_at_min: expect.any(Number),
        }),
      ],
    })
  })

  it('rejeita anexos acima do limite real de 200 KB antes de publicar', () => {
    const controller = createWebsiteController({
      fetchFn: async () => {
        throw new Error('fetch should not be called for oversized attachments')
      },
    })

    controller.setAttachment({
      name: 'large-photo.jpg',
      bytes: new Uint8Array(200001),
      mimeType: 'image/jpeg',
    })

    expect(controller.state.attachment).toBeUndefined()
    expect(controller.state.error).toContain('200000')
  })

  it('nao quebra a UI quando o relayer falha com Failed to fetch', async () => {
    const controller = createWebsiteController({
      fetchFn: async () => {
        throw new TypeError('Failed to fetch')
      },
    })

    controller.selectNewsroom('jornal-livre.eth')
    controller.selectCategory('Corruption')
    controller.setMessage('Mensagem válida para teste de fallback de rede.')
    ;(controller.state as any).worldIdProof = {
      protocol_version: '4.0',
      action: 'submit:jornal-livre.eth:202611',
      environment: 'staging',
      responses: [{ nullifier: '0xdef', proof: ['0x1'] }],
    }

    await expect(controller.submitReport()).resolves.toBeNull()
    expect(controller.state.error).toContain('relayer')
    expect(controller.state.busy).toBe(false)
  })
})
