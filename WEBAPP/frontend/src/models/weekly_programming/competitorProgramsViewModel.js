/**
 * @typedef {Object} OtherProgramViewModel
 * @property {string} canale
 * @property {string|null} program_name
 * @property {string|null} from_time
 * @property {string|null} to_time
 * @property {number|null} share_storico
 * @property {string|null} target_sex
 * @property {string|null} target_age
 * @property {string|null} genre
 */

/**
 * @typedef {Object} CompetitorChannelViewModel
 * @property {string} channel
 * @property {'RAI'|'Competitor'} channel_type
 * @property {OtherProgramViewModel[]} programs
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
