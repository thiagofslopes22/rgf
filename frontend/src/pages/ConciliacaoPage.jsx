import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import UploadStep from '../components/UploadStep'
import ProcessingStep from '../components/ProcessingStep'
import ResultStep from '../components/ResultStep'

export default function ConciliacaoPage() {
  const { getToken } = useAuth()
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
    form.append('rascunho', rascunho)
    form.append('homologado', homologado)
    form.append('prefeitura_id', selectedPrefeitura.id)

    try {
      const res = await api.upload('/conciliar', form)
      if (!res.ok) {
        const err = await res.json()
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
        />
      )}
      {step === 'processing' && <ProcessingStep />}
      {step === 'result'     && <ResultStep data={jobData} onReset={handleReset} getToken={getToken} />}
    </>
  )
}
