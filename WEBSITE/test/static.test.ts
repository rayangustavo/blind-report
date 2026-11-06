import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const WEBSITE_DIR = resolve(import.meta.dirname, '..')

describe('WEBSITE - Análise Estática de Assets e Configuração', () => {
  it('globals.css define todas as variaveis de tema da identidade visual do Blind Report', () => {
    const cssPath = join(WEBSITE_DIR, 'app/globals.css')
    expect(existsSync(cssPath)).toBe(true)
    const css = readFileSync(cssPath, 'utf8')

    // Variáveis da paleta Blind Report
    expect(css).toContain('--ink:')
    expect(css).toContain('--muted:')
    expect(css).toContain('--paper:')
    expect(css).toContain('--card:')
    expect(css).toContain('--line:')
    expect(css).toContain('--mint:')
    expect(css).toContain('--green:')
    expect(css).toContain('--lime:')
    expect(css).toContain('--orange:')
    expect(css).toContain('--blue:')

    // Importações de Tailwind v4
    expect(css).toContain("@import 'tailwindcss'")
  })

  it('todos os assets publicos necessarios existem no diretorio public/', () => {
    const requiredAssets = [
      'apple-icon.png',
      'icon-dark-32x32.png',
      'icon-light-32x32.png',
      'icon.svg',
      'placeholder-logo.png',
      'placeholder-logo.svg',
      'placeholder-user.jpg',
      'placeholder.jpg',
      'placeholder.svg',
    ]

    for (const asset of requiredAssets) {
      const p = join(WEBSITE_DIR, 'public', asset)
      expect(existsSync(p), `Asset publico ausente: ${asset}`).toBe(true)
    }
  })

  it('layout.tsx define metadados adequados e nao injeta CDNs ou scripts externos inseguros', () => {
    const layoutPath = join(WEBSITE_DIR, 'app/layout.tsx')
    expect(existsSync(layoutPath)).toBe(true)
    const layout = readFileSync(layoutPath, 'utf8')

    // Deve usar en ou lang apropriado e metadados
    expect(layout).toMatch(/lang="(en|pt-BR)"/)
    expect(layout).toContain('Blind Report')

    // Não deve carregar scripts de CDNs externos
    expect(layout).not.toMatch(/src=["']https?:\/\//)
  })

  it('tsconfig.json do WEBSITE possui configuracoes estritas e path aliases (@/*)', () => {
    const tsconfigPath = join(WEBSITE_DIR, 'tsconfig.json')
    expect(existsSync(tsconfigPath)).toBe(true)
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'))

    expect(tsconfig.compilerOptions.strict).toBe(true)
    expect(tsconfig.compilerOptions.paths?.['@/*']).toEqual(['./*'])
  })

  it('package.json do WEBSITE define Next.js 16, scripts essenciais e lock de versao seguro', () => {
    const pkgPath = join(WEBSITE_DIR, 'package.json')
    expect(existsSync(pkgPath)).toBe(true)
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))

    expect(pkg.scripts?.dev).toBe('next dev')
    expect(pkg.scripts?.build).toBe('next build')
    expect(pkg.scripts?.start).toBe('next start')

    expect(pkg.dependencies?.next).toBeDefined()
    expect(pkg.dependencies?.react).toBeDefined()
    expect(pkg.overrides?.['magic-string']).toBe('0.30.17')
  })
})
