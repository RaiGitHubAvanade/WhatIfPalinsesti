import './ScenItemCard.css'

/**
 * @typedef {import('../../models/simulationViewModel').SimResultSost} SimResultSost
 * @typedef {import('../../models/simulationViewModel').SimResultSposta} SimResultSposta
 */

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  const days = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function ShareRow({ label, value }) {
  if (value === null || value === undefined) return null
  return (
    <div className="sic-share-row">
      <span className="sic-share-lbl">{label}</span>
      <span className="sic-share-val">{value.toFixed(1)}%</span>
    </div>
  )
}

function DeltaBadge({ delta, label }) {
  if (delta === null || delta === undefined) return null
  const cls = delta > 0 ? 'pos' : delta < 0 ? 'neg' : 'neu'
  const sign = delta >= 0 ? '+' : ''
  return (
    <span className={`sic-delta ${cls}`}>
      {sign}{delta.toFixed(1)} pp{label ? <small>{label}</small> : null}
    </span>
  )
}

/**
 * A single saved-simulation item card.
 * @param {{
 *   item: {prog:any, cand:any, mode:string, result:SimResultSost|SimResultSposta, date:string, ch:string, spDestDay:string, spDestTime:string},
 *   idx: number,
 *   scenId: number,
 *   isAnchor: boolean,
 *   anchorDelta: number|null,
 *   onRemove: (scenId:number, idx:number) => void,
 *   onToggleAnchor: (idx:number) => void
 * }} props
 */
export default function ScenItemCard({ item, idx, scenId, isAnchor, anchorDelta, onRemove, onToggleAnchor }) {
  const { result, mode, ch, date, spDestDay, spDestTime } = item
  const isSost = mode === 'sostituzione'

  let title = '—'
  let subtitle = null
  let shareOrig = null
  let shareNew = null
  const delta = result?.delta ?? null

  if (isSost && result) {
    title = result.orig_title || item.prog?.title || '—'
    subtitle = `→ ${result.cand_title || item.cand?.title || '—'}`
    shareOrig = result.orig_share ?? null
    shareNew = result.predicted_share ?? null
  } else if (!isSost && result) {
    title = result.prog_title || item.prog?.title || '—'
    const destDate = result.dest_date || spDestDay || null
    const destTime = result.dest_time || spDestTime || null
    subtitle = `→ ${fmtDate(destDate)}${destTime ? ' · ' + destTime : ''}`
    shareOrig = result.orig_slot_share ?? null
    shareNew = result.dest_slot_share ?? null
  } else {
    title = item.prog?.title || '—'
  }

  const relDelta =
    !isAnchor && anchorDelta !== null && delta !== null
      ? delta - anchorDelta
      : null

  return (
    <div className={`sic-card ${mode}${isAnchor ? ' is-anchor' : ''}`}>
      <div className="sic-head">
        <span className="sic-mode-ico">{isSost ? '🔄' : '🕐'}</span>
        <div className="sic-titles">
          <span className="sic-title">{title}</span>
          {subtitle && <span className="sic-sub">{subtitle}</span>}
        </div>
        <div className="sic-actions">
          <button
            className={`sic-anchor-btn${isAnchor ? ' active' : ''}`}
            onClick={() => onToggleAnchor(idx)}
            title={isAnchor ? 'Rimuovi ancora' : 'Imposta come ancora di confronto'}
          >
            🎯
          </button>
          <button
            className="sic-remove-btn"
            onClick={() => onRemove(scenId, idx)}
            title="Rimuovi simulazione"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="sic-meta">
        {ch && <span className="sic-badge-ch">{ch}</span>}
        <span className="sic-date">{fmtDate(date)}</span>
      </div>

      {(shareOrig !== null || shareNew !== null) && (
        <div className="sic-shares">
          <ShareRow label="Originale" value={shareOrig} />
          <ShareRow label="Previsto" value={shareNew} />
        </div>
      )}

      <div className="sic-footer">
        <div className="sic-deltas">
          <DeltaBadge delta={delta} />
          {relDelta !== null && <DeltaBadge delta={relDelta} label=" vs ancora" />}
        </div>
        {isAnchor && <span className="sic-anchor-lbl">⚓ Ancora</span>}
      </div>
    </div>
  )
}
