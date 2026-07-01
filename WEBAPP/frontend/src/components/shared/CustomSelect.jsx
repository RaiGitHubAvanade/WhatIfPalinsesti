import { useState, useRef, useEffect } from 'react'
import './CustomSelect.css'

/**
 * Styled custom select dropdown matching the TimePicker visual style.
 *
 * @param {Object}   props
 * @param {string}   props.value
 * @param {function} props.onChange   - Called with the selected value string
 * @param {{ value: string, label: string }[]} props.options
 */
export default function CustomSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const selectedRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [open])

  const current = options.find(o => o.value === value)

  return (
    <div className="csel-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`csel-trigger${value ? ' csel-trigger--set' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {current?.label ?? '—'}
      </button>
      {open && (
        <div className="csel-dropdown">
          {options.map(opt => (
            <div
              key={opt.value}
              ref={opt.value === value ? selectedRef : null}
              className={[
                'csel-option',
                opt.value === value ? 'csel-option--sel' : '',
                !opt.value ? 'csel-option--placeholder' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => { onChange(opt.value); setOpen(false) }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
