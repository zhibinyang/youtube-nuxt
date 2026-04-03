<script setup lang="ts">
const props = defineProps<{
  content: string
  loading: boolean
  error: string
  renderedHtml: string
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
    <div
      v-if="content"
      ref="contentRef"
      class="prose prose-slate lg:prose-lg mx-auto custom-prose max-w-4xl"
      v-html="renderedHtml"
    />

    <!-- 空状态 -->
    <youtube-empty-state v-if="!content && !loading && !error" />
  </div>
</template>
