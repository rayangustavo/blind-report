'use client'

import { useState } from 'react'
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
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import { useWebsiteController } from '@/lib/use-website-controller'
import type { ReportItem, ReportStatus } from '@/lib/website-controller'

export const STATUS_LABELS: Record<string, string> = {
  unread: 'Não lida',
  in_review: 'Em análise',
  investigating: 'Investigando',
  archived: 'Arquivada',
}

function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark"><span /></span>
      <span>blind<span className="brand-accent">report</span></span>
    </div>
  )
}

function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

export function App() {
  const {
    state,
    filteredReports,
    startReport,
    navigate,
    setReportStep,
    selectNewsroom,
    selectCategory,
    setMessage,
    setFilter,
    selectReport,
    submitReport,
    openEditorialDesk,
    decryptSelectedReport,
    saveInternalNote,
    updateReportStatus,
  } = useWebsiteController()

  const { view, reportStep, selectedNewsroom, selectedCategory, message, filter, selectedReport, receipt } = state

  const unreadCount = state.reports.filter((r) => r.status === 'unread').length
  const investigatingCount = state.reports.filter((r) => r.status === 'investigating').length

  return (
    <main className="app-shell">
      <header className="site-header">
        <button className="logo-button" onClick={() => navigate('home')} aria-label="Voltar para início">
          <Logo />
        </button>
        <nav className="top-nav" aria-label="Navegação principal">
          <button onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}>
            Como funciona
          </button>
          <button onClick={() => document.getElementById('seguranca')?.scrollIntoView({ behavior: 'smooth' })}>
            Segurança
          </button>
          <button onClick={() => openEditorialDesk()} className="nav-editorial" id="btn-nav-editorial">
            Área da redação <ArrowRight size={14} />
          </button>
        </nav>
        <button className="mobile-menu" aria-label="Abrir menu"><Menu size={20} /></button>
      </header>

      {view === 'home' && (
        <>
          <section className="hero-section">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-dot" /> CANAL SEGURO PARA A IMPRENSA</div>
              <h1>O que precisa ser<br /><em>revelado</em> merece<br />ser protegido.</h1>
              <p className="hero-subtitle">Envie informações de interesse público para redações confiáveis, com anonimato técnico e segurança em cada etapa.</p>
              <div className="hero-actions">
                <button className="primary-button" id="btn-hero-report" onClick={() => startReport()}>
                  Enviar denúncia anônima <ArrowRight size={17} />
                </button>
                <button className="text-button" onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}>
                  Entenda como funciona <ArrowRight size={15} />
                </button>
              </div>
              <div className="hero-note"><LockKeyhole size={14} /> Sua identidade não é compartilhada com a redação.</div>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="visual-glow" />
              <div className="visual-card visual-card-main">
                <div className="card-topline"><span className="live-dot" /> canal protegido <span className="card-lock"><LockKeyhole size={13} /></span></div>
                <div className="signal-lines"><span /><span /><span /><span /></div>
                <div className="card-footer"><span>BLIND REPORT</span><span>END-TO-END</span></div>
              </div>
              <div className="floating-card floating-card-top">
                <Fingerprint size={18} />
                <div><strong>Identidade protegida</strong><small>verificação anti-abuso ativa</small></div>
                <BadgeCheck size={18} className="check-icon" />
              </div>
              <div className="floating-card floating-card-bottom">
                <div className="mini-icon"><ShieldCheck size={17} /></div>
                <div><strong>Conteúdo selado</strong><small>apenas a redação acessa</small></div>
              </div>
            </div>
          </section>

          <section className="trust-strip">
            <div><span className="trust-number">01</span><span>Anonimato por padrão</span></div>
            <div><span className="trust-number">02</span><span>Verificação sem exposição</span></div>
            <div><span className="trust-number">03</span><span>Custódia segura da informação</span></div>
            <div className="trust-source"><span className="source-mark">◈</span> Feito para o jornalismo</div>
          </section>

          <section className="how-section section-wrap" id="como-funciona">
            <div className="section-heading">
              <div><div className="eyebrow">COMO FUNCIONA</div><h2>Da sua informação<br />à <em>apuração.</em></h2></div>
              <p>Sem cadastro. Sem rastros desnecessários.<br />Só o que importa para uma boa reportagem.</p>
            </div>
            <div className="steps-grid">
              <article>
                <span className="step-index">01</span>
                <div className="step-icon"><MessageSquareLock size={22} /></div>
                <h3>Conte o que sabe</h3>
                <p>Escolha uma redação, selecione o tema e descreva os fatos com o máximo de contexto possível.</p>
              </article>
              <article>
                <span className="step-index">02</span>
                <div className="step-icon"><Fingerprint size={22} /></div>
                <h3>Prove que é humano</h3>
                <p>Uma verificação rápida evita spam e abuso. Ela confirma sua humanidade, não revela quem você é.</p>
              </article>
              <article>
                <span className="step-index">03</span>
                <div className="step-icon"><ShieldCheck size={22} /></div>
                <h3>A redação investiga</h3>
                <p>Sua denúncia chega selada ao time editorial. A informação é validada antes de qualquer publicação.</p>
              </article>
            </div>
          </section>

          <section className="security-section" id="seguranca">
            <div className="section-wrap security-grid">
              <div>
                <div className="eyebrow">SEGURANÇA E PRIVACIDADE</div>
                <h2>Confiança não é<br /><em>promessa.</em> É prática.</h2>
                <p>Construímos cada parte do Blind Report para proteger a fonte e preservar a integridade da informação.</p>
                <button className="outline-button" onClick={() => navigate('report')}>Conheça a política da redação <ArrowRight size={16} /></button>
              </div>
              <div className="security-list">
                <div><LockKeyhole size={19} /><div><strong>Sem IP, sem perfil</strong><span>Não exibimos ou armazenamos seu endereço IP na experiência da fonte.</span></div></div>
                <div><Fingerprint size={19} /><div><strong>Identidade verificada, não revelada</strong><span>O World ID ajuda a manter o canal livre de abuso sem vincular você à denúncia.</span></div></div>
                <div><Inbox size={19} /><div><strong>Conteúdo sob custódia</strong><span>Apenas a redação escolhida pode abrir e conduzir a apuração.</span></div></div>
              </div>
            </div>
          </section>

          <section className="final-cta section-wrap">
            <div><div className="eyebrow">TEM ALGO A DIZER?</div><h2>Uma boa história<br />pode começar <em>aqui.</em></h2></div>
            <button className="primary-button" onClick={() => startReport()}>Enviar denúncia anônima <ArrowRight size={17} /></button>
          </section>
        </>
      )}

      {view === 'report' && (
        <ReportFlow
          step={reportStep}
          setStep={setReportStep}
          category={selectedCategory}
          setCategory={selectCategory}
          newsroom={selectedNewsroom}
          setNewsroom={selectNewsroom}
          message={message}
          setMessage={setMessage}
          receipt={receipt}
          onSubmit={submitReport}
          onBack={() => navigate('home')}
        />
      )}

      {view === 'desk' && (
        <EditorialDesk
          filter={filter}
          setFilter={setFilter}
          reports={filteredReports}
          selectedReport={selectedReport}
          setSelectedReport={selectReport}
          unreadCount={unreadCount}
          investigatingCount={investigatingCount}
          onDecrypt={decryptSelectedReport}
          onSaveNote={saveInternalNote}
          onUpdateStatus={updateReportStatus}
          onBack={() => navigate('home')}
        />
      )}

      <footer className="site-footer">
        <Logo />
        <span>Informação protegida. Jornalismo fortalecido.</span>
        <span>© 2026 Blind Report</span>
      </footer>
    </main>
  )
}

export function ReportFlow({
  step,
  setStep,
  category,
  setCategory,
  newsroom,
  setNewsroom,
  message,
  setMessage,
  receipt,
  onSubmit,
  onBack,
}: any) {
  return (
    <section className="flow-page">
      <div className="flow-header">
        <button className="back-button" onClick={onBack}><X size={17} /> Fechar</button>
        <div className="flow-progress">
          <span className={step >= 1 ? 'active' : ''} />
          <span className={step >= 2 ? 'active' : ''} />
          <span className={step >= 3 ? 'active' : ''} />
        </div>
        <span className="flow-step">{step < 3 ? `0${step} / 03` : 'ENVIADO'}</span>
      </div>

      <div className="flow-content">
        {step === 1 && (
          <>
            <div className="eyebrow">NOVA DENÚNCIA</div>
            <h1>Comece pela<br /><em>informação.</em></h1>
            <p className="flow-intro">Você está em um canal seguro. Não precisamos saber quem você é para ouvir o que você tem a dizer.</p>
            <label htmlFor="select-newsroom">Para qual redação deseja enviar?</label>
            <div className="select-shell">
              <select id="select-newsroom" value={newsroom} onChange={(e) => setNewsroom(e.target.value)}>
                <option value="Folha Pública">Folha Pública</option>
                <option value="Jornal da Cidade">Jornal da Cidade</option>
                <option value="Agência Horizonte">Agência Horizonte</option>
                <option value="investiga.eth">investiga.eth</option>
              </select>
              <ChevronDown size={16} />
            </div>
            <button className="primary-button flow-next" id="btn-step1-continue" onClick={() => setStep(2)}>
              Continuar <ArrowRight size={17} />
            </button>
            <div className="flow-reassurance"><LockKeyhole size={15} /> Seu envio será criptografado antes de sair deste dispositivo.</div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="eyebrow">SOBRE A DENÚNCIA</div>
            <h1>O que você<br /><em>descobriu?</em></h1>
            <p className="flow-intro">Quanto mais contexto você compartilhar, melhor a redação poderá avaliar. Não inclua dados que possam identificar você.</p>
            <label>Categoria da denúncia</label>
            <div className="category-grid">
              {['Corrupção', 'Políticas públicas', 'Direitos humanos', 'Meio ambiente', 'saude'].map((item) => (
                <button
                  key={item}
                  className={category === item ? 'category active' : 'category'}
                  id={`btn-category-${item}`}
                  onClick={() => setCategory(item)}
                >
                  {item}
                  {category === item && <Check size={15} />}
                </button>
              ))}
            </div>
            <label htmlFor="report-message">Descreva os fatos</label>
            <textarea
              id="report-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Conte o que aconteceu, quando e onde. Evite incluir informações que revelem sua identidade."
            />
            <div className="upload-row">
              <button className="upload-button"><Paperclip size={16} /> Anexar arquivo</button>
              <span>PDF, JPG ou PNG · até 10 MB</span>
            </div>
            <div className="flow-actions">
              <button className="ghost-button" onClick={() => setStep(1)}>Voltar</button>
              <button
                className="primary-button"
                id="btn-submit-report"
                disabled={!category || message.length < 10}
                onClick={async () => {
                  if (onSubmit) await onSubmit()
                  else setStep(3)
                }}
              >
                Verificar e enviar <ArrowRight size={17} />
              </button>
            </div>
            <div className="flow-reassurance">
              <LockKeyhole size={15} /> {message.length}/2.000 caracteres · Política da {newsroom}
            </div>
          </>
        )}

        {step === 3 && (
          <div className="success-state">
            <div className="success-icon"><Check size={28} /></div>
            <div className="eyebrow">DENÚNCIA RECEBIDA</div>
            <h1>Sua informação<br />está <em>protegida.</em></h1>
            <p className="flow-intro">
              A denúncia foi criptografada e enviada para a <strong>{newsroom}</strong>. A redação irá analisar o conteúdo com cuidado.
            </p>
            <div className="receipt-card">
              <span>IDENTIFICADOR DA DENÚNCIA</span>
              <strong id="receipt-id">{receipt?.id ?? 'BR-8422'}</strong>
              <small>Guarde este código para consultar o andamento sem revelar sua identidade.</small>
              {receipt?.key && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--muted)', wordBreak: 'break-all' }}>
                  Arkiv Key: {receipt.key.slice(0, 18)}...
                </div>
              )}
            </div>
            <button className="primary-button" id="btn-success-home" onClick={onBack}>
              Voltar ao início <ArrowRight size={17} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export function EditorialDesk({
  filter,
  setFilter,
  reports,
  selectedReport,
  setSelectedReport,
  unreadCount,
  investigatingCount,
  onDecrypt,
  onSaveNote,
  onUpdateStatus,
  onBack,
}: any) {
  const [noteText, setNoteText] = useState('')

  return (
    <section className="desk-page">
      <aside className="desk-sidebar">
        <div className="desk-brand">
          <Logo />
          <span className="desk-label">NEWSROOM</span>
        </div>
        <nav>
          <button className="active"><Inbox size={17} /> Caixa de entrada <b id="badge-inbox-count">{reports.length}</b></button>
          <button><BarChart3 size={17} /> Visão geral</button>
          <button><MessageSquareLock size={17} /> Mailbox anônimo <b className="new-badge">2</b></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="desk-user">
            <span>FP</span>
            <div><strong>Folha Pública</strong><small>Redação conectada</small></div>
            <MoreHorizontal size={16} />
          </div>
          <button className="back-desk" onClick={onBack}>Sair da área editorial</button>
        </div>
      </aside>

      <div className="desk-main">
        <header className="desk-top">
          <div>
            <div className="eyebrow">FOLHA PÚBLICA / CAIXA DE ENTRADA</div>
            <h1>Denúncias recebidas</h1>
          </div>
          <div className="desk-actions">
            <button className="icon-button"><CircleHelp size={18} /></button>
            <button className="user-avatar">MR</button>
          </div>
        </header>

        <div className="desk-summary">
          <div>
            <span className="summary-label">NÃO LIDAS</span>
            <strong id="counter-unread">{String(unreadCount).padStart(2, '0')}</strong>
            <span className="summary-trend">+2 hoje</span>
          </div>
          <div>
            <span className="summary-label">EM INVESTIGAÇÃO</span>
            <strong id="counter-investigating">{String(investigatingCount).padStart(2, '0')}</strong>
            <span className="summary-trend neutral-trend">estáveis</span>
          </div>
          <div>
            <span className="summary-label">TEMPO MÉDIO DE RESPOSTA</span>
            <strong>2,4 <small>dias</small></strong>
            <span className="summary-trend">−12%</span>
          </div>
          <div className="summary-note">
            <Sparkles size={17} />
            <span>O canal está operando<br /><strong>normalmente</strong></span>
          </div>
        </div>

        <div className="desk-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input placeholder="Buscar por ID ou palavra-chave" id="input-desk-search" />
          </div>
          <div className="filter-shell">
            <Filter size={15} />
            <select id="select-desk-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="Todos os status">Todos os status</option>
              <option value="Não lida">Não lida</option>
              <option value="Em análise">Em análise</option>
              <option value="Investigando">Investigando</option>
              <option value="Arquivada">Arquivada</option>
            </select>
            <ChevronDown size={14} />
          </div>
          <button className="filter-button"><SlidersHorizontal size={16} /> Filtros <span>2</span></button>
        </div>

        <div className="desk-content">
          <div className="report-list">
            <div className="list-head">
              <span id="label-report-count">{reports.length} denúncias</span>
              <button>Mais recentes <ChevronDown size={14} /></button>
            </div>
            {reports.map((report: ReportItem) => (
              <button
                key={report.id}
                id={`report-row-${report.id}`}
                className={`report-row ${selectedReport?.id === report.id ? 'selected' : ''}`}
                onClick={() => setSelectedReport(report)}
              >
                <div className={`report-initials initials-${report.category === 'Corrupção' ? 'red' : 'blue'}`}>
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

          {selectedReport && (
            <div className="report-detail">
              <div className="detail-top">
                <span className="detail-id" id="detail-report-id">{selectedReport.id}</span>
                <button><MoreHorizontal size={18} /></button>
              </div>
              <h2 id="detail-report-title">{selectedReport.title}</h2>
              <div className="detail-meta">
                <span><Clock3 size={14} /> {selectedReport.date}</span>
                <span><FileText size={14} /> {selectedReport.category}</span>
              </div>
              <div className="detail-divider" />

              {selectedReport.decrypted ? (
                <div className="decrypted-content" style={{ padding: '16px', background: 'var(--paper)', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--green)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} /> CONTEÚDO SIGILOSO DECIFRADO
                  </div>
                  <p id="decrypted-text" style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--ink)' }}>
                    {selectedReport.text}
                  </p>
                </div>
              ) : (
                <p
                  className="sealed-message"
                  id="btn-decrypt-report"
                  style={{ cursor: 'pointer' }}
                  onClick={async () => {
                    if (onDecrypt) await onDecrypt()
                  }}
                >
                  <LockKeyhole size={16} /> Conteúdo protegido — clique para decifrar e abrir a denúncia.
                </p>
              )}

              <div className="detail-note">
                <label htmlFor="input-internal-note">Nota interna</label>
                <textarea
                  id="input-internal-note"
                  defaultValue={selectedReport.internalNote ?? ''}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Adicione uma nota para sua equipe..."
                />
                <button
                  className="primary-button small-button"
                  id="btn-save-note"
                  onClick={async () => {
                    if (onSaveNote && noteText) await onSaveNote(noteText)
                  }}
                >
                  Salvar nota <Check size={15} />
                </button>
              </div>

              <div className="status-control">
                <label>Status da denúncia</label>
                <select
                  id="select-change-status"
                  value={selectedReport.status}
                  onChange={async (e) => {
                    if (onUpdateStatus) await onUpdateStatus(e.target.value as ReportStatus)
                  }}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--card)' }}
                >
                  <option value="unread">Não lida</option>
                  <option value="in_review">Em análise</option>
                  <option value="investigating">Investigando</option>
                  <option value="archived">Arquivada</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default App
