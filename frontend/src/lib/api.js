const BASE = 'https://rgf-production.up.railway.app'

function getToken() {
  return localStorage.getItem('kora_token')
}

function authHeaders(extra = {}) {
  const token = getToken()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: authHeaders(options.headers),
  })

  if (res.status === 401) {
    localStorage.removeItem('kora_token')
    window.location.href = '/login'
    throw new Error('Sessão expirada')
  }

  return res
}

export const api = {
  get: (path) => request(path),

  post: (path, body) =>
    request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  put: (path, body) =>
    request(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  patch: (path, body) =>
    request(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  delete: (path) => request(path, { method: 'DELETE' }),

  // Para form-data (upload de arquivos) — sem Content-Type: o browser define o boundary
  upload: (path, formData) =>
    request(path, {
      method: 'POST',
      body: formData,
    }),
}
