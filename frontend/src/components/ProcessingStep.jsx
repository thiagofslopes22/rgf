import { useEffect, useState } from 'react'
import './ProcessingStep.css'

const MESSAGES = [
  'Lendo estrutura do rascunho MSC...',
  'Carregando arquivo homologado SICONFI...',
  'Copiando layout, merges e formatação...',
  'Comparando valores célula a célula...',
  'Classificando divergências por criticidade...',
  'Aplicando marcações e comentários...',
  'Gerando planilha final...',
]

export default function ProcessingStep() {
  const [msgIdx, setMsgIdx] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES.length)
      setProgress(p => Math.min(p + 100 / MESSAGES.length, 95))
    }, 900)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="proc-step">
      <div className="proc-card">
        <div className="proc-spinner">
          <svg viewBox="0 0 50 50">
            <circle className="proc-track" cx="25" cy="25" r="20" />
            <circle className="proc-arc" cx="25" cy="25" r="20" />
          </svg>
          <div className="proc-pct">{Math.round(progress)}%</div>
        </div>

        <h2 className="proc-title">Processando conciliação</h2>
        <p className="proc-msg">{MESSAGES[msgIdx]}</p>

        <div className="proc-bar-wrap">
          <div className="proc-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="proc-steps-list">
          {MESSAGES.map((m, i) => (
            <div key={i} className={`proc-item ${i < msgIdx ? 'done' : i === msgIdx ? 'active' : ''}`}>
              <span className="proc-item-dot" />
              <span>{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
