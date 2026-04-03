/**
 * YouTube 分析核心业务逻辑
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

  /** 处理提交 */
  const handleSubmit = async (submitUrl: string, submitUseMock: boolean) => {
    if ((!submitUrl.trim() && !submitUseMock) || loading.value) return

    loading.value = true
    error.value = ''
    content.value = ''
    // 每次新分析开始时重置自动滚动状态
    autoScroll.value = true

    try {
      const apiEndpoint = submitUseMock ? '/api/mock-analyze' : '/api/analyze'
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: submitUrl.trim() })
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
    }
  }

  /** 切换输入区域折叠 */
  const toggleInputCollapse = () => {
    inputCollapsed.value = !inputCollapsed.value
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
    toggleInputCollapse
  }
}
