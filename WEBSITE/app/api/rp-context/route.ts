import { NextResponse } from 'next/server'
import { actionFor, epochOf } from '@blind-report/core'
import { createRpContextSigner } from '@blind-report/worldid-gate'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const newsroom = searchParams.get('newsroom') ?? 'jornal-livre.eth'
    const now = new Date()
    const epoch = epochOf(now)
    const action = actionFor(newsroom, epoch)

    const signingKeyHex =
      process.env.RP_SIGNING_KEY ??
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    const rpId = process.env.WORLD_RP_ID ?? 'rp_4847560e061aacf6'
    const appId = process.env.WORLD_APP_ID ?? 'app_4042c24254a33097907e995869d6e132'
    const environment = process.env.WORLD_ENVIRONMENT ?? 'staging'

    const signer = createRpContextSigner({
      signingKeyHex,
      rpId,
      ttlSeconds: 600,
    })

    const rpContext = signer.rpContextFor({ newsroom, epoch })

    return NextResponse.json({
      app_id: appId,
      environment,
      action,
      epoch,
      rp_context: rpContext,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Failed to generate RP context' },
      { status: 500 }
    )
  }
}
