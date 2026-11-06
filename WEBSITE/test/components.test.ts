import { describe, expect, it } from 'vitest'
import { buttonVariants } from '../components/ui/button'

describe('WEBSITE - Componentes UI (Button)', () => {
  it('gera classes padrao com variant default e size default', () => {
    const classes = buttonVariants()
    expect(classes).toContain('bg-primary')
    expect(classes).toContain('text-primary-foreground')
    expect(classes).toContain('rounded-lg')
  })

  it('aplica corretamente as variantes customizadas', () => {
    const outlineClasses = buttonVariants({ variant: 'outline' })
    expect(outlineClasses).toContain('border-border')
    expect(outlineClasses).toContain('bg-background')

    const secondaryClasses = buttonVariants({ variant: 'secondary' })
    expect(secondaryClasses).toContain('bg-secondary')

    const ghostClasses = buttonVariants({ variant: 'ghost' })
    expect(ghostClasses).toContain('hover:bg-muted')

    const destructiveClasses = buttonVariants({ variant: 'destructive' })
    expect(destructiveClasses).toContain('bg-destructive/10')
    expect(destructiveClasses).toContain('text-destructive')

    const linkClasses = buttonVariants({ variant: 'link' })
    expect(linkClasses).toContain('underline-offset-4')
  })

  it('aplica corretamente os tamanhos (sizes)', () => {
    const xs = buttonVariants({ size: 'xs' })
    expect(xs).toContain('h-6')

    const sm = buttonVariants({ size: 'sm' })
    expect(sm).toContain('h-7')

    const lg = buttonVariants({ size: 'lg' })
    expect(lg).toContain('h-9')

    const icon = buttonVariants({ size: 'icon' })
    expect(icon).toContain('size-8')
  })

  it('funde classes extras passadas via className', () => {
    const classes = buttonVariants({ className: 'custom-extra-class' })
    expect(classes).toContain('custom-extra-class')
  })
})
