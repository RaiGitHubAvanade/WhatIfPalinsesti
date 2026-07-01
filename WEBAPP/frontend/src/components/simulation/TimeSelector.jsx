import { useState, useRef, useEffect } from 'react'
import './TimeSelector.css'

/** Broadcast day: 06:00, 06:30 … 23:30, 00:00, 00:30, 01:00, 01:30, 02:00 */
const SLOTS = [
  ...Array.from({ length: 36 }, (_, i) => {
    const h = Math.floor(i / 2) + 6
    const m = i % 2 === 0 ? '00' : '30'
    return `${String(h).padStart(2, '0')}:${m}`
  }),
  '00:00', '00:30', '01:00', '01:30', '02:00',
]

export function TimePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const selectedRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Scroll selected option into view when opening
  useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'center' })
    }
  }, [open])

  return (
    <div className="tp-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`tp-trigger${value ? ' tp-trigger--set' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {value || '--'}
      </button>
      {open && (
        <div className="tp-dropdown">
          <div
            className="tp-option tp-option--empty"
            onClick={() => { onChange(''); setOpen(false) }}
          >--</div>
          {SLOTS.map(s => (
            <div
              key={s}
              ref={value === s ? selectedRef : null}
              className={`tp-option${value === s ? ' tp-option--sel' : ''}`}
              onClick={() => { onChange(s); setOpen(false) }}
            >{s}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TimeSelector({
  fromTime = '',
  toTime = '',
  onFromChange,
  onToChange,
  hasClear = false,
  onClear,
}) {
  return (
    <div className="time-sel">
      <span className="time-sel__lbl">Orario</span>
      <div className="time-sel__row">
        <span className="time-sel__unit">Da</span>
        <TimePicker value={fromTime} onChange={onFromChange} />
        <span className="time-sel__unit">A</span>
        <TimePicker value={toTime} onChange={onToChange} />
        {hasClear && onClear && (
          <button className="time-sel__clear" onClick={onClear} type="button">×</button>
        )}
      </div>
    </div>
  )
}
