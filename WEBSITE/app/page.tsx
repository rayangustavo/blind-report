'use client'

import { useMemo, useState, useRef } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  FileText,
  Filter,
  Fingerprint,
  Inbox,
  Key,
  LockKeyhole,
  Menu,
  MessageSquareLock,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import { useWebsiteController } from '../lib/use-website-controller'
import { STATUS_LABELS, type ReportItem } from '../lib/website-controller'
import { RelayerStatusBadge } from '../components/relayer-status'
import { ProductionEvaluatorCallout } from '../components/production-evaluator-callout'
import { MetaMaskModal } from '../components/metamask-modal'
import { OnChainTxBadge } from '../components/onchain-tx-badge'
import { WorldIdModal } from '../components/worldid-modal'

export function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <span />
      </span>
      <span>
        blind<span className="brand-accent">report</span>
      </span>
    </div>
  )
}

export function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

const statusLabels: Record<string, string> = { unread: 'Unread', in_review: 'In review', investigating: 'Investigating', archived: 'Archived' }

export default function App() {
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
    openWorldIdVerification,
    closeWorldIdModal,
    simulateWorldIdApproval,
  } = useWebsiteController(undefined, { mode: 'production' })

  const [verifyText, setVerifyText] = useState('')
  const [verifySaltHex, setVerifySaltHex] = useState('')
  const [receiptInput, setReceiptInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [metaMaskModalOpen, setMetaMaskModalOpen] = useState(false)

  const handleConnectWallet = async () => {
    if (typeof window !== 'undefined' && !(window as any).ethereum) {
      setMetaMaskModalOpen(true)
      return
    }
    await connectWallet()
  }

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <main className="app-shell">
      {/* AVISO DO AVALIADOR / JÚRI ETHGLOBAL */}
      <ProductionEvaluatorCallout />

      {/* HEADER PRINCIPAL */}
      <header className="site-header">
        <button className="logo-button" onClick={() => navigate('home')} aria-label="Back to home">
          <Logo />
        </button>

        <nav className="top-nav" aria-label="Main navigation">
          <button onClick={() => (document.getElementById('how-it-works') ?? document.getElementById('como-funciona'))?.scrollIntoView({ behavior: 'smooth' })}>
            How it works
          </button>
          <button onClick={() => (document.getElementById('security') ?? document.getElementById('seguranca'))?.scrollIntoView({ behavior: 'smooth' })}>
            Security
          </button>
          <button onClick={() => navigate('replies')} className={state.view === 'replies' ? 'brand-accent font-bold' : ''}>
            Check replies
          </button>
          <button onClick={() => navigate('verify')} className={state.view === 'verify' ? 'brand-accent font-bold' : ''}>
            Verify leak
          </button>
          <button onClick={() => navigate('desk')} className="nav-editorial">
            Newsroom desk <ArrowRight size={14} />
          </button>
        </nav>

        {/* WEB3 WALLET (PRODUÇÃO: METAMASK EXCLUSIVA) */}
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
            <button className="wallet-btn" onClick={handleConnectWallet} title="Connect MetaMask on Sepolia">
              <Wallet size={14} /> Connect MetaMask
            </button>
          )}
        </div>

        <button className="mobile-menu" aria-label="Open menu">
          <Menu size={20} />
        </button>
      </header>

      {/* ON-CHAIN SEPOLIA TRANSACTION BADGE */}
      {state.lastTx && <OnChainTxBadge tx={state.lastTx} />}

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

      {/* VIEW: HOME (LANDING PAGE) */}
      {state.view === 'home' && (
        <>
          <section className="hero-section">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="eyebrow-dot" /> A SECURE CHANNEL FOR JOURNALISM
              </div>
              <h1>
                What needs to be<br />
                <em>revealed</em> deserves<br />
                to be protected.
              </h1>
              <p className="hero-subtitle">
                Share information in the public interest with trusted newsrooms, protected by technical anonymity at every step.
              </p>
              <div className="hero-actions">
                <button className="primary-button" onClick={startReport}>
                  Send an anonymous tip <ArrowRight size={17} />
                </button>
                <button className="text-button" onClick={() => (document.getElementById('how-it-works') ?? document.getElementById('como-funciona'))?.scrollIntoView({ behavior: 'smooth' })}>
                  See how it works <ArrowRight size={15} />
                </button>
              </div>
              <div className="hero-note">
                <LockKeyhole size={14} /> Your identity is never shared with the newsroom.
              </div>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <img
                className="ethglobal-art"
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20de%20tela%20de%202026-11-06%2011-47-48.png-ZVK33CZ0wtxxPyPUuIZnEgX7eJ8uFH.jpeg"
                alt="Colorful ETHGlobal Mumbai illustration"
              />
              <div className="visual-art-overlay" />
              <div className="visual-orbit orbit-one" />
              <div className="visual-orbit orbit-two" />
              <div className="visual-glow" />
              <div className="visual-card visual-card-main">
                <div className="card-topline">
                  <span className="live-dot" /> protected channel <span className="card-lock"><LockKeyhole size={13} /></span>
                </div>
                <div className="signal-lines">
                  <span /><span /><span /><span />
                </div>
                <div className="card-footer">
                  <span>BLIND REPORT</span>
                  <span>END-TO-END</span>
                </div>
              </div>
              <div className="floating-card floating-card-top">
                <Fingerprint size={18} />
                <div>
                  <strong>Identity protected</strong>
                  <small>anti-abuse verification active</small>
                </div>
                <BadgeCheck size={18} className="check-icon" />
              </div>
              <div className="floating-card floating-card-bottom">
                <div className="mini-icon">
                  <ShieldCheck size={17} />
                </div>
                <div>
                  <strong>Sealed content</strong>
                  <small>only the newsroom can access it</small>
                </div>
              </div>
            </div>
          </section>

          <section className="trust-strip">
            <div><span className="trust-number">01</span><span>Anonymous by default</span></div>
            <div><span className="trust-number">02</span><span>Verified without exposure</span></div>
            <div><span className="trust-number">03</span><span>Secure information custody</span></div>
            <div className="trust-source"><span className="source-mark">◈</span> Built for journalism</div>
          </section>

          <section className="how-section section-wrap" id="how-it-works">
            <div className="section-heading">
              <div>
                <div className="eyebrow">HOW IT WORKS</div>
                <h2>From your information<br />to <em>investigation.</em></h2>
              </div>
              <p>No account. No unnecessary trails.<br />Only what matters for great reporting.</p>
            </div>
            <div className="steps-grid">
              <article>
                <span className="step-index">01</span>
                <div className="step-icon"><MessageSquareLock size={22} /></div>
                <h3>Tell us what you know</h3>
                <p>Choose a newsroom, select a topic, and describe the facts with as much context as possible.</p>
              </article>
              <article>
                <span className="step-index">02</span>
                <div className="step-icon"><Fingerprint size={22} /></div>
                <h3>Prove you are human</h3>
                <p>A quick check prevents spam and abuse. It confirms you are human without revealing who you are.</p>
              </article>
              <article>
                <span className="step-index">03</span>
                <div className="step-icon"><ShieldCheck size={22} /></div>
                <h3>The newsroom investigates</h3>
                <p>Your report reaches the editorial team sealed. The information is validated before anything is published.</p>
              </article>
            </div>
          </section>

          <section className="security-section" id="security">
            <div className="section-wrap security-grid">
              <div>
                <div className="eyebrow">SECURITY & PRIVACY</div>
                <h2>Trust is not a<br /><em>promise.</em> It is practice.</h2>
                <p>Every part of Blind Report is designed to protect sources and preserve the integrity of information.</p>
                <button className="outline-button" onClick={startReport}>
                  View newsroom policy <ArrowRight size={16} />
                </button>
              </div>
              <div className="security-list">
                <div>
                  <LockKeyhole size={19} />
                  <div>
                    <strong>No IP, no profile</strong>
                    <span>We do not log or store your IP address during the whistleblower experience.</span>
                  </div>
                </div>
                <div>
                  <Fingerprint size={19} />
                  <div>
                    <strong>Identity verified, not revealed</strong>
                    <span>World ID keeps the channel free from abuse without linking you to the tip.</span>
                  </div>
                </div>
                <div>
                  <Inbox size={19} />
                  <div>
                    <strong>Content in custody</strong>
                    <span>Only the selected newsroom can open and conduct the investigation.</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="tracks-section section-wrap" aria-labelledby="tracks-title">
            <div className="section-heading">
              <div>
                <div className="eyebrow">ETHGLOBAL MUMBAI · TRACKS</div>
                <h2 id="tracks-title">Built for the<br /><em>ecosystem.</em></h2>
              </div>
              <p>We are building Blind Report for the protocols and communities shaping a more open web.</p>
            </div>
            <div className="tracks-supported">
              <span>SUPPORTED BY</span>
              <div className="track-logos">
                <div className="track-logo-card">
                  <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/eth-tnZnEcICxcuorfaOybV4Wb5cTxT8E7.png" alt="Ethereum logo" />
                  <span>Ethereum Foundation</span>
                </div>
                <div className="track-logo-card">
                  <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ens-9twCNaCZDON6PWopdSdPLkdMlpPbgA.png" alt="ENS logo" />
                  <span>ENS</span>
                </div>
                <div className="track-logo-card arkiv-card">
                  <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/default.png-4LOhWotd16lYiBN0pb1fiqGbLVqJBf.jpeg" alt="Arkiv logo" />
                  <span>Arkiv</span>
                </div>
                <div className="track-logo-card">
                  <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/word-TlRKtsCJdHDiMp4H8ZDY4qs7mPyLsk.png" alt="World logo" />
                  <span>World</span>
                </div>
              </div>
            </div>
          </section>

          <section className="final-cta section-wrap">
            <div>
              <div className="eyebrow">HAVE SOMETHING TO SAY?</div>
              <h2>A good story<br />can start <em>here.</em></h2>
            </div>
            <button className="primary-button" onClick={startReport}>
              Send an anonymous tip <ArrowRight size={17} />
            </button>
          </section>
        </>
      )}

      {/* VIEW: REPORT FLOW (WHISTLEBLOWER) */}
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
          onVerifyWorldId={openWorldIdVerification}
          busy={state.busy}
          onBack={() => navigate('home')}
          onCheckReplies={() => navigate('replies')}
          isDemo={false}
          zkpProofGenerated={state.zkpProofGenerated}
        />
      )}

      {/* VIEW: CHECK REPLIES (WHISTLEBLOWER RETURN CHANNEL) */}
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

      {/* VIEW: VERIFY AUTHORSHIP (COMMITMENT REVELATION) */}
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
        />
      )}

      {/* VIEW: EDITORIAL DESK (OWNER & JOURNALIST) */}
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
          onConnect={handleConnectWallet}
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
        />
      )}

      {/* MODAL ORIENTATIVO DE METAMASK EM PRODUÇÃO */}
      <MetaMaskModal isOpen={metaMaskModalOpen} onClose={() => setMetaMaskModalOpen(false)} />

      {/* WORLD ID PROOF OF HUMANITY MODAL (WORLDCOIN SIMULATOR INTEGRATION) */}
      <WorldIdModal
        isOpen={state.worldIdModalOpen}
        onClose={closeWorldIdModal}
        connectorUri={state.worldIdConnectorUri}
        action={state.worldIdAction ?? `submit:${state.selectedNewsroom}:202611`}
        status={state.worldIdStatus}
        error={state.worldIdError}
        onSimulateApprove={simulateWorldIdApproval}
      />

      {/* FOOTER */}
      <footer className="site-footer">
        <Logo />
        <RelayerStatusBadge status={state.relayerStatus} sponsorAddress={state.relayerSponsor} relayerUrl={state.relayerUrl} />
        <span>Information protected. Journalism strengthened.</span>
        <span>© 2026 Blind Report</span>
      </footer>
    </main>
  )
}

// -----------------------------------------------------------------------------
// COMPONENT: REPORT FLOW (WHISTLEBLOWER)
// -----------------------------------------------------------------------------
export function ReportFlow({
  step,
  setStep,
  category,
  setCategory,
  newsroom,
  setNewsroom,
  message,
  setMessage,
  setAttachment,
  receipt,
  onSubmit,
  onVerifyWorldId,
  busy,
  onBack,
  onCheckReplies,
  isDemo,
  onLoadScenario,
  onFastTrackZkp,
  zkpProofGenerated,
}: any) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachedName, setAttachedName] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAttachedName(file.name)
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          setAttachment({
            name: file.name,
            bytes: new Uint8Array(reader.result),
            mimeType: file.type,
          })
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  return (
    <section className="flow-page">
      <div className="flow-header">
        <button className="back-button" onClick={onBack}>
          <X size={17} /> Close
        </button>
        <div className="flow-progress">
          <span className={step >= 1 ? 'active' : ''} />
          <span className={step >= 2 ? 'active' : ''} />
          <span className={step >= 3 ? 'active' : ''} />
        </div>
        <span className="flow-step">{step < 3 ? `0${step} / 03` : 'SUBMITTED'}</span>
      </div>

      <div className="flow-content">
        {step === 1 && (
          <>
            <div className="eyebrow">NEW TIP</div>
            <h1>Start with<br /><em>the facts.</em></h1>
            <p className="flow-intro">
              You are in a secure channel. We do not need to know who you are to hear what you have to say.
            </p>
            <label>Which newsroom do you want to submit to?</label>
            <div className="select-shell">
              <select value={newsroom} onChange={(e) => setNewsroom(e.target.value)}>
                <option value="Public Ledger">Public Ledger</option>
                <option value="City Journal">City Journal</option>
                <option value="Horizon Wire">Horizon Wire</option>
                <option value="jornal-livre.eth">jornal-livre.eth (ENSv2 Official Sepolia)</option>
              </select>
              <ChevronDown size={16} />
            </div>

            <div className="panel-card" style={{ margin: '20px 0 0', padding: '16px' }}>
              <div className="text-xs uppercase font-bold text-emerald-400 flex items-center gap-2 mb-1">
                <ShieldCheck size={14} /> ENSv2 Public Key & Policy Resolved
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#91a19c' }}>
                Encryption key (Curve25519 v1) and editorial rules verified directly from Ethereum Sepolia text records.
              </p>
            </div>

            <button className="primary-button flow-next" onClick={() => setStep(2)}>
              Continue <ArrowRight size={17} />
            </button>
            <div className="flow-reassurance">
              <LockKeyhole size={15} /> Your submission will be encrypted before leaving this device.
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="eyebrow">ABOUT THE TIP</div>
            <h1>What did you<br /><em>discover?</em></h1>
            <p className="flow-intro">
              The more context you share, the better the newsroom can evaluate. Avoid including details that might identify you.
            </p>

            <label>Tip category</label>
            <div className="category-grid">
              {['Corruption', 'Public policy', 'Human rights', 'Environment'].map((item) => (
                <button
                  key={item}
                  type="button"
                  className={category === item ? 'category active' : 'category'}
                  onClick={() => setCategory(item)}
                >
                  {item}
                  {category === item && <Check size={15} />}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between" style={{ marginTop: '14px', marginBottom: '6px' }}>
              <label htmlFor="report-message" style={{ margin: 0 }}>Describe the facts</label>
              {isDemo && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Sample:</span>
                  <button
                    type="button"
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                    onClick={() => onLoadScenario?.('procurement', { navigateToStep2: false })}
                    title="Fill sample procurement leak"
                  >
                    <Sparkles size={11} /> Corruption ($14.2M)
                  </button>
                  <span className="text-xs text-gray-600">·</span>
                  <button
                    type="button"
                    className="text-xs text-amber-400 hover:underline"
                    onClick={() => onLoadScenario?.('environmental', { navigateToStep2: false })}
                    title="Fill sample environmental dumping leak"
                  >
                    Environment
                  </button>
                </div>
              )}
            </div>
            <textarea
              id="report-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell what happened, when, and where. Avoid including details that reveal your identity."
            />

            <div className="upload-row">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="upload-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={16} /> {attachedName ? `Attached: ${attachedName}` : 'Attach file'}
              </button>
              <span>PDF, JPG, PNG or CSV · up to 10 MB</span>
            </div>

            <div className="flow-actions">
              <button className="ghost-button" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                className="primary-button"
                disabled={busy || !category || message.length < 10}
                onClick={async () => {
                  if (onVerifyWorldId && !zkpProofGenerated && !isDemo) {
                    await onVerifyWorldId()
                  } else {
                    await onSubmit()
                  }
                }}
              >
                {busy ? 'Encrypting & Generating ZKP...' : 'Verify and submit'} <ArrowRight size={17} />
              </button>
            </div>
            <div className="flow-reassurance">
              <LockKeyhole size={15} /> {message.length}/2,000 characters · Policy of {newsroom}
            </div>
          </>
        )}

        {step === 3 && receipt && (
          <div className="success-state">
            <div className="success-icon">
              <Check size={28} />
            </div>
            <div className="eyebrow">TIP RECEIVED</div>
            <h1>Your information<br />is <em>protected.</em></h1>
            <p className="flow-intro">
              The tip has been encrypted and submitted to <strong>{newsroom}</strong> via the Relayer. The editorial team will review the content carefully.
            </p>

            <div className="receipt-card">
              <span>TIP IDENTIFIER</span>
              <strong>BR-{receipt?.id ? receipt.id.replace('BR-', '') : '8421'}</strong>
              <small>Save this identifier and receipt keys to check progress without revealing your identity.</small>
              
              <div className="code-block" style={{ marginTop: '14px', textAlign: 'left' }}>
                <div><strong>Arkiv Key:</strong> {receipt.key}</div>
                <div><strong>Content Hash:</strong> {receipt.contentHash}</div>
                <div><strong>Private Salt:</strong> {receipt.salt ? Array.from(receipt.salt).slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('') + '...' : 'Available'}</div>
              </div>
            </div>

            <div className="flex gap-4">
              <button className="outline-button" onClick={onCheckReplies}>
                <MessageSquareLock size={16} /> Check newsroom replies
              </button>
              <button className="primary-button" onClick={onBack}>
                Back to home <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// -----------------------------------------------------------------------------
// COMPONENT: REPLIES FLOW (WHISTLEBLOWER RETURN CHANNEL)
// -----------------------------------------------------------------------------
export function RepliesFlow({
  receiptInput,
  setReceiptInput,
  latestReceipt,
  replies,
  onCheck,
  busy,
  onBack,
}: any) {
  const activeReceipt = latestReceipt

  return (
    <section className="flow-page">
      <div className="flow-header">
        <button className="back-button" onClick={onBack}>
          <X size={17} /> Back to home
        </button>
        <span className="flow-step">ANONYMOUS MAILBOX</span>
      </div>

      <div className="flow-content">
        <div className="eyebrow">CONFIDENTIAL RETURN CHANNEL</div>
        <h1>Check newsroom<br /><em>replies.</em></h1>
        <p className="flow-intro">
          Newsrooms reply to an ephemeral mailbox encrypted specifically for your receipt. No IP, account or identity is attached.
        </p>

        {activeReceipt && (
          <div className="panel-card" style={{ margin: '0 0 20px', padding: '16px' }}>
            <div className="text-xs font-bold text-amber-400 mb-1">Active Receipt Loaded: {activeReceipt.id}</div>
            <div className="text-xs text-gray-400">Recipient Newsroom: {activeReceipt.newsroom}</div>
          </div>
        )}

        <div className="form-group">
          <label>Paste Receipt Key or Identifier</label>
          <input
            type="text"
            placeholder={activeReceipt?.key ?? "0x1111222233334444..."}
            value={receiptInput}
            onChange={(e) => setReceiptInput(e.target.value)}
          />
        </div>

        <button
          className="primary-button"
          disabled={busy}
          onClick={async () => {
            await onCheck(activeReceipt)
          }}
        >
          {busy ? 'Querying Arkiv Network...' : 'Query Arkiv Mailbox'} <ArrowRight size={17} />
        </button>

        <div className="mt-8">
          <h3 className="text-lg font-bold text-emerald-300 mb-3">Official Verified Replies ({replies.length})</h3>
          {replies.length === 0 ? (
            <p className="text-gray-400 text-sm">No replies yet for this receipt. Newsroom triage may take up to 2-3 business days.</p>
          ) : (
            replies.map((rep: any, idx: number) => (
              <div key={idx} className="reply-item">
                <div className="reply-item-author">
                  <span><ShieldCheck size={14} className="inline mr-1" /> {rep.author}</span>
                  <small>Block #{Number(rep.createdAtBlock ?? 42n)}</small>
                </div>
                <div className="reply-item-text">{rep.text}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

// -----------------------------------------------------------------------------
// COMPONENT: VERIFY AUTHORSHIP (COMMITMENT REVELATION)
// -----------------------------------------------------------------------------
export function VerifyFlow({
  verifyText,
  setVerifyText,
  verifySaltHex,
  setVerifySaltHex,
  latestReceipt,
  result,
  onVerify,
  busy,
  onBack,
  isDemo,
}: any) {
  return (
    <section className="flow-page">
      <div className="flow-header">
        <button className="back-button" onClick={onBack}>
          <X size={17} /> Back to home
        </button>
        <span className="flow-step">CRYPTOGRAPHIC PROOF</span>
      </div>

      <div className="flow-content">
        <div className="eyebrow">MATHEMATICAL VERIFICATION</div>
        <h1>Prove you are<br /><em>the source.</em></h1>
        <p className="flow-intro">
          If you ever need to prove in court or to another party that you were the original whistleblower without prior exposure, reveal your secret salt.
        </p>

        {latestReceipt && (
          <button
            className="outline-button mb-4 text-xs py-1"
            onClick={() => {
              setVerifyText(latestReceipt.text)
              if (latestReceipt.salt) {
                setVerifySaltHex(Array.from(latestReceipt.salt).map(b => b.toString(16).padStart(2, '0')).join(''))
              }
            }}
          >
            {isDemo ? '⚡ Pre-fill with latest submission data' : 'Pre-fill with latest submission data'}
          </button>
        )}

        <div className="form-group">
          <label>Original Leak Text</label>
          <textarea
            value={verifyText}
            onChange={(e) => setVerifyText(e.target.value)}
            placeholder="Paste the exact text of the original leak..."
          />
        </div>

        <div className="form-group">
          <label>Secret Cryptographic Salt</label>
          <input
            type="text"
            value={verifySaltHex}
            onChange={(e) => setVerifySaltHex(e.target.value)}
            placeholder="Hex salt from your receipt (e.g. 01020304...)"
          />
        </div>

        <button
          className="primary-button"
          disabled={busy || !verifyText}
          onClick={() => {
            const saltBytes = new Uint8Array(
              verifySaltHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) ?? [1, 2, 3, 4]
            )
            onVerify({ text: verifyText, salt: saltBytes, rawEnvelope: latestReceipt?.rawEnvelope })
          }}
        >
          {busy ? 'Verifying Proof...' : 'Prove Authorship'} <ArrowRight size={17} />
        </button>

        {result && (
          <div className={`app-notice ${result.valid ? 'success' : 'error'} mt-6`}>
            <span>{result.message}</span>
          </div>
        )}
      </div>
    </section>
  )
}

// -----------------------------------------------------------------------------
// COMPONENT: EDITORIAL DESK (OWNER & JOURNALIST DASHBOARD)
// -----------------------------------------------------------------------------
export function EditorialDesk({
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
  reports,
  selectedReport,
  setSelectedReport,
  activeTab,
  setActiveTab,
  role,
  walletAddress,
  journalistName,
  keyVersion,
  team,
  expiring,
  readerKey,
  sharedKeyringBlob,
  backupText,
  onConnect,
  onDemoRole,
  onDecrypt,
  onSaveNote,
  onUpdateStatus,
  onReply,
  onRegisterNewsroom,
  onRotateKey,
  onUpdatePolicy,
  onExportBackup,
  onImportBackup,
  onAddJournalist,
  onRevokeJournalist,
  onRenewJournalist,
  onShareKeyring,
  onNewReaderKey,
  onImportSharedKeyring,
  onRenewSubmission,
  adminStep,
  editorialPolicy,
  busy,
  onBack,
}: any) {
  const [internalNoteText, setInternalNoteText] = useState('')
  const [replyText, setReplyText] = useState('')
  const [backupPassword, setBackupPassword] = useState('')
  const [importBackupPassword, setImportBackupPassword] = useState('')
  const [importBackupBlob, setImportBackupBlob] = useState('')
  const [newJournalistLabel, setNewJournalistLabel] = useState('')
  const [newJournalistAddr, setNewJournalistAddr] = useState('')
  const [newJournalistReaderKey, setNewJournalistReaderKey] = useState('')
  const [newJournalistDays, setNewJournalistDays] = useState(180)
  const [shareReaderKeyInput, setShareReaderKeyInput] = useState('')
  const [importKeyringBlobInput, setImportKeyringBlobInput] = useState('')
  const [registerLabel, setRegisterLabel] = useState('folha-investigativa')
  const [policyCategories, setPolicyCategories] = useState(
    editorialPolicy?.categories?.join(', ') ?? 'investigacao, corrupcao, direitos-humanos'
  )
  const [policyMaxBytes, setPolicyMaxBytes] = useState(editorialPolicy?.maxBytes ?? 250000)
  const [policyAttachments, setPolicyAttachments] = useState(editorialPolicy?.attachments ?? true)

  const isOwner = role === 'admin'
  const isJournalist = role === 'journalist'

  return (
    <section className="desk-page">
      {/* SIDEBAR */}
      <aside className="desk-sidebar">
        <div className="desk-brand">
          <Logo />
          <span className="desk-label">NEWSROOM</span>
        </div>

        <nav>
          <button className={activeTab === 'inbox' ? 'active' : ''} onClick={() => setActiveTab('inbox')}>
            <Inbox size={17} /> Inbox <b>{reports.length}</b>
          </button>
          {isOwner && (
            <>
              <button className={activeTab === 'team' ? 'active' : ''} onClick={() => setActiveTab('team')}>
                <Users size={17} /> Team ({team.length})
              </button>
              <button className={activeTab === 'keys' ? 'active' : ''} onClick={() => setActiveTab('keys')}>
                <Key size={17} /> Keys & Policy (v{keyVersion})
              </button>
            </>
          )}
          {isJournalist && (
            <button className={activeTab === 'reader_key' ? 'active' : ''} onClick={() => setActiveTab('reader_key')}>
              <Key size={17} /> My Reader Key
            </button>
          )}
          <button className={activeTab === 'retention' ? 'active' : ''} onClick={() => setActiveTab('retention')}>
            <Clock3 size={17} /> Arkiv Retention
          </button>
          {!isOwner && !isJournalist && (
            <button className={activeTab === 'onboarding' ? 'active' : ''} onClick={() => setActiveTab('onboarding')}>
              <Plus size={17} /> Register Newsroom
            </button>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="desk-user">
            <span>{isOwner ? 'AD' : isJournalist ? 'RP' : 'VS'}</span>
            <div>
              <strong>{isOwner ? 'Newsroom Owner' : isJournalist ? (journalistName ?? 'Reporter') : 'Visitor'}</strong>
              <small>{walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Wallet not connected'}</small>
            </div>
            <MoreHorizontal size={16} />
          </div>
          <button className="back-desk" onClick={onBack}>
            Exit newsroom
          </button>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <div className="desk-main">
        <header className="desk-top">
          <div>
            <div className="eyebrow">PUBLIC LEDGER / INBOX</div>
            <h1>Received tips</h1>
          </div>
          <div className="desk-actions">
            <button className="icon-button" title="Documentation">
              <CircleHelp size={18} />
            </button>
            <button className="user-avatar" onClick={onConnect} title="Connected Web3 Profile">
              {isOwner ? 'AD' : isJournalist ? 'RP' : 'MR'}
            </button>
          </div>
        </header>

        {/* DESK TABS BAR */}
        <div className="desk-tabs-bar">
          <button className={`desk-tab-btn ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>
            <Inbox size={15} /> Inbox & Triage
          </button>
          {isOwner && (
            <>
              <button className={`desk-tab-btn ${activeTab === 'team' ? 'active' : ''}`} onClick={() => setActiveTab('team')}>
                <Users size={15} /> Team Delegation (ENS Subnames)
              </button>
              <button className={`desk-tab-btn ${activeTab === 'keys' ? 'active' : ''}`} onClick={() => setActiveTab('keys')}>
                <Key size={15} /> Keyring & Policy (v{keyVersion})
              </button>
            </>
          )}
          {isJournalist && (
            <button className={`desk-tab-btn ${activeTab === 'reader_key' ? 'active' : ''}`} onClick={() => setActiveTab('reader_key')}>
              <Key size={15} /> Reader Key & Shared Keyring
            </button>
          )}
          <button className={`desk-tab-btn ${activeTab === 'retention' ? 'active' : ''}`} onClick={() => setActiveTab('retention')}>
            <Clock3 size={15} /> Arkiv Data Retention
          </button>
        </div>

        {/* SUMMARY STRIP */}
        <div className="desk-summary">
          <div>
            <span className="summary-label">UNREAD</span>
            <strong>03</strong>
            <span className="summary-trend">+2 today</span>
          </div>
          <div>
            <span className="summary-label">INVESTIGATING</span>
            <strong>08</strong>
            <span className="summary-trend neutral-trend">stable</span>
          </div>
          <div>
            <span className="summary-label">AVG. RESPONSE TIME</span>
            <strong>2.4 <small>days</small></strong>
            <span className="summary-trend">−12%</span>
          </div>
          <div className="summary-note">
            <Sparkles size={17} />
            <span>The channel is operating<br /><strong>normally</strong></span>
          </div>
        </div>

        {/* TAB 1: INBOX & TRIAGE */}
        {activeTab === 'inbox' && (
          <>
            <div className="desk-toolbar">
              <div className="search-box">
                <Search size={17} />
                <input
                  placeholder="Search by ID or keyword"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="filter-shell">
                <Filter size={15} />
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="All statuses">All statuses</option>
                  <option value="Unread">Unread</option>
                  <option value="In review">In review</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Archived">Archived</option>
                </select>
                <ChevronDown size={14} />
              </div>
              <button className="filter-button">
                <SlidersHorizontal size={16} /> Filters <span>2</span>
              </button>
            </div>

            <div className="desk-content">
              {/* LIST OF REPORTS */}
              <div className="report-list">
                <div className="list-head">
                  <span>{reports.length} tips</span>
                  <button>Most recent <ChevronDown size={14} /></button>
                </div>
                {reports.map((report: ReportItem) => (
                  <button
                    key={report.id}
                    className={`report-row ${selectedReport?.id === report.id ? 'selected' : ''}`}
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className={`report-initials initials-${report.category === 'Corruption' ? 'red' : 'blue'}`}>
                      {report.initials}
                    </div>
                    <div className="report-row-main">
                      <div>
                        <strong>{report.title}</strong>
                        <span className="report-id">{report.id}</span>
                      </div>
                      <div>
                        <span>{report.category}</span>
                        <span>·</span>
                        <span>{report.date}</span>
                      </div>
                    </div>
                    <div className="report-row-side">
                      <Pill tone={report.status}>{STATUS_LABELS[report.status] ?? report.status}</Pill>
                      <span className={`priority priority-${report.priority.toLowerCase()}`}>
                        <span />{report.priority}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* REPORT DETAIL & TRIAGE ACTIONS */}
              {selectedReport && (
                <div className="report-detail">
                  <div className="detail-top">
                    <span className="detail-id">{selectedReport.id}</span>
                    <button><MoreHorizontal size={18} /></button>
                  </div>
                  <h2>{selectedReport.title}</h2>
                  <div className="detail-meta">
                    <span><Clock3 size={14} /> {selectedReport.date}</span>
                    <span><FileText size={14} /> {selectedReport.category}</span>
                  </div>
                  <div className="detail-divider" />

                  {/* DECRYPTION STATUS */}
                  {selectedReport.decrypted ? (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-700/50 rounded mb-4">
                      <div className="text-xs uppercase font-bold text-emerald-400 mb-2 flex items-center gap-1">
                        <ShieldCheck size={14} /> Decrypted Content (Libsodium X25519)
                      </div>
                      <p className="text-sm text-gray-200 leading-relaxed">{selectedReport.text}</p>
                      
                      {selectedReport.attachment && (
                        <div className="mt-3 pt-3 border-t border-emerald-800/40 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-emerald-300">
                            <Paperclip size={14} />
                            <span><strong>Attached File:</strong> {selectedReport.attachment.name}</span>
                          </div>
                          {selectedReport.attachment.bytes && (
                            <button
                              type="button"
                              className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-medium"
                              onClick={() => {
                                const blob = new Blob([selectedReport.attachment!.bytes!], { type: selectedReport.attachment?.mimeType || 'application/octet-stream' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = selectedReport.attachment!.name
                                a.click()
                                URL.revokeObjectURL(url)
                              }}
                            >
                              <Download size={12} /> Download attachment
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-4">
                      <p className="sealed-message">
                        <LockKeyhole size={16} /> Protected content — open the tip to begin editorial review.
                      </p>
                      <button
                        className="primary-button small-button w-full mt-2"
                        disabled={busy}
                        onClick={onDecrypt}
                      >
                        <Key size={14} /> Decrypt with Newsroom Key
                      </button>
                    </div>
                  )}

                  {/* ON-CHAIN ARKIV PROOF & VERIFICATION CARD */}
                  <div className="p-3 bg-[#081412] border border-[#1d3d34] rounded mb-4 text-xs font-mono">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-300 flex items-center gap-1">
                        <ShieldCheck size={13} className="text-amber-400" /> Arkiv On-Chain Proof
                      </span>
                      <span className="text-emerald-400 font-sans text-[11px] font-semibold">Immutable & Block-Expiring</span>
                    </div>
                    <div className="text-gray-400 truncate">
                      <strong className="text-gray-300">Arkiv Key:</strong> {selectedReport.receiptKey ?? '0x...'}
                    </div>
                    <div className="text-gray-400 truncate mt-1">
                      <strong className="text-gray-300">Content Hash:</strong> {selectedReport.contentHash ?? '0x...'}
                    </div>
                  </div>

                  {/* INTERNAL NOTES */}
                  <div className="detail-note">
                    <label>Internal note</label>
                    <textarea
                      placeholder="Add a note for your team..."
                      value={internalNoteText || selectedReport.internalNote || ''}
                      onChange={(e) => setInternalNoteText(e.target.value)}
                    />
                    <button
                      className="primary-button small-button"
                      disabled={busy}
                      onClick={() => onSaveNote(internalNoteText)}
                    >
                      Save note <Check size={15} />
                    </button>
                  </div>

                  {/* STATUS SELECTOR */}
                  <div className="status-control">
                    <label>Tip status</label>
                    <select
                      className="w-full bg-[#10211d] border border-[#27483f] text-[#f2f7f5] p-3 rounded text-sm"
                      value={selectedReport.status}
                      onChange={(e) => onUpdateStatus(e.target.value as any)}
                    >
                      <option value="unread">Unread</option>
                      <option value="in_review">In review</option>
                      <option value="investigating">Investigating</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  {/* OFFICIAL REPLY COMPOSER */}
                  <div className="reply-box">
                    <label className="text-xs font-bold text-gray-400 block mb-2">
                      <MessageSquareLock size={14} className="inline mr-1 text-emerald-400" />
                      Send Sealed Reply to Source (Arkiv Mailbox)
                    </label>
                    <textarea
                      className="w-full bg-[#0f1e1b] border border-[#27483f] text-[#f2f7f5] p-3 rounded text-sm"
                      placeholder="Write an official message. It will be sealed exclusively for the source's receipt..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <button
                      className="outline-button small-button mt-2"
                      disabled={busy || !replyText.trim()}
                      onClick={async () => {
                        await onReply(replyText)
                        setReplyText('')
                      }}
                    >
                      Dispatch Sealed Reply <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: TEAM (ADMIN ONLY) */}
        {activeTab === 'team' && isOwner && (
          <div className="panel-card">
            <h3><Users size={18} /> Delegated Editorial Team (ENSv2 Subnames)</h3>
            <p>
              Grant reporters cryptographic authority by minting delegated subnames (e.g. <code>reporter.jornal-livre.eth</code>).
              Responders can sign status updates and official replies verified by the public.
            </p>

            <table className="team-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Subname</th>
                  <th>Ethereum Address</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {team.map((member: TeamMember, idx: number) => (
                  <tr key={idx}>
                    <td><strong>{member.label}</strong></td>
                    <td><code>{member.subname}</code></td>
                    <td className="font-mono text-xs text-emerald-400">{member.address}</td>
                    <td><Pill tone={member.active ? 'investigating' : 'archived'}>{member.active ? 'Active' : 'Revoked'}</Pill></td>
                    <td>
                      {member.active ? (
                        <div className="flex items-center gap-2">
                          <button
                            className="text-xs text-amber-400 hover:underline font-medium"
                            disabled={busy}
                            onClick={() => onRenewJournalist(member.label, 90)}
                            title="Renew subname for 90 days on ENSv2 Sepolia"
                          >
                            Renew (+90d)
                          </button>
                          <span className="text-gray-600">·</span>
                          <button
                            className="text-xs text-rose-400 hover:underline"
                            disabled={busy}
                            onClick={() => onRevokeJournalist(member.label)}
                            title="Revoke subname on ENSv2 Sepolia"
                          >
                            Revoke
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Revoked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="panel-grid mt-6">
              {/* FORM: ADD JOURNALIST */}
              <div className="p-4 bg-[#0f1e1b] border border-[#233e36] rounded">
                <h4 className="font-bold text-sm text-emerald-400 mb-3">+ Mint Delegated Subname on Sepolia</h4>
                <div className="form-group">
                  <label>Reporter Label</label>
                  <input placeholder="e.g. maria" value={newJournalistLabel} onChange={(e) => setNewJournalistLabel(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Reporter Ethereum Address</label>
                  <input placeholder="0x..." value={newJournalistAddr} onChange={(e) => setNewJournalistAddr(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Reporter Reader Public Key (Base64Url)</label>
                  <input placeholder="Key provided by journalist..." value={newJournalistReaderKey} onChange={(e) => setNewJournalistReaderKey(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Subname Validity (Days)</label>
                  <input
                    type="number"
                    value={newJournalistDays}
                    onChange={(e) => setNewJournalistDays(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <button
                  className="primary-button small-button"
                  disabled={busy || !newJournalistLabel || !newJournalistAddr}
                  onClick={() => onAddJournalist({ label: newJournalistLabel, address: newJournalistAddr, readerPublicKey: newJournalistReaderKey, validForDays: newJournalistDays })}
                >
                  Mint Subname on ENSv2
                </button>
              </div>

              {/* FORM: SHARE ENCRYPTED KEYRING */}
              <div className="p-4 bg-[#0f1e1b] border border-[#233e36] rounded">
                <h4 className="font-bold text-sm text-amber-400 mb-3"><LockKeyhole size={14} className="inline mr-1" /> Share Keyring with Reporter</h4>
                <p className="text-xs text-gray-400 mb-3">
                  Encrypt the newsroom private decryption keys for the journalist's reader public key so they can triage incoming tips.
                </p>
                <div className="form-group">
                  <label>Journalist Reader Public Key</label>
                  <input placeholder="Paste public key..." value={shareReaderKeyInput} onChange={(e) => setShareReaderKeyInput(e.target.value)} />
                </div>
                <button
                  className="outline-button small-button"
                  disabled={busy || !shareReaderKeyInput}
                  onClick={() => onShareKeyring(shareReaderKeyInput)}
                >
                  Generate Encrypted Blob
                </button>
                {sharedKeyringBlob && (
                  <div className="mt-3">
                    <div className="text-xs font-bold text-emerald-400">Encrypted Keyring Ciphertext:</div>
                    <div className="code-block">{sharedKeyringBlob}</div>
                    <button className="text-xs text-amber-400 hover:underline" onClick={() => copyToClipboard(sharedKeyringBlob)}>
                      <Copy size={12} className="inline mr-1" /> Copy Blob
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: KEYS & POLICY (ADMIN ONLY) */}
        {activeTab === 'keys' && isOwner && (
          <div className="panel-card">
            <h3><Key size={18} /> Newsroom Cryptographic Keyring & Policy</h3>
            <p>
              Your newsroom's public keys are anchored in ENS text records (<code>denuncia.pubkey</code>).
              Private keys are kept strictly in this browser's memory and can be exported as an encrypted backup.
            </p>

            <div className="panel-grid mt-4">
              {/* BACKUP EXPORT */}
              <div className="p-4 bg-[#0f1e1b] border border-[#233e36] rounded">
                <h4 className="font-bold text-sm text-emerald-400 mb-2">Export Encrypted Backup</h4>
                <p className="text-xs text-gray-400 mb-3">Password-lock all encryption keys into an encrypted JSON backup file.</p>
                <div className="form-group">
                  <label>Backup Encryption Password</label>
                  <input type="password" placeholder="Min. 6 characters" value={backupPassword} onChange={(e) => setBackupPassword(e.target.value)} />
                </div>
                <button className="primary-button small-button" disabled={busy || backupPassword.length < 6} onClick={() => onExportBackup(backupPassword)}>
                  Generate Backup
                </button>
                {backupText && (
                  <div className="mt-3">
                    <div className="code-block">{backupText.slice(0, 80)}...</div>
                    <button className="text-xs text-amber-400 hover:underline" onClick={() => copyToClipboard(backupText)}>
                      <Copy size={12} className="inline mr-1" /> Copy Backup
                    </button>
                  </div>
                )}
              </div>

              {/* BACKUP RESTORE */}
              <div className="p-4 bg-[#0f1e1b] border border-[#233e36] rounded">
                <h4 className="font-bold text-sm text-amber-400 mb-2">Restore Backup</h4>
                <p className="text-xs text-gray-400 mb-3">Unlock a previous backup with your password to restore keys on this device.</p>
                <div className="form-group">
                  <label>Backup Ciphertext</label>
                  <input placeholder="Paste backup JSON..." value={importBackupBlob} onChange={(e) => setImportBackupBlob(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" placeholder="Password..." value={importBackupPassword} onChange={(e) => setImportBackupPassword(e.target.value)} />
                </div>
                <button className="outline-button small-button" disabled={busy || !importBackupBlob || !importBackupPassword} onClick={() => onImportBackup(importBackupBlob, importBackupPassword)}>
                  Unlock & Restore Keyring
                </button>
              </div>
            </div>

            {/* KEY ROTATION */}
            <div className="mt-6 p-4 bg-[#0f1e1b] border border-amber-800/40 rounded flex items-center justify-between">
              <div>
                <strong className="text-sm text-amber-300 block">Rotate Encryption Keypair (On-Chain ENS)</strong>
                <span className="text-xs text-gray-400">Current active key version: v{keyVersion}. Rotates key on Ethereum Sepolia.</span>
              </div>
              <button className="outline-button small-button" disabled={busy} onClick={onRotateKey}>
                <RefreshCw size={14} /> Rotate to Version {keyVersion + 1}
              </button>
            </div>

            {/* EDITORIAL POLICY ON-CHAIN */}
            <div className="mt-6 p-4 bg-[#0f1e1b] border border-[#233e36] rounded">
              <h4 className="font-bold text-sm text-emerald-400 mb-2">ENSv2 Editorial Policy (On-Chain Text Record)</h4>
              <p className="text-xs text-gray-400 mb-3">
                Configure acceptable categories, maximum payload limit, and attachment permissions published on <code>blindreport.policy</code>.
              </p>
              <div className="form-group mb-3">
                <label>Accepted Investigation Categories (Comma separated)</label>
                <input
                  value={policyCategories}
                  onChange={(e) => setPolicyCategories(e.target.value)}
                  placeholder="e.g. investigacao, corrupcao, direitos-humanos"
                />
              </div>
              <div className="flex gap-4 items-center mb-3">
                <div className="form-group flex-1">
                  <label>Max Body Limit (Bytes)</label>
                  <input
                    type="number"
                    value={policyMaxBytes}
                    onChange={(e) => setPolicyMaxBytes(Number(e.target.value))}
                  />
                </div>
                <div className="form-group flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="policyAttachments"
                    checked={policyAttachments}
                    onChange={(e) => setPolicyAttachments(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-gray-900 border-gray-700"
                  />
                  <label htmlFor="policyAttachments" className="cursor-pointer text-xs">Allow Document Attachments</label>
                </div>
              </div>
              <button
                className="primary-button small-button"
                disabled={busy || !policyCategories.trim()}
                onClick={() => {
                  const cats = policyCategories.split(',').map((c) => c.trim()).filter(Boolean)
                  onUpdatePolicy({ categories: cats, maxBytes: policyMaxBytes, attachments: policyAttachments })
                }}
              >
                Publish Policy to ENSv2 (Sepolia)
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: MY READER KEY (JOURNALIST ONLY) */}
        {activeTab === 'reader_key' && isJournalist && (
          <div className="panel-card">
            <h3><Key size={18} /> Reporter Reader Key & Shared Keyring</h3>
            <p>
              As an authorized reporter, generate your device-specific reader keypair.
              Deliver the public key to your newsroom owner to receive an encrypted copy of the newsroom triage keys.
            </p>

            <div className="panel-grid mt-4">
              <div className="p-4 bg-[#0f1e1b] border border-[#233e36] rounded">
                <h4 className="font-bold text-sm text-emerald-400 mb-2">1. Generate Reader Keypair</h4>
                <p className="text-xs text-gray-400 mb-3">Generates an ephemeral X25519 keypair in this browser session.</p>
                <button className="primary-button small-button" onClick={onNewReaderKey}>
                  Generate New Reader Key
                </button>
                {readerKey && (
                  <div className="mt-3">
                    <div className="text-xs font-bold text-amber-400">Your Reader Public Key (Send to Admin):</div>
                    <div className="code-block">{readerKey.publicKey}</div>
                    <button className="text-xs text-amber-400 hover:underline" onClick={() => copyToClipboard(readerKey.publicKey)}>
                      <Copy size={12} className="inline mr-1" /> Copy Public Key
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#0f1e1b] border border-[#233e36] rounded">
                <h4 className="font-bold text-sm text-amber-400 mb-2">2. Import Shared Keyring Blob</h4>
                <p className="text-xs text-gray-400 mb-3">Paste the ciphertext blob received from the newsroom owner.</p>
                <div className="form-group">
                  <label>Encrypted Blob</label>
                  <textarea
                    placeholder="Paste encrypted keyring blob..."
                    value={importKeyringBlobInput}
                    onChange={(e) => setImportKeyringBlobInput(e.target.value)}
                  />
                </div>
                <button className="outline-button small-button" disabled={!importKeyringBlobInput} onClick={() => onImportSharedKeyring(importKeyringBlobInput)}>
                  Decrypt & Unlock Newsroom Keyring
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: RETENTION (ARKIV DATA LIFECYCLE) */}
        {activeTab === 'retention' && (
          <div className="panel-card">
            <h3><Clock3 size={18} /> Arkiv Network — Data Retention & Lifecycle</h3>
            <p>
              Arkiv entities feature deterministic block expiration. Active investigations can be renewed directly through this dashboard.
            </p>

            <table className="team-table mt-4">
              <thead>
                <tr>
                  <th>Entity Key</th>
                  <th>Investigation Title</th>
                  <th>Category</th>
                  <th>Blocks Left</th>
                  <th>Days Remaining</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {expiring.map((sub: ExpiringSubmission, idx: number) => (
                  <tr key={idx}>
                    <td className="font-mono text-xs text-gray-400">{sub.key}</td>
                    <td><strong>{sub.title}</strong></td>
                    <td><Pill>{sub.category}</Pill></td>
                    <td>{sub.blocksLeft} blocks</td>
                    <td className={sub.daysLeft < 10 ? 'text-amber-400 font-bold' : ''}>{sub.daysLeft} days</td>
                    <td>
                      <button className="primary-button small-button text-xs py-1" disabled={busy} onClick={() => onRenewSubmission(sub.key, 90)}>
                        Extend +90 Days
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: ONBOARDING / REGISTER NEWSROOM */}
        {activeTab === 'onboarding' && (
          <div className="panel-card">
            <h3><Plus size={18} /> Register a New Newsroom on ENSv2 (Sepolia)</h3>
            <p>
              Deploy a decentralized newsroom PKI on Ethereum Sepolia. Mints the <code>.eth</code> name, establishes Libsodium text records, and configures the journalist subregistry.
            </p>
            <div className="max-w-md mt-4">
              <div className="form-group">
                <label>Newsroom ENS Domain Label</label>
                <div className="flex items-center gap-2">
                  <input value={registerLabel} onChange={(e) => setRegisterLabel(e.target.value)} placeholder="e.g. jornal-livre" />
                  <span className="text-gray-400 font-bold">.eth</span>
                </div>
              </div>
              <button
                className="primary-button small-button"
                disabled={busy || !registerLabel}
                onClick={() => onRegisterNewsroom({ label: registerLabel, categories: ['Corruption', 'Public policy', 'Human rights', 'Environment'], maxBytes: 200000, attachments: true })}
              >
                {busy ? 'Executing On-Chain Deployment...' : 'Execute Sepolia Deployment (Commit & Reveal)'}
              </button>
            </div>

            {adminStep && (
              <div className="max-w-md mt-6 p-4 bg-[#0a1815] border border-emerald-500/30 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <strong className="text-sm text-emerald-400">On-Chain ENSv2 Deployment Progress:</strong>
                </div>
                <div className="text-xs text-gray-300 font-mono">
                  {adminStep.step === 'resolver' && '1/6 Deploying PermissionedResolver proxy via VerifiableFactory...'}
                  {adminStep.step === 'commit' && '2/6 Submitting ENS commitment on ETHRegistrar (Commit-Reveal)...'}
                  {adminStep.step === 'commit_wait' && `3/6 Awaiting Sepolia block maturation (~${adminStep.seconds ?? 60}s to prevent front-running)...`}
                  {adminStep.step === 'register' && '4/6 Minting MockUSDC & Registering .eth name on Sepolia registrar...'}
                  {adminStep.step === 'records' && '5/6 Publishing Libsodium Curve25519 public key and policy text records...'}
                  {adminStep.step === 'registry' && '6/6 Deploying & authorizing SubRegistry for journalists...'}
                  {adminStep.step === 'done' && '✔ Newsroom registration completed successfully!'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
