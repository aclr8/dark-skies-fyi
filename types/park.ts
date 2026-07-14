export interface CloudCoverHour {
  hour: string;
  pct: number;
}

export interface ParkNight {
  date: string;
  label: string;
  is_tonight: boolean;
  tz_abbr: string;
  rating: 'great' | 'good' | 'marginal' | 'poor';
  rating_emoji: string;
  dark_window_start: string;
  dark_window_end: string;
  dark_window_minutes: number;
  moon_phase_name: string;
  moon_illumination_pct: number;
  moon_age_days: number;
  moonrise: string | null;
  moonset: string | null;
  cloud_cover_hourly: CloudCoverHour[];
  cloud_cover_avg_pct: number | null;
  cloud_cover_available: boolean;
  weather_verdict: string | null;
  moon_note: string | null;
  dark_window_temp_low_f: number | null;
  dark_window_temp_high_f: number | null;
}

export interface PlanningWindow {
  window_start: string;
  window_end: string;
  new_moon_date: string;
  new_moon_time_local: string;
  temp_high_f: number;
  temp_low_f: number;
  temp_trend: 'up' | 'down' | 'flat';
  temp_data_source: string;
  comfort_rating: 'icy' | 'very_cold' | 'cold' | 'comfortable' | 'warm' | 'hot' | 'very_hot' | 'way_too_hot';
  comfort_label: string;
}

export interface ParkInfo {
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface ParkData {
  schema_version: string;
  generated_at: string;
  park: ParkInfo;
  this_week: {
    nights: ParkNight[];
  };
  planning_table: PlanningWindow[];
}