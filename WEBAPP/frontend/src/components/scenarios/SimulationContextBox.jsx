import { formatShare as fmtShare } from '../../utils/shareUtils'
import './SimulationContextBox.css'

function fmtCount(element) {
  if (element.children?.length) return ''
  return typeof element.occurrences_count === 'number' ? element.occurrences_count : '—'
}

/**
 * Context box shown above the SHAP chart in the simulation detail pages.
 * @param {{ loading: boolean, error: string, context: import('../../services/apiScenarios').SimulationContext|null, onRetry: () => void }} props
 */
export default function SimulationContextBox({ loading, error, context, onRetry }) {
  if (loading) return (
    <div className="res-ctx-box" aria-busy="true">
      <div className="res-main-hdr">Contesto della simulazione</div>
      <p className="res-ctx-status" role="status">Caricamento contesto della simulazione...</p>
    </div>
  )

  if (error) return (
    <div className="res-ctx-box" role="alert">
      <div className="res-main-hdr">Contesto della simulazione</div>
      <p className="res-ctx-status">{error}</p>
      <button type="button" className="btn-sec" onClick={onRetry}>Riprova</button>
    </div>
  )

  const elements = context?.elements || []

  return (
    <div className="res-ctx-box">
      <div className="res-main-hdr">Contesto della simulazione</div>
      <p className="res-ctx-desc">
        Programmi considerati dal modello per lo scenario analizzato, con lo share storico medio e il numero di occorrenze storiche utilizzate.
      </p>
      <div className="res-ctx-table-wrap">
        <table className="res-ctx-table">
          <thead>
            <tr>
              <th scope="col">Elemento</th>
              <th scope="col">Programma</th>
              <th scope="col">Canale</th>
              <th scope="col" className="num">Share storico medio</th>
              <th scope="col" className="num">Numero occorrenze considerate</th>
            </tr>
          </thead>
          <tbody>
            {elements.map(element => (
              <ContextRows key={element.key} element={element} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ContextRows({ element }) {
  return (
    <>
      <tr className={element.children?.length ? 'res-ctx-group' : ''}>
        <th scope="row">{element.label}</th>
        <td>{element.program_name || '—'}</td>
        <td>{element.channel || '—'}</td>
        <td className="num">{fmtShare(element.share_storico)}</td>
        <td className="num">{fmtCount(element)}</td>
      </tr>
      {(element.children || []).map(child => (
        <tr key={child.key} className="res-ctx-child">
          <td aria-label={child.label} />
          <td>
            <span className="res-ctx-child-name">{child.program_name || '—'}</span>
            {child.from_time && (
              <span className="res-ctx-child-time">{child.from_time}{child.to_time ? `–${child.to_time}` : ''}</span>
            )}
          </td>
          <td>{child.channel || '—'}</td>
          <td className="num">{fmtShare(child.share_storico)}</td>
          <td className="num">{fmtCount(child)}</td>
        </tr>
      ))}
    </>
  )
}
