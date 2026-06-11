import { useState } from 'react'
import Sidebar from './Sidebar'
import logoBlanca from '../assets/logo-branca.svg'
import './Layout.css'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="layout-body">
        {/* Mobile top bar */}
        <div className="layout-topbar">
          <button className="layout-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <span /><span /><span />
          </button>
          <img src={logoBlanca} alt="Kora" className="topbar-logo-img" />
        </div>

        <main className="layout-main">{children}</main>

        <footer className="layout-footer">
          <span>Kora · Plataforma de Auditoria Contábil Municipal</span>
          <span>© 2025 Kora</span>
        </footer>
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="layout-backdrop" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
