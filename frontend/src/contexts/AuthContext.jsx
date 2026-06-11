import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('kora_token')
    if (!token) { setLoading(false); return }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setUser(data)
        else localStorage.removeItem('kora_token')
      })
      .catch(() => localStorage.removeItem('kora_token'))
      .finally(() => setLoading(false))
  }, [])

  function login(token, userData) {
    localStorage.setItem('kora_token', token)
    setUser(userData)
  }

  function logout() {
    localStorage.removeItem('kora_token')
    setUser(null)
  }

  function getToken() {
    return localStorage.getItem('kora_token')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
