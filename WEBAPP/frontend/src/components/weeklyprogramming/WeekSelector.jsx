import './WeekSelector.css'

/** Returns the ISO date string (YYYY-MM-DD) of the Sunday of the current week. */
function getCurrentWeekSunday() {
  const today = new Date()
  const dow = today.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToSunday = dow === 0 ? 0 : 7 - dow
  const sunday = new Date(today)
  sunday.setDate(today.getDate() + daysToSunday)
  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`
}

export default function WeekSelector({ value, onChange }) {
  const maxDate = getCurrentWeekSunday()

  return (
    <div className="pw-ctrl-group">
      <div className="pw-ctrl-label">Settimana</div>
      <input
        type="date"
        className="pw-date-input"
        value={value}
        max={maxDate}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}
