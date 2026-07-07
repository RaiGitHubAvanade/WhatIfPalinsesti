import { useApp } from '../../context/useApp'
import { fmtDate } from '../../utils/dateUtils'
import './SimRecap.css'

export default function SimRecap() {
  const { state } = useApp()
  const { prog, mode, cand, spDestCh, spDestDay, spDestTime } = state

  const hasProg = !!prog
  const hasMode = !!mode
  const hasCand = mode === 'sostituzione' && !!cand
  const hasDestCh = mode === 'spostamento' && !!spDestCh
  const hasDestDay = mode === 'spostamento' && !!spDestDay
  const hasDestTime = mode === 'spostamento' && !!spDestTime
  const hasDest = hasDestCh || hasDestDay || hasDestTime

  return (
    <aside className="r-panel">
      {/* ── Programma ── */}
      <div className="rp-section-label">Programma</div>
      {hasProg ? (
        <div className="rp-prog-block">
          <div className="rp-prog-name">{prog.program_name}</div>

          <div className="rp-pills">
            {prog.channel && <span className="rp-pill rp-pill-ch">{prog.channel}</span>}
            {prog.date && <span className="rp-pill rp-pill-date">📅 {fmtDate(prog.date)}</span>}
            {prog.from_time && (
              <span className="rp-pill rp-pill-time">
                🕐 {prog.from_time}{prog.to_time ? `–${prog.to_time}` : ''}
              </span>
            )}
          </div>

          {prog.genre && (
            <div className="rp-pills">
              <span className="rp-pill">{prog.genre}</span>
            </div>
          )}

          {typeof prog.share_predicted === 'number' && (
            <div className="rp-share-row">
              <span className="rp-share-lbl">Share attuale</span>
              <span className="rp-share-val">{prog.share_predicted.toFixed(1)}%</span>
            </div>
          )}
        </div>
      ) : (
        <div className="rp-empty-state">
          <div className="rp-empty-ico">📺</div>
          <div className="rp-empty-msg">
            Seleziona un programma<br />per iniziare
          </div>
        </div>
      )}

      {/* ── Modalità ── */}
      {hasProg && (
        <>
          <div className="rp-divider" />
          <div className="rp-section-label">Modalità</div>
          {hasMode ? (
            <div className={`rp-mode-pill ${mode}`}>
              <span className="rp-mode-ico">
                {mode === 'sostituzione' ? '🔄' : '🕐'}
              </span>
              {mode === 'sostituzione' ? 'Sostituzione' : 'Spostamento'}
            </div>
          ) : (
            <div className="rp-pending">Nessuna modalità selezionata</div>
          )}
        </>
      )}

      {/* ── Candidato (sostituzione) ── */}
      {hasMode && mode === 'sostituzione' && (
        <>
          <div className="rp-divider" />
          <div className="rp-section-label">Candidato</div>
          {hasCand ? (
            <div className="rp-prog-block">
              <div className="rp-prog-name">{cand.program_name}</div>
              {cand.channel && (
                <div className="rp-pills">
                  <span className="rp-pill rp-pill-ch">{cand.channel}</span>
                </div>
              )}
              {typeof cand.share_storico === 'number' && (
                <div className="rp-share-row">
                  <span className="rp-share-lbl">Share storico</span>
                  <span className="rp-share-val">{cand.share_storico.toFixed(1)}%</span>
                </div>
              )}
            </div>
          ) : (
            <div className="rp-pending">Nessun candidato selezionato</div>
          )}
        </>
      )}

      {/* ── Destinazione (spostamento) ── */}
      {hasMode && mode === 'spostamento' && (
        <>
          <div className="rp-divider" />
          <div className="rp-section-label">Destinazione</div>
          {hasDest ? (
            <div className="rp-dest-rows">
              {hasDestCh && (
                <div className="rp-dest-row">
                  <span className="rp-dest-key">Canale</span>
                  <span className="rp-dest-val">{spDestCh}</span>
                </div>
              )}
              {hasDestDay && (
                <div className="rp-dest-row">
                  <span className="rp-dest-key">Data</span>
                  <span className="rp-dest-val">{fmtDate(spDestDay)}</span>
                </div>
              )}
              {hasDestTime && (
                <div className="rp-dest-row">
                  <span className="rp-dest-key">Orario</span>
                  <span className="rp-dest-val">{spDestTime}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="rp-pending">Nessuna destinazione configurata</div>
          )}
        </>
      )}
    </aside>
  )
}
