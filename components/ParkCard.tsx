import Link from 'next/link'
import type { ParkData } from '@/types/park'

interface Props {
  park: ParkData
}

const ratingClass: Record<string, string> = {
  great: 'rating-great',
  good: 'rating-good',
  marginal: 'rating-marginal',
  poor: 'rating-poor',
}

export default function ParkCard({ park }: Props) {
  const thisNight = park.this_week.nights[0]
  const slug = park.park.slug

  return (
    <Link
      href={`/parks/${slug}`}
      className="card block no-underline hover:no-underline"
      style={{ textDecoration: 'none' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg leading-tight" style={{ color: 'var(--fg-primary)' }}>
          {park.park.name}
        </h3>
        {thisNight && (
          <span className={`rating-pill ${ratingClass[thisNight.rating]}`}>
            {thisNight.rating_emoji} Tonight
          </span>
        )}
      </div>

      {thisNight && (
        <div className="space-y-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>
          <div>
            🌑 {thisNight.moon_phase_name} · {thisNight.moon_illumination_pct}% lit
          </div>
          <div>
            🌃 Dark: {thisNight.dark_window_start} – {thisNight.dark_window_end}
          </div>
          {thisNight.weather_verdict && (
            <div>☁️ {thisNight.weather_verdict}</div>
          )}
        </div>
      )}

      <div className="mt-3 text-sm font-medium" style={{ color: 'var(--accent-link)' }}>
        View details →
      </div>
    </Link>
  )
}
