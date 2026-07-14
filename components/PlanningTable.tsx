import type { PlanningWindow } from '@/types/park'

interface Props {
  windows: PlanningWindow[]
}

// Cool-to-hot ramp matching the Southwest US comfort scale, centered on
// "Comfortable" as the green midpoint rather than treating heat as universally bad.
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

const trendLabel: Record<string, string> = {
  up: '↑',
  down: '↓',
  flat: '–',
}

export default function PlanningTable({ windows }: Props) {
  return (
    <section aria-labelledby="planning-heading">
      <h2 id="planning-heading" className="text-xl font-semibold mb-2" style={{ color: 'var(--fg-primary)' }}>
        Planning Ahead — Next 12 Dark Windows
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
        Plan around the temps you can tolerate here, then confirm against This Week's forecast once you're within
        about 72 hours of your trip — short-range forecasts hold up a lot better than long-range averages beyond
        that window.
      </p>
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--fg-secondary)' }}>Window</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell" style={{ color: 'var(--fg-secondary)' }}>New Moon</th>
              <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--fg-secondary)' }}>Hi / Lo °F (30-yr avg)</th>
              <th className="text-center px-4 py-4 font-medium hidden md:table-cell" style={{ color: 'var(--fg-secondary)', lineHeight: 1.3 }}>5yr Temp<br />Trend</th>
              <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--fg-secondary)' }}>Comfort</th>
            </tr>
          </thead>
          <tbody>
            {windows.map((w, i) => (
              <tr
                key={w.new_moon_date}
                style={{
                  background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-card)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--fg-primary)' }}>
                  {w.window_start.slice(5)} – {w.window_end.slice(5)}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--fg-secondary)' }}>
                  {w.new_moon_date} <span style={{ color: 'var(--fg-muted)' }}>{w.new_moon_time_local}</span>
                </td>
                <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--fg-primary)' }}>
                  {w.temp_high_f}° / {w.temp_low_f}°
                </td>
                <td className="px-4 py-3 text-center hidden md:table-cell" style={{ color: 'var(--fg-muted)' }}>
                  {trendLabel[w.temp_trend]}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                    style={{
                      color: comfortColor[w.comfort_rating],
                      background: `${comfortColor[w.comfort_rating]}22`,
                    }}
                  >
                    {w.comfort_label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>
        ↑ = warming trend ≥ +5.4°F/12yr · – = flat
      </p>
      <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
        Comfort (daytime high): Icy &lt;32° · V. Cold 32–49° · Cold 50–60° · Comfortable 61–72° · Warm 73–78° · Hot
        79–99° · V Hot 100–112° · Way Too Hot ≥113°
      </p>
      <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>
        Hi/Lo based on{' '}
        <a
          href="https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline' }}
        >
          NOAA 30-year climate normals
        </a>
        , Borrego Springs, CA station USW00093184.
      </p>
    </section>
  )
}
