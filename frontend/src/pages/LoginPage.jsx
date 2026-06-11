import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import logoBlanca from '../assets/logo-branca.svg'
import './LoginPage.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, senha })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Erro ao autenticar')
      }
      const data = await res.json()
      login(data.access_token, {
        id: data.id,
        nome: data.nome,
        email: data.email,
        role: data.role,
      })
      navigate('/', { replace: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      {/* Left brand panel */}
      <div className="login-brand">
        <div className="login-brand-inner">
          <img src={logoBlanca} alt="Kora" className="login-logo-img" />

          <div className="login-brand-spacer" />

          <div className="login-brand-body">
            <div className="login-brand-eyebrow">
              <span className="login-brand-eyebrow-line" />
              Plataforma de Auditoria
            </div>
            <h1 className="login-brand-title">
              Contábil<br />
              <em>Municipal</em>
            </h1>
            <p className="login-brand-desc">
              Automação de conciliação, auditoria e conformidade fiscal para municípios.
            </p>
          </div>

          <div className="login-brand-footer">
            <span>Kora</span>
            <span className="login-brand-dot">·</span>
            <span>© 2025</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
        <div className="login-form-inner">
          <div className="login-form-header">
            <h2 className="login-form-title">Entrar</h2>
            <p className="login-form-subtitle">Acesse com suas credenciais para continuar</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label className="login-label" htmlFor="email">E-mail</label>
              <input
                id="email"
                className="login-input"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="senha">Senha</label>
              <input
                id="senha"
                className="login-input"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="login-error" role="alert">{error}</div>
            )}

            <button className="login-btn" type="submit" disabled={loading || !email || !senha}>
              {loading ? 'Verificando…' : 'Entrar no sistema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
