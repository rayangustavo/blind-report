'use client'

import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  Filter,
  Fingerprint,
  Inbox,
  LockKeyhole,
  Menu,
  MessageSquareLock,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'

const reports = [
  { id: 'BR-8421', title: 'Advertising contracts and conflict of interest', category: 'Corruption', status: 'investigating', date: 'Today, 09:42', priority: 'High', initials: 'CO' },
  { id: 'BR-8418', title: 'Public works stalled for 14 months', category: 'Public policy', status: 'in_review', date: 'Yesterday, 18:16', priority: 'Medium', initials: 'PP' },
  { id: 'BR-8412', title: 'Harassment and retaliation in state agency', category: 'Human rights', status: 'unread', date: 'Yesterday, 14:03', priority: 'High', initials: 'DH' },
  { id: 'BR-8407', title: 'Tender with newly formed company', category: 'Corruption', status: 'archived', date: 'Jun 12, 11:28', priority: 'Low', initials: 'CO' },
]

const statusLabels: Record<string, string> = { unread: 'Unread', in_review: 'In review', investigating: 'Investigating', archived: 'Archived' }

function Logo() {
  return <div className="brand"><span className="brand-mark"><span /></span><span>blind<span className="brand-accent">report</span></span></div>
}

function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

function App() {
  const [view, setView] = useState<'home' | 'report' | 'desk'>('home')
  const [reportStep, setReportStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedNewsroom, setSelectedNewsroom] = useState('Public Ledger')
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('All statuses')
  const [selectedReport, setSelectedReport] = useState(reports[0])
  const filteredReports = useMemo(() => filter === 'All statuses' ? reports : reports.filter((report) => statusLabels[report.status] === filter), [filter])

  const startReport = () => { setView('report'); setReportStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <main className="app-shell">
      <header className="site-header">
        <button className="logo-button" onClick={() => setView('home')} aria-label="Back to home"><Logo /></button>
        <nav className="top-nav" aria-label="Main navigation">
          <button onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}>How it works</button>
          <button onClick={() => document.getElementById('seguranca')?.scrollIntoView({ behavior: 'smooth' })}>Security</button>
          <button onClick={() => setView('desk')} className="nav-editorial">Newsroom desk <ArrowRight size={14} /></button>
        </nav>
        <button className="mobile-menu" aria-label="Abrir menu"><Menu size={20} /></button>
      </header>

      {view === 'home' && <>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> A SECURE CHANNEL FOR JOURNALISM</div>
            <h1>What needs to be<br /><em>revealed</em> deserves<br />to be protected.</h1>
            <p className="hero-subtitle">Share information in the public interest with trusted newsrooms, protected by technical anonymity at every step.</p>
            <div className="hero-actions"><button className="primary-button" onClick={startReport}>Send an anonymous tip <ArrowRight size={17} /></button><button className="text-button" onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}>See how it works <ArrowRight size={15} /></button></div>
            <div className="hero-note"><LockKeyhole size={14} /> Your identity is never shared with the newsroom.</div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <img className="ethglobal-art" src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20de%20tela%20de%202026-11-06%2011-47-48.png-ZVK33CZ0wtxxPyPUuIZnEgX7eJ8uFH.jpeg" alt="Colorful ETHGlobal Mumbai illustration" />
            <div className="visual-art-overlay" />
            <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="visual-glow" />
            <div className="visual-card visual-card-main"><div className="card-topline"><span className="live-dot" /> canal protegido <span className="card-lock"><LockKeyhole size={13} /></span></div><div className="signal-lines"><span /><span /><span /><span /></div><div className="card-footer"><span>BLIND REPORT</span><span>END-TO-END</span></div></div>
            <div className="floating-card floating-card-top"><Fingerprint size={18} /><div><strong>Identity protected</strong><small>anti-abuse verification active</small></div><BadgeCheck size={18} className="check-icon" /></div>
            <div className="floating-card floating-card-bottom"><div className="mini-icon"><ShieldCheck size={17} /></div><div><strong>Sealed content</strong><small>only the newsroom can access it</small></div></div>
          </div>
        </section>

        <section className="trust-strip"><div><span className="trust-number">01</span><span>Anonymous by default</span></div><div><span className="trust-number">02</span><span>Verified without exposure</span></div><div><span className="trust-number">03</span><span>Secure information custody</span></div><div className="trust-source"><span className="source-mark">◈</span> Built for journalism</div></section>

        <section className="how-section section-wrap" id="como-funciona"><div className="section-heading"><div><div className="eyebrow">HOW IT WORKS</div><h2>From your information<br />to <em>investigation.</em></h2></div><p>No account. No unnecessary trails.<br />Only what matters for great reporting.</p></div><div className="steps-grid"><article><span className="step-index">01</span><div className="step-icon"><MessageSquareLock size={22} /></div><h3>Tell us what you know</h3><p>Choose a newsroom, select a topic, and describe the facts with as much context as possible.</p></article><article><span className="step-index">02</span><div className="step-icon"><Fingerprint size={22} /></div><h3>Prove you are human</h3><p>A quick check prevents spam and abuse. It confirms you are human without revealing who you are.</p></article><article><span className="step-index">03</span><div className="step-icon"><ShieldCheck size={22} /></div><h3>The newsroom investigates</h3><p>Your report reaches the editorial team sealed. The information is validated before anything is published.</p></article></div></section>

        <section className="security-section" id="seguranca"><div className="section-wrap security-grid"><div><div className="eyebrow">SECURITY & PRIVACY</div><h2>Trust is not a<br /><em>promise.</em> It is practice.</h2><p>Every part of Blind Report is designed to protect sources and preserve the integrity of information.</p><button className="outline-button" onClick={() => setView('report')}>View newsroom policy <ArrowRight size={16} /></button></div><div className="security-list"><div><LockKeyhole size={19} /><div><strong>Sem IP, sem perfil</strong><span>Não exibimos ou armazenamos seu endereço IP na experiência da fonte.</span></div></div><div><Fingerprint size={19} /><div><strong>Identidade verificada, não revelada</strong><span>O World ID ajuda a manter o canal livre de abuso sem vincular você à denúncia.</span></div></div><div><Inbox size={19} /><div><strong>Conteúdo sob custódia</strong><span>Apenas a redação escolhida pode abrir e conduzir a apuração.</span></div></div></div></div></section>
        <section className="tracks-section section-wrap" aria-labelledby="tracks-title"><div className="section-heading"><div><div className="eyebrow">ETHGLOBAL MUMBAI · TRACKS</div><h2 id="tracks-title">Built for the<br /><em>ecosystem.</em></h2></div><p>We are building Blind Report for the protocols and communities shaping a more open web.</p></div><div className="tracks-supported"><span>SUPPORTED BY</span><div className="track-logos"><div className="track-logo-card"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/eth-tnZnEcICxcuorfaOybV4Wb5cTxT8E7.png" alt="Ethereum logo" /><span>Ethereum Foundation</span></div><div className="track-logo-card"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ens-9twCNaCZDON6PWopdSdPLkdMlpPbgA.png" alt="ENS logo" /><span>ENS</span></div><div className="track-logo-card arkiv-card"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/default.png-4LOhWotd16lYiBN0pb1fiqGbLVqJBf.jpeg" alt="Arkiv logo" /><span>Arkiv</span></div><div className="track-logo-card"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/word-TlRKtsCJdHDiMp4H8ZDY4qs7mPyLsk.png" alt="World logo" /><span>World</span></div></div></div><div className="tracks-image-wrap"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20de%20tela%20de%202026-11-06%2011-51-57.png-3mowyboaD0gqMd8f83hDa9Lno0ZLxc.png" alt="ETHGlobal Mumbai tracks and prizes" /></div></section><section className="final-cta section-wrap"><div><div className="eyebrow">HAVE SOMETHING TO SAY?</div><h2>A good story<br />can start <em>here.</em></h2></div><button className="primary-button" onClick={startReport}>Send an anonymous tip <ArrowRight size={17} /></button></section>
      </>}

      {view === 'report' && <ReportFlow step={reportStep} setStep={setReportStep} category={selectedCategory} setCategory={setSelectedCategory} newsroom={selectedNewsroom} setNewsroom={setSelectedNewsroom} message={message} setMessage={setMessage} onBack={() => setView('home')} />}
      {view === 'desk' && <EditorialDesk filter={filter} setFilter={setFilter} reports={filteredReports} selectedReport={selectedReport} setSelectedReport={setSelectedReport} onBack={() => setView('home')} />}
      <footer className="site-footer"><Logo /><span>Information protected. Journalism strengthened.</span><span>© 2026 Blind Report</span></footer>
    </main>
  )
}

function ReportFlow({ step, setStep, category, setCategory, newsroom, setNewsroom, message, setMessage, onBack }: any) {
  return <section className="flow-page"><div className="flow-header"><button className="back-button" onClick={onBack}><X size={17} /> Close</button><div className="flow-progress"><span className={step >= 1 ? 'active' : ''} /><span className={step >= 2 ? 'active' : ''} /><span className={step >= 3 ? 'active' : ''} /></div><span className="flow-step">{step < 3 ? `0${step} / 03` : 'ENVIADO'}</span></div><div className="flow-content">{step === 1 && <><div className="eyebrow">NEW TIP</div><h1>Comece pela<br /><em>informação.</em></h1><p className="flow-intro">You are in a secure channel. Não precisamos saber quem você é para ouvir o que você tem a dizer.</p><label>Para qual redação deseja enviar?</label><div className="select-shell"><select value={newsroom} onChange={(e) => setNewsroom(e.target.value)}><option>Public Ledger</option><option>Jornal da Cidade</option><option>Agência Horizonte</option></select><ChevronDown size={16} /></div><button className="primary-button flow-next" onClick={() => setStep(2)}>Continuar <ArrowRight size={17} /></button><div className="flow-reassurance"><LockKeyhole size={15} /> Seu envio será criptografado antes de sair deste dispositivo.</div></>}{step === 2 && <><div className="eyebrow">SOBRE A DENÚNCIA</div><h1>O que você<br /><em>descobriu?</em></h1><p className="flow-intro">Quanto mais contexto você compartilhar, melhor a redação poderá avaliar. Não inclua dados que possam identificar você.</p><label>Tip category</label><div className="category-grid">{['Corruption', 'Public policy', 'Human rights', 'Meio ambiente'].map((item) => <button key={item} className={category === item ? 'category active' : 'category'} onClick={() => setCategory(item)}>{item}{category === item && <Check size={15} />}</button>)}</div><label htmlFor="report-message">Descreva os fatos</label><textarea id="report-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Conte o que aconteceu, quando e onde. Evite incluir informações que revelem sua identidade." /><div className="upload-row"><button className="upload-button"><Paperclip size={16} /> Attach file</button><span>PDF, JPG ou PNG · até 10 MB</span></div><div className="flow-actions"><button className="ghost-button" onClick={() => setStep(1)}>Voltar</button><button className="primary-button" disabled={!category || message.length < 10} onClick={() => setStep(3)}>Verificar e enviar <ArrowRight size={17} /></button></div><div className="flow-reassurance"><LockKeyhole size={15} /> {message.length}/2.000 caracteres · Política da {newsroom}</div></>}{step === 3 && <div className="success-state"><div className="success-icon"><Check size={28} /></div><div className="eyebrow">DENÚNCIA RECEBIDA</div><h1>Sua informação<br />está <em>protegida.</em></h1><p className="flow-intro">A denúncia foi criptografada e enviada para a <strong>{newsroom}</strong>. A redação irá analisar o conteúdo com cuidado.</p><div className="receipt-card"><span>IDENTIFICADOR DA DENÚNCIA</span><strong>BR-{Math.floor(1000 + Math.random() * 8999)}</strong><small>Guarde este código para consultar o andamento sem revelar sua identidade.</small></div><button className="primary-button" onClick={onBack}>Voltar ao início <ArrowRight size={17} /></button></div>}</div></section>
}

function EditorialDesk({ filter, setFilter, reports, selectedReport, setSelectedReport, onBack }: any) {
  return <section className="desk-page"><aside className="desk-sidebar"><div className="desk-brand"><Logo /><span className="desk-label">NEWSROOM</span></div><nav><button className="active"><Inbox size={17} /> Inbox <b>12</b></button><button><BarChart3 size={17} /> Overview</button><button><MessageSquareLock size={17} /> Anonymous mailbox <b className="new-badge">2</b></button></nav><div className="sidebar-bottom"><div className="desk-user"><span>FP</span><div><strong>Public Ledger</strong><small>Redação conectada</small></div><MoreHorizontal size={16} /></div><button className="back-desk" onClick={onBack}>Exit newsroom</button></div></aside><div className="desk-main"><header className="desk-top"><div><div className="eyebrow">FOLHA PÚBLICA / CAIXA DE ENTRADA</div><h1>Received tips</h1></div><div className="desk-actions"><button className="icon-button"><CircleHelp size={18} /></button><button className="user-avatar">MR</button></div></header><div className="desk-summary"><div><span className="summary-label">NÃO LIDAS</span><strong>03</strong><span className="summary-trend">+2 hoje</span></div><div><span className="summary-label">EM INVESTIGAÇÃO</span><strong>08</strong><span className="summary-trend neutral-trend">estáveis</span></div><div><span className="summary-label">TEMPO MÉDIO DE RESPOSTA</span><strong>2,4 <small>dias</small></strong><span className="summary-trend">−12%</span></div><div className="summary-note"><Sparkles size={17} /><span>O canal está operando<br /><strong>normalmente</strong></span></div></div><div className="desk-toolbar"><div className="search-box"><Search size={17} /><input placeholder="Search by ID or keyword" /></div><div className="filter-shell"><Filter size={15} /><select value={filter} onChange={(e) => setFilter(e.target.value)}><option>All statuses</option><option>Unread</option><option>In review</option><option>Investigating</option><option>Archived</option></select><ChevronDown size={14} /></div><button className="filter-button"><SlidersHorizontal size={16} /> Filters <span>2</span></button></div><div className="desk-content"><div className="report-list"><div className="list-head"><span>{reports.length} denúncias</span><button>Most recent <ChevronDown size={14} /></button></div>{reports.map((report: any) => <button key={report.id} className={`report-row ${selectedReport.id === report.id ? 'selected' : ''}`} onClick={() => setSelectedReport(report)}><div className={`report-initials initials-${report.category === 'Corruption' ? 'red' : 'blue'}`}>{report.initials}</div><div className="report-row-main"><div><strong>{report.title}</strong><span className="report-id">{report.id}</span></div><div><span>{report.category}</span><span>·</span><span>{report.date}</span></div></div><div className="report-row-side"><Pill tone={report.status}>{statusLabels[report.status]}</Pill><span className={`priority priority-${report.priority.toLowerCase()}`}><span />{report.priority}</span></div></button>)}</div><div className="report-detail"><div className="detail-top"><span className="detail-id">{selectedReport.id}</span><button><MoreHorizontal size={18} /></button></div><h2>{selectedReport.title}</h2><div className="detail-meta"><span><Clock3 size={14} /> {selectedReport.date}</span><span><FileText size={14} /> {selectedReport.category}</span></div><div className="detail-divider" /><p className="sealed-message"><LockKeyhole size={16} /> Conteúdo protegido — abra a denúncia para iniciar a análise editorial.</p><div className="detail-note"><label>Nota interna</label><textarea placeholder="Add a note for your team..." /><button className="primary-button small-button">Save note <Check size={15} /></button></div><div className="status-control"><label>Status da denúncia</label><button><span className={`status-dot status-${selectedReport.status}`} />{statusLabels[selectedReport.status]} <ChevronDown size={14} /></button></div></div></div></div></section>
}

export default App
