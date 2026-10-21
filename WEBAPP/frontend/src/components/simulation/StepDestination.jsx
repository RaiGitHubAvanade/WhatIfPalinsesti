import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useApp } from '../../context/useApp'
import { getSchedulePrograms } from '../../services/apiSimulation'
import ChannelSelector from '../shared/ChannelSelector'
import DaySelector from '../shared/DaySelector'
import PaginationNav from '../shared/PaginationNav'
import { TimePicker } from './TimeSelector'
import '../shared/FilterField.css'
import ProgramRowBody from './ProgramRowBody'
import {
  CH_CLS,
  DEFAULT_PROGRAM_PAGE_SIZE as PAGE_SIZE,
  PROGRAM_PAGE_SIZE_OPTIONS,
} from '../../utils/constants'
import { durationMinutes, fmtDate, toMinutes } from '../../utils/dateUtils'
import { formatShare } from '../../utils/shareUtils'
import './StepDestination.css'

/** @typedef {import('../../models/simulation/destinationProgramViewModel').DestinationProgramViewModel} DestinationProgramViewModel */

export default function StepDestination() {
  const { state, set, toast } = useApp()
  const {
    spDestCh,
    spDestDay,
    spDestTime,
    spPreviousProgramId,
    spImpactedProgramIds,
    spNextProgramId,
    prog,
  } = state
  const today = new Date().toISOString().slice(0, 10)
  const maxDay = new Date(new Date(today).getTime() + 6 * 86400000).toISOString().slice(0, 10)

  const [schedule, setSchedule] = useState(/** @type {DestinationProgramViewModel[]} */ ([]))
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const requestSeqRef = useRef(0)
  const inFlightCountRef = useRef(0)

  const fetchSchedule = useCallback(async () => {
    if (!spDestDay) {
      setPage(1)
      setSchedule([])
      set({
        spPreviousProgramId: null,
        spImpactedProgramIds: [],
        spNextProgramId: null,
        spScheduleLoading: false,
        spScheduleLoadedDay: '',
      })
      inFlightCountRef.current = 0
      setLoading(false)
      return
    }

    const requestId = ++requestSeqRef.current
    inFlightCountRef.current += 1
    setLoading(true)
    set({ spScheduleLoading: true, spScheduleLoadedDay: '' })

    try {
      const data = await getSchedulePrograms({ day: spDestDay })
      if (requestId === requestSeqRef.current) {
        setSchedule(data || [])
        setPage(1)
      }
    } catch (e) {
      if (requestId === requestSeqRef.current) {
        setSchedule([])
        setPage(1)
      }
      toast(e.message || 'Errore caricamento palinsesto', 'error')
    } finally {
      inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1)
      const hasInFlight = inFlightCountRef.current > 0
      setLoading(hasInFlight)

      if (requestId === requestSeqRef.current) {
        set({
          spScheduleLoading: hasInFlight,
          spScheduleLoadedDay: spDestDay,
        })
      } else if (!hasInFlight) {
        set({ spScheduleLoading: false })
      }
    }
  }, [spDestDay]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(fetchSchedule, 0)
    return () => clearTimeout(t)
  }, [fetchSchedule])

  const contextSelection = useMemo(() => {
    const channelSchedule = schedule.filter((p) => !spDestCh || p.channel === spDestCh)

    if (!spDestTime) {
      return {
        programs: channelSchedule,
        previousProgramId: null,
        impactedProgramIds: [],
        nextProgramId: null,
      }
    }

    const targetStart = toMinutes(spDestTime)
    const targetDuration = (typeof prog?.duration_minutes === 'number' && prog.duration_minutes > 0)
      ? prog.duration_minutes
      : durationMinutes(prog?.from_time, prog?.to_time)

    if (targetStart === null || targetDuration === null || targetDuration <= 0) {
      return {
        programs: [],
        previousProgramId: null,
        impactedProgramIds: [],
        nextProgramId: null,
      }
    }
    const targetEnd = targetStart + targetDuration

    const entries = channelSchedule
      .map((program) => {
        const start = toMinutes(program.from_time)
        if (start === null) return null

        let end = toMinutes(program.to_time)
        if (end !== null && end <= start) end += 1440
        if (end === null && typeof program.duration_minutes === 'number' && program.duration_minutes > 0) {
          end = start + program.duration_minutes
        }
        if (end === null || end <= start) return null

        return { program, start, end }
      })
      .filter((entry) => entry !== null)
      .sort((a, b) => a.start - b.start)

    const overlapIndexes = entries
      .map((entry, idx) => (entry.start < targetEnd && entry.end > targetStart ? idx : -1))
      .filter((idx) => idx >= 0)

    if (overlapIndexes.length === 0) {
      return {
        programs: [],
        previousProgramId: null,
        impactedProgramIds: [],
        nextProgramId: null,
      }
    }

    const firstOverlapIdx = overlapIndexes[0]
    const lastOverlapIdx = overlapIndexes[overlapIndexes.length - 1]
    const includedIndexes = new Set(overlapIndexes)

    if (firstOverlapIdx > 0) includedIndexes.add(firstOverlapIdx - 1)
    if (lastOverlapIdx < entries.length - 1) includedIndexes.add(lastOverlapIdx + 1)

    const programs = entries
      .filter((_, idx) => includedIndexes.has(idx))
      .map((entry) => entry.program)
    const previousProgram = firstOverlapIdx > 0 ? entries[firstOverlapIdx - 1].program : null
    const nextProgram = lastOverlapIdx < entries.length - 1 ? entries[lastOverlapIdx + 1].program : null
    const impactedProgramIds = overlapIndexes
      .map((idx) => entries[idx].program?.id)
      .filter((id) => id !== null && id !== undefined && id !== '')
      .map((id) => String(id))

    return {
      programs,
      previousProgramId: previousProgram?.id ? String(previousProgram.id) : null,
      impactedProgramIds,
      nextProgramId: nextProgram?.id ? String(nextProgram.id) : null,
    }
  }, [schedule, spDestCh, spDestTime, prog])

  const filteredSchedule = contextSelection.programs

  useEffect(() => {
    const samePrevious = spPreviousProgramId === contextSelection.previousProgramId
    const sameNext = spNextProgramId === contextSelection.nextProgramId
    const sameImpacted =
      spImpactedProgramIds.length === contextSelection.impactedProgramIds.length
      && spImpactedProgramIds.every((id, idx) => id === contextSelection.impactedProgramIds[idx])

    if (!samePrevious || !sameImpacted || !sameNext) {
      set({
        spPreviousProgramId: contextSelection.previousProgramId,
        spImpactedProgramIds: contextSelection.impactedProgramIds,
        spNextProgramId: contextSelection.nextProgramId,
      })
    }
  }, [
    contextSelection,
    set,
    spPreviousProgramId,
    spImpactedProgramIds,
    spNextProgramId,
  ])

  const totalPages = Math.max(1, Math.ceil(filteredSchedule.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageItems = filteredSchedule.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div className="card psel-card">

      {/* Filter bar */}
      <div className="filter-bar filter-bar--card-top">
        {/* Date */}
        <DaySelector
          value={spDestDay || ''}
          minDate={today}
          maxDate={maxDay}
          onChange={val => set({ spDestDay: val })}
        />

        {/* Channel */}
        <ChannelSelector
          selected={spDestCh}
          onChange={c => set({ spDestCh: spDestCh === c ? null : c })}
        />

        {/* Time */}
        <div className="filter-field">
          <span className="filter-field__label">Orario</span>
          <TimePicker
            value={spDestTime || ''}
            onChange={val => set({ spDestTime: val || null })}
          />
        </div>
      </div>

      {/* Schedule preview */}
      {!spDestCh || !spDestDay || !spDestTime ? (
        <div className="dest-placeholder">
          Seleziona <strong>data</strong>, <strong>canale</strong> e <strong>orario</strong> di destinazione.
        </div>
      ) : loading ? (
        <div className="psel-loading">Caricamento…</div>
      ) : (
        <>
          <div className="psel-list-hdr psel-list-hdr-pad">
            <span className="psel-list-lbl">
              Palinsesto · {spDestCh}{spDestDay ? ` · ${fmtDate(spDestDay)}` : ''}
            </span>
            <span className="psel-list-cnt">
              Share Previsto
            </span>
          </div>

          {filteredSchedule.length === 0 ? (
            <p className="psel-empty">Nessun programma trovato in questo intervallo.</p>
          ) : (
            <div className="psel-list-body psel-list-readonly">
              <div className="psel-readonly-hint">
                ℹ️ Visualizzazione informativa del palinsesto per l&apos;intervallo selezionato
              </div>
              {pageItems.map((p) => {
                const sv = formatShare(p.share_predicted, '–')
                const cc = CH_CLS[p.channel] || ''

                return (
                  <div
                    key={p.id || `${p.channel || ''}_${p.from_time || ''}_${p.program_name || ''}`}
                    className={`prow prow-readonly${cc ? ' ' + cc : ''}`}
                  >
                    <span className="prow-time">
                      {p.from_time}
                      {p.to_time && <span className="prow-end"> - {p.to_time}</span>}
                    </span>
                    <ProgramRowBody program={p} channelClass={cc} />
                    <span className="prow-share">{sv}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {filteredSchedule.length > 0 && (
            <PaginationNav
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
              pageSizeValue={pageSize}
              pageSizeOptions={PROGRAM_PAGE_SIZE_OPTIONS}
              onPageSizeChange={value => {
                setPageSize(value)
                setPage(1)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
