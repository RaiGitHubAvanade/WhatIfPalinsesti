import { fmtDate } from '../../utils/dateUtils'
import CompetitorSection from './CompetitorSection'
import ShapValuesChart from './ShapValuesChart'
import VerdictPill from './VerdictPill'
import './SostituzioneDetail.css'

export default function SostituzioneDetail({ item, onClose }) {
  if (!item?.result) return null

  const r = item.result
  const origShare = r.orig_share
  const predShare = r.predicted_share
  const delta = r.delta
  const origColorCls = (origShare !== null && predShare !== null)
    ? (origShare > predShare ? ' res-share-high' : origShare < predShare ? ' res-share-low' : '')
    : ''
  const predColorCls = (origShare !== null && predShare !== null)
    ? (predShare > origShare ? ' res-share-high' : predShare < origShare ? ' res-share-low' : '')
    : ''
  const recapItems = [
    r.orig_ch && `Canale: ${r.orig_ch}`,
    r.orig_time && `Ora: ${r.orig_time}${r.orig_end ? '–' + r.orig_end : ''}`,
    item.date && `Data: ${fmtDate(item.date)}`,
  ].filter(Boolean)

  return (
    <div className="card res-card res-card-sostituzione">
      <div className="res-recap-inline">
        <div className="res-recap-title">
          Sostituzione di <span className="res-prog-highlight">{r.orig_title}</span>
          {' '}con <span className="res-prog-highlight">{r.cand_title}</span>
        </div>
        {recapItems.length > 0 && (
          <div
            className="res-recap-meta"
            dangerouslySetInnerHTML={{
              __html: recapItems.map(entry => entry.replace(/^([^:]+):/, '<strong>$1:</strong>')).join(' · '),
            }}
          />
        )}
      </div>

      <div className="res-main-box">
        <div className="res-main-hdr">Impatto previsto</div>
        <div className="res-shares-row">
          <div className="res-share-col">
            <span className="res-share-lbl">Share attuale</span>
            <span className={`res-share-val${origColorCls}`}>{origShare !== null ? `${origShare.toFixed(1)}%` : '—'}</span>
            <span className="res-share-prog">{r.orig_title}</span>
          </div>
          <div className="res-share-divider">→</div>
          <div className="res-share-col">
            <span className="res-share-lbl">Share previsto</span>
            <span className={`res-share-val res-share-pred${predColorCls}`}>{predShare !== null ? `${predShare.toFixed(1)}%` : '—'}</span>
            <span className="res-share-prog">{r.cand_title}</span>
          </div>
        </div>
        <VerdictPill delta={delta} />
      </div>

      <ShapValuesChart shapValues={r.shap_values} />

      <CompetitorSection channel={r.orig_ch} day={item.date} from_time={r.orig_time} onBack={onClose} />
    </div>
  )
}
