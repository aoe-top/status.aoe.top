// In-memory cache to respect UptimeRobot rate limits (10 req/min on free plan)
let cachedData: unknown = null
let cachedAt = 0
const CACHE_TTL = 55_000 // 55 seconds

// Monitor type labels
const TYPE_LABELS: Record<number, string> = {
  1: 'HTTP',
  2: 'Keyword',
  3: 'Ping',
  4: 'Port',
  5: 'Heartbeat',
}

function extractDomain(url: string): string {
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
    // Split by dots and keep only the last 2 segments (main domain)
    const parts = host.split('.')
    return parts.slice(-2).join('.')
  } catch {
    return url
  }
}

function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const apiKey = config.uptimerobotApiKey

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'API key not configured. Set NUXT_UPTIMEROBOT_API_KEY in .env',
    })
  }

  // Return cached data if fresh
  const now = Date.now()
  if (cachedData && now - cachedAt < CACHE_TTL) {
    return cachedData
  }

  try {
    const body = new URLSearchParams({
      api_key: apiKey,
      format: 'json',
      custom_uptime_ratios: '1-7-30-90',
      response_times: '1',
      response_times_limit: '12',
      response_times_average: '1',
      logs: '1',
      logs_limit: '3',
    })

    const response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      if (response.status === 429) {
        throw createError({
          statusCode: 429,
          statusMessage: 'UptimeRobot API rate limit exceeded. Please wait a moment.',
        })
      }
      throw createError({
        statusCode: response.status,
        statusMessage: `UptimeRobot API returned ${response.status}`,
      })
    }

    const raw = await response.json()

    if (raw.stat !== 'ok') {
      const msg = raw.error?.message || 'Unknown UptimeRobot API error'
      throw createError({
        statusCode: 500,
        statusMessage: `UptimeRobot: ${msg}`,
      })
    }

    // Enrich monitors with type label, domain, and favicon
    const monitors = (raw.monitors || []).map((m: any) => {
      const domain = m.url ? extractDomain(m.url) : ''
      return {
        ...m,
        type_label: TYPE_LABELS[m.type] || 'Unknown',
        domain,
        favicon_url: domain ? getFaviconUrl(domain) : '',
      }
    })

    const result = {
      stat: 'ok',
      pagination: raw.pagination,
      monitors,
      cached_at: new Date().toISOString(),
    }

    cachedData = result
    cachedAt = now

    return result
  } catch (err: any) {
    // If we have cached data, return it as fallback
    if (cachedData) {
      console.warn('UptimeRobot API error, returning cached data:', err.message)
      return { ...(cachedData as any), from_cache: true }
    }
    throw err
  }
})
