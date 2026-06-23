import { useApp } from '../../context/useApp'
import './Topbar.css'

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/simulazione': 'Simulazione WhatIF',
  '/scenari': 'Scenari Salvati',
  '/programmazione': 'Programmazione Settimanale',
}

export default function Topbar({ pathname }) {
  const { state } = useApp()
  const title = PAGE_TITLES[pathname] ?? 'RAI WhatIF'

  const showCtx = pathname === '/simulazione' && (state.ch || state.date || state.prog)

  return (
    <header className="topbar">
      <div className="tb-title">{title}</div>
      {showCtx && (
        <div className="tb-ctx">
          {state.ch && <span className="ctx-pill on">{state.ch}</span>}
          {state.ch && state.date && <span className="ctx-sep">›</span>}
          {state.date && <span className="ctx-pill on">{state.date}</span>}
          {state.date && state.prog && <span className="ctx-sep">›</span>}
          {state.prog && <span className="ctx-pill on">{state.prog.title}</span>}
        </div>
      )}
    </header>
  )
}

