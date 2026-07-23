import { useEffect, useRef, useCallback } from 'react'
import { getSimulationsStatus } from '../services/apiScenarios'
import {
  hasRunningSimulations,
  getRunningSimulationIds,
  chunkArray,
  patchScenariosWithStatuses,
} from '../utils/scenarioUtils'
import { SCENARIOS_POLLING_BASE_MS, SCENARIOS_POLLING_MAX_MS } from '../utils/constants'

/**
 * Manages the background polling loop that updates simulation statuses.
 * Polls only when there are Running simulations; uses exponential back-off on errors.
 *
 * @param {object[]} scenariosData    - current scenarios array (from provider state)
 * @param {boolean}  scenariosLoaded  - whether the initial fetch has completed
 * @param {Function} setScenariosData - state setter for scenariosData
 */
export function useScenarioPolling(scenariosData, scenariosLoaded, setScenariosData) {
  const pollTimerRef      = useRef(null)
  const pollAbortRef      = useRef(null)
  const pollInFlightRef   = useRef(false)
  const pollSeqRef        = useRef(0)
  const pollErrorCountRef = useRef(0)

  const pollingActive = hasRunningSimulations(scenariosData)

  const clearResources = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    if (pollAbortRef.current) {
      pollAbortRef.current.abort()
      pollAbortRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!scenariosLoaded || !pollingActive) {
      clearResources()
      pollInFlightRef.current = false
      pollErrorCountRef.current = 0
      return
    }

    let cancelled = false

    const scheduleNextPoll = (delayMs) => {
      if (cancelled) return
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
      pollTimerRef.current = setTimeout(runPoll, delayMs)
    }

    const runPoll = async () => {
      if (cancelled) return
      if (pollInFlightRef.current) {
        scheduleNextPoll(SCENARIOS_POLLING_BASE_MS)
        return
      }

      pollInFlightRef.current = true
      const reqSeq = ++pollSeqRef.current

      const controller = new AbortController()
      pollAbortRef.current = controller

      try {
        const runningIds = getRunningSimulationIds(scenariosData)
        if (runningIds.length === 0) {
          pollErrorCountRef.current = 0
          return
        }

        const idChunks = chunkArray(runningIds, 200)
        const chunkResponses = await Promise.all(
          idChunks.map(ids => getSimulationsStatus(ids, { signal: controller.signal }))
        )
        const statusItems = chunkResponses.flatMap(res => res.items || [])

        setScenariosData(prev => patchScenariosWithStatuses(prev, statusItems))

        if (cancelled || reqSeq !== pollSeqRef.current) return

        pollErrorCountRef.current = 0
        scheduleNextPoll(SCENARIOS_POLLING_BASE_MS)
      } catch (e) {
        if (cancelled || e?.name === 'AbortError' || reqSeq !== pollSeqRef.current) return

        pollErrorCountRef.current += 1
        const expDelay = Math.min(
          SCENARIOS_POLLING_MAX_MS,
          SCENARIOS_POLLING_BASE_MS * (2 ** pollErrorCountRef.current),
        )
        const jitter = Math.floor(Math.random() * 500)
        scheduleNextPoll(expDelay + jitter)
      } finally {
        if (reqSeq === pollSeqRef.current) {
          pollInFlightRef.current = false
        }
      }
    }

    scheduleNextPoll(SCENARIOS_POLLING_BASE_MS)

    return () => {
      cancelled = true
      clearResources()
    }
  }, [scenariosData, scenariosLoaded, pollingActive, clearResources]) // eslint-disable-line react-hooks/exhaustive-deps

  // Failsafe: guarantee timer/abort cleanup when the provider unmounts
  useEffect(() => () => clearResources(), [clearResources])
}
