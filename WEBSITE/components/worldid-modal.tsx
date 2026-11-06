'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink, ShieldCheck, Sparkles, X, Zap } from 'lucide-react'

interface WorldIdModalProps {
  isOpen: boolean
  onClose: () => void
  connectorUri: string | null
  action: string
  status: 'idle' | 'waiting' | 'verified' | 'error'
  error?: string | null
  onSimulateApprove?: () => void
}

export function WorldIdModal({
  isOpen,
  onClose,
  connectorUri,
  action,
  status,
  error,
  onSimulateApprove,
}: WorldIdModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopy = () => {
    if (!connectorUri) return
    navigator.clipboard.writeText(connectorUri)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const qrImageUrl = connectorUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(connectorUri)}&bgcolor=08-20-17&color=239-182-75`
    : null

  return (
    <div className="metamask-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="metamask-modal-content"
        style={{ maxWidth: '540px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO */}
        <div className="metamask-modal-header">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-amber-400" />
            <h3 className="font-bold text-base text-gray-100" style={{ margin: 0 }}>
              World ID Proof of Humanity
            </h3>
          </div>
          <button className="metamask-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* CORPO */}
        <div className="metamask-modal-body">
          <p className="text-xs text-gray-300" style={{ margin: '0 0 14px' }}>
            Para garantir que cada denúncia venha de um humano real e evitar ataques de spam, gere a prova de conhecimento zero (ZKP) vinculada à ação:
          </p>

          <div
            style={{
              background: '#0a1a16',
              border: '1px solid #1f4238',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#8ebbad',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Action: <strong>{action}</strong></span>
            <span style={{ color: '#efb64b', fontWeight: 600 }}>Protocol 4.0</span>
          </div>

          {/* QR CODE E LINK PARA O SIMULADOR */}
          <div
            style={{
              background: '#061310',
              border: '1px solid #1a3830',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {qrImageUrl ? (
              <img
                src={qrImageUrl}
                alt="World ID Connector QR Code"
                width={190}
                height={190}
                style={{
                  borderRadius: '6px',
                  border: '2px solid rgba(239, 182, 75, 0.4)',
                  padding: '4px',
                  background: '#081412',
                }}
              />
            ) : (
              <div
                style={{
                  width: '190px',
                  height: '190px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#081412',
                  borderRadius: '6px',
                  border: '1px dashed #285548',
                  color: '#6d988b',
                  fontSize: '11px',
                }}
              >
                Gerando sessão segura...
              </div>
            )}

            {/* STATUS DO POLLING */}
            <div className="flex items-center gap-2 text-xs">
              {status === 'verified' ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check size={14} /> Prova de Humanidade confirmada! Selando envelope...
                </span>
              ) : status === 'error' ? (
                <span className="text-rose-400 font-bold">{error ?? 'Falha na verificação.'}</span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1.5 font-medium">
                  <span className="demo-pulse-dot" /> Aguardando aprovação no Worldcoin Simulator ou App...
                </span>
              )}
            </div>

            {/* BOTÃO PRINCIPAL: ABRIR NO WORLDCOIN SIMULATOR */}
            <div className="flex gap-2 w-full mt-2" style={{ flexWrap: 'wrap' }}>
              <a
                href="https://simulator.worldcoin.org"
                target="_blank"
                rel="noreferrer"
                className="primary-button"
                style={{
                  flex: '1 1 200px',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontSize: '12px',
                  padding: '8px 14px',
                }}
                title="Abre o Worldcoin Simulator em nova aba"
              >
                Abrir Worldcoin Simulator <ExternalLink size={13} />
              </a>

              <button
                type="button"
                className="outline-button"
                onClick={handleCopy}
                disabled={!connectorUri}
                style={{
                  fontSize: '12px',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Copiar URI de conexão para colar no simulador"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? 'Link Copiado!' : 'Copiar URI'}</span>
              </button>
            </div>
          </div>

          {/* INSTRUÇÕES RÁPIDAS */}
          <div
            style={{
              background: '#091814',
              border: '1px solid #16362d',
              borderRadius: '6px',
              padding: '12px 14px',
              fontSize: '11px',
              color: '#a0c4b9',
              lineHeight: 1.5,
              marginBottom: '14px',
            }}
          >
            <div className="font-bold text-gray-200 mb-1 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-400" /> Como testar no Worldcoin Simulator:
            </div>
            <ol style={{ margin: 0, paddingLeft: '16px' }}>
              <li>Clique em <strong>"Abrir Worldcoin Simulator"</strong> (ou acesse simulator.worldcoin.org).</li>
              <li>Clique em <strong>"Copiar URI"</strong> e cole no campo do simulador (ou aponte a câmera).</li>
              <li>Selecione <strong>"Device"</strong> ou <strong>"Orb"</strong> e clique em <strong>"Verify"</strong> no simulador.</li>
              <li>Esta tela receberá a prova ZKP automaticamente e concluirá o envio!</li>
            </ol>
          </div>

          {/* ATALHO RÁPIDO PARA TESTE DIRETO */}
          {onSimulateApprove && (
            <div className="flex justify-between items-center pt-2 border-t border-emerald-950/60">
              <span className="text-xs text-gray-400">Prefere simular sem trocar de aba?</span>
              <button
                type="button"
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-medium"
                onClick={onSimulateApprove}
                title="Simula a resposta positiva do simulador instantaneamente"
              >
                <Zap size={12} /> Aprovar teste direto (Fast-Track)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
