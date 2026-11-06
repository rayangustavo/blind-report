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
  { id: 'BR-8421', title: 'Contratos de publicidade e conflito de interesse', category: 'Corrupção', status: 'investigating', date: 'Hoje, 09:42', priority: 'Alta', initials: 'CO' },
  { id: 'BR-8418', title: 'Obra pública parada há 14 meses', category: 'Políticas públicas', status: 'in_review', date: 'Ontem, 18:16', priority: 'Média', initials: 'PP' },
  { id: 'BR-8412', title: 'Assédio e retaliação em órgão estadual', category: 'Direitos humanos', status: 'unread', date: 'Ontem, 14:03', priority: 'Alta', initials: 'DH' },
  { id: 'BR-8407', title: 'Licitação com empresa recém-criada', category: 'Corrupção', status: 'archived', date: '12 jun, 11:28', priority: 'Baixa', initials: 'CO' },
]

const statusLabels: Record<string, string> = { unread: 'Não lida', in_review: 'Em análise', investigating: 'Investigando', archived: 'Arquivada' }

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
  const [selectedNewsroom, setSelectedNewsroom] = useState('Folha Pública')
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('Todos os status')
  const [selectedReport, setSelectedReport] = useState(reports[0])
  const filteredReports = useMemo(() => filter === 'Todos os status' ? reports : reports.filter((report) => statusLabels[report.status] === filter), [filter])

  const startReport = () => { setView('report'); setReportStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <main className="app-shell">
      <header className="site-header">
        <button className="logo-button" onClick={() => setView('home')} aria-label="Voltar para início"><Logo /></button>
        <nav className="top-nav" aria-label="Navegação principal">
          <button onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}>Como funciona</button>
          <button onClick={() => document.getElementById('seguranca')?.scrollIntoView({ behavior: 'smooth' })}>Segurança</button>
          <button onClick={() => setView('desk')} className="nav-editorial">Área da redação <ArrowRight size={14} /></button>
        </nav>
        <button className="mobile-menu" aria-label="Abrir menu"><Menu size={20} /></button>
      </header>

      {view === 'home' && <>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> CANAL SEGURO PARA A IMPRENSA</div>
            <h1>O que precisa ser<br /><em>revelado</em> merece<br />ser protegido.</h1>
            <p className="hero-subtitle">Envie informações de interesse público para redações confiáveis, com anonimato técnico e segurança em cada etapa.</p>
            <div className="hero-actions"><button className="primary-button" onClick={startReport}>Enviar denúncia anônima <ArrowRight size={17} /></button><button className="text-button" onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}>Entenda como funciona <ArrowRight size={15} /></button></div>
            <div className="hero-note"><LockKeyhole size={14} /> Sua identidade não é compartilhada com a redação.</div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="visual-glow" />
            <div className="visual-card visual-card-main"><div className="card-topline"><span className="live-dot" /> canal protegido <span className="card-lock"><LockKeyhole size={13} /></span></div><div className="signal-lines"><span /><span /><span /><span /></div><div className="card-footer"><span>BLIND REPORT</span><span>END-TO-END</span></div></div>
            <div className="floating-card floating-card-top"><Fingerprint size={18} /><div><strong>Identidade protegida</strong><small>verificação anti-abuso ativa</small></div><BadgeCheck size={18} className="check-icon" /></div>
            <div className="floating-card floating-card-bottom"><div className="mini-icon"><ShieldCheck size={17} /></div><div><strong>Conteúdo selado</strong><small>apenas a redação acessa</small></div></div>
          </div>
        </section>

        <section className="trust-strip"><div><span className="trust-number">01</span><span>Anonimato por padrão</span></div><div><span className="trust-number">02</span><span>Verificação sem exposição</span></div><div><span className="trust-number">03</span><span>Custódia segura da informação</span></div><div className="trust-source"><span className="source-mark">◈</span> Feito para o jornalismo</div></section>

        <section className="how-section section-wrap" id="como-funciona"><div className="section-heading"><div><div className="eyebrow">COMO FUNCIONA</div><h2>Da sua informação<br />à <em>apuração.</em></h2></div><p>Sem cadastro. Sem rastros desnecessários.<br />Só o que importa para uma boa reportagem.</p></div><div className="steps-grid"><article><span className="step-index">01</span><div className="step-icon"><MessageSquareLock size={22} /></div><h3>Conte o que sabe</h3><p>Escolha uma redação, selecione o tema e descreva os fatos com o máximo de contexto possível.</p></article><article><span className="step-index">02</span><div className="step-icon"><Fingerprint size={22} /></div><h3>Prove que é humano</h3><p>Uma verificação rápida evita spam e abuso. Ela confirma sua humanidade, não revela quem você é.</p></article><article><span className="step-index">03</span><div className="step-icon"><ShieldCheck size={22} /></div><h3>A redação investiga</h3><p>Sua denúncia chega selada ao time editorial. A informação é validada antes de qualquer publicação.</p></article></div></section>

        <section className="security-section" id="seguranca"><div className="section-wrap security-grid"><div><div className="eyebrow">SEGURANÇA E PRIVACIDADE</div><h2>Confiança não é<br /><em>promessa.</em> É prática.</h2><p>Construímos cada parte do Blind Report para proteger a fonte e preservar a integridade da informação.</p><button className="outline-button" onClick={() => setView('report')}>Conheça a política da redação <ArrowRight size={16} /></button></div><div className="security-list"><div><LockKeyhole size={19} /><div><strong>Sem IP, sem perfil</strong><span>Não exibimos ou armazenamos seu endereço IP na experiência da fonte.</span></div></div><div><Fingerprint size={19} /><div><strong>Identidade verificada, não revelada</strong><span>O World ID ajuda a manter o canal livre de abuso sem vincular você à denúncia.</span></div></div><div><Inbox size={19} /><div><strong>Conteúdo sob custódia</strong><span>Apenas a redação escolhida pode abrir e conduzir a apuração.</span></div></div></div></div></section>
        <section className="final-cta section-wrap"><div><div className="eyebrow">TEM ALGO A DIZER?</div><h2>Uma boa história<br />pode começar <em>aqui.</em></h2></div><button className="primary-button" onClick={startReport}>Enviar denúncia anônima <ArrowRight size={17} /></button></section>
      </>}

      {view === 'report' && <ReportFlow step={reportStep} setStep={setReportStep} category={selectedCategory} setCategory={setSelectedCategory} newsroom={selectedNewsroom} setNewsroom={setSelectedNewsroom} message={message} setMessage={setMessage} onBack={() => setView('home')} />}
      {view === 'desk' && <EditorialDesk filter={filter} setFilter={setFilter} reports={filteredReports} selectedReport={selectedReport} setSelectedReport={setSelectedReport} onBack={() => setView('home')} />}
      <footer className="site-footer"><Logo /><span>Informação protegida. Jornalismo fortalecido.</span><span>© 2026 Blind Report</span></footer>
    </main>
  )
}

function ReportFlow({ step, setStep, category, setCategory, newsroom, setNewsroom, message, setMessage, onBack }: any) {
  return <section className="flow-page"><div className="flow-header"><button className="back-button" onClick={onBack}><X size={17} /> Fechar</button><div className="flow-progress"><span className={step >= 1 ? 'active' : ''} /><span className={step >= 2 ? 'active' : ''} /><span className={step >= 3 ? 'active' : ''} /></div><span className="flow-step">{step < 3 ? `0${step} / 03` : 'ENVIADO'}</span></div><div className="flow-content">{step === 1 && <><div className="eyebrow">NOVA DENÚNCIA</div><h1>Comece pela<br /><em>informação.</em></h1><p className="flow-intro">Você está em um canal seguro. Não precisamos saber quem você é para ouvir o que você tem a dizer.</p><label>Para qual redação deseja enviar?</label><div className="select-shell"><select value={newsroom} onChange={(e) => setNewsroom(e.target.value)}><option>Folha Pública</option><option>Jornal da Cidade</option><option>Agência Horizonte</option></select><ChevronDown size={16} /></div><button className="primary-button flow-next" onClick={() => setStep(2)}>Continuar <ArrowRight size={17} /></button><div className="flow-reassurance"><LockKeyhole size={15} /> Seu envio será criptografado antes de sair deste dispositivo.</div></>}{step === 2 && <><div className="eyebrow">SOBRE A DENÚNCIA</div><h1>O que você<br /><em>descobriu?</em></h1><p className="flow-intro">Quanto mais contexto você compartilhar, melhor a redação poderá avaliar. Não inclua dados que possam identificar você.</p><label>Categoria da denúncia</label><div className="category-grid">{['Corrupção', 'Políticas públicas', 'Direitos humanos', 'Meio ambiente'].map((item) => <button key={item} className={category === item ? 'category active' : 'category'} onClick={() => setCategory(item)}>{item}{category === item && <Check size={15} />}</button>)}</div><label htmlFor="report-message">Descreva os fatos</label><textarea id="report-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Conte o que aconteceu, quando e onde. Evite incluir informações que revelem sua identidade." /><div className="upload-row"><button className="upload-button"><Paperclip size={16} /> Anexar arquivo</button><span>PDF, JPG ou PNG · até 10 MB</span></div><div className="flow-actions"><button className="ghost-button" onClick={() => setStep(1)}>Voltar</button><button className="primary-button" disabled={!category || message.length < 10} onClick={() => setStep(3)}>Verificar e enviar <ArrowRight size={17} /></button></div><div className="flow-reassurance"><LockKeyhole size={15} /> {message.length}/2.000 caracteres · Política da {newsroom}</div></>}{step === 3 && <div className="success-state"><div className="success-icon"><Check size={28} /></div><div className="eyebrow">DENÚNCIA RECEBIDA</div><h1>Sua informação<br />está <em>protegida.</em></h1><p className="flow-intro">A denúncia foi criptografada e enviada para a <strong>{newsroom}</strong>. A redação irá analisar o conteúdo com cuidado.</p><div className="receipt-card"><span>IDENTIFICADOR DA DENÚNCIA</span><strong>BR-{Math.floor(1000 + Math.random() * 8999)}</strong><small>Guarde este código para consultar o andamento sem revelar sua identidade.</small></div><button className="primary-button" onClick={onBack}>Voltar ao início <ArrowRight size={17} /></button></div>}</div></section>
}

function EditorialDesk({ filter, setFilter, reports, selectedReport, setSelectedReport, onBack }: any) {
  return <section className="desk-page"><aside className="desk-sidebar"><div className="desk-brand"><Logo /><span className="desk-label">NEWSROOM</span></div><nav><button className="active"><Inbox size={17} /> Caixa de entrada <b>12</b></button><button><BarChart3 size={17} /> Visão geral</button><button><MessageSquareLock size={17} /> Mailbox anônimo <b className="new-badge">2</b></button></nav><div className="sidebar-bottom"><div className="desk-user"><span>FP</span><div><strong>Folha Pública</strong><small>Redação conectada</small></div><MoreHorizontal size={16} /></div><button className="back-desk" onClick={onBack}>Sair da área editorial</button></div></aside><div className="desk-main"><header className="desk-top"><div><div className="eyebrow">FOLHA PÚBLICA / CAIXA DE ENTRADA</div><h1>Denúncias recebidas</h1></div><div className="desk-actions"><button className="icon-button"><CircleHelp size={18} /></button><button className="user-avatar">MR</button></div></header><div className="desk-summary"><div><span className="summary-label">NÃO LIDAS</span><strong>03</strong><span className="summary-trend">+2 hoje</span></div><div><span className="summary-label">EM INVESTIGAÇÃO</span><strong>08</strong><span className="summary-trend neutral-trend">estáveis</span></div><div><span className="summary-label">TEMPO MÉDIO DE RESPOSTA</span><strong>2,4 <small>dias</small></strong><span className="summary-trend">−12%</span></div><div className="summary-note"><Sparkles size={17} /><span>O canal está operando<br /><strong>normalmente</strong></span></div></div><div className="desk-toolbar"><div className="search-box"><Search size={17} /><input placeholder="Buscar por ID ou palavra-chave" /></div><div className="filter-shell"><Filter size={15} /><select value={filter} onChange={(e) => setFilter(e.target.value)}><option>Todos os status</option><option>Não lida</option><option>Em análise</option><option>Investigando</option><option>Arquivada</option></select><ChevronDown size={14} /></div><button className="filter-button"><SlidersHorizontal size={16} /> Filtros <span>2</span></button></div><div className="desk-content"><div className="report-list"><div className="list-head"><span>{reports.length} denúncias</span><button>Mais recentes <ChevronDown size={14} /></button></div>{reports.map((report: any) => <button key={report.id} className={`report-row ${selectedReport.id === report.id ? 'selected' : ''}`} onClick={() => setSelectedReport(report)}><div className={`report-initials initials-${report.category === 'Corrupção' ? 'red' : 'blue'}`}>{report.initials}</div><div className="report-row-main"><div><strong>{report.title}</strong><span className="report-id">{report.id}</span></div><div><span>{report.category}</span><span>·</span><span>{report.date}</span></div></div><div className="report-row-side"><Pill tone={report.status}>{statusLabels[report.status]}</Pill><span className={`priority priority-${report.priority.toLowerCase()}`}><span />{report.priority}</span></div></button>)}</div><div className="report-detail"><div className="detail-top"><span className="detail-id">{selectedReport.id}</span><button><MoreHorizontal size={18} /></button></div><h2>{selectedReport.title}</h2><div className="detail-meta"><span><Clock3 size={14} /> {selectedReport.date}</span><span><FileText size={14} /> {selectedReport.category}</span></div><div className="detail-divider" /><p className="sealed-message"><LockKeyhole size={16} /> Conteúdo protegido — abra a denúncia para iniciar a análise editorial.</p><div className="detail-note"><label>Nota interna</label><textarea placeholder="Adicione uma nota para sua equipe..." /><button className="primary-button small-button">Salvar nota <Check size={15} /></button></div><div className="status-control"><label>Status da denúncia</label><button><span className={`status-dot status-${selectedReport.status}`} />{statusLabels[selectedReport.status]} <ChevronDown size={14} /></button></div></div></div></div></section>
}

export default App
