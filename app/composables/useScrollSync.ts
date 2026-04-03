import type { TocItem } from '~/types'

/**
 * 滚动同步和自动跟随逻辑
 */
export const useScrollSync = (
  contentRef: Ref<HTMLElement | null>,
  toc: Ref<TocItem[]>,
  activeTocId: Ref<string>,
  isProgrammaticScroll: Ref<boolean>,
  autoScroll: Ref<boolean>
) => {
  /** 监听滚动，更新当前激活的目录项 */
  const handleScroll = () => {
    if (isProgrammaticScroll.value) {
      isProgrammaticScroll.value = false
      return
    }

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

    // 检测用户是否手动滚动
    const scrollTop = window.scrollY
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight
    if (scrollTop + windowHeight >= documentHeight - 50) {
      autoScroll.value = true
    } else if (scrollTop + windowHeight < documentHeight - 100) {
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
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })

  return {
    handleScroll,
    scrollToHeading
  }
}
