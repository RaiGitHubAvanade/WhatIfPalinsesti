import { useState, useRef, useEffect } from 'react'
import { BROADCAST_HOURS, MINUTE_OPTIONS } from '../../utils/constants'
import './TimeSelector.css'
import '../shared/FilterField.css'

/** Split "HH:MM" into { hour, minute }, or nulls when empty. */
function splitTime(value) {
  if (!value) return { hour: null, minute: null }
  const [hour, minute] = value.split(':')
  return { hour, minute }
}

/** Last hour of the broadcast day — only :00 is a valid minute past this hour. */
const CAP_HOUR = BROADCAST_HOURS[BROADCAST_HOURS.length - 1]

/** Default minute pre-filled the first time a filter is opened or an hour is picked. */
const DEFAULT_MINUTE = '30'

/**
 * Single wheel-style spinner: shows the previous/next value faded above/below
 * the selected value, steppable by scroll or by clicking a neighbor row, and
 * writable manually by clicking the current value to type a number directly.
 * Navigation is clamped (no wrap-around) at the start/end of `values`.
 */
function WheelField({ values, value, onChange, ariaLabel, disabled = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)
  const viewportRef = useRef(null)

  const idx = values.indexOf(value)
  const current = disabled ? (value ?? values[0]) : (idx >= 0 ? values[idx] : null)
  const prev = !disabled && idx > 0 ? values[idx - 1] : null
  const next = !disabled && idx >= 0 && idx < values.length - 1 ? values[idx + 1] : null

  function step(dir) {
    if (disabled) return
    const nextValue = idx < 0
      ? (dir > 0 ? values[0] : values[values.length - 1])
      : values[Math.min(values.length - 1, Math.max(0, idx + dir))]
    onChange(nextValue)
    // Keep the writable draft in sync so a later blur doesn't commit a stale typed value
    if (editing) setDraft(nextValue)
  }

  function beginEdit() {
    if (disabled) return
    setDraft(current ?? '')
    setEditing(true)
  }

  function commitEdit() {
    const parsed = Number.parseInt(draft, 10)
    const padded = Number.isNaN(parsed) ? null : String(parsed).padStart(2, '0')
    if (padded !== null && values.includes(padded)) onChange(padded)
    setEditing(false)
  }

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  // JSX onWheel is attached passively by React, so preventDefault() there is a
  // no-op — attach a native listener instead to actually stop page scrolling.
  useEffect(() => {
    const el = viewportRef.current
    if (!el || disabled) return
    function handleWheel(e) {
      e.preventDefault()
      step(e.deltaY > 0 ? 1 : -1)
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [idx, values, onChange, disabled, editing]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`tw-field${disabled ? ' tw-field--disabled' : ''}`}>
      <div className="tw-viewport" ref={viewportRef}>
        <button
          type="button"
          className="tw-row tw-row--prev"
          tabIndex={-1}
          disabled={disabled || prev === null}
          onMouseDown={e => e.preventDefault()}
          onClick={() => step(-1)}
        >{prev ?? ''}</button>
        {editing ? (
          <input
            ref={inputRef}
            className="tw-input"
            value={draft}
            onChange={e => setDraft(e.target.value.replace(/\D/g, '').slice(0, 2))}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
              else if (e.key === 'Escape') setEditing(false)
              else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1) }
              else if (e.key === 'ArrowDown') { e.preventDefault(); step(1) }
            }}
            inputMode="numeric"
            aria-label={ariaLabel}
          />
        ) : (
          <button type="button" className="tw-row tw-row--current" disabled={disabled} onClick={beginEdit} aria-label={ariaLabel}>
            {current ?? '--'}
          </button>
        )}
        <button
          type="button"
          className="tw-row tw-row--next"
          tabIndex={-1}
          disabled={disabled || next === null}
          onMouseDown={e => e.preventDefault()}
          onClick={() => step(1)}
        >{next ?? ''}</button>
      </div>
    </div>
  )
}

/** Two-wheel (hour | minute) picker with 1-minute granularity over the broadcast day. */
export function TimePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [draftHour, setDraftHour] = useState(null)
  const [draftMinute, setDraftMinute] = useState(null)
  const wrapRef = useRef(null)
  const dropdownRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Block page scroll while hovering the open popover (native listener — JSX
  // onWheel is passive and can't preventDefault the underlying page scroll).
  useEffect(() => {
    const el = dropdownRef.current
    if (!open || !el) return
    function blockScroll(e) { e.preventDefault() }
    el.addEventListener('wheel', blockScroll, { passive: false })
    return () => el.removeEventListener('wheel', blockScroll)
  }, [open])

  // Seed the draft hour/minute and open the popover; default to the first
  // value on the very first open so the trigger is never left ambiguous
  // (still removable via Cancella).
  function handleToggleOpen() {
    if (open) { setOpen(false); return }
    if (!value) {
      const defaultHour = BROADCAST_HOURS[0]
      setDraftHour(defaultHour)
      setDraftMinute(DEFAULT_MINUTE)
      onChange(`${defaultHour}:${DEFAULT_MINUTE}`)
    } else {
      const { hour, minute } = splitTime(value)
      setDraftHour(hour)
      setDraftMinute(minute)
    }
    setOpen(true)
  }

  function selectHour(h) {
    const nextMinute = h === CAP_HOUR ? '00' : (draftMinute ?? DEFAULT_MINUTE)
    setDraftHour(h)
    setDraftMinute(nextMinute)
    onChange(`${h}:${nextMinute}`)
  }

  function selectMinute(m) {
    const nextHour = draftHour ?? BROADCAST_HOURS[0]
    const nextMinute = nextHour === CAP_HOUR ? '00' : m
    setDraftMinute(nextMinute)
    setDraftHour(nextHour)
    onChange(`${nextHour}:${nextMinute}`)
  }

  function handleClear() {
    setDraftHour(null)
    setDraftMinute(null)
    onChange('')
    setOpen(false)
  }

  return (
    <div className="tp-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`tp-trigger filter-control filter-control--center${value ? ' tp-trigger--set' : ''}`}
        onClick={handleToggleOpen}
      >
        {value || '--:--'}
      </button>
      {open && (
        <div className="tp-dropdown" ref={dropdownRef}>
          <div className="tw-row-wrap">
            <WheelField values={BROADCAST_HOURS} value={draftHour} onChange={selectHour} ariaLabel="Ora" />
            <span className="tw-sep">:</span>
            <WheelField
              values={MINUTE_OPTIONS}
              value={draftMinute}
              onChange={selectMinute}
              ariaLabel="Minuti"
              disabled={draftHour === CAP_HOUR}
            />
          </div>
          <button type="button" className="tp-action-btn tp-action-btn--clear" onClick={handleClear}>✕ Cancella</button>
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
    <div className="filter-field">
      <span className="filter-field__label">Orario</span>
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
