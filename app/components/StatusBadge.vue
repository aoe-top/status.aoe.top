<script setup lang="ts">
const props = defineProps<{
  status: number
}>()

const statusMap: Record<number, { label: string; colorClass: string; dotClass: string }> = {
  0: { label: '已暂停', colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dotClass: 'bg-amber-400' },
  1: { label: '未检测', colorClass: 'bg-gray-500/10 text-gray-400 border-gray-500/30', dotClass: 'bg-gray-400' },
  2: { label: '正常', colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dotClass: 'bg-emerald-400' },
  8: { label: '异常', colorClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30', dotClass: 'bg-orange-400' },
  9: { label: '故障', colorClass: 'bg-red-500/10 text-red-400 border-red-500/30', dotClass: 'bg-red-400' },
}

const info = computed(() => statusMap[props.status] || statusMap[1])
</script>

<template>
  <span
    :class="info.colorClass"
    class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border"
  >
    <span
      :class="[info.dotClass, { 'animate-pulse': props.status === 9 || props.status === 8 }]"
      class="w-1.5 h-1.5 rounded-full flex-shrink-0"
    />
    {{ info.label }}
  </span>
</template>
