/**
 * YouTube 字幕提取工具
 * 使用 youtube-transcript 库提取字幕
 */

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
  // 提取视频 ID
  const videoId = extractVideoId(videoUrl)
  if (!videoId) {
    throw new Error('Invalid YouTube URL format')
  }

  // 动态导入 youtube-transcript ESM 版本
  const module = await import('youtube-transcript/dist/youtube-transcript.esm.js')
  const fetchTranscript = module.fetchTranscript

  // 使用 youtube-transcript 获取字幕
  const transcript = await fetchTranscript(videoId, {
    lang: 'en' // 优先英文
  }) as TranscriptItem[]

  if (!transcript || transcript.length === 0) {
    throw new Error('No captions available for this video')
  }

  // 拼接所有文本
  const content = transcript
    .map((item) => item.text)
    .filter(Boolean)
    .join(' ')

  return content
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
