# YouTube 字幕智能整理工具

基于 Nuxt 4 + Google Gemini AI 构建的效率工具，自动提取 YouTube 视频字幕，智能整理为结构清晰、排版精美的中文采访稿，提供飞书文档风格的阅读体验。

## 功能特性

- 🎬 **YouTube 字幕自动提取**: 支持所有带公开字幕的 YouTube 视频字幕提取
- 🧠 **AI 智能整理**: 基于 Gemini 大模型，先生成全局大纲再分块生成内容，长视频处理更稳定，结构更清晰
- 👥 **多角色自动识别**: 自动识别主持人、嘉宾身份，支持单人独白/双人访谈/多人圆桌等多种场景，正确标注说话人
- ⚡ **流式输出**: 打字机效果实时展示 AI 生成内容，无需等待完整响应
- 📑 **多级目录导航**: 左侧自动生成可折叠目录，支持1-3级标题快速跳转
- 🔖 **多级标题折叠**: 二级/三级标题均支持点击折叠/展开，方便长内容阅读
- 📋 **一键复制导出**: hover正文左下角显示复制按钮，一键导出完整Markdown格式内容
- 🎨 **精美排版**: 基于 TailwindCSS + @tailwindcss/typography 实现专业采访稿排版
- ☁️ **Cloudflare 兼容**: 完全适配 Cloudflare Pages 无服务器部署，无需运维

## 技术栈

- **前端框架**: Nuxt 4 + Vue 3 + TypeScript
- **后端运行时**: Nitro (Cloudflare Pages 兼容)
- **UI 框架**: TailwindCSS + @tailwindcss/typography
- **AI 服务**: Google Gemini API
- **字幕提取**: youtube-transcript 库
- **Markdown 解析**: marked

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填入你的 Gemini API Key:

```env
GEMINI_API_KEY=your_api_key_here
```

> Gemini API Key 可以在 [Google AI Studio](https://ai.google.dev/) 免费申请。

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 即可使用。

### 4. 生产构建

```bash
npm run build
```

构建产物会生成在 `dist` 目录，可直接部署到 Cloudflare Pages。

## 部署到 Cloudflare Pages

### 方式一：GitHub Actions 自动部署（推荐）
每次push到main分支时自动构建部署，无需手动操作。

#### 前置准备：
1. Fork 本仓库到你的 GitHub 账户
2. 在 Cloudflare 中创建 Pages 项目，记下项目名称
3. 在 GitHub 仓库的 `Settings → Secrets and variables → Actions` 中添加以下3个Secret：
   | Secret名称 | 说明 | 获取方式 |
   |---|---|---|
   | `GEMINI_API_KEY` | Google Gemini API密钥 | 在[Google AI Studio](https://ai.google.dev/)申请 |
   | `CLOUDFLARE_API_TOKEN` | Cloudflare API令牌 | 在Cloudflare个人资料→API令牌中创建，需要`Cloudflare Pages:Edit`权限 |
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare账户ID | 在Cloudflare主页右下角可以找到 |
4. 修改`.github/workflows/deploy.yml`中的`projectName`为你在Cloudflare中创建的Pages项目名称

#### 部署流程：
配置完成后，每次push代码到main分支，GitHub Actions会自动执行：
- 代码检出→依赖安装→项目构建→部署到Cloudflare Pages
- 构建过程会自动注入`GEMINI_API_KEY`环境变量，无需手动配置

### 方式二：Cloudflare Pages 自动构建
1. Fork 本仓库到你的 GitHub
2. 在 Cloudflare Pages 中选择该仓库
3. 配置构建命令: `npm run build`
4. 配置输出目录: `dist`
5. 在 Cloudflare Pages 环境变量中添加 `GEMINI_API_KEY`
6. 保存后会自动触发首次部署

### 方式三：手动部署
```bash
# 构建项目
npm run build

# 部署到 Cloudflare Pages
npx wrangler pages deploy dist
```

## 💡 架构与精巧设计

本项目在演进过程中，进行了一系列核心架构重构和极致的 UX 打磨：

### 1. 纯组合式的模块化架构
`index.vue` 作为一个纯编排层（不到 130 行），不包含任何业务与状态。所有的业务逻辑被彻底解耦到了各个专属的 Composables 中：
- `useYoutubeAnalyzer`: 负责 API 交互、状态流转和剪贴板降级处理。
- `useMarkdownProcessor`: 负责 Markdown 解析、TOC 树结构化提取与纯原生 DOM 交互（如标题折叠）。
- `useScrollSync`: 结合 `IntersectionObserver` 思想，分离“用户主动滚动”与“程序化滚动”，实现精准的 TOC 高亮。

### 2. 抵抗 LLM 疲劳的双段式架构 (Two-stage Generation)
为了解决大模型一次性输出超长文本造成的“注意力下降/生成疲劳”问题，后端在 `gemini.ts` 中采用了精巧的两级架构：
- **第一阶段（基于 [ID] 锚点的大纲提取）**：发送带有 `[ID]` 编号的完整原始字幕，要求 LLM 在不翻译原文的情况下，仅作结构探测。强声明 `responseMimeType: 'application/json'` 提取出包含 `start_id` 和 `end_id` 的边界坐标，以及主持人/嘉宾的真实姓名。
- **第二阶段（动态提示词+串行填充）**：将第一阶段提取到的名字动态注入到细粒度的语义探针（Semantic Probes）提示词中。系统根据 `start_id` 和 `end_id` 切割切割字幕分片，为每一个节点发起**串行**的 LLM 填充请求。
由于最终目标正是流式展现，我们刻意放弃了并发请求的暴力解法，用串行流式返回大幅降低了系统并发压力与 API 速率限制。

### 3. 打字机级流式平滑器 (Stream Smoother)
基于上述的**串行 LLM 设计**，前端必然面临“段落请求间隙”造成的断流停顿。我们为此设计了定制的 `useStreamSmoother`：
- **衔接串行请求的 3 秒水位**：缓冲区的“3秒设计”并非随意设定，它正是为了弥补后端多个串行 LLM 请求之间的建立连接与首字返回时间 (TTFB)。当上一个段落流结束、下一个请求还在 pending 时，前端依靠缓冲区的 3 秒存量继续匀速吐字，完美掩盖了网络空档，让多个断裂的请求在用户视角下**融合成了一条连绵不断的完美文本流**。
- **自适应调速**：动态监控缓冲区剩余容量，自适应调速。网络快则加速排空，网络慢则减速拉长，始终维持水位。
- **rAF 逐帧渲染**：抛弃暴力的定时器，利用 `requestAnimationFrame` 将字符注入速度精准映射到屏幕帧率，做到像素级丝滑。

### 4. 影视级的流式视觉体验
- **阅读区渐变遮罩**：在流式输出处于活跃状态时，页面底部会浮现一层纯 CSS 实现的高度 144px 白色渐变遮罩。利用视觉欺骗，将底层字符“突然弹出”的生硬动作转化为优雅的浮出动画。
- **平滑像素级跟随**：抛弃了传统的逐行 `scrollTo` 跳转，改为 rAF 下的 `lerp`（线性插值）。每帧移动剩余距离的 12%，滚动曲线先快后慢，流畅自然。

### 4. 洞察用户意图的智能滚动跟随
如何判断用户在流式输出中是否想去阅读上面的文字？
通过监听 `wheel` 事件（纯粹的用户滚轮/触控板行为），而非简单的防抖 `scroll`（会被程序自身滚动触发）。一旦用户上滑，立即中断自动滚动；一旦用户翻回底部，自动恢复跟踪——完美区分程序行为与人类意图。

### 5. 双形态响应式侧边目录
充分考虑多设备阅读体验：
- **宽屏 (Desktop)**：融入全局流式网格（CSS Grid / Flex），滚动时平滑悬浮。
- **窄屏 (Mobile)**：智能退化为 Fixed 抽屉模式，配合 `Teleport` 的全屏半透明遮罩与过渡动画，点击遮罩即收起。外部汉堡按钮利用 `h-0` 零高度的 `sticky` 占位，开合之间确保主内容区“0 像素位移”。

## 项目结构

```
├── app/
│   ├── pages/
│   │   └── index.vue          # 主应用页面，包含完整前端逻辑
│   ├── components/youtube/    # 业务UI组件
│   ├── composables/           # 可复用组合式函数（滚动同步、响应式侧边栏等）
│   └── types/                 # TypeScript 类型定义
├── server/
│   ├── api/
│   │   ├── analyze.post.ts    # 核心分析接口：字幕提取→大纲生成→分块生成全流程
│   │   └── mock-analyze.post.ts # 调试用模拟接口，用于前端功能测试
│   └── utils/
│       ├── youtube.ts         # YouTube 字幕提取封装，支持带ID的分片格式
│       └── gemini.ts          # Gemini AI 封装：大纲生成+分块内容生成逻辑
├── nuxt.config.ts             # Nuxt 配置，已预设 Cloudflare Pages 部署配置
├── tailwind.config.js         # Tailwind CSS 配置
└── .env.example               # 环境变量示例
```

## 使用说明

1. 在输入框中粘贴带字幕的 YouTube 视频链接
2. 点击「分析」按钮，系统自动提取字幕并开始AI整理
3. 生成过程中可实时查看流式输出的内容，无需等待全部完成
4. 生成完成后：
   - 使用左侧目录导航，点击标题可快速跳转到对应位置
   - 点击二级/三级标题可折叠/展开对应内容
   - 鼠标hover到正文左下角，点击「复制全文」按钮可一键导出完整Markdown内容

## 调试模式

如果没有 Gemini API Key，可以使用 Mock 模式进行调试：

修改 `app/pages/index.vue` 中的 API 调用地址从 `/api/analyze` 改为 `/api/mock-analyze`，即可使用预设的模拟内容进行界面调试。

## 测试字幕提取

运行测试脚本验证字幕提取功能：

```bash
npx tsx scripts/test-transcript.ts <youtube_url_or_video_id>
```

## 界面特性

- **目录结构**: 自动提取 1-3 级标题生成层次化目录
- **标题样式**:
  - H1: 34px, 页面大标题
  - H2: 22px, 二级标题，支持折叠
  - H3: 20px, 三级标题
- **交互**:
  - 目录仅在鼠标悬停时显示折叠按钮，不影响文本对齐
  - 输入框在分析开始后自动折叠，最大化阅读空间
  - 平滑滚动定位到点击的标题位置
  - 流式输出打字机效果

## License

MIT
