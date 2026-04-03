import type { TocItem } from '~/types'
import { marked } from 'marked'

/**
 * Markdown 处理和目录生成逻辑
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
      const level = match[1].length
      const text = match[2].trim()
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

  /** 渲染 Markdown 为 HTML */
  const renderedHtml = computed(() => {
    if (!content.value) return ''
    // 直接渲染，不使用自定义 renderer
    return marked(content.value) as string
  })

  /** 初始化标题折叠功能 */
  const initHeadingFolding = async (contentRef: Ref<HTMLElement | null>) => {
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
  }

  // 内容变化时更新目录和标题折叠
  watch(() => content.value, async () => {
    updateTocFromMarkdown()
  }, { deep: true })

  return {
    toc,
    activeTocId,
    structuredToc,
    renderedHtml,
    generateHeadingId,
    updateTocFromMarkdown,
    initHeadingFolding
  }
}
