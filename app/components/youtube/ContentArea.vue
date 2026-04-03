<script setup lang="ts">
const props = defineProps<{
  content: string
  loading: boolean
  error: string
  renderedHtml: string
}>()

const emit = defineEmits<{
  copy: []
}>()

const contentRef = ref<HTMLElement | null>(null)

defineExpose({
  contentRef
})
</script>

<template>
  <div class="pb-16 px-4 pt-4">
    <!-- 错误提示 -->
    <youtube-error-alert :message="error" />

    <!-- 骨架加载 -->
    <youtube-skeleton-loader v-if="loading" />

    <!-- AI 输出内容 -->
    <div class="relative group max-w-3xl mx-auto">
      <div
        v-if="content"
        ref="contentRef"
        class="prose prose-slate lg:prose-lg mx-auto custom-prose pb-12"
        v-html="renderedHtml"
      />
      <!-- 复制全文按钮 - hover 可见 -->
      <button
        v-if="content"
        @click="emit('copy')"
        class="absolute bottom-0 left-0 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm hover:bg-slate-50 transition-opacity opacity-0 group-hover:opacity-100 flex items-center gap-2 text-sm text-slate-600 z-10"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        复制全文
      </button>
    </div>

    <!-- 空状态 -->
    <youtube-empty-state v-if="!content && !loading && !error" />
  </div>
</template>
