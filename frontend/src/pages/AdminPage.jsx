import { useState, useEffect, useRef } from 'react'
import { UserPlus, PowerOff, Shield, User, AlertCircle, Building2, ChevronDown, Check, X } from 'lucide-react'
import { api } from '../lib/api'
import './AdminPage.css'

const EMPTY_FORM = { nome: '', email: '', senha: '', role: 'auditor', prefeitura_ids: [] }

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [prefeituras, setPrefeituras] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await api.get('/auth/usuarios')
      if (res.ok) setUsers(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    api.get('/prefeituras').then(r => r.ok ? r.json() : []).then(setPrefeituras).catch(() => {})
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function togglePrefeitura(id) {
    setForm(f => ({
      ...f,
      prefeitura_ids: f.prefeitura_ids.includes(id)
        ? f.prefeitura_ids.filter(x => x !== id)
        : [...f.prefeitura_ids, id],
    }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)
    try {
      const payload = {
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        role: form.role,
        prefeitura_ids: form.role === 'auditor' ? form.prefeitura_ids : [],
      }
      const res = await api.post('/auth/usuarios', payload)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Erro ao criar usuário')
      }
      setForm(EMPTY_FORM)
      setDropdownOpen(false)
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

  const selectedPrefs = prefeituras.filter(p => form.prefeitura_ids.includes(p.id))
  const formValid = form.nome.trim() && form.email.trim() && form.senha.trim() &&
    (form.role !== 'auditor' || form.prefeitura_ids.length > 0)

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
                  onChange={e => setForm(f => ({ ...f, role: e.target.value, prefeitura_ids: [] }))}
                >
                  <option value="auditor">Auditor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            {/* Multi-select prefeituras — only for auditors */}
            {form.role === 'auditor' && (
              <div className="admin-field admin-field--prefeitura" ref={dropdownRef}>
                <label className="admin-label">
                  <Building2 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Prefeituras
                  <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className={`admin-pref-trigger ${selectedPrefs.length > 0 ? 'admin-pref-trigger--selected' : ''}`}
                    onClick={() => setDropdownOpen(o => !o)}
                  >
                    <span className="admin-pref-label">
                      {selectedPrefs.length === 0
                        ? 'Selecionar prefeituras…'
                        : selectedPrefs.length === 1
                          ? selectedPrefs[0].nome
                          : `${selectedPrefs.length} prefeituras selecionadas`}
                    </span>
                    <ChevronDown size={13} className={dropdownOpen ? 'chevron-open' : ''} />
                  </button>

                  {dropdownOpen && (
                    <div className="admin-pref-dropdown">
                      {prefeituras.length === 0 ? (
                        <div className="admin-pref-empty">Nenhuma prefeitura cadastrada</div>
                      ) : (
                        prefeituras.map(p => {
                          const checked = form.prefeitura_ids.includes(p.id)
                          return (
                            <button
                              key={p.id}
                              type="button"
                              className={`admin-pref-option ${checked ? 'admin-pref-option--active' : ''}`}
                              onClick={() => togglePrefeitura(p.id)}
                            >
                              <div className={`admin-pref-check ${checked ? 'admin-pref-check--on' : ''}`}>
                                {checked && <Check size={10} />}
                              </div>
                              <div>
                                <span className="admin-pref-nome">{p.nome}</span>
                                <span className="admin-pref-mun">{p.municipio} · {p.uf}</span>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Selected tags */}
                {selectedPrefs.length > 0 && (
                  <div className="admin-pref-tags">
                    {selectedPrefs.map(p => (
                      <span key={p.id} className="admin-pref-tag">
                        {p.nome}
                        <button type="button" onClick={() => togglePrefeitura(p.id)}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                  <th>Prefeituras</th>
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
                    <td className="admin-td-prefeituras">
                      {u.prefeituras && u.prefeituras.length > 0 ? (
                        <div className="admin-pref-list">
                          {u.prefeituras.map(p => (
                            <span key={p.id} className="admin-pref-badge">
                              {p.nome}
                              <span className="admin-pref-uf">{p.uf}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="admin-pref-none">—</span>
                      )}
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
