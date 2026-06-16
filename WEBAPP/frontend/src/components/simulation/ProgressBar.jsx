const STEPS = ['Seleziona', 'Modalità', 'Sostituzione / Spostamento', 'Risultato']

export default function ProgressBar({ step }) {
  return (
    <div className="prog-bar">
      {STEPS.map((label, i) => {
        const state = i < step ? 'done' : i === step ? 'active' : 'future'
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div className={`prog-step ${state}`}>
              <div className={`prog-circ ${state}`}>
                {state === 'done' ? '✓' : i + 1}
              </div>
              <span className="prog-lbl">{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`prog-line ${state === 'done' ? 'done' : ''}`} style={{ flex: 1, margin: '0 8px' }} />}
          </div>
        )
      })}
    </div>
  )
}
