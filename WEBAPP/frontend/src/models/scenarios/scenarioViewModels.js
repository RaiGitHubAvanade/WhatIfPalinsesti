/**
 * @typedef {import('./simulationViewModels').SimulationSost} SimulationSost
 * @typedef {import('./simulationViewModels').SimulationSposta} SimulationSposta
 */

/**
 * @typedef {Object} ScenarioViewModel
 * @property {string} id
 * @property {string} scenario_type
 * @property {string} program_name
 * @property {string} program_channel
 * @property {string|null} program_date
 * @property {string|null} program_from_time
 * @property {number|null} program_share_predict
 * @property {string|null} creation_date
 * @property {(SimulationSost|SimulationSposta)[]} simulations
 */

/**
 * @typedef {Object} ScenarioListViewModel
 * @property {ScenarioViewModel[]} scenarios
 * @property {number} total
 */

export {}
