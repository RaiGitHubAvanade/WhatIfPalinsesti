import { useState } from 'react'
import { useApp } from '../../context/useApp'
import { getFeatures } from '../../services/apiScenarios'

/**
 * "Scarica Dettaglio" button for the simulation detail pages.
 * @param {{
 *   simulationId: string,
 *   simulationType: 'sostituzione'|'spostamento',
 *   context: import('../../services/apiScenarios').SimulationContext|null,
 *   filenameParts: { programName?: string, targetName?: string, date?: string },
 * }} props
 */
export default function SimulationDetailDownloadButton({ simulationId, simulationType, context, filenameParts }) {
  const { toast } = useApp()
  const [exporting, setExporting] = useState(false)

  const handleDownload = async () => {
    setExporting(true)
    try {
      const [items, { exportSimulationDetailToExcel, buildSimulationDetailFilename }] = await Promise.all([
        getFeatures([{ id: simulationId, simulation_type: simulationType }]),
        import('../../utils/exportSimulationDetailExcel'),
      ])
      await exportSimulationDetailToExcel({
        simulationType,
        context,
        featureExplanations: items[0]?.feature_explanations,
        filename: buildSimulationDetailFilename({ simulationType, ...filenameParts }),
      })
    } catch (e) {
      toast(e.message || 'Errore esportazione', 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      type="button"
      className="scen-btn scen-btn--green"
      disabled={!context || exporting}
      title={!context ? 'Disponibile al termine del caricamento del contesto' : undefined}
      onClick={handleDownload}
    >
      {exporting ? 'Esportazione...' : 'Scarica Dettaglio'}
    </button>
  )
}
