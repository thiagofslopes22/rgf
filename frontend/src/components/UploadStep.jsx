import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileSpreadsheet, Upload, X, ArrowRight, Info, Building2, ChevronDown } from 'lucide-react'
import './UploadStep.css'

function FileZone({ label, subtitle, file, onFile, onClear }) {
  const onDrop = useCallback((accepted) => {
    if (accepted[0]) onFile(accepted[0])
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
  })

  if (file) {
    return (
      <div className="file-zone file-zone--filled">
        <div className="fz-icon-wrap fz-icon-wrap--ok">
          <FileSpreadsheet size={22} />
        </div>
        <div className="fz-info">
          <span className="fz-label">{label}</span>
          <span className="fz-filename">{file.name}</span>
          <span className="fz-size">{(file.size / 1024).toFixed(1)} KB</span>
        </div>
        <button className="fz-clear" onClick={onClear} title="Remover arquivo">
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div {...getRootProps()} className={`file-zone file-zone--empty ${isDragActive ? 'file-zone--drag' : ''}`}>
      <input {...getInputProps()} />
      <div className="fz-icon-wrap">
        <Upload size={22} />
      </div>
      <div className="fz-info">
        <span className="fz-label">{label}</span>
        <span className="fz-subtitle">{subtitle}</span>
        <span className="fz-hint">.xls ou .xlsx — clique ou arraste</span>
      </div>
    </div>
  )
}

export default function UploadStep({ onSubmit, prefeituras = [], selectedPrefeitura, onPrefeituraChange }) {
  const [rascunho, setRascunho] = useState(null)
  const [homologado, setHomologado] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const ready = rascunho && homologado && selectedPrefeitura

  function selectPrefeitura(p) {
    onPrefeituraChange(p)
    setDropdownOpen(false)
  }

  return (
    <div className="upload-step">
      <div className="upload-hero">
        <h1 className="upload-title">Conciliação RGF Simplificado</h1>
        <p className="upload-desc">
          Envie o rascunho gerado pelo sistema MSC e o arquivo homologado no SICONFI.
          O sistema compara automaticamente todas as células e gera uma planilha com as
          divergências marcadas diretamente no layout original.
        </p>
      </div>

      <div className="upload-card">

        {/* Prefeitura selector */}
        <div className="upload-prefeitura">
          <div className="upload-prefeitura-label">
            <Building2 size={14} />
            <span>Prefeitura</span>
            <span className="upload-prefeitura-required">*</span>
          </div>

          <div className="upload-prefeitura-select-wrap">
            <button
              type="button"
              className={`upload-prefeitura-trigger ${selectedPrefeitura ? 'upload-prefeitura-trigger--selected' : ''}`}
              onClick={() => setDropdownOpen(o => !o)}
            >
              {selectedPrefeitura ? (
                <span className="upt-selected-label">
                  {selectedPrefeitura.nome}
                  <span className="upt-selected-uf">{selectedPrefeitura.uf}</span>
                </span>
              ) : (
                <span className="upt-placeholder">Selecione a prefeitura…</span>
              )}
              <ChevronDown size={14} className={`upt-chevron ${dropdownOpen ? 'upt-chevron--open' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="upt-dropdown">
                {prefeituras.length === 0 ? (
                  <div className="upt-empty">
                    Nenhuma prefeitura cadastrada.{' '}
                    <a href="/prefeituras">Cadastrar agora →</a>
                  </div>
                ) : (
                  prefeituras.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={`upt-option ${selectedPrefeitura?.id === p.id ? 'upt-option--active' : ''}`}
                      onClick={() => selectPrefeitura(p)}
                    >
                      <span className="upt-option-nome">{p.nome}</span>
                      <span className="upt-option-mun">{p.municipio} · {p.uf}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="upload-divider" />

        {/* File zones */}
        <div className="upload-zones">
          <FileZone
            label="Rascunho MSC"
            subtitle="Arquivo gerado pelo sistema da prefeitura"
            file={rascunho}
            onFile={setRascunho}
            onClear={() => setRascunho(null)}
          />
          <div className="upload-arrow">
            <div className="arrow-line" />
            <span className="arrow-label">vs</span>
            <div className="arrow-line" />
          </div>
          <FileZone
            label="SICONFI Homologado"
            subtitle="Arquivo exportado do SICONFI após transmissão"
            file={homologado}
            onFile={setHomologado}
            onClear={() => setHomologado(null)}
          />
        </div>

        {!selectedPrefeitura && (rascunho || homologado) && (
          <div className="upload-warn">
            <Info size={13} />
            <span>Selecione a prefeitura antes de processar.</span>
          </div>
        )}

        <button
          className={`btn-process ${ready ? 'btn-process--ready' : ''}`}
          disabled={!ready}
          onClick={() => onSubmit({ rascunho, homologado })}
        >
          <span>Gerar planilha conciliada</span>
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="upload-info">
        <Info size={14} />
        <span>
          A planilha gerada é uma <strong>cópia fiel do rascunho</strong> com as células divergentes
          destacadas por cor e nível de criticidade. Passe o cursor sobre cada célula para ver
          os valores detalhados.
        </span>
      </div>

      <HowItWorks />
    </div>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Selecione a prefeitura', desc: 'Escolha o município para vincular o resultado ao histórico' },
    { n: '02', title: 'Upload dos arquivos', desc: 'Envie o rascunho MSC e o arquivo homologado no SICONFI' },
    { n: '03', title: 'Algoritmo de conciliação', desc: 'O sistema compara célula a célula, preservando o layout original' },
    { n: '04', title: 'Download imediato', desc: 'Planilha .xlsx pronta com divergências marcadas por criticidade' },
  ]

  return (
    <div className="how-card">
      <h2 className="how-title">Como funciona</h2>
      <div className="how-steps">
        {steps.map(s => (
          <div className="how-step" key={s.n}>
            <div className="how-n">{s.n}</div>
            <div className="how-content">
              <div className="how-step-title">{s.title}</div>
              <div className="how-step-desc">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <Legend />
    </div>
  )
}

function Legend() {
  const items = [
    { color: '#ff3333', label: 'Crítica',       desc: '> 20%' },
    { color: '#ffaa00', label: 'Significativa', desc: '5–20%' },
    { color: '#e6c800', label: 'Moderada',      desc: '1–5%' },
    { color: '#2e9e50', label: 'Baixa',         desc: '< 1%' },
    { color: '#86c98b', label: 'Mínima',        desc: 'centavos' },
    { color: '#2196f3', label: 'Ausente',       desc: 'campo faltando' },
  ]

  return (
    <div className="legend">
      <div className="legend-title">Escala de criticidade</div>
      <div className="legend-items">
        {items.map(i => (
          <div className="legend-item" key={i.label}>
            <div className="legend-dot" style={{ background: i.color }} />
            <div>
              <div className="legend-label">{i.label}</div>
              <div className="legend-desc">{i.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
