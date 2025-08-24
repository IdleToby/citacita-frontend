<script setup lang="ts">
import NaviBar from '@/components/NaviBar.vue'
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'
import { ref, onMounted } from 'vue'

// 1. 创建一个 ref 来引用 header 元素
const headerRef = ref<HTMLElement | null>(null)
// 2. 创建一个 ref 来存储 header 的高度
const headerHeight = ref(0)

// 3. 在组件挂载后获取 header 的实际高度
onMounted(() => {
  if (headerRef.value) {
    headerHeight.value = headerRef.value.offsetHeight
  }
})
</script>

<template>
  <div class="app-layout">
    <header ref="headerRef" class="fixed-header p-4">
      <NaviBar />
    </header>

    <main class="main-content" :style="{ paddingTop: `${headerHeight}px` }">
      <router-view />
    </main>
  </div>
  <Toaster position="top-center" richColors />
</template>

<style scoped>
/* 不再需要 CSS 变量了 */
.app-layout {
  background: linear-gradient(to bottom, #a14724, #fcfcfc);
  min-height: 100vh;
}

.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  background-color: #a14724; /* 确保有背景色 */
  /* 不再需要设置固定的 height */
}

.main-content {
  height: 100%;
}
</style>
