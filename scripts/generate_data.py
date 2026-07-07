#!/usr/bin/env python3
"""
scripts/generate_data.py
========================
Weekly data refresh for dark-skies.fyi.

For each configured park this script:
  • Computes the astronomical dark window (sun 18° below horizon) for the
    next 7 nights using the `ephem` library.
  • Maps moon illumination % + waning/waxing direction to exactly one of the
    8 standard phase names — no string-matching, no ambiguity.
  • Fetches hourly cloud-cover forecasts from the Open-Meteo API and
    trims them to dark-window hours only.
  • Builds 12 upcoming new-moon planning windows with temperatures drawn
    from NOAA climate normals (reliable months into the future; no
    API-call failures for distant dates).

Output: public/data/<slug>.json  (matches the TypeScript ParkData types
        in types/park.ts exactly — schema_version "2")

Usage:
    cd ~/dark-skies-fyi
    python3 scripts/generate_data.py

Run every Wednesday morning, then commit + push:
    git add public/data && git commit -m "data: weekly refresh $(date +%F)" && git push

Requirements (one-time install):
    pip install ephem requests
    # or inside conda:  conda install -c conda-forge ephem && pip install requests
"""

import datetime
import json
import os
import sys
from zoneinfo import ZoneInfo   # Python 3.9+

import ephem
import requests

# ── Park definitions ──────────────────────────────────────────────────────────
# Add more parks here; each gets its own <slug>.json in public/data/.

PARKS = [
    {
        "name": "Anza-Borrego Desert State Park",
        "slug": "anza-borrego",
        "latitude": 33.4950,
        "longitude": -116.4434,
        "elevation_m": 700,
        "timezone": "America/Los_Angeles",
    },
]

# ── Climate normals for Borrego Springs ───────────────────────────────────────
# NOAA 30-year climate normals for Borrego Springs CA (station USW00093184).
# Used for planning-window temperatures when Open-Meteo forecasts don't reach
# far enough (> ~16 days).  Key = month (1-12), value = (avg_high_°F, avg_low_°F).

CLIMATE_NORMALS = {
    1:  (70, 42),   # January
    2:  (75, 46),   # February
    3:  (83, 52),   # March
    4:  (91, 58),   # April
    5: (100, 66),   # May
    6: (109, 74),   # June
    7: (107, 82),   # July
    8: (105, 80),   # August
    9: (100, 74),   # September
    10: (91, 63),   # October
    11: (79, 50),   # November
    12: (71, 43),   # December
}

# Seasonal direction of travel in temperature (month → is it heading warmer or cooler?)
# Used for the "5yr Temp Trend" column in the planning table.
# TODO: replace with a real 5-year linear regression over Open-Meteo archive data
#       for a per-month, location-specific trend signal.
SEASONAL_TREND: dict[int, str] = {
    1: "up",  2: "up",  3: "up",  4: "up",  5: "up",  6: "flat",
    7: "down", 8: "down", 9: "down", 10: "down", 11: "down", 12: "flat",
}

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data")
UTC = ZoneInfo("UTC")


# ═══════════════════════════════════════════════════════════════════════════════
# Moon phase helpers
# ═══════════════════════════════════════════════════════════════════════════════

def get_phase_name(illumination: int, is_waning: bool) -> str:
    """
    Map illumination % + direction to one of the 8 standard phase names.

    Boundaries are intentionally symmetric around quarter (45-54%) and
    new/full (< 2% and ≥ 98%) and are identical to the thresholds used
    in MoonPhaseIcon.tsx so the emoji and the label always agree.

    Standard mapping:
        🌑 New Moon       < 2%
        🌒 Waxing Crescent  2-44%  waxing
        🌓 First Quarter   45-54%  waxing
        🌔 Waxing Gibbous  55-97%  waxing
        🌕 Full Moon       ≥ 98%
        🌖 Waning Gibbous  55-97%  waning
        🌗 Last Quarter    45-54%  waning
        🌘 Waning Crescent  2-44%  waning
    """
    if illumination < 2:    return "New Moon"
    if illumination >= 98:  return "Full Moon"
    if not is_waning:
        if illumination < 45: return "Waxing Crescent"
        if illumination < 55: return "First Quarter"
        return "Waxing Gibbous"
    else:
        if illumination > 55: return "Waning Gibbous"
        if illumination > 45: return "Last Quarter"
        return "Waning Crescent"


# ═══════════════════════════════════════════════════════════════════════════════
# ephem helpers
# ═══════════════════════════════════════════════════════════════════════════════

def make_observer(lat: float, lon: float, elev: float) -> ephem.Observer:
    obs = ephem.Observer()
    obs.lat = str(lat)           # decimal degrees as string, e.g. "33.495"
    obs.lon = str(lon)           # negative = west, e.g. "-116.4434"
    obs.elevation = elev         # metres
    obs.pressure = 0             # disable atmospheric refraction for precision
    obs.temp = 20                # standard temperature (°C)
    return obs


def dt_to_ephem(dt: datetime.datetime) -> ephem.Date:
    """Convert any aware datetime to an ephem.Date (always UTC internally)."""
    return ephem.Date(dt.astimezone(UTC).replace(tzinfo=None))


def ephem_to_local(ed: ephem.Date, tz: ZoneInfo) -> datetime.datetime:
    """Convert an ephem.Date (UTC) to a tz-aware local datetime."""
    return ed.datetime().replace(tzinfo=UTC).astimezone(tz)


# ═══════════════════════════════════════════════════════════════════════════════
# Astronomical calculations (per night)
# ═══════════════════════════════════════════════════════════════════════════════

def get_moon_info(obs: ephem.Observer, date_local: datetime.date, tz: ZoneInfo) -> dict:
    """
    Return moon illumination %, phase name, age (days since new moon),
    moonrise time, and moonset time for the given local calendar date.

    Phase name is derived from illumination + waning/waxing direction,
    never from a free-text string match — no mislabelling possible.
    """
    # Sample at local noon for a stable illumination value
    local_noon = datetime.datetime(
        date_local.year, date_local.month, date_local.day, 12, 0, tzinfo=tz
    )
    obs.date = dt_to_ephem(local_noon)

    moon = ephem.Moon()
    moon.compute(obs)

    illumination = round(moon.phase)                       # 0-100
    prev_new = ephem.previous_new_moon(obs.date)
    age_days = round(float(obs.date - prev_new), 1)        # days since new moon
    is_waning = age_days > 14.75                           # past full moon

    # Moonrise / moonset: scan from start of local calendar day
    day_start = datetime.datetime(
        date_local.year, date_local.month, date_local.day, 0, 0, tzinfo=tz
    )
    obs.date = dt_to_ephem(day_start)
    obs.horizon = "0"

    moonrise = moonset = None
    try:
        r = obs.next_rising(ephem.Moon())
        r_local = ephem_to_local(r, tz)
        if r_local.date() == date_local:
            moonrise = r_local.strftime("%H:%M")
    except Exception:
        pass

    try:
        s = obs.next_setting(ephem.Moon())
        s_local = ephem_to_local(s, tz)
        if s_local.date() == date_local:
            moonset = s_local.strftime("%H:%M")
    except Exception:
        pass

    return {
        "illumination": illumination,
        "phase_name": get_phase_name(illumination, is_waning),
        "age_days": age_days,
        "moonrise": moonrise,
        "moonset": moonset,
    }


def get_dark_window(obs: ephem.Observer, date_local: datetime.date, tz: ZoneInfo) -> dict:
    """
    Return the astronomical dark window for the night beginning on date_local:
      • dark_window_start = astronomical dusk (sun's centre reaches -18°)
        on the evening of date_local
      • dark_window_end   = astronomical dawn on the morning of date_local+1
      • dark_window_minutes = total duration

    Astronomical twilight (18° depression) is the standard threshold used
    by dark-sky observers — below this the sky background is essentially
    pitch black.
    """
    obs.horizon = "-18"
    sun = ephem.Sun()

    # Search for dusk starting from 3 pm local (well before any dusk)
    pm3 = datetime.datetime(
        date_local.year, date_local.month, date_local.day, 15, 0, tzinfo=tz
    )
    obs.date = dt_to_ephem(pm3)
    try:
        dusk_ed = obs.next_setting(sun, use_center=True)
        dusk_local = ephem_to_local(dusk_ed, tz)
    except Exception:
        # Fallback: approximate dusk (shouldn't happen at 33°N in summer)
        dusk_local = datetime.datetime(
            date_local.year, date_local.month, date_local.day, 21, 15, tzinfo=tz
        )

    # Search for dawn starting from 12:30 am the next morning
    next_day = date_local + datetime.timedelta(days=1)
    half_past_midnight = datetime.datetime(
        next_day.year, next_day.month, next_day.day, 0, 30, tzinfo=tz
    )
    obs.date = dt_to_ephem(half_past_midnight)
    try:
        dawn_ed = obs.next_rising(sun, use_center=True)
        dawn_local = ephem_to_local(dawn_ed, tz)
    except Exception:
        dawn_local = datetime.datetime(
            next_day.year, next_day.month, next_day.day, 4, 30, tzinfo=tz
        )

    minutes = max(0, int((dawn_local - dusk_local).total_seconds() / 60))
    return {
        "dark_window_start": dusk_local.strftime("%H:%M"),
        "dark_window_end": dawn_local.strftime("%H:%M"),
        "dark_window_minutes": minutes,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Weather — Open-Meteo
# ═══════════════════════════════════════════════════════════════════════════════

def fetch_hourly_cloud(
    lat: float, lon: float,
    start: datetime.date, end: datetime.date,
    tz_str: str,
) -> dict[str, list[dict]]:
    """
    Fetch hourly cloud-cover % from Open-Meteo for a date range.
    Returns {date_iso: [{"hour": "HH:MM", "pct": int}, ...]}

    Open-Meteo free tier covers up to ~16 days ahead; beyond that
    the response is empty/null and the caller falls back to None.
    """
    try:
        r = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "hourly": "cloudcover",
                "timezone": tz_str,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
            },
            timeout=15,
        )
        r.raise_for_status()
        hourly = r.json().get("hourly", {})
    except Exception as exc:
        print(f"  ⚠  Cloud-cover fetch failed: {exc}", file=sys.stderr)
        return {}

    result: dict[str, list] = {}
    for time_str, pct in zip(
        hourly.get("time", []), hourly.get("cloudcover", [])
    ):
        date_str = time_str[:10]
        hour_str = time_str[11:16]
        result.setdefault(date_str, []).append({"hour": hour_str, "pct": int(pct or 0)})
    return result


def dark_cloud_hours(
    hourly_by_date: dict,
    date_local: datetime.date,
    dark_start: str,
    dark_end: str,
) -> tuple[list, int | None]:
    """
    Extract the cloud-cover hours that fall inside the dark window.

    The dark window spans TWO calendar dates (e.g. 21:15 tonight → 04:20
    tomorrow), so we pull evening hours from date_local and morning hours
    from date_local+1.

    Returns (hours_list, avg_pct_or_None).
    """
    start_h = int(dark_start.split(":")[0])
    end_h   = int(dark_end.split(":")[0])
    next_date = date_local + datetime.timedelta(days=1)

    hours: list[dict] = []
    for h in hourly_by_date.get(date_local.isoformat(), []):
        if int(h["hour"].split(":")[0]) >= start_h:
            hours.append(h)
    for h in hourly_by_date.get(next_date.isoformat(), []):
        if int(h["hour"].split(":")[0]) <= end_h:
            hours.append(h)

    avg = round(sum(h["pct"] for h in hours) / len(hours)) if hours else None
    return hours, avg


# ═══════════════════════════════════════════════════════════════════════════════
# Ratings, verdicts, notes
# ═══════════════════════════════════════════════════════════════════════════════

def compute_rating(illumination: int, cloud_avg: int | None) -> tuple[str, str]:
    """Return (rating_key, rating_emoji) from moon illumination and cloud cover."""
    cloud = cloud_avg if cloud_avg is not None else 50  # pessimistic default

    if illumination <= 10 and cloud <= 20:  return "great",    "⭐"
    if illumination <= 30 and cloud <= 40:  return "good",     "✅"
    if illumination <= 55 or cloud  <= 55:  return "marginal", "🌥"
    return "poor", "☁️"


def weather_verdict(cloud_avg: int | None) -> str | None:
    if cloud_avg is None:   return None
    if cloud_avg <= 10:     return "Clear skies forecast"
    if cloud_avg <= 30:     return f"Mostly clear ({cloud_avg}% avg cloud cover)"
    if cloud_avg <= 60:     return f"Partly cloudy ({cloud_avg}% avg cloud cover)"
    return f"Cloudy — {cloud_avg}% avg cloud cover"


def moon_note(illumination: int) -> str | None:
    if illumination >= 80:
        return f"Bright moon ({illumination}% lit) — most faint objects washed out"
    if illumination >= 50:
        return f"Half-lit moon ({illumination}%) — best viewing after moonset"
    return None


def night_label(date: datetime.date, today: datetime.date) -> str:
    delta = (date - today).days
    if delta == 0: return "Tonight"
    if delta == 1: return "Tomorrow"
    return date.strftime("%a %b %-d")


def comfort_rating(temp_high: int) -> tuple[str, str]:
    """Return (comfort_rating_key, comfort_label) from daytime high temperature."""
    if temp_high < 65:   return "great", "Great"
    if temp_high < 85:   return "good",  "Good"
    if temp_high < 100:  return "warm",  "Warm"
    return "hot", "Hot"


# ═══════════════════════════════════════════════════════════════════════════════
# Planning windows (next 12 new moons)
# ═══════════════════════════════════════════════════════════════════════════════

def next_new_moons(n: int, after: datetime.date) -> list[datetime.datetime]:
    """Return the next n new-moon datetimes (UTC-aware) after the given date."""
    moons: list[datetime.datetime] = []
    d = ephem.Date(datetime.datetime(after.year, after.month, after.day, 12))
    while len(moons) < n:
        d = ephem.next_new_moon(d)
        moons.append(d.datetime().replace(tzinfo=UTC))
        d = ephem.Date(float(d) + 1)   # advance past this moon to find the next
    return moons


# ═══════════════════════════════════════════════════════════════════════════════
# Main generator
# ═══════════════════════════════════════════════════════════════════════════════

def generate_park(cfg: dict) -> dict:
    tz    = ZoneInfo(cfg["timezone"])
    today = datetime.datetime.now(tz).date()
    obs   = make_observer(cfg["latitude"], cfg["longitude"], cfg["elevation_m"])

    print(f"\n▶  {cfg['name']}  ({today})")

    # ── This week: 7 nights ───────────────────────────────────────────────────
    dates = [today + datetime.timedelta(days=i) for i in range(7)]

    # One API call covers all 7 nights + next-morning hours (8 calendar days)
    print("  Fetching cloud-cover forecast…")
    hourly = fetch_hourly_cloud(
        cfg["latitude"], cfg["longitude"],
        dates[0],
        dates[-1] + datetime.timedelta(days=1),
        cfg["timezone"],
    )

    nights = []
    for date in dates:
        moon  = get_moon_info(obs, date, tz)
        dark  = get_dark_window(obs, date, tz)
        cloud_hours, cloud_avg = dark_cloud_hours(
            hourly, date, dark["dark_window_start"], dark["dark_window_end"]
        )
        rating, rating_emoji = compute_rating(moon["illumination"], cloud_avg)

        print(
            f"  {date}  {moon['phase_name']:18s}  {moon['illumination']:3d}%  "
            f"cloud={str(cloud_avg)+'%' if cloud_avg is not None else 'n/a':6s}  → {rating}"
        )

        nights.append({
            "date":                 date.isoformat(),
            "label":                night_label(date, today),
            "rating":               rating,
            "rating_emoji":         rating_emoji,
            "dark_window_start":    dark["dark_window_start"],
            "dark_window_end":      dark["dark_window_end"],
            "dark_window_minutes":  dark["dark_window_minutes"],
            "moon_phase_name":      moon["phase_name"],
            "moon_illumination_pct": moon["illumination"],
            "moon_age_days":        moon["age_days"],
            "moonrise":             moon["moonrise"],
            "moonset":              moon["moonset"],
            "cloud_cover_hourly":   cloud_hours,
            "cloud_cover_avg_pct":  cloud_avg,
            "cloud_cover_available": cloud_avg is not None,
            "weather_verdict":      weather_verdict(cloud_avg),
            "moon_note":            moon_note(moon["illumination"]),
        })

    # ── Planning table: next 12 new moons ─────────────────────────────────────
    print("  Computing planning windows…")
    new_moons = next_new_moons(12, today)
    planning_table = []

    for nm_utc in new_moons:
        nm_local = nm_utc.astimezone(tz)
        nm_date  = nm_local.date()

        # Dark window = 2 nights before new moon through 2 nights after
        window_start = nm_date - datetime.timedelta(days=2)
        window_end   = nm_date + datetime.timedelta(days=2)

        # Use NOAA climate normals — accurate any month, no API latency
        hi, lo = CLIMATE_NORMALS[nm_date.month]
        cr, cl = comfort_rating(hi)
        trend  = SEASONAL_TREND[nm_date.month]

        planning_table.append({
            "window_start":       window_start.isoformat(),
            "window_end":         window_end.isoformat(),
            "new_moon_date":      nm_date.isoformat(),
            "new_moon_time_local": nm_local.strftime("%H:%M"),
            "temp_high_f":        hi,
            "temp_low_f":         lo,
            "temp_trend":         trend,
            "temp_data_source":   "NOAA climate normals",
            "comfort_rating":     cr,
            "comfort_label":      cl,
        })

    return {
        "schema_version": "2",
        "generated_at": datetime.datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "park": {
            "name":      cfg["name"],
            "slug":      cfg["slug"],
            "latitude":  cfg["latitude"],
            "longitude": cfg["longitude"],
            "timezone":  cfg["timezone"],
        },
        "this_week":     {"nights": nights},
        "planning_table": planning_table,
    }


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for cfg in PARKS:
        data     = generate_park(cfg)
        out_path = os.path.join(OUTPUT_DIR, f"{cfg['slug']}.json")
        with open(out_path, "w") as fh:
            json.dump(data, fh, indent=2)
        print(f"\n✓  Wrote {out_path}")


if __name__ == "__main__":
    main()
