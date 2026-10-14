/**
 * Pure utility functions for working with scenario and simulation data.
 * Kept separate so they can be imported by the polling hook and the provider
 * without creating circular dependencies.
 */

export function hasRunningSimulations(scenarios) {
  return (scenarios || []).some(s =>
    (s.simulations || []).some(sim => sim.status === 'Running')
  )
}

export function getRunningSimulationIds(scenarios) {
  const ids = []
  for (const scenario of scenarios || []) {
    for (const simulation of scenario.simulations || []) {
      if (simulation?.status === 'Running' && simulation?.id) {
        ids.push(simulation.id)
      }
    }
  }
  return ids
}

export function chunkArray(items, size) {
  if (!items?.length) return []
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export function patchScenariosWithStatuses(scenarios, statusItems) {
  if (!statusItems?.length) return scenarios

  const byId = new Map(statusItems.map(item => [item.id, item]))
  let changed = false

  const nextScenarios = (scenarios || []).map(scenario => {
    let scenarioChanged = false
    const nextSimulations = (scenario.simulations || []).map(simulation => {
      const patch = byId.get(simulation.id)
      if (!patch) return simulation

      const nextSimulation = {
        ...simulation,
        status: patch.status,
        share_result: patch.share_result,
        last_error: patch.last_error,
        modified_date: patch.modified_date,
      }

      if (
        nextSimulation.status !== simulation.status
        || nextSimulation.share_result !== simulation.share_result
        || nextSimulation.last_error !== simulation.last_error
        || nextSimulation.modified_date !== simulation.modified_date
      ) {
        scenarioChanged = true
        changed = true
        return nextSimulation
      }

      return simulation
    })

    return scenarioChanged ? { ...scenario, simulations: nextSimulations } : scenario
  })

  return changed ? nextScenarios : scenarios
}
