<script setup lang="ts">
const props = defineProps<{
  message: string
}>()
</script>

<template>
  <div
    v-if="message"
    class="max-w-3xl mx-auto mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700"
  >
    {{ message }}
  </div>
</template>
