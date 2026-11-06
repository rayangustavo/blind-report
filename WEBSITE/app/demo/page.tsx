'use client'

import { useState } from 'react'
import {
  ArrowRight,
  ChevronDown,
  FileText,
  Fingerprint,
  Inbox,
  Key,
  LockKeyhole,
  Menu,
  MessageSquareLock,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import { useWebsiteController } from '../../lib/use-website-controller'
import { SHOWCASE_ACCOUNTS } from '../../lib/website-controller'
import { RelayerStatusBadge } from '../../components/relayer-status'
import { EvaluatorBanner } from '../../components/evaluator-banner'
import { JuryStoryboard } from '../../components/jury-storyboard'
import { OnChainTxBadge } from '../../components/onchain-tx-badge'
import {
  Logo,
  Pill,
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
    exportBackup,
    importBackup,
    addJournalist,
    revokeJournalist,
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
  const [showStoryboard, setShowStoryboard] = useState(true)

  const handleLoadScenarioAndNavigate = (scenario: 'procurement' | 'environmental') => {
    loadDemoScenario(scenario)
    navigate('report')
    setReportStep(2)
  }

  return (
    <main className="app-shell">
      {/* 1. BANNER DE CONTEXTO EXPLICANDO O PROPÓSITO DO /DEMO */}
      <EvaluatorBanner />

      {/* 2. BARRA RÁPIDA DO AVALIADOR / JURADO (1-CLICK LOAD & ROLES) */}
      <div className="demo-quick-bar" aria-label="Demo Quick Controls">
        <div className="demo-quick-actions">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
            <Zap size={14} /> 1-Click Leak Scenarios:
          </span>
          <button
            type="button"
            className="demo-load-btn"
            onClick={() => handleLoadScenarioAndNavigate('procurement')}
            title="Pre-fills $14.2M Emergency Procurement Corruption with CSV audit attachment"
          >
            ⚡ "Procurement Corruption ($14.2M)"
          </button>
          <button
            type="button"
            className="demo-load-btn"
            onClick={() => handleLoadScenarioAndNavigate('environmental')}
            title="Pre-fills chemical dumping investigation with PDF lab results"
          >
            ⚡ "Chemical Dumping"
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            Switch Role:
          </span>
          <button
            type="button"
            className={`demo-badge-btn ${state.role === 'disconnected' ? 'active' : ''}`}
            onClick={() => {
              disconnectWallet()
              startReport()
            }}
            title="Act as Anonymous Whistleblower"
          >
            Whistleblower (Anon)
          </button>
          <button
            type="button"
            className={`demo-badge-btn ${state.role === 'admin' ? 'active' : ''}`}
            onClick={() => {
              switchDemoRole('admin')
              navigate('desk')
            }}
            title="Connect as Newsroom Owner (0x8cf0...)"
          >
            ⚡ Demo Owner
          </button>
          <button
            type="button"
            className={`demo-badge-btn ${state.role === 'journalist' ? 'active' : ''}`}
            onClick={() => {
              switchDemoRole('journalist')
              navigate('desk')
            }}
            title="Connect as Authorized Reporter (0x3C8E...)"
          >
            ⚡ Demo Reporter
          </button>
          <button
            type="button"
            className="wallet-btn"
            onClick={() => connectWallet()}
            title="Connect personal MetaMask to test on Sepolia"
          >
            <Wallet size={14} /> Connect MetaMask
          </button>
        </div>
      </div>

      {/* 3. STORYBOARD INTERATIVO DO JÚRI (ETAPAS DO VÍDEO) */}
      <div style={{ margin: '0 32px' }}>
        <button
          className="text-xs text-amber-400 hover:underline flex items-center gap-1 mt-3"
          onClick={() => setShowStoryboard((prev) => !prev)}
        >
          <Sparkles size={13} /> {showStoryboard ? 'Hide Evaluator Storyboard' : 'Show Evaluator Storyboard & Partner Checklist'}
        </button>
        {showStoryboard && <JuryStoryboard />}
      </div>

      {/* 4. ON-CHAIN SEPOLIA TRANSACTION BADGE */}
      {state.lastTx && <OnChainTxBadge tx={state.lastTx} />}

      {/* 5. SITE HEADER */}
      <header className="site-header" style={{ marginTop: '10px' }}>
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
              <span className="eyebrow-dot" /> ETHGLOBAL EVALUATION DEMO
            </div>
            <h1>
              Experience the<br />
              <em>Zero-Knowledge</em><br />
              whistleblowing flow.
            </h1>
            <p className="hero-subtitle">
              Test end-to-end tip encryption, decentralized PKI via ENSv2 on Sepolia, Sybil resistance via World ID 4.0, and immutable block-expiring storage on Arkiv.
            </p>
            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => handleLoadScenarioAndNavigate('procurement')}
              >
                ⚡ 1-Click Submit Leak <ArrowRight size={17} />
              </button>
              <button
                className="text-button"
                onClick={() => {
                  switchDemoRole('journalist')
                  navigate('desk')
                }}
              >
                Open Newsroom Desk <ArrowRight size={15} />
              </button>
            </div>
            <div className="hero-note">
              <ShieldCheck size={14} /> Fast-tracked UI with authentic on-chain Sepolia execution.
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
                <span className="pill pill-investigating">DEMO MODE ACTIVE</span>
                <span className="card-badge">SEPOLIA</span>
              </div>
              <div className="card-headline">
                Emergency contracts ($14.2M)
              </div>
              <div className="card-tags">
                <span>Corruption</span>
                <span>Audit CSV Attached</span>
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
          onExportBackup={exportBackup}
          onImportBackup={importBackup}
          onAddJournalist={addJournalist}
          onRevokeJournalist={revokeJournalist}
          onShareKeyring={shareKeyring}
          onNewReaderKey={newReaderKey}
          onImportSharedKeyring={importSharedKeyring}
          onRenewSubmission={renewSubmission}
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
