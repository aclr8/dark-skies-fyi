interface Props {
  illumination: number
  phaseName: string
  size?: number
}

/**
 * Maps moon illumination + direction to the closest Unicode moon emoji.
 * Uses illumination percentage and whether the moon is waning (decreasing),
 * so e.g. "Waning Gibbous 40%" correctly shows a crescent, not a gibbous.
 *
 * Thresholds (8 emoji across 0–100%):
 *   < 3%               → 🌑  New Moon
 *   Waxing  3–44%      → 🌒  Waxing Crescent
 *   Waxing 45–64%      → 🌓  First Quarter
 *   Waxing 65–96%      → 🌔  Waxing Gibbous
 *   ≥ 97%              → 🌕  Full Moon
 *   Waning 65–96%      → 🌖  Waning Gibbous
 *   Waning 45–64%      → 🌗  Last Quarter
 *   Waning  3–44%      → 🌘  Waning Crescent
 */
function getPhaseEmoji(illumination: number, phaseName: string): string {
  if (illumination < 3)  return '🌑'
  if (illumination >= 97) return '🌕'

  const name = phaseName.toLowerCase()
  const isWaning = name.includes('waning') || name.includes('last quarter')

  if (isWaning) {
    if (illumination >= 65) return '🌖'   // waning gibbous
    if (illumination >= 45) return '🌗'   // last quarter
    return '🌘'                            // waning crescent
  } else {
    if (illumination >= 65) return '🌔'   // waxing gibbous
    if (illumination >= 45) return '🌓'   // first quarter
    return '🌒'                            // waxing crescent
  }
}

export default function MoonPhaseIcon({ illumination, phaseName, size = 40 }: Props) {
  const emoji = getPhaseEmoji(illumination, phaseName)
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
