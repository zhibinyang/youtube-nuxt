/**
 * Gemini AI 流式生成工具
 * 负责调用 Gemini API 并返回流式响应
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

/** 内容生成专用系统提示词 */
const CONTENT_PROMPT = `你是一位拥有极强语境洞察力的资深媒体主编。你的任务是将一段【没有任何说话人标记】的视频原始生肉字幕，整理为结构清晰、排版精美的中文采访稿。
在整理过程中，你需要对口语化的表达进行通顺化翻译/总结，但核心观点、数据和关键逻辑必须 100% 完整保留。

【已识别的角色信息（请严格遵守，不要自行修改）】
本次对话的主持人：{{HOST_NAME}}
本次对话的嘉宾：{{GUEST_NAME}}（可能有多位）
请严格使用以上名字标注说话人，不要使用其他名字，也不要自行推断角色。

########## 阶段一：角色与语义边界侦测（内在逻辑执行，不输出） ##########
由于原文没有标记说话人，在输出排版前，你必须在内心通过以下“语义特征”精准界定对话边界：
1. 【角色判断规则】：提问/引导节奏的是主持人（{{HOST_NAME}}），输出核心内容的是嘉宾（{{GUEST_NAME}}）。如果原文提到了名字，请使用已识别的对应名字。
2. 【换人嗅探点】：
   - 探针 1：出现疑问句式、抛出新话题、或对上一段话进行简短的肯定并追问时（如 "That's true, but what about..."），大概率是主持人接话。
   - 探针 2：出现“我同意你的看法”、“正如你所说”，或者开始详细解答某个问题时，大概率是换人发言。

########## 阶段二：整理规则与输出格式（严格遵守并输出） ##########

### 1. 标题结构要求
- 【注意】你当前处理的是某个二级标题下的片段内容，**不需要生成一级标题（#）和二级标题（##）**！
- **三级标题**（### 标题）：表示当前话题下的具体讨论点/问题。所有的对话正文必须归属在三级标题之下。

### 2. 对话结构与排版原则
- **说话人署名**：使用 **<u>名字</u>** 的格式（加粗+下划线，例如 **<u>Host</u>**: 或 **<u>Guest</u>**:），冒号后加一个空格。必须保留英文原名（如果有）。
- **逢问必录（防吞没机制）**：只要通过语义判断出主持人进行了提问、引导、追问或过渡，哪怕只有短短几个字（如“那后来呢？”、“确实如此”），**必须单独起一段**，以 **<u>Host</u>**: 开头显式展示其发言！绝对禁止将主持人的话合并、揉碎作为背景信息塞进嘉宾的回答中。
- **无问不造（防脑补机制）**：如果在某个话题下，完全是嘉宾的连续独白或长篇大论，请**绝对不要**为了凑排版而凭空捏造主持人的提问。直接输出嘉宾的观点即可。
- **长段落切分**：如果某个人在同一次发言中输出了超长内容（涉及多个逻辑推演），请不要将其揉成一坨。你必须在同一署名下，将其按逻辑切分成多个易于阅读的段落。不同段落不需要重复写名字。

### 3. 严格禁止行为
- 绝对禁止捏造原文不存在的对话、提问或人物。
- 绝对禁止使用除了 \`#\`, \`##\`, \`###\` 和 \`**<u>名字</u>**\` 之外的其他复杂 Markdown 语法，**尤其禁止输出任何形式的水平分隔符（如---、***等分割线）**。
- 绝对禁止在开头或结尾输出类似“好的，这是为您整理的...”之类的系统废话。

请深吸一口气，先在内部仔细阅读全文，利用语义探针理清两人的对话边界，然后严格按照上述格式，直接输出最终的中文采访稿。`

/** 大纲生成专用系统提示词 */
const OUTLINE_SYSTEM_PROMPT = `你是一个顶级的视频内容编导。你的任务是阅读一份带有 [ID] 编号的采访视频粗略字幕，并提取结构化的全局大纲。

### 你的任务：
1. 识别出视频的全局核心主题（overall_theme），**必须翻译成中文，采用「主标题：副标题」的形式**，例如：\`对话OpenAI核心团队：GPT-5的研发与未来规划\`，前半部分点明核心场景/人物，后半部分点明核心话题。
2. 识别主持人（host_name）的名字：如果原文提到了主持人的真实名字，请使用真名，**不要默认叫Host**；如果确实无法识别，才返回"Host"，名字保留原语言。
3. 识别所有嘉宾（guests）：返回字符串数组，支持多人采访场景；如果是单人独白视频，guests数组和host_name填同一个名字即可。
4. 将视频划分为几个主要的话题板块（sections），并为每个板块提取精准的二级标题，**所有标题必须翻译成中文，同样采用「主题：补充说明」的形式**，例如：\`模型进展：GPT-5的研发进展与能力边界\`，前半部分是话题分类，后半部分是具体内容。
5. **【核心要求】**：对于每一个话题板块，你必须根据原文中的 [ID] 标签，准确标出该话题开始的 \`start_id\` 和结束的 \`end_id\`。

### 输出示例（仅参考格式，不要照搬内容）：
{
  "overall_theme": "对话OpenAI核心团队：GPT-5的研发与未来规划",
  "host_name": "Lex Fridman",
  "guests": ["Sam Altman", "Ilya Sutskever"],
  "sections": [
    {
      "title": "模型进展：GPT-5的研发进展与能力边界",
      "start_id": 1,
      "end_id": 128
    },
    {
      "title": "安全监管：AI发展的风险控制与全球治理",
      "start_id": 129,
      "end_id": 256
    }
  ]
}

### 注意事项：
- 不要翻译全文！只关注大纲结构和话题切换的边界，仅翻译标题部分。
- ID 必须严格提取原文中存在的数字，绝不能凭空捏造。
- 必须严格以 JSON 格式输出，不要有任何 Markdown 代码块包裹或多余的解释文字。
- 返回的JSON结构必须符合以下TypeScript类型定义：
{
  overall_theme: string,
  host_name: string,
  guests: string[],
  sections: Array<{
    title: string,
    start_id: number,
    end_id: number
  }>
}`

/**
 * 生成结构化大纲（非流式）
 * @param formattedSubtitles 带ID编号的格式化字幕文本
 * @param apiKey Gemini API Key
 * @returns 结构化大纲对象
 */
export async function generateOutline(
  formattedSubtitles: string,
  apiKey: string
) {
  const genAI = new GoogleGenerativeAI(apiKey)

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite-preview',
    systemInstruction: OUTLINE_SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: 8192,
      responseMimeType: 'application/json' // 强制返回JSON
    }
  })

  console.log('='.repeat(80))
  console.log('📤 发送给Gemini的大纲生成请求：')
  console.log('='.repeat(80))
  console.log('[字幕内容]\n', formattedSubtitles.substring(0, 500) + '...') // 太长只打印前500字符
  console.log('='.repeat(80))

  const result = await model.generateContent(formattedSubtitles)
  const response = result.response.text()

  console.log('📥 大纲生成结果：', response)
  console.log('='.repeat(80))

  try {
    return JSON.parse(response)
  } catch (e) {
    console.error('解析大纲JSON失败:', e)
    throw new Error('Failed to parse outline from Gemini response')
  }
}

/**
 * 生成单个话题板块的内容（流式）
 * @param sectionContent 该板块的字幕内容
 * @param sectionTitle 当前板块的二级标题（中文）
 * @param hostName 主持人名字
 * @param guests 嘉宾名字数组（支持多人）
 * @param apiKey Gemini API Key
 * @returns AsyncGenerator 流式生成文本块
 */
export async function* generateSectionContent(
  sectionContent: string,
  sectionTitle: string,
  hostName: string,
  guests: string[],
  apiKey: string
): AsyncGenerator<string> {
  const genAI = new GoogleGenerativeAI(apiKey)

  // 动态替换提示词中的名字占位符
  const guestNamesStr = guests.join('、')
  const systemPrompt = CONTENT_PROMPT
    .replace(/{{HOST_NAME}}/g, hostName)
    .replace(/{{GUEST_NAME}}/g, guestNamesStr)

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite-preview',
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: 65536 // 最大输出64k token
    }
  })

  const result = await model.generateContentStream(sectionContent)

  // 拼接完整的响应内容
  let fullResponse = ''
  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) {
      fullResponse += text
      yield text
    }
  }

  console.log(`✅ 板块内容生成完成，长度：${fullResponse.length}字符`)
  return fullResponse
}

/**
 * 原整体生成流式接口（保留兼容旧逻辑）
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
    systemInstruction: CONTENT_PROMPT,
    generationConfig: {
      maxOutputTokens: 65536 // 最大输出64k token
    }
  })

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
