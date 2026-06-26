import './Topbar.css'

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/simulazione': 'Simulazione WhatIF',
  '/scenari': 'Scenari Salvati',
  '/programmazione': 'Programmazione Settimanale',
}

export default function Topbar({ pathname }) {
  const title = PAGE_TITLES[pathname] ?? 'RAI WhatIF'

  return (
    <header className="topbar">
      <div className="tb-title">{title}</div>
    </header>
  )
}

