import { Download, RefreshCw, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import './ResultStep.css'

const SEV_CONFIG = {
  'CRÍTICA':       { color: '#ff3333', bg: '#fff0f0', label: 'Crítica',       icon: AlertCircle },
  'SIGNIFICATIVA': { color: '#ff8800', bg: '#fff7ed', label: 'Significativa', icon: AlertTriangle },
  'MODERADA':      { color: '#c9a800', bg: '#fffbeb', label: 'Moderada',      icon: AlertTriangle },
  'BAIXA':         { color: '#2e9e50', bg: '#f0faf4', label: 'Baixa',         icon: CheckCircle },
  'MÍNIMA':        { color: '#5cb86a', bg: '#f4fbf5', label: 'Mínima',        icon: CheckCircle },
  'AUSENTE':       { color: '#2196f3', bg: '#eef7ff', label: 'Ausente',       icon: Info },
}

export default function ResultStep({ data, onReset, getToken }) {
  if (!data) return null

  const { job_id, stats } = data
  const total = stats.total_divergencias
  const sevs = stats.por_severidade
  const porAnexo = stats.por_anexo

  const hasCritical = (sevs['CRÍTICA'] || 0) + (sevs['SIGNIFICATIVA'] || 0) > 0

  async function handleDownload() {
    const token = getToken ? getToken() : null
    const res = await fetch(`/api/download/${job_id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'RGF_Conciliado.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="result-step">
      {/* Hero */}
      <div className="result-hero">
        <div className={`result-icon-wrap ${hasCritical ? 'result-icon--warn' : 'result-icon--ok'}`}>
          {hasCritical
            ? <AlertTriangle size={28} />
            : <CheckCircle size={28} />}
        </div>
        <div>
          <h1 className="result-title">Conciliação concluída</h1>
          <p className="result-subtitle">
            {total === 0
              ? 'Nenhuma divergência encontrada — arquivos idênticos.'
              : `${total} célula${total > 1 ? 's' : ''} com divergência identificada${total > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Severity cards */}
      {total > 0 && (
        <div className="sev-grid">
          {Object.entries(SEV_CONFIG).map(([key, cfg]) => {
            const count = sevs[key] || 0
            if (!count) return null
            const Icon = cfg.icon
            return (
              <div className="sev-card" key={key} style={{ '--sev-color': cfg.color, '--sev-bg': cfg.bg }}>
                <div className="sev-icon"><Icon size={16} /></div>
                <div className="sev-body">
                  <div className="sev-count">{count}</div>
                  <div className="sev-label">{cfg.label}</div>
                </div>
                <div className="sev-bar-wrap">
                  <div className="sev-bar" style={{ width: `${(count / total) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Per-anexo breakdown */}
      {total > 0 && (
        <div className="anexo-card">
          <h3 className="anexo-title">Divergências por Anexo</h3>
          <div className="anexo-list">
            {Object.entries(porAnexo).map(([name, count]) => (
              <div className="anexo-row" key={name}>
                <span className="anexo-name">{name}</span>
                <div className="anexo-bar-wrap">
                  <div
                    className="anexo-bar"
                    style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="anexo-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="result-actions">
        <button className="btn-download" onClick={handleDownload}>
          <Download size={20} />
          <span>Baixar planilha conciliada (.xlsx)</span>
        </button>
        <button className="btn-reset" onClick={onReset}>
          <RefreshCw size={16} />
          <span>Nova conciliação</span>
        </button>
      </div>

      <div className="result-tip">
        <Info size={13} />
        <span>
          A planilha baixada é uma cópia fiel do rascunho MSC. Células com divergência
          ficam coloridas por criticidade — passe o cursor sobre elas para ver o valor
          do SICONFI e a diferença calculada.
        </span>
      </div>
    </div>
  )
}
