import { NavLink } from 'react-router-dom'
import { useApp } from '../../context/useApp'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/', label: 'Home', ico: '🏠', exact: true },
  { to: '/simulazione', label: 'Simulazione', ico: '📈' },
  { to: '/scenari', label: 'Scenari', ico: '📋' },
  { to: '/programmazione', label: 'Programmazione Settimanale', ico: '📅' },
]

export default function Sidebar() {
  const { state } = useApp()
  const totalItems = Object.values(state.scenarios).reduce((acc, s) => acc + s.items.length, 0)

  return (
    <nav className="sidebar">
      <div className="sb-logo">
        <div className="sb-badge">RAI</div>
        <div>
          <div className="sb-name">WhatIF</div>
          <div className="sb-sub">Palinsesti</div>
        </div>
      </div>

      <div className="sb-nav">
        {NAV_ITEMS.map(({ to, label, ico, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => 'sb-item' + (isActive ? ' active' : '')}
          >
            <span className="ico">{ico}</span>
            <span>
              {label}
              {label === 'Scenari' && totalItems > 0 && (
                <span style={{ marginLeft: 6, background: 'rgba(255,255,255,.25)', borderRadius: 999, padding: '1px 7px', fontSize: 11, fontWeight: 900 }}>
                  {totalItems}
                </span>
              )}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

