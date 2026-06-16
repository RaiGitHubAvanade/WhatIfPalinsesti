import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getCompetitorPrograms } from '../../services/apiService'
import './OtherChannelsModal.css'

export default function OtherChannelsModal({ onClose, channel, day, from_time, to_time, program_name }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    getCompetitorPrograms({ channel, day, from_time, to_time, program_name })
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setFetchError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [channel, day, from_time, to_time, program_name])

  return createPortal(
    <>
      <div className="ac-backdrop" onClick={onClose} />
      <div className="ac-modal" role="dialog" aria-modal="true" aria-label="Programmazione Altri Canali">
        <div className="ac-modal-header">
          <h3>📺 Programmazione Altri Canali</h3>
          <button className="ac-modal-close" onClick={onClose} aria-label="Chiudi">✕</button>
        </div>
        <div className="ac-modal-meta">
          Canale: <strong>{channel}</strong>
          {from_time && to_time && <> · Fascia: <strong>{from_time}–{to_time}</strong></>}
          {program_name && <> · <strong>{program_name}</strong></>}
          {day && <> · Data: <strong>{formatDate(day)}</strong></>}
        </div>
        <div className="ac-modal-body">
          {loading && <div className="pw-weekly-status">Caricamento in corso…</div>}
          {fetchError && <div className="pw-weekly-status">Errore: {fetchError}</div>}
          {!loading && !fetchError && data && (
            <div className="ac-channel-grid">
              {data.other_channels.map((ch) => (
                <div
                  key={ch.channel}
                  className={`ac-channel-card${ch.channel_type === 'RAI' ? ' ac-rai' : ' ac-comp'}`}
                >
                  <div className="ac-ch-name">
                    {ch.channel}
                    <span className="ac-ch-type"> · {ch.channel_type}</span>
                  </div>
                  <div className="ac-ch-programs">
                    {ch.programs.map((p, i) => (
                      <div key={i} className="ac-ch-program">
                        <span className="ac-ch-time">{p.from_time}–{p.to_time}</span>
                        <span className="ac-ch-title">{p.program_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {data.other_channels.length === 0 && (
                <div className="pw-weekly-status">Nessun programma concorrente trovato.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}

function formatDate(iso) {
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}
