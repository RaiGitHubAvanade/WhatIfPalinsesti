import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/useApp'
import { getScenarios, deleteSimulation, deleteScenario } from '../services/apiScenarios'
import { retrySimulation } from '../services/apiSimulation'
import ScenCard from '../components/scenarios/ScenCard'
import SimulationDetail from '../components/scenarios/SimulationDetail'
import DaySelector from '../components/shared/DaySelector'
import SimulationTypeSelector from '../components/simulation/SimulationTypeSelector'
import TextInputFilter from '../components/shared/TextInputFilter'
import { exportScenariosToExcel } from '../utils/exportScenariosExcel'
import './Scenarios.css'

const SCEN_PER_PAGE = 3

/**
 * Map one API scenario to the display shape expected by ScenCard.
 * @param {import('../models/scenarios/scenarioViewModels').ScenarioViewModel} apiScen
 * @returns {{ id: string, sc: object }}
 */
function mapToDisplay(apiScen) {
  const {
    id, scenario_type, program_name, program_channel,
    program_date, program_from_time, program_share_predict,
    creation_date, simulations,
  } = apiScen

  const prog = {
    program_name,
    channel: program_channel,
    share_predicted: program_share_predict,
    from_time: program_from_time,
    date: program_date,
  }

  const items = simulations.map(sim => {
    const predicted = sim.share_result ?? null
    const delta =
      predicted !== null && program_share_predict !== null
        ? parseFloat((predicted - program_share_predict).toFixed(2))
        : null

    if (scenario_type === 'sostituzione') {
      return {
        mode: 'sostituzione',
        result: {
          mode: 'sostituzione',
          orig_title: program_name,
          orig_share: program_share_predict,
          orig_ch: program_channel,
          orig_time: program_from_time,
          orig_end: null,
          cand_title: sim.new_program_name,
          cand_share: sim.new_program_share_storico,
          predicted_share: predicted,
          delta,
        },
        prog,
        cand: { program_name: sim.new_program_name, share_storico: sim.new_program_share_storico },
        date: program_date,
        ch: program_channel,
        _status: sim.status,
        _sim_id: sim.id,
      }
    } else {
      return {
        mode: 'spostamento',
        result: {
          mode: 'spostamento',
          prog_title: program_name,
          orig_ch: program_channel,
          orig_date: program_date,
          orig_time: program_from_time,
          orig_end: null,
          orig_slot_share: program_share_predict,
          dest_ch: sim.new_channel,
          dest_date: sim.new_date,
          dest_time: sim.new_from_time,
          dest_slot_share: predicted,
          delta,
        },
        prog,
        date: program_date,
        ch: program_channel,
        spDestCh: sim.new_channel,
        spDestDay: sim.new_date,
        spDestTime: sim.new_from_time,
        _status: sim.status,
        _sim_id: sim.id,
      }
    }
  })

  return {
    id,
    sc: {
      items,
      anchor: prog,
      type: scenario_type,
      createdAt: creation_date,
      title: null,
    },
  }
}

export default function Scenarios() {
  const navigate = useNavigate()
  const { toast, set } = useApp()

  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState(null)

  const [refreshing, setRefreshing] = useState(false)

  // ── Fetch on mount ──
  useEffect(() => {
    let cancelled = false
    getScenarios()
      .then(data => { if (!cancelled) setScenarios((data.scenarios || []).map(mapToDisplay)) })
      .catch(e => { if (!cancelled) toast('Errore caricamento scenari: ' + e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const data = await getScenarios()
      setScenarios((data.scenarios || []).map(mapToDisplay))
    } catch (e) {
      toast('Errore caricamento scenari: ' + e.message)
    } finally {
      setRefreshing(false)
    }
}

  // ── Local-only mutations (display state only — no DB writes) ──────────
  async function handleDeleteScen(scenId) {
    try {
      await deleteScenario(scenId)
    } catch (e) {
      toast('Errore eliminazione scenario: ' + e.message)
      return
    }
    setScenarios(prev => prev.filter(item => item.id !== scenId))
  }

  function handleRename(scenId, title) {
    setScenarios(prev => prev.map(item =>
      item.id === scenId ? { ...item, sc: { ...item.sc, title } } : item
    ))
  }

  async function handleDeleteSim(scenId, simId, idx) {
    try {
      await deleteSimulation(simId)
      setScenarios(prev => prev
        .map(item =>
          item.id === scenId
            ? { ...item, sc: { ...item.sc, items: item.sc.items.filter((_, i) => i !== idx) } }
            : item
        )
        .filter(item => item.sc.items.length > 0)
      )
    } catch (e) {
      toast('Errore eliminazione: ' + e.message)
    }
  }

  async function handleRetrySim(simId) {
    try {
      await retrySimulation(simId)
      toast('Simulazione rilanciata.')
      // Refresh to show updated Running status
      await handleRefresh()
    } catch (e) {
      toast('Errore rilancio: ' + e.message)
    }
  }

  // ── Client-side filtering ─────────────────────────────────────────────
  const filtered = scenarios.filter(({ sc }) => {
    if (typeFilter && sc.type !== typeFilter) return false
    if (dateFilter) {
      const hasDate = sc.items.some(it => (it.date || it.spDestDay) === dateFilter)
      if (!hasDate) return false
    }
    if (search) {
      const q = search.toLowerCase()
      const titleMatch = (sc.title || sc.anchor?.program_name || '').toLowerCase().includes(q)
      const itemMatch = sc.items.some(it =>
        (it.result?.orig_title || '').toLowerCase().includes(q) ||
        (it.result?.cand_title || '').toLowerCase().includes(q) ||
        (it.result?.prog_title || '').toLowerCase().includes(q) ||
        (it.cand?.program_name || '').toLowerCase().includes(q) ||
        (it.result?.dest_ch || '').toLowerCase().includes(q)
      )
      if (!titleMatch && !itemMatch) return false
    }
    return true
  })

  const hasAny = scenarios.length > 0
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

  function buildPageNums(cur, tot) {
    const nums = []
    for (let p = 1; p <= tot; p++) {
      if (p === 1 || p === tot || (p >= cur - 2 && p <= cur + 2)) nums.push(p)
    }
    return nums
  }

  return (
    <div>
      {selectedItem && (
        <SimulationDetail item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
      {!selectedItem && (
      <>
      <div className="page-sub">Visualizza e confronta le simulazioni salvate per ogni scenario. Ogni scenario può contenere fino a 3 simulazioni.</div>

      <div className="card scen-page-card">

        {/* ── Filter bar ── */}
        <div className="scen-filter-bar">
          <TextInputFilter
            label="Cerca"
            value={search}
            placeholder="Cerca scenario..."
            onChange={v => { setSearch(v); setPage(1) }}
            className="scen-txt-filter"
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
            {loading ? '…' : `${total} ${total === 1 ? 'scenario' : 'scenari'}`}
          </span>

          <div className="scen-right-actions">
            <button
              className="scen-refresh-btn"
              onClick={() => handleRefresh()}
              disabled={refreshing}
            >
              {refreshing ? <span className="scen-spinner" /> : '↻'} Aggiorna
            </button>

            <button
              className="scen-export-btn"
              onClick={async () => {
                const result = await exportScenariosToExcel(
                  filtered,
                  { typeFilter, dateFilter, search },
                )
                if (!result.ok) {
                  if (result.reason === 'no_scenarios') {
                    toast('Nessuno scenario da esportare con i filtri selezionati.')
                  } else {
                    toast('Nessuna simulazione completata da esportare. Le simulazioni in corso potrebbero non essere ancora disponibili.')
                  }
                }
              }}
            >
              Esporta Excel
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="scen-empty-state">
            {/* <div className="scen-empty-ico">⏳</div> */}
            <div className="scen-empty-msg">Caricamento scenari…</div>
          </div>
        ) : total === 0 ? (
          <div className="scen-empty-state">
            {/* <div className="scen-empty-ico">📋</div> */}
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
                  onDelete={() => handleDeleteScen(id)}
                  onRename={title => handleRename(id, title)}
                  onAddSim={() => {
                    set({
                      prog: sc.anchor,
                      ch: sc.anchor.channel,
                      date: sc.anchor.date || '',
                      slot: sc.anchor.from_time ? `${sc.anchor.from_time.slice(0, 5)}-` : null,
                      mode: sc.type,
                      step: 2,
                    })
                    navigate('/simulazione', { state: { prefilled: true } })
                  }}
                  onViewDetail={item => setSelectedItem(item)}
                  onDeleteSim={(simId, idx) => handleDeleteSim(id, simId, idx)}
                  onRetrySim={simId => handleRetrySim(simId)}
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
      </>
      )}
    </div>
  )
}
