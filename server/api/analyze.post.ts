/**
 * 字幕分析 API 路由
 * POST /api/analyze
 * 接收 YouTube URL，返回 AI 整理后的流式内容
 */

import { getYouTubeSubtitles } from '../utils/youtube'
import { createGeminiReadableStream } from '../utils/gemini'

/** 请求体结构 */
interface AnalyzeRequest {
  url: string
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

  // 3. 获取字幕内容
  let subtitles: string
  try {
    subtitles = await getYouTubeSubtitles(url)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch subtitles'
    throw createError({
      statusCode: 422,
      statusMessage: message
    })
  }

  // 4. 检查字幕长度
  if (subtitles.length < 100) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Subtitles too short or empty'
    })
  }
  // 最大输入限制为1M字符
  const MAX_INPUT_LENGTH = 1024 * 1024 // 1MB
  if (subtitles.length > MAX_INPUT_LENGTH) {
    throw createError({
      statusCode: 422,
      statusMessage: `Subtitles too long (max 1M characters, current ${Math.round(subtitles.length/1024)}KB)`
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
  const stream = createGeminiReadableStream(subtitles, apiKey)

  // 7. 返回流式响应
  return sendStream(event, stream)
})
