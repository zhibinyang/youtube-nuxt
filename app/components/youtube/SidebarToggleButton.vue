<script setup lang="ts">
const props = defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()
</script>

<template>
  <button
    @click="emit('toggle')"
    class="p-2 rounded bg-white border border-slate-200 shadow-sm hover:bg-slate-100 transition-colors"
    :aria-label="collapsed ? '展开目录' : '收起目录'"
  >
    <svg v-if="collapsed" class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
    <svg v-else class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
  </button>
</template>
