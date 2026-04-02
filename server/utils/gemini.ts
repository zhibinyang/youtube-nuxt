/**
 * Gemini AI 流式生成工具
 * 负责调用 Gemini API 并返回流式响应
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

/** System Prompt：定义输出格式 */
const SYSTEM_PROMPT = `你是一位专业的对话内容整理专家。你的任务是将 YouTube 视频的字幕文本整理为结构清晰、排版精美的中文对话文章。

## 输出要求

1. **标题**：使用一级标题概括视频主题
2. **摘要**：用 2-3 句话总结视频核心内容
3. **正文**：按逻辑段落组织内容，使用恰当的二级标题分隔
4. **格式**：使用 Markdown 格式，确保排版清晰

## 排版规范

- 使用 \`##\` 划分主要章节
- 使用 \`**粗体**\` 强调关键概念
- 使用 \`-\` 列表罗列要点
- 使用 \`>\` 引用框突出重要观点
- 适当使用代码块展示技术内容

## 语言风格

- 使用流畅自然的中文
- 保留专业术语的英文原文（括号标注）
- 确保逻辑连贯、易于阅读

请直接输出整理后的 Markdown 内容，不要添加任何前言或说明。`

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
    systemInstruction: SYSTEM_PROMPT
  })

  const result = await model.generateContentStream(content)

  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) {
      yield text
    }
  }
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
