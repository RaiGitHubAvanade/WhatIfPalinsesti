import { useEffect, useRef, useState } from 'react'
import './PaginationNav.css'

function buildPageItems(currentPage, totalPages) {
  return Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(n => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 2)
    .reduce((acc, n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) acc.push('ELLIPSIS')
      acc.push(n)
      return acc
    }, [])
}

/**
 * Compact pagination navigation with optional range summary.
 *
 * @param {Object} props
 * @param {number} props.currentPage
 * @param {number} props.totalPages
 * @param {(page: number) => void} props.onPageChange
 * @param {number} [props.rangeStart]
 * @param {number} [props.rangeEnd]
 * @param {number} [props.totalItems]
 * @param {number[]} [props.pageSizeOptions]
 * @param {number} [props.pageSizeValue]
 * @param {(value: number) => void} [props.onPageSizeChange]
 * @param {string} [props.pageSizeLabel]
 */
export default function PaginationNav({
  currentPage,
  totalPages,
  onPageChange,
  rangeStart,
  rangeEnd,
  totalItems,
  pageSizeOptions,
  pageSizeValue,
  onPageSizeChange,
  pageSizeLabel = 'Elementi per pagina',
}) {
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false)
  const fieldRef = useRef(null)
  const dropdownRef = useRef(null)
  const openRows = Math.min(pageSizeOptions?.length ?? 1, 6)

  useEffect(() => {
    if (!isPageSizeOpen) return undefined

    const onPointerDown = e => {
      if (!fieldRef.current) return
      if (!fieldRef.current.contains(e.target)) setIsPageSizeOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [isPageSizeOpen])

  useEffect(() => {
    if (isPageSizeOpen) dropdownRef.current?.focus()
  }, [isPageSizeOpen])

  const hasPageSize =
    Array.isArray(pageSizeOptions)
    && pageSizeOptions.length > 0
    && typeof onPageSizeChange === 'function'
  const hasRange =
    Number.isFinite(rangeStart)
    && Number.isFinite(rangeEnd)
    && Number.isFinite(totalItems)
  const hasPagination = totalPages > 1

  if (!hasPagination && !hasPageSize && !hasRange) return null

  const items = hasPagination ? buildPageItems(currentPage, totalPages) : []

  return (
    <div className="pnav">
      {hasPagination && (
        <div className="pnav-center">
          <button
            className="pnav-nav"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            ←
          </button>

          {items.map((item, i) => (
            item === 'ELLIPSIS'
              ? <span key={`ell-${i}`} className="pnav-ell">…</span>
              : (
                <button
                  key={item}
                  className={`pnav-num${currentPage === item ? ' active' : ''}`}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </button>
              )
          ))}

          <button
            className="pnav-nav"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            →
          </button>
          {hasRange && (
            <span className="pnav-info">{rangeStart}–{rangeEnd} di {totalItems}</span>
          )}
        </div>
      )}

      {(hasPageSize || hasRange) && (
        <div className="pnav-right">

          {hasPageSize && (
            <label className="pnav-size" htmlFor="pnav-size-select">
              <span className="pnav-size-label">{pageSizeLabel}</span>
              <span className="pnav-size-field" ref={fieldRef}>
                <select
                  id="pnav-size-select"
                  className="pnav-size-select"
                  value={String(pageSizeValue ?? pageSizeOptions[0])}
                  onMouseDown={e => {
                    e.preventDefault()
                    setIsPageSizeOpen(true)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setIsPageSizeOpen(true)
                    }
                  }}
                >
                  {pageSizeOptions.map(opt => (
                    <option key={opt} value={String(opt)}>{opt}</option>
                  ))}
                </select>

                {isPageSizeOpen && (
                  <select
                    ref={dropdownRef}
                    className="pnav-size-dropdown"
                    value={String(pageSizeValue ?? pageSizeOptions[0])}
                    size={openRows}
                    onBlur={() => setIsPageSizeOpen(false)}
                    onChange={e => {
                      onPageSizeChange(Number.parseInt(e.target.value, 10))
                      setIsPageSizeOpen(false)
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Escape') setIsPageSizeOpen(false)
                    }}
                  >
                    {pageSizeOptions.map(opt => (
                      <option key={opt} value={String(opt)}>{opt}</option>
                    ))}
                  </select>
                )}
              </span>
            </label>
          )}
        </div>
      )}
    </div>
  )
}
