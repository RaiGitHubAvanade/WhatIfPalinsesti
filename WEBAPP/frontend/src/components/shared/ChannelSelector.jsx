import './ChannelSelector.css'

const CHANNELS = ['Rai 1', 'Rai 2', 'Rai 3']

/**
 * Toggle-pill channel selector.
 * Callers handle deselection logic in onChange if needed.
 */
export default function ChannelSelector({ selected, onChange }) {
  return (
    <div className="ch-sel">
      <span className="ch-sel__lbl">Canale</span>
      <div className="ch-sel__grp">
        {CHANNELS.map(c => (
          <button
            key={c}
            className={`ch-sel__pill${selected === c ? ' on' : ''}`}
            onClick={() => onChange(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
