import { useState, useEffect } from 'react'
import { Building2, Plus, Pencil, PowerOff, Trash2, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'
import './PrefeituraPage.css'

const EMPTY_FORM = {
  nome: '',
  municipio: '',
  uf: '',
}

export default function PrefeituraPage() {
  const [prefeituras, setPrefeituras] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  async function fetchPrefeituras() {
    setLoading(true)
    try {
      const res = await api.get('/prefeituras')
      if (res.ok) setPrefeituras(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPrefeituras() }, [])

  function startEdit(p) {
    setEditId(p.id)
    setForm({
      nome: p.nome,
      municipio: p.municipio,
      uf: p.uf,
    })
    setFormError('')
    setFormSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setFormSuccess('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setFormLoading(true)
    try {
      const body = {
        nome: form.nome.trim(),
        municipio: form.municipio.trim(),
        uf: form.uf.trim().toUpperCase(),
      }

      let res
      if (editId) {
        res = await api.put(`/prefeituras/${editId}`, body)
      } else {
        res = await api.post('/prefeituras', body)
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Erro ao salvar')
      }

      setFormSuccess(editId ? 'Prefeitura atualizada com sucesso.' : 'Prefeitura cadastrada com sucesso.')
      cancelEdit()
      await fetchPrefeituras()
    } catch (e) {
      setFormError(e.message)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete(id) {
    setDeletingId(id)
    try {
      const res = await api.delete(`/prefeituras/${id}`)
      if (res.ok || res.status === 204) {
        setConfirmDeleteId(null)
        await fetchPrefeituras()
      } else {
        const data = await res.json().catch(() => ({}))
        setFormError(data.detail || 'Erro ao excluir prefeitura.')
        setConfirmDeleteId(null)
      }
    } catch {
      setFormError('Erro de conexão ao tentar excluir.')
      setConfirmDeleteId(null)
    } finally {
      setDeletingId(null)
    }
  }

  async function toggleAtivo(p) {
    setTogglingId(p.id)
    try {
      const res = await api.patch(`/prefeituras/${p.id}/toggle`)
      if (res.ok) await fetchPrefeituras()
    } finally {
      setTogglingId(null)
    }
  }

  const formValid = form.nome.trim() && form.municipio.trim() && form.uf.trim().length === 2

  return (
    <div className="pref-page">
      <div className="pref-header">
        <h1 className="pref-title">Prefeituras</h1>
        <p className="pref-subtitle">Gerencie os municípios monitorados pelo sistema.</p>
      </div>

      {/* Form card */}
      <div className="pref-card">
        <div className="pref-card-header">
          {editId ? <Pencil size={15} /> : <Plus size={15} />}
          <span>{editId ? 'Editar prefeitura' : 'Cadastrar nova prefeitura'}</span>
          {editId && (
            <button className="pref-cancel-btn" onClick={cancelEdit} title="Cancelar edição">
              <X size={14} />
            </button>
          )}
        </div>

        <form className="pref-form" onSubmit={handleSubmit} noValidate>
          <div className="pref-form-grid">
            <div className="pref-field pref-field--grow">
              <label className="pref-label">Nome da Prefeitura *</label>
              <input
                className="pref-input"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: Prefeitura Municipal de Paço do Lumiar"
                required
              />
            </div>

            <div className="pref-field pref-field--grow">
              <label className="pref-label">Município *</label>
              <input
                className="pref-input"
                value={form.municipio}
                onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))}
                placeholder="Ex.: Paço do Lumiar"
                required
              />
            </div>

            <div className="pref-field pref-field--sm">
              <label className="pref-label">UF *</label>
              <input
                className="pref-input pref-input--upper"
                value={form.uf}
                onChange={e => setForm(f => ({ ...f, uf: e.target.value.slice(0, 2) }))}
                placeholder="MA"
                maxLength={2}
                required
              />
            </div>

          </div>

          {formError && (
            <div className="pref-form-msg pref-form-msg--error">
              <AlertCircle size={13} />
              <span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="pref-form-msg pref-form-msg--success">
              <CheckCircle2 size={13} />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="pref-form-actions">
            <button
              className="pref-btn-submit"
              type="submit"
              disabled={formLoading || !formValid}
            >
              {formLoading ? 'Salvando…' : editId ? 'Salvar alterações' : 'Cadastrar prefeitura'}
            </button>
          </div>
        </form>
      </div>

      {/* Table card */}
      <div className="pref-card">
        <div className="pref-card-header">
          <Building2 size={15} />
          <span>Prefeituras cadastradas</span>
          <span className="pref-count">{prefeituras.length}</span>
        </div>

        {loading ? (
          <div className="pref-loading">Carregando…</div>
        ) : prefeituras.length === 0 ? (
          <div className="pref-empty">
            <Building2 size={32} />
            <p>Nenhuma prefeitura cadastrada ainda.</p>
            <p>Use o formulário acima para adicionar a primeira.</p>
          </div>
        ) : (
          <div className="pref-table-wrap">
            <table className="pref-table">
              <thead>
                <tr>
                  <th>Prefeitura</th>
                  <th>UF</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {prefeituras.map(p => (
                  <tr key={p.id} className={!p.ativo ? 'pref-row--inactive' : ''}>
                    <td>
                      <div className="pref-td-nome">
                        <span className="pref-nome">{p.nome}</span>
                        <span className="pref-mun">{p.municipio}</span>
                      </div>
                    </td>
                    <td>
                      <span className="pref-uf-badge">{p.uf}</span>
                    </td>
                    <td>
                      <span className={`pref-status ${p.ativo ? 'pref-status--ativo' : 'pref-status--inativo'}`}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="pref-td-actions">
                        <button
                          className="pref-action-btn"
                          onClick={() => startEdit(p)}
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className={`pref-action-btn ${p.ativo ? 'pref-action-btn--warn' : 'pref-action-btn--ok'}`}
                          onClick={() => toggleAtivo(p)}
                          disabled={togglingId === p.id}
                          title={p.ativo ? 'Desativar' : 'Reativar'}
                        >
                          <PowerOff size={13} />
                        </button>
                        {confirmDeleteId === p.id ? (
                          <div className="pref-confirm-delete">
                            <span className="pref-confirm-label">Excluir?</span>
                            <button
                              className="pref-action-btn pref-action-btn--danger"
                              onClick={() => handleDelete(p.id)}
                              disabled={deletingId === p.id}
                              title="Confirmar exclusão"
                            >
                              <Trash2 size={13} />
                            </button>
                            <button
                              className="pref-action-btn"
                              onClick={() => setConfirmDeleteId(null)}
                              title="Cancelar"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="pref-action-btn pref-action-btn--danger-idle"
                            onClick={() => setConfirmDeleteId(p.id)}
                            title="Excluir permanentemente"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
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
