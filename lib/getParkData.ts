import type { ParkData, ParkNight, PlanningWindow, CloudCoverHour } from '@/types/park'
import {
  getMoonInfo,
  getDarkWindow,
  getMoonRiseSet,
  nextNewMoons,
  computeRating,
  weatherVerdict,
  moonNote,
  comfortRating,
  zonedTimeToUtc,
  todayInZone,
  addDays,
  isoDate,
  hhmmInZone,
  weekdayShortLabel,
  tzAbbreviation,
} from './astro'

// ── Park registry ────────────────────────────────────────────────────────────
// Static list (was: one <slug>.json per park under public/data/, discovered
// by scanning the directory). Add more parks here as the site grows.

interface ParkConfig {
  name: string
  slug: string
  latitude: number
  longitude: number
  timezone: string
}

const PARKS: ParkConfig[] = [
  {
    name: 'Anza-Borrego Desert State Park',
    slug: 'anza-borrego',
    latitude: 33.495,
    longitude: -116.4434,
    timezone: 'America/Los_Angeles',
  },
]

// NOAA 30-year climate normals for Borrego Springs, CA (station USW00093184).
// Used for the 12-window planning table — Open-Meteo's forecast horizon
// (~16 days) doesn't reach most of these dates, so normals stand in.
const CLIMATE_NORMALS: Record<number, [number, number]> = {
  1: [70, 42],
  2: [75, 46],
  3: [83, 52],
  4: [91, 58],
  5: [100, 66],
  6: [109, 74],
  7: [107, 82],
  8: [105, 80],
  9: [100, 74],
  10: [91, 63],
  11: [79, 50],
  12: [71, 43],
}

const SEASONAL_TREND: Record<number, 'up' | 'down' | 'flat'> = {
  1: 'up', 2: 'up', 3: 'up', 4: 'up', 5: 'up', 6: 'flat',
  7: 'down', 8: 'down', 9: 'down', 10: 'down', 11: 'down', 12: 'flat',
}

export function getAllParkSlugs(): string[] {
  return PARKS.map((p) => p.slug)
}

// ── Weather (Open-Meteo, server-side fetch, cached via Next's fetch cache) ──

interface HourlyWeather {
  hour: string
  cloudPct: number
  tempF: number
}

async function fetchHourlyWeather(
  lat: number,
  lon: number,
  startISO: string,
  endISO: string,
  tzStr: string
): Promise<Record<string, HourlyWeather[]>> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=cloud_cover,temperature_2m&temperature_unit=fahrenheit` +
    `&timezone=${encodeURIComponent(tzStr)}` +
    `&start_date=${startISO}&end_date=${endISO}`

  try {
    // Cached for an hour: visitors get an instant response; the data
    // refreshes in the background at most once per hour rather than on
    // every single page view.
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`)
    const json = await res.json()
    const times: string[] = json?.hourly?.time ?? []
    const clouds: number[] = json?.hourly?.cloud_cover ?? []
    const temps: number[] = json?.hourly?.temperature_2m ?? []

    const byDate: Record<string, HourlyWeather[]> = {}
    times.forEach((t, i) => {
      const dateStr = t.slice(0, 10)
      const hourStr = t.slice(11, 16)
      const cloudPct = Math.round(clouds[i] ?? 0)
      const tempF = Math.round(temps[i] ?? 0)
      ;(byDate[dateStr] ??= []).push({ hour: hourStr, cloudPct, tempF })
    })
    return byDate
  } catch (err) {
    console.error('[dark-skies] weather fetch failed:', err)
    return {}
  }
}

function darkWindowWeather(
  byDate: Record<string, HourlyWeather[]>,
  dateISO: string,
  nextDateISO: string,
  darkStart: string,
  darkEnd: string
): { cloudHours: CloudCoverHour[]; cloudAvg: number | null; tempLowF: number | null; tempHighF: number | null } {
  const startH = parseInt(darkStart.slice(0, 2), 10)
  const endH = parseInt(darkEnd.slice(0, 2), 10)

  const hours: HourlyWeather[] = []
  for (const h of byDate[dateISO] ?? []) {
    if (parseInt(h.hour.slice(0, 2), 10) >= startH) hours.push(h)
  }
  for (const h of byDate[nextDateISO] ?? []) {
    if (parseInt(h.hour.slice(0, 2), 10) <= endH) hours.push(h)
  }

  const cloudHours = hours.map((h) => ({ hour: h.hour, pct: h.cloudPct }))
  const cloudAvg = hours.length ? Math.round(hours.reduce((s, h) => s + h.cloudPct, 0) / hours.length) : null
  const temps = hours.map((h) => h.tempF)
  const tempLowF = temps.length ? Math.min(...temps) : null
  const tempHighF = temps.length ? Math.max(...temps) : null

  return { cloudHours, cloudAvg, tempLowF, tempHighF }
}

// ── Main generator (replaces scripts/generate_data.py) ──────────────────────

export async function getParkData(slug: string): Promise<ParkData | null> {
  const cfg = PARKS.find((p) => p.slug === slug)
  if (!cfg) return null

  const { latitude: lat, longitude: lon, timezone: tz } = cfg
  const today = todayInZone(tz)

  // This week: 7 local calendar nights starting today
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today.year, today.month, today.day, i))

  // One Open-Meteo call covers all 7 nights + the following mornings (8 calendar days)
  const rangeStart = dates[0]
  const rangeEndPlusOne = addDays(dates[6].year, dates[6].month, dates[6].day, 1)
  const hourlyByDate = await fetchHourlyWeather(
    lat,
    lon,
    isoDate(rangeStart.year, rangeStart.month, rangeStart.day),
    isoDate(rangeEndPlusOne.year, rangeEndPlusOne.month, rangeEndPlusOne.day),
    tz
  )

  const nights: ParkNight[] = dates.map((d, i) => {
    const dateISO = isoDate(d.year, d.month, d.day)
    const nextD = addDays(d.year, d.month, d.day, 1)
    const nextDateISO = isoDate(nextD.year, nextD.month, nextD.day)

    const localNoon = zonedTimeToUtc(d.year, d.month, d.day, 12, 0, tz)
    const localNoonNext = zonedTimeToUtc(nextD.year, nextD.month, nextD.day, 12, 0, tz)
    const dayStart = zonedTimeToUtc(d.year, d.month, d.day, 0, 0, tz)

    const moon = getMoonInfo(localNoon)
    const { duskUtc, dawnUtc } = getDarkWindow(localNoon, localNoonNext, lat, lon)
    const darkStart = hhmmInZone(duskUtc, tz)
    const darkEnd = hhmmInZone(dawnUtc, tz)
    const darkMinutes = Math.max(0, Math.round((dawnUtc.getTime() - duskUtc.getTime()) / 60000))

    const { moonrise, moonset } = getMoonRiseSet(dayStart, lat, lon)

    const { cloudHours, cloudAvg, tempLowF, tempHighF } = darkWindowWeather(
      hourlyByDate,
      dateISO,
      nextDateISO,
      darkStart,
      darkEnd
    )
    const { rating, emoji } = computeRating(moon.illumination, cloudAvg)

    // "Tonight"/"Tomorrow" now carry the same DOW + month/date detail as every
    // other night's heading, just prefixed with the relative word.
    const dowDate = weekdayShortLabel(d.year, d.month, d.day, tz)
    const label = i === 0 ? `Tonight, ${dowDate}` : i === 1 ? `Tomorrow, ${dowDate}` : dowDate

    return {
      date: dateISO,
      label,
      is_tonight: i === 0,
      tz_abbr: tzAbbreviation(localNoon, tz),
      rating,
      rating_emoji: emoji,
      dark_window_start: darkStart,
      dark_window_end: darkEnd,
      dark_window_minutes: darkMinutes,
      moon_phase_name: moon.phaseName,
      moon_illumination_pct: moon.illumination,
      moon_age_days: moon.ageDays,
      moonrise: moonrise ? hhmmInZone(moonrise, tz) : null,
      moonset: moonset ? hhmmInZone(moonset, tz) : null,
      cloud_cover_hourly: cloudHours,
      cloud_cover_avg_pct: cloudAvg,
      cloud_cover_available: cloudAvg !== null,
      weather_verdict: weatherVerdict(cloudAvg),
      moon_note: moonNote(moon.illumination),
      dark_window_temp_low_f: tempLowF,
      dark_window_temp_high_f: tempHighF,
    }
  })

  // Planning table: next 12 new moons, ±2-day windows, NOAA normals for temps
  const nowUtc = zonedTimeToUtc(today.year, today.month, today.day, 0, 0, tz)
  const newMoons = nextNewMoons(12, nowUtc)

  const planningTable: PlanningWindow[] = newMoons.map((nmUtc) => {
    // Convert the new-moon UTC instant back to its local calendar date
    const nmLocalParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(nmUtc) // en-CA gives YYYY-MM-DD
    const [nmY, nmM, nmD] = nmLocalParts.split('-').map(Number)

    const windowStart = addDays(nmY, nmM, nmD, -2)
    const windowEnd = addDays(nmY, nmM, nmD, 2)
    const [hi, lo] = CLIMATE_NORMALS[nmM]
    const { rating: comfort, label: comfortLabel } = comfortRating(hi)
    const trend = SEASONAL_TREND[nmM]

    return {
      window_start: isoDate(windowStart.year, windowStart.month, windowStart.day),
      window_end: isoDate(windowEnd.year, windowEnd.month, windowEnd.day),
      new_moon_date: isoDate(nmY, nmM, nmD),
      new_moon_time_local: hhmmInZone(nmUtc, tz),
      temp_high_f: hi,
      temp_low_f: lo,
      temp_trend: trend,
      temp_data_source: 'NOAA climate normals',
      comfort_rating: comfort,
      comfort_label: comfortLabel,
    }
  })

  return {
    schema_version: '2',
    generated_at: new Date().toISOString(),
    park: {
      name: cfg.name,
      slug: cfg.slug,
      latitude: cfg.latitude,
      longitude: cfg.longitude,
      timezone: cfg.timezone,
    },
    this_week: { nights },
    planning_table: planningTable,
  }
}

// ── Formatting helpers used by components (unchanged) ───────────────────────

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function to12Hour(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}
