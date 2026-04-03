/**
 * YouTube 分析核心业务逻辑
 * 管理输入状态、API 调用、流式平滑输出和剪贴板操作
 */
export const useYoutubeAnalyzer = () => {
  /** 输入的 YouTube URL */
  const url = ref('')
  /** 调试模式 - 使用 mock 接口 */
  const useMock = ref(false)
  /** 生成的 Markdown 内容（由 smoother 逐字写入） */
  const content = ref('')
  /** 加载状态（骨架屏） */
  const loading = ref(false)
  /** 错误信息 */
  const error = ref('')
  /** 输入区域折叠状态 */
  const inputCollapsed = ref(false)
  /** 自动滚动开关 */
  const autoScroll = ref(true)
  /** 标记是否是程序自动滚动，避免触发用户滚动检测 */
  const isProgrammaticScroll = ref(false)

  // ---- 流式输出平滑器 ----
  const smoother = useStreamSmoother(content)
  /** 是否正在流式输出（smoother 活跃期间一直为 true，含段间等待和排空阶段） */
  const isStreaming = computed(() => smoother.isActive.value)

  // ---- rAF 平滑滚动 ----
  let scrollRafId: number | null = null

  const startSmoothScroll = () => {
    const tick = () => {
      if (!autoScroll.value || !isStreaming.value) {
        scrollRafId = null
        return
      }

      const target = document.documentElement.scrollHeight - window.innerHeight
      const current = window.scrollY
      const distance = target - current

      if (distance > 1) {
        isProgrammaticScroll.value = true
        // lerp: 每帧移动剩余距离的 12%，产生丝滑减速效果
        window.scrollTo(0, current + distance * 0.12)
      }

      scrollRafId = requestAnimationFrame(tick)
    }
    if (!scrollRafId) {
      scrollRafId = requestAnimationFrame(tick)
    }
  }

  // 当 isStreaming 变化时自动控制滚动
  // 当 isStreaming 或 autoScroll 变化时自动控制平滑滚动
  watch([isStreaming, autoScroll], ([streaming, scrolling]) => {
    if (streaming && scrolling) {
      startSmoothScroll()
    }
  })

  /** 处理提交 - 直接使用内部响应式状态 */
  const handleSubmit = async () => {
    if ((!url.value.trim() && !useMock.value) || loading.value) return

    loading.value = true
    error.value = ''
    content.value = ''
    smoother.reset()
    autoScroll.value = true

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

      let isFirstChunk = true

      while (true) {
        const { done, value } = await reader.read()

        // 注意：在 Cloudflare 中，fetch 会在响应头返回时瞬间 resolve，而真正的流数据可能要等待几秒（大纲生成）。
        // 因此必须在读到第一个 Chunk 后才关闭 loading 和隐藏空状态，否则骨架屏会闪退并重新显示介绍框。
        if (isFirstChunk) {
          isFirstChunk = false
          inputCollapsed.value = true
          loading.value = false
        }

        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        smoother.push(chunk) // 进入缓冲区，由 smoother 匀速输出到 content
      }

      // 上游流结束，通知 smoother 排空剩余缓冲
      smoother.finish()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '发生未知错误'
      smoother.finish() // 出错也排空已缓冲的内容
    } finally {
      loading.value = false
    }
  }

  /** 切换输入区域折叠 */
  const toggleInputCollapse = () => {
    inputCollapsed.value = !inputCollapsed.value
  }

  /** 复制全文 Markdown 到剪贴板 */
  const copyContent = async (contentRef: Ref<HTMLElement | null>) => {
    try {
      await navigator.clipboard.writeText(content.value)
      // 显示复制成功提示
      const toast = document.createElement('div')
      toast.textContent = '已复制到剪贴板'
      toast.className = 'fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm'
      document.body.appendChild(toast)
      setTimeout(() => {
        toast.style.opacity = '0'
        toast.style.transition = 'opacity 0.3s'
        setTimeout(() => toast.remove(), 300)
      }, 2000)
    } catch (err) {
      console.error('复制失败:', err)
      // 降级方案：选中内容让用户手动复制
      if (contentRef.value) {
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNode(contentRef.value)
        selection?.removeAllRanges()
        selection?.addRange(range)
        alert('已选中全文，请手动复制')
      }
    }
  }

  return {
    url,
    useMock,
    content,
    loading,
    error,
    inputCollapsed,
    autoScroll,
    isProgrammaticScroll,
    handleSubmit,
    toggleInputCollapse,
    copyContent,
    isStreaming
  }
}
