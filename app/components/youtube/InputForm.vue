<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  useMock: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:useMock': [value: boolean]
  submit: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)

defineExpose({ inputRef })

const handleKeyupEnter = () => {
  emit('submit')
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 pt-16 pb-8">
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-slate-800 mb-3">
        YouTube 字幕智能整理
      </h1>
      <p class="text-slate-500">
        输入含字幕的 YouTube 链接，AI 将生成结构化的对话文章
      </p>
    </div>

    <!-- 输入框 -->
    <div class="flex gap-3 max-w-3xl mx-auto">
      <input
        ref="inputRef"
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="https://www.youtube.com/watch?v=..."
        class="flex-1 px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        :disabled="loading"
        @keyup.enter="handleKeyupEnter"
      />
      <button
        @click="emit('submit')"
        :disabled="loading || (!modelValue.trim() && !useMock)"
        class="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
      >
        {{ loading ? '处理中...' : '分析' }}
      </button>
    </div>

    <!-- 调试选项 -->
    <div class="max-w-3xl mx-auto mt-3 flex items-center justify-end">
      <label class="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
        <input
          :checked="useMock"
          @change="emit('update:useMock', ($event.target as HTMLInputElement).checked)"
          type="checkbox"
          class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        使用模拟数据
      </label>
    </div>
  </div>
</template>
