'use client'

import { AlertTriangle, ArrowRight, Download, ExternalLink, X } from 'lucide-react'
import Link from 'next/link'

export function MetaMaskModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="metamask-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="metamask-modal" onClick={(e) => e.stopPropagation()}>
        <div className="metamask-modal-header">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
            <AlertTriangle size={18} />
            <span>MetaMask Required for Production</span>
          </div>
          <button className="metamask-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="metamask-modal-body">
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            The main application (<strong>/</strong>) is configured for real production use on <strong>Ethereum Sepolia</strong>.
            To manage newsrooms, delegate journalist subnames, or access confidential triage dashboards, you need an injected Web3 wallet like MetaMask.
          </p>

          <div className="metamask-modal-options">
            <div className="metamask-option-card">
              <h4>Option 1: Install Web3 Wallet</h4>
              <p className="text-xs text-gray-400 mb-3">
                Install the MetaMask browser extension and switch your network to Ethereum Sepolia Testnet.
              </p>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noreferrer"
                className="primary-button small-button inline-flex items-center gap-1.5"
              >
                <Download size={14} /> Install MetaMask <ExternalLink size={12} />
              </a>
            </div>

            <div className="metamask-option-card highlight">
              <span className="evaluator-tag">RECOMMENDED FOR JUDGES</span>
              <h4>Option 2: Open Evaluator Demo</h4>
              <p className="text-xs text-gray-400 mb-3">
                If you are evaluating for the hackathon and do not wish to configure a Sepolia test wallet right now, test all features in our interactive demo.
              </p>
              <Link href="/demo" className="outline-button small-button inline-flex items-center gap-1.5" onClick={onClose}>
                Launch /demo Fast-Track <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
