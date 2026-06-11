import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileSpreadsheet, Users, Building2, ChevronDown, LogOut, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import logoBlanca from '../assets/logo-branca.svg'
import './Sidebar.css'

const CONCILIACOES = [
  {
    group: 'RGF Simplificado',
    items: [
      { label: 'MSC vs SICONFI', to: '/conciliacao', icon: FileSpreadsheet, available: true },
    ],
  },
  {
    group: 'Em breve',
    items: [
      { label: 'RREO vs Homologado', to: null, icon: Clock, available: false },
      { label: 'LRF vs Publicado',   to: null, icon: Clock, available: false },
    ],
  },
]

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const isAdmin = user?.role === 'admin'
  const avatarLetter = user?.nome?.[0]?.toUpperCase() || 'U'

  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img src={logoBlanca} alt="Kora" className="sidebar-logo-img" />
        <div className="sidebar-logo-sub">Auditoria Contábil Municipal</div>
      </div>

      <div className="sidebar-divider" />

      {/* Navigation */}
      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `sidebar-item sidebar-item--home ${isActive ? 'sidebar-item--active' : ''}`}
          onClick={onClose}
        >
          <LayoutDashboard size={15} />
          <span>Início</span>
        </NavLink>

        <div className="sidebar-divider sidebar-divider--nav" />
        <div className="sidebar-section-label">Conciliações</div>

        {CONCILIACOES.map(group => (
          <div className="sidebar-group" key={group.group}>
            <button className="sidebar-group-btn">
              <ChevronDown size={13} className="sidebar-chevron" />
              <span>{group.group}</span>
            </button>
            <div className="sidebar-group-items">
              {group.items.map(item => {
                const Icon = item.icon
                if (!item.available) {
                  return (
                    <div className="sidebar-item sidebar-item--soon" key={item.label}>
                      <Icon size={15} />
                      <span>{item.label}</span>
                      <span className="sidebar-badge-soon">Em breve</span>
                    </div>
                  )
                }
                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    end
                    className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
                    onClick={onClose}
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}

        {isAdmin && (
          <>
            <div className="sidebar-divider sidebar-divider--nav" />
            <div className="sidebar-section-label">Administração</div>
            <NavLink
              to="/prefeituras"
              className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
              onClick={onClose}
            >
              <Building2 size={15} />
              <span>Prefeituras</span>
            </NavLink>
            <NavLink
              to="/admin/usuarios"
              className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
              onClick={onClose}
            >
              <Users size={15} />
              <span>Usuários</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">{avatarLetter}</div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{user?.nome}</span>
          <span className="sidebar-user-role">{user?.role === 'admin' ? 'Administrador' : 'Auditor'}</span>
        </div>
        <button className="sidebar-logout" onClick={handleLogout} title="Sair">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}
