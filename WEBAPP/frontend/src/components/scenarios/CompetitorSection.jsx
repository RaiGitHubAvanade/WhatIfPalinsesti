import { useEffect, useState } from 'react'
import { getScenCompetitorPrograms, toggleEventoForte } from '../../services/apiScenarios'
import './CompetitorSection.css'

export default function CompetitorSection({ channel, day, from_time, onBack }) {
  const [data, setData] = useState(null)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [togglingIds, setTogglingIds] = useState(new Set())

  useEffect(() => {
    let cancelled = false
    getScenCompetitorPrograms({ channel, day, from_time })
      .then(result => { if (!cancelled) setData(result) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [channel, day, from_time])

  const handleEventoForte = async id => {
    setTogglingIds(prev => new Set(prev).add(id))
    try {
      await toggleEventoForte(id)
      setData(prev => ({
        ...prev,
        other_channels: prev.other_channels.map(ch => ({
          ...ch,
          programs: ch.programs.map(p =>
            p.id === id ? { ...p, evento_forte: !p.evento_forte } : p,
          ),
        })),
      }))
    } catch {
      // Keep UI state unchanged on failure.
    } finally {
      setTogglingIds(prev => {
        const s = new Set(prev)
        s.delete(id)
        return s
      })
    }
  }

  return (
    <div className="res-comp-cta">
      <div className="res-comp-toolbar">
        {onBack && (
          <button className="btn-sec btn-comp-toggle btn-comp-back" onClick={onBack}>← Torna agli Scenari</button>
        )}

        {!visible ? (
          <button className="btn-sec btn-comp-toggle btn-comp-main" onClick={() => setVisible(true)} disabled={loading}>
            {loading ? 'Caricamento…' : 'Vedi Competitor'}
          </button>
        ) : (
          <button className="btn-sec btn-comp-toggle btn-comp-main" onClick={() => setVisible(false)}>Nascondi Competitor</button>
        )}
      </div>

      {visible && (
        <div className="res-comp-section">
          <div className="res-comp-content">
            {!data || data.other_channels.length === 0 ? (
              <p className="res-comp-empty">Nessun competitor disponibile.</p>
            ) : (
              <div className="res-comp-grid">
                {data.other_channels.map(ch => (
                  <div key={ch.channel} className={`res-comp-card${ch.channel_type === 'RAI' ? ' res-comp-card--rai' : ''}`}>
                    <div className="res-comp-card-hdr">
                      <span className="res-comp-card-name">{ch.channel}</span>
                      <span className={`res-comp-card-type${ch.channel_type === 'RAI' ? ' rai' : ' comp'}`}>{ch.channel_type}</span>
                    </div>
                    <div className="res-comp-card-rows">
                      {ch.programs.map((p, i) => (
                        <div
                          key={i}
                          className={`res-comp-row${p.evento_forte ? ' res-comp-row--evento' : ''}`}
                          data-id={p.id}
                        >
                          <span className="res-comp-time">{p.from_time}–{p.to_time}</span>
                          <span className="res-comp-prog-name" title={p.program_name}>{p.program_name}</span>
                          {p.share_storico !== null && (
                            <span className="res-comp-share">{p.share_storico.toFixed(1)}%</span>
                          )}
                          <button
                            className={`res-comp-evento-btn${p.evento_forte ? ' active' : ''}`}
                            disabled={togglingIds.has(p.id)}
                            onClick={() => handleEventoForte(p.id)}
                            title={p.evento_forte ? 'Rimuovi da Evento Forte' : 'Segna come Evento Forte'}
                          >
                            {togglingIds.has(p.id) ? <span className="scen-spinner" /> : '⚡'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
