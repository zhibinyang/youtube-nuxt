/**
 * YouTube 分析核心业务逻辑
 * 管理输入状态、API 调用、流式接收和剪贴板操作
 */
export const useYoutubeAnalyzer = () => {
  /** 输入的 YouTube URL */
  const url = ref('')
  /** 调试模式 - 使用 mock 接口 */
  const useMock = ref(false)
  /** 生成的 Markdown 内容 */
  const content = ref('')
  /** 加载状态 */
  const loading = ref(false)
  /** 错误信息 */
  const error = ref('')
  /** 输入区域折叠状态 */
  const inputCollapsed = ref(false)
  /** 自动滚动开关 */
  const autoScroll = ref(true)
  /** 标记是否是程序自动滚动，避免触发用户滚动检测 */
  const isProgrammaticScroll = ref(false)
  /** 是否正在流式接收内容 */
  const isStreaming = ref(false)

  /** 处理提交 - 直接使用内部响应式状态 */
  const handleSubmit = async () => {
    if ((!url.value.trim() && !useMock.value) || loading.value) return

    loading.value = true
    error.value = ''
    content.value = ''
    // 每次新分析开始时重置自动滚动状态
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

      // 开始流式传输时自动折叠输入区并隐藏骨架屏
      inputCollapsed.value = true
      loading.value = false
      isStreaming.value = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        content.value += chunk

        // 自动滚动到底部
        if (autoScroll.value) {
          isProgrammaticScroll.value = true
          // 流式输出时使用即时滚动，避免平滑滚动的节流导致跟不上速度
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'auto'
          })
        }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '发生未知错误'
    } finally {
      loading.value = false
      isStreaming.value = false
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
