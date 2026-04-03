/**
 * Gemini AI 流式生成工具
 * 负责调用 Gemini API 并返回流式响应
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
/** 直接导入提示词，适配Cloudflare无文件系统环境，修改prompt.ts即可调整提示词 */
import SYSTEM_PROMPT from './prompt'

/**
 * 创建 Gemini 流式生成器
 * @param content 字幕文本内容
 * @param apiKey Gemini API Key
 * @returns AsyncGenerator 流式生成文本块
 */
export async function* createGeminiStream(
  content: string,
  apiKey: string
): AsyncGenerator<string> {
  const genAI = new GoogleGenerativeAI(apiKey)

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite-preview',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: 65536 // 最大输出64k token
    }
  })

  // 打印完整的Gemini输入
  console.log('='.repeat(80))
  console.log('📤 发送给Gemini的原始输入：')
  console.log('='.repeat(80))
  console.log('[System Prompt]\n', SYSTEM_PROMPT)
  console.log('\n' + '='.repeat(80))
  console.log('[User Content (字幕内容)]\n', content)
  console.log('='.repeat(80))

  const result = await model.generateContentStream(content)

  // 拼接完整的响应内容
  let fullResponse = ''
  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) {
      fullResponse += text
      yield text
    }
  }

  // 全部输出完成后打印完整结果
  console.log('='.repeat(80))
  console.log('📥 Gemini完整输出结果：')
  console.log('='.repeat(80))
  console.log(fullResponse)
  console.log('='.repeat(80))
}

/**
 * 将 Gemini 流转换为 ReadableStream
 * @param content 字幕文本内容
 * @param apiKey Gemini API Key
 * @returns ReadableStream 用于 HTTP 响应
 */
export function createGeminiReadableStream(
  content: string,
  apiKey: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of createGeminiStream(content, apiKey)) {
          controller.enqueue(encoder.encode(chunk))
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    }
  })
}
