/**
 * @typedef {import('../simulation/simulationSostViewModel').SimulationSost} SimulationSost
 * @typedef {import('../simulation/simulationSpostaViewModel').SimulationSposta} SimulationSposta
 * @typedef {import('../weekly_programming/competitorProgramsViewModel').CompetitorProgramsViewModel} CompetitorProgramsViewModel
 */

/**
 * @typedef {Object} ScenarioViewModel
 * @property {string} id
 * @property {string} scenario_type
 * @property {string} program_id
 * @property {string} program_name
 * @property {string} program_channel
 * @property {string|null} program_date
 * @property {string|null} program_from_time
 * @property {string|null} program_to_time
 * @property {number|null} program_share_predict
 * @property {string|null} creation_date
 * @property {string|null} modified_date
 * @property {(SimulationSost|SimulationSposta)[]} simulations
 */

/**
 * @typedef {Object} ScenarioListViewModel
 * @property {ScenarioViewModel[]} scenarios
 * @property {number} total
 */

/**
 * @typedef {CompetitorProgramsViewModel} ScenCompetitorProgramsViewModel
 */

export {}
