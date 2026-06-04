export interface ResponseTime {
  datetime: number
  value: number
}

export interface Monitor {
  id: number
  friendly_name: string
  url?: string
  type: number
  type_label: string
  status: number
  domain?: string
  favicon_url?: string
  custom_uptime_ratio?: string   // "100.000-100.000-100.000-100.000" (1d-7d-30d-90d)
  average_response_time?: string  // "68.000" (always string from UptimeRobot)
  response_times?: ResponseTime[]
  interval?: number
  create_datetime?: number
  logs?: MonitorLog[]
}

export interface MonitorLog {
  type: number
  datetime: number
  duration: number
  reason?: {
    code: string
    detail: string
  }
}

export interface StatusResponse {
  stat: string
  pagination: {
    offset: number
    limit: number
    total: number
  }
  monitors: Monitor[]
  cached_at: string
  from_cache?: boolean
}
