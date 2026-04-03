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

### 自动部署

1. Fork 本仓库到你的 GitHub
2. 在 Cloudflare Pages 中选择该仓库
3. 配置构建命令: `npm run build`
4. 配置输出目录: `dist`
5. 在环境变量中添加 `GEMINI_API_KEY`
6. 部署完成即可访问

### 手动部署

```bash
# 构建项目
npm run build

# 部署到 Cloudflare Pages
npx wrangler pages deploy dist
```

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
