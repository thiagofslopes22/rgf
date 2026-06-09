import { useState } from 'react'
import Header from './components/Header.jsx'
import UploadStep from './components/UploadStep.jsx'
import ProcessingStep from './components/ProcessingStep.jsx'
import ResultStep from './components/ResultStep.jsx'
import './App.css'

export default function App() {
  const [step, setStep] = useState('upload') // upload | processing | result
  const [jobData, setJobData] = useState(null)

  function handleStartProcessing(files) {
    setStep('processing')
    conciliar(files)
  }

  async function conciliar({ rascunho, homologado }) {
    const form = new FormData()
    form.append('rascunho', rascunho)
    form.append('homologado', homologado)

    try {
      const res = await fetch('/api/conciliar', { method: 'POST', body: form })
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
    setStep('upload')
  }

  return (
    <div className="app">
      <Header />
      <main className="main">
        {step === 'upload'     && <UploadStep     onSubmit={handleStartProcessing} />}
        {step === 'processing' && <ProcessingStep />}
        {step === 'result'     && <ResultStep data={jobData} onReset={handleReset} />}
      </main>
      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <span>RGF Conciliador — Kora</span>
      <span>Pedro do Rosário / MA · 2025</span>
    </footer>
  )
}
