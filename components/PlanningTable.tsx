import type { PlanningWindow } from '@/types/park'

interface Props {
  windows: PlanningWindow[]
}

const comfortColor: Record<string, string> = {
  great: '#4ade80',
  good: '#a3e635',
  warm: '#fbbf24',
  hot: '#f87171',
}

const trendLabel: Record<string, string> = {
  up: '↑',
  down: '↓',
  flat: '–',
}

export default function PlanningTable({ windows }: Props) {
  return (
    <section aria-labelledby="planning-heading">
      <h2 id="planning-heading" className="text-xl font-semibold mb-4" style={{ color: 'var(--fg-primary)' }}>
        Planning Ahead — Next 12 Dark Windows
      </h2>
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--fg-muted)' }}>Window</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell" style={{ color: 'var(--fg-muted)' }}>New Moon</th>
              <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--fg-muted)' }}>Hi / Lo °F</th>
              <th className="text-center px-4 py-3 font-medium hidden md:table-cell" style={{ color: 'var(--fg-muted)' }}>Trend</th>
              <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--fg-muted)' }}>Comfort</th>
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
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--fg-primary)' }}>
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
      <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>
        ↑ = warming trend ≥ +5.4°F/12yr · – = flat · Comfort: Great &lt;65° · Good 65–84° · Warm 85–100° · Hot &gt;100°
      </p>
    </section>
  )
}
