<script setup lang="ts">
import type { Monitor } from '~/types'

const props = defineProps<{
  monitor: Monitor
}>()

// Parse custom_uptime_ratio string like "100.000-100.000-100.000-100.000" (1d-7d-30d-90d)
const uptime30d = computed(() => {
  const ratio = props.monitor.custom_uptime_ratio
  if (!ratio) return null
  const parts = ratio.split('-')
  return parseFloat(parts[2] || parts[0])
})

// Parse response time (string from API like "68.000")
const responseTime = computed(() => {
  const rt = props.monitor.average_response_time
  if (rt === undefined || rt === null) return null
  const num = typeof rt === 'string' ? parseFloat(rt) : rt
  return Math.round(num)
})

// Favicon with fallback
const faviconSrc = computed(() => props.monitor.favicon_url || '')
const faviconError = ref(false)
</script>

<template>
  <div
    class="bg-surface-2 border border-border rounded-xl p-4 hover:border-text-muted/30 transition-all duration-300 group"
  >
    <div class="flex items-start justify-between gap-3">
      <!-- Favicon + Info -->
      <div class="flex items-start gap-3 flex-1 min-w-0">
        <img
          v-if="faviconSrc && !faviconError"
          :src="faviconSrc"
          :alt="monitor.domain"
          class="w-6 h-6 rounded mt-0.5 flex-shrink-0"
          loading="lazy"
          @error="faviconError = true"
        />
        <div class="w-6 h-6 rounded bg-surface-3 flex items-center justify-center text-xs flex-shrink-0 mt-0.5" v-else>
          🌐
        </div>

        <div class="flex-1 min-w-0">
          <!-- Name + Type -->
          <div class="flex items-center gap-2 mb-0.5">
            <h3 class="font-semibold text-text text-[13px] truncate">{{ monitor.friendly_name }}</h3>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-text-muted flex-shrink-0">
              {{ monitor.type_label }}
            </span>
          </div>

          <!-- URL -->
          <a
            v-if="monitor.url"
            :href="monitor.url"
            target="_blank"
            rel="noopener"
            class="text-xs text-text-muted hover:text-text truncate block transition-colors"
          >
            {{ monitor.url }}
          </a>
        </div>
      </div>

      <!-- Status -->
      <StatusBadge :status="monitor.status" />
    </div>

    <!-- Stats row -->
    <div class="flex items-center gap-4 mt-3 pt-3 border-t border-border">
      <!-- 30-day Uptime -->
      <div v-if="uptime30d !== null" class="flex items-center gap-1.5">
        <span class="text-[11px] text-text-muted">30天可用率</span>
        <div class="flex items-center gap-1">
          <div class="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="{
                'bg-emerald-500': uptime30d >= 99.9,
                'bg-amber-500': uptime30d >= 99 && uptime30d < 99.9,
                'bg-red-500': uptime30d < 99,
              }"
              :style="{ width: `${Math.min(uptime30d, 100)}%` }"
            />
          </div>
          <span class="text-xs font-mono text-text">{{ uptime30d.toFixed(2) }}%</span>
        </div>
      </div>

      <!-- Response Time -->
      <div v-if="responseTime !== null" class="flex items-center gap-1.5">
        <span class="text-[11px] text-text-muted">响应</span>
        <span class="text-xs font-mono text-text">{{ responseTime }}ms</span>
      </div>

      <!-- Interval -->
      <div v-if="monitor.interval" class="flex items-center gap-1.5 ml-auto">
        <span class="text-[11px] text-text-muted">检测间隔</span>
        <span class="text-xs font-mono text-text">{{ monitor.interval }}s</span>
      </div>
    </div>
  </div>
</template>
