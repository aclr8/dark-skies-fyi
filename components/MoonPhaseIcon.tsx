interface Props {
  illumination: number
  phaseName: string
  size?: number
}

function getPhaseEmoji(phaseName: string): string {
  const name = phaseName.toLowerCase()
  if (name.includes('new moon'))        return '🌑'
  if (name.includes('waxing crescent')) return '🌒'
  if (name.includes('first quarter'))   return '🌓'
  if (name.includes('waxing gibbous'))  return '🌔'
  if (name.includes('full moon'))       return '🌕'
  if (name.includes('waning gibbous'))  return '🌖'
  if (name.includes('last quarter'))    return '🌗'
  if (name.includes('waning crescent')) return '🌘'
  return '🌙'
}

export default function MoonPhaseIcon({ illumination, phaseName, size = 40 }: Props) {
  const emoji = getPhaseEmoji(phaseName)
  return (
    <span
      role="img"
      aria-label={`${phaseName} — ${illumination}% lit`}
      style={{ fontSize: size * 0.9, lineHeight: 1, display: 'inline-block' }}
    >
      {emoji}
    </span>
  )
}
