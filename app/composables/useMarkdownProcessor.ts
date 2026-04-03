import type { TocItem } from '~/types'
import { marked } from 'marked'

/**
 * Markdown 处理和目录生成逻辑
 * 负责：Markdown → HTML 渲染、TOC 提取、标题折叠 DOM 操作
 */
export const useMarkdownProcessor = (content: Ref<string>) => {
  /** 目录列表 */
  const toc = ref<TocItem[]>([])
  /** 当前激活的标题 ID */
  const activeTocId = ref<string>('')

  /** 生成稳定的标题 ID */
  const generateHeadingId = (level: number, text: string, index: number): string => {
    const textStr = String(text || '')
    const cleanText = textStr
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return `h-${level}-${cleanText || index}`
  }

  /** 直接从 Markdown 文本提取目录 - 只显示1-3级 */
  const updateTocFromMarkdown = () => {
    if (!content.value) {
      toc.value = []
      return
    }

    const headingRegex = /^(#{1,3})\s+(.+)$/gm // 只匹配1-3级标题
    const newToc: TocItem[] = []
    let match: RegExpExecArray | null
    let index = 0

    while ((match = headingRegex.exec(content.value)) !== null) {
      const level = match[1]!.length
      const text = match[2]!.trim()
      const id = generateHeadingId(level, text, index++)

      newToc.push({ id, level, text, collapsed: false })
    }

    toc.value = newToc
  }

  /** 结构化目录树 */
  const structuredToc = computed(() => {
    const tree: TocItem[] = []
    const stack: TocItem[] = []

    toc.value.forEach(item => {
      const newItem = { ...item, children: [] }

      // 弹出栈中级别 >= 当前级别的项
      while (stack.length > 0 && stack[stack.length - 1]!.level >= item.level) {
        stack.pop()
      }

      if (stack.length === 0) {
        tree.push(newItem)
      } else {
        stack[stack.length - 1]!.children!.push(newItem)
      }

      stack.push(newItem)
    })

    return tree
  })

  /** 渲染 Markdown 为 HTML */
  const renderedHtml = computed(() => {
    if (!content.value) return ''
    return marked(content.value) as string
  })

  /**
   * 初始化标题的 ID 和折叠功能
   * 给 DOM 中的 h1-h6 添加 ID，给 h2/h3 添加点击折叠交互
   */
  const initHeadingInteractions = async (contentRef: Ref<HTMLElement | null>) => {
    if (!contentRef.value) return

    await nextTick()

    const headings = contentRef.value.querySelectorAll('h1, h2, h3, h4, h5, h6')
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.substring(1))
      const text = heading.textContent || ''
      const id = generateHeadingId(level, text, index)
      heading.id = id
      heading.classList.add('scroll-mt-4')

      // 给2级标题添加点击折叠功能
      if (level === 2) {
        ;(heading as HTMLElement).style.cursor = 'pointer'
        ;(heading as HTMLElement).onclick = () => {
          const isCollapsing = !heading.classList.contains('collapsed')
          heading.classList.toggle('collapsed')

          // 遍历后面的所有兄弟元素，直到遇到下一个 h2 或 h1
          let next = heading.nextElementSibling
          while (next) {
            if (next.tagName === 'H2' || next.tagName === 'H1') break
            ;(next as HTMLElement).style.display = isCollapsing ? 'none' : ''
            next = next.nextElementSibling
          }

          // 同步更新目录的折叠状态
          const tocItem = toc.value.find(item => item.id === id)
          if (tocItem && tocItem.level === 2) {
            tocItem.collapsed = isCollapsing
          }
        }
      }

      // 给3级标题添加点击折叠功能
      if (level === 3) {
        ;(heading as HTMLElement).style.cursor = 'pointer'
        ;(heading as HTMLElement).onclick = () => {
          const isCollapsing = !heading.classList.contains('collapsed')
          heading.classList.toggle('collapsed')

          // 遍历后面的所有兄弟元素，直到遇到下一个 h3/h2/h1
          let next = heading.nextElementSibling
          while (next) {
            if (next.tagName === 'H3' || next.tagName === 'H2' || next.tagName === 'H1') break
            ;(next as HTMLElement).style.display = isCollapsing ? 'none' : ''
            next = next.nextElementSibling
          }
        }
      }
    })
  }

  /** 切换目录项折叠（仅目录 UI，不同步到正文 DOM） */
  const toggleTocItemOnly = (item: TocItem) => {
    if (item.level === 2) {
      const originalItem = toc.value.find(t => t.id === item.id)
      if (originalItem && originalItem.level === 2) {
        originalItem.collapsed = !originalItem.collapsed
      }
    }
  }

  // 内容变化时自动更新目录
  watch(() => content.value, () => {
    updateTocFromMarkdown()
  }, { deep: true })

  return {
    toc,
    activeTocId,
    structuredToc,
    renderedHtml,
    generateHeadingId,
    updateTocFromMarkdown,
    initHeadingInteractions,
    toggleTocItemOnly
  }
}
