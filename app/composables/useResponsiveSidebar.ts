/**
 * 响应式侧边栏逻辑
 */
export const useResponsiveSidebar = () => {
  /** 侧边栏折叠状态 */
  const sidebarCollapsed = ref(true) // 默认折叠

  /** 切换侧边栏折叠 */
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  // 响应式侧边栏默认状态：所有屏幕默认收起
  const handleResize = () => {
    sidebarCollapsed.value = true
  }

  onMounted(() => {
    window.addEventListener('resize', handleResize)
    handleResize() // 初始化时检查一次
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  return {
    sidebarCollapsed,
    toggleSidebar
  }
}
