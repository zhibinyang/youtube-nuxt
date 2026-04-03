/**
 * YouTube 字幕提取工具
 * 使用 youtube-transcript 库提取字幕
 */

// @ts-ignore: bypass type error for deep file import to fix module resolution issue
import { fetchTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js'

/** 字幕响应类型 */
interface TranscriptItem {
  text: string
  duration: number
  offset: number
  lang?: string
}

/**
 * 从 YouTube 视频链接获取字幕文本
 * @param videoUrl YouTube 视频链接
 * @returns 字幕纯文本内容
 */
export async function getYouTubeSubtitles(videoUrl: string): Promise<string> {
  const { formattedText } = await getYouTubeSubtitlesWithId(videoUrl)
  return formattedText
}

/**
 * 从 YouTube 视频链接获取带ID编号的分片字幕
 * @param videoUrl YouTube 视频链接
 * @returns 带ID的格式化字幕文本 + 原始分片数组
 */
export async function getYouTubeSubtitlesWithId(videoUrl: string): Promise<{
  rawChunks: TranscriptItem[]
  formattedText: string
}> {
  // 提取视频 ID
  const videoId = extractVideoId(videoUrl)
  if (!videoId) {
    throw new Error('Invalid YouTube URL format')
  }

  // 使用 youtube-transcript 获取字幕
  const transcript = await fetchTranscript(videoId, {
    lang: 'en' // 优先英文
  }) as TranscriptItem[]

  if (!transcript || transcript.length === 0) {
    throw new Error('No captions available for this video')
  }

  // 生成带ID编号的格式化文本
  const formattedText = transcript
    .map((item, index) => `[ID:${index + 1}] ${item.text}`) // ID从1开始
    .filter(Boolean)
    .join(' ')

  return {
    rawChunks: transcript,
    formattedText
  }
}

/** 从 YouTube URL 中提取视频 ID */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}
