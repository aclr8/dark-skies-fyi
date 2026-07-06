interface Props {
  illumination: number
  phaseName: string
  size?: number
}

export default function MoonPhaseIcon({ illumination, phaseName, size = 40 }: Props) {
  const r = size / 2
  const ri = r - 1  // disc radius (1px inset)
  const pct = illumination / 100

  // Terminator ellipse x-radius:
  //   lit_area = πri(ri ± tRx)/2 = pct·πri²  →  tRx = |2pct−1|·ri
  const tRx = Math.abs(2 * pct - 1) * ri

  const isWaning =
    phaseName.toLowerCase().includes('waning') ||
    phaseName.toLowerCase().includes('last quarter')
  const isGibbous = pct > 0.5

  const ariaLabel = `${phaseName} — ${illumination}% lit`
  const clipId = `mc-${illumination}-${isWaning ? 'n' : 'x'}`
  const top = `${r},${1}`
  const bot = `${r},${size - 1}`

  if (illumination <= 1) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={ariaLabel} role="img">
        <circle cx={r} cy={r} r={ri} fill="#0f172a" />
      </svg>
    )
  }
  if (illumination >= 99) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={ariaLabel} role="img">
        <circle cx={r} cy={r} r={ri} fill="#e2e8f0" />
      </svg>
    )
  }

  // Strategy: draw bright disc, then overlay the shadow region.
  //
  // SVG arc sweep: 1 = CW on screen (y-down), 0 = CCW.
  //   top→bot sweep=1: RIGHT side    top→bot sweep=0: LEFT side
  //   bot→top sweep=1: LEFT side     bot→top sweep=0: RIGHT side
  //
  // Shadow paths (2 arcs each):
  //
  //  Waning crescent  (shadow RIGHT, large):
  //    right disc arc down (CW) + left terminator back up (CW)
  //    M top  A ri,ri   0 0,1 bot  A tRx,ri  0 0,1 top
  //
  //  Waning gibbous   (shadow RIGHT, thin):
  //    right terminator arc down (CW) + right disc limb back up (CCW)
  //    M top  A tRx,ri  0 0,1 bot  A ri,ri   0 0,0 top
  //
  //  Waxing crescent  (shadow LEFT, large):
  //    left disc arc down (CCW) + right terminator back up (CCW)
  //    M top  A ri,ri   0 0,0 bot  A tRx,ri  0 0,0 top
  //
  //  Waxing gibbous   (shadow LEFT, thin):
  //    left terminator arc down (CCW) + left disc limb back up (CW)
  //    M top  A tRx,ri  0 0,0 bot  A ri,ri   0 0,1 top

  let shadowPath: string

  if (isWaning) {
    shadowPath = isGibbous
      ? `M ${top} A ${tRx},${ri} 0 0,1 ${bot} A ${ri},${ri} 0 0,0 ${top}`
      : `M ${top} A ${ri},${ri} 0 0,1 ${bot} A ${tRx},${ri} 0 0,1 ${top}`
  } else {
    shadowPath = isGibbous
      ? `M ${top} A ${tRx},${ri} 0 0,0 ${bot} A ${ri},${ri} 0 0,1 ${top}`
      : `M ${top} A ${ri},${ri} 0 0,0 ${bot} A ${tRx},${ri} 0 0,0 ${top}`
  }

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
          <circle cx={r} cy={r} r={ri} />
        </clipPath>
      </defs>
      {/* Bright disc */}
      <circle cx={r} cy={r} r={ri} fill="#e2e8f0" />
      {/* Shadow overlay, clipped to disc */}
      <path d={shadowPath} fill="#0f172a" clipPath={`url(#${clipId})`} />
    </svg>
  )
}
