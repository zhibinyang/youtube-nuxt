/**
 * 流式输出平滑器
 *
 * 将突发的 API 响应块缓冲后匀速、逐字输出，
 * 并根据缓冲区水位动态调速，目标保持约 3 秒的缓冲量，
 * 从而抹平多次 LLM 请求之间的空档，实现丝滑的打字机效果。
 *
 * 用法：
 *   const smoother = useStreamSmoother(contentRef)
 *   smoother.push(chunk)   // 收到 API 数据时调用
 *   smoother.finish()      // 流结束时调用，排空剩余缓冲
 *   smoother.reset()       // 开始新请求前重置
 */
export const useStreamSmoother = (output: Ref<string>) => {
  // ---- 内部状态 ----
  let buffer = ''
  let streamDone = false
  let rafId: number | null = null
  let lastFrameTime = 0
  let fractionalChars = 0

  /** 是否正在输出（缓冲区有内容，或流未结束等待新数据） */
  const isActive = ref(false)

  // ---- 速度参数 ----
  const TARGET_BUFFER_SECONDS = 3   // 目标缓冲区保持 3 秒内容量
  const MIN_SPEED = 15              // 最低 15 字/秒（防止停顿）
  const MAX_SPEED = 300             // 最高 300 字/秒（防止闪屏）

  /**
   * 计算当前输出速度（字符/秒）
   * - 流进行中：速度 = 缓冲量 / 目标秒数，自适应上游速率
   * - 流结束后：快速排空剩余，约 1.5 秒内完成
   */
  const calculateSpeed = (): number => {
    if (streamDone) {
      return Math.max(MIN_SPEED, buffer.length / 1.5)
    }
    return Math.max(MIN_SPEED, Math.min(MAX_SPEED, buffer.length / TARGET_BUFFER_SECONDS))
  }

  /** rAF 输出循环 - 每帧按速度计算应输出的字符数 */
  const tick = (now: number) => {
    // 计算帧间时长，上限 100ms 防止切后台回来时的跳帧
    const elapsed = Math.min((now - lastFrameTime) / 1000, 0.1)
    lastFrameTime = now

    if (buffer.length === 0) {
      if (streamDone) {
        // 缓冲区空 + 流已结束 → 输出完毕
        isActive.value = false
        rafId = null
        return
      }
      // 缓冲区空但流还在继续（LLM 请求间隙），保持活跃等待新数据
      rafId = requestAnimationFrame(tick)
      return
    }

    // 计算本帧应输出的字符数
    const speed = calculateSpeed()
    fractionalChars += speed * elapsed
    const charsToEmit = Math.min(Math.floor(fractionalChars), buffer.length)
    fractionalChars -= charsToEmit

    if (charsToEmit > 0) {
      output.value += buffer.slice(0, charsToEmit)
      buffer = buffer.slice(charsToEmit)
    }

    rafId = requestAnimationFrame(tick)
  }

  /** 启动输出循环 */
  const startLoop = () => {
    if (rafId) return // 避免重复启动
    lastFrameTime = performance.now()
    fractionalChars = 0
    isActive.value = true
    rafId = requestAnimationFrame(tick)
  }

  /** 推入新的数据块到缓冲区 */
  const push = (chunk: string) => {
    buffer += chunk
    if (!rafId) startLoop()
  }

  /** 标记上游流已结束，平滑器将排空剩余缓冲后停止 */
  const finish = () => {
    streamDone = true
    // 如果循环未启动（没有收到过数据就结束了），直接标记非活跃
    if (!rafId) {
      isActive.value = false
    }
  }

  /** 重置所有状态（开始新请求前调用） */
  const reset = () => {
    buffer = ''
    streamDone = false
    fractionalChars = 0
    isActive.value = false
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  return { push, finish, reset, isActive }
}
