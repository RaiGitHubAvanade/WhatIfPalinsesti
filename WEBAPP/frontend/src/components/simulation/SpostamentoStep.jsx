import { useState } from 'react'
import { useApp } from '../../context/useApp'
import { simulate, getChannelSchedule } from '../../services/apiService'

const CHANNELS = ['Rai 1', 'Rai 2', 'Rai 3']

export default function SpostamentoStep({ onBack, onDone }) {
  const { state, set, toast } = useApp()
  const { prog, ch, date } = state

  const [destCh, setDestCh] = useState(ch || 'Rai 1')
  const [destDate, setDestDate] = useState(date || '')
  const [destSlot, setDestSlot] = useState(null)
  const [destPrograms, setDestPrograms] = useState([])
  const [loading, setLoading] = useState(false)
  const [simLoading, setSimLoading] = useState(false)

  const loadDestSchedule = async () => {
    if (!destDate || !destCh) return
    setLoading(true)
    try {
      const data = await getChannelSchedule(destCh, destDate)
      setDestPrograms(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSimulate = async () => {
    if (!destSlot) { toast('Seleziona la fascia di destinazione'); return }
    const moveCand = {
      id: 'move',
      tipo: prog?.tipo || '',
      eta: prog?.eta || '',
      sesso: prog?.sesso || '',
      destCh,
      destDate,
      destSlot,
    }
    setSimLoading(true)
    try {
      const result = await simulate(prog, moveCand)
      set({
        cand: moveCand,
        spDestDay: destDate,
        spDestTime: destSlot,
        _simResult: result,
        _spSimulated: true,
        step: 3,
      })
      onDone()
    } catch (e) {
      toast('Errore nella simulazione: ' + e.message)
    } finally {
      setSimLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="sect-label">Seleziona destinazione per <strong>{prog?.title}</strong></div>

      <div className="sposta-layout">
        {/* Source column */}
        <div>
          <div className="sposta-title">Sorgente</div>
          <div className="rp-row"><span className="rp-label">Programma</span><strong>{prog?.title}</strong></div>
          <div className="rp-row"><span className="rp-label">Canale</span><strong>{ch}</strong></div>
          <div className="rp-row"><span className="rp-label">Data</span><strong>{date || '—'}</strong></div>
          <div className="rp-row"><span className="rp-label">Orario</span><strong>{prog?.time}–{prog?.end}</strong></div>
          {prog?.share != null && (
            <div className="rp-row"><span className="rp-label">Share</span><strong>{prog.share}%</strong></div>
          )}
        </div>

        <div className="sposta-arrow-col">→</div>

        {/* Destination column */}
        <div>
          <div className="sposta-title">Destinazione</div>

          <div className="f-row" style={{ marginBottom: 10 }}>
            <span className="f-label">Canale</span>
            <div className="tgl-grp">
              {CHANNELS.map(c => (
                <button key={c} className={`tgl${destCh === c ? ' on' : ''}`} onClick={() => { setDestCh(c); setDestPrograms([]); setDestSlot(null) }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="f-row" style={{ marginBottom: 10 }}>
            <span className="f-label">Data</span>
            <input type="date" value={destDate} onChange={e => { setDestDate(e.target.value); setDestPrograms([]); setDestSlot(null) }} />
            <button className="btn-inline" onClick={loadDestSchedule} disabled={!destDate}>
              {loading ? '…' : 'Carica'}
            </button>
          </div>

          {destPrograms.length > 0 ? (
            <>
              <div className="sposta-title" style={{ marginTop: 12 }}>Scegli fascia/programma di destinazione</div>
              <div className="slot-picker">
                {destPrograms.map((p, i) => (
                  <div
                    key={i}
                    className={`slot-card${destSlot === p.slot ? ' on' : ''}`}
                    onClick={() => setDestSlot(p.slot)}
                  >
                    <span className="slot-time-range">{p.time}–{p.end}</span>
                    <span className="slot-prog-name">{p.title}</span>
                    {p.share != null && <span className="slot-share-val">{p.share}%</span>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '10px 0' }}>
              {loading ? 'Caricamento palinsesto…' : 'Inserisci canale e data, poi premi Carica per vedere i programmi.'}
            </div>
          )}
        </div>
      </div>

      <div className="step-nav" style={{ marginTop: 20 }}>
        <button className="btn-inline ghost" onClick={onBack}>← Indietro</button>
        <button
          className="btn-inline primary"
          onClick={handleSimulate}
          disabled={!destSlot || simLoading}
        >
          {simLoading ? 'Simulazione…' : '▶ Simula Spostamento'}
        </button>
      </div>
    </div>
  )
}

