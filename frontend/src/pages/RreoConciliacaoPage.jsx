import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import UploadStep from '../components/UploadStep'
import ProcessingStep from '../components/ProcessingStep'
import RreoResultStep from '../components/RreoResultStep'

const TITULO = 'Conciliação RREO'
const DESCRICAO = 'Envie o rascunho gerado pela MSC e o arquivo homologado no SICONFI. ' +
  'O sistema compara célula a célula todos os anexos do RREO e gera dois arquivos: ' +
  'a planilha com as divergências destacadas no layout original e um relatório de auditoria ' +
  'com identidade visual Kora, pronto para apresentação e arquivamento.'

export default function RreoConciliacaoPage() {
  const [step, setStep] = useState('upload')
  const [jobData, setJobData] = useState(null)
  const [prefeituras, setPrefeituras] = useState([])
  const [selectedPrefeitura, setSelectedPrefeitura] = useState(null)

  useEffect(() => {
    api.get('/prefeituras?ativo=true')
      .then(r => r.ok ? r.json() : [])
      .then(data => setPrefeituras(data))
      .catch(() => {})
  }, [])

  function handleStartProcessing(files) {
    setStep('processing')
    conciliar(files)
  }

  async function conciliar({ rascunho, homologado }) {
    const form = new FormData()
    form.append('rascunho_msc', rascunho)
    form.append('siconfi_homologado', homologado)
    form.append('prefeitura_id', selectedPrefeitura.id)

    try {
      const res = await api.upload('/conciliar-rreo', form)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Erro no processamento' }))
        throw new Error(err.detail || 'Erro no processamento')
      }
      const data = await res.json()
      setJobData(data)
      setStep('result')
    } catch (e) {
      alert('Erro: ' + e.message)
      setStep('upload')
    }
  }

  function handleReset() {
    setJobData(null)
    setSelectedPrefeitura(null)
    setStep('upload')
  }

  return (
    <>
      {step === 'upload' && (
        <UploadStep
          onSubmit={handleStartProcessing}
          prefeituras={prefeituras}
          selectedPrefeitura={selectedPrefeitura}
          onPrefeituraChange={setSelectedPrefeitura}
          titulo={TITULO}
          descricao={DESCRICAO}
          btnLabel="Gerar conciliação RREO"
        />
      )}
      {step === 'processing' && <ProcessingStep />}
      {step === 'result' && <RreoResultStep data={jobData} onReset={handleReset} />}
    </>
  )
}
