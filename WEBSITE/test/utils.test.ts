import { describe, expect, it } from 'vitest'
import { cn } from '../lib/utils'

describe('WEBSITE - lib/utils (cn)', () => {
  it('combina classes simples com espacos', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('ignora valores falsy e condicionais', () => {
    const isHidden = false
    const isActive = true
    expect(cn('base', isHidden && 'hidden', isActive && 'active')).toBe('base active')
  })

  it('resolve conflitos de classes do Tailwind usando tailwind-merge', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    expect(cn('bg-white', 'bg-transparent')).toBe('bg-transparent')
  })

  it('trata arrays e objetos aninhados', () => {
    expect(cn(['flex', 'items-center'], { 'gap-2': true, 'gap-4': false })).toBe('flex items-center gap-2')
  })
})
