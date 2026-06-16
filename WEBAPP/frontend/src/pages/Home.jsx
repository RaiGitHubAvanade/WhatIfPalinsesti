import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-wrap">
      <div className="home-greeting">RAI WhatIF Palinsesti v3.0</div>
      <h1 className="home-title">Benvenuto nel sistema di simulazione</h1>
      <p className="home-subtitle">
        Analizza l'impatto di cambiamenti nel palinsesto RAI prima di metterli in onda.
      </p>

      <div className="home-nav-grid">
        <div className="home-nav-card" onClick={() => navigate('/simulazione')}>
          <div className="home-nav-ico">🔄</div>
          <div className="home-nav-title">Simulazione WhatIF</div>
          <div className="home-sub-row">
            <span className="home-sub-tag">Sostituzione</span>
            <span className="home-sub-tag">Spostamento</span>
          </div>
          <div className="home-nav-desc">
            Seleziona un programma, scegli un'alternativa e visualizza lo share previsto con grafico comparativo.
          </div>
        </div>

        <div className="home-nav-card" onClick={() => navigate('/programmazione')}>
          <div className="home-nav-ico">📅</div>
          <div className="home-nav-title">Programmazione Settimanale</div>
          <div className="home-sub-row">
            <span className="home-sub-tag">Rai 1</span>
            <span className="home-sub-tag">Rai 2</span>
            <span className="home-sub-tag">Rai 3</span>
          </div>
          <div className="home-nav-desc">
            Visualizza e modifica il palinsesto settimanale dei canali RAI, confronta con i risultati Auditel.
          </div>
        </div>

        <div className="home-nav-card" onClick={() => navigate('/scenari')}>
          <div className="home-nav-ico">📋</div>
          <div className="home-nav-title">Scenari Salvati</div>
          <div className="home-sub-row">
            <span className="home-sub-tag">4 scenari</span>
            <span className="home-sub-tag">Confronto</span>
          </div>
          <div className="home-nav-desc">
            Gestisci fino a 4 scenari di simulazione salvati, con stampa e condivisione.
          </div>
        </div>

        <div className="home-nav-card" style={{ opacity: .7, cursor: 'default' }}>
          <div className="home-nav-ico">📊</div>
          <div className="home-nav-title">Analytics (Coming Soon)</div>
          <div className="home-sub-row">
            <span className="home-sub-tag">In sviluppo</span>
          </div>
          <div className="home-nav-desc">
            Report avanzati e analisi di tendenza del palinsesto RAI.
          </div>
        </div>
      </div>
    </div>
  )
}
