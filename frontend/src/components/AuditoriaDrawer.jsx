import { useState, useEffect, useCallback } from 'react'
import {
  X, CheckCircle2, AlertCircle, XCircle,
  Archive, ArchiveRestore, FileSearch, ChevronDown, ChevronUp,
} from 'lucide-react'
import { api } from '../lib/api'
import './AuditoriaDrawer.css'

const SEV_ORDER = ['CRÍTICA', 'SIGNIFICATIVA', 'MODERADA', 'BAIXA', 'MÍNIMA', 'AUSENTE']

const SEV_CFG = {
  'CRÍTICA':       { color: '#DC2626', bg: '#FEF2F2', label: 'Crítica' },
  'SIGNIFICATIVA': { color: '#D97706', bg: '#FFFBEB', label: 'Significativa' },
  'MODERADA':      { color: '#CA8A04', bg: '#FEFCE8', label: 'Moderada' },
  'BAIXA':         { color: '#16A34A', bg: '#F0FDF4', label: 'Baixa' },
  'MÍNIMA':        { color: '#22C55E', bg: '#F0FDF4', label: 'Mínima' },
  'AUSENTE':       { color: '#2563EB', bg: '#EFF6FF', label: 'Ausente' },
}

const STATUS_CFG = {
  com_divergencias: { label: 'Com divergências', color: '#DC2626', bg: '#FEF2F2' },
  sem_divergencias: { label: 'Sem divergências', color: '#16A34A', bg: '#F0FDF4' },
  concluida:        { label: 'Concluída',         color: '#6B7280', bg: '#F9FAFB' },
}

const MUN_STATUS_ICON = {
  conforme:  { Icon: CheckCircle2, color: '#16A34A' },
  alerta:    { Icon: AlertCircle,  color: '#D97706' },
  irregular: { Icon: XCircle,      color: '#DC2626' },
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ConciliacaoCard({ conc, onToggleArquivar }) {
  const [expanded, setExpanded] = useState(!conc.arquivado && conc.total_divergencias > 0)
  const [archiving, setArchiving] = useState(false)

  const st = STATUS_CFG[conc.status] || STATUS_CFG.concluida
  const sevEntries = SEV_ORDER.map(k => [k, conc.por_severidade?.[k] || 0]).filter(([, v]) => v > 0)
  const anexoEntries = Object.entries(conc.por_anexo || {}).filter(([, v]) => v > 0)
  const maxAnexo = Math.max(...anexoEntries.map(([, v]) => v), 1)

  async function handleArquivar() {
    setArchiving(true)
    try {
      const res = await api.patch(`/conciliacoes/${conc.id}/arquivar`)
      if (res.ok) {
        const data = await res.json()
        onToggleArquivar(conc.id, data.arquivado)
      }
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className={`adr-card ${conc.arquivado ? 'adr-card--archived' : ''} adr-card--${conc.status}`}>
      {/* Card header */}
      <div className="adr-card-head" onClick={() => setExpanded(e => !e)}>
        <div className="adr-card-meta">
          <span className="adr-card-date">{formatDate(conc.criado_em)}</span>
          {conc.criado_por_nome && (
            <span className="adr-card-author">por {conc.criado_por_nome}</span>
          )}
        </div>
        <div className="adr-card-badges">
          {conc.arquivado
            ? <span className="adr-badge adr-badge--archived">Arquivado</span>
            : <span className="adr-badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
          }
          <span className="adr-divcount">
            {conc.total_divergencias === 0 ? '0 div.' : `${conc.total_divergencias} div.`}
          </span>
          <button className="adr-expand-btn" type="button" aria-label="Expandir">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="adr-card-body">
          {conc.total_divergencias === 0 ? (
            <div className="adr-no-div">
              <CheckCircle2 size={14} />
              Nenhuma divergência encontrada
            </div>
          ) : (
            <>
              {/* Severity grid */}
              {sevEntries.length > 0 && (
                <div className="adr-sev-row">
                  {sevEntries.map(([key, count]) => {
                    const cfg = SEV_CFG[key]
                    return (
                      <div
                        key={key}
                        className="adr-sev-chip"
                        style={{ '--sev-color': cfg.color, '--sev-bg': cfg.bg }}
                      >
                        <span className="adr-sev-count">{count}</span>
                        <span className="adr-sev-label">{cfg.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Anexo breakdown */}
              {anexoEntries.length > 0 && (
                <div className="adr-anexo">
                  <div className="adr-anexo-title">Por Anexo</div>
                  {anexoEntries.map(([name, count]) => (
                    <div className="adr-anexo-row" key={name}>
                      <span className="adr-anexo-name">{name}</span>
                      <div className="adr-anexo-track">
                        <div
                          className="adr-anexo-bar"
                          style={{ width: `${(count / maxAnexo) * 100}%` }}
                        />
                      </div>
                      <span className="adr-anexo-count">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Archive action */}
          <div className="adr-card-actions">
            <button
              className={`adr-archive-btn ${conc.arquivado ? 'adr-archive-btn--restore' : ''}`}
              onClick={handleArquivar}
              disabled={archiving}
            >
              {conc.arquivado
                ? <><ArchiveRestore size={13} />Restaurar auditoria</>
                : <><Archive size={13} />Arquivar auditoria</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuditoriaDrawer({ municipio, onClose }) {
  const [conciliacoes, setConciliacoes] = useState([])
  const [prefeitura, setPrefeitura] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!municipio) return
    setLoading(true)
    try {
      const res = await api.get(`/prefeituras/${municipio.id}/conciliacoes`)
      if (res.ok) {
        const data = await res.json()
        setPrefeitura(data.prefeitura)
        setConciliacoes(data.conciliacoes)
      }
    } finally {
      setLoading(false)
    }
  }, [municipio])

  useEffect(() => { fetchData() }, [fetchData])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function handleToggleArquivar(id, arquivado) {
    setConciliacoes(cs =>
      cs.map(c => c.id === id ? { ...c, arquivado } : c)
    )
  }

  const munCfg = MUN_STATUS_ICON[municipio?.status] || MUN_STATUS_ICON.conforme
  const MunIcon = munCfg.Icon

  const ativas = conciliacoes.filter(c => !c.arquivado)
  const totalDivAtivas = ativas.reduce((s, c) => s + c.total_divergencias, 0)

  if (!municipio) return null

  return (
    <>
      <div className="adr-backdrop" onClick={onClose} />
      <div className="adr-panel">
        {/* Header */}
        <div className="adr-header">
          <div className="adr-header-left">
            <div className="adr-mun-title">
              <MunIcon size={16} style={{ color: munCfg.color, flexShrink: 0 }} />
              <span className="adr-mun-name">{municipio.nome}</span>
              <span className="adr-mun-uf">{municipio.uf}</span>
            </div>
            <div className="adr-mun-meta">
              <span>{conciliacoes.length} conciliação{conciliacoes.length !== 1 ? 'ões' : ''}</span>
              {totalDivAtivas > 0 && (
                <>
                  <span className="adr-meta-sep">·</span>
                  <span className="adr-meta-alert">{totalDivAtivas} divergência{totalDivAtivas !== 1 ? 's' : ''} ativas</span>
                </>
              )}
            </div>
          </div>
          <button className="adr-close-btn" onClick={onClose} title="Fechar">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="adr-body">
          {loading ? (
            <div className="adr-loading">
              <div className="adr-loading-spin" />
              Carregando histórico…
            </div>
          ) : conciliacoes.length === 0 ? (
            <div className="adr-empty">
              <FileSearch size={32} />
              <p>Nenhuma conciliação registrada para este município.</p>
            </div>
          ) : (
            <div className="adr-list">
              {conciliacoes.map(c => (
                <ConciliacaoCard
                  key={c.id}
                  conc={c}
                  onToggleArquivar={handleToggleArquivar}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
