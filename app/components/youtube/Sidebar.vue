<script setup lang="ts">
import type { TocItem } from '~/types'

const props = defineProps<{
  toc: TocItem[]
  activeTocId: string
  collapsed: boolean
}>()

const emit = defineEmits<{
  toggleItem: [item: TocItem]
  navigateTo: [id: string]
  close: []
}>()

/** 切换目录项折叠 */
const toggleTocItemOnly = (item: TocItem) => {
  if (item.level === 2) {
    emit('toggleItem', item)
  }
}
</script>

<template>
  <!-- 遮罩层：仅在窄屏 (<xl) 且 sidebar 展开时显示，点击关闭 sidebar -->
  <Teleport to="body">
    <Transition name="backdrop">
      <div
        v-if="!collapsed"
        class="fixed inset-0 bg-black/20 z-10 xl:hidden"
        @click="emit('close')"
      />
    </Transition>
  </Teleport>

  <aside
    class="h-[calc(100vh-2rem)] bg-white transition-all duration-300 overflow-hidden z-20"
    :class="[
      collapsed ? 'w-0 opacity-0' : 'w-72 opacity-100',
      // 大屏幕下正常流式布局
      'xl:sticky xl:top-4 xl:shrink-0 xl:ml-4',
      !collapsed ? 'xl:mr-4' : '',
      // 小屏幕下固定定位，悬浮覆盖
      'fixed left-4 top-4 shadow-xl rounded-lg xl:shadow-none xl:rounded-none'
    ]"
  >
    <div class="h-full flex flex-col">
      <!-- 目录切换按钮 -->
      <div class="p-2 border-b border-slate-100">
        <slot name="toggle-button" />
      </div>

      <!-- 目录内容 -->
      <div class="flex-1 overflow-y-auto px-4 pb-8 pt-2" style="scrollbar-width: thin">
        <ul class="space-y-1">
          <!-- 递归渲染目录树 -->
          <template v-for="item in toc" :key="item.id">
            <!-- 1级标题 -->
            <li
              class="cursor-pointer rounded transition-colors"
              :class="[
                'toc-item-level-1',
                activeTocId === item.id ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900',
                'pl-2'
              ]"
            >
              <div
                class="flex items-center gap-1 py-1 px-2"
                @click="emit('navigateTo', item.id)"
              >
                <span class="truncate flex-1">
                  {{ item.text }}
                </span>
              </div>

              <!-- 2级子标题 -->
              <ul v-if="item.children && item.children.length > 0" class="space-y-1">
                <li
                  v-for="child2 in item.children"
                  :key="child2.id"
                  class="cursor-pointer rounded transition-colors relative group"
                  :class="[
                    'toc-item-level-2',
                    activeTocId === child2.id ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                  ]"
                >
                  <div
                    class="flex items-center gap-1 py-1 px-2"
                  >
                    <!-- 2级标题折叠按钮 -->
                    <span
                      class="text-[14px] text-slate-400 transition-all absolute left-[-4px] opacity-0 group-hover:opacity-100 p-1 cursor-pointer hover:text-slate-700"
                      :class="{
                        '-rotate-90': child2.collapsed,
                        'opacity-100': child2.collapsed
                      }"
                      @click.stop="toggleTocItemOnly(child2)"
                    >
                      ▾
                    </span>
                    <span
                      class="truncate flex-1"
                      @click="emit('navigateTo', child2.id)"
                    >
                      {{ child2.text }}
                    </span>
                  </div>

                  <!-- 3级子标题 -->
                  <ul
                    v-if="child2.children && child2.children.length > 0 && !child2.collapsed"
                    class="space-y-1 pl-4"
                  >
                    <li
                      v-for="child3 in child2.children"
                      :key="child3.id"
                      class="toc-item-level-3 text-sm rounded transition-colors cursor-pointer py-1 px-2"
                      :class="[
                        activeTocId === child3.id ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                      ]"
                      @click="emit('navigateTo', child3.id)"
                    >
                      <span class="block truncate">
                        {{ child3.text }}
                      </span>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* 侧边栏右侧分隔线：半透明居中细竖线 */
aside::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  width: 1px;
  height: 90%;
  background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.1), transparent);
}
</style>

<!-- 遮罩过渡动画（非 scoped，Teleport 到 body 的元素不受 scoped 限制） -->
<style>
.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.25s ease;
}

.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}
</style>
