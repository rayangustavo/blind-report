'use client'

import { ArrowLeft, Sparkles, User, Shield, PenTool, Wallet } from 'lucide-react'
import Link from 'next/link'

interface DemoTopBarProps {
  role: 'disconnected' | 'admin' | 'journalist' | 'visitor'
  onSelectRole: (role: 'disconnected' | 'admin' | 'journalist') => void
  walletAddress?: string
  onConnectMetaMask?: () => void
}

export function DemoTopBar({
  role,
  onSelectRole,
  walletAddress,
  onConnectMetaMask,
}: DemoTopBarProps) {
  return (
    <aside className="demo-top-bar" aria-label="Demo environment controls">
      <div className="demo-top-bar-inner">
        {/* Lado esquerdo: Indicador limpo de modo */}
        <div className="demo-top-bar-left">
          <span className="demo-top-bar-pill">
            <span className="demo-pulse-dot" />
            <Sparkles size={12} className="text-amber-400" />
            <span>DEMO MODE</span>
          </span>
          <span className="demo-top-bar-sep">·</span>
          <span className="demo-network-tag">Sepolia Testnet</span>
        </div>

        {/* Centro: Seletor sutil de papel para teste (sem redirecionar de tela) */}
        <div className="demo-role-pills" aria-label="Switch demo test role">
          <span className="demo-roles-label">Role:</span>
          <button
            type="button"
            className={`demo-role-btn ${role === 'disconnected' ? 'active' : ''}`}
            onClick={() => onSelectRole('disconnected')}
            title="Act as Anonymous Whistleblower"
          >
            <User size={12} />
            <span>Whistleblower</span>
          </button>

          <button
            type="button"
            className={`demo-role-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => onSelectRole('admin')}
            title="Switch to Newsroom Owner (0x8cf0...)"
          >
            <Shield size={12} />
            <span>Owner</span>
          </button>

          <button
            type="button"
            className={`demo-role-btn ${role === 'journalist' ? 'active' : ''}`}
            onClick={() => onSelectRole('journalist')}
            title="Switch to Authorized Reporter (0x3C8E...)"
          >
            <PenTool size={12} />
            <span>Reporter</span>
          </button>

          {onConnectMetaMask && (
            <button
              type="button"
              className="demo-role-btn metamask"
              onClick={onConnectMetaMask}
              title="Connect your personal MetaMask wallet on Sepolia"
            >
              <Wallet size={12} />
              <span>MetaMask</span>
            </button>
          )}
        </div>

        {/* Lado direito: Link discreto para voltar à produção */}
        <div className="demo-top-bar-right">
          <Link href="/" className="demo-return-link" title="Return to production mode">
            <ArrowLeft size={13} />
            <span>Production Mode (/)</span>
          </Link>
        </div>
      </div>
    </aside>
  )
}
