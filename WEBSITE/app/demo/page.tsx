'use client'

import { useState } from 'react'
import {
  ArrowRight,
  Menu,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react'
import { useWebsiteController } from '../../lib/use-website-controller'
import { RelayerStatusBadge } from '../../components/relayer-status'
import { DemoTopBar } from '../../components/demo-top-bar'
import { OnChainTxBadge } from '../../components/onchain-tx-badge'
import {
  Logo,
  ReportFlow,
  RepliesFlow,
  VerifyFlow,
  EditorialDesk,
} from '../page'

export default function DemoPage() {
  const {
    state,
    filteredReports,
    navigate,
    startReport,
    setReportStep,
    selectNewsroom,
    selectCategory,
    setMessage,
    setAttachment,
    setFilter,
    setSearchQuery,
    selectReport,
    setActiveDeskTab,
    clearAlerts,
    connectWallet,
    switchDemoRole,
    disconnectWallet,
    registerNewsroom,
    rotateKey,
    updatePolicy,
    exportBackup,
    importBackup,
    addJournalist,
    revokeJournalist,
    renewJournalist,
    shareKeyring,
    renewSubmission,
    newReaderKey,
    importSharedKeyring,
    decryptSelectedReport,
    saveInternalNote,
    updateReportStatus,
    replyToReport,
    submitReport,
    readRepliesWithReceipt,
    verifyAuthorship,
    loadDemoScenario,
    fastTrackZkpProof,
  } = useWebsiteController(undefined, { mode: 'demo' })

  const [verifyText, setVerifyText] = useState('')
  const [verifySaltHex, setVerifySaltHex] = useState('')
  const [receiptInput, setReceiptInput] = useState('')

  return (
    <main className="app-shell">
      {/* 1. BARRA SUPERIOR MINIMALISTA DO MODO DEMO (SELETOR DE PAPÉIS SEM REDIRECIONAMENTO ABRUPTO) */}
      <DemoTopBar
        role={state.role}
        onSelectRole={(r) => {
          if (r === 'disconnected') {
            disconnectWallet()
          } else {
            switchDemoRole(r)
          }
        }}
        walletAddress={state.walletAddress}
        onConnectMetaMask={() => connectWallet()}
      />

      {/* 2. ON-CHAIN SEPOLIA TRANSACTION BADGE */}
      {state.lastTx && <OnChainTxBadge tx={state.lastTx} />}

      {/* 3. SITE HEADER */}
      <header className="site-header">
        <button className="logo-button" onClick={() => navigate('home')} aria-label="Back to home">
          <Logo />
        </button>

        <nav className="top-nav" aria-label="Main navigation">
          <button onClick={() => navigate('home')} className={state.view === 'home' ? 'brand-accent font-bold' : ''}>
            Home
          </button>
          <button onClick={() => navigate('report')} className={state.view === 'report' ? 'brand-accent font-bold' : ''}>
            Send Tip
          </button>
          <button onClick={() => navigate('replies')} className={state.view === 'replies' ? 'brand-accent font-bold' : ''}>
            Check Replies
          </button>
          <button onClick={() => navigate('verify')} className={state.view === 'verify' ? 'brand-accent font-bold' : ''}>
            Verify Leak
          </button>
          <button onClick={() => navigate('desk')} className="nav-editorial">
            Newsroom Desk <ArrowRight size={14} />
          </button>
        </nav>

        <div className="wallet-box">
          {state.walletAddress ? (
            <div className="flex items-center gap-2">
              <span className={`pill ${state.role === 'admin' ? 'pill-investigating' : 'pill-in_review'}`}>
                {state.role === 'admin' ? 'Owner (Admin)' : state.role === 'journalist' ? 'Reporter' : 'Visitor'}
              </span>
              <button className="wallet-btn connected" onClick={disconnectWallet} title="Click to disconnect">
                <Wallet size={14} />
                <span>{state.walletAddress.slice(0, 6)}...{state.walletAddress.slice(-4)}</span>
              </button>
            </div>
          ) : (
            <button className="wallet-btn" onClick={() => connectWallet()} title="Connect MetaMask (Sepolia)">
              <Wallet size={14} /> Connect MetaMask
            </button>
          )}
        </div>

        <button className="mobile-menu" aria-label="Open menu">
          <Menu size={20} />
        </button>
      </header>

      {/* NOTICES / ALERTAS GLOBAIS */}
      {state.notice && (
        <div className="app-notice success">
          <span>{state.notice}</span>
          <button onClick={clearAlerts}><X size={15} /></button>
        </div>
      )}
      {state.error && (
        <div className="app-notice error">
          <span>{state.error}</span>
          <button onClick={clearAlerts}><X size={15} /></button>
        </div>
      )}

      {/* VIEW: HOME (DEMO LANDING) */}
      {state.view === 'home' && (
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" /> CONFIDENTIAL REPORTING · SEPOLIA
            </div>
            <h1>
              What needs to be<br />
              <em>revealed</em> deserves<br />
              to be protected.
            </h1>
            <p className="hero-subtitle">
              Test end-to-end tip encryption, decentralized PKI via ENSv2 on Sepolia, Sybil resistance via World ID 4.0, and immutable block-expiring storage on Arkiv.
            </p>
            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => startReport()}
              >
                Send a Tip <ArrowRight size={17} />
              </button>
              <button
                className="text-button"
                onClick={() => navigate('desk')}
              >
                Open Newsroom Desk <ArrowRight size={15} />
              </button>
            </div>
            <div className="hero-note">
              <ShieldCheck size={14} /> Interactive demo with authentic cryptographic & Sepolia on-chain execution.
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <img
              className="ethglobal-art"
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20de%20tela%20de%202026-11-06%2011-47-48.png-ZVK33CZ0wtxxPyPUuIZnEgX7eJ8uFH.jpeg"
              alt="Colorful ETHGlobal Mumbai illustration"
            />
            <div className="visual-art-overlay" />
            <div className="visual-glow" />
            <div className="visual-card visual-card-main">
              <div className="card-topline">
                <span className="pill pill-investigating">SEPOLIA TESTNET</span>
                <span className="card-badge">LIVE ENS & ARKIV</span>
              </div>
              <div className="card-headline">
                Encrypted Tip Ingest #BR-8421
              </div>
              <div className="card-tags">
                <span>jornal-livre.eth</span>
                <span>X25519 Sealed</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VIEW: REPORT (WHISTLEBLOWER FLOW) */}
      {state.view === 'report' && (
        <ReportFlow
          step={state.reportStep}
          setStep={setReportStep}
          category={state.selectedCategory}
          setCategory={selectCategory}
          newsroom={state.selectedNewsroom}
          setNewsroom={selectNewsroom}
          message={state.message}
          setMessage={setMessage}
          setAttachment={setAttachment}
          receipt={state.receipt}
          onSubmit={submitReport}
          busy={state.busy}
          onBack={() => navigate('home')}
          onCheckReplies={() => navigate('replies')}
          isDemo={true}
          onLoadScenario={loadDemoScenario}
          onFastTrackZkp={fastTrackZkpProof}
          zkpProofGenerated={state.zkpProofGenerated}
        />
      )}

      {/* VIEW: REPLIES (WHISTLEBLOWER RETURN CHANNEL) */}
      {state.view === 'replies' && (
        <RepliesFlow
          receiptInput={receiptInput}
          setReceiptInput={setReceiptInput}
          latestReceipt={state.receipt}
          replies={state.replies}
          onCheck={readRepliesWithReceipt}
          busy={state.busy}
          onBack={() => navigate('home')}
        />
      )}

      {/* VIEW: VERIFY (AUTHORSHIP COMMITMENT REVELATION) */}
      {state.view === 'verify' && (
        <VerifyFlow
          verifyText={verifyText}
          setVerifyText={setVerifyText}
          verifySaltHex={verifySaltHex}
          setVerifySaltHex={setVerifySaltHex}
          latestReceipt={state.receipt}
          result={state.authorshipResult}
          onVerify={verifyAuthorship}
          busy={state.busy}
          onBack={() => navigate('home')}
          isDemo={true}
        />
      )}

      {/* VIEW: EDITORIAL DESK (NEWSROOM TRIAGE) */}
      {state.view === 'desk' && (
        <EditorialDesk
          filter={state.filter}
          setFilter={setFilter}
          searchQuery={state.searchQuery}
          setSearchQuery={setSearchQuery}
          reports={filteredReports}
          selectedReport={state.selectedReport}
          setSelectedReport={selectReport}
          activeTab={state.activeDeskTab}
          setActiveTab={setActiveDeskTab}
          role={state.role}
          walletAddress={state.walletAddress}
          journalistName={state.journalistName}
          keyVersion={state.keyVersion}
          team={state.team}
          expiring={state.expiring}
          readerKey={state.readerKey}
          sharedKeyringBlob={state.sharedKeyringBlob}
          backupText={state.backupText}
          onConnect={() => connectWallet()}
          onDecrypt={decryptSelectedReport}
          onSaveNote={saveInternalNote}
          onUpdateStatus={updateReportStatus}
          onReply={replyToReport}
          onRegisterNewsroom={registerNewsroom}
          onRotateKey={rotateKey}
          onUpdatePolicy={updatePolicy}
          onExportBackup={exportBackup}
          onImportBackup={importBackup}
          onAddJournalist={addJournalist}
          onRevokeJournalist={revokeJournalist}
          onRenewJournalist={renewJournalist}
          onShareKeyring={shareKeyring}
          onNewReaderKey={newReaderKey}
          onImportSharedKeyring={importSharedKeyring}
          onRenewSubmission={renewSubmission}
          adminStep={state.adminStep}
          editorialPolicy={state.editorialPolicy}
          busy={state.busy}
          onBack={() => navigate('home')}
          isDemo={true}
        />
      )}

      {/* FOOTER */}
      <footer className="site-footer">
        <Logo />
        <RelayerStatusBadge status={state.relayerStatus} sponsorAddress={state.relayerSponsor} relayerUrl={state.relayerUrl} />
        <span>Information protected. Journalism strengthened.</span>
        <span>© 2026 Blind Report · ETHGlobal Demo Mode</span>
      </footer>
    </main>
  )
}
