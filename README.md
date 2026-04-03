# YouTube 字幕总结工具

基于 Nuxt 4 + Gemini AI 的 YouTube 视频字幕智能总结工具，提供飞书文档风格的阅读体验。

## 功能特性

- 🎬 **YouTube 字幕自动提取**: 支持所有公开 YouTube 视频的字幕提取
- 🤖 **AI 智能整理**: 调用 Gemini AI 将字幕内容整理为结构化的 Markdown 文章
- ⚡ **流式输出**: 打字机效果实时展示 AI 生成内容，无需等待完整响应
- 📑 **飞书风格界面**: 左侧可折叠目录，支持多级标题导航
- 🔖 **标题折叠**: 支持二级标题折叠/展开，方便长内容阅读
- 🎨 **零自定义 CSS**: 基于 TailwindCSS + @tailwindcss/typography 实现精美排版
- ☁️ **Cloudflare 部署**: 完全兼容 Cloudflare Pages 无服务器部署

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
│   └── pages/
│       └── index.vue          # 主页面组件
├── server/
│   ├── api/
│   │   ├── analyze.post.ts    # 正式 API 路由
│   │   └── mock-analyze.post.ts # 调试用 Mock API
│   └── utils/
│       ├── youtube.ts         # YouTube 字幕提取工具
│       └── gemini.ts          # Gemini API 封装
├── scripts/
│   └── test-transcript.ts     # 字幕提取测试脚本
├── nuxt.config.ts             # Nuxt 配置
├── tailwind.config.js         # Tailwind 配置
└── .env.example               # 环境变量示例
```

## 使用说明

1. 在输入框中粘贴 YouTube 视频链接
2. 点击「分析」按钮
3. 等待字幕提取和 AI 整理完成
4. 使用左侧目录导航，点击标题可快速跳转
5. 鼠标悬停在二级标题上可看到折叠按钮，点击可折叠/展开该部分内容

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
