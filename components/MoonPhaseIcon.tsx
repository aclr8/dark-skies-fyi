interface Props {
  illumination: number
  phaseName: string
  size?: number
}

export default function MoonPhaseIcon({ illumination, phaseName, size = 40 }: Props) {
  const r = size / 2
  const cx = r
  const cy = r

  // Shadow arc width: 0% lit = full dark half, 100% lit = full bright
  // We approximate by drawing a dark ellipse overlay
  const pct = illumination / 100
  // rx of shadow ellipse: 0 at 50% lit, r at 0% or 100%
  const rx = Math.abs(pct - 0.5) * 2 * r
  const waning = phaseName.toLowerCase().includes('waning') || phaseName === 'Last Quarter'
  const shadowLeft = !waning

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`${phaseName} — ${illumination}% lit`}
      role="img"
    >
      {/* Moon disc */}
      <circle cx={cx} cy={cy} r={r - 1} fill="#e2e8f0" />
      {/* Shadow ellipse */}
      {illumination < 99 && (
        <ellipse
          cx={shadowLeft ? cx - r + rx : cx + r - rx}
          cy={cy}
          rx={rx || 1}
          ry={r - 1}
          fill="#1e293b"
          opacity={pct < 0.5 ? 0.9 : 0.7}
        />
      )}
      {illumination === 0 && (
        <circle cx={cx} cy={cy} r={r - 1} fill="#1e293b" />
      )}
    </svg>
  )
}
