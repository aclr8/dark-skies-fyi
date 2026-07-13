/**
 * lib/astro.ts
 * ============
 * Offline astronomy + rating/formatting helpers used by getParkData.ts.
 *
 * Replaces the old scripts/generate_data.py (Python + `ephem`) pipeline.
 * Moon/sun positions come from the `suncalc` package; everything else here
 * is a direct port of the rating/verdict/comfort logic that used to live in
 * generate_data.py, so the JSON shape and thresholds are unchanged.
 */

import SunCalc from 'suncalc'

const SYNODIC_MONTH_DAYS = 29.530588853
// Reference new moon: Jan 6, 2000 18:14 UTC (standard epoch for mean-synodic calcs)
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14, 0)

// ── Phase / rating / verdict helpers (ported 1:1 from generate_data.py) ─────

export function getPhaseName(illumination: number, isWaning: boolean): string {
  if (illumination < 2) return 'New Moon'
  if (illumination >= 98) return 'Full Moon'
  if (!isWaning) {
    if (illumination < 45) return 'Waxing Crescent'
    if (illumination < 55) return 'First Quarter'
    return 'Waxing Gibbous'
  } else {
    if (illumination > 55) return 'Waning Gibbous'
    if (illumination > 45) return 'Last Quarter'
    return 'Waning Crescent'
  }
}

export function computeRating(
  illumination: number,
  cloudAvg: number | null
): { rating: 'great' | 'good' | 'marginal' | 'poor'; emoji: string } {
  const cloud = cloudAvg ?? 50 // pessimistic default when weather is unavailable
  if (illumination <= 10 && cloud <= 20) return { rating: 'great', emoji: '⭐' }
  if (illumination <= 30 && cloud <= 40) return { rating: 'good', emoji: '✅' }
  if (illumination <= 55 || cloud <= 55) return { rating: 'marginal', emoji: '🌥' }
  return { rating: 'poor', emoji: '☁️' }
}

export function weatherVerdict(cloudAvg: number | null): string | null {
  if (cloudAvg === null) return null
  if (cloudAvg <= 10) return 'Clear skies forecast'
  if (cloudAvg <= 30) return `Mostly clear (${cloudAvg}% avg cloud cover)`
  if (cloudAvg <= 60) return `Partly cloudy (${cloudAvg}% avg cloud cover)`
  return `Cloudy — ${cloudAvg}% avg cloud cover`
}

export function moonNote(illumination: number): string | null {
  if (illumination >= 80) return `Bright moon (${illumination}% lit) — most faint objects washed out`
  if (illumination >= 50) return `Half-lit moon (${illumination}%) — best viewing after moonset`
  return null
}

export function comfortRating(tempHigh: number): { rating: 'great' | 'good' | 'warm' | 'hot'; label: string } {
  if (tempHigh < 65) return { rating: 'great', label: 'Great' }
  if (tempHigh < 85) return { rating: 'good', label: 'Good' }
  if (tempHigh < 100) return { rating: 'warm', label: 'Warm' }
  return { rating: 'hot', label: 'Hot' }
}

// ── Timezone-aware local <-> UTC helpers ────────────────────────────────────
// Node has no built-in "zoned time" type, so these use Intl.DateTimeFormat to
// convert between an IANA zone's wall-clock time and the absolute UTC instant.

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function partsInZone(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts: Record<string, string> = {}
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value
  return {
    year: +parts.year,
    month: +parts.month,
    day: +parts.day,
    hour: parts.hour === '24' ? 0 : +parts.hour,
    minute: +parts.minute,
    second: +parts.second,
  }
}

/** Convert a local wall-clock date/time in `timeZone` to the equivalent UTC Date. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  let asUtc = Date.UTC(year, month - 1, day, hour, minute, 0)
  // Two correction passes handles the (rare) case where the first guess
  // lands close enough to a DST boundary that one pass isn't quite enough.
  for (let i = 0; i < 2; i++) {
    const p = partsInZone(new Date(asUtc), timeZone)
    const asIfLocal = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
    const target = Date.UTC(year, month - 1, day, hour, minute, 0)
    asUtc += target - asIfLocal
  }
  return new Date(asUtc)
}

/** "Today" as a {year, month, day} triple, as observed in `timeZone`. */
export function todayInZone(timeZone: string): { year: number; month: number; day: number } {
  const p = partsInZone(new Date(), timeZone)
  return { year: p.year, month: p.month, day: p.day }
}

export function addDays(y: number, m: number, d: number, delta: number): { year: number; month: number; day: number } {
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + delta)
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() }
}

export function isoDate(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function hhmmInZone(date: Date, timeZone: string): string {
  const p = partsInZone(date, timeZone)
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}

export function dateInZoneMatches(date: Date, timeZone: string, y: number, m: number, d: number): boolean {
  const p = partsInZone(date, timeZone)
  return p.year === y && p.month === m && p.day === d
}

export function weekdayShortLabel(y: number, m: number, d: number, timeZone: string): string {
  const noon = zonedTimeToUtc(y, m, d, 12, 0, timeZone)
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric' }).format(noon)
}

// ── Moon phase (illumination %, age, waxing/waning) ─────────────────────────

export function getMoonInfo(localNoonUtc: Date): { illumination: number; phaseName: string; ageDays: number } {
  const illum = SunCalc.getMoonIllumination(localNoonUtc)
  const illumination = Math.round(illum.fraction * 100)
  const isWaning = illum.phase > 0.5
  const ageDays = Math.round(illum.phase * SYNODIC_MONTH_DAYS * 10) / 10
  return { illumination, phaseName: getPhaseName(illumination, isWaning), ageDays }
}

// ── Astronomical dark window (sun < -18°) ───────────────────────────────────
// suncalc's default time list already includes -18° as `night` (dusk, sun
// setting through -18°) and `nightEnd` (dawn, sun rising through -18°).

export function getDarkWindow(
  localNoonD: Date,
  localNoonD1: Date,
  lat: number,
  lon: number
): { duskUtc: Date; dawnUtc: Date } {
  const timesD = SunCalc.getTimes(localNoonD, lat, lon)
  const timesD1 = SunCalc.getTimes(localNoonD1, lat, lon)
  return { duskUtc: timesD.night, dawnUtc: timesD1.nightEnd }
}

// ── Moonrise / moonset within a local calendar day ──────────────────────────
// Scans the local midnight->midnight window in 1-minute steps looking for the
// altitude sign change, mirroring generate_data.py's next_rising/next_setting
// approach (rather than suncalc's getMoonTimes, whose internal day-window is
// UTC-calendar-based and can misattribute events near local midnight).

export function getMoonRiseSet(
  dayStartUtc: Date,
  lat: number,
  lon: number
): { moonrise: Date | null; moonset: Date | null } {
  const stepMs = 60 * 1000
  const totalSteps = 24 * 60
  let prevAlt = SunCalc.getMoonPosition(dayStartUtc, lat, lon).altitude
  let moonrise: Date | null = null
  let moonset: Date | null = null

  for (let i = 1; i <= totalSteps; i++) {
    const t = new Date(dayStartUtc.getTime() + i * stepMs)
    const alt = SunCalc.getMoonPosition(t, lat, lon).altitude
    if (moonrise === null && prevAlt < 0 && alt >= 0) moonrise = t
    if (moonset === null && prevAlt >= 0 && alt < 0) moonset = t
    if (moonrise !== null && moonset !== null) break
    prevAlt = alt
  }
  return { moonrise, moonset }
}

// ── Next N new moons (mean-synodic approximation) ───────────────────────────

export function nextNewMoons(n: number, afterUtc: Date): Date[] {
  const afterMs = afterUtc.getTime()
  let k = Math.floor((afterMs - KNOWN_NEW_MOON_UTC) / (SYNODIC_MONTH_DAYS * 86400000))
  let candidateMs = KNOWN_NEW_MOON_UTC + k * SYNODIC_MONTH_DAYS * 86400000
  while (candidateMs <= afterMs) {
    k += 1
    candidateMs = KNOWN_NEW_MOON_UTC + k * SYNODIC_MONTH_DAYS * 86400000
  }
  const results: Date[] = []
  for (let i = 0; i < n; i++) {
    results.push(new Date(candidateMs))
    k += 1
    candidateMs = KNOWN_NEW_MOON_UTC + k * SYNODIC_MONTH_DAYS * 86400000
  }
  return results
}
