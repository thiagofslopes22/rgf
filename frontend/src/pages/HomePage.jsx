import { useState, useEffect, useCallback } from 'react'
import {
  Building2, AlertTriangle, FileSearch,
  CheckCircle2, AlertCircle, XCircle, Clock, FilePlus,
  Search, Activity, PieChart, RefreshCw,
} from 'lucide-react'
import { api } from '../lib/api'
import AuditoriaDrawer from '../components/AuditoriaDrawer'
import './HomePage.css'

const TIPO_ICONS = {
  conciliacao: FileSearch,
  alerta:      AlertTriangle,
  relatorio:   FilePlus,
  municipio:   Building2,
}

const MUN_STATUS_CFG = {
  conforme:  { label: 'Conforme',   Icon: CheckCircle2 },
  alerta:    { label: 'Em alerta',  Icon: AlertCircle },
  irregular: { label: 'Irregular',  Icon: XCircle },
}

const CONC_STATUS_CFG = {
  ok:         { label: 'OK' },
  divergencia:{ label: 'Divergência' },
  pendente:   { label: 'Pendente' },
}

// ─── Empty state when no data ───
const EMPTY = {
  municipios_monitorados: 0,
  irregularidades_ativas: 0,
  conciliacoes_pendentes: 0,
  conformidade_media: 0,
  distribuicao_status: { conforme: 0, alerta: 0, irregular: 0 },
  alertas_recentes: [],
  municipios: [],
  atividade_recente: [],
}

export default function HomePage() {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [auditMunicipio, setAuditMunicipio] = useState(null)

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/dashboard')
      if (res.ok) {
        setData(await res.json())
        setLastUpdate(new Date())
      }
    } catch {
      // silently fail on refresh — data remains stale
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
    const timer = setInterval(fetchDashboard, 5 * 60 * 1000) // 5 min
    return () => clearInterval(timer)
  }, [fetchDashboard])

  const {
    municipios_monitorados,
    irregularidades_ativas,
    conciliacoes_pendentes,
    conformidade_media,
    distribuicao_status,
    alertas_recentes,
    municipios,
    atividade_recente,
  } = data

  const { conforme: conformes, alerta: emAlerta, irregular } = distribuicao_status
  const total = municipios_monitorados || 1 // avoid div/0

  const METRICAS = [
    {
      label: 'Municípios monitorados',
      value: String(municipios_monitorados),
      delta: municipios_monitorados === 0 ? 'Nenhum cadastrado' : `${municipios_monitorados} ativo${municipios_monitorados > 1 ? 's' : ''}`,
      color: 'blue',
      deltaSign: 'neutral',
    },
    {
      label: 'Irregularidades ativas',
      value: String(irregularidades_ativas),
      delta: irregularidades_ativas === 0 ? 'Nenhuma crítica' : `${irregularidades_ativas} crítica${irregularidades_ativas > 1 ? 's' : ''}`,
      color: 'red',
      deltaSign: irregularidades_ativas > 0 ? 'warn' : 'up',
    },
    {
      label: 'Conciliações pendentes',
      value: String(conciliacoes_pendentes),
      delta: conciliacoes_pendentes === 0 ? 'Todas em dia' : `${conciliacoes_pendentes} município${conciliacoes_pendentes > 1 ? 's' : ''} sem conciliação`,
      color: 'yellow',
      deltaSign: conciliacoes_pendentes > 0 ? 'warn' : 'up',
    },
    {
      label: 'Conformidade média LRF',
      value: `${conformidade_media}%`,
      delta: irregular > 0 ? `${irregular} município${irregular > 1 ? 's' : ''} irregular${irregular > 1 ? 'es' : ''}` : 'Todos conformes',
      color: irregular > 0 ? 'red' : 'green',
      deltaSign: irregular > 0 ? 'down' : 'up',
    },
  ]

  const ativos = alertas_recentes.length

  const formatTime = (d) => {
    if (!d) return ''
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="home home--loading">
        <div className="home-skeleton" />
        <div className="home-skeleton home-skeleton--wide" />
        <div className="home-skeleton" />
      </div>
    )
  }

  return (
    <>
    <div className="home">

      {/* ── Page header ── */}
      <div className="home-header">
        <div className="home-header-left">
          <div className={`home-status-dot ${irregularidades_ativas === 0 ? 'home-status-dot--ok' : ''}`} />
          <div>
            <h1 className="home-title">Painel de Auditoria</h1>
            <p className="home-subtitle">Monitoramento fiscal em tempo real · Maranhão</p>
          </div>
        </div>
        <div className="home-header-right">
          <button className="home-refresh-btn" onClick={fetchDashboard} title="Atualizar agora">
            <RefreshCw size={13} />
          </button>
          {lastUpdate && (
            <div className="home-timestamp">
              <Clock size={12} />
              <span>Atualizado às {formatTime(lastUpdate)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="home-kpis">
        {METRICAS.map(m => (
          <div className={`kpi-card kpi-card--${m.color}`} key={m.label}>
            <div className="kpi-value">{m.value}</div>
            <div className="kpi-label">{m.label}</div>
            <div className={`kpi-delta kpi-delta--${m.deltaSign}`}>{m.delta}</div>
          </div>
        ))}
      </div>

      {/* ── Status Distribution ── */}
      <div className="home-card home-status-card">
        <div className="card-head">
          <PieChart size={14} className="card-head-icon" />
          <h2 className="card-title">Distribuição por Status Fiscal</h2>
          <span className="card-pill">{municipios_monitorados} municípios</span>
        </div>
        <div className="status-dist">
          <div className="status-bar-wrap">
            <div className="status-bar">
              {conformes > 0 && (
                <div
                  className="status-segment status-segment--conforme"
                  style={{ width: `${(conformes / total) * 100}%` }}
                  title={`Conformes: ${conformes}`}
                />
              )}
              {emAlerta > 0 && (
                <div
                  className="status-segment status-segment--alerta"
                  style={{ width: `${(emAlerta / total) * 100}%` }}
                  title={`Em alerta: ${emAlerta}`}
                />
              )}
              {irregular > 0 && (
                <div
                  className="status-segment status-segment--irregular"
                  style={{ width: `${(irregular / total) * 100}%` }}
                  title={`Irregulares: ${irregular}`}
                />
              )}
            </div>
          </div>
          <div className="status-counters">
            <div className="status-counter status-counter--conforme">
              <span className="status-counter-value">{conformes}</span>
              <div className="status-counter-info">
                <span className="status-counter-label">Conformes</span>
                <span className="status-counter-pct">{Math.round((conformes / total) * 100)}%</span>
              </div>
            </div>
            <div className="status-divider" />
            <div className="status-counter status-counter--alerta">
              <span className="status-counter-value">{emAlerta}</span>
              <div className="status-counter-info">
                <span className="status-counter-label">Em alerta</span>
                <span className="status-counter-pct">{Math.round((emAlerta / total) * 100)}%</span>
              </div>
            </div>
            <div className="status-divider" />
            <div className="status-counter status-counter--irregular">
              <span className="status-counter-value">{irregular}</span>
              <div className="status-counter-info">
                <span className="status-counter-label">Irregulares</span>
                <span className="status-counter-pct">{Math.round((irregular / total) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Alerts + Activity ── */}
      <div className="home-row">

        {/* Alerts */}
        <div className="home-card home-alerts">
          <div className="card-head">
            <AlertTriangle size={14} className="card-head-icon--warn" />
            <h2 className="card-title">Alertas Fiscais</h2>
            {ativos > 0 && <span className="card-pill card-pill--red">{ativos} ativo{ativos > 1 ? 's' : ''}</span>}
          </div>
          <div className="alerts-list">
            {alertas_recentes.length === 0 ? (
              <div className="home-empty-state">
                <CheckCircle2 size={20} />
                <span>Nenhum alerta ativo no momento.</span>
              </div>
            ) : (
              alertas_recentes.map(a => (
                <div
                  key={a.id}
                  className={`alert-row alert-row--${a.severidade}`}
                >
                  <div className="alert-row-inner">
                    <div className="alert-main">
                      <span className="alert-tipo">{a.tipo}</span>
                      <span className="alert-mun">{a.municipio} · {a.uf}</span>
                    </div>
                    <div className="alert-meta">
                      <span className={`alert-status-badge alert-status--${a.status}`}>
                        {a.status === 'novo' ? 'Novo' : a.status === 'analise' ? 'Em análise' : 'Resolvido'}
                      </span>
                      <span className="alert-date">{a.data}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity */}
        <div className="home-card home-activity">
          <div className="card-head">
            <Activity size={14} className="card-head-icon" />
            <h2 className="card-title">Atividade Recente</h2>
          </div>
          <div className="timeline">
            {atividade_recente.length === 0 ? (
              <div className="home-empty-state">
                <Clock size={20} />
                <span>Nenhuma atividade registrada.</span>
              </div>
            ) : (
              atividade_recente.map((a, i) => {
                const isLast = i === atividade_recente.length - 1
                const Icon = TIPO_ICONS[a.tipo] || FileSearch
                return (
                  <div className="timeline-item" key={i}>
                    <div className="timeline-track">
                      <div className={`timeline-dot timeline-dot--${a.tipo}`}>
                        <Icon size={10} />
                      </div>
                      {!isLast && <div className="timeline-line" />}
                    </div>
                    <div className="timeline-body">
                      <div className="timeline-desc">{a.desc}</div>
                      <div className="timeline-meta">
                        <span className="timeline-mun">{a.municipio}</span>
                        <span>·</span>
                        <span className="timeline-time">{a.tempo} atrás</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Municipalities table ── */}
      <div className="home-card home-table-card">
        <div className="card-head">
          <Building2 size={14} className="card-head-icon" />
          <h2 className="card-title">Municípios Monitorados</h2>
          <span className="card-pill">{municipios.length} municípios</span>
        </div>
        {municipios.length === 0 ? (
          <div className="home-empty-state home-empty-state--padded">
            <Building2 size={28} />
            <span>Nenhum município cadastrado.</span>
            <a href="/prefeituras" className="home-empty-link">Cadastrar prefeitura →</a>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="mun-table">
              <thead>
                <tr>
                  <th>Município</th>
                  <th>Status</th>
                  <th>Última conciliação</th>
                  <th>Irregularidades</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {municipios.map(m => {
                  const st = MUN_STATUS_CFG[m.status] || MUN_STATUS_CFG.conforme
                  const cs = CONC_STATUS_CFG[m.conc_status] || CONC_STATUS_CFG.pendente
                  const Icon = st.Icon
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="td-mun">
                          <span className="mun-name">{m.nome}</span>
                          <span className="mun-uf">{m.uf}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`mstatus mstatus--${m.status}`}>
                          <Icon size={11} strokeWidth={2.5} />
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <div className="td-conc">
                          <span className="conc-date">{m.ultima_conciliacao || '—'}</span>
                          <span className={`conc-badge conc--${m.conc_status || 'pendente'}`}>{cs.label}</span>
                        </div>
                      </td>
                      <td>
                        {m.irregularidades > 0
                          ? <span className={`irr-badge irr--${m.irregularidades >= 5 ? 'high' : m.irregularidades >= 2 ? 'mid' : 'low'}`}>
                              {m.irregularidades}
                            </span>
                          : <span className="irr-zero">—</span>
                        }
                      </td>
                      <td>
                        <button
                          className="audit-btn"
                          onClick={() => setAuditMunicipio(m)}
                        >
                          <Search size={12} strokeWidth={2.5} />
                          Auditar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>

    {auditMunicipio && (
      <AuditoriaDrawer
        municipio={auditMunicipio}
        onClose={() => setAuditMunicipio(null)}
      />
    )}
  </>
  )
}
