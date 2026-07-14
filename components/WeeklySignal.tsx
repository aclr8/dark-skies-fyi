import MoonPhaseIcon from './MoonPhaseIcon'
import { formatDuration, to12Hour } from '@/lib/getParkData'
import { comfortRating } from '@/lib/astro'
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

// Same ramp used in the Planning Ahead table, so the same temp reads as the
// same color everywhere on the page.
const comfortColor: Record<string, string> = {
  icy: '#3b82f6',
  very_cold: '#38bdf8',
  cold: '#22d3ee',
  comfortable: '#4ade80',
  warm: '#a3e635',
  hot: '#fbbf24',
  very_hot: '#f97316',
  way_too_hot: '#f87171',
}

export default function WeeklySignal({ nights }: Props) {
  return (
    <section aria-labelledby="weekly-heading" className="space-y-4">
      <div>
        <h2 id="weekly-heading" className="text-xl font-semibold" style={{ color: 'var(--fg-primary)' }}>
          This Week
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
          Live hourly forecast via{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
            Open-Meteo
          </a>
          , refreshed hourly.
        </p>
      </div>
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
                {night.is_tonight && (
                  // One-time example so less-familiar visitors can read every
                  // other card's 24-hour hour-axis ticks by inference.
                  <span style={{ color: 'var(--fg-muted)' }}> ({night.dark_window_start} – {night.dark_window_end} military)</span>
                )}
              </div>
              <div>{formatDuration(night.dark_window_minutes)} total</div>
              {night.dark_window_temp_low_f !== null && night.dark_window_temp_high_f !== null && (
                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                  <span>
                    {night.dark_window_temp_low_f === night.dark_window_temp_high_f
                      ? `${night.dark_window_temp_high_f}°F`
                      : `${night.dark_window_temp_low_f}–${night.dark_window_temp_high_f}°F`}{' '}
                    during window
                  </span>
                  {(() => {
                    const { rating, label } = comfortRating(night.dark_window_temp_high_f as number)
                    return (
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ color: comfortColor[rating], background: `${comfortColor[rating]}22` }}
                      >
                        {label}
                      </span>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          {night.moon_note && (
            <p className="mt-3 text-sm rounded-lg px-3 py-2" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>
              ⚠️ {night.moon_note}
            </p>
          )}

          {night.cloud_cover_available && night.cloud_cover_hourly.length > 0 && (
            <div className="mt-4">
              <p className="text-sm mb-2" style={{ color: 'var(--fg-secondary)' }}>
                Cloud cover during dark window ({night.tz_abbr}, 24-hr)
              </p>
              <div className="flex gap-1 items-end h-10">
                {night.cloud_cover_hourly.map((h) => {
                  const pct = h.pct
                  const height = Math.max(4, pct)
                  const color = pct <= 10 ? '#4ade80' : pct <= 30 ? '#a3e635' : pct <= 50 ? '#fbbf24' : '#f87171'
                  return (
                    <div key={h.hour} className="flex flex-col items-center gap-1 flex-1" title={`${h.hour} ${night.tz_abbr}: ${pct}%`}>
                      <div
                        style={{ height: `${height}%`, minHeight: 4, background: color, borderRadius: 2, width: '100%' }}
                      />
                      <span style={{ color: 'var(--fg-muted)', fontSize: '0.7rem', lineHeight: 1 }}>
                        {h.hour}
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