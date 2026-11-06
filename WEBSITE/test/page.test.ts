import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const PAGE_PATH = resolve(import.meta.dirname, '../app/page.tsx')
const pageSource = readFileSync(PAGE_PATH, 'utf8')

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
})
