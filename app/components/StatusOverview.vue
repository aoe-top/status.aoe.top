<script setup lang="ts">
import type { Monitor } from '~/types'

const props = defineProps<{
  monitors: Monitor[]
}>()

const counts = computed(() => {
  const m = props.monitors
  return {
    total: m.length,
    up: m.filter(x => x.status === 2).length,
    down: m.filter(x => x.status === 8 || x.status === 9).length,
    paused: m.filter(x => x.status === 0).length,
  }
})
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div class="bg-surface-2 border border-border rounded-xl p-5">
      <div class="text-text-muted text-sm mb-1">全部监控</div>
      <div class="text-3xl font-bold text-text">{{ counts.total }}</div>
    </div>
    <div class="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
      <div class="text-emerald-400/80 text-sm mb-1">正常运行</div>
      <div class="text-3xl font-bold text-emerald-400">{{ counts.up }}</div>
    </div>
    <div class="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
      <div class="text-red-400/80 text-sm mb-1">发生故障</div>
      <div class="text-3xl font-bold text-red-400">{{ counts.down }}</div>
    </div>
    <div class="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
      <div class="text-amber-400/80 text-sm mb-1">已暂停</div>
      <div class="text-3xl font-bold text-amber-400">{{ counts.paused }}</div>
    </div>
  </div>
</template>
