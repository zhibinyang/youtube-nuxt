/**
 * YouTube 字幕提取测试脚本
 * 用法: npx tsx scripts/test-transcript.ts <youtube_url_or_video_id>
 */

async function main() {
  const arg = process.argv[2]

  if (!arg) {
    console.error('用法: npx tsx scripts/test-transcript.ts <youtube_url_or_video_id>')
    process.exit(1)
  }

  // 提取视频 ID
  const videoId = extractVideoId(arg)
  if (!videoId) {
    console.error('错误: 无法从 URL 中提取视频 ID')
    process.exit(1)
  }

  console.log(`视频 ID: ${videoId}\n`)

  try {
    // 动态导入 ESM 模块
    const { fetchTranscript } = await import('youtube-transcript/dist/youtube-transcript.esm.js')

    const transcript = await fetchTranscript(videoId, { lang: 'en' })

    if (!transcript || transcript.length === 0) {
      console.error('错误: 该视频没有可用字幕')
      process.exit(1)
    }

    console.log(`共 ${transcript.length} 个字幕片段\n`)
    console.log('--- 完整字幕 ---\n')

    // 打印完整字幕
    const fullText = transcript
      .map((item: { text: string }) => item.text)
      .join(' ')

    console.log(fullText)

    console.log('\n--- 字幕片段详情 ---\n')

    // 打印每个片段
    transcript.forEach((item: { offset: number; duration: number; text: string }, index: number) => {
      const time = formatTime(item.offset)
      console.log(`[${time}] ${item.text}`)
    })

  } catch (error) {
    console.error('错误:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

/** 从 URL 中提取视频 ID */
function extractVideoId(input: string): string | null {
  // 如果已经是 11 位的视频 ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/
  ]

  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match) return match[1]
  }

  return null
}

/** 格式化时间 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

main()
