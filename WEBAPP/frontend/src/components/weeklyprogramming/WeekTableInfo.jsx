import './WeekTableInfo.css'

export default function WeekTableInfo({ weekStart, weekLabel, wCh, onExport }) {
  return (
    <div className="pw-week-table-info">
      {weekStart && (
        <div className="pw-week-table-info-top">
          <span><strong>Canale:</strong> {wCh}</span>
          <span><strong>Settimana:</strong> {weekLabel}</span>
          <button className="scen-export-btn pw-export-btn" onClick={onExport}>
            Esporta Excel
          </button>
        </div>
      )}
      <div className="pw-week-table-legend">
        <span><strong>Previsto</strong> = Stima WhatIF</span>
        <span><strong>Manuale</strong> = Valore inserito dall'utente</span>
        <span><strong>Auditel</strong> = Valore osservato</span>
        <span><strong>Scostamento</strong> = Auditel - (Manuale o Previsto)</span>
      </div>
    </div>
  )
}
