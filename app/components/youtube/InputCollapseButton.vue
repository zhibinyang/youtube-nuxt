<script setup lang="ts">
const props = defineProps<{
  collapsed: boolean
  show: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()
</script>

<template>
  <button
    v-if="show"
    @click="emit('toggle')"
    class="z-10 bg-white border border-slate-200 rounded-full w-8 h-8 flex items-center justify-center shadow-sm hover:bg-slate-50 transition"
    :class="[
      collapsed ? 'fixed top-1 left-1/2 transform -translate-x-1/2' : 'absolute -bottom-0 left-1/2 transform -translate-x-1/2'
    ]"
    :aria-label="collapsed ? '展开输入区' : '收起输入区'"
  >
    <svg
      class="w-4 h-4 text-slate-500 transition-transform"
      :class="{ 'rotate-180': !collapsed }"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>
</template>
