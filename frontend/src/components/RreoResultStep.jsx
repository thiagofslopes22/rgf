import { Download, RefreshCw, CheckCircle, AlertTriangle, AlertCircle, Info, BookOpen } from 'lucide-react'
import { api } from '../lib/api'
import './RreoResultStep.css'

const SEV_CFG = {
  'CRÍTICA':          { color: '#DC2626', bg: '#FEF2F2', label: 'Crítica',          icon: AlertCircle },
  'SIGNIFICATIVA':    { color: '#D97706', bg: '#FFFBEB', label: 'Significativa',    icon: AlertTriangle },
  'MODERADA':         { color: '#CA8A04', bg: '#FEFCE8', label: 'Moderada',         icon: AlertTriangle },
  'BAIXA':            { color: '#16A34A', bg: '#F0FDF4', label: 'Baixa',            icon: CheckCircle },
  'MÍNIMA':           { color: '#22C55E', bg: '#F0FDF4', label: 'Mínima',           icon: CheckCircle },
  'AUSENTE_MSC':      { color: '#2563EB', bg: '#EFF6FF', label: 'Ausente MSC',      icon: Info },
  'AUSENTE_SICONFI':  { color: '#7C3AED', bg: '#F5F3FF', label: 'Ausente SICONFI',  icon: Info },
  'TEXTO':            { color: '#6B7280', bg: '#F9FAFB', label: 'Texto',            icon: Info },
}

const SEV_ORDER = ['CRÍTICA', 'SIGNIFICATIVA', 'MODERADA', 'BAIXA', 'MÍNIMA', 'AUSENTE_MSC', 'AUSENTE_SICONFI', 'TEXTO']

export default function RreoResultStep({ data, onReset }) {
  if (!data) return null

  const { job_id, stats } = data
  const total        = stats.total_divergencias ?? 0
  const porClass     = stats.por_classificacao ?? {}
  const porSheet     = stats.por_sheet ?? {}
  const avisos       = stats.avisos ?? []
  const sheets       = stats.sheets_comparadas ?? []

  const criticas     = (porClass['CRÍTICA'] ?? 0) + (porClass['SIGNIFICATIVA'] ?? 0)
  const maxSheet     = Math.max(...Object.values(porSheet), 1)

  async function baixar(endpoint, filename) {
    const res = await api.get(endpoint)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rreo-result">

      {/* ── Hero ── */}
      <div className="rreo-hero">
        <div className={`rreo-icon-wrap ${criticas > 0 ? 'rreo-icon--warn' : 'rreo-icon--ok'}`}>
          {criticas > 0 ? <AlertTriangle size={26} /> : <CheckCircle size={26} />}
        </div>
        <div className="rreo-hero-text">
          <h1 className="rreo-title">Conciliação RREO concluída</h1>
          <p className="rreo-subtitle">
            {total === 0
              ? 'Nenhuma divergência — RREO e SICONFI idênticos.'
              : `${total} divergência${total > 1 ? 's' : ''} identificada${total > 1 ? 's' : ''} em ${sheets.length} anexo${sheets.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {total > 0 && (
          <div className="rreo-total-badge">
            <span className="rreo-total-n">{total}</span>
            <span className="rreo-total-lbl">divergências</span>
          </div>
        )}
      </div>

      {/* ── Avisos ── */}
      {avisos.length > 0 && (
        <div className="rreo-avisos">
          {avisos.map((a, i) => (
            <div className="rreo-aviso-row" key={i}>
              <Info size={13} />
              <span>{a}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Classificação ── */}
      {total > 0 && (
        <div className="rreo-section">
          <div className="rreo-section-head">
            <span className="rreo-section-label">Por Classificação</span>
          </div>
          <div className="rreo-sev-grid">
            {SEV_ORDER.map(key => {
              const count = porClass[key]
              if (!count) return null
              const cfg = SEV_CFG[key]
              const Icon = cfg.icon
              return (
                <div
                  key={key}
                  className="rreo-sev-card"
                  style={{ '--sc': cfg.color, '--sbg': cfg.bg }}
                >
                  <Icon size={14} className="rreo-sev-icon" />
                  <div className="rreo-sev-body">
                    <span className="rreo-sev-n">{count}</span>
                    <span className="rreo-sev-lbl">{cfg.label}</span>
                  </div>
                  <div className="rreo-sev-track">
                    <div className="rreo-sev-bar" style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Por Anexo ── */}
      {total > 0 && Object.keys(porSheet).length > 0 && (
        <div className="rreo-section">
          <div className="rreo-section-head">
            <span className="rreo-section-label">Por Anexo</span>
            <span className="rreo-section-pill">{sheets.length} comparados</span>
          </div>
          <div className="rreo-anexo-list">
            {Object.entries(porSheet)
              .sort(([, a], [, b]) => b - a)
              .map(([nome, count]) => {
                const label = nome.replace('RREO-', '')
                return (
                  <div className="rreo-anexo-row" key={nome}>
                    <span className="rreo-anexo-name">{label}</span>
                    <div className="rreo-anexo-track">
                      <div
                        className="rreo-anexo-bar"
                        style={{ width: `${(count / maxSheet) * 100}%` }}
                      />
                    </div>
                    <span className="rreo-anexo-count">{count}</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* ── Downloads ── */}
      <div className="rreo-downloads">
        <button
          className="rreo-btn-primary"
          onClick={() => baixar(`/download/${job_id}`, 'RREO_Divergencias_Destacadas.xlsx')}
        >
          <Download size={18} />
          <div className="rreo-btn-text">
            <span className="rreo-btn-label">Planilha com divergências destacadas</span>
            <span className="rreo-btn-sub">Cópia do rascunho com células coloridas por criticidade</span>
          </div>
        </button>
        <button
          className="rreo-btn-secondary"
          onClick={() => baixar(`/download-auditoria/${job_id}`, 'RREO_Relatorio_Auditoria_Kora.xlsx')}
        >
          <BookOpen size={18} />
          <div className="rreo-btn-text">
            <span className="rreo-btn-label">Relatório de auditoria</span>
            <span className="rreo-btn-sub">Tabular com layout Kora — para apresentar e arquivar</span>
          </div>
        </button>
      </div>

      {/* ── Reset ── */}
      <div className="rreo-footer">
        <button className="rreo-btn-reset" onClick={onReset}>
          <RefreshCw size={14} />
          <span>Nova conciliação RREO</span>
        </button>
        <p className="rreo-tip">
          A planilha destacada é cópia fiel do rascunho — passe o cursor sobre cada célula
          para ver o valor do SICONFI e a diferença. O relatório de auditoria é um resumo
          tabular pronto para revisão e arquivamento.
        </p>
      </div>

    </div>
  )
}
