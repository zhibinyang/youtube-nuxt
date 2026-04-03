<template>
  <div class="max-w-3xl mx-auto text-center py-12">
    <div class="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
      <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 class="text-xl font-semibold text-slate-800 mb-3">输入 YouTube 链接开始分析</h3>
      <p class="text-slate-500 mb-6">
        系统会自动提取字幕，整理为结构化的对话文章
      </p>
      <div class="grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
        <div class="p-4 bg-slate-50 rounded-lg">
          <div class="text-blue-500 mb-2 font-medium">🎬 字幕提取</div>
          <p class="text-sm text-slate-600">自动识别并提取 YouTube 视频字幕</p>
        </div>
        <div class="p-4 bg-slate-50 rounded-lg">
          <div class="text-blue-500 mb-2 font-medium">🤖 AI 整理</div>
          <p class="text-sm text-slate-600">智能整理为排版精美的文章</p>
        </div>
        <div class="p-4 bg-slate-50 rounded-lg">
          <div class="text-blue-500 mb-2 font-medium">⚡ 流式输出</div>
          <p class="text-sm text-slate-600">实时打字机效果，无需等待</p>
        </div>
        <div class="p-4 bg-slate-50 rounded-lg">
          <div class="text-blue-500 mb-2 font-medium">📑 目录导航</div>
          <p class="text-sm text-slate-600">自动生成目录，点击快速跳转</p>
        </div>
      </div>
    </div>
  </div>
</template>
