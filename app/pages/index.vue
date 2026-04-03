<script setup lang="ts">
/**
 * 主页面 - 纯编排层
 * 所有业务逻辑由 composables 驱动，所有 UI 由 components 渲染
 */

// ---- Composables ----
const {
  url, useMock, content, loading, error,
  inputCollapsed, autoScroll, isProgrammaticScroll,
  handleSubmit, toggleInputCollapse, copyContent, isStreaming
} = useYoutubeAnalyzer()

const {
  toc, activeTocId, structuredToc, renderedHtml,
  initHeadingInteractions, toggleTocItemOnly
} = useMarkdownProcessor(content)

const { sidebarCollapsed, toggleSidebar } = useResponsiveSidebar()

// sidebar 收缩动画结束后才显示外部按钮，避免两个按钮同时可见
const showExternalToggle = ref(true)
watch(sidebarCollapsed, (collapsed) => {
  if (collapsed) {
    // 收起时延迟显示外部按钮（等 sidebar 300ms 动画结束）
    showExternalToggle.value = false
    setTimeout(() => { showExternalToggle.value = true }, 300)
  }
})

// ---- Refs ----
const contentAreaRef = ref<InstanceType<typeof import('~/components/youtube/ContentArea.vue').default> | null>(null)
const inputFormRef = ref<InstanceType<typeof import('~/components/youtube/InputForm.vue').default> | null>(null)

// 获取内部 contentRef 的 computed
const contentRef = computed(() => contentAreaRef.value?.contentRef ?? null)

// ---- Scroll sync ----
const { scrollToHeading } = useScrollSync(
  contentRef,
  toc,
  activeTocId,
  isProgrammaticScroll,
  autoScroll
)

// ---- 标题折叠：内容渲染后初始化 DOM 交互 ----
watch(content, () => {
  initHeadingInteractions(contentRef)
}, { deep: true })

// ---- 复制全文 ----
const handleCopy = () => copyContent(contentRef)

// ---- 展开输入区：滚动到顶部 + focus 输入框 ----
const handleToggleInput = () => {
  const isExpanding = inputCollapsed.value
  toggleInputCollapse()
  if (isExpanding) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // 等待展开动画完成后 focus
    setTimeout(() => {
      inputFormRef.value?.inputRef?.focus()
    }, 500)
  }
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- 顶部输入区域 -->
    <div
      class="relative overflow-hidden transition-all duration-500"
      :class="{ 'max-h-0': inputCollapsed, 'pb-4': !inputCollapsed }"
    >
      <youtube-input-collapse-button
        :collapsed="inputCollapsed"
        :show="!!content && !loading && !error"
        @toggle="handleToggleInput"
      />

      <div
        class="transition-all duration-500 max-h-[1000px]"
        :class="{ 'max-h-0 opacity-0 overflow-hidden pt-0 pb-0': inputCollapsed }"
      >
        <youtube-input-form
          ref="inputFormRef"
          v-model="url"
          v-model:use-mock="useMock"
          :loading="loading"
          @submit="handleSubmit"
        />
      </div>
    </div>

    <!-- 下半部分：目录 + 正文 -->
    <div class="flex">
      <!-- 侧边栏目录 -->
      <youtube-sidebar
        :toc="structuredToc"
        :active-toc-id="activeTocId"
        :collapsed="sidebarCollapsed"
        @toggle-item="toggleTocItemOnly"
        @navigate-to="scrollToHeading"
        @close="toggleSidebar"
      >
        <template #toggle-button>
          <youtube-sidebar-toggle-button
            :collapsed="false"
            @toggle="toggleSidebar"
          />
        </template>
      </youtube-sidebar>

      <!-- 主内容区域 -->
      <main class="flex-1 min-w-0">
        <!-- 目录切换按钮 - 浮动在左上角，不占文档流空间 -->
        <div class="sticky top-6 z-10 h-0 ml-6 xl:ml-2">
          <youtube-sidebar-toggle-button
            v-if="sidebarCollapsed && content && showExternalToggle"
            :collapsed="sidebarCollapsed"
            @toggle="toggleSidebar"
          />
        </div>

        <youtube-content-area
          ref="contentAreaRef"
          :content="content"
          :loading="loading"
          :error="error"
          :rendered-html="renderedHtml"
          :streaming="isStreaming"
          @copy="handleCopy"
        />
      </main>
    </div>

    <!-- 流式输出底部渐变遮罩 -->
    <Transition name="stream-fade">
      <div
        v-if="isStreaming"
        class="fixed bottom-0 left-0 right-0 h-36 pointer-events-none z-10"
        style="background: linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.7) 40%, white 100%)"
      />
    </Transition>
  </div>
</template>

<style>
.stream-fade-enter-active {
  transition: opacity 0.2s ease;
}
.stream-fade-leave-active {
  transition: opacity 0.8s ease;
}
.stream-fade-enter-from,
.stream-fade-leave-to {
  opacity: 0;
}
</style>