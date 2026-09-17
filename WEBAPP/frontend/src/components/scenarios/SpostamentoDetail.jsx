import { fmtDate, durationMinutes, endTimeFromStartAndDuration } from '../../utils/dateUtils'
import CompetitorSection from './CompetitorSection'
import ShapValuesChart from './ShapValuesChart'
import VerdictPill from './VerdictPill'
import './SpostamentoDetail.css'

export default function SpostamentoDetail({ item, onClose }) {
  if (!item?.result) return null

  const r = item.result
  const origSlotShare = r.orig_slot_share
  const destSlotShare = r.dest_slot_share
  const delta = r.delta
  const slotDuration = durationMinutes(r.orig_time, r.orig_end)
  const destEnd = endTimeFromStartAndDuration(r.dest_time, slotDuration)
  const origColorCls = (origSlotShare !== null && destSlotShare !== null)
    ? (origSlotShare > destSlotShare ? ' res-share-high' : origSlotShare < destSlotShare ? ' res-share-low' : '')
    : ''
  const predColorCls = (origSlotShare !== null && destSlotShare !== null)
    ? (destSlotShare > origSlotShare ? ' res-share-high' : destSlotShare < origSlotShare ? ' res-share-low' : '')
    : ''

  return (
    <div className="card res-card">
      <div className="res-recap-inline">
        <div className="res-recap-title">
          Spostamento di <span className="res-prog-highlight">{r.prog_title}</span>
        </div>
      </div>

      <div className="res-move-summary">
        <div className="res-move-body">
          <div className="res-move-slots">
            <div className="res-move-slot res-move-slot-orig">
              <div className="res-move-slot-label">Slot Originale</div>
              <div className="res-move-slot-content">
                <div className="res-move-slot-row"><span className="res-move-slot-key">Canale:</span><span className="res-move-slot-val">{r.orig_ch}</span></div>
                <div className="res-move-slot-row"><span className="res-move-slot-key">Data:</span><span className="res-move-slot-val">{fmtDate(r.orig_date) || '—'}</span></div>
                <div className="res-move-slot-row"><span className="res-move-slot-key">Orario:</span><span className="res-move-slot-val">{r.orig_time || '—'}{r.orig_end ? ` – ${r.orig_end}` : ''}</span></div>
              </div>
            </div>
            <div className="res-move-arrow">→</div>
            <div className="res-move-slot res-move-slot-dest">
              <div className="res-move-slot-label">Slot Destinazione</div>
              <div className="res-move-slot-content">
                <div className="res-move-slot-row"><span className="res-move-slot-key">Canale:</span><span className="res-move-slot-val">{r.dest_ch || '—'}</span></div>
                <div className="res-move-slot-row"><span className="res-move-slot-key">Data:</span><span className="res-move-slot-val">{fmtDate(r.dest_date) || '—'}</span></div>
                <div className="res-move-slot-row"><span className="res-move-slot-key">Orario:</span><span className="res-move-slot-val">{r.dest_time || '—'}{destEnd ? ` – ${destEnd}` : ''}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="res-main-box">
        <div className="res-main-hdr">Confronto share degli slot</div>
        <div className="res-shares-row">
          <div className="res-share-col">
            <span className="res-share-lbl">Share slot originale</span>
            <span className={`res-share-val${origColorCls}`}>{origSlotShare !== null ? `${origSlotShare.toFixed(1)}%` : '—'}</span>
            <span className="res-share-prog">{r.orig_ch} · {r.orig_time || '—'}</span>
          </div>
          <div className="res-share-divider">→</div>
          <div className="res-share-col">
            <span className="res-share-lbl">Share slot destinazione</span>
            <span className={`res-share-val res-share-pred${predColorCls}`}>{destSlotShare !== null ? `${destSlotShare.toFixed(1)}%` : '—'}</span>
            <span className="res-share-prog">{r.dest_ch || '—'} · {r.dest_time || '—'}</span>
          </div>
        </div>
        <VerdictPill delta={delta} />
      </div>

      <ShapValuesChart shapValues={r.shap_values} />

      <CompetitorSection channel={r.dest_ch} day={r.dest_date} from_time={r.dest_time} onBack={onClose} />
    </div>
  )
}
