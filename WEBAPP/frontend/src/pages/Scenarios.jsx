import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/useApp'
import ScenCard from '../components/scenarios/ScenCard'
import DaySelector from '../components/shared/DaySelector'
import SimulationTypeSelector from '../components/simulation/SimulationTypeSelector'
import TextInputFilter from '../components/shared/TextInputFilter'
import './Scenarios.css'

const SCEN_PER_PAGE = 3

export default function Scenarios() {
  const navigate = useNavigate()
  const { state, removeFromScenario, deleteScenario, setScenarioTitle } = useApp()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')   // '' | 'sostituzione' | 'spostamento'
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)

  // All non-empty scenarios sorted by createdAt descending
  const allScenarios = Object.entries(state.scenarios)
    .filter(([, sc]) => sc.items.length > 0)
    .map(([k, sc]) => ({ id: Number(k), sc }))
    .sort((a, b) => {
      const ta = a.sc.createdAt ? new Date(a.sc.createdAt).getTime() : 0
      const tb = b.sc.createdAt ? new Date(b.sc.createdAt).getTime() : 0
      return tb - ta
    })

  // Apply filters
  const filtered = allScenarios.filter(({ sc }) => {
    if (typeFilter && sc.type !== typeFilter) return false
    if (dateFilter) {
      const hasDate = sc.items.some(it => (it.date || it.spDestDay) === dateFilter)
      if (!hasDate) return false
    }
    if (search) {
      const q = search.toLowerCase()
      const titleMatch = (sc.title || sc.anchor?.title || '').toLowerCase().includes(q)
      const itemMatch = sc.items.some(it =>
        (it.result?.orig_title || '').toLowerCase().includes(q) ||
        (it.result?.cand_title || '').toLowerCase().includes(q) ||
        (it.result?.prog_title || '').toLowerCase().includes(q) ||
        (it.prog?.title || '').toLowerCase().includes(q) ||
        (it.cand?.title || '').toLowerCase().includes(q)
      )
      if (!titleMatch && !itemMatch) return false
    }
    return true
  })

  const hasAny = allScenarios.length > 0
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / SCEN_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * SCEN_PER_PAGE, currentPage * SCEN_PER_PAGE)
  const hasActiveFilter = !!(search || typeFilter || dateFilter)

  function resetFilters() {
    setSearch(''); setTypeFilter(''); setDateFilter(''); setPage(1)
  }

  function changePage(p) {
    setPage(Math.max(1, Math.min(p, totalPages)))
  }

  // Build visible page numbers with ellipsis gaps
  function buildPageNums(cur, tot) {
    const nums = []
    for (let p = 1; p <= tot; p++) {
      if (p === 1 || p === tot || (p >= cur - 2 && p <= cur + 2)) nums.push(p)
    }
    return nums
  }

  return (
    <div>
      <div className="page-sub">Visualizza e confronta le simulazioni salvate per ogni scenario. Ogni scenario può contenere fino a 3 simulazioni.</div>

      <div className="card scen-page-card">

        {/* ── Filter bar ── */}
        <div className="scen-filter-bar">
          <TextInputFilter
            label="Cerca"
            value={search}
            placeholder="Cerca scenario..."
            onChange={v => { setSearch(v); setPage(1) }}
          />

          <div className="scen-filter-sep" />

          <SimulationTypeSelector
            selected={typeFilter}
            onChange={v => { setTypeFilter(v); setPage(1) }}
          />

          <div className="scen-filter-sep" />

          <DaySelector
            label="Data messa in onda"
            value={dateFilter}
            onChange={v => { setDateFilter(v); setPage(1) }}
          />

          {hasActiveFilter && (
            <button className="scen-filter-reset" onClick={resetFilters}>✕ Azzera</button>
          )}

          <span className="scen-filter-count">
            {total} {total === 1 ? 'scenario' : 'scenari'}
          </span>
        </div>

        {/* ── Content ── */}
        {total === 0 ? (
          <div className="scen-empty-state">
            <div className="scen-empty-ico">📋</div>
            <div className="scen-empty-msg">
              {hasAny
                ? 'Nessun risultato per i filtri selezionati.'
                : 'Nessuno scenario salvato.'}
            </div>
          </div>
        ) : (
          <div className="scen-page-body">
            <div className="scen-cards-grid">
              {pageItems.map(({ id, sc }) => (
                <ScenCard
                  key={id}
                  scenId={id}
                  sc={sc}
                  onRemoveItem={idx => removeFromScenario(id, idx)}
                  onDelete={() => deleteScenario(id)}
                  onRename={title => setScenarioTitle(id, title)}
                  onAddSim={() => navigate('/simulazione')}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="scen-pagination">
                <button
                  className="scen-page-nav"
                  disabled={currentPage <= 1}
                  onClick={() => changePage(currentPage - 1)}
                >←</button>

                {buildPageNums(currentPage, totalPages).map((p, i, arr) => {
                  const gap = i > 0 && p - arr[i - 1] > 1
                  return (
                    <span key={p} style={{ display: 'contents' }}>
                      {gap && <span className="scen-page-ellipsis">…</span>}
                      <button
                        className={`scen-page-num${p === currentPage ? ' active' : ''}`}
                        onClick={() => changePage(p)}
                      >{p}</button>
                    </span>
                  )
                })}

                <button
                  className="scen-page-nav"
                  disabled={currentPage >= totalPages}
                  onClick={() => changePage(currentPage + 1)}
                >→</button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
