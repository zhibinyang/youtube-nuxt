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

/** 调试模式 - 使用 mock 接口 */
const useMock = ref(false)

/** 内容区域引用 */
const contentRef = ref<HTMLElement | null>(null)

/** 侧边栏折叠状态 */
const sidebarCollapsed = ref(true) // 默认折叠

/** 目录项 */
interface TocItem {
  id: string
  level: number
  text: string
}

/** 目录列表 */
const toc = ref<TocItem[]>([])

/** 当前激活的标题 ID */
const activeTocId = ref<string>('')

/** 处理提交 */
async function handleSubmit() {
  if ((!url.value.trim() && !useMock.value) || loading.value) return

  loading.value = true
  error.value = ''
  content.value = ''
  toc.value = []
  activeTocId.value = ''

  try {
    const apiEndpoint = useMock.value ? '/api/mock-analyze' : '/api/analyze'
    const response = await fetch(apiEndpoint, {
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

    // 开始流式传输时自动折叠输入区
    inputCollapsed.value = true

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      content.value += chunk

      // 更新目录
      updateTocFromMarkdown()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '发生未知错误'
  } finally {
    loading.value = false
  }
}

/** 生成稳定的标题 ID */
function generateHeadingId(level: number, text: string, index: number): string {
  const textStr = String(text || '')
  const cleanText = textStr
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `h-${level}-${cleanText || index}`
}

/** 目录项扩展 */
interface TocItem {
  id: string
  level: number
  text: string
  collapsed?: boolean
  children?: TocItem[]
}

/** 结构化目录树 */
const structuredToc = computed(() => {
  const tree: TocItem[] = []
  const stack: TocItem[] = []

  toc.value.forEach(item => {
    const newItem = { ...item, children: [] }

    // 弹出栈中级别 >= 当前级别的项
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      tree.push(newItem)
    } else {
      stack[stack.length - 1].children!.push(newItem)
    }

    stack.push(newItem)
  })

  return tree
})

/** 直接从 Markdown 文本提取目录 - 只显示1-3级 */
function updateTocFromMarkdown() {
  if (!content.value) {
    toc.value = []
    return
  }

  const headingRegex = /^(#{1,3})\s+(.+)$/gm // 只匹配1-3级标题
  const newToc: TocItem[] = []
  let match: RegExpExecArray | null
  let index = 0

  while ((match = headingRegex.exec(content.value)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    const id = generateHeadingId(level, text, index++)

    newToc.push({ id, level, text, collapsed: false })
  }

  toc.value = newToc
}

/** 渲染 Markdown 为 HTML */
const renderedHtml = computed(() => {
  if (!content.value) return ''
  // 直接渲染，不使用自定义 renderer
  return marked(content.value) as string
})

// 内容渲染后，给标题添加 ID 和折叠功能
watch(() => content.value, async () => {
  if (!contentRef.value) return

  await nextTick()

  const headings = contentRef.value.querySelectorAll('h1, h2, h3, h4, h5, h6')
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.substring(1))
    const text = heading.textContent || ''
    const id = generateHeadingId(level, text, index)
    heading.id = id
    heading.classList.add('scroll-mt-4')

    // 给2级和3级标题添加点击折叠功能
    if (level === 2) {
      heading.style.cursor = 'pointer'
      heading.onclick = () => {
        heading.classList.toggle('collapsed')
        // 同步更新目录的折叠状态
        const tocItem = toc.value.find(item => item.id === id)
        if (tocItem && tocItem.level === 2) {
          tocItem.collapsed = heading.classList.contains('collapsed')
        }
      }
    }
    if (level === 3) {
      heading.style.cursor = 'pointer'
      heading.onclick = () => {
        heading.classList.toggle('collapsed')
        // 3级标题不同步到目录折叠状态
      }
    }
  })
}, { deep: true })

/** 监听滚动，更新当前激活的目录项 */
function handleScroll() {
  if (!contentRef.value || toc.value.length === 0) return

  const headings = contentRef.value.querySelectorAll('h1, h2, h3, h4, h5, h6')
  const scrollPosition = window.scrollY + 100 // 偏移量

  for (let i = headings.length - 1; i >= 0; i--) {
    const heading = headings[i]
    const headingTop = heading.offsetTop

    if (headingTop <= scrollPosition) {
      activeTocId.value = heading.id
      break
    }
  }
}

/** 跳转到指定标题 */
function scrollToHeading(id: string) {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    activeTocId.value = id
  }
}

/** 切换侧边栏折叠 */
function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}


/** 切换目录项折叠 */
/** 切换目录项折叠（仅修改目录，不同步到正文） */
function toggleTocItemOnly(item: TocItem) {
  if (item.level === 2) {
    // 找到原始 toc 中的对应项进行修改
    const originalItem = toc.value.find(t => t.id === item.id)
    if (originalItem && originalItem.level === 2) {
      originalItem.collapsed = !originalItem.collapsed
    }
  }
}

/** 切换正文标题折叠（同步更新到目录） */
function toggleContentHeading(item: TocItem) {
  if (item.level === 2) {
    item.collapsed = !item.collapsed
    const heading = document.getElementById(item.id)
    if (heading) {
      heading.classList.toggle('collapsed', item.collapsed)
    }
  }
}

/** 输入区域折叠状态 */
const inputCollapsed = ref(false)

/** 切换输入区域折叠 */
function toggleInputCollapse() {
  inputCollapsed.value = !inputCollapsed.value
}

// 监听滚动事件
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- 侧边栏切换按钮 - 悬浮在左上角，位置靠下 -->
    <button
      @click="toggleSidebar"
      class="fixed top-12 left-4 z-30 p-2 rounded hover:bg-slate-100 transition-colors"
      :aria-label="sidebarCollapsed ? '展开目录' : '收起目录'"
    >
      <svg v-if="sidebarCollapsed" class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      <svg v-else class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <!-- 侧边栏 -->
    <aside
      class="fixed top-0 left-0 h-full bg-white transition-all duration-300 z-20"
      :class="[
        sidebarCollapsed ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100 w-72'
      ]"
    >
      <div class="h-full flex flex-col pt-20">
        <!-- 目录内容 -->
        <div class="flex-1 overflow-y-auto px-4 pb-8" style="scrollbar-width: thin">
          <ul class="space-y-1">
            <!-- 递归渲染目录树 -->
            <template v-for="item in structuredToc" :key="item.id">
              <!-- 1级标题 -->
              <li
                class="cursor-pointer rounded transition-colors"
                :class="[
                  'toc-item-level-1',
                  activeTocId === item.id ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900',
                  'pl-2'
                ]"
              >
                <div
                  class="flex items-center gap-1 py-1 px-2"
                  @click="scrollToHeading(item.id)"
                >
                  <span class="truncate flex-1">
                    {{ item.text }}
                  </span>
                </div>

                <!-- 2级子标题 -->
                <ul v-if="item.children && item.children.length > 0" class="space-y-1">
                  <li
                    v-for="child2 in item.children"
                    :key="child2.id"
                    class="cursor-pointer rounded transition-colors relative group"
                    :class="[
                      'toc-item-level-2',
                      activeTocId === child2.id ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                    ]"
                  >
                    <div
                      class="flex items-center gap-1 py-1 px-2"
                    >
                      <!-- 2级标题折叠按钮 -->
                      <span
                        class="text-[14px] text-slate-400 transition-all absolute left-[-4px] opacity-0 group-hover:opacity-100 p-1 cursor-pointer hover:text-slate-700"
                        :class="{
                          '-rotate-90': child2.collapsed,
                          'opacity-100': child2.collapsed
                        }"
                        @click.stop="toggleTocItemOnly(child2)"
                      >
                        ▾
                      </span>
                      <span
                        class="truncate flex-1"
                        @click="scrollToHeading(child2.id)"
                      >
                        {{ child2.text }}
                      </span>
                    </div>

                    <!-- 3级子标题 -->
                    <ul
                      v-if="child2.children && child2.children.length > 0 && !child2.collapsed"
                      class="space-y-1 pl-4"
                    >
                      <li
                        v-for="child3 in child2.children"
                        :key="child3.id"
                        class="toc-item-level-3 text-sm rounded transition-colors cursor-pointer py-1 px-2"
                        :class="[
                          activeTocId === child3.id ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                        ]"
                        @click="scrollToHeading(child3.id)"
                      >
                        <span class="block truncate">
                          {{ child3.text }}
                        </span>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </template>
          </ul>
        </div>
      </div>
    </aside>

    <!-- 主内容 -->
    <main
      class="transition-all duration-300"
      :class="[
        sidebarCollapsed ? 'ml-0' : 'ml-72'
      ]"
    >
      <!-- 顶部输入区域 -->
      <div class="relative">
        <!-- 折叠按钮 -->
        <button
          v-if="content && !loading && !error"
          @click="toggleInputCollapse"
          class="absolute -bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-white border border-slate-200 rounded-full w-8 h-8 flex items-center justify-center shadow-sm hover:bg-slate-50 transition"
          :aria-label="inputCollapsed ? '展开输入区' : '收起输入区'"
        >
          <svg
            class="w-4 h-4 text-slate-500 transition-transform"
            :class="{ 'rotate-180': inputCollapsed }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- 输入区域内容 -->
        <div
          class="max-w-4xl mx-auto px-4 pt-16 pb-8 transition-all duration-300"
          :class="{ 'h-0 opacity-0 overflow-hidden py-0': inputCollapsed }"
        >
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
              v-model="url"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              class="flex-1 px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              :disabled="loading"
              @keyup.enter="handleSubmit"
            />
            <button
              @click="handleSubmit"
              :disabled="loading || (!url.trim() && !useMock)"
              class="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
            >
              {{ loading ? '处理中...' : '分析' }}
            </button>
          </div>

          <!-- 调试选项 -->
          <div class="max-w-3xl mx-auto mt-3 flex items-center justify-end">
            <label class="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
              <input
                v-model="useMock"
                type="checkbox"
                class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              使用模拟数据（调试前端）
            </label>
          </div>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="pb-16 px-4">
        <!-- 错误提示 -->
        <div
          v-if="error"
          class="max-w-3xl mx-auto mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700"
        >
          {{ error }}
        </div>

        <!-- AI 输出内容 -->
        <div
          v-if="content"
          ref="contentRef"
          class="prose prose-slate lg:prose-lg mx-auto custom-prose"
          v-html="renderedHtml"
        />

        <!-- 空状态 -->
        <div
          v-if="!content && !loading && !error"
          class="max-w-3xl mx-auto text-center py-12"
        >
          <div class="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-slate-800 mb-3">输入 YouTube 链接开始分析</h3>
            <p class="text-slate-500 mb-6">
              系统会自动提取字幕，整理为结构化的对话文章
            </p>
            <div class="grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
              <div class="p-4 bg-slate-50 rounded-lg">
                <div class="text-blue-500 mb-2 font-medium">🎬 字幕提取</div>
                <p class="text-sm text-slate-600">自动识别并提取 YouTube 视频字幕</p>
              </div>
              <div class="p-4 bg-slate-50 rounded-lg">
                <div class="text-blue-500 mb-2 font-medium">🤖 AI 整理</div>
                <p class="text-sm text-slate-600">智能整理为排版精美的文章</p>
              </div>
              <div class="p-4 bg-slate-50 rounded-lg">
                <div class="text-blue-500 mb-2 font-medium">⚡ 流式输出</div>
                <p class="text-sm text-slate-600">实时打字机效果，无需等待</p>
              </div>
              <div class="p-4 bg-slate-50 rounded-lg">
                <div class="text-blue-500 mb-2 font-medium">📑 目录导航</div>
                <p class="text-sm text-slate-600">自动生成目录，点击快速跳转</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 自定义标题样式 */
.custom-prose h1 {
  font-size: 34px !important;
  font-weight: 700 !important;
  line-height: 1.3 !important;
  margin-top: 2em !important;
  margin-bottom: 0.8em !important;
}

.custom-prose h2 {
  font-size: 22px !important;
  font-weight: 600 !important;
  line-height: 1.4 !important;
  margin-top: 1.8em !important;
  margin-bottom: 0.6em !important;
  cursor: pointer !important;
  position: relative !important;
}

.custom-prose h3 {
  font-size: 20px !important;
  font-weight: 600 !important;
  line-height: 1.4 !important;
  margin-top: 1.5em !important;
  margin-bottom: 0.5em !important;
  cursor: pointer !important;
  position: relative !important;
}

/* 标题折叠箭头 - hover显示（仅2级标题） */
.custom-prose h2 {
  position: relative;
  padding-left: 1.2em !important;
  margin-left: -1.2em !important;
}

.custom-prose h2::before {
  content: '▾';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1em;
  color: #94a3b8;
  transition: transform 0.2s, opacity 0.2s, color 0.2s;
  opacity: 0;
}

.custom-prose h2:hover::before {
  opacity: 1;
  color: #475569;
}

.custom-prose h2.collapsed::before {
  transform: translateY(-50%) rotate(-90deg);
  opacity: 1 !important; /* 折叠状态始终显示 */
}

/* 3级标题折叠箭头 */
.custom-prose h3 {
  position: relative;
  padding-left: 1.2em !important;
  margin-left: -1.2em !important;
}

.custom-prose h3::before {
  content: '▾';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1em;
  color: #94a3b8;
  transition: transform 0.2s, opacity 0.2s, color 0.2s;
  opacity: 0;
}

.custom-prose h3:hover::before {
  opacity: 1;
  color: #475569;
}

.custom-prose h3.collapsed::before {
  transform: translateY(-50%) rotate(-90deg);
  opacity: 1;
}

/* 折叠时隐藏内容：隐藏h2之后所有元素直到下一个h2或h1 */
.custom-prose h2.collapsed + *:not(:is(h2, h1)) { display: none !important; }
.custom-prose h2.collapsed + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) { display: none !important; }
.custom-prose h2.collapsed + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) { display: none !important; }
.custom-prose h2.collapsed + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) { display: none !important; }
.custom-prose h2.collapsed + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) { display: none !important; }
.custom-prose h2.collapsed + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) { display: none !important; }
.custom-prose h2.collapsed + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) { display: none !important; }
.custom-prose h2.collapsed + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) { display: none !important; }
.custom-prose h2.collapsed + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) { display: none !important; }
.custom-prose h2.collapsed + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) { display: none !important; }
.custom-prose h2.collapsed + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) { display: none !important; }
.custom-prose h2.collapsed + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) + *:not(:is(h2, h1)) { display: none !important; }

/* 折叠时隐藏内容：隐藏h3之后所有元素直到下一个h3/h2/h1 */
.custom-prose h3.collapsed + *:not(:is(h3, h2, h1)) { display: none !important; }
.custom-prose h3.collapsed + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) { display: none !important; }
.custom-prose h3.collapsed + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) { display: none !important; }
.custom-prose h3.collapsed + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) { display: none !important; }
.custom-prose h3.collapsed + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) { display: none !important; }
.custom-prose h3.collapsed + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) { display: none !important; }
.custom-prose h3.collapsed + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) { display: none !important; }
.custom-prose h3.collapsed + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) { display: none !important; }
.custom-prose h3.collapsed + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) { display: none !important; }
.custom-prose h3.collapsed + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) + *:not(:is(h3, h2, h1)) { display: none !important; }

/* 目录样式 */
.toc-item-level-1 {
  font-size: 15px !important;
  font-weight: 500 !important;
}

.toc-item-level-2,
.toc-item-level-3 {
  font-size: 14px !important;
}

.toc-item-level-3 {
  padding-left: 1em !important;
}

/* 侧边栏右侧分隔线：半透明居中细竖线 */
aside::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  width: 1px;
  height: 80%;
  background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.1), transparent);
}
</style>