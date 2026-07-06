import { useState } from 'react'
import './ScenCard.css'

/**
 * @typedef {import('../../models/simulation/simResultViewModels').SimResultSost} SimResultSost
 * @typedef {import('../../models/simulation/simResultViewModels').SimResultSposta} SimResultSposta
 */

function fmtDateShort(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/**
 * @param {{
 *   scenId: number,
 *   sc: { items: any[], anchor: any, type: string|null, createdAt: string|null, title: string|null },
 *   onRemoveItem: (idx: number) => void,
 *   onDelete: () => void,
 *   onRename: (title: string) => void,
 *   onAddSim: () => void,
 * }} props
 */
export default function ScenCard({ scenId, sc, onDelete, onRename, onAddSim, onViewDetail, onDeleteSim, onRetrySim }) {
  const [editing, setEditing] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [deletingSimId, setDeletingSimId] = useState(null)
  const [retryingSimId, setRetryingSimId] = useState(null)
  const [deletingScen, setDeletingScen] = useState(false)

  const isFull = sc.items.length >= 3
  const typeCls = sc.type === 'spostamento' ? 'spostamento' : 'sostituzione'
  const typeLabel = sc.type === 'spostamento' ? 'Spostamento' : sc.type === 'sostituzione' ? 'Sostituzione' : ''
  const displayTitle = sc.title || sc.anchor?.program_name || `Scenario ${scenId}`

  // Anchor datetime: combine first item date + anchor.time
  let anchorDateTime = '—'
  if (sc.anchor?.from_time) {
    const time = sc.anchor.from_time.slice(0, 5)
    anchorDateTime = sc.anchor.date ? `${sc.anchor.date} ${time}` : time
  }

  const createdTs = sc.createdAt
    ? new Date(sc.createdAt).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'

  function startEdit() {
    setTitleInput(displayTitle)
    setEditing(true)
  }

  function commitEdit() {
    const val = titleInput.trim()
    if (val && val !== displayTitle) onRename(val)
    setEditing(false)
  }

  return (
    <div className={`scen-hcard ${typeCls}`}>

      {/* ── Head: title + type badge ── */}
      <div className="scen-hcard-head">
        <div className="scen-hcard-title">
          {editing ? (
            <input
              className="scen-title-inp"
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') setEditing(false)
              }}
              autoFocus
            />
          ) : (
            <>
              <span>{displayTitle}</span>
              <button className="scen-icon-btn" onClick={startEdit} title="Rinomina scenario">✏️</button>
            </>
          )}
        </div>
        <div className="scen-hcard-badges">
          {typeLabel && <span className={`sc-type-badge ${typeCls}`}>{typeLabel}</span>}
        </div>
      </div>

      {/* ── Anchor meta ── */}
      <div className="scen-hcard-meta">
        {sc.anchor && (
          <div className="scen-hcard-anchor" title={sc.anchor.program_name}>
            🎯 {sc.anchor.program_name}
            {typeof sc.anchor.share_predicted === 'number' && (
              <span className="scen-anchor-share">{sc.anchor.share_predicted.toFixed(1)}%</span>
            )}
          </div>
        )}
        <div className="scen-hcard-date">📅 {anchorDateTime}</div>
      </div>

      <div className="scen-hcard-count">{sc.items.length} / 3 simulazioni</div>

      {/* ── Item rows ── */}
      <div className="scen-hcard-items">
        {sc.items.map((item, idx) => {
          const isSpost = item.mode === 'spostamento'
          const emoji = isSpost ? '🕐' : '🔄'
          const delta = item.result?.delta ?? null
          const deltaPos = delta !== null && delta > 0
          const deltaNeg = delta !== null && delta < 0
          const deltaColor = deltaPos ? 'var(--success)' : deltaNeg ? 'var(--danger)' : 'var(--muted)'

          let candName, candShare, predicted

          if (isSpost) {
            const destDate = item.result?.dest_date || item.spDestDay || null
            const destTime = item.result?.dest_time || item.spDestTime || null
            candName = `→ ${fmtDateShort(destDate)}${destTime ? ' · ' + destTime : ''}`
            candShare = null
            predicted = item.result?.dest_slot_share ?? null
          } else {
            candName = item.result?.cand_title || item.cand?.program_name || '—'
            candShare = item.result?.cand_share ?? item.cand?.share_storico ?? null
            predicted = item.result?.predicted_share ?? null
          }

          return (
            <div
              key={idx}
              className={`scen-hcard-item${item._status === 'Completed' && onViewDetail ? ' scen-hcard-item--clickable' : ''}`}
              onClick={item._status === 'Completed' && onViewDetail ? () => onViewDetail(item) : undefined}
              role={item._status === 'Completed' && onViewDetail ? 'button' : undefined}
              tabIndex={item._status === 'Completed' && onViewDetail ? 0 : undefined}
              onKeyDown={item._status === 'Completed' && onViewDetail
                ? (e) => { if (e.key === 'Enter' || e.key === ' ') onViewDetail(item) }
                : undefined}
            >
              <div className="scen-item-sub">
                <span className="scen-item-emoji">{emoji}</span>
                <span className="scen-item-name">{candName}</span>
                {candShare !== null && (
                  <span className="scen-item-cursare">{candShare.toFixed(1)}%</span>
                )}
                {item._status === 'Running' && (
                  <span className="scen-item-status" title="Simulazione in corso">
                    <span className="scen-spinner" />
                  </span>
                )}
                {item._status === 'Failed' && (
                  <span className="scen-item-status scen-item-status--failed" title="Simulazione fallita">❌</span>
                )}
              </div>
              <div className="scen-item-result">
                {item._status === 'Completed' && predicted !== null ? (
                  <span className="scen-item-pred" style={{ color: deltaColor }}>
                    {predicted.toFixed(1)}%
                    {delta !== null && (
                      <small>&nbsp;{delta >= 0 ? '+' : ''}{delta.toFixed(1)} pp</small>
                    )}
                  </span>
                ) : item._status === 'Running' ? (
                  <span className="scen-item-status-lbl">In elaborazione…</span>
                ) : item._status === 'Failed' ? (
                  <span className="scen-item-status-lbl scen-item-status-lbl--failed">Fallita</span>
                ) : <span />}
                <div className="scen-item-actions" onClick={e => e.stopPropagation()}>
                  {item._status === 'Failed' && onRetrySim && deletingSimId !== item._sim_id && (
                    <button
                      className="scen-icon-btn"
                      disabled={retryingSimId === item._sim_id}
                      onClick={async () => {
                        setRetryingSimId(item._sim_id)
                        try { await onRetrySim(item._sim_id) }
                        finally { setRetryingSimId(null) }
                      }}
                      title="Rilancia simulazione"
                    >
                      {retryingSimId === item._sim_id
                        ? <span className="scen-spinner" />
                        : '🔄'}
                    </button>
                  )}
                  {item._status !== 'Running' && onDeleteSim && retryingSimId !== item._sim_id && (
                    <button
                      className="scen-icon-btn"
                      disabled={deletingSimId === item._sim_id}
                      onClick={async (e) => {
                        e.stopPropagation()
                        setDeletingSimId(item._sim_id)
                        try { await onDeleteSim(item._sim_id, idx) }
                        finally { setDeletingSimId(null) }
                      }}
                      title="Rimuovi simulazione"
                    >
                      {deletingSimId === item._sim_id
                        ? <span className="scen-spinner" />
                        : '🗑️'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!isFull && (
        <button className="scen-add-sim-btn" onClick={onAddSim}>
          + Aggiungi simulazione
        </button>
      )}

      <div className="scen-hcard-created">Creato: {createdTs}</div>

      <div className="scen-hcard-actions">
        <button
          className="scen-clear-btn"
          disabled={deletingScen}
          onClick={async () => {
            setDeletingScen(true)
            try { await onDelete() }
            finally { setDeletingScen(false) }
          }}
        >
          {deletingScen ? <span className="scen-spinner" /> : 'Elimina Scenario'}
        </button>
      </div>

    </div>
  )
}
