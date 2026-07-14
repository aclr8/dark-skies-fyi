import { notFound } from 'next/navigation'
import { getAllParkSlugs, getParkData } from '@/lib/getParkData'
import WeeklySignal from '@/components/WeeklySignal'
import PlanningTable from '@/components/PlanningTable'

// Data is computed live (moon/twilight math + an Open-Meteo weather call) on
// each request, cached for an hour — see lib/getParkData.ts. generateStaticParams
// pre-renders this page at build time for known parks; revalidate keeps it
// from ever going stale beyond an hour (ISR), with no cron job or committed
// data file involved.
export const revalidate = 3600

export async function generateStaticParams() {
  return getAllParkSlugs().map((slug) => ({ slug }))
}

interface Props {
  params: { slug: string }
}

export default async function ParkPage({ params }: Props) {
  const data = await getParkData(params.slug)
  if (!data) notFound()

  const { park, this_week, planning_table } = data

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">
      {/* Park header */}
      <header>
        <p className="text-sm mb-1" style={{ color: 'var(--accent-400)' }}>
          <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>← All parks</a>
        </p>
        <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--fg-primary)' }}>
          {park.name}
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>
          {park.latitude.toFixed(2)}°N, {Math.abs(park.longitude).toFixed(2)}°W ·{' '}
          {park.timezone} ·{' '}
          Updated{' '}
          {/* Rendered in the park's own local zone (not the server's), since
              data now refreshes hourly and the exact time matters, not just
              the date. */}
          {new Intl.DateTimeFormat('en-US', {
            timeZone: park.timezone,
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short',
          }).format(new Date(data.generated_at))}
        </p>
      </header>

      {/* This week */}
      <WeeklySignal nights={this_week.nights} />

      {/* 12-month planning */}
      <PlanningTable windows={planning_table} />
    </div>
  )
}
