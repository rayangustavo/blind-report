'use client'

import { Activity, ShieldCheck, Zap } from 'lucide-react'

export function RelayerStatusBadge({
  status = 'online',
  sponsorAddress = '0x77DD7d6DaA32DF7F34FEbd0eaeBD6B1a1c9a1D8F',
  relayerUrl = 'http://localhost:3001',
}: {
  status?: 'online' | 'offline' | 'checking'
  sponsorAddress?: string
  relayerUrl?: string
}) {
  const isOnline = status === 'online'

  return (
    <div className="relayer-status-card" title={`Relayer at ${relayerUrl} sponsors gas on Arkiv Network without storing client IP`}>
      <div className="status-indicator">
        <span className={`status-dot ${isOnline ? 'status-online' : 'status-offline'}`} />
        <span className="status-name">Relayer Gas Sponsor</span>
      </div>
      <div className="status-details">
        <span className="sponsor-addr">
          <Zap size={12} className="sponsor-icon" /> {sponsorAddress.slice(0, 6)}...{sponsorAddress.slice(-4)}
        </span>
        <span className="network-pill">
          <ShieldCheck size={12} /> Arkiv Rabdi
        </span>
      </div>
    </div>
  )
}
