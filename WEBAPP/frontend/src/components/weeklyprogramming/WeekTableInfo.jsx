import './WeekTableInfo.css'

export default function WeekTableInfo({ weekStart, weekLabel, wCh }) {
  return (
    <div className="pw-week-table-info">
      {weekStart && (
        <div className="pw-week-table-info-top">
          <span><strong>Canale:</strong> {wCh}</span>
          <span><strong>Settimana:</strong> {weekLabel}</span>
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
