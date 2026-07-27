/**
 * Singleton EventSource manager for Server-Sent Events.
 *
 * Usage:
 *   import { on, off } from './sseService'
 *   on('scenarios_changed', handler)
 *   off('scenarios_changed', handler)
 *
 * The connection opens lazily on the first subscription and stays open
 * for the lifetime of the tab.  EventSource reconnects automatically on
 * transient network errors; this module adds a manual reconnect for the
 * CLOSED state (e.g. server restart).
 *
 * Pass clientId as a query param so the server can auto-release edit locks
 * when this tab closes: `sseService.connect(clientId)`.
 */

const BASE_URL = import.meta.env.VITE_API_URL || ''

// eventType → Set<handler>
const _handlers = new Map()

// Stable per-type dispatcher references so addEventListener deduplication works
const _dispatchers = new Map()

let _es             = null
let _reconnectTimer = null
let _clientId       = ''

function _getDispatcher(eventType) {
  if (!_dispatchers.has(eventType)) {
    _dispatchers.set(eventType, (e) => {
      let data = {}
      try { data = JSON.parse(e.data) } catch { /* ignore malformed payload */ }
      _handlers.get(eventType)?.forEach(fn => {
        try { fn(data) } catch (err) { console.error('[SSE] handler error:', err) }
      })
    })
  }
  return _dispatchers.get(eventType)
}

function _connect() {
  if (_es) return
  if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null }

  const url = _clientId
    ? `${BASE_URL}/api/events?clientId=${encodeURIComponent(_clientId)}`
    : `${BASE_URL}/api/events`

  _es = new EventSource(url)

  for (const eventType of _handlers.keys()) {
    _es.addEventListener(eventType, _getDispatcher(eventType))
  }

  _es.onerror = () => {
    if (_es?.readyState === EventSource.CLOSED) {
      _es.close()
      _es = null
      _reconnectTimer = setTimeout(_connect, 5000)
    }
  }
}

/**
 * Set the client ID used in the SSE connection URL.
 * Call this once (e.g. from WeeklyProgramming) before the first subscription
 * if you need lock auto-release on tab close.  If the connection is already
 * open it will be replaced on the next reconnect.
 */
export function setClientId(id) {
  _clientId = id
}

/**
 * Subscribe to a named SSE event.
 * @param {string}   eventType
 * @param {Function} handler
 */
export function on(eventType, handler) {
  if (!_handlers.has(eventType)) {
    _handlers.set(eventType, new Set())
  }
  _handlers.get(eventType).add(handler)

  if (!_es || _es.readyState === EventSource.CLOSED) {
    _connect()
  } else if (_handlers.get(eventType).size === 1) {
    _es.addEventListener(eventType, _getDispatcher(eventType))
  }
}

/**
 * Unsubscribe from a named SSE event.
 * @param {string}   eventType
 * @param {Function} handler
 */
export function off(eventType, handler) {
  _handlers.get(eventType)?.delete(handler)
}
