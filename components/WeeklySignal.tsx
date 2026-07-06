import MoonPhaseIcon from './MoonPhaseIcon'
import { formatDuration, to12Hour } from '@/lib/getParkData'
import type { ParkNight } from '@/types/park'

interface Props {
  nights: ParkNight[]
}

const ratingClass: Record<string, string> = {
  great: 'rating-great',
  good: 'rating-good',
  marginal: 'rating-marginal',
  poor: 'rating-poor',
}

export default function WeeklySignal({ nights }: Props) {
  return (
    <section aria-labelledby="weekly-heading" className="space-y-4">
      <h2 id="weekly-heading" className="text-xl font-semibold" style={{ color: 'var(--fg-primary)' }}>
        This Week
      </h2>
      {nights.map((night) => (
        <article key={night.date} className="card">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <MoonPhaseIcon
                illumination={night.moon_illumination_pct}
                phaseName={night.moon_phase_name}
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg" style={{ color: 'var(--fg-primary)' }}>
                    {night.label}
                  </h3>
                  <span className={`rating-pill ${ratingClass[night.rating]}`}>
                    {night.rating_emoji} {night.rating.charAt(0).toUpperCase() + night.rating.slice(1)}
                  </span>
                </div>
                <p className="text-sm mt-0.5" style={{ color: 'var(--fg-secondary)' }}>
                  {night.moon_phase_name} · {night.moon_illumination_pct}% lit
                </p>
              </div>
            </div>
            <div className="text-right text-sm" style={{ color: 'var(--fg-secondary)' }}>
              <div>
                Dark window: <strong style={{ color: 'var(--fg-primary)' }}>
                  {to12Hour(night.dark_window_start)} – {to12Hour(night.dark_window_end)}
                </strong>
              </div>
              <div>{formatDuration(night.dark_window_minutes)} total</div>
            </div>
          </div>

          {night.moon_note && (
            <p className="mt-3 text-sm rounded-lg px-3 py-2" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>
              ⚠️ {night.moon_note}
            </p>
          )}

          {night.cloud_cover_available && night.cloud_cover_hourly.length > 0 && (
            <div className="mt-4">
              <p className="text-xs mb-2" style={{ color: 'var(--fg-muted)' }}>Cloud cover during dark window</p>
              <div className="flex gap-1 items-end h-10">
                {night.cloud_cover_hourly.map((h) => {
                  const pct = h.pct
                  const height = Math.max(4, pct)
                  const color = pct <= 10 ? '#4ade80' : pct <= 30 ? '#a3e635' : pct <= 50 ? '#fbbf24' : '#f87171'
                  return (
                    <div key={h.hour} className="flex flex-col items-center gap-1 flex-1" title={`${h.hour}: ${pct}%`}>
                      <div
                        style={{ height: `${height}%`, minHeight: 4, background: color, borderRadius: 2, width: '100%' }}
                      />
                      <span className="text-xs" style={{ color: 'var(--fg-muted)', fontSize: '0.6rem' }}>
                        {h.hour.slice(0, 2)}
                      </span>
                    </div>
                  )
                })}
              </div>
              {night.weather_verdict && (
                <p className="text-sm mt-2 font-medium" style={{ color: 'var(--fg-secondary)' }}>
                  {night.weather_verdict}
                </p>
              )}
            </div>
          )}

          {!night.cloud_cover_available && (
            <p className="mt-3 text-sm" style={{ color: 'var(--fg-muted)' }}>
              ⏳ Weather data unavailable for this window
            </p>
          )}
        </article>
      ))}
    </section>
  )
}
