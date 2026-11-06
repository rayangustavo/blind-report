'use client'

import { ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

export function ProductionEvaluatorCallout() {
  return (
    <aside className="production-callout" aria-label="ETHGlobal Evaluator Notice">
      <div className="production-callout-inner">
        <div className="production-callout-text">
          <span className="production-callout-badge">
            <Sparkles size={12} className="inline mr-1" /> ETHGlobal Evaluators
          </span>
          <span>
            Evaluating Blind Report for the hackathon? Access our fast-tracked evaluator flow with pre-filled corruption leak scenarios, 1-click role testing, and live Sepolia on-chain validation.
          </span>
        </div>
        <Link href="/demo" className="production-callout-btn">
          Open Evaluator Demo (/demo) <ArrowRight size={13} />
        </Link>
      </div>
    </aside>
  )
}
