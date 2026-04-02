<script setup lang="ts">
import { marked } from 'marked'

/** 输入的 YouTube URL */
const url = ref('')

/** 生成的 Markdown 内容 */
const content = ref('')

/** 加载状态 */
const loading = ref(false)

/** 错误信息 */
const error = ref('')

/** 内容区域引用 */
const contentRef = ref<HTMLElement | null>(null)

/** 处理提交 */
async function handleSubmit() {
  if (!url.value.trim() || loading.value) return

  loading.value = true
  error.value = ''
  content.value = ''

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.value.trim() })
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.statusMessage || `请求失败: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('无法获取响应流')
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      content.value += chunk

      // 自动滚动
      nextTick(() => {
        contentRef.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      })
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '发生未知错误'
  } finally {
    loading.value = false
  }
}

/** 渲染 Markdown 为 HTML */
const renderedHtml = computed(() => {
  if (!content.value) return ''
  return marked(content.value) as string
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 py-12">
    <div class="max-w-3xl mx-auto px-4">
      <!-- 标题 -->
      <header class="text-center mb-12">
        <h1 class="text-3xl font-bold text-slate-800 mb-2">
          YouTube 字幕智能整理
        </h1>
        <p class="text-slate-500">
          输入含字幕的 YouTube 链接，AI 将生成结构化的对话文章
        </p>
      </header>

      <!-- 输入区域 -->
      <div class="mb-8">
        <div class="flex gap-3">
          <input
            v-model="url"
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            class="flex-1 px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            :disabled="loading"
            @keyup.enter="handleSubmit"
          />
          <button
            @click="handleSubmit"
            :disabled="loading || !url.trim()"
            class="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
          >
            {{ loading ? '处理中...' : '分析' }}
          </button>
        </div>
      </div>

      <!-- 错误提示 -->
      <div
        v-if="error"
        class="mb-8 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700"
      >
        {{ error }}
      </div>

      <!-- 内容区域 -->
      <div
        v-if="content"
        ref="contentRef"
        class="prose prose-slate lg:prose-lg mx-auto"
        v-html="renderedHtml"
      />
    </div>
  </div>
</template>