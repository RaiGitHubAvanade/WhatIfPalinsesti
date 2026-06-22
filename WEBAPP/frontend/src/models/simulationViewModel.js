/**
 * @typedef {Object} ProgramItem
 * @property {string} id
 * @property {string} title
 * @property {string|null} genre
 * @property {string|null} time
 * @property {string|null} end
 * @property {number|null} dur
 * @property {string} ch
 * @property {number|null} share
 * @property {string|null} eta
 * @property {string|null} sesso
 * @property {string|null} tipo
 * @property {string|null} slot
 */

/**
 * @typedef {Object} ProgramListViewModel
 * @property {ProgramItem[]} programs
 * @property {number} total
 */

/**
 * @typedef {Object} CompetitorItem
 * @property {string} title
 * @property {string} ch
 * @property {string|null} tipo
 * @property {number|null} share
 * @property {boolean} evento
 */

/**
 * @typedef {Object} CompetitorListViewModel
 * @property {CompetitorItem[]} competitors
 */

/**
 * @typedef {Object} SimResultSost
 * @property {'sostituzione'} mode
 * @property {string} orig_title
 * @property {number|null} orig_share
 * @property {string} orig_ch
 * @property {string|null} orig_time
 * @property {string|null} orig_end
 * @property {string} cand_title
 * @property {number|null} cand_share
 * @property {number|null} predicted_share
 * @property {number|null} delta
 */

/**
 * @typedef {Object} SimResultSposta
 * @property {'spostamento'} mode
 * @property {string} prog_title
 * @property {string} orig_ch
 * @property {string} orig_date
 * @property {string|null} orig_time
 * @property {string|null} orig_end
 * @property {number|null} orig_slot_share
 * @property {string|null} dest_ch
 * @property {string|null} dest_date
 * @property {string|null} dest_time
 * @property {number|null} dest_slot_share
 * @property {number|null} delta
 */

/**
 * @typedef {Object} ScheduleItem
 * @property {string} id
 * @property {string} title
 * @property {string} time
 * @property {string|null} end
 * @property {number|null} dur
 * @property {number|null} share
 * @property {string|null} tipo
 * @property {string|null} genre
 */

/**
 * @typedef {Object} ChannelScheduleViewModel
 * @property {string} ch
 * @property {string} date
 * @property {string} dest_time
 * @property {ScheduleItem[]} programs
 */
