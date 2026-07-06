interface Props {
  illumination: number
  phaseName: string
  size?: number
}

export default function MoonPhaseIcon({ illumination, phaseName, size = 40 }: Props) {
  const r = size / 2
  const pct = illumination / 100

  // Terminator ellipse rx derived from: lit_area = πr(r ± tRx)/2 = pct·πr²
  const tRx = Math.abs(2 * pct - 1) * (r - 1)

  const isWaning =
    phaseName.toLowerCase().includes('waning') ||
    phaseName.toLowerCase().includes('last quarter')
  const isGibbous = pct > 0.5

  const ariaLabel = `${phaseName} — ${illumination}% lit`

  // Edge cases
  if (illumination <= 1) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={ariaLabel} role="img">
        <circle cx={r} cy={r} r={r - 1} fill="#0f172a" />
      </svg>
    )
  }
  if (illumination >= 99) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={ariaLabel} role="img">
        <circle cx={r} cy={r} r={r - 1} fill="#e2e8f0" />
      </svg>
    )
  }

  // Build lit-area path.
  // Convention: waxing = light on right, waning = light on left.
  // SVG arc sweep: 0 = CCW, 1 = CW.
  //
  // Each path traces:
  //   1. The lit-side semicircle of the outer disc (top → bottom)
  //   2. Back to top via the terminator ellipse
  //
  // Crescent  (<50%): terminator cuts INTO the lit semicircle  → same sweep back
  // Gibbous   (>50%): terminator ADDS a sliver on the dark side → opposite sweep back
  const top = `${r},${1}`
  const bot = `${r},${size - 1}`
  let path: string

  if (!isWaning) {
    // WAXING — light on right
    if (!isGibbous) {
      // Crescent: CW right semicircle ↓, CW back up via right side of terminator
      path = `M ${top} A ${r - 1},${r - 1} 0 0,1 ${bot} A ${tRx},${r - 1} 0 0,1 ${top}`
    } else {
      // Gibbous: CW right semicircle ↓, CCW back up via left side of terminator
      path = `M ${top} A ${r - 1},${r - 1} 0 0,1 ${bot} A ${tRx},${r - 1} 0 0,0 ${top}`
    }
  } else {
    // WANING — light on left
    if (!isGibbous) {
      // Crescent: CCW left semicircle ↓, CCW back up via left side of terminator
      path = `M ${top} A ${r - 1},${r - 1} 0 0,0 ${bot} A ${tRx},${r - 1} 0 0,0 ${top}`
    } else {
      // Gibbous: CCW left semicircle ↓, CW back up via right side of terminator
      path = `M ${top} A ${r - 1},${r - 1} 0 0,0 ${bot} A ${tRx},${r - 1} 0 0,1 ${top}`
    }
  }

  const clipId = `mc-${illumination}-${isWaning ? 'n' : 'x'}`

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={ariaLabel}
      role="img"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={r} cy={r} r={r - 1} />
        </clipPath>
      </defs>
      {/* Dark background */}
      <circle cx={r} cy={r} r={r - 1} fill="#0f172a" />
      {/* Lit area — clipped to disc */}
      <path d={path} fill="#e2e8f0" clipPath={`url(#${clipId})`} />
    </svg>
  )
}
