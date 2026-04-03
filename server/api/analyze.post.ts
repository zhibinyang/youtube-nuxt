/**
 * 字幕分析 API 路由
 * POST /api/analyze
 * 接收 YouTube URL，返回 AI 整理后的流式内容
 */

import { getYouTubeSubtitlesWithId } from '../utils/youtube'
import { generateOutline, generateSectionContent } from '../utils/gemini'

/** 请求体结构 */
interface AnalyzeRequest {
  url: string
}

/** 大纲结构类型 */
interface Outline {
  overall_theme: string
  host_name: string
  guests: string[]
  sections: Array<{
    title: string
    start_id: number
    end_id: number
  }>
}

export default defineEventHandler(async (event) => {
  // 1. 解析请求体
  const body = await readBody<AnalyzeRequest>(event)

  if (!body?.url) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required field: url'
    })
  }

  const { url } = body

  // 2. 验证 URL 格式
  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid URL: must be a YouTube link'
    })
  }

  // 3. 获取带ID的字幕内容
  let rawChunks: any[], formattedSubtitles: string
  try {
    const result = await getYouTubeSubtitlesWithId(url)
    rawChunks = result.rawChunks
    formattedSubtitles = result.formattedText
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch subtitles'
    throw createError({
      statusCode: 422,
      statusMessage: message
    })
  }

  // 4. 检查字幕长度
  if (formattedSubtitles.length < 100) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Subtitles too short or empty'
    })
  }
  // 最大输入限制为1M字符
  const MAX_INPUT_LENGTH = 1024 * 1024 // 1MB
  if (formattedSubtitles.length > MAX_INPUT_LENGTH) {
    throw createError({
      statusCode: 422,
      statusMessage: `Subtitles too long (max 1M characters, current ${Math.round(formattedSubtitles.length/1024)}KB)`
    })
  }

  // 5. 获取 API Key
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error: missing API key'
    })
  }

  // 6. 创建流式响应
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 第一步：生成结构化大纲
        console.log('🔍 开始生成大纲...')
        const outline = await generateOutline(formattedSubtitles, apiKey) as Outline
        console.log('✅ 大纲生成完成，共', outline.sections.length, '个板块')

        // 输出一级标题
        const title = `# ${outline.overall_theme}\n\n`
        controller.enqueue(encoder.encode(title))

        // 第二步：遍历每个板块生成内容
        for (const section of outline.sections) {
          // 输出二级标题
          const sectionTitle = `## ${section.title}\n\n`
          controller.enqueue(encoder.encode(sectionTitle))

          // 提取该板块对应的原始字幕内容（去掉ID标记）
          const startIdx = section.start_id - 1 // ID从1开始，数组从0开始
          const endIdx = section.end_id - 1
          const sectionChunks = rawChunks.slice(startIdx, endIdx + 1)
          const sectionContent = sectionChunks.map(c => c.text).join(' ')

          // 生成该板块的内容，流式输出
          console.log(`📝 开始生成板块：${section.title} (ID ${section.start_id}-${section.end_id})`)
          for await (const chunk of generateSectionContent(sectionContent, section.title, outline.host_name, outline.guests, apiKey)) {
            controller.enqueue(encoder.encode(chunk))
          }

          // 板块之间加换行
          controller.enqueue(encoder.encode('\n\n'))
        }

        controller.close()
        console.log('✅ 全部内容生成完成')
      } catch (error) {
        controller.error(error)
      }
    }
  })

  // 7. 返回流式响应
  return sendStream(event, stream)
})
