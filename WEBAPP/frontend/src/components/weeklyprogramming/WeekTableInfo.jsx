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
        <span>🟢 <strong>Verde</strong> = share reale &gt; previsto</span>
        <span>🔴 <strong>Rosso</strong> = share reale &lt; previsto</span>
        <span>🟡 <strong>Giallo</strong> = nessuna variazione</span>
      </div>
    </div>
  )
}
