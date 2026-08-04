import './ProgramRowBody.css'

function isMeaningfulTargetSex(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized !== '' && normalized !== 'tutti' && normalized !== 'all'
}

function buildProgramSubMeta(program) {
  const subMeta = []

  if (program?.genre) subMeta.push(program.genre)
  if (program?.target_age) subMeta.push(program.target_age)
  if (isMeaningfulTargetSex(program?.target_sex)) subMeta.push(program.target_sex)

  if (typeof program?.duration_minutes === 'number' && program.duration_minutes > 0) {
    subMeta.push(`${program.duration_minutes} min`)
  }

  return subMeta
}

/**
 * @param {{
 *  program: { program_name?: string|null, channel?: string|null, genre?: string|null, target_age?: string|null, target_sex?: string|null, duration_minutes?: number|null },
 *  channelClass?: string,
 * }} props
 */
export default function ProgramRowBody({ program, channelClass = '' }) {
  const subMeta = buildProgramSubMeta(program)
  const title = program?.program_name || '—'
  const channel = program?.channel || 'N/A'

  return (
    <div className="prow-body">
      <span className="prow-title">{title}</span>
      <span className="prow-sub">
        <span className={`prow-ch-name${channelClass ? ` ${channelClass}` : ''}`}>{channel}</span>
        {subMeta.length > 0 && ` · ${subMeta.join(' · ')}`}
      </span>
    </div>
  )
}
