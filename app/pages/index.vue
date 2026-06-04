<script setup lang="ts">
import type { StatusResponse, Monitor } from '~/types'

const REFRESH_INTERVAL = 300_000 // 5 minutes

const { data, status, error, refresh } = await useLazyFetch<StatusResponse>('/api/status', {
  server: true,
})

// --- Search ---
const searchQuery = ref('')

function matchesSearch(m: Monitor): boolean {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return true
  return (
    m.friendly_name.toLowerCase().includes(q) ||
    (m.url || '').toLowerCase().includes(q) ||
    (m.domain || '').toLowerCase().includes(q)
  )
}

// --- Sort ---
type SortKey = 'name' | 'status' | 'uptime' | 'response'
const sortKey = ref<SortKey>('status')
const sortAsc = ref(true)

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    // Default: status asc (up first), others asc
    sortAsc.value = key !== 'status'
  }
}

function getSortValue(m: Monitor): number {
  switch (sortKey.value) {
    case 'name':
      return 0 // string compare handled separately
    case 'status':
      // 2 (up) = 0, 8/9 (down) = 2, 0 (paused) = 1, 1 (pending) = 3
      if (m.status === 2) return 0
      if (m.status === 0) return 1
      if (m.status === 8 || m.status === 9) return 2
      return 3
    case 'uptime': {
      const ratio = m.custom_uptime_ratio
      if (!ratio) return -1
      const parts = ratio.split('-')
      return parseFloat(parts[2] || parts[0])
    }
    case 'response': {
      const rt = m.average_response_time
      if (rt === undefined || rt === null) return 99999
      return typeof rt === 'string' ? parseFloat(rt) : rt
    }
  }
}

const sortLabels: Record<SortKey, string> = {
  status: '状态',
  name: '名称',
  uptime: '可用率',
  response: '响应时间',
}

// --- Domain grouping ---
const domainGroups = computed(() => {
  const raw = data.value?.monitors || []
  // Filter
  const filtered = raw.filter(matchesSearch)
  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey.value === 'name') {
      const cmp = a.friendly_name.localeCompare(b.friendly_name)
      return sortAsc.value ? cmp : -cmp
    }
    const diff = getSortValue(a) - getSortValue(b)
    return sortAsc.value ? diff : -diff
  })
  // Group by domain
  const map: Record<string, Monitor[]> = {}
  for (const m of sorted) {
    const d = m.domain || '未知域名'
    if (!map[d]) map[d] = []
    map[d].push(m)
  }
  return map
})

// Collapsed groups
const collapsedDomains = ref<Record<string, boolean>>({})
function toggleDomain(domain: string) {
  collapsedDomains.value[domain] = !collapsedDomains.value[domain]
}

// --- Refresh timing ---
const lastUpdated = computed(() => {
  const ts = data.value?.cached_at
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString()
})

const isFromCache = computed(() => !!data.value?.from_cache)
const isRefreshing = ref(false)

const nextRefreshAt = ref(Date.now() + REFRESH_INTERVAL)
const countdown = ref('')

function updateCountdown() {
  const remaining = Math.max(0, Math.ceil((nextRefreshAt.value - Date.now()) / 1000))
  const min = Math.floor(remaining / 60)
  const sec = remaining % 60
  countdown.value = `${min}:${sec.toString().padStart(2, '0')}`
}

async function doRefresh() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  try {
    await refresh()
    nextRefreshAt.value = Date.now() + REFRESH_INTERVAL
    updateCountdown()
  } finally {
    isRefreshing.value = false
  }
}

let countdownInterval: ReturnType<typeof setInterval> | null = null
let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  updateCountdown()
  countdownInterval = setInterval(updateCountdown, 1000)
  refreshInterval = setInterval(doRefresh, REFRESH_INTERVAL)
})

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
  if (refreshInterval) clearInterval(refreshInterval)
})

// --- Title ---
const allMonitors = computed(() => data.value?.monitors || [])
const title = computed(() => {
  const monitors = allMonitors.value
  const downCount = monitors.filter(m => m.status === 8 || m.status === 9).length
  if (status.value === 'error' && !data.value) return '⚠️ 状态错误'
  if (downCount > 0) return `🔴 ${downCount} 个服务故障`
  if (monitors.length > 0 && monitors.every(m => m.status === 2)) return '✅ 所有系统运行正常'
  return '📊 状态总览'
})

useHead({
  title: 'AOE 服务状态',
  meta: [
    { name: 'description', content: 'aoe.top 及相关服务实时状态监控' },
  ],
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8 md:py-12">
    <!-- Header -->
    <header class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <h1 class="text-2xl md:text-3xl font-bold text-text tracking-tight">
          {{ title }}
        </h1>
        <button
          class="text-sm text-text-muted hover:text-text bg-surface-2 border border-border px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          :disabled="isRefreshing"
          @click="doRefresh()"
        >
          {{ isRefreshing ? '刷新中…' : '手动刷新' }}
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
        <span v-if="lastUpdated">
          更新于 {{ lastUpdated }}
          <span v-if="isFromCache" class="text-amber-400 ml-1">(缓存)</span>
          <span v-if="isRefreshing" class="text-blue-400 ml-1 animate-pulse">↻ 刷新中</span>
        </span>
        <span class="tabular-nums ml-auto">
          下次刷新 {{ countdown }}
        </span>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="status === 'pending' && !data" class="space-y-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="bg-surface-2 border border-border rounded-xl p-5 animate-pulse">
          <div class="h-4 w-20 bg-surface-3 rounded mb-2" />
          <div class="h-8 w-12 bg-surface-3 rounded" />
        </div>
      </div>
      <div v-for="i in 5" :key="i" class="bg-surface-2 border border-border rounded-xl p-5 animate-pulse">
        <div class="h-5 w-48 bg-surface-3 rounded mb-2" />
        <div class="h-4 w-72 bg-surface-3 rounded" />
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="status === 'error' && !data"
      class="bg-red-500/5 border border-red-500/20 rounded-xl p-8 text-center"
    >
      <div class="text-4xl mb-4">⚠️</div>
      <h2 class="text-xl font-semibold text-red-400 mb-2">无法加载状态数据</h2>
      <p class="text-text-muted mb-4">{{ error?.message || '无法连接到状态接口' }}</p>
      <button
        class="bg-surface-3 hover:bg-surface-2 border border-border text-text px-4 py-2 rounded-lg transition-colors cursor-pointer"
        @click="doRefresh()"
      >
        重试
      </button>
    </div>

    <!-- Dashboard -->
    <div v-else class="space-y-6">
      <!-- Overview Cards -->
      <StatusOverview :monitors="allMonitors" />

      <!-- Search + Sort Toolbar -->
      <div class="flex flex-col sm:flex-row gap-3">
        <!-- Search -->
        <div class="relative flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索名称或域名..."
            class="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 pl-9 text-sm text-text placeholder-text-muted focus:outline-none focus:border-text-muted/50 transition-colors"
          />
          <svg class="absolute left-3 top-2.5 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <!-- Sort buttons -->
        <div class="flex gap-1.5 flex-wrap">
          <button
            v-for="(label, key) in sortLabels"
            :key="key"
            class="text-xs px-3 py-2 rounded-lg border transition-colors cursor-pointer"
            :class="sortKey === key
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : 'bg-surface-2 border-border text-text-muted hover:text-text'"
            @click="toggleSort(key as SortKey)"
          >
            {{ label }}
            <span v-if="sortKey === key" class="ml-0.5">{{ sortAsc ? '↑' : '↓' }}</span>
          </button>
        </div>
      </div>

      <!-- Domain Groups -->
      <div class="space-y-4">
        <!-- Empty State -->
        <div
          v-if="Object.keys(domainGroups).length === 0"
          class="bg-surface-2 border border-border rounded-xl p-8 text-center"
        >
          <div class="text-4xl mb-4">{{ searchQuery ? '🔍' : '📭' }}</div>
          <h2 class="text-xl font-semibold text-text mb-2">
            {{ searchQuery ? '未找到匹配的监控' : '暂无监控项' }}
          </h2>
          <p class="text-text-muted">
            <template v-if="searchQuery">
              没有名称或域名匹配"{{ searchQuery }}"的服务
            </template>
            <template v-else>
              尚未配置监控项，前往
              <a href="https://uptimerobot.com/dashboard" target="_blank" rel="noopener" class="text-blue-400 hover:underline">
                UptimeRobot →
              </a>
              添加
            </template>
          </p>
        </div>

        <!-- Groups -->
        <div
          v-for="(monitors, domain) in domainGroups"
          :key="domain"
          class="bg-surface-1 border border-border rounded-xl overflow-hidden"
        >
          <!-- Group Header -->
          <button
            class="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-2/50 transition-colors cursor-pointer text-left"
            @click="toggleDomain(domain)"
          >
            <svg
              class="w-4 h-4 text-text-muted transition-transform duration-200 flex-shrink-0"
              :class="{ 'rotate-90': !collapsedDomains[domain] }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <img
              :src="`https://www.google.com/s2/favicons?domain=${domain}&sz=16`"
              :alt="domain"
              class="w-4 h-4 rounded flex-shrink-0"
              loading="lazy"
            />
            <span class="font-medium text-text text-sm">{{ domain }}</span>
            <span class="text-xs text-text-muted">({{ monitors.length }})</span>
            <!-- Group status summary -->
            <span class="flex items-center gap-1 ml-auto">
              <span class="w-1.5 h-1.5 rounded-full" :class="monitors.every(m => m.status === 2) ? 'bg-emerald-400' : 'bg-red-400'" />
              <span class="text-xs" :class="monitors.every(m => m.status === 2) ? 'text-emerald-400' : 'text-red-400'">
                {{ monitors.every(m => m.status === 2) ? '全部正常' : monitors.filter(m => m.status === 8 || m.status === 9).length + '个故障' }}
              </span>
            </span>
          </button>

          <!-- Group Items -->
          <div v-if="!collapsedDomains[domain]" class="border-t border-border px-4 pb-4 pt-3 space-y-2">
            <MonitorCard
              v-for="monitor in monitors"
              :key="monitor.id"
              :monitor="monitor"
            />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="pt-6 border-t border-border text-center text-xs text-text-muted">
        数据来源
        <a href="https://uptimerobot.com" target="_blank" rel="noopener" class="hover:text-text transition-colors">
          UptimeRobot
        </a>
        · 每 5 分钟自动刷新
      </footer>
    </div>
  </div>
</template>
