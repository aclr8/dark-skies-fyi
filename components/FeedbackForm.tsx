'use client'

import { useState } from 'react'

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xwvdzqjp'

export default function FeedbackForm() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    }
  }

  if (submitted) {
    return (
      <div role="status" aria-live="polite" className="card text-center py-8">
        <p className="text-2xl mb-2">🙏</p>
        <p className="font-semibold" style={{ color: 'var(--fg-primary)' }}>Thanks for your suggestion!</p>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>We review all park requests weekly.</p>
      </div>
    )
  }

  return (
    <section aria-labelledby="suggest-heading">
      <h2 id="suggest-heading" className="text-xl font-semibold mb-4" style={{ color: 'var(--fg-primary)' }}>
        Suggest a Park
      </h2>
      <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
        <div>
          <label htmlFor="park-name" className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-secondary)' }}>
            Park name <span aria-hidden>*</span>
          </label>
          <input
            id="park-name"
            name="park"
            type="text"
            required
            placeholder="e.g. Joshua Tree National Park"
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              color: 'var(--fg-primary)',
              outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent-400)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium mb-2" style={{ color: 'var(--fg-secondary)' }}>
            Why this park?
          </legend>
          <div className="space-y-2">
            {['Low light pollution', 'Great access', 'Unique landscape', 'Other'].map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--fg-secondary)' }}>
                <input
                  type="radio"
                  name="reason"
                  value={opt}
                  className="accent-sky-400"
                  style={{ accentColor: 'var(--accent-400)' }}
                />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1" style={{ color: 'var(--fg-secondary)' }}>
            Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Any details about the park or why it's great for dark-sky viewing…"
            className="w-full rounded-lg px-3 py-2 text-sm resize-none"
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              color: 'var(--fg-primary)',
              outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent-400)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: 'var(--rating-poor)' }}>
            Something went wrong — please try again.
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-lg py-2.5 text-sm font-semibold"
          style={{
            background: 'var(--accent-link)',
            color: 'var(--bg-base)',
          }}
        >
          Send suggestion
        </button>
      </form>
    </section>
  )
}
