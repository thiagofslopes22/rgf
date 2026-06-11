import { useState, useEffect } from 'react'
import { UserPlus, PowerOff, Shield, User, AlertCircle } from 'lucide-react'
import { api } from '../lib/api'
import './AdminPage.css'

const EMPTY_FORM = { nome: '', email: '', senha: '', role: 'auditor' }

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await api.get('/auth/usuarios')
      if (res.ok) setUsers(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)
    try {
      const res = await api.post('/auth/usuarios', form)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Erro ao criar usuário')
      }
      setForm(EMPTY_FORM)
      await fetchUsers()
    } catch (e) {
      setFormError(e.message)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleToggle(u) {
    setTogglingId(u.id)
    try {
      await api.patch(`/auth/usuarios/${u.id}/toggle`)
      await fetchUsers()
    } finally {
      setTogglingId(null)
    }
  }

  const formValid = form.nome.trim() && form.email.trim() && form.senha.trim()

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1 className="admin-title">Usuários</h1>
        <p className="admin-subtitle">Gerencie quem tem acesso ao sistema.</p>
      </div>

      {/* Create form */}
      <div className="admin-card">
        <div className="admin-card-header">
          <UserPlus size={15} />
          <span>Adicionar usuário</span>
        </div>
        <form className="admin-form" onSubmit={handleCreate} noValidate>
          <div className="admin-form-row">
            <div className="admin-field">
              <label className="admin-label">Nome</label>
              <input
                className="admin-input"
                type="text"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome completo"
                required
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">E-mail</label>
              <input
                className="admin-input"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="usuario@email.com"
                required
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Senha</label>
              <input
                className="admin-input"
                type="password"
                value={form.senha}
                onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="admin-field admin-field--role">
              <label className="admin-label">Perfil</label>
              <div className="admin-select-wrap">
                <select
                  className="admin-select"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="auditor">Auditor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <button
              className="admin-btn-create"
              type="submit"
              disabled={formLoading || !formValid}
            >
              {formLoading ? 'Criando…' : 'Criar'}
            </button>
          </div>
          {formError && (
            <div className="admin-form-error">
              <AlertCircle size={13} />
              <span>{formError}</span>
            </div>
          )}
        </form>
      </div>

      {/* Users table */}
      <div className="admin-card">
        <div className="admin-card-header">
          <User size={15} />
          <span>Usuários cadastrados</span>
          <span className="admin-count">{users.length}</span>
        </div>

        {loading ? (
          <div className="admin-loading">Carregando…</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={!u.ativo ? 'admin-row--inactive' : ''}>
                    <td className="admin-td-user">
                      <div className="admin-avatar">{u.nome[0].toUpperCase()}</div>
                      <span>{u.nome}</span>
                    </td>
                    <td className="admin-td-email">{u.email}</td>
                    <td>
                      <span className={`admin-role-badge ${u.role === 'admin' ? 'admin-role-badge--admin' : ''}`}>
                        {u.role === 'admin' ? <Shield size={11} /> : <User size={11} />}
                        {u.role === 'admin' ? 'Administrador' : 'Auditor'}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-status ${u.ativo ? 'admin-status--ativo' : 'admin-status--inativo'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="admin-td-actions">
                      <button
                        className={`admin-btn-toggle ${u.ativo ? 'admin-btn-toggle--off' : 'admin-btn-toggle--on'}`}
                        onClick={() => handleToggle(u)}
                        disabled={togglingId === u.id}
                        title={u.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                      >
                        <PowerOff size={13} />
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
