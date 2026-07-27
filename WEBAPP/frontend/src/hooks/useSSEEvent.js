import { useEffect } from 'react'
import { on, off } from '../services/sseService'

/**
 * Subscribe to a named SSE event for the lifetime of the calling component.
 *
 * @param {string}   eventType - SSE event name (e.g. 'scenarios_changed')
 * @param {Function} handler   - stable reference strongly recommended (useCallback)
 */
export function useSSEEvent(eventType, handler) {
  useEffect(() => {
    on(eventType, handler)
    return () => off(eventType, handler)
  }, [eventType, handler])
}
