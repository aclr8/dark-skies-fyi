import { getAllParkSlugs, getParkData } from '@/lib/getParkData'
import ParkCard from '@/components/ParkCard'
import FeedbackForm from '@/components/FeedbackForm'

export default function HomePage() {
  const slugs = getAllParkSlugs()
  const parks = slugs.map((s) => getParkData(s)).filter(Boolean)

  return (
    <>
      {/* Hero — star-field photo layer via .hero CSS class */}
      <section className="hero" aria-label="Hero">
        <div className="max-w-5xl mx-auto px-4 w-full">
          <span
            className="inline-block text-xs font-semibold tracking-widest uppercase mb-3 px-3 py-1 rounded-full"
            style={{ background: 'var(--accent-400)', color: 'var(--bg-base)' }}
          >
            Dark-Sky Windows
          </span>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4" style={{ color: 'var(--fg-primary)' }}>
            Find your next<br />
            <span style={{ color: 'var(--accent-100)' }}>perfect dark sky</span>
          </h1>
          <p className="text-lg mb-6 max-w-lg" style={{ color: 'var(--fg-secondary)' }}>
            Weekly moon &amp; weather windows for desert state and national parks.
            Updated every Wednesday.
          </p>
          <a
            href="#parks"
            className="inline-block rounded-lg px-6 py-3 font-semibold text-sm"
            style={{ background: 'var(--accent-400)', color: 'var(--bg-base)' }}
          >
            See this week's windows ↓
          </a>
        </div>
      </section>

      {/* Park list */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <section id="parks" aria-labelledby="parks-heading">
          <h2 id="parks-heading" className="text-2xl font-bold mb-6" style={{ color: 'var(--fg-primary)' }}>
            Parks
          </h2>
          {parks.length === 0 ? (
            <p style={{ color: 'var(--fg-secondary)' }}>No park data available yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {parks.map((park) => (
                <ParkCard key={park!.park.slug} park={park!} />
              ))}
            </div>
          )}
        </section>

        {/* Suggest CTA */}
        <div id="suggest" className="mt-16 max-w-lg">
          <FeedbackForm />
        </div>
      </div>
    </>
  )
}
