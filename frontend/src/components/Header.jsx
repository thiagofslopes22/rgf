import './Header.css'

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <div className="logo-mark">
            <span>K</span>
          </div>
          <div className="logo-text">
            <span className="logo-product">RGF Conciliador</span>
            <span className="logo-by">by Kora</span>
          </div>
        </div>
        <div className="header-badge">
          <span className="badge-dot" />
          Algoritmo de conciliação fiscal automatizada
        </div>
      </div>
    </header>
  )
}
