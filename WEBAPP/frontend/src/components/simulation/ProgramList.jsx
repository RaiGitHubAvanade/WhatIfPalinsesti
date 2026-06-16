import { useState, useEffect } from 'react'
import { useApp } from '../../context/useApp'
import { getPrograms } from '../../services/apiService'

const CHANNELS = ['Rai 1', 'Rai 2', 'Rai 3']
const SLOTS = [
  { value: '', label: 'Tutte le fasce' },
  { value: 'mattina', label: 'Mattina' },
  { value: 'pomeriggio', label: 'Pomeriggio' },
  { value: 'access', label: 'Access Prime Time' },
  { value: 'prime', label: 'Prima Serata' },
  { value: 'seconda', label: 'Seconda Serata' },
]
const TIPOS = ['', 'Show', 'Fiction', 'Serie', 'News', 'Talk', 'Reality', 'Doc', 'Game', 'Sport', 'Inchiesta', 'Soap']

export default function ProgramList({ onSelect }) {
  const { state, set } = useApp()
  const { ch, date, slot, _search } = state
  const [programs, setPrograms] = useState([])
  const [tipo, setTipo] = useState('')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const data = await getPrograms({
          ch: ch || '',
          slot: slot || '',
          tipo,
          search: _search,
        })
        if (!cancelled) setPrograms(data)
      } catch (e) {
        if (!cancelled) console.error(e)
      }
    }

    run()
    return () => { cancelled = true }
  }, [ch, slot, tipo, _search])

  return (
    <div className="card">
      <div className="sect-label">Seleziona programma</div>

      {/* Filters */}
      <div className="f-row">
        <span className="f-label">Canale</span>
        <div className="tgl-grp">
          {CHANNELS.map(c => (
            <button key={c} className={`tgl${ch === c ? ' on' : ''}`} onClick={() => set({ ch: c, prog: null })}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="f-row">
        <span className="f-label">Data</span>
        <input
          type="date"
          value={date}
          onChange={e => set({ date: e.target.value, prog: null })}
        />
        <span className="f-label" style={{ marginLeft: 16 }}>Fascia</span>
        <select
          className="filter-select"
          value={slot || ''}
          onChange={e => set({ slot: e.target.value || null, prog: null })}
        >
          {SLOTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="f-row">
        <span className="f-label">Tipo</span>
        <div className="tgl-grp">
          <button className={`tgl${tipo === '' ? ' on' : ''}`} onClick={() => setTipo('')}>Tutti</button>
          {TIPOS.filter(t => t).map(t => (
            <button key={t} className={`tgl${tipo === t ? ' on' : ''}`} onClick={() => setTipo(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="f-row">
        <span className="f-label">Cerca</span>
        <input
          type="search"
          placeholder="Titolo, genere…"
          value={_search}
          onChange={e => set({ _search: e.target.value })}
          style={{ flex: 1, maxWidth: 300 }}
        />
      </div>

      {/* Program list */}
      <div className="body-scroll">
        {programs.length === 0 && (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
            {ch ? 'Nessun programma trovato per i filtri selezionati.' : 'Seleziona un canale per visualizzare i programmi.'}
          </p>
        )}
        <div className="prog-list">
          {programs.map(p => (
            <div
              key={p.id}
              className={`prog-card${state.prog?.id === p.id ? ' sel' : ''}${p.noWhatIF ? ' disabled-card' : ''}`}
              onClick={() => !p.noWhatIF && onSelect(p)}
              title={p.noWhatIF ? 'Programma non soggetto a simulazione WhatIF' : ''}
            >
              <div className="p-time">{p.time}–{p.end}</div>
              <div className="p-info">
                <div className="p-title">
                  {p.title}
                  {p.firstAir && <span className="badge b-ottimizza" style={{ marginLeft: 8 }}>Prima</span>}
                  {p.noWhatIF && <span className="badge b-muted" style={{ marginLeft: 8 }}>No WhatIF</span>}
                </div>
                <div className="p-meta">{p.genre} · {p.tipo} · {p.eta} · {p.sesso}</div>
              </div>
              {p.share != null && <div className="p-share">{p.share}%</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

