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
    const categories = ['Corrupção', 'Políticas públicas', 'Direitos humanos', 'Meio ambiente']
    for (const cat of categories) {
      expect(pageSource).toContain(cat)
    }
  })

  it('define os status das denuncias para a redacao', () => {
    expect(pageSource).toContain("unread: 'Não lida'")
    expect(pageSource).toContain("in_review: 'Em análise'")
    expect(pageSource).toContain("investigating: 'Investigando'")
    expect(pageSource).toContain("archived: 'Arquivada'")
  })

  it('define as opcoes de redacao suportadas', () => {
    const newsrooms = ['Folha Pública', 'Jornal da Cidade', 'Agência Horizonte']
    for (const nr of newsrooms) {
      expect(pageSource).toContain(nr)
    }
  })

  it('garante padrao de identificador de denuncia anonima no formato BR-XXXX', () => {
    expect(pageSource).toMatch(/BR-/)
    expect(pageSource).toContain('IDENTIFICADOR DA DENÚNCIA')
  })

  it('define regras de limite de tamanho de mensagem (min 10 caracteres, max 2.000)', () => {
    expect(pageSource).toContain('message.length < 10')
    expect(pageSource).toContain('2.000')
  })

  it('inclui os 3 passos do fluxo de denuncia (01/03, 02/03, ENVIADO)', () => {
    expect(pageSource).toContain('NOVA DENÚNCIA')
    expect(pageSource).toContain('SOBRE A DENÚNCIA')
    expect(pageSource).toContain('DENÚNCIA RECEBIDA')
  })

  it('painel da redacao (desk) inclui metricas e controles editoriais', () => {
    expect(pageSource).toContain('NÃO LIDAS')
    expect(pageSource).toContain('EM INVESTIGAÇÃO')
    expect(pageSource).toContain('TEMPO MÉDIO DE RESPOSTA')
    expect(pageSource).toContain('Nota interna')
    expect(pageSource).toContain('Status da denúncia')
  })
})
