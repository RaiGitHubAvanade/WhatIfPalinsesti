import { NavLink } from 'react-router-dom'
import raiLogo from '../../assets/rai_logo.svg'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/', label: 'Home', ico: '🏠', exact: true },
  { to: '/programmazione', label: 'Programmazione Settimanale', ico: '📅' },
  { to: '/simulazione', label: 'Simulazione', ico: '📈' },
  { to: '/scenari', label: '📋 Scenari', ico: '└' },
]

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sb-logo">
        <div className="sb-badge">
          <img src={raiLogo} alt="RAI" className="sb-badge-logo" />
        </div>
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
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

