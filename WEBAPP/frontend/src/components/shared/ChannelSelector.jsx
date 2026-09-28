import { CHANNELS } from '../../utils/constants'
import './ChannelSelector.css'
import './FilterField.css'

/**
 * Toggle-pill channel selector.
 * Callers handle deselection logic in onChange if needed.
 */
export default function ChannelSelector({ selected, onChange }) {
  return (
    <div className="filter-field">
      <span className="filter-field__label">Canale</span>
      <div className="filter-pill-group">
        {CHANNELS.map(c => (
          <button
            key={c}
            className={`filter-pill${selected === c ? ' on' : ''}`}
            onClick={() => onChange(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
