/**
 * @typedef {import('./competitorProgramViewModel').CompetitorProgramViewModel} CompetitorProgramViewModel
 */

/**
 * @typedef {Object} CompetitorChannelViewModel
 * @property {string} channel
 * @property {'RAI'|'Competitor'} channel_type
 * @property {CompetitorProgramViewModel[]} programs
 */

/**
 * @typedef {Object} CompetitorProgramsViewModel
 * @property {string} channel
 * @property {string} day
 * @property {string} from_time
 * @property {string} to_time
 * @property {string} program_name
 * @property {CompetitorChannelViewModel[]} other_channels
 */

export {}
