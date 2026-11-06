'use client'

import { ExternalLink, Radio } from 'lucide-react'
import type { OnChainTxRecord } from '../lib/website-controller'

export function OnChainTxBadge({
  tx,
}: {
  tx?: OnChainTxRecord
}) {
  if (!tx) return null

  return (
    <div className="onchain-tx-card" aria-label="Latest Arkiv publication">
      <div className="onchain-tx-top">
        <span className="onchain-tx-pulse" />
        <span className="onchain-tx-title">LIVE ARKIV PUBLICATION</span>
        <span className="onchain-tx-time">{tx.timestamp}</span>
      </div>
      <div className="onchain-tx-label">{tx.label}</div>
      <div className="onchain-tx-hash-row">
        <span className="font-mono text-xs text-emerald-400">
          {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
        </span>
        <a
          href={tx.url}
          target="_blank"
          rel="noreferrer"
          className="onchain-tx-link"
          title="Check this Arkiv publication on Rabdi explorer"
        >
          Check on Arkiv <ExternalLink size={12} />
        </a>
      </div>
    </div>
  )
}
