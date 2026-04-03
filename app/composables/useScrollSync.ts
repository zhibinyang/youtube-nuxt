import type { TocItem } from '~/types'

/**
 * 滚动同步和自动跟随逻辑
 *
 * - TOC 高亮：根据滚动位置更新当前激活的目录项（仅用户滚动时）
 * - 用户上滚取消跟随：通过 wheel 事件检测（仅用户操作触发，programmatic scroll 不触发）
 * - 用户滚回底部恢复跟随：通过 scroll 事件检测（仅在 autoScroll=false 时检查，此时无 programmatic scroll）
 */
export const useScrollSync = (
  contentRef: Ref<HTMLElement | null>,
  toc: Ref<TocItem[]>,
  activeTocId: Ref<string>,
  isProgrammaticScroll: Ref<boolean>,
  autoScroll: Ref<boolean>
) => {
  /** 监听滚动，更新 TOC 高亮 + 检测用户滚回底部 */
  const handleScroll = () => {
    // TOC 高亮更新：仅在用户主动滚动时执行
    if (isProgrammaticScroll.value) {
      isProgrammaticScroll.value = false
    } else if (contentRef.value && toc.value.length > 0) {
      const headings = contentRef.value.querySelectorAll('h1, h2, h3, h4, h5, h6')
      const scrollPosition = window.scrollY + 100

      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i]!
        const headingTop = (heading as HTMLElement).offsetTop

        if (headingTop <= scrollPosition) {
          activeTocId.value = heading.id
          break
        }
      }
    }

    // 恢复自动跟随：仅在 autoScroll 已关闭时检测
    // 此时 programmatic scroll 已停止，scroll 事件一定来自用户操作
    if (!autoScroll.value) {
      const scrollTop = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      if (scrollTop + windowHeight >= documentHeight - 50) {
        autoScroll.value = true
      }
    }
  }

  /** 检测用户主动上滚 → 取消自动跟随 */
  const handleWheel = (e: WheelEvent) => {
    if (e.deltaY < 0 && autoScroll.value) {
      autoScroll.value = false
    }
  }

  /** 跳转到指定标题 */
  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      activeTocId.value = id
    }
  }

  // 生命周期管理
  onMounted(() => {
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('wheel', handleWheel, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('wheel', handleWheel)
  })

  return {
    handleScroll,
    scrollToHeading
  }
}
