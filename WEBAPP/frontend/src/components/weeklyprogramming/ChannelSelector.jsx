import './ChannelSelector.css'

const CHANNELS = ['Rai 1', 'Rai 2', 'Rai 3']

export default function ChannelSelector({ selected, onChange }) {
  return (
    <div className="pw-ctrl-group">
      <div className="pw-ctrl-label">Canale</div>
      <div className="pw-tgl-grp">
        {CHANNELS.map(c => (
          <button
            key={c}
            className={`pw-tgl${selected === c ? ' on' : ''}`}
            onClick={() => onChange(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
