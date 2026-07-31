import { useEffect, useMemo, useRef, useState } from 'react'
import './ElementsPerPage.css'

/**
 * Native select with custom drop-up listbox behavior.
 *
 * @param {Object} props
 * @param {string} [props.id]
 * @param {string} [props.label]
 * @param {number|string} props.value
 * @param {number[]} props.options
 * @param {(value: number) => void} props.onChange
 */
export default function ElementsPerPage({
  id = 'elements-per-page-select',
  label = 'Elementi per pagina',
  value,
  options,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const fieldRef = useRef(null)
  const dropdownRef = useRef(null)

  const safeOptions = useMemo(
    () => (Array.isArray(options) ? options.filter(n => Number.isFinite(n) && n > 0) : []),
    [options],
  )
  const openRows = Math.min(safeOptions.length || 1, 6)

  useEffect(() => {
    if (!isOpen) return undefined

    const onPointerDown = e => {
      if (!fieldRef.current) return
      if (!fieldRef.current.contains(e.target)) setIsOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) dropdownRef.current?.focus()
  }, [isOpen])

  if (!safeOptions.length || typeof onChange !== 'function') return null

  const selectedValue = String(value ?? safeOptions[0])

  return (
    <label className="epp" htmlFor={id}>
      <span className="epp-label">{label}</span>
      <span className="epp-field" ref={fieldRef}>
        <select
          id={id}
          className="epp-select"
          value={selectedValue}
          onMouseDown={e => {
            e.preventDefault()
            setIsOpen(true)
          }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsOpen(true)
            }
          }}
        >
          {safeOptions.map(opt => (
            <option key={opt} value={String(opt)}>{opt}</option>
          ))}
        </select>

        {isOpen && (
          <select
            ref={dropdownRef}
            className="epp-dropdown"
            value={selectedValue}
            size={openRows}
            onBlur={() => setIsOpen(false)}
            onChange={e => {
              onChange(Number.parseInt(e.target.value, 10))
              setIsOpen(false)
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') setIsOpen(false)
            }}
          >
            {safeOptions.map(opt => (
              <option key={opt} value={String(opt)}>{opt}</option>
            ))}
          </select>
        )}
      </span>
    </label>
  )
}
