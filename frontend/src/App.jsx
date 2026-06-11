import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import ConciliacaoPage from './pages/ConciliacaoPage'
import AdminPage from './pages/AdminPage'
import PrefeituraPage from './pages/PrefeituraPage'
import Layout from './components/Layout'
import './App.css'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-loading" />
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <div className="app-loading" /> : user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout><HomePage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/conciliacao"
        element={
          <ProtectedRoute>
            <Layout><ConciliacaoPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/prefeituras"
        element={
          <ProtectedRoute adminOnly>
            <Layout><PrefeituraPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <ProtectedRoute adminOnly>
            <Layout><AdminPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
