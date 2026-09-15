import { useEffect, useMemo, useRef, useState } from 'react'
import './WeekSelector.css'

function parseISODate(iso) {
  if (!iso) return null
  const parts = iso.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

function formatISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfWeekMonday(date) {
  const out = new Date(date)
  const day = out.getDay()
  const diff = day === 0 ? -6 : 1 - day
  out.setDate(out.getDate() + diff)
  out.setHours(0, 0, 0, 0)
  return out
}

function endOfWeekSunday(date) {
  const monday = startOfWeekMonday(date)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(0, 0, 0, 0)
  return sunday
}

function buildCalendarWeeks(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)

  const gridStart = startOfWeekMonday(first)
  const gridEnd = endOfWeekSunday(last)
  const cursor = new Date(gridStart)

  const weeks = []
  while (cursor <= gridEnd) {
    const week = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

function isBefore(a, b) {
  return a.getTime() < b.getTime()
}

function isAfter(a, b) {
  return a.getTime() > b.getTime()
}

/**
 * WeekSelector lets users select a whole Monday-to-Sunday row.
 * It emits the Monday ISO date to preserve existing backend logic.
 */
export default function WeekSelector({ label = 'Settimana', value, onChange, minDate, maxDate, className = '' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const [manualVisibleMonth, setManualVisibleMonth] = useState(null)

  const selectedMonday = useMemo(() => {
    const date = parseISODate(value)
    return date ? startOfWeekMonday(date) : null
  }, [value])

  const baseVisibleMonth = useMemo(() => {
    if (selectedMonday) return new Date(selectedMonday.getFullYear(), selectedMonday.getMonth(), 1)
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }, [selectedMonday])

  const visibleMonth = manualVisibleMonth || baseVisibleMonth

  useEffect(() => {
    if (!open) return

    function onDocClick(e) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target)) setOpen(false)
    }

    function onEsc(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const min = parseISODate(minDate)
  const max = parseISODate(maxDate)

  const weeks = useMemo(() => buildCalendarWeeks(visibleMonth), [visibleMonth])

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(visibleMonth),
    [visibleMonth],
  )

  const weekdayLabel = useMemo(
    () => ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
    [],
  )

  const rangeLabel = useMemo(() => {
    if (!selectedMonday) return 'Seleziona settimana'
    const sunday = endOfWeekSunday(selectedMonday)
    const fmt = new Intl.DateTimeFormat(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    return `${fmt.format(selectedMonday)} - ${fmt.format(sunday)}`
  }, [selectedMonday])

  const prevMonth = () => {
    const source = manualVisibleMonth || baseVisibleMonth
    setManualVisibleMonth(new Date(source.getFullYear(), source.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    const source = manualVisibleMonth || baseVisibleMonth
    setManualVisibleMonth(new Date(source.getFullYear(), source.getMonth() + 1, 1))
  }

  const isWeekDisabled = week => {
    const monday = week[0]
    const sunday = week[6]

    if (min && isBefore(sunday, min)) return true
    if (max && isAfter(monday, max)) return true
    return false
  }

  const sameDay = (a, b) => a && b && formatISODate(a) === formatISODate(b)

  const handleWeekClick = week => {
    if (isWeekDisabled(week)) return
    const monday = startOfWeekMonday(week[0])
    setManualVisibleMonth(null)
    onChange(formatISODate(monday))
    setOpen(false)
  }

  return (
    <div className={`wk-sel${className ? ` ${className}` : ''}`} ref={rootRef}>
      <span className="wk-sel__lbl">{label}</span>
      <button
        type="button"
        className="wk-sel__trigger"
        onClick={() => {
          setOpen(v => {
            const next = !v
            if (next) setManualVisibleMonth(null)
            return next
          })
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="wk-sel__value">{rangeLabel}</span>
        <span className="wk-sel__chev" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="wk-sel__panel" role="dialog" aria-label="Selettore settimana">
          <div className="wk-sel__head">
            <button type="button" className="wk-sel__nav" onClick={prevMonth} aria-label="Mese precedente">‹</button>
            <strong className="wk-sel__month">{monthLabel}</strong>
            <button type="button" className="wk-sel__nav" onClick={nextMonth} aria-label="Mese successivo">›</button>
          </div>

          <table className="wk-sel__cal" role="grid">
            <thead>
              <tr>
                {weekdayLabel.map(day => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, idx) => {
                const disabled = isWeekDisabled(week)
                const selected = selectedMonday && sameDay(startOfWeekMonday(week[0]), selectedMonday)
                return (
                  <tr
                    key={`${formatISODate(week[0])}-${idx}`}
                    className={`wk-sel__week${selected ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`}
                    onClick={() => handleWeekClick(week)}
                    role="row"
                    aria-selected={selected}
                  >
                    {week.map(day => {
                      const outOfMonth = day.getMonth() !== visibleMonth.getMonth()
                      return (
                        <td key={formatISODate(day)} className={outOfMonth ? 'is-out' : ''}>
                          {day.getDate()}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
