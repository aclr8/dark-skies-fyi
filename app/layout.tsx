import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'dark-skies.fyi — Desert Park Dark-Sky Windows',
  description: 'Weekly dark-sky viewing windows for desert state and national parks, starting with Anza-Borrego.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-nav">Skip to main content</a>

        <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-base)' }}>
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" style={{ color: 'var(--fg-primary)', textDecoration: 'none' }}>
              <span className="font-bold text-lg tracking-tight">🌌 dark-skies.fyi</span>
            </a>
            <nav aria-label="Site navigation">
              <a
                href="#suggest"
                className="text-sm"
                style={{ color: 'var(--accent-link)', textDecoration: 'none' }}
              >
                Suggest a park
              </a>
            </nav>
          </div>
        </header>

        <main id="main">
          {children}
        </main>

        <footer style={{ borderTop: '1px solid var(--border)', marginTop: '4rem' }}>
          <div className="max-w-5xl mx-auto px-4 py-6 text-sm" style={{ color: 'var(--fg-muted)' }}>
            <p>
              Data: <a href="https://open-meteo.com" style={{ color: 'var(--accent-link)' }}>Open-Meteo</a> ·{' '}
              Astronomical calculations computed offline ·{' '}
              <a href="mailto:contact@dark-skies.fyi" style={{ color: 'var(--accent-link)' }}>contact@dark-skies.fyi</a> ·{' '}
              <a
                href="https://www.linkedin.com/in/al-dean/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-link)' }}
              >
                LinkedIn
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
