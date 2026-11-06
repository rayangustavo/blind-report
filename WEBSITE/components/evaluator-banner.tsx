'use client'

import { ArrowLeft, CheckCircle2, ExternalLink, HelpCircle, Shield, Sparkles, Zap } from 'lucide-react'
import Link from 'next/link'

export function EvaluatorBanner() {
  return (
    <section className="evaluator-banner" aria-label="ETHGlobal Evaluator Guidance">
      <div className="evaluator-banner-top">
        <div className="evaluator-badge">
          <Sparkles size={14} /> ETHGLOBAL MUMBAI — JURY & EVALUATOR DEMO
        </div>
        <Link href="/" className="evaluator-back-link">
          <ArrowLeft size={14} /> Back to Production Mode (/)
        </Link>
      </div>

      <div className="evaluator-banner-content">
        <h2>
          Why does this <em>/demo</em> route exist?
        </h2>
        <p className="evaluator-lead">
          Evaluating a zero-knowledge whistleblowing protocol end-to-end normally requires an in-person World ID Orb iris scan,
          multiple funded Sepolia Ethereum testnet wallets, and waiting for block mining confirmations.
          This <strong>/demo</strong> route allows the judging panel to inspect and test all five phases of the protocol in under 3 minutes,
          without sacrificing genuine cryptographic security or real on-chain execution.
        </p>

        <div className="evaluator-grid">
          <div className="evaluator-card real">
            <div className="evaluator-card-title">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>100% REAL & ON-CHAIN IN THIS DEMO</span>
            </div>
            <ul>
              <li>
                <strong>Libsodium Cryptography:</strong> Client-side X25519 & ChaCha20-Poly1305 asymmetric sealed boxes and ephemeral return mailboxes.
              </li>
              <li>
                <strong>ENSv2 on Sepolia Testnet:</strong> Newsroom text records, Libsodium public keys, and delegated subnames (<code className="text-emerald-300">reporter.jornal-livre.eth</code>) resolved from actual Sepolia contracts.
              </li>
              <li>
                <strong>Arkiv Network Storage:</strong> Block-expiring immutable entities, custody delegation, and sealed reply publication.
              </li>
              <li>
                <strong>Mathematical Authorship Proof:</strong> Verifiable zero-knowledge commitment matching the secret salt against the on-chain envelope hash.
              </li>
            </ul>
          </div>

          <div className="evaluator-card fast-track">
            <div className="evaluator-card-title">
              <Zap size={16} className="text-amber-400" />
              <span>FAST-TRACKED FOR JURY EVALUATION</span>
            </div>
            <ul>
              <li>
                <strong>1-Click Scenario Loader:</strong> Pre-fills a realistic leak scenario (<em>$14.2M Emergency Procurement Corruption</em>) with an attached financial audit CSV file.
              </li>
              <li>
                <strong>1-Click Evaluator Roles:</strong> Instantly switch between <em>Whistleblower</em>, <em>Newsroom Owner (0x8cf0...)</em>, and <em>Authorized Reporter (0x3C8E...)</em> without importing private keys into MetaMask.
              </li>
              <li>
                <strong>Simulated World ID 4.0 ZKP:</strong> Generates dynamic nullifiers bound to <code className="text-amber-300">submit:jornal-livre.eth:202611</code> without requiring a physical Orb.
              </li>
              <li>
                <strong>MetaMask Compatible:</strong> Evaluators can still connect their own personal Sepolia wallet at any moment!
              </li>
            </ul>
          </div>
        </div>

        <div className="evaluator-prizes-strip">
          <span className="prizes-label">ELIGIBLE PARTNER PRIZES TESTED LIVE:</span>
          <span className="prize-pill ens">ENSv2 (Decentralized PKI & Delegated Subnames)</span>
          <span className="prize-pill arkiv">Arkiv Network (Block Retention & Ephemeral Mailboxes)</span>
          <span className="prize-pill worldid">World ID (Protocol 4.0 Sybil-Resistant ZKP)</span>
        </div>
      </div>
    </section>
  )
}
