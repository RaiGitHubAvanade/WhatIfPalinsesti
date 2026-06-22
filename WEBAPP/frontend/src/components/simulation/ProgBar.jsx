import './ProgBar.css'

export default function ProgBar({ step, labels }) {
  return (
    <div className="prog-bar">
      {labels.map((lbl, i) => {
        const cls = i < step ? 'done' : i === step ? 'active' : 'future'
        return [
          <div key={`step-${i}`} className={`prog-step ${cls}`}>
            <div className={`prog-circ ${cls}`}>
              {cls === 'done' ? '✓' : i + 1}
            </div>
            <span className="prog-lbl">{lbl}</span>
          </div>,
          i < labels.length - 1 && (
            <div
              key={`line-${i}`}
              className={`prog-line${i < step ? ' done' : ''}`}
            />
          ),
        ]
      })}
    </div>
  )
}
