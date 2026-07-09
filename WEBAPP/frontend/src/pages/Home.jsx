import { useNavigate } from 'react-router-dom'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-wrap">
      <h1 className="home-title">Benvenuto nel sistema di simulazione</h1>
      <p className="home-subtitle">
        Valuta gli effetti di modifiche alla programmazione RAI attraverso simulazioni comparative e analisi di scenari alternativi.
      </p>

      <div className="home-nav-grid">
        <div className="home-nav-card" onClick={() => navigate('/simulazione')}>
          <div className="home-nav-ico">📈</div>
          <div className="home-nav-title">Simulazione</div>
          <div className="home-sub-row">
            <span className="home-sub-tag">Sostituzione</span>
            <span className="home-sub-tag">Spostamento</span>
          </div>
          <div className="home-nav-desc">
            Simula modifiche alla programmazione attraverso sostituzioni e spostamenti di programma.
          </div>
        </div>

        <div className="home-nav-card" onClick={() => navigate('/scenari')}>
          <div className="home-nav-ico">📋</div>
          <div className="home-nav-title">Scenari</div>
          <div className="home-sub-row">
            <span className="home-sub-tag">Simulazioni</span>
            <span className="home-sub-tag">Confronto</span>
          </div>
          <div className="home-nav-desc">
            Consulta l'elenco delle simulazioni effettuate, analizzane i risultati e confronta scenari alternativi.
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
            Accedi alla pianficazione settimanale dei canali RAI, confrontala con l'offerta dei competitor e con i dati Auditel disponibili.
          </div>
        </div>

      </div>
    </div>
  )
}
